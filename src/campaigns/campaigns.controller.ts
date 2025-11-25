import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, CampaignQueryDto, CampaignImageDto } from '../../dto/campaigns.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.MARKETER)
  create(@Body() createCampaignDto: CreateCampaignDto , @Req() req : any) {
		console.log("here");
    return this.campaignsService.create(createCampaignDto , req.user.id);
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.MARKETER, UserType.QUALITY)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.status) filters.status = query.status;
    if (query.targetChannel) filters.targetChannel = query.targetChannel;
    if (query.createdById) filters.createdBy = { id: Number(query.createdById) }; // optional nested filter

    return CRUD.findAll(
      this.campaignsService.campaignsRepository, // repo
      'campaign', // alias used by QB
      query.q || query.search, // search term
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy (avoid 'created_at' mismatch)
      query.sortOrder ?? 'DESC', // sortOrder
      ['createdBy', 'images'], // relations
      ['name', 'description'], // searchFields on root columns
      filters, // exact/nested filters
    );
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.MARKETER, UserType.QUALITY)
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  update(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.campaignsService.update(+id, updateCampaignDto);
  }

  @Delete(':id')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(+id);
  }

  @Post(':id/start')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  startCampaign(@Param('id') id: string) {
    return this.campaignsService.startCampaign(+id);
  }

  @Post(':id/pause')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  pauseCampaign(@Param('id') id: string) {
    return this.campaignsService.pauseCampaign(+id);
  }

  @Post(':id/stop')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  stopCampaign(@Param('id') id: string) {
    return this.campaignsService.stopCampaign(+id);
  }

  @Post(':id/images')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  addImage(@Param('id') id: string, @Body() campaignImageDto: CampaignImageDto) {
    return this.campaignsService.addImage(+id, campaignImageDto);
  }

  @Get(':id/analytics')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  getCampaignAnalytics(@Param('id') id: string) {
    return this.campaignsService.getCampaignAnalytics(+id);
  }
}
