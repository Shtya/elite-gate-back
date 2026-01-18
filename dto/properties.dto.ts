import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsArray, IsObject, IsBoolean } from 'class-validator';
import { AccessType } from '../entities/global.entity';
import { Transform, Type } from 'class-transformer';


export class CreatePropertyDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @Type(() => Number)
  propertyTypeId: number;

  @IsNotEmpty()
  @Type(() => Number)
  cityId: number;

  @IsNotEmpty()
  @Type(() => Number)
  areaId: number;

  @IsNotEmpty()
  @Type(() => Number)
  bedrooms: number;

  @IsNotEmpty()
  @Type(() => Number)
  bathrooms: number;

  @IsNotEmpty()
  @IsString()
  areaM2: string;

  @IsOptional()
  @IsString()
  price?: string;

  // 👇 Parse JSON strings (e.g. when sent as "specifications={...}" in multipart/form-data)
  @IsNotEmpty()
  @IsObject()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return {};
    }
  })
  specifications: Record<string, any>;

  @IsNotEmpty()
  @IsObject()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return {};
    }
  })
  guarantees: Record<string, any>;

  @IsEnum(AccessType)
  accessType: AccessType;

  @IsOptional()
  @IsString()
  ownerName?: string;
 @IsOptional()
  @IsString()
  videoUrl?: string;
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @IsOptional()
  @IsString()
  ownerNotes?: string;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;
  @IsOptional()
  @IsString()
  locationUrl?: string;
  @IsOptional()
  @IsString()
  mapPlaceId?: string;

  @IsNumber()
  @Type(() => Number)
  agentsPercentage?: number;
}
export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  locationUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  propertyTypeId?: number;

  @IsOptional()
  cityId?: number;

  @IsOptional()
  @Type(() => Number)
  areaId?: number;

  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;

  @IsOptional()
  @IsString()
  areaM2?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return {};
    }
  })
  specifications?: Record<string, any>;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return {};
    }
  })
  guarantees?: Record<string, any>;

  @IsOptional()
  @IsEnum(AccessType)
  accessType?: AccessType;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @IsOptional()
  @IsString()
  ownerNotes?: string;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;

  @IsOptional()
  @IsString()
  mapPlaceId?: string;



  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  agentsPercentage?: number;
 @IsOptional()
  @IsString()
  videoUrl?: string;
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (e) {
            return [];
        }
    }
    return value;
  })
  mediaIds?: number[];

}

export class PropertyQueryDto {
  @IsOptional()
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @IsNumber()
  areaId?: number;

  @IsOptional()
  @IsNumber()
  propertyTypeId?: number;

  @IsOptional()
  @IsNumber()
  minBedrooms?: number;

  @IsOptional()
  @IsNumber()
  maxBedrooms?: number;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class PropertyMediaDto {
  @IsNotEmpty()
  @IsString()
  mediaUrl: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

export class CreateManyPropertyMediaDto {
  medias: PropertyMediaDto[] | string;
}
