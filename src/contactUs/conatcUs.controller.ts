import {
    Controller,
    Get,
    Post,
    Body,
    Delete,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    HttpCode,
  } from '@nestjs/common';
  import { ContactUsService } from './contactUs.service';
  import { CreateContactUsDto } from 'dto/users.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { UserType } from 'entities/global.entity';
  import { CRUD } from 'common/crud.service';
  
  @Controller('contact-us')
  export class ContactUsController {
    constructor(private readonly contactUsService: ContactUsService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createContactUsDto: CreateContactUsDto) {
      return this.contactUsService.create(createContactUsDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserType.ADMIN)
    findAll(@Query() query: any) {
      return CRUD.findAll(
        this.contactUsService.contactUsRepository,
        'c',
        query.search,
        query.page,
        query.limit,
        query.sortBy,
        query.sortOrder,
        [],
        ['name', 'email', 'message'],
      );
    }
  
 
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserType.ADMIN)
    findOne(@Param('id') id: string) {
      return this.contactUsService.findOne(+id);
    }
  

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserType.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
      return this.contactUsService.remove(+id);
    }
  }
  