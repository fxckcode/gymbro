import { Injectable } from '@nestjs/common';
import { ChatMessage } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

type ChatMessagePlain = Omit<ChatMessage, 'id'> & { id: string };

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async addMessage(
    userId: string,
    role: string,
    content: string,
    channel?: string,
  ): Promise<ChatMessagePlain> {
    const msg = await this.prisma.chatMessage.create({
      data: { userId, role, content, channel },
    });
    return { ...msg, id: msg.id.toString() };
  }

  async getHistory(
    userId: string,
    limit: number = 30,
  ): Promise<ChatMessagePlain[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.map((m) => ({ ...m, id: m.id.toString() }));
  }

  async searchHistory(
    userId: string,
    query: string,
    limit: number = 10,
  ): Promise<ChatMessagePlain[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        userId,
        content: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.map((m) => ({ ...m, id: m.id.toString() }));
  }
}
