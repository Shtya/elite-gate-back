import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, PropertyMedia, PropertyType, City, Area, User, NotificationType, UserType, NotificationChannel } from 'entities/global.entity';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto, PropertyMediaDto } from '../../dto/properties.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

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

  async create(createPropertyDto: CreatePropertyDto): Promise<Property> {
    const propertyType = await this.propertyTypeRepository.findOne({
      where: { id: createPropertyDto.propertyTypeId },
    });
    if (!propertyType) {
      throw new NotFoundException('Property type not found');
    }

    const city = await this.cityRepository.findOne({
      where: { id: createPropertyDto.cityId },
    });
    if (!city) {
      throw new NotFoundException('City not found');
    }

    const area = await this.areaRepository.findOne({
      where: { id: createPropertyDto.areaId },
    });
    if (!area) {
      throw new NotFoundException('Area not found');
    }

    const property = await this.propertiesRepository.create({
      ...createPropertyDto,
      propertyType,
      city,
      area,
      createdBy: { id: 1 } as User, // This should come from authenticated user
    });

    // Notification for admin about a new property
    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.SYSTEM,
      title: 'New Property Added',
      message: `A new property has been added: ${property.title}`,
      relatedId: property.id,
      channel: NotificationChannel.IN_APP,
    });

    // Notification for quality team
    await this.notificationsService.notifyUserType(UserType.QUALITY, {
      type: NotificationType.SYSTEM,
      title: 'New Property Pending Review',
      message: `The property "${property.title}" has been added and requires a quality review.`,
      relatedId: property.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.propertiesRepository.save(property);
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
        where: { id: updatePropertyDto.propertyTypeId },
      });
    }
  
    if (updatePropertyDto.cityId) {
      property.city = await this.cityRepository.findOne({
        where: { id: updatePropertyDto.cityId },
      });
    }
  
    if (updatePropertyDto.areaId) {
      property.area = await this.areaRepository.findOne({
        where: { id: updatePropertyDto.areaId },
      });
    }
  
  
    if ((updatePropertyDto as any).removeMediaIds?.length) {
      const ids = (updatePropertyDto as any).removeMediaIds as number[];
      await this.propertyMediaRepository.delete(ids);
    }
  
    Object.assign(property, updatePropertyDto);
  
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
}
