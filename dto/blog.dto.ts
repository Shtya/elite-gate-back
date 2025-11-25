// dto/blogs.dto.ts
import { IsString, IsOptional, IsBoolean, IsDateString, IsNumber, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';
import slugify from 'slugify';

export class CreateBlogDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  @Transform(({ value, obj }) => {
  
    if (value) {
      return slugify(value, { lower: true, strict: true });
    }
    
    return slugify(obj.title, { lower: true, strict: true });
  })
  slug?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  description: string;


 
  @IsOptional()
  publishedAt?: Date;

  @Transform(({ value }) => Boolean(value))
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class UpdateBlogDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value, obj }) => {
    if (value) {
      // manually provided slug → clean it
      return slugify(value, { lower: true, strict: true });
    }

    // If title is updated, regenerate slug based on title
    if (obj.title) {
      return slugify(obj.title, { lower: true, strict: true });
    }

    return undefined;
  })
  slug?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value || isNaN(Date.parse(value))) return undefined;
    return new Date(value);
  })
  @IsDate()
  publishedAt?: Date;
  

  

  @Transform(({ value }) => Boolean(value))
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class BlogQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === 'true' || value === 'True' || value === '1') return true;
    if (value === 'false' || value === 'False' || value === '0') return false;
    return undefined; // invalid → will trigger validation error
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  authorId?: number;

  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  page?: number;

  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  limit?: number;
}