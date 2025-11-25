import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { MessageTemplatesService } from './message-templates.service';
import { CreateMessageTemplateDto, UpdateMessageTemplateDto, MessageTemplateQueryDto } from '../../dto/message-templates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('message-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessageTemplatesController {
  constructor(private readonly messageTemplatesService: MessageTemplatesService) {}

  @Post()
  @Roles(UserType.ADMIN)
  create(@Body() createMessageTemplateDto: CreateMessageTemplateDto) {
    return this.messageTemplatesService.create(createMessageTemplateDto);
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.MARKETER)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (typeof query.approved !== 'undefined') {
      // accept approved=true/false or boolean
      filters.approved = query.approved === 'true' ? true : query.approved === 'false' ? false : query.approved;
    }
    if (query.channel) filters.channel = query.channel; // NotificationChannel enum/string
    if (query.locale) filters.locale = query.locale;

    return CRUD.findAll(
      this.messageTemplatesService.messageTemplatesRepository, // repo
      'message_template', // alias for QB
      query.q || query.search, // search term
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'name', // sortBy
      query.sortOrder ?? 'ASC', // sortOrder
      [], // relations
      ['name', 'subject', 'body', 'locale'], // searchFields (root columns)
      filters, // filters (exact matches)
    );
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  findOne(@Param('id') id: string) {
    return this.messageTemplatesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN)
  update(@Param('id') id: string, @Body() updateMessageTemplateDto: UpdateMessageTemplateDto) {
    return this.messageTemplatesService.update(+id, updateMessageTemplateDto);
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  remove(@Param('id') id: string) {
    return this.messageTemplatesService.remove(+id);
  }

  @Post(':id/approve')
  @Roles(UserType.ADMIN)
  approve(@Param('id') id: string) {
    return this.messageTemplatesService.approve(+id);
  }

  @Post(':id/disapprove')
  @Roles(UserType.ADMIN)
  disapprove(@Param('id') id: string) {
    return this.messageTemplatesService.disapprove(+id);
  }

  @Get('channel/:channel')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  findByChannel(@Param('channel') channel: string, @Query('locale') locale?: string) {
    return this.messageTemplatesService.findByChannel(channel as any, locale);
  }

  @Post(':id/preview')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  previewTemplate(@Param('id') id: string, @Body() variables: Record<string, any>) {
    return this.messageTemplatesService.previewTemplate(+id, variables);
  }
}
