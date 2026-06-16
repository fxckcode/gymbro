import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8PM)
  async checkInactiveUsers() {
    this.logger.log('Checking inactive users...');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const inactiveUsers = await this.prisma.user.findMany({
      where: {
        workoutSessions: {
          none: { performedAt: { gte: twoDaysAgo } },
        },
      },
      include: {
        channelIdentities: true,
      },
    });

    this.logger.log(`Found ${inactiveUsers.length} inactive users`);
    // Channel adapters would be used here to send notifications
    // Currently logging — real send requires ChannelAdapter integration
  }

  @Cron('0 9 * * 1') // Every Monday at 9 AM
  async sendWeeklyProgress() {
    this.logger.log('Sending weekly progress summaries...');
    const users = await this.prisma.user.findMany({
      include: { channelIdentities: true },
    });

    for (const user of users) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const sessions = await this.prisma.workoutSession.findMany({
        where: { userId: user.id, performedAt: { gte: weekAgo } },
        orderBy: { performedAt: 'desc' },
      });

      if (sessions.length === 0) continue;

      let totalVolume = 0;
      let totalSessions = sessions.length;
      for (const session of sessions) {
        const entries = session.entries as Array<{ sets: Array<{ weight: number; reps: number }> }>;
        for (const entry of entries ?? []) {
          for (const set of entry.sets ?? []) {
            totalVolume += set.weight * set.reps;
          }
        }
      }

      this.logger.log(
        `User ${user.id}: ${totalSessions} sessions, ${Math.round(totalVolume)}kg volume`,
      );
    }
  }
}
