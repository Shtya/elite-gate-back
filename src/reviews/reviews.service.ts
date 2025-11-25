import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerReview, AgentReview, CustomerReviewDimension, AgentReviewDimension, Appointment, User, RatingDimension, NotificationType, NotificationChannel, UserType } from 'entities/global.entity';
import { CreateCustomerReviewDto, CreateAgentReviewDto, UpdateReviewDto, ReviewQueryDto } from '../../dto/reviews.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CustomerReview)
    public customerReviewRepository: Repository<CustomerReview>,
    @InjectRepository(AgentReview)
    public agentReviewRepository: Repository<AgentReview>,
    @InjectRepository(CustomerReviewDimension)
    public customerReviewDimensionRepository: Repository<CustomerReviewDimension>,
    @InjectRepository(AgentReviewDimension)
    public agentReviewDimensionRepository: Repository<AgentReviewDimension>,
    @InjectRepository(Appointment)
    public appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    public usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async createCustomerReview(createDto: CreateCustomerReviewDto): Promise<CustomerReview> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: createDto.appointmentId },
      relations: ['customer', 'agent'],
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if review already exists for this appointment
    const existingReview = await this.customerReviewRepository.findOne({
      where: { appointment: { id: createDto.appointmentId } },
    });
    if (existingReview) {
      throw new ConflictException('Review already exists for this appointment');
    }

    const agent = await this.usersRepository.findOne({
      where: { id: createDto.agentId },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const review = this.customerReviewRepository.create({
      appointment,
      customer: appointment.customer,
      agentId: createDto.agentId,
      rating: createDto.rating,
      reviewText: createDto.reviewText,
    });

    const savedReview = await this.customerReviewRepository.save(review);

    // Save dimensions if provided
    if (createDto.dimensions && createDto.dimensions.length > 0) {
      const dimensions = createDto.dimensions.map(dim =>
        this.customerReviewDimensionRepository.create({
          review: savedReview,
          dimension: dim.dimension,
          score: dim.score,
        }),
      );
      await this.customerReviewDimensionRepository.save(dimensions);
    }

    // Notify the agent about a new review
    await this.notificationsService.createNotification({
      userId: createDto.agentId,
      type: NotificationType.RATING_REQUEST,
      title: 'New Review from a Client',
      message: `You have received a new review from the client ${appointment.customer.fullName}.`,
      relatedId: savedReview.id,
      channel: NotificationChannel.IN_APP,
    });

    // Notify the admin about the new review
    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.SYSTEM,
      title: 'New Agent Review',
      message: `A new review has been submitted for the agent by the client ${appointment.customer.fullName}.`,
      relatedId: savedReview.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.findCustomerReview(savedReview.id);
  }

  async createAgentReview(createDto: CreateAgentReviewDto): Promise<AgentReview> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: createDto.appointmentId },
      relations: ['customer', 'agent'],
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const existingReview = await this.agentReviewRepository.findOne({
      where: { appointment: { id: createDto.appointmentId } },
    });
    if (existingReview) {
      throw new ConflictException('Review already exists for this appointment');
    }

    const review = this.agentReviewRepository.create({
      appointment,
      agent: appointment.agent,
      customer: appointment.customer,
      rating: createDto.rating,
      reviewText: createDto.reviewText,
    });

    const savedReview = await this.agentReviewRepository.save(review);

    if (createDto.dimensions && createDto.dimensions.length > 0) {
      const dimensions = createDto.dimensions.map(dim =>
        this.agentReviewDimensionRepository.create({
          review: savedReview,
          dimension: dim.dimension,
          score: dim.score,
        }),
      );
      await this.agentReviewDimensionRepository.save(dimensions);
    }

    // Notify the customer about the agent’s review
    await this.notificationsService.createNotification({
      userId: appointment.customer.id,
      type: NotificationType.RATING_REQUEST,
      title: 'Review from Agent',
      message: `Agent ${appointment.agent.fullName} has submitted a review about your interaction.`,
      relatedId: savedReview.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.findAgentReview(savedReview.id);
  }

  async findCustomerReview(id: number): Promise<CustomerReview> {
    const review = await this.customerReviewRepository.findOne({
      where: { id },
      relations: ['appointment', 'customer', 'dimensions'],
    });

    if (!review) {
      throw new NotFoundException('Customer review not found');
    }

    return review;
  }

  async findAgentReview(id: number): Promise<AgentReview> {
    const review = await this.agentReviewRepository.findOne({
      where: { id },
      relations: ['appointment', 'agent', 'customer', 'dimensions'],
    });

    if (!review) {
      throw new NotFoundException('Agent review not found');
    }

    return review;
  }

  async updateCustomerReview(id: number, updateDto: UpdateReviewDto): Promise<CustomerReview> {
    const review = await this.findCustomerReview(id);
    Object.assign(review, updateDto);
    return this.customerReviewRepository.save(review);
  }

  async updateAgentReview(id: number, updateDto: UpdateReviewDto): Promise<AgentReview> {
    const review = await this.findAgentReview(id);
    Object.assign(review, updateDto);
    return this.agentReviewRepository.save(review);
  }

  async getAgentReviewSummary(agentId: number): Promise<any> {
    const reviews = await this.customerReviewRepository.find({
      where: { agentId, isApproved: true },
      relations: ['dimensions'],
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        dimensionAverages: {},
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Calculate dimension averages
    const dimensionSums: { [key in RatingDimension]: number } = {
      [RatingDimension.COOPERATION]: 0,
      [RatingDimension.COMMUNICATION]: 0,
      [RatingDimension.PROFESSIONALISM]: 0,
      [RatingDimension.CLARITY]: 0,
    };
    const dimensionCounts: { [key in RatingDimension]: number } = {
      [RatingDimension.COOPERATION]: 0,
      [RatingDimension.COMMUNICATION]: 0,
      [RatingDimension.PROFESSIONALISM]: 0,
      [RatingDimension.CLARITY]: 0,
    };

    reviews.forEach(review => {
      review.dimensions.forEach(dimension => {
        dimensionSums[dimension.dimension] += dimension.score;
        dimensionCounts[dimension.dimension]++;
      });
    });

    const dimensionAverages: any = {};
    Object.keys(RatingDimension).forEach(dimension => {
      const count = dimensionCounts[dimension as RatingDimension];
      dimensionAverages[dimension] = count > 0 ? dimensionSums[dimension as RatingDimension] / count : 0;
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      dimensionAverages,
    };
  }
}
