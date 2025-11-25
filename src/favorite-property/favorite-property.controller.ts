import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Req, ParseIntPipe, Patch, BadRequestException } from '@nestjs/common';
import { FavoritesService } from './favorite-property.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CreateFavoriteDto, FavoriteQueryDto } from 'dto/favorites.dto';
import { FavoriteProperty } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

type ReqUser = { user: { id: number; userType: UserType } };

@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FavoritesController {
  constructor(private readonly svc: FavoritesService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('q') search?: string,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User ID missing from request');
    }
  
    const userId = req.user.id;
    const skip = (page - 1) * limit;
  
    const qb = this.svc.favRepo
      .createQueryBuilder('favorite_properties')
      .leftJoinAndSelect('favorite_properties.user', 'user')
      .leftJoinAndSelect('favorite_properties.property', 'property')
      .where('user.id = :userId', { userId });
  
    if (search) {
      qb.andWhere(
        '(property.title ILIKE :search OR property.location ILIKE :search)',
        { search: `%${search}%` },
      );
    }
  
    qb.orderBy(`favorite_properties.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);
  
    const [data, total] = await qb.getManyAndCount();
  
    return {
      total,
      page: Number(page),
      limit: Number(limit),
      data,
    };
  }
  
  @Get(':propertyId/is-favorite')
  @Roles(UserType.CUSTOMER, UserType.ADMIN, UserType.QUALITY)
  isFavorite(@Req() req: ReqUser, @Param('propertyId', ParseIntPipe) propertyId: number, @Query('userId') userId?: number) {
    const asUserId = userId ? Number(userId) : undefined;
    return this.svc.isFavorite(req.user, propertyId, asUserId);
  }

  @Post()
  add(
    @Req() req: ReqUser,
    @Body() dto: CreateFavoriteDto,
    @Query('userId') userId?: number, // optional impersonation (admin)
  ) {
    const asUserId = userId ? Number(userId) : undefined;
    return this.svc.toggle(req.user, dto.propertyId, dto.note, asUserId);
  }

  /** Remove from favorites */
  @Delete(':propertyId')
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  remove(@Req() req: ReqUser, @Param('propertyId', ParseIntPipe) propertyId: number, @Query('userId') userId?: number) {
    const asUserId = userId ? Number(userId) : undefined;
    return this.svc.remove(req.user, propertyId, asUserId);
  }
}
