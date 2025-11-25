import { IsArray, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class SendWhatsappTextDto {
  @IsNotEmpty()
  @IsString()
  // example: 201551495772
  to: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}

export class SendWhatsappTemplateDto {
  @IsNotEmpty()
  @IsString()
  to: string;

  @IsNotEmpty()
  @IsString()
  templateName: string;   // e.g. "hello_world" or "test_template"

  @IsNotEmpty()
  @IsString()
  languageCode: string;   // e.g. "en_US", "ar"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bodyParams?: string[];
}
