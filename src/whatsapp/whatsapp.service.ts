import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SendWhatsappTextDto, SendWhatsappTemplateDto } from './whatsapp.dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token = process.env.WHATSAPP_TOKEN_TEST || process.env.WHATSAPP_TOKEN;
  private readonly businessId = process.env.WHATSAPP_BUSINESS_ID;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID_TEST || process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly baseUrl = process.env.WHATSAPP_API_URL;

  constructor(private readonly http: HttpService) {}

  private get messagesUrl(): string {
    // https://graph.facebook.com/v22.0/{phoneNumberId}/messages
    return `${this.baseUrl}/${this.phoneNumberId}/messages`;
  }

  private get defaultHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(dto: SendWhatsappTextDto) {
    const payload = {
      messaging_product: 'whatsapp',
      to: dto.to,
      type: 'text',
      text: {
        body: dto.message,
      },
    };

    try {
      const res$ = this.http.post(this.messagesUrl, payload, {
        headers: this.defaultHeaders,
      });
      const { data } = await firstValueFrom(res$);
      this.logger.log(`WhatsApp text sent to ${dto.to}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp text to ${dto.to}`, error?.response?.data || error.message);
      throw new InternalServerErrorException(error?.response?.data || 'WhatsApp API error');
    }
  }

  async sendTemplateMessage(dto: SendWhatsappTemplateDto) {
    const components =
      dto.bodyParams && dto.bodyParams.length
        ? [
            {
              type: 'body',
              parameters: dto.bodyParams.map(val => ({
                type: 'text',
                text: val,
              })),
            },
          ]
        : undefined;

    const payload: any = {
      messaging_product: 'whatsapp',
      to: dto.to,
      type: 'template',
      template: {
        name: dto.templateName, // ex: "hello_world"
        language: {
          code: dto.languageCode, // ex: "en_US"
        },
      },
    };

    if (components) {
      payload.template.components = components;
    }

    try {
      const res$ = this.http.post(this.messagesUrl, payload, {
        headers: this.defaultHeaders,
      });
      const { data } = await firstValueFrom(res$);
      this.logger.log(`WhatsApp template "${dto.templateName}" sent to ${dto.to}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp template to ${dto.to}`, error?.response?.data || error.message);
      throw new InternalServerErrorException(error?.response?.data || 'WhatsApp API error');
    }
  }
}
