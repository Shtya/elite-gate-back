import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate, NotificationChannel } from 'entities/global.entity';
import { CreateMessageTemplateDto, UpdateMessageTemplateDto, MessageTemplateQueryDto } from '../../dto/message-templates.dto';

@Injectable()
export class MessageTemplatesService {
  constructor(
    @InjectRepository(MessageTemplate)
    public readonly messageTemplatesRepository: Repository<MessageTemplate>, // 👈 expose
  ) {}

  async create(createMessageTemplateDto: CreateMessageTemplateDto): Promise<MessageTemplate> {
    // Check if template with same name and channel already exists
    const existingTemplate = await this.messageTemplatesRepository.findOne({
      where: {
        name: createMessageTemplateDto.name,
        channel: createMessageTemplateDto.channel,
      }
    });

    if (existingTemplate) {
      throw new ConflictException('Message template with this name and channel already exists');
    }

    const template = this.messageTemplatesRepository.create(createMessageTemplateDto);
    return this.messageTemplatesRepository.save(template);
  }

 
  async findOne(id: number): Promise<MessageTemplate> {
    const template = await this.messageTemplatesRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Message template not found');
    }
    return template;
  }

  async update(id: number, updateMessageTemplateDto: UpdateMessageTemplateDto): Promise<MessageTemplate> {
    const template = await this.findOne(id);

    if (updateMessageTemplateDto.name && updateMessageTemplateDto.name !== template.name) {
      const existingTemplate = await this.messageTemplatesRepository.findOne({
        where: {
          name: updateMessageTemplateDto.name,
          channel: updateMessageTemplateDto.channel || template.channel,
        }
      });

      if (existingTemplate && existingTemplate.id !== id) {
        throw new ConflictException('Message template with this name and channel already exists');
      }
    }

    Object.assign(template, updateMessageTemplateDto);
    return this.messageTemplatesRepository.save(template);
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);
    await this.messageTemplatesRepository.remove(template);
  }

  async approve(id: number): Promise<MessageTemplate> {
    const template = await this.findOne(id);
    template.approved = true;
    return this.messageTemplatesRepository.save(template);
  }

  async disapprove(id: number): Promise<MessageTemplate> {
    const template = await this.findOne(id);
    template.approved = false;
    return this.messageTemplatesRepository.save(template);
  }

  async findByChannel(channel: NotificationChannel, locale?: string): Promise<MessageTemplate[]> {
    const where: any = { channel, approved: true };
    if (locale) where.locale = locale;

    return this.messageTemplatesRepository.find({
      where,
      order: { name: 'ASC' }
    });
  }

  async previewTemplate(id: number, variables: Record<string, any>): Promise<{ preview: string }> {
    const template = await this.findOne(id);
    let preview = template.body;

    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      preview = preview.replace(new RegExp(placeholder, 'g'), variables[key] || '');
    });

    return { preview };
  }

  async getTemplateByName(name: string, channel: NotificationChannel, locale: string = 'ar'): Promise<MessageTemplate> {
    const template = await this.messageTemplatesRepository.findOne({
      where: {
        name,
        channel,
        locale,
        approved: true,
      }
    });

    if (!template) {
      throw new NotFoundException(`Message template '${name}' not found for channel ${channel} and locale ${locale}`);
    }

    return template;
  }

  async renderTemplate(name: string, channel: NotificationChannel, variables: Record<string, any>, locale: string = 'ar'): Promise<string> {
    const template = await this.getTemplateByName(name, channel, locale);
    let rendered = template.body;

    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), variables[key] || '');
    });

    return rendered;
  }
}