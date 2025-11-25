import { Controller, Post, Get, Patch, Delete, Param, Body, Query, UseGuards, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { TrafficService } from './traffic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { TrackVisitorDto } from './traffic.service';

@Controller('traffic')
export class TrafficController {
  constructor(private readonly service: TrafficService) {}

  // -------- Partners (Admin/Marketer) --------
  @Post('partners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  createPartner(@Body() body: any) {
    return this.service.createPartnerAndShareUrl(body);
  }

  @Post('partners/:id/share-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  buildShareUrl(@Param('id') id: string, @Body() body: any) {
    // body: { baseShareUrl?, utm?: {...} }
    return this.service.buildShareUrlForPartner(+id, body);
  }

  @Get('partners/:id/performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  partnerPerformance(@Param('id') id: string, @Query() q: any) {
    // q: { startDate?, endDate? }
    return this.service.getPartnerPerformance(+id, q);
  }

  // (اختياري) إدارة بسيطة
  @Get('partners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  listPartners(@Query() q: any) {
    return this.service.listPartners(q);
  }

  @Get('partners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  getPartnerById(@Param('id') id: number) {
    return this.service.getpartnersbyId(+id);
  }

  @Patch('partners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  updatePartner(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePartner(+id, body);
  }

  @Delete('partners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  deletePartner(@Param('id') id: string) {
    return this.service.deletePartner(+id);
  }

  // -------- Tracking (Public) --------
  @Post('track')
  async track(@Body() body: TrackVisitorDto, @Req() req: Request) {
    // Basic validation
    if (!body.visitedUrl) {
      throw new BadRequestException('visitedUrl is required');
    }
    if (!body.referralCode) {
      throw new BadRequestException('referralCode is required');
    }

    // Let the service handle IP/UA extraction and duplicate checking
    return await this.service.trackVisitor(body, req);
  }

  // -------- Conversions (Admin/Marketer) --------
  @Post('conversions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  createConversion(@Body() body: any, @Req() req: any) {
    // body: { userId, type: 'registration'|'appointment', visitorId?, referralCode?, campaignId? }
    const headerRef = (req.headers['x-ref'] as string) || undefined;
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    return this.service.createConversion(
      {
        ...body,
        referralCode: body.referralCode ?? headerRef,
      },
      userId,
    );
  }

  @Patch('partners/:id/balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  adjustPartnerBalance(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.adjustPartnerBalance(+id, body.amount);
  }

  @Post('partners/:id/withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.MARKETER)
  withdrawForPartner(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.createPartnerWithdrawal(+id, body.amount);
  }
}
