import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateCustomerReviewDto, CreateAgentReviewDto, UpdateReviewDto, ReviewQueryDto } from '../../dto/reviews.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('customer')
  createCustomerReview(@Body() createCustomerReviewDto: CreateCustomerReviewDto) {
    return this.reviewsService.createCustomerReview(createCustomerReviewDto);
  }

  @Post('agent')
  createAgentReview(@Body() createAgentReviewDto: CreateAgentReviewDto) {
    return this.reviewsService.createAgentReview(createAgentReviewDto);
  }

  @Get('customer')
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY)
  findAllCustomerReviews(@Query() query: any) {
    const filters: Record<string, any> = {};

    // if your entity has a direct FK column (agentId)
    if (typeof query.agentId !== 'undefined') {
      filters.agentId = Number(query.agentId);
    }
    if (typeof query.isApproved !== 'undefined') {
      filters.isApproved = query.isApproved === 'true' ? true : query.isApproved === 'false' ? false : query.isApproved;
    }

    return CRUD.findAll(
      this.reviewsService.customerReviewRepository, // repo
      'customer_review', // alias used in QB
      query.q || query.search, // search
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['appointment', 'customer', 'dimensions'], // relations
      [], // searchFields (add root cols if you want)
      filters, // filters (no range)
    );
  }

  // ===== Agent Reviews =====
  @Get('agent')
  @Roles(UserType.ADMIN, UserType.CUSTOMER, UserType.QUALITY)
  findAllAgentReviews(@Query() query: any) {
    const filters: Record<string, any> = {};

    // nested filter via relation
    if (typeof query.customerId !== 'undefined') {
      filters.customer = { id: Number(query.customerId) };
    }

    return CRUD.findAll(
      this.reviewsService.agentReviewRepository, // repo
      'agent_review', // alias used in QB
      query.q || query.search, // search
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['appointment', 'agent', 'customer', 'dimensions'], // relations
      [], // searchFields (add root cols if needed)
      filters, // filters (no range)
    );
  }

  @Get('customer/:id')
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.CUSTOMER, UserType.QUALITY)
  findCustomerReview(@Param('id') id: string) {
    return this.reviewsService.findCustomerReview(+id);
  }

  @Get('agent/:id')
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.CUSTOMER, UserType.QUALITY)
  findAgentReview(@Param('id') id: string) {
    return this.reviewsService.findAgentReview(+id);
  }

  @Patch('customer/:id')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  updateCustomerReview(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.updateCustomerReview(+id, updateReviewDto);
  }

  @Patch('agent/:id')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  updateAgentReview(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.updateAgentReview(+id, updateReviewDto);
  }

  @Get('agent/:agentId/summary')
  getAgentReviewSummary(@Param('agentId') agentId: string) {
    return this.reviewsService.getAgentReviewSummary(+agentId);
  }
}
