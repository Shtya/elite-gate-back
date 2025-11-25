import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityCase, QualityCaseNote, QualityCaseStatus, QualityCasePriority, User, NotificationType, NotificationChannel, UserType } from 'entities/global.entity';
import { CreateQualityCaseDto, UpdateQualityCaseDto, AddCaseNoteDto, QualityCaseQueryDto } from '../../dto/quality.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class QualityService {
   constructor(
    @InjectRepository(QualityCase)
    public readonly qualityCasesRepository: Repository<QualityCase>, // 👈 expose
    @InjectRepository(QualityCaseNote)
    private caseNotesRepository: Repository<QualityCaseNote>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async createCase(createQualityCaseDto: CreateQualityCaseDto): Promise<QualityCase> {
    const qualityCase = this.qualityCasesRepository.create(createQualityCaseDto);

    // Notify the quality team about a new quality case
    await this.notificationsService.notifyUserType(UserType.QUALITY, {
      type: NotificationType.SYSTEM,
      title: 'New Quality Case',
      message: `A new quality case has been created: ${qualityCase.title}`,
      relatedId: qualityCase.id,
      channel: NotificationChannel.IN_APP,
    });

    // Notify the admin about high-priority quality cases
    if (createQualityCaseDto.priority === 'high' || createQualityCaseDto.priority === 'critical') {
      await this.notificationsService.notifyUserType(UserType.ADMIN, {
        type: NotificationType.SYSTEM,
        title: 'High Priority Quality Case',
        message: `A high-priority quality case requires attention: ${qualityCase.title}`,
        relatedId: qualityCase.id,
        channel: NotificationChannel.IN_APP,
      });
    }

    return this.qualityCasesRepository.save(qualityCase);
  }

 

  async findCase(id: number): Promise<QualityCase> {
    const qualityCase = await this.qualityCasesRepository.findOne({
      where: { id },
      relations: ['assignee', 'notes', 'notes.author'],
    });

    if (!qualityCase) {
      throw new NotFoundException('Quality case not found');
    }

    return qualityCase;
  }

  async updateCase(id: number, updateQualityCaseDto: UpdateQualityCaseDto): Promise<QualityCase> {
    const qualityCase = await this.findCase(id);

    if (updateQualityCaseDto.assigneeId) {
      const assignee = await this.usersRepository.findOne({
        where: { id: updateQualityCaseDto.assigneeId },
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }
      qualityCase.assignee = assignee;
    }

    Object.assign(qualityCase, updateQualityCaseDto);
    return this.qualityCasesRepository.save(qualityCase);
  }

  async addCaseNote(caseId: number, addCaseNoteDto: AddCaseNoteDto): Promise<QualityCaseNote> {
    const qualityCase = await this.findCase(caseId);

    const note = this.caseNotesRepository.create({
      ...addCaseNoteDto,
      case: qualityCase,
      author: { id: 1 } as User, // From authenticated user
    });

    return this.caseNotesRepository.save(note);
  }

  async assignCase(caseId: number, assigneeId: number): Promise<QualityCase> {
    const qualityCase = await this.findCase(caseId);
    const assignee = await this.usersRepository.findOne({
      where: { id: assigneeId },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }

    qualityCase.assignee = assignee;

    await this.notificationsService.createNotification({
      userId: assignee.id,
      type: NotificationType.SYSTEM,
      title: 'You Have Been Assigned to a Quality Case',
      message: `You have been assigned to the quality case: ${qualityCase.title}`,
      relatedId: qualityCase.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.qualityCasesRepository.save(qualityCase);
  }

  async closeCase(caseId: number): Promise<QualityCase> {
    const qualityCase = await this.findCase(caseId);
    qualityCase.status = QualityCaseStatus.CLOSED;
    return this.qualityCasesRepository.save(qualityCase);
  }

  async getQualityStats(): Promise<any> {
    const totalCases = await this.qualityCasesRepository.count();
    const openCases = await this.qualityCasesRepository.count({
      where: { status: QualityCaseStatus.OPEN },
    });
    const inProgressCases = await this.qualityCasesRepository.count({
      where: { status: QualityCaseStatus.IN_PROGRESS },
    });
    const resolvedCases = await this.qualityCasesRepository.count({
      where: { status: QualityCaseStatus.RESOLVED },
    });

    const priorityStats = await this.qualityCasesRepository.createQueryBuilder('case').select('case.priority', 'priority').addSelect('COUNT(*)', 'count').groupBy('case.priority').getRawMany();

    return {
      totalCases,
      openCases,
      inProgressCases,
      resolvedCases,
      priorityStats: priorityStats.reduce((acc, stat) => {
        acc[stat.priority] = parseInt(stat.count);
        return acc;
      }, {}),
    };
  }
}
