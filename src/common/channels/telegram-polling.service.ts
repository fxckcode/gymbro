import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { TelegramAdapter } from './telegram.adapter';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TelegramPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPollingService.name);
  private offset = 0;
  private polling = false;

  constructor(
    private readonly telegramAdapter: TelegramAdapter,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    setTimeout(() => this.start(), 3000);
  }

  async start() {
    this.polling = true;
    this.poll().catch((err) =>
      this.logger.error('Polling crashed', err instanceof Error ? err.stack : String(err)),
    );
  }

  private async poll(): Promise<void> {
    const url = `${this.telegramAdapter.apiUrl}/getUpdates`;

    while (this.polling) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: this.offset, timeout: 30 }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          this.logger.warn(`getUpdates returned ${res.status}`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        const data: { ok: boolean; result?: Array<{ update_id: number; message?: { chat?: { id: number }; text?: string } }> } = await res.json();

        if (data.ok && data.result) {
          for (const update of data.result) {
            await this.processUpdate(update);
            this.offset = update.update_id + 1;
          }
        }
      } catch (err) {
        this.logger.error(
          `Polling error: ${err instanceof Error ? err.message : String(err)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processUpdate(update: {
    update_id: number;
    message?: { chat?: { id: number }; text?: string };
  }): Promise<void> {
    const chatId = update.message?.chat?.id;
    const text = update.message?.text;
    if (!chatId || !text) return;

    const channelUid = String(chatId);

    // Find or create user via channel identity
    let identity = await this.prisma.channelIdentity.findUnique({
      where: { channel_channelUid: { channel: 'telegram', channelUid } },
    });

    if (!identity) {
      // Create a new user and channel identity
      const user = await this.prisma.user.create({ data: {} });
      identity = await this.prisma.channelIdentity.create({
        data: { userId: user.id, channel: 'telegram', channelUid },
      });
    }

    // Save the incoming message
    await this.prisma.chatMessage.create({
      data: {
        userId: identity.userId,
        role: 'user',
        content: text,
        channel: 'telegram',
      },
    });

    this.logger.log(
      `Saved message from telegram user ${chatId} (user ${identity.userId})`,
    );
  }

  onModuleDestroy() {
    this.polling = false;
  }
}
