import { Injectable, Logger } from '@nestjs/common';
import { generateText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { PrismaService } from '../../prisma.service';
import {
  ParsedWorkoutSchema,
  MessageIntentSchema,
} from './schemas/workout-parse.schema';
import type { ParsedWorkout } from './schemas/workout-parse.schema';
import { buildSystemPrompt, UserContext } from './prompts/system.prompt';

interface SessionAnalysis {
  prDetected: boolean;
  prDetails?: { exercise: string; weight: number; previousBest: number };
  weeklyVolume: number;
  weeklyVolumeChange: number | null;
  deloadRecommended: boolean;
  insights: string[];
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private model;

  constructor(private readonly prisma: PrismaService) {
    const deepseek = createOpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    });
    this.model = deepseek('deepseek-chat');
  }

  async processMessage(
    userId: string,
    text: string,
    channel: string,
  ): Promise<{ reply: string; metadata?: Record<string, unknown> }> {
    await this.prisma.chatMessage.create({
      data: { userId, role: 'user', content: text, channel },
    });

    const context = await this.buildContext(userId);
    const systemPrompt = buildSystemPrompt(context);

    const tools: any = {
      getUserProfile: {
        description: 'Obtiene el perfil del usuario: nombre, metas activas y entrenamientos registrados',
        parameters: z.object({
          userId: z.string().uuid().describe('ID del usuario'),
        }),
        execute: async (args: any) => {
          const [user, goalCount, workoutCount] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: args.userId } }),
            this.prisma.goal.count({ where: { userId: args.userId, status: 'active' } }),
            this.prisma.workoutSession.count({ where: { userId: args.userId } }),
          ]);
          if (!user) return { error: 'Usuario no encontrado' };
          return { name: user.name ?? 'Sin nombre', goalsCount: goalCount, workoutsCount: workoutCount };
        },
      },
      getLastWorkout: {
        description: 'Obtiene la última sesión de entrenamiento del usuario',
        parameters: z.object({
          userId: z.string().uuid().describe('ID del usuario'),
        }),
        execute: async (args: any) => {
          const session = await this.prisma.workoutSession.findFirst({
            where: { userId: args.userId },
            orderBy: { performedAt: 'desc' },
          });
          if (!session) return { message: 'Aún no hay entrenamientos registrados' };
          return {
            id: session.id,
            dayName: session.dayName,
            performedAt: session.performedAt.toISOString(),
            exercises: session.entries,
            notes: session.notes,
          };
        },
      },
      logWorkout: {
        description: 'Registra una sesión de entrenamiento completa con ejercicios y sets',
        parameters: z.object({
          userId: z.string().uuid(),
          entries: z.array(
            z.object({
              exerciseName: z.string(),
              sets: z.array(z.object({ weight: z.number(), reps: z.number() })),
            }),
          ),
          notes: z.string().optional(),
          dayName: z.string().optional(),
          performedAt: z.string().optional(),
        }),
        execute: async (args: any) => {
          const performedAt = args.performedAt ? new Date(args.performedAt) : new Date();
          const session = await this.prisma.workoutSession.create({
            data: {
              userId: args.userId,
              entries: args.entries,
              notes: args.notes ?? null,
              dayName: args.dayName ?? null,
              performedAt,
            },
          });
          const totalSets = args.entries.reduce((sum: number, e: any) => sum + e.sets.length, 0);
          const totalVolume = args.entries.reduce(
            (sum: number, e: any) => sum + e.sets.reduce((s: number, set: any) => s + set.weight * set.reps, 0), 0,
          );
          return {
            id: session.id,
            exercises: args.entries.length,
            totalSets,
            totalVolume: Math.round(totalVolume),
            performedAt: performedAt.toISOString(),
            message: `Registrados ${args.entries.length} ejercicios, ${totalSets} series, ${Math.round(totalVolume)}kg volumen total`,
          };
        },
      },
      getGoalProgress: {
        description: 'Obtiene el progreso de las metas activas del usuario',
        parameters: z.object({
          userId: z.string().uuid().describe('ID del usuario'),
        }),
        execute: async (args: any) => {
          const goals = await this.prisma.goal.findMany({
            where: { userId: args.userId, status: 'active' },
          });
          const results = await Promise.all(
            goals.map(async (goal: any) => {
              const latest = await this.prisma.goalCheckIn.findFirst({
                where: { goalId: goal.id },
                orderBy: { checkedIn: 'desc' },
              });
              const progressPct = goal.targetValue && latest
                ? Math.round((Number(latest.value) / Number(goal.targetValue)) * 100) : null;
              return {
                id: goal.id,
                title: goal.title,
                type: goal.type,
                targetValue: goal.targetValue ? Number(goal.targetValue) : null,
                latestValue: latest ? Number(latest.value) : null,
                progressPct,
                latestCheckin: latest
                  ? { value: Number(latest.value), note: latest.note, date: latest.checkedIn.toISOString() }
                  : null,
              };
            }),
          );
          return results;
        },
      },
    };

    try {
      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: text,
        tools,
        maxRetries: 2,
      });

      const reply = result.text ?? 'No pude generar una respuesta.';

      await this.prisma.chatMessage.create({
        data: { userId, role: 'assistant', content: reply, channel },
      });

      const intent = await this.classifyIntent(text);
      let workoutLogged = false;
      let prDetected = false;

      if (intent.type === 'logWorkout') {
        try {
          const parsed = await this.parseWorkout(text);
          if (parsed && parsed.entries.length > 0) {
            await this.prisma.workoutSession.create({
              data: {
                userId,
                entries: parsed.entries as any,
                notes: parsed.notes ?? null,
                dayName: parsed.dayName ?? null,
                performedAt: parsed.performedAt ? new Date(parsed.performedAt) : new Date(),
              },
            });
            workoutLogged = true;
            const analysis = await this.analyzeSession(userId, parsed.entries as any);
            prDetected = analysis.prDetected;
          }
        } catch (e) {
          this.logger.warn(`Failed to auto-log workout: ${e}`);
        }
      }

      return {
        reply,
        metadata: {
          toolsCalled: Object.keys(result.toolCalls ?? {}).length > 0
            ? Object.keys(result.toolCalls ?? {}) : undefined,
          workoutLogged,
          prDetected,
        },
      };
    } catch (error: any) {
      this.logger.error(`Agent error: ${error.message}`);
      const fallback = 'Disculpa, tuve un problema interno. ¿Puedes repetirlo?';
      await this.prisma.chatMessage.create({
        data: { userId, role: 'assistant', content: fallback, channel },
      });
      return { reply: fallback };
    }
  }

  async classifyIntent(text: string): Promise<{ type: string; [key: string]: unknown }> {
    try {
      const result = await generateObject({
        model: this.model,
        schema: MessageIntentSchema as any,
        prompt: `Clasifica la intención de este mensaje de un usuario de gimnasio:\n\n"${text}"\n\nResponde solo con el tipo de intención.`,
      });
      return result.object as unknown as { type: string; [key: string]: unknown };
    } catch {
      return { type: 'unknown' };
    }
  }

  async parseWorkout(text: string): Promise<ParsedWorkout | null> {
    try {
      const result = await generateObject({
        model: this.model,
        schema: ParsedWorkoutSchema as any,
        prompt: `Extrae los datos de entrenamiento del siguiente mensaje de un usuario de gimnasio.\n\nEjemplos:\n- "hoy hice press 80x5x3, remo 60x8x3" -> press banca 80kg x5 reps (3 sets), remo 60kg x8 reps (3 sets)\n- "press banca 80/5 85/3 85/3" -> press banca con pesos y reps separados por /\n- "ayer: press militar 40x8x4, dominadas 10x4" -> con fecha ayer\n\nMensaje del usuario: "${text}"`,
      });
      return result.object as unknown as ParsedWorkout | null;
    } catch {
      return null;
    }
  }

  async analyzeSession(
    userId: string,
    entries: Array<{ exerciseName: string; sets: Array<{ weight: number; reps: number }> }>,
  ): Promise<SessionAnalysis> {
    const analysis: SessionAnalysis = {
      prDetected: false,
      weeklyVolume: 0,
      weeklyVolumeChange: null,
      deloadRecommended: false,
      insights: [],
    };

    for (const entry of entries) {
      const maxWeight = Math.max(...entry.sets.map((s) => s.weight));
      const historical = await this.prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { performedAt: 'desc' },
        take: 20,
      });
      let prevBest = 0;
      for (const session of historical) {
        const sessEntries = session.entries as any;
        for (const se of sessEntries ?? []) {
          if (se.exerciseName?.toLowerCase() === entry.exerciseName.toLowerCase()) {
            const hMax = Math.max(...(se.sets ?? []).map((s: any) => s.weight));
            if (hMax > prevBest) prevBest = hMax;
          }
        }
      }
      if (maxWeight > prevBest && prevBest > 0) {
        analysis.prDetected = true;
        analysis.prDetails = { exercise: entry.exerciseName, weight: maxWeight, previousBest: prevBest };
        analysis.insights.push(`Nuevo PR en ${entry.exerciseName}: ${maxWeight}kg (anterior: ${prevBest}kg)`);
      }
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklySessions = await this.prisma.workoutSession.findMany({
      where: { userId, performedAt: { gte: weekAgo } },
    });
    for (const session of weeklySessions) {
      const sessEntries = session.entries as any;
      for (const se of sessEntries ?? []) {
        for (const set of (se.sets ?? []) as any[]) {
          analysis.weeklyVolume += set.weight * set.reps;
        }
      }
    }

    return analysis;
  }

  private async buildContext(userId: string): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const activePlan = await this.prisma.workoutPlan.findFirst({
      where: { userId, active: true },
    });
    const activeGoals = await this.prisma.goal.findMany({
      where: { userId, status: 'active' },
    });
    const lastWorkout = await this.prisma.workoutSession.findFirst({
      where: { userId },
      orderBy: { performedAt: 'desc' },
    });
    const recentHistory = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      userName: user?.name ?? 'Usuario',
      activePlanName: activePlan?.name ?? null,
      activePlanStructure: activePlan?.structure ?? null,
      activeGoals: activeGoals.map((g) => ({
        title: g.title,
        type: g.type,
        targetValue: g.targetValue ? Number(g.targetValue) : null,
      })),
      lastWorkoutSummary: lastWorkout
        ? { date: lastWorkout.performedAt.toISOString(), entries: lastWorkout.entries, notes: lastWorkout.notes }
        : null,
      recentMessages: recentHistory.map((m) => ({
        role: m.role,
        content: m.content.substring(0, 200),
      })),
    };
  }
}
