
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PunctualityStatus, CreateCustomerReviewDto } from '../../dto/reviews.dto';
import { RatingDimension, NotificationType, UserType } from '../../entities/global.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerReview, AgentReview, CustomerReviewDimension, AgentReviewDimension, Appointment, User } from '../../entities/global.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

// Mock Repositories
const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockNotificationsService = {
  createNotification: jest.fn(),
  notifyUserType: jest.fn(),
};

// Mock Data
const mockAppointment = {
  id: 1,
  customer: { id: 10, fullName: 'Customer' },
  agent: { id: 20, fullName: 'Agent' },
};

const mockAgent = { id: 20, fullName: 'Agent' };

describe('ReviewsService - Rating Logic', () => {
  let service: ReviewsService;
  let customerReviewRepo: Repository<CustomerReview>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(CustomerReview), useValue: mockRepo },
        { provide: getRepositoryToken(AgentReview), useValue: mockRepo },
        { provide: getRepositoryToken(CustomerReviewDimension), useValue: mockRepo },
        { provide: getRepositoryToken(AgentReviewDimension), useValue: mockRepo },
        { provide: getRepositoryToken(Appointment), useValue: mockRepo },
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    customerReviewRepo = module.get<Repository<CustomerReview>>(getRepositoryToken(CustomerReview));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate correct rating for specific fields', async () => {
    mockRepo.findOne.mockImplementation((args) => {
        if (args.where && args.where.id === 1) return Promise.resolve(mockAppointment); // Appointment
        if (args.where && args.where.appointment && args.where.appointment.id === 1) return Promise.resolve(null); // Existing Review check
        if (args.where && args.where.id === 20) return Promise.resolve(mockAgent); // Agent
        if (args.where && args.where.id === 999) return Promise.resolve({ ...dto, id: 999 }); // Saved Review lookup
        return Promise.resolve(null);
    });
    mockRepo.create.mockImplementation((dto) => dto);
    mockRepo.save.mockImplementation((dto) => Promise.resolve({ ...dto, id: 999 }));

    const dto: CreateCustomerReviewDto = {
        appointmentId: 1,
        agentId: 20,
        punctuality: PunctualityStatus.SLIGHT_DELAY, // Score: 3
        accuracy: 4, // Score: 4
        professionalism: 5, // Score: 5
        trustworthiness: 4, // Score: 4
        recommendation: 9, // Score: 5 (>=9 is 5)
        // Total: 3+4+5+4+5 = 21. Avg: 21/5 = 4.2
    };

    const review = await service.createCustomerReview(dto);
    
    expect(review).toBeDefined();
    // Check if repository.create was called with correct rating
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        rating: 4.2
    }));
  });

  it('should map punctuality correctly', async () => {
     mockRepo.findOne.mockImplementation((args) => {
        if (args.where && args.where.id === 1) return Promise.resolve(mockAppointment);
        if (args.where && args.where.appointment && args.where.appointment.id === 1) return Promise.resolve(null);
        if (args.where && args.where.id === 20) return Promise.resolve(mockAgent);
        if (args.where && args.where.id === 999) return Promise.resolve({ id: 999 });
        return Promise.resolve(null);
    });
    mockRepo.create.mockImplementation((dto) => dto);
    mockRepo.save.mockImplementation((dto) => Promise.resolve({ ...dto, id: 999 }));

    const dto: CreateCustomerReviewDto = {
        appointmentId: 1,
        agentId: 20,
        punctuality: PunctualityStatus.NOTICEABLE_DELAY, // Score: 1
        accuracy: 1,
        professionalism: 1,
        trustworthiness: 1,
        recommendation: 4, // Score: 1 (<=4 is 1)
        // Total: 1+1+1+1+1 = 5. Avg: 1
    };

    await service.createCustomerReview(dto);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        rating: 1
    }));
  });

   it('should map recommendation correctly', async () => {
     mockRepo.findOne.mockImplementation((args) => {
        if (args.where && args.where.id === 1) return Promise.resolve(mockAppointment);
        if (args.where && args.where.appointment && args.where.appointment.id === 1) return Promise.resolve(null);
        if (args.where && args.where.id === 20) return Promise.resolve(mockAgent);
        if (args.where && args.where.id === 999) return Promise.resolve({ id: 999 });
        return Promise.resolve(null);
    });
    mockRepo.create.mockImplementation((dto) => dto);
    mockRepo.save.mockImplementation((dto) => Promise.resolve({ ...dto, id: 999 }));

    // Case: 8 -> 4
    const dto1: CreateCustomerReviewDto = {
        appointmentId: 1,
        agentId: 20,
        punctuality: PunctualityStatus.COMMITTED, // 5
        accuracy: 4,
        professionalism: 4,
        trustworthiness: 4,
        recommendation: 8, // 4
        // Avg: (5+4+4+4+4)/5 = 21/5 = 4.2
    };

    await service.createCustomerReview(dto1);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        rating: 4.2
    }));

     // Case: 6 -> 3
    const dto2: CreateCustomerReviewDto = {
        appointmentId: 1,
        agentId: 20,
        punctuality: PunctualityStatus.COMMITTED, // 5
        accuracy: 3,
        professionalism: 3,
        trustworthiness: 3,
        recommendation: 6, // 3
        // Avg: (5+3+3+3+3)/5 = 17/5 = 3.4
    };

    await service.createCustomerReview(dto2);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        rating: 3.4
    }));
  });
});
