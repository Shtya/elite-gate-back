import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Property, PropertyMedia, PropertyType, City, Area, User, NotificationType, UserType, NotificationChannel } from '../../entities/global.entity';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto, PropertyMediaDto } from '../../dto/properties.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    public propertiesRepository: Repository<Property>,
    @InjectRepository(PropertyMedia)
    private propertyMediaRepository: Repository<PropertyMedia>,
    @InjectRepository(PropertyType)
    private propertyTypeRepository: Repository<PropertyType>,
    @InjectRepository(City)
    private cityRepository: Repository<City>,
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createPropertyDto: CreatePropertyDto, user: User): Promise<Property> {
    const { propertyTypeId, cityId, areaId } = createPropertyDto;

    // Run all FK lookups in parallel (Huge improvement)
    const [propertyType, city, area] = await Promise.all([
      this.propertyTypeRepository.findOne({ where: { id: propertyTypeId } }),
      this.cityRepository.findOne({ where: { id: cityId } }),
      this.areaRepository.findOne({ where: { id: areaId } }),
    ]);

    if (!propertyType) throw new NotFoundException('Property type not found');
    if (!city) throw new NotFoundException('City not found');
    if (!area) throw new NotFoundException('Area not found');

    const property = this.propertiesRepository.create({
      ...createPropertyDto,
      propertyType,
      city,
      area,
      createdBy: user,
    });

    // Save property BEFORE notifications
    const savedProperty = await this.propertiesRepository.save(property);

    // Run notifications in background (non-blocking)
    this.sendNotificationsAsync(savedProperty).catch((err) =>
      console.error('Notification error:', err),
    );

    return savedProperty;
  }

  // background notifications
  private async sendNotificationsAsync(property: Property) {
    await Promise.all([
      this.notificationsService.notifyUserType(UserType.ADMIN, {
        type: NotificationType.SYSTEM,
        title: 'New Property Added',
        message: `A new property has been added: ${property.title}`,
        relatedId: property.id,
        channel: NotificationChannel.IN_APP,
      }),

      this.notificationsService.notifyUserType(UserType.QUALITY, {
        type: NotificationType.SYSTEM,
        title: 'New Property Pending Review',
        message: `The property "${property.title}" has been added and requires a quality review.`,
        relatedId: property.id,
        channel: NotificationChannel.IN_APP,
      }),
    ]);
  }


  async findOne(id: number): Promise<Property> {
    const property = await this.propertiesRepository.findOne({
      where: { id },
      relations: ['propertyType', 'city', 'area', 'createdBy', 'medias'],
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async update(id: number, updatePropertyDto: UpdatePropertyDto): Promise<Property> {
    const property = await this.findOne(id);

    if (updatePropertyDto.propertyTypeId) {
      property.propertyType = await this.propertyTypeRepository.findOne({
        where: { id: Number(updatePropertyDto.propertyTypeId) },
      });
    }

    if (updatePropertyDto.cityId) {
      property.city = await this.cityRepository.findOne({
        where: { id: Number(updatePropertyDto.cityId)},
      });
    }

    if (updatePropertyDto.areaId) {
      property.area = await this.areaRepository.findOne({
        where: { id: Number(updatePropertyDto.areaId) },
      });
    }

    // Handle Media Updates (Keep specified, remove others)
    if (updatePropertyDto.mediaIds) {
      // safe parsing in case it comes as string array or otherwise
      const idsToKeep = new Set(
        Array.isArray(updatePropertyDto.mediaIds)
            ? updatePropertyDto.mediaIds.map((id) => Number(id))
            : []
      );

      // Existing media is loaded via findOne -> relations: ['medias']
      // We identify what to remove
      const mediaToRemove = property.medias.filter((m) => !idsToKeep.has(m.id));

      if (mediaToRemove.length > 0) {
        await this.propertyMediaRepository.remove(mediaToRemove);
        
        // CRITICAL: Update the property.medias array in memory so .save(property)
        // doesn't try to save/resurrect the deleted entities.
        property.medias = property.medias.filter(m => idsToKeep.has(m.id));
      }
    } 
    // else if ((updatePropertyDto as any).removeMediaIds?.length) {
    //    // Fallback to old behavior if mediaIds not sent but removeMediaIds is
    //   const ids = (updatePropertyDto as any).removeMediaIds as number[];
    //   await this.propertyMediaRepository.delete(ids);
    //   property.medias = property.medias.filter(m => !ids.includes(m.id));
    // }

    Object.assign(property, updatePropertyDto);
    
    // cleanup temp property to avoid errors if strict
    delete (property as any).mediaIds; 

    // We can just save now. internal arrays are synced.
    // Note: If updatePropertyDto has fields that conflict with relations (like cityId vs city object),
    // Object.assign might overwrite the relation object with the ID if they share names, 
    // but here DTO has `cityId` and entity has `city`, so it's fine.

    await this.notificationsService.createNotification({
      userId: property.createdBy.id,
      type: NotificationType.SYSTEM,
      title: 'Property Updated',
      message: `The property information has been updated: ${property.title}`,
      relatedId: property.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.propertiesRepository.save(property);
  }

  async setPrimaryImage(id: number, mediaId: number): Promise<void> {
    const property = await this.findOne(id);
    // Unset all
    const image = await this.propertyMediaRepository.findOne({ where: { id: mediaId ,property:{id}} });
    if(!image){
      throw new NotFoundException('Image not found');
    }
    await this.propertyMediaRepository.update({ property: { id } }, { isPrimary: false });
    // Set specific
    await this.propertyMediaRepository.update({ id: mediaId }, { isPrimary: true });
  }

  async remove(id: number): Promise<void> {
    const property = await this.findOne(id);
    await this.propertiesRepository.softDelete(id);
  }

  private async mustGetProperty(id: number) {
    const p = await this.propertiesRepository.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  async addManyMedia(propertyId: number, items: PropertyMediaDto[]): Promise<PropertyMedia[]> {
    const property = await this.mustGetProperty(propertyId);

    const rows = items.map(m =>
      this.propertyMediaRepository.create({
        property,
        mediaUrl: m.mediaUrl!, // ensured in controller
        isPrimary: m.isPrimary ?? false,
        orderIndex: m.orderIndex ?? 0,
      }),
    );

    return this.propertyMediaRepository.save(rows);
  }

  async removeMedia(propertyId: number, mediaId: number): Promise<void> {
    const media = await this.propertyMediaRepository.findOne({
      where: { id: mediaId, property: { id: propertyId } },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    await this.propertyMediaRepository.remove(media);
  }

  async getMinMaxPrice(): Promise<{ min: number; max: number }> {
    const query = this.propertiesRepository.createQueryBuilder('property');
    
    // Select min and max price
    const result = await query
      .select('MIN(property.price)', 'min')
      .addSelect('MAX(property.price)', 'max')
      .getRawOne();

    return {
      min: result ? Number(result.min) : 0,
      max: result ? Number(result.max) : 0,
    };
  }
}
