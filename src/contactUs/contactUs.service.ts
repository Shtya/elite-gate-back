import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactUs, NotificationType, NotificationChannel, UserType } from 'entities/global.entity';
import { CreateContactUsDto } from '../../dto/users.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ContactUsService {
  constructor(
    @InjectRepository(ContactUs)
    public readonly contactUsRepository: Repository<ContactUs>,
    private readonly notificationsService: NotificationsService,
  ) {}


  async create(createContactUsDto: CreateContactUsDto) {
    const contact = this.contactUsRepository.create(createContactUsDto);
    const savedContact = await this.contactUsRepository.save(contact);

    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.SYSTEM,
      title: 'New Contact Message Received',
      message: `A new contact message has been submitted by ${savedContact.name} (${savedContact.email}).`,
      relatedId: savedContact.id,
      channel: NotificationChannel.IN_APP,
    });

    return savedContact;
  }

  async findOne(id: number) {
    const contact = await this.contactUsRepository.findOne({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async remove(id: number) {
    const contact = await this.findOne(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return await this.contactUsRepository.softRemove(contact);
  }
}
