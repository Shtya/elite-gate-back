import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { ExportService, ModuleName } from './export.service';
import { CRUD } from 'common/crud.service';
import { ExportRowsDto } from './export.dto';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async exportData(@Query('module') module: ModuleName, @Res() res: any, @Query('limit') limit?: string) {
    return this.exportService.exportEntityToExcel(this.exportService.dataSource, module, res, { exportLimit: limit });
  }

  // الجديد: تصدير Rows جاهزة (أفضل سيناريو لمرونة كاملة)
  @Post('rows')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async exportRows(@Body() dto: ExportRowsDto, @Res() res: any) {
    const { rows, fileName, sheetName, columns } = dto;
    return this.exportService.exportRowsToExcel(res, rows, { fileName, sheetName, columns });
  }
}
