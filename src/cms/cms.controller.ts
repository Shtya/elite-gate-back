import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseIntPipe, UseFilters, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CreateStaticPageDto, UpdateStaticPageDto, CreatePageSectionDto, UpdatePageSectionDto, UpdateSiteSettingsDto, UpdateFooterSettingsDto, CreateHomeBackgroundDto, CreatePartnerLogoDto, CreateFaqItemDto, CreateFaqGroupDto, UpdateFaqGroupDto, CreateAboutTeamDto, CreateAboutStatDto, CreateAboutHighlightDto, CreateAboutStepDto, CreateAboutFeatureDto, UpdateHomeBackgroundDto, UpdatePartnerLogoDto } from '../../dto/cms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';
import { imageOptionalPipe, imageUploadOptions, MulterExceptionFilter } from '../../common/upload.config';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // Static Pages
  @Get('pages')
  getAllPages(@Query() query: any) {
    // optional filters: ?slug=about | ?title=Home ...
    const filters: Record<string, any> = {};
    if (query.slug) filters.slug = query.slug;
    if (query.title) filters.title = query.title;

    return CRUD.findAll(
      this.cmsService.staticPagesRepository,
      'static_page',
      query.q || query.search, // search
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'ASC', // sortOrder (you previously ordered ASC)
      ['sections'], // relations
      ['title', 'slug'], // searchFields
      filters, // filters
    );
  }

  @Get('pages/:pageId/sections')
 
  listSections(@Param('pageId') pageId: string, @Query() query: any) {
    const filters: Record<string, any> = { page: { id: Number(pageId) } };
    return CRUD.findAll(this.cmsService.pageSectionsRepository, 'page_section', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'ASC', ['page'], ['title', 'key'], filters);
  }

  @Get('pages/:slug')
  getPageBySlug(@Param('slug') slug: string) {
    return this.cmsService.getPageBySlug(slug);
  }

  @Post('pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createPage(@Body() createStaticPageDto: CreateStaticPageDto) {
    return this.cmsService.createPage(createStaticPageDto);
  }

  @Patch('pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updatePage(@Param('id') id: string, @Body() updateStaticPageDto: UpdateStaticPageDto) {
    return this.cmsService.updatePage(+id, updateStaticPageDto);
  }

  // Page Sections
  @Post('pages/:pageId/sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createSection(@Param('pageId') pageId: string, @Body() createSectionDto: CreatePageSectionDto) {
    return this.cmsService.createSection(+pageId, createSectionDto);
  }

  @Patch('sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updateSection(@Param('id') id: string, @Body() updateSectionDto: UpdatePageSectionDto) {
    return this.cmsService.updateSection(+id, updateSectionDto);
  }

  // Site Settings
  @Get('settings/site')
  getSiteSettings() {
    return this.cmsService.getSiteSettings();
  }

  @Patch('settings/site')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updateSiteSettings(@Body() dto: UpdateSiteSettingsDto) {
    return this.cmsService.updateSiteSettings(dto);
  }

  @Get('settings/footer')
  getFooterSettings() {
    return this.cmsService.getFooterSettings();
  }

  @Patch('settings/footer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updateFooterSettings(@Body() updateFooterSettingsDto: UpdateFooterSettingsDto) {
    return this.cmsService.updateFooterSettings(updateFooterSettingsDto);
  }

  @Get('home/backgrounds')
  getHomeBackgrounds(@Query() query: any) {
    return CRUD.findAll(this.cmsService.homeBackgroundsRepository, 'home_background', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'DESC', [], ['title', 'imageUrl'], {});
  }

  @Post('home/backgrounds')
  @UseInterceptors(FileInterceptor('imageUrl', imageUploadOptions))
  createHomeBackground(@Body() createHomeBackgroundDto: any, @UploadedFile() file?: Express.Multer.File) {
    return this.cmsService.createHomeBackground(createHomeBackgroundDto, file);
  }

  @Delete('home/backgrounds/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteHomeBackground(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.homeBackgroundsRepository, 'home_background', id);
  }

  @Get('home/partners')
  getPartnerLogos(@Query() query: any) {
    return CRUD.findAll(this.cmsService.partnerLogosRepository, 'partner_logo', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'ASC', [], ['name', 'logoUrl'], {});
  }

  @Post('home/partners')
  @UseInterceptors(FileInterceptor('imageUrl', imageUploadOptions))
  createPartnerLogo(@Body() createPartnerLogoDto: any, @UploadedFile() file?: Express.Multer.File) {
    return this.cmsService.createPartnerLogo(createPartnerLogoDto, file);
  }

  @Patch('home/backgrounds/:id')
  @UseInterceptors(FileInterceptor('imageUrl', imageUploadOptions))
  updateHomeBackground(@Param('id') id: string, @Body() updateHomeBackgroundDto: UpdateHomeBackgroundDto, @UploadedFile() file?: Express.Multer.File) {
    return this.cmsService.updateHomeBackground(+id, updateHomeBackgroundDto, file);
  }

  @Patch('home/partners/:id')
  @UseInterceptors(FileInterceptor('imageUrl', imageUploadOptions))
  updatePartnerLogo(@Param('id') id: string, @Body() updatePartnerLogoDto: UpdatePartnerLogoDto, @UploadedFile() file?: Express.Multer.File) {
    return this.cmsService.updatePartnerLogo(+id, updatePartnerLogoDto, file);
  }

  @Delete('home/partners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deletePartnerLogo(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.partnerLogosRepository, 'partner_logo', id);
  }

  @Post('faq/groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createFaqGroup(@Body() dto: CreateFaqGroupDto) {
    return this.cmsService.createFaqGroup(dto);
  }

  @Patch('faq/groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updateFaqGroup(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqGroupDto) {
    return this.cmsService.updateFaqGroup(id, dto);
  }

  @Delete('faq/groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteFaqGroup(@Param('id', ParseIntPipe) id: number) {
    // This uses your helper and will soft-delete the group;
    // items cascade if you defined onDelete: 'CASCADE' on the relation, or you can soft-delete items separately if needed.
    return CRUD.softDelete(this.cmsService.faqGroupsRepository, 'faq_group', id);
  }

  @Get('faq')
  getFaqGroups(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.groupId) filters.id = Number(query.groupId);

    return CRUD.findAll(this.cmsService.faqGroupsRepository, 'faq_group', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'ASC', ['items'], ['title'], filters);
  }

  @Post('faq/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createFaqItem(@Body() createFaqItemDto: CreateFaqItemDto) {
    return this.cmsService.createFaqItem(createFaqItemDto);
  }

  @Delete('faq/items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteFaqItem(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.faqItemsRepository, 'faq_item', id);
  }

  // About Content
  // ----- About: Features -----
  @Post('about/features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createAboutFeature(@Body() dto: CreateAboutFeatureDto) {
    return this.cmsService.createAboutFeature(dto);
  }

  // ----- About: Steps -----
  @Post('about/steps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createAboutStep(@Body() dto: CreateAboutStepDto) {
    return this.cmsService.createAboutStep(dto);
  }

  // ----- About: Highlights -----
  @Post('about/highlights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createAboutHighlight(@Body() dto: CreateAboutHighlightDto) {
    return this.cmsService.createAboutHighlight(dto);
  }

  // ----- About: Stats -----
  @Post('about/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createAboutStat(@Body() dto: CreateAboutStatDto) {
    return this.cmsService.createAboutStat(dto);
  }

  // ----- About: Team -----
  @Post('about/team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createAboutTeam(@Body() dto: CreateAboutTeamDto) {
    return this.cmsService.createAboutTeam(dto);
  }

  @Delete('about/highlights/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteAboutHighlight(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.aboutHighlightsRepository, 'about_highlight', id);
  }

  @Get('about/highlights')
  getAboutHighlights(@Query() query: any) {
    return CRUD.findAll(this.cmsService.aboutHighlightsRepository, 'about_highlight', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'ASC', [], ['title', 'description'], {});
  }

  @Get('about/features')
  getAboutFeatures(@Query() query: any) {
    return CRUD.findAll(this.cmsService.aboutFeaturesRepository, 'about_feature', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'ASC', [], ['title', 'description'], {});
  }

  @Delete('about/features/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteAboutFeature(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.aboutFeaturesRepository, 'about_feature', id);
  }

  @Get('about/steps')
  getAboutSteps(@Query() query: any) {
    return CRUD.findAll(this.cmsService.aboutStepsRepository, 'about_step', query.q || query.search, query.page, query.limit, query.sortBy ?? 'stepNumber', query.sortOrder ?? 'ASC', [], ['title', 'description'], {});
  }

  @Delete('about/steps/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteAboutStep(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.aboutStepsRepository, 'about_step', id);
  }

  @Get('about/stats')
  getAboutStats(@Query() query: any) {
    return CRUD.findAll(this.cmsService.aboutStatsRepository, 'about_stat', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'ASC', [], ['label'], {});
  }

  @Delete('about/stats/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteAboutStat(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.aboutStatsRepository, 'about_stat', id);
  }

  // ===== About: Team =====
  @Get('about/team')
  getAboutTeam(@Query() query: any) {
    return CRUD.findAll(this.cmsService.aboutTeamRepository, 'about_team', query.q || query.search, query.page, query.limit, query.sortBy ?? 'createdAt', query.sortOrder ?? 'ASC', [], ['name', 'role'], {});
  }

  @Delete('about/team/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  deleteAboutTeam(@Param('id', ParseIntPipe) id: number) {
    return CRUD.softDelete(this.cmsService.aboutTeamRepository, 'about_team', id);
  }
}
