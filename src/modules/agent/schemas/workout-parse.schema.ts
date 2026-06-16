import { z } from 'zod';

export const WorkoutSetSchema = z.object({
  weight: z.number().positive().max(999),
  reps: z.number().positive().max(200),
});

export const WorkoutEntrySchema = z.object({
  exerciseName: z.string().min(1),
  sets: z.array(WorkoutSetSchema).min(1),
});

export const ParsedWorkoutSchema = z.object({
  entries: z.array(WorkoutEntrySchema).min(1),
  notes: z.string().optional(),
  dayName: z.string().optional(),
  performedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .default(() => new Date().toISOString().split('T')[0]),
});

export type ParsedWorkout = z.infer<typeof ParsedWorkoutSchema>;

export const MessageIntentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('logWorkout') }),
  z.object({ type: z.literal('askProgress'), exercise: z.string().optional() }),
  z.object({ type: z.literal('askGoal'), goalId: z.string().optional() }),
  z.object({ type: z.literal('setGoal'), title: z.string() }),
  z.object({ type: z.literal('checkIn'), goalId: z.string() }),
  z.object({ type: z.literal('general') }),
  z.object({ type: z.literal('unknown') }),
]);

export type MessageIntent = z.infer<typeof MessageIntentSchema>;
