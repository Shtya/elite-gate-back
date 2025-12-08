import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto, PropertyMediaDto, CreateManyPropertyMediaDto } from '../../dto/properties.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { mixedUploadOptions } from './uplaod.config';

function parseMedias(input: any): PropertyMediaDto[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as PropertyMediaDto[];
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}


  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.ADMIN, UserType.AGENT)
  @UseInterceptors(FilesInterceptor('media', 50, mixedUploadOptions))
  async create(
    @Body() createPropertyDto: CreatePropertyDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const property = await this.propertiesService.create(createPropertyDto);

    if (files && files.length > 0) {
      const uploadedMedias = files.map((file, i) => {
        const isImage = /^image\//.test(file.mimetype);
        const basePath = isImage ? '/uploads/images/' : '/uploads/videos/';
        return {
          mediaUrl: `${basePath}${file.filename}`,
          isPrimary: i === 0, 
          orderIndex: i,
        };
      });

      await this.propertiesService.addManyMedia(property.id, uploadedMedias);
    }

    return property;
  }

  @Get()
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
  
    // equality filters
    if (query.cityId) filters.city = { id: Number(query.cityId) };
    if (query.areaId) filters.area = { id: Number(query.areaId) };
    if (query.propertyTypeId) filters.propertyType = { id: Number(query.propertyTypeId) };
    if (typeof query.isActive !== 'undefined') {
      if (query.isActive === 'true') filters.isActive = true;
      else if (query.isActive === 'false') filters.isActive = false;
    }
  
    return CRUD.findAll(
      this.propertiesService.propertiesRepository, 
      'property', 
      query.q || query.search, 
      query.page,       query.limit, 
      query.sortBy ?? 'createdAt', 
      query.sortOrder ?? 'DESC',
      ['propertyType', 'city', 'area', 'createdBy', 'medias'], 
      ['title', 'description', 'price'],
      filters,
      { 
        priceMin: query.priceMin ? Number(query.priceMin) : undefined,
        priceMax: query.priceMax ? Number(query.priceMax) : undefined,
        type: query.type || undefined,
      },
    );
  }
  

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(+id);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.ADMIN, UserType.AGENT)
  @UseInterceptors(FilesInterceptor('media', 50, mixedUploadOptions))
  async update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const propertyId = +id;
    const updated = await this.propertiesService.update(propertyId, updatePropertyDto);
  
    if (files && files.length > 0) {
      // handle new media uploads
      const uploadedMedias = files.map((file, i) => {
        const isImage = /^image\//.test(file.mimetype);
        const basePath = isImage ? '/uploads/images/' : '/uploads/videos/';
        return {
          mediaUrl: `${basePath}${file.filename}`,
          isPrimary: i === 0,
          orderIndex: i,
        };
      });
  
      await this.propertiesService.addManyMedia(propertyId, uploadedMedias);
    }
  
    return this.propertiesService.findOne(propertyId);
  }
  
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.ADMIN, UserType.AGENT)
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(+id);
  }
  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.ADMIN, UserType.AGENT)
  @UseInterceptors(FilesInterceptor('media', 50, mixedUploadOptions))
  async addMedia(@Param('id') id: string, @Body() body: CreateManyPropertyMediaDto, @UploadedFiles() files: Express.Multer.File[]) {
    const propertyId = +id;

    // 1) Parse metadata array if provided
    const metaFromBody = parseMedias(body?.medias); // may be []

    const uploadedAsItems: PropertyMediaDto[] = (files ?? []).map((f, i) => {
      const isImg = /^image\//.test(f.mimetype);
      const base = isImg ? '/uploads/images/' : '/uploads/videos/';
      return {
        mediaUrl: `${base}${f.filename}`,
        isPrimary: false,
        orderIndex: i,
      };
    });

    let finalItems: PropertyMediaDto[] = [];
    if (uploadedAsItems.length && metaFromBody.length && uploadedAsItems.length === metaFromBody.length) {
      finalItems = uploadedAsItems.map((fileItem, i) => ({
        mediaUrl: fileItem.mediaUrl, // always keep file path
        isPrimary: metaFromBody[i]?.isPrimary ?? fileItem.isPrimary ?? false,
        orderIndex: metaFromBody[i]?.orderIndex ?? fileItem.orderIndex ?? 0,
      }));
    } else {
      finalItems = [...uploadedAsItems, ...metaFromBody];
    }

    finalItems = finalItems.filter(x => !!x.mediaUrl);
    return this.propertiesService.addManyMedia(propertyId, finalItems);
  }

  // @Post(':id/media')
  // @Roles(UserType.ADMIN, UserType.AGENT)
  // addMedia(@Param('id') id: string, @Body() propertyMediaDto: PropertyMediaDto) {
  //   return this.propertiesService.addMedia(+id, propertyMediaDto);
  // }

  @Delete(':id/media/:mediaId')
  @UseGuards(JwtAuthGuard)

  @Roles(UserType.ADMIN, UserType.AGENT)
  removeMedia(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.propertiesService.removeMedia(+id, +mediaId);
  }
}
