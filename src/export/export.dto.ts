import { IsArray, IsOptional, IsString, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ColumnDto {
  @IsString()
  header: string;

  @IsString()
  key: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  width?: number; // اختياري
}

export class ExportRowsDto {
  @IsArray()
  rows: any[]; // مصفوفة من الـ objects الجاهزة للتصدير

  @IsOptional()
  @IsString()
  fileName?: string; // افتراضي: export.xlsx

  @IsOptional()
  @IsString()
  sheetName?: string; // افتراضي: Report

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ColumnDto)
  columns?: ColumnDto[]; // اختياري: لو عايز تتحكم في ترتيب/عناوين الأعمدة
}
