import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Property, UserType, User } from 'entities/global.entity';
import { CreateFavoriteDto, FavoriteQueryDto } from 'dto/favorites.dto';
import { FavoriteProperty } from 'entities/global.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteProperty)
    public readonly favRepo: Repository<FavoriteProperty>,
    @InjectRepository(Property)
    public readonly propertyRepo: Repository<Property>,
    @InjectRepository(User)
    public readonly userRepo: Repository<User>,
  ) {}

  private ensureSelfOrAdmin(requestingUser: { id: number; userType: UserType }, targetUserId: number) {
    const isSelf = requestingUser.id === targetUserId;
    const isAdmin = requestingUser.userType === UserType.ADMIN || requestingUser.userType === UserType.QUALITY;
    if (!isSelf && !isAdmin) throw new ForbiddenException('You cannot access other users favorites.');
  }

  async add(user: { id: number; userType: UserType }, dto: CreateFavoriteDto, asUserId?: number) {
    const userId = asUserId ?? user.id;
    this.ensureSelfOrAdmin(user, userId);

    const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    // Check if exists (even soft-deleted), then restore/update
    let fav = await this.favRepo.findOne({
      where: {
        user: { id: userId },
        property: { id: dto.propertyId },
      },
      withDeleted: true,
    });

    if (fav) {
      // If previously soft-deleted -> restore
      if (fav.deletedAt) {
        await this.favRepo.restore(fav.id);
      }
      fav.note = dto.note ?? fav.note ?? null;
      return this.favRepo.save(fav);
    }

    fav = this.favRepo.create({
      user: { id: userId } as any,
      property: { id: dto.propertyId } as any,
      note: dto.note ?? null,
    });
    return this.favRepo.save(fav);
  }

  async remove(user: { id: number; userType: UserType }, propertyId: number, asUserId?: number) {
    const userId = asUserId ?? user.id;
    this.ensureSelfOrAdmin(user, userId);

    const fav = await this.favRepo.findOne({
      where: { user: { id: userId }, property: { id: propertyId } },
    });
    if (!fav) throw new NotFoundException('Favorite not found');
    await this.favRepo.softDelete(fav.id);
    return { ok: true };
  }

  async toggle(authUser: any, propertyId: number, note?: string | null, asUserId?: number) {
    const targetUserId = asUserId ?? authUser.id;

    const [user, property] = await Promise.all([this.userRepo.findOne({ where: { id: targetUserId } }), this.propertyRepo.findOne({ where: { id: propertyId } })]);

    if (!user) throw new NotFoundException('User not found');
    if (!property) throw new NotFoundException('Property not found');

    // Look up including soft-deleted rows
    const existing = await this.favRepo.findOne({
      where: { user: { id: user.id }, property: { id: property.id } },
      withDeleted: true,
      relations: ['user', 'property'],
    });

    // Case 1: record exists and is active -> remove (toggle OFF)
    if (existing && !existing.deletedAt) {
      // prefer soft remove to keep history if DeleteDateColumn exists
      if ('deletedAt' in existing) {
        await this.favRepo.softRemove(existing);
      } else {
        await this.favRepo.remove(existing);
      }
      return {
        status: 'removed',
        toggled: false,
        message: 'Property removed from favorites.',
        data: { propertyId, userId: user.id },
      };
    }

    // Case 2: record exists but soft-deleted -> restore (toggle ON)
    if (existing && existing.deletedAt) {
      await this.favRepo.restore(existing.id);
      // Optional: update note on restore
      if (note !== undefined) {
        await this.favRepo.update(existing.id, { note: note ?? null });
      }
      const restored = await this.favRepo.findOne({ where: { id: existing.id } });
      return {
        status: 'added',
        toggled: true,
        message: 'Property added to favorites.',
        data: restored,
      };
    }

    // Case 3: no record -> create (toggle ON)
    const created = this.favRepo.create({ user, property, note: note ?? null });
    const saved = await this.favRepo.save(created);
    return {
      status: 'added',
      toggled: true,
      message: 'Property added to favorites.',
      data: saved,
    };
  }

  async isFavorite(user: { id: number; userType: UserType }, propertyId: number, asUserId?: number) {
    const userId = asUserId ?? user.id;
    this.ensureSelfOrAdmin(user, userId);

    const fav = await this.favRepo.findOne({
      where: { user: { id: userId }, property: { id: propertyId } },
    });
    return { favorite: !!fav };
  }

  async list(user: { id: number; userType: UserType }, query: FavoriteQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const userId = query.userId ?? user.id;

    this.ensureSelfOrAdmin(user, userId);

    const qb = this.favRepo
      .createQueryBuilder('fav')
      .leftJoinAndSelect('fav.property', 'property')
      .leftJoinAndSelect('property.city', 'city')
      .leftJoinAndSelect('property.area', 'area')
      .where('fav.user_id = :userId', { userId })
      .andWhere('fav.deleted_at IS NULL')
      .orderBy('fav.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
