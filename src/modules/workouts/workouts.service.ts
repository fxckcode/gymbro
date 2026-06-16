import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(userId: string, dto: CreateWorkoutPlanDto) {
    return this.prisma.workoutPlan.create({
      data: {
        userId,
        name: dto.name,
        structure: dto.structure,
        active: dto.active ?? true,
      },
    });
  }

  async getPlans(userId: string, active?: boolean) {
    return this.prisma.workoutPlan.findMany({
      where: { userId, ...(active !== undefined ? { active } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePlan(id: string, dto: UpdateWorkoutPlanDto) {
    try {
      return await this.prisma.workoutPlan.update({
        where: { id },
        data: dto,
      });
    } catch {
      throw new NotFoundException(`Workout plan ${id} not found`);
    }
  }

  async deletePlan(id: string): Promise<void> {
    try {
      await this.prisma.workoutPlan.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Workout plan ${id} not found`);
    }
  }

  async createSession(userId: string, dto: CreateWorkoutSessionDto) {
    return this.prisma.workoutSession.create({
      data: {
        userId,
        workoutPlanId: dto.workoutPlanId,
        dayName: dto.dayName,
        entries: dto.entries as any,
        notes: dto.notes,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
      },
    });
  }

  async getSessions(
    userId: string,
    limit = 10,
    offset = 0,
    from?: string,
    to?: string,
  ) {
    const where: any = { userId };

    if (from || to) {
      where.performedAt = {};
      if (from) where.performedAt.gte = new Date(from);
      if (to) where.performedAt.lte = new Date(to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workoutSession.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.workoutSession.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  async getSession(id: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id },
    });
    if (!session) {
      throw new NotFoundException(`Workout session ${id} not found`);
    }
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await this.prisma.workoutSession.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Workout session ${id} not found`);
    }
  }
}
