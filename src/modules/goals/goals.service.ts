import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGoal(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        type: dto.type,
        targetValue: dto.targetValue,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async getGoals(userId: string, status?: string) {
    return this.prisma.goal.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGoal(id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');

    return this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.deadline !== undefined && { deadline: new Date(dto.deadline) }),
      },
    });
  }

  async deleteGoal(id: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');

    await this.prisma.goal.delete({ where: { id } });
  }

  async createCheckin(goalId: string, dto: CreateCheckinDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');

    return this.prisma.goalCheckIn.create({
      data: {
        goalId,
        value: dto.value,
        note: dto.note,
      },
    });
  }

  async getCheckins(goalId: string, limit?: number) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');

    return this.prisma.goalCheckIn.findMany({
      where: { goalId },
      orderBy: { checkedIn: 'desc' },
      ...(limit ? { take: limit } : {}),
    });
  }

  async getProgress(goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');

    const checkins = await this.prisma.goalCheckIn.findMany({
      where: { goalId },
      orderBy: { checkedIn: 'asc' },
    });

    const trend = this.calculateTrend(checkins);
    const progressPct = this.calculateProgressPct(goal.targetValue, checkins);

    return { goal, checkins, trend, progressPct };
  }

  private calculateTrend(
    checkins: { value: { toNumber: () => number } }[],
  ): 'up' | 'down' | 'stable' {
    if (checkins.length < 2) return 'stable';

    const last = checkins[checkins.length - 1].value.toNumber();
    const prev = checkins[checkins.length - 2].value.toNumber();

    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'stable';
  }

  private calculateProgressPct(
    targetValue: { toNumber: () => number } | null,
    checkins: { value: { toNumber: () => number } }[],
  ): number | null {
    if (!targetValue || checkins.length === 0) return null;

    const current = checkins[checkins.length - 1].value.toNumber();
    const target = targetValue.toNumber();

    return Math.round((current / target) * 100 * 100) / 100;
  }
}
