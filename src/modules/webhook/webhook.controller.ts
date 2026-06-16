import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('Webhook')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('incoming')
  @ApiOperation({ summary: 'Webhook unificado para todos los canales' })
  @ApiResponse({ status: 201, description: 'Mensaje procesado' })
  async handleIncoming(
    @Headers('x-channel') channel: string,
    @Body() body: any,
  ) {
    this.logger.log(`Webhook received from channel: ${channel ?? 'unknown'}`);

    // Detect channel and normalize
    let detectedChannel = channel ?? 'unknown';
    let channelUid = '';
    let text = '';

    if (body.message?.chat?.id) {
      // Telegram format
      detectedChannel = 'telegram';
      channelUid = String(body.message.chat.id);
      text = body.message.text ?? '';
    } else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      // WhatsApp format
      detectedChannel = 'whatsapp';
      const msg = body.entry[0].changes[0].value.messages[0];
      channelUid = msg.from;
      text = msg.text?.body ?? '';
    } else if (body.conversation?.contact_inbox?.source_id || body.message?.content) {
      // Chatwoot format
      detectedChannel = 'chatwoot';
      channelUid = body.conversation?.contact_inbox?.source_id ?? body.message?.sender?.id ?? 'unknown';
      text = body.message?.content ?? body.content ?? '';
    }

    if (!text) {
      return { ok: true, message: 'No text content' };
    }

    const result = await this.webhookService.processIncoming(
      detectedChannel,
      channelUid,
      text,
    );

    return { ok: true, userId: result.userId };
  }
}
