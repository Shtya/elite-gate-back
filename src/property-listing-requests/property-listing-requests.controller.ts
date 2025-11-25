import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, UseInterceptors, UploadedFiles,
  Request,
  BadRequestException
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PropertyListingRequestsService } from './property-listing-requests.service';
import { AddAttachmentDto, CreatePropertyListingRequestDto, UpdatePropertyListingRequestDto } from '../../dto/property-listing-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';
import { genericUploadOptions, toWebPathFiles } from 'common/upload.config';

interface RequestWithUser extends Request {
  user: any;
}
@Controller('property-listing-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertyListingRequestsController {
  constructor(private readonly propertyListingRequestsService: PropertyListingRequestsService) {}


  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'authorizationDoc', maxCount: 1 },
      { name: 'ownershipDoc', maxCount: 1 },
      { name: 'attachments', maxCount: 10 },
    ],
    genericUploadOptions )
  )
  async create(
    @UploadedFiles() files: { 
      authorizationDoc?: Express.Multer.File[], 
      ownershipDoc?: Express.Multer.File[], 
      attachments?: Express.Multer.File[] 
    },
    @Body() createDto: CreatePropertyListingRequestDto,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('Owner ID is required from JWT');
    }
  
    createDto.ownerId = Number(req.user.id);
    // Save single files to main table
    if (files.authorizationDoc?.[0]) {
      createDto.authorizationDocUrl = toWebPathFiles(files.authorizationDoc[0].filename);
    }
    if (files.ownershipDoc?.[0]) {
      createDto.ownershipDocUrl = toWebPathFiles(files.ownershipDoc[0].filename);
    }
    if (files.attachments?.length) {
      createDto.attachments = files.attachments.map(f => toWebPathFiles(f.filename));
    }
    // Pass uploaded attachments files to the service
    const attachmentsFiles = files.attachments ?? [];
    
    // Validate required fields
    if (!createDto.relationshipType) throw new BadRequestException('relationshipType is required');
    if (!createDto.propertyTypeId) throw new BadRequestException('propertyTypeId is required');
    if (!createDto.location) throw new BadRequestException('location is required');
    if (!createDto.specifications) throw new BadRequestException('specifications are required');
    
    return this.propertyListingRequestsService.create(createDto, attachmentsFiles);
  }
  
@Get()  
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};

    if (query.ownerId) filters.owner = { id: Number(query.ownerId) };
    if (query.status) filters.status = query.status;
    if (query.relationshipType) filters.relationshipType = query.relationshipType;

    return CRUD.findAll(
      this.propertyListingRequestsService.propertyListingRequestsRepository, // repo
      'property_listing_request',                                            // alias (match your QB alias)
      query.q || query.search,                                               // search
      query.page,                                                            // page
      query.limit,                                                           // limit
      query.sortBy ?? 'createdAt',                                           // sortBy (avoid 'created_at' mismatch)
      query.sortOrder ?? 'DESC',                                             // sortOrder
      ['owner', 'propertyType', 'attachments', 'updatedBy'],                 // relations
      [],                                                                    // searchFields (add root cols if needed)
      filters,                                                               // filters (supports nested)
    );
  }
  @Get(':id')
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY, UserType.CUSTOMER)
  findOne(@Param('id') id: string) {
    return this.propertyListingRequestsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'authorizationDoc', maxCount: 1 },
        { name: 'ownershipDoc', maxCount: 1 },
        { name: 'attachments', maxCount: 10 },
      ],
      genericUploadOptions
    )
  )
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: {
      authorizationDoc?: Express.Multer.File[],
      ownershipDoc?: Express.Multer.File[],
      attachments?: Express.Multer.File[]
    },
    @Body() updateDto: UpdatePropertyListingRequestDto,
  ) {
    // Map uploaded files to URLs
    if (files.authorizationDoc?.[0]) {
      updateDto.authorizationDocUrl = toWebPathFiles(files.authorizationDoc[0].filename);
    }
    if (files.ownershipDoc?.[0]) {
      updateDto.ownershipDocUrl = toWebPathFiles(files.ownershipDoc[0].filename);
    }
    if (files.attachments?.length) {
      updateDto.attachments = files.attachments.map(f => toWebPathFiles(f.filename));
    }
  
    return this.propertyListingRequestsService.update(+id, updateDto);
  }
  

  @Delete(':id')
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  remove(@Param('id') id: string) {
    return this.propertyListingRequestsService.remove(+id);
  }

  @Post(':id/attachments')
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  addAttachment(@Param('id') id: string, @Body() addAttachmentDto: AddAttachmentDto) {
    return this.propertyListingRequestsService.addAttachment(+id, addAttachmentDto);
  }

  @Post(':id/approve')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  approve(@Param('id') id: string) {
    return this.propertyListingRequestsService.approve(+id);
  }

  @Post(':id/reject')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.propertyListingRequestsService.reject(+id, reason);
  }

  @Post(':id/publish')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  publish(@Param('id') id: string) {
    return this.propertyListingRequestsService.publish(+id);
  }

  @Get('owner/:ownerId')
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.propertyListingRequestsService.findByOwner(+ownerId);
  }
}