import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from './channel-adapter.interface';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp';

  normalize(rawPayload: unknown): NormalizedMessage {
    const payload = rawPayload as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from?: string;
              text?: { body?: string };
            }>;
          };
        }>;
      }>;
    };

    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    return {
      channel: this.channel,
      channelUid: message?.from ?? '',
      text: message?.text?.body ?? '',
    };
  }

  async send(chatId: string, text: string): Promise<void> {
    console.log(`[WhatsApp] Sending to ${chatId}: ${text}`);
  }
}
