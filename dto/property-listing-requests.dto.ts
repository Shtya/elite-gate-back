import { IsNotEmpty, IsEnum, IsOptional, IsString, IsNumber, IsObject, IsArray } from 'class-validator';
import { RelationshipType, ListingRequestStatus } from '../entities/global.entity';
import { Type, Transform } from 'class-transformer';

export class CreatePropertyListingRequestDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number) 
  ownerId?: number;

  @IsNotEmpty()
  @IsEnum(RelationshipType)
  @Transform(({ value }) => value.toLowerCase()) 
  relationshipType: RelationshipType;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  propertyTypeId: number;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsNotEmpty()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {}; // fallback
      }
    }
    return value;
  })
  specifications: Record<string, any>;

  @IsOptional()
  @IsString()
  askingPrice?: string;

  @IsOptional()
  @IsString()
  authorizationDocUrl?: string;

  @IsOptional()
  @IsString()
  ownershipDocUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdatePropertyListingRequestDto {

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  propertyTypeId?: number;
  
  @IsOptional()
    @IsEnum(RelationshipType)
  @Transform(({ value }) => value.toLowerCase()) // ensure enum matches
  relationshipType?: RelationshipType;

  @IsOptional()
  @IsEnum(ListingRequestStatus)
  status?: ListingRequestStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {}; // fallback
      }
    }
    return value;
  })
  specifications?: Record<string, any>;

  @IsOptional()
  @IsString()
  askingPrice?: string;

  @IsOptional()
  @IsString()
  authorizationDocUrl?: string;


  @IsOptional()
  @IsString()
  ownershipDocUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class PropertyListingRequestQueryDto {
  @IsOptional()
  @IsNumber()
  ownerId?: number;

  @IsOptional()
  @IsEnum(ListingRequestStatus)
  status?: ListingRequestStatus;

  @IsOptional()
  @IsEnum(RelationshipType)
  relationshipType?: RelationshipType;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class AddAttachmentDto {
  @IsNotEmpty()
  @IsString()
  attachmentUrl: string;
}
