import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from './channel-adapter.interface';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  readonly channel = 'telegram';

  normalize(rawPayload: unknown): NormalizedMessage {
    const payload = rawPayload as {
      message?: { chat?: { id?: number }; text?: string };
    };
    return {
      channel: this.channel,
      channelUid: String(payload.message?.chat?.id ?? ''),
      text: payload.message?.text ?? '',
    };
  }

  async send(chatId: string, text: string): Promise<void> {
    console.log(`[Telegram] Sending to ${chatId}: ${text}`);
  }
}
