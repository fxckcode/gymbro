import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by their channel identity, or create a new user + identity if none exists.
   */
  async identify(channel: string, channelUid: string) {
    const identity = await this.prisma.channelIdentity.findUnique({
      where: { channel_channelUid: { channel, channelUid } },
      include: { user: true },
    });

    if (identity) {
      return identity.user;
    }

    const user = await this.prisma.user.create({
      data: {
        channelIdentities: {
          create: { channel, channelUid },
        },
      },
    });

    this.logger.log(`Created new user ${user.id} via ${channel}:${channelUid}`);
    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
