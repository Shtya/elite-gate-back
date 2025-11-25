import { IsNotEmpty, IsEnum, IsOptional, IsString, IsNumber, IsArray, IsBoolean, IsUrl, IsEmail, MaxLength } from 'class-validator';
import { StaticPageSlug, SectionKey } from '../entities/global.entity';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateStaticPageDto {
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateStaticPageDto {
  @IsOptional()
  slug: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePageSectionDto {
  @IsNotEmpty()
  @IsString()
  sectionKey: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}

export class UpdatePageSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSiteSettingsDto {
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  longitude?: number;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'introVideoUrl must be a valid URL' })
  introVideoUrl?: string;

  @IsOptional() @IsNumber({}, { message: 'Customer count must be a number' }) customerCount?: number;
  @IsOptional() @IsNumber({}, { message: 'Years of experience must be a number' }) yearsExperience?: number;
  @IsOptional() @IsNumber({}, { message: 'Project count must be a number' }) projectCount?: number;

  @IsOptional() @IsEmail({}, { message: 'Email must be a valid email address' }) email?: string;
  @IsOptional() @IsString() phoneNumber?: string;

  @IsOptional() @IsUrl({ require_protocol: true }) twitterUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) instagramUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) snapchatUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) tiktokUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) youtubeUrl?: string;

  // NEW: text-only policies
  @IsOptional()
  @IsString()
  @MaxLength(500000, { message: 'termsHtml is too long' }) // safety upper bound
  termsHtml?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500000, { message: 'privacyHtml is too long' })
  privacyHtml?: string;
}

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class UpdateFooterSettingsDto {
  @IsOptional()
  @trim()
  @IsString()
  footerParagraph?: string;

  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(255, { message: 'newsletterTitle must be at most 255 characters' })
  newsletterTitle?: string;

  @IsOptional()
  @trim()
  @IsString()
  newsletterParagraph?: string;
}

export class CreateHomeBackgroundDto {
  @IsNotEmpty()
  @IsString()
  imageUrl: string;
}

export class CreatePartnerLogoDto {
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @IsNotEmpty()
  @IsString()
  altText: string;
}

export class CreateFaqItemDto {
  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @IsNotEmpty()
  @IsString()
  question: string;

  @IsNotEmpty()
  @IsString()
  answer: string;
}

export class CreateFaqGroupDto {
  @IsNotEmpty()
  @trim()
  @IsString()
  @MaxLength(255)
  title: string;
}

export class UpdateFaqGroupDto {
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class CreateAboutFeatureDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  featureText: string;
}

export class CreateAboutStepDto {
  @IsNotEmpty()
  @IsNumber()
  stepNumber: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;
}

export class CreateAboutHighlightDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  description: string;
}

export class CreateAboutStatDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  label: string;

  // value is a varchar(50) in the entity (string, not number)
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  value: string;
}

export class CreateAboutTeamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  role: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @IsUrl({ require_protocol: true })
  imageUrl: string;
}
export class UpdateHomeBackgroundDto extends PartialType(CreateHomeBackgroundDto) {}
export class UpdatePartnerLogoDto extends PartialType(CreatePartnerLogoDto) {}
