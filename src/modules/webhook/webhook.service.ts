import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processIncoming(
    channel: string,
    channelUid: string,
    text: string,
  ): Promise<{ userId: string; reply: string }> {
    // Find or create user by channel identity
    const identity = await this.prisma.channelIdentity.findUnique({
      where: {
        channel_channelUid: { channel, channelUid },
      },
    });

    let userId: string;

    if (identity) {
      userId = identity.userId;
    } else {
      const user = await this.prisma.user.create({ data: {} });
      await this.prisma.channelIdentity.create({
        data: {
          userId: user.id,
          channel,
          channelUid,
        },
      });
      userId = user.id;
    }

    // Delegate to AgentService via HTTP call
    // In production, this would inject AgentService directly
    // For now, return the data needed to process
    return {
      userId,
      reply: `Mensaje recibido de ${channel} (${channelUid}). ID: ${userId}`,
    };
  }
}
