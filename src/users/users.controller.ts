// users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, HttpStatus, HttpCode, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, VerifyUserDto } from 'dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { imageUploadOptions } from 'common/upload.config'; // or your consolidated upload.ts
import { queryObjects } from 'v8';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserType.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profilePhotoUrl', maxCount: 1 },
        { name: 'nationalIdUrl', maxCount: 1 },
        { name: 'residencyIdUrl', maxCount: 1 },
      ],
      imageUploadOptions,
    ),
  )
  create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFiles()
    files?: {
      profilePhotoUrl?: Express.Multer.File[];
      nationalIdUrl?: Express.Multer.File[];
      residencyIdUrl?: Express.Multer.File[];
    },
  ) {
    if (files?.profilePhotoUrl?.[0]) {
      createUserDto.profilePhotoUrl = `/uploads/images/${files.profilePhotoUrl[0].filename}`;
    }
    if (files?.nationalIdUrl?.[0]) {
      createUserDto.nationalIdUrl = `/uploads/images/${files.nationalIdUrl[0].filename}`;
    }
    if (files?.residencyIdUrl?.[0]) {
      createUserDto.residencyIdUrl = `/uploads/images/${files.residencyIdUrl[0].filename}`;
    }
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.AGENT)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.userType) filters.userType = query.userType;
    if (query.isActive !== undefined) {
      filters.isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : query.isActive;
    }
    return CRUD.findAll(this.usersService.usersRepository, 'usr', query.search, query.page, query.limit, query.sortBy, query.sortOrder, [], ['fullName', 'email', 'phoneNumber'], filters);
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.AGENT)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profilePhotoUrl', maxCount: 1 },
        { name: 'nationalIdUrl', maxCount: 1 },
        { name: 'residencyIdUrl', maxCount: 1 },
      ],
      imageUploadOptions,
    ),
  )
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFiles()
    files?: {
      profilePhotoUrl?: Express.Multer.File[];
      nationalIdUrl?: Express.Multer.File[];
      residencyIdUrl?: Express.Multer.File[];
    },
  ) {
    if (files?.profilePhotoUrl?.[0]) {
      updateUserDto.profilePhotoUrl = `/uploads/images/${files.profilePhotoUrl[0].filename}`;
    }
    if (files?.nationalIdUrl?.[0]) {
      updateUserDto.nationalIdUrl = `/uploads/images/${files.nationalIdUrl[0].filename}`;
    }
    if (files?.residencyIdUrl?.[0]) {
      updateUserDto.residencyIdUrl = `/uploads/images/${files.residencyIdUrl[0].filename}`;
    }
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post(':id/verify')
  @Roles(UserType.ADMIN)
  verifyUser(@Param('id') id: string, @Body() verifyUserDto: VerifyUserDto) {
    return this.usersService.verifyUser(+id, verifyUserDto);
  }

  @Post(':id/deactivate')
  @Roles(UserType.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(+id);
  }

  @Post(':id/activate')
  @Roles(UserType.ADMIN)
  activate(@Param('id') id: string) {
    return this.usersService.activate(+id);
  }
}
