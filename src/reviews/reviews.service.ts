import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CustomerReview, AgentReview, CustomerReviewDimension, AgentReviewDimension, Appointment, User, RatingDimension, NotificationType, NotificationChannel, UserType } from '../../entities/global.entity';
import { CreateCustomerReviewDto, CreateAgentReviewDto, UpdateReviewDto, ReviewQueryDto, PunctualityStatus } from '../../dto/reviews.dto';
import { NotificationsService } from '../notifications/notifications.service';

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
    console.log('createCustomerReview DTO:', JSON.stringify(createDto));
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

    // Calculate rating and dimensions if specific fields are provided
    let finalRating = createDto.rating || 0;
    const generatedDimensions: { dimension: RatingDimension; score: number }[] = [];

    if (createDto.punctuality || createDto.accuracy || createDto.professionalism || createDto.trustworthiness || createDto.recommendation) {
      console.log('Processing individual dimension fields for CustomerReview...');
      // 1. Punctuality
      let punctualityScore = 0;
      if (createDto.punctuality) {
        switch (createDto.punctuality) {
          case PunctualityStatus.COMMITTED:
            punctualityScore = 5;
            break;
          case PunctualityStatus.SLIGHT_DELAY:
            punctualityScore = 3;
            break;
          case PunctualityStatus.NOTICEABLE_DELAY:
            punctualityScore = 1;
            break;
        }
        generatedDimensions.push({ dimension: RatingDimension.PUNCTUALITY, score: punctualityScore });
      }

      // 2. Accuracy
      if (createDto.accuracy) {
        generatedDimensions.push({ dimension: RatingDimension.ACCURACY, score: createDto.accuracy });
      }

      // 3. Professionalism
      if (createDto.professionalism) {
        generatedDimensions.push({ dimension: RatingDimension.PROFESSIONALISM, score: createDto.professionalism });
      }

      // 4. Trustworthiness (Knowledge)
      if (createDto.trustworthiness) {
        generatedDimensions.push({ dimension: RatingDimension.TRUSTWORTHINESS, score: createDto.trustworthiness });
      }

      // 5. Recommendation
      if (createDto.recommendation) {
        let recScore = 1;
        const val = createDto.recommendation;
        if (val >= 9) recScore = 5;
        else if (val >= 7) recScore = 4;
        else if (val >= 6) recScore = 3;
        else if (val >= 5) recScore = 2;
        else recScore = 1;

        generatedDimensions.push({ dimension: RatingDimension.RECOMMENDATION, score: recScore });
      }
      
      // Calculate Average for main rating
      if (generatedDimensions.length > 0) {
        const sum = generatedDimensions.reduce((acc, curr) => acc + curr.score, 0);
        finalRating = sum / generatedDimensions.length;
      }
    }
    
    console.log('Final generatedDimensions (Customer):', generatedDimensions);

    if (finalRating === 0 && (!createDto.dimensions || createDto.dimensions.length === 0)) {
        throw new BadRequestException('Rating or rating dimensions are required');
    }

    const review = this.customerReviewRepository.create({
      appointment,
      customer: appointment.customer,
      agentId: createDto.agentId,
      rating: finalRating,
      reviewText: createDto.reviewText,
    });

    const savedReview = await this.customerReviewRepository.save(review);

    // Save dimensions
    // Combine generated dimensions with manually passed dimensions (if any, though uncommon to mix)
    const dimensionsToSave = [...(createDto.dimensions || []), ...generatedDimensions.map(d => ({ dimension: d.dimension, score: d.score }))];
    console.log('dimensionsToSave (Customer):', dimensionsToSave);
    
    if (dimensionsToSave.length > 0) {
      const dimensions = dimensionsToSave.map(dim =>
        this.customerReviewDimensionRepository.create({
          review: savedReview,
          dimension: dim.dimension,
          score: dim.score,
        }),
      );
      await this.customerReviewDimensionRepository.save(dimensions);
    }
    
    console.log('Notification start...');
    // Notify the agent about a new review
    await this.notificationsService.createNotification({
      userId: createDto.agentId,
      type: NotificationType.REVIEW_SUBMITTED,
      title: 'تقييم جديد من عميل',
      message: `لقد استلمت تقييمًا جديدًا من العميل ${appointment.customer.fullName}.`,
      relatedId: savedReview.id,
      channel: NotificationChannel.IN_APP,
    });

    // Notify the admin about the new review
    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.REVIEW_SUBMITTED,
      title: 'تقييم وكيل جديد',
      message: `تم تقديم تقييم جديد للوكيل بواسطة العميل ${appointment.customer.fullName}.`,
      relatedId: savedReview.id,
      channel: NotificationChannel.IN_APP,
    });
    console.log('Notification done.');

    return this.findCustomerReview(savedReview.id);
  }

  async createAgentReview(createDto: CreateAgentReviewDto): Promise<AgentReview> {
    console.log('createAgentReview DTO:', JSON.stringify(createDto));
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

    // Calculate dimensions if specific fields are provided
    const generatedDimensions: { dimension: RatingDimension; score: number }[] = [];

    if (createDto.punctuality || createDto.accuracy || createDto.professionalism || createDto.trustworthiness || createDto.recommendation) {
      console.log('Processing individual dimension fields for AgentReview...');
      // 1. Punctuality
      let punctualityScore = 0;
      if (createDto.punctuality) {
        switch (createDto.punctuality) {
          case PunctualityStatus.COMMITTED:
            punctualityScore = 5;
            break;
          case PunctualityStatus.SLIGHT_DELAY:
            punctualityScore = 3;
            break;
          case PunctualityStatus.NOTICEABLE_DELAY:
            punctualityScore = 1;
            break;
        }
        generatedDimensions.push({ dimension: RatingDimension.PUNCTUALITY, score: punctualityScore });
      }

      // 2. Accuracy
      if (createDto.accuracy) {
        generatedDimensions.push({ dimension: RatingDimension.ACCURACY, score: createDto.accuracy });
      }

      // 3. Professionalism
      if (createDto.professionalism) {
        generatedDimensions.push({ dimension: RatingDimension.PROFESSIONALISM, score: createDto.professionalism });
      }

      // 4. Trustworthiness (Knowledge)
      if (createDto.trustworthiness) {
        generatedDimensions.push({ dimension: RatingDimension.TRUSTWORTHINESS, score: createDto.trustworthiness });
      }

      // 5. Recommendation
      if (createDto.recommendation) {
        let recScore = 1;
        const val = createDto.recommendation;
        if (val >= 9) recScore = 5;
        else if (val >= 7) recScore = 4;
        else if (val >= 6) recScore = 3;
        else if (val >= 5) recScore = 2;
        else recScore = 1;

        generatedDimensions.push({ dimension: RatingDimension.RECOMMENDATION, score: recScore });
      }
    }
    
    console.log('Final generatedDimensions (Agent):', generatedDimensions);

    const savedReview = await this.agentReviewRepository.save(review);
    
    const dimensionsToSave = [...(createDto.dimensions || []), ...generatedDimensions.map(d => ({ dimension: d.dimension, score: d.score }))];
    console.log('dimensionsToSave (Agent):', dimensionsToSave);

    if (dimensionsToSave.length > 0) {
      const dimensions = dimensionsToSave.map(dim =>
        this.agentReviewDimensionRepository.create({
          review: savedReview,
          dimension: dim.dimension,
          score: dim.score,
        }),
      );
      await this.agentReviewDimensionRepository.save(dimensions);
    }
    
    console.log('Notification start...');
    // Notify the customer about the agent’s review
    await this.notificationsService.createNotification({
      userId: appointment.customer.id,
      type: NotificationType.REVIEW_SUBMITTED,
      title: 'تقييم من الوكيل',
      message: `قدم الوكيل ${appointment.agent.fullName} تقييمًا حول تفاعلك.`,
      relatedId: savedReview.id,
      channel: NotificationChannel.IN_APP,
    });
    console.log('Notification done.');

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
    console.log('getAgentReviewSummary called with agentId:', agentId);
    if (!agentId) {
       console.log('getAgentReviewSummary: agentId is null/undefined');
       return {
         averageRating: 0,
         totalReviews: 0,
         dimensionAverages: {},
       };
    }

    const reviews = await this.customerReviewRepository.find({
      where: { agentId, isApproved: true },
      relations: ['dimensions'],
    });

    console.log(`getAgentReviewSummary: found ${reviews.length} reviews for agent ${agentId}`);
    if (reviews.length > 0) {
      console.log('Sample review dimensions:', JSON.stringify(reviews[0].dimensions));
    }

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        dimensionAverages: {},
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    const averageRating = totalRating / reviews.length;

    // Calculate dimension averages
    const dimensionSums: { [key in RatingDimension]: number } = {
      [RatingDimension.PUNCTUALITY]: 0,
      [RatingDimension.ACCURACY]: 0,
      [RatingDimension.PROFESSIONALISM]: 0,
      [RatingDimension.TRUSTWORTHINESS]: 0,
      [RatingDimension.RECOMMENDATION]: 0,
    };
    const dimensionCounts: { [key in RatingDimension]: number } = {
      [RatingDimension.PUNCTUALITY]: 0,
      [RatingDimension.ACCURACY]: 0,
      [RatingDimension.PROFESSIONALISM]: 0,
      [RatingDimension.TRUSTWORTHINESS]: 0,
      [RatingDimension.RECOMMENDATION]: 0,
    };

    reviews.forEach(review => {
      review.dimensions.forEach(dimension => {
        if (dimensionSums[dimension.dimension] !== undefined) {
             dimensionSums[dimension.dimension] += dimension.score;
             dimensionCounts[dimension.dimension]++;
        }
      });
    });

    const dimensionAverages: any = {};
    Object.values(RatingDimension).forEach(dimension => {
      const count = dimensionCounts[dimension as RatingDimension];
      dimensionAverages[dimension] = count > 0 ? dimensionSums[dimension as RatingDimension] / count : 0;
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      dimensionAverages,
    };
  }

  async getTopRatedAgents(limit: number = 5): Promise<any[]> {
    const topAgents = await this.customerReviewRepository
      .createQueryBuilder('review')
      .select('review.agentId', 'agentId')
      .addSelect('AVG(review.rating)', 'averageRating')
      .where('review.isApproved = :isApproved', { isApproved: true })
      .groupBy('review.agentId')
      .orderBy('"averageRating"', 'DESC')
      .limit(limit)
      .getRawMany();

    return Promise.all(topAgents.map(async (item) => {
        const agentId = parseInt(item.agentId);
        const agent = await this.usersRepository.findOne({ where: { id: agentId } });
        
        const summary = await this.getAgentReviewSummary(agentId);
        return {
            agent: agent ? { id: agent.id, name: agent.fullName, profilePhotoUrl: agent.profilePhotoUrl } : null,
            ...summary
        };
    }));
  }
  async getGlobalReviewSummary(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const reviews = await this.customerReviewRepository.find({
      where: { 
        isApproved: true,
        createdAt: Between(start, end)
      } as any, // casting to any because TypeORM types can be tricky with specific constraints, or just rely on standard FindOptions
      relations: ['dimensions'],
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        dimensionAverages: {},
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    const averageRating = totalRating / reviews.length;

    // Calculate dimension averages
    const dimensionSums: { [key in RatingDimension]: number } = {
      [RatingDimension.PUNCTUALITY]: 0,
      [RatingDimension.ACCURACY]: 0,
      [RatingDimension.PROFESSIONALISM]: 0,
      [RatingDimension.TRUSTWORTHINESS]: 0,
      [RatingDimension.RECOMMENDATION]: 0,
    };
    const dimensionCounts: { [key in RatingDimension]: number } = {
      [RatingDimension.PUNCTUALITY]: 0,
      [RatingDimension.ACCURACY]: 0,
      [RatingDimension.PROFESSIONALISM]: 0,
      [RatingDimension.TRUSTWORTHINESS]: 0,
      [RatingDimension.RECOMMENDATION]: 0,
    };

    reviews.forEach(review => {
      review.dimensions.forEach(dimension => {
        if (dimensionSums[dimension.dimension] !== undefined) {
             dimensionSums[dimension.dimension] += dimension.score;
             dimensionCounts[dimension.dimension]++;
        }
      });
    });

    const dimensionAverages: any = {};
    Object.values(RatingDimension).forEach(dimension => {
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
