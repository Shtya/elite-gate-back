import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService], // <-- add this line
})
export class ExportModule {}
