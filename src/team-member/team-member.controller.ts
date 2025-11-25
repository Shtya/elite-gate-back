// src/team/team.controller.ts
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseFilters, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { imageUploadOptions, MulterExceptionFilter, toAbsPathImages, toWebPathImages, validateAndOptimizeImageIfPossible } from 'common/upload.config';

import { TeamService } from './team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
@Controller('team')
@UseFilters(new MulterExceptionFilter())
export class TeamController {
  constructor(private readonly svc: TeamService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        // same pattern you used; one logical image slot for Team members
        { name: 'image', maxCount: 1 },
      ],
      imageUploadOptions,
    ),
  )
  async create(
    @Body() dto: CreateTeamMemberDto & { imageUrl?: string },
    @UploadedFiles()
    files?: {
      image?: Express.Multer.File[];
    },
  ) {
    // If a file was uploaded, validate/optimize then map to web URL
    if (files?.image?.[0]) {
      const f = files.image[0];
      // await validateAndOptimizeImageIfPossible(toAbsPathImages(f.filename));
      dto.imageUrl = toWebPathImages(f.filename);
    }

    if (!dto.imageUrl) {
      throw new BadRequestException('image is missing (send as URL "imageUrl" or upload "image" file).');
    }

    return this.svc.create(dto);
  }

  @Put(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }], imageUploadOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamMemberDto & { imageUrl?: string | null },
    @UploadedFiles()
    files?: {
      image?: Express.Multer.File[];
    },
  ) {
    let uploadedFilename: string | undefined;
    if (files?.image?.[0]) {
      const f = files.image[0];
      dto.imageUrl = toWebPathImages(f.filename);
      uploadedFilename = f.filename;
    }
    // If no new file and no imageUrl in body, we keep the old image (no error)
    return this.svc.update(id, dto, { uploadedFilename });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
