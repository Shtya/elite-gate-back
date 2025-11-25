import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus, User, VerificationStatus } from 'entities/global.entity';
import { CreateUserDto, UpdateUserDto, VerifyUserDto, UserQueryDto } from 'dto/users.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    public usersRepository: Repository<User>,
    @InjectRepository(Appointment)

    public appointmentsRepository: Repository<Appointment>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ email: createUserDto.email }, ...(createUserDto.phoneNumber ? [{ phoneNumber: createUserDto.phoneNumber }] : [])],
    });

    if (existingUser) {
      throw new ConflictException('User with this email (or phone) already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = this.usersRepository.create({
      email: createUserDto.email,
      fullName: createUserDto.fullName,
      userType: createUserDto.userType,
      phoneNumber: createUserDto.phoneNumber,
      profilePhotoUrl: createUserDto.profilePhotoUrl,
      residencyIdUrl: createUserDto.residencyIdUrl,
      nationalIdUrl: createUserDto.nationalIdUrl,
      passwordHash,
      verificationStatus: VerificationStatus.VERIFIED, // Admin-created users can be considered verified
      verifiedAt: new Date(),
      isActive: true,
    });

    return this.usersRepository.save(user);
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });
  
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    // Fetch all user appointments
    const appointments = await this.appointmentsRepository.find({
      where: { customer: { id: user.id } },
      relations: ['property', 'agent'],
    });
  
    // Run all appointment counts in parallel
    const [
      appointmentAccepted,
      appointmentExpired,
      appointmentCancelled,
      appointmentConfirmed,
      appointmentCompleted,
      appointmentRejected,
    ] = await Promise.all([
      this.appointmentsRepository.countBy({
        status: AppointmentStatus.ACCEPTED,
        customer: { id },
      }),
      this.appointmentsRepository.countBy({
        status: AppointmentStatus.EXPIRED,
        customer: { id },
      }),
      this.appointmentsRepository.countBy({
        status: AppointmentStatus.CANCELLED,
        customer: { id },
      }),
      this.appointmentsRepository.countBy({
        status: AppointmentStatus.CONFIRMED,
        customer: { id },
      }),
      this.appointmentsRepository.countBy({
        status: AppointmentStatus.COMPLETED,
        customer: { id },
      }),
      this.appointmentsRepository.countBy({
        status: AppointmentStatus.REJECTED,
        customer: { id },
      }),
    ]);
  
    return {
      ...user,
      appointments,
      stats: {
        accepted: appointmentAccepted,
        expired: appointmentExpired,
        cancelled: appointmentCancelled,
        confirmed: appointmentConfirmed,
        completed: appointmentCompleted,
        rejected: appointmentRejected,
      },
    };
  }
  

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email) {
      const existingUserByEmail = await this.usersRepository.findOne({ where: { email: updateUserDto.email } });
      if (existingUserByEmail && existingUserByEmail.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    if (updateUserDto.phoneNumber) {
      const existingUserByPhone = await this.usersRepository.findOne({ where: { phoneNumber: updateUserDto.phoneNumber } });
      if (existingUserByPhone && existingUserByPhone.id !== id) {
        throw new ConflictException('Phone number already in use');
      }
    }

    await this.usersRepository.update(id, updateUserDto);
    return this.usersRepository.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.usersRepository.softDelete(id);
  }

  async verifyUser(id: number, verifyUserDto: VerifyUserDto): Promise<User> {
    const user = await this.findOne(id);
    user.verificationStatus = verifyUserDto.status;
    if (verifyUserDto.status === VerificationStatus.VERIFIED) {
      user.verifiedAt = new Date();
    }
    return this.usersRepository.save(user);
  }

  async deactivate(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = false;
    return this.usersRepository.save(user);
  }

  async activate(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = true;
    return this.usersRepository.save(user);
  }

  async findByPhone(phoneNumber: string): Promise<User> {
    return this.usersRepository.findOne({ where: { phoneNumber } });
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({ where: { email } });
  }
}
