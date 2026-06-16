import {
  Injectable,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from './channel-adapter.interface';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  private readonly logger = new Logger(TelegramAdapter.name);
  readonly channel = 'telegram';

  private get token(): string {
    return process.env.TELEGRAM_BOT_TOKEN ?? '';
  }

  get apiUrl(): string {
    return `https://api.telegram.org/bot${this.token}`;
  }

  escapeMarkdown(text: string): string {
    const specialChars = /[_*[\]()~>#+\-=|{}.!]/g;
    return text.replace(specialChars, '\\$&');
  }

  async getMe(): Promise<{ ok: boolean; username?: string }> {
    const res = await fetch(`${this.apiUrl}/getMe`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return { ok: data.ok, username: data.result?.username };
  }

  async send(chatId: string, text: string): Promise<void> {
    const url = `${this.apiUrl}/sendMessage`;
    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
    });

    let attempts = 0;
    const maxRetries = 3;

    while (attempts < maxRetries) {
      attempts++;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        if (res.ok) return;

        if (res.status === 429) {
          const retryAfter = parseInt(
            res.headers.get('Retry-After') ?? '1',
            10,
          );
          const jitter = Math.random() * 2;
          const wait = Math.max(retryAfter + jitter, 1);
          this.logger.warn(
            `Rate limited, retrying in ${wait}s (attempt ${attempts}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, wait * 1000));
          continue;
        }

        if (res.status === 401) {
          throw new HttpException('Invalid Telegram bot token', 401);
        }

        const errorBody = await res.text();
        throw new InternalServerErrorException(
          `Telegram API error: ${res.status} ${errorBody}`,
        );
      } catch (err) {
        if (err instanceof HttpException) throw err;
        if (err instanceof InternalServerErrorException) throw err;
        if (attempts >= maxRetries) throw err;
        this.logger.warn(
          `Request failed, retrying (attempt ${attempts}/${maxRetries}): ${err instanceof Error ? err.message : String(err)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } finally {
        clearTimeout(timeout);
      }
    }
  }

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
}
