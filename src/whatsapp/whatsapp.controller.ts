import { Body, Controller, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { SendWhatsappTextDto, SendWhatsappTemplateDto } from './whatsapp.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  // POST /whatsapp/text
  @Post('text')
  sendText(@Body() dto: SendWhatsappTextDto) {
    return this.whatsappService.sendTextMessage(dto);
  }

  // POST /whatsapp/template
  @Post('template')
  sendTemplate(@Body() dto: SendWhatsappTemplateDto) {
    return this.whatsappService.sendTemplateMessage(dto);
  }
}
