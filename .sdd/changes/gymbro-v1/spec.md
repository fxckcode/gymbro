# Spec: GymBro — Backend AI Fitness Coach

## Requirements

### Functional

- [ ] REQ-F1: El sistema identifica usuarios automáticamente por canal (Telegram chatId, WhatsApp phone, Chatwoot contact)
- [ ] REQ-F2: El sistema registra sesiones de entrenamiento desde lenguaje natural
- [ ] REQ-F3: El sistema mantiene plantillas de rutina (WorkoutPlan) con estructura JSON
- [ ] REQ-F4: El sistema permite consultar historial de entrenamientos (paginated)
- [ ] REQ-F5: El sistema gestiona metas con check-ins periódicos
- [ ] REQ-F6: El sistema mantiene historial de chat persistente y consultable
- [ ] REQ-F7: El agente responde mensajes usando Vercel AI SDK con tool calling
- [ ] REQ-F8: El agente detecta PRs y calcula volumen semanal post-sesión
- [ ] REQ-F9: El sistema envía notificaciones proactivas (recordatorios, resúmenes)
- [ ] REQ-F10: Los mensajes entran por webhook y se normalizan via ChannelAdapter
- [ ] REQ-F11: El sistema parsea mensajes de entrenamiento con generateObject + Zod

### Non-Functional

- [ ] REQ-NF1: Tiempo de respuesta del agente < 5s (sin contar latencia del modelo)
- [ ] REQ-NF2: Supabase PostgreSQL como única DB (sin pgvector, sin Redis)
- [ ] REQ-NF3: Historial de chat con índice en (userId, createdAt DESC)
- [ ] REQ-NF4: Máximo 1 notificación proactiva cada 4h por usuario
- [ ] REQ-NF5: Todos los endpoints documentados con Swagger
- [ ] REQ-NF6: Conventional Commits obligatorios

---

## API Endpoints

### Health
```
GET /health
→ 200 { status: "ok", timestamp: string }
```

### Users

```
POST /users/identify
  Body: { channel: "telegram"|"whatsapp"|"chatwoot", channelUid: string }
→ 200 { id: uuid, name: string | null, createdAt: string }
  (crea el user si no existe)

GET  /users/:id
→ 200 { id, name, createdAt }
→ 404

PATCH /users/:id
  Body: { name?: string }
→ 200 { id, name, createdAt }
→ 404
```

### Workout Plans

```
POST /users/:userId/workout-plans
  Body: { name: string, structure: WorkoutDay[], active?: boolean }
→ 201 { id, userId, name, structure, active, createdAt }

GET  /users/:userId/workout-plans
  Query: { active?: boolean }
→ 200 [ { id, name, structure, active, createdAt } ]

PATCH /workout-plans/:id
  Body: { name?: string, structure?: WorkoutDay[], active?: boolean }
→ 200 { id, ... }

DELETE /workout-plans/:id
→ 204
```

### Workout Sessions

```
POST /users/:userId/workout-sessions
  Body: { workoutPlanId?: uuid, dayName?: string, entries: WorkoutEntry[], notes?: string, performedAt?: string (ISO date) }
→ 201 { id, userId, workoutPlanId, dayName, entries, notes, performedAt, createdAt }

GET  /users/:userId/workout-sessions
  Query: { limit?: number, offset?: number, from?: string (ISO date), to?: string (ISO date) }
→ 200 [ { id, entries, notes, performedAt, createdAt } ]

GET  /workout-sessions/:id
→ 200 { id, userId, workoutPlanId, dayName, entries, notes, performedAt, createdAt }
→ 404

DELETE /workout-sessions/:id
→ 204
```

### Goals

```
POST /users/:userId/goals
  Body: { title: string, type: "strength"|"weight"|"frequency"|"habit", targetValue?: number, deadline?: string (ISO date) }
→ 201 { id, userId, title, type, targetValue, deadline, status, createdAt }

GET  /users/:userId/goals
  Query: { status?: "active"|"completed"|"abandoned" }
→ 200 [ { id, title, type, targetValue, deadline, status, createdAt } ]

PATCH /goals/:id
  Body: { title?: string, status?: "active"|"completed"|"abandoned", targetValue?: number, deadline?: string }
→ 200 { id, ... }

DELETE /goals/:id
→ 204
```

### Goal Check-ins

```
POST /goals/:goalId/checkins
  Body: { value: number, note?: string }
→ 201 { id, goalId, value, note, checkedIn }

GET  /goals/:goalId/checkins
  Query: { limit?: number }
→ 200 [ { id, value, note, checkedIn } ]

GET  /goals/:id/progress
→ 200 { goal: {...}, checkins: [...], trend: "up"|"down"|"stable", progressPct: number | null }
```

### Chat

```
GET  /users/:userId/chat/history
  Query: { limit?: number (default: 30, max: 100) }
→ 200 [ { id, role, content, channel, createdAt } ]

GET  /users/:userId/chat/search
  Query: { q: string, limit?: number }
→ 200 [ { id, role, content, channel, createdAt, highlight?: string } ]
```

### Agent (Chat)

```
POST /chat/message
  Body: { userId: uuid, text: string, channel: string, channelUid?: string }
→ 200 { reply: string, metadata?: { toolsCalled?: string[], workoutLogged?: boolean, prDetected?: boolean } }

  (El agente procesa el mensaje, ejecuta tools si es necesario, persiste en chat_history, retorna respuesta)
```

### Webhook (unificado)

```
POST /webhooks/incoming
  Body: raw payload from Telegram/WhatsApp/Chatwoot
  (El sistema detecta el canal por headers o estructura del payload, normaliza via adapter, procesa con el agente, responde)
→ 200 { ok: true }
```

---

## Database Schema (Prisma)

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/@prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String             @id @default(uuid()) @db.Uuid
  name              String?
  createdAt         DateTime           @default(now()) @map("created_at")
  channelIdentities ChannelIdentity[]
  workoutPlans      WorkoutPlan[]
  workoutSessions   WorkoutSession[]
  goals             Goal[]
  chatMessages      ChatMessage[]

  @@map("users")
}

model ChannelIdentity {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  channel    String   // "telegram" | "whatsapp" | "chatwoot"
  channelUid String   @map("channel_uid") // chatId, phone number, contact id
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([channel, channelUid])
  @@map("channel_identities")
}

model WorkoutPlan {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String
  structure Json     // WorkoutDay[]
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")

  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions WorkoutSession[]

  @@map("workout_plans")
}

model WorkoutSession {
  id            String    @id @default(uuid()) @db.Uuid
  userId        String    @map("user_id") @db.Uuid
  workoutPlanId String?   @map("workout_plan_id") @db.Uuid
  dayName       String?   @map("day_name")
  entries       Json      // WorkoutEntry[]
  notes         String?
  performedAt   DateTime  @map("performed_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan       WorkoutPlan? @relation(fields: [workoutPlanId], references: [id], onDelete: SetNull)

  @@index([userId, performedAt(sort: Desc)])
  @@map("workout_sessions")
}

model Goal {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  title       String
  type        String   // "strength" | "weight" | "frequency" | "habit"
  targetValue Decimal? @map("target_value") @db.Decimal(10, 2)
  deadline    DateTime?
  status      String   @default("active") // "active" | "completed" | "abandoned"
  createdAt   DateTime @default(now()) @map("created_at")

  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  checkins GoalCheckIn[]

  @@map("goals")
}

model GoalCheckIn {
  id        String   @id @default(uuid()) @db.Uuid
  goalId    String   @map("goal_id") @db.Uuid
  value     Decimal  @db.Decimal(10, 2)
  note      String?
  checkedIn DateTime @default(now()) @map("checked_in")

  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@map("goal_checkins")
}

model ChatMessage {
  id        BigInt   @id @default(autoincrement())
  userId    String   @map("user_id") @db.Uuid
  role      String   // "user" | "assistant" | "system"
  content   String
  channel   String?  // origen del mensaje
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("chat_messages")
}
```

---

## Types / DTOs

```typescript
// --- Channel ---
interface Message {
  userId: string;       // resolved from channel identity
  text: string;
  channel: string;       // "telegram" | "whatsapp" | "chatwoot"
  channelUid: string;
}

interface ChannelAdapter {
  normalize(rawPayload: unknown): { channel: string; channelUid: string; text: string };
  send(chatId: string, text: string): Promise<void>;
}

// --- Workouts ---
interface WorkoutDay {
  name: string;
  exercises: PlannedExercise[];
}

interface PlannedExercise {
  name: string;
  sets: number;
  reps: string;        // "8-12", "5x5", "failure"
}

interface WorkoutEntry {
  exerciseName: string;
  sets: WorkoutSet[];
}

interface WorkoutSet {
  weight: number;
  reps: number;
  rir?: number;        // reps in reserve
  rpe?: number;        // rate of perceived exertion
}

// --- Agent Parse Schema (Zod) ---
const WorkoutParseSchema = z.object({
  entries: z.array(z.object({
    exerciseName: z.string().min(1),
    sets: z.array(z.object({
      weight: z.number().positive().max(999),
      reps: z.number().positive().max(200),
    })).min(1),
  })).min(1),
  notes: z.string().optional(),
  dayName: z.string().optional(),
  performedAt: z.string().optional(), // ISO date, defaults to today
});

// --- Agent Tools ---
interface AgentContext {
  user: { id: string; name: string | null };
  activePlan: WorkoutPlan | null;
  activeGoals: Goal[];
  lastWorkout: WorkoutSession | null;
  recentHistory: ChatMessage[];
}

// --- Post-Session Analysis ---
interface SessionAnalysis {
  prDetected: boolean;
  prDetails?: { exercise: string; weight: number; previousBest: number };
  weeklyVolume: number;
  weeklyVolumeChange: number | null;  // % vs last week
  deloadRecommended: boolean;
  insights: string[];
}
```

---

## Zod Schema for AI Parsing

```typescript
import { z } from 'zod';

export const WorkoutSetSchema = z.object({
  weight: z.number().positive().max(999, 'Peso irrealista').describe('Peso en kg'),
  reps: z.number().positive().max(200, 'Reps irrealistas').describe('Número de repeticiones'),
  rir: z.number().min(0).max(10).optional().describe('Reps in reserve'),
  rpe: z.number().min(1).max(10).optional().describe('Rate of perceived exertion'),
});

export const WorkoutEntrySchema = z.object({
  exerciseName: z.string().min(1, 'Nombre del ejercicio requerido'),
  sets: z.array(WorkoutSetSchema).min(1, 'Al menos un set requerido'),
});

export const ParsedWorkoutSchema = z.object({
  entries: z.array(WorkoutEntrySchema).min(1, 'Al menos un ejercicio requerido'),
  notes: z.string().optional(),
  dayName: z.string().optional(),
  performedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD')
    .optional()
    .default(() => new Date().toISOString().split('T')[0]),
});

export type ParsedWorkout = z.infer<typeof ParsedWorkoutSchema>;

// Few-shot examples
export const WORKOUT_PARSE_EXAMPLES = [
  {
    input: 'hoy hice press 80x5 80x5 85x3, remo 60x8x3, sentadilla 100x5x3',
    output: {
      entries: [
        { exerciseName: 'Press Banca', sets: [{ weight: 80, reps: 5 }, { weight: 80, reps: 5 }, { weight: 85, reps: 3 }] },
        { exerciseName: 'Remo', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }, { weight: 60, reps: 8 }] },
        { exerciseName: 'Sentadilla', sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
      ],
      performedAt: '2026-06-15',
    },
  },
  {
    input: 'press banca 80/5 85/3 85/3',
    output: {
      entries: [
        { exerciseName: 'Press Banca', sets: [{ weight: 80, reps: 5 }, { weight: 85, reps: 3 }, { weight: 85, reps: 3 }] },
      ],
    },
  },
  {
    input: 'ayer: press militar 40x8x4, dominadas 10x4',
    output: {
      entries: [
        { exerciseName: 'Press Militar', sets: [{ weight: 40, reps: 8 }, { weight: 40, reps: 8 }, { weight: 40, reps: 8 }, { weight: 40, reps: 8 }] },
        { exerciseName: 'Dominadas', sets: [{ weight: 10, reps: 4 }] },
      ],
      performedAt: '2026-06-14',
    },
  },
];

// Intent classification
export const MessageIntentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('logWorkout') }),
  z.object({ type: z.literal('askProgress'), exercise: z.string().optional() }),
  z.object({ type: z.literal('askGoal'), goalId: z.string().uuid().optional() }),
  z.object({ type: z.literal('setGoal'), title: z.string() }),
  z.object({ type: z.literal('checkIn'), goalId: z.string().uuid() }),
  z.object({ type: z.literal('general') }),
  z.object({ type: z.literal('unknown') }),
]);
```

---

## Scenarios

### Happy Path: Registrar Entrenamiento

**Given** un usuario identificado con canal Telegram
**When** envía "hoy hice press 80x5x3, remo 60x8x3"
**Then** el agente:
1. Clasifica intención → `logWorkout`
2. Parsea con generateObject → `{ entries: [...] }`
3. Valida con Zod → OK
4. Guarda WorkoutSession en DB
5. Ejecuta análisis post-sesión (PR check, volume calc)
6. Responde: "✅ Registré tu sesión de hoy:
   - Press Banca: 80kg x5, 80kg x5, 80kg x5
   - Remo: 60kg x8, 60kg x8, 60kg x8
   📊 Volumen semanal: 3,240kg (+5% vs semana pasada)"

### Happy Path: Consulta de Progreso

**Given** un usuario con historial de entrenamiento
**When** envía "cómo voy con press banca?"
**Then** el agente:
1. Clasifica intención → `askProgress`
2. Llama tool `getWorkoutHistory(userId, 30)`
3. Analiza tendencia de press banca en las últimas sesiones
4. Responde: "📈 Tu press banca:
   - Última: 85kg x3 (nuevo PR! +2.5kg)
   - Progresión: 75kg → 80kg → 85kg en 3 semanas
   - Sigue así, la próxima meta: 90kg 💪"

### Happy Path: Meta y Check-in

**Given** un usuario con meta activa "press banca a 100kg"
**When** envía "hoy probé press y llegué a 90kg"
**Then** el agente:
1. Detecta que hay una meta relacionada
2. Registra la sesión con el PR
3. Pregunta: "🎯 90kg! Vas muy bien para tu meta de 100kg. ¿Quieres hacer un check-in?"

### Edge Case: Formato de Entrenamiento No Reconocido

**Given** un usuario envía "hice cosas de pecho y espalda"
**Then** el agente:
- No puede extraer datos estructurados → responde amigablemente pidiendo más detalles
- "¿Me puedes dar los ejercicios con peso y reps? Ej: 'press 80x5'"
- No registra nada en DB

### Edge Case: Peso o Reps Irrealistas

**Given** un usuario escribe "press 500x100"
**Then** el agente:
- El parseo extrae 500kg x100 reps
- Validación Zod pasa (está dentro de max)
- Validación post-hoc detecta outlier → pide confirmación
- "¿Seguro que hiciste press banca con 500kg? Parece mucho. ¿Cuál fue el peso real?"

### Edge Case: Usuario Nuevo

**Given** un webhook llega con un canalUid desconocido
**Then** el sistema:
1. ChannelIdentity no existe → crea User + ChannelIdentity
2. Hidrata contexto del agente sin historial
3. El agente responde presentándose: "¡Bienvenido a GymBro! Soy tu coach virtual. Cuéntame, ¿tienes alguna rutina actualmente?"

### Error Case: DB Timeout

**Given** una consulta a DB falla por timeout
**Then** el sistema retorna 500 y el agente responde: "Disculpa, tuve un error interno. ¿Puedes intentarlo de nuevo?"

### Error Case: Modelo AI No Responde

**Given** la llamada a generateText falla (timeout/error del proveedor)
**Then** el sistema retorna error 502 y el agente responde: "El servicio de IA no está disponible en este momento. Tus datos están seguros, intenta de nuevo en unos minutos."

---

## ChannelAdapter Interface

```typescript
// common/channels/channel-adapter.interface.ts
export interface NormalizedMessage {
  channel: string;
  channelUid: string;
  text: string;
}

export interface ChannelAdapter {
  readonly channel: string;
  normalize(rawPayload: unknown): NormalizedMessage;
  send(chatId: string, text: string): Promise<void>;
}

// common/channels/channel.module.ts
export const CHANNEL_ADAPTER = 'CHANNEL_ADAPTER';

// Usage:
// @Inject(CHANNEL_ADAPTER)
// private readonly adapters: ChannelAdapter[];
// const adapter = this.adapters.find(a => a.channel === detectedChannel);
```

---

## Agent System Prompt Template

```
Eres GymBro, un coach fitness virtual amigable y motivador.
Tu personalidad: directo, motivacional, con humor ocasional. Hablas en español neutro.

DATOS DEL USUARIO:
- Nombre: {{userName}}
- Plan activo: {{activePlanName}} ({{activePlanStructure}})
- Metas activas: {{activeGoals}}
- Última sesión: {{lastWorkoutSummary}}
- Últimos mensajes: {{recentMessages}}

CAPACIDADES:
1. Registrar entrenamientos cuando el usuario describe su sesión
2. Consultar progreso de cualquier ejercicio
3. Gestionar metas y hacer check-ins
4. Recomendar ajustes (deload, progresión, frecuencia)
5. Responder preguntas generales sobre fitness/nutrición

REGLAS:
- Siempre que detectes un entrenamiento en el mensaje, usa la herramienta logWorkout
- Después de registrar, SIEMPRE corre el análisis post-sesión
- Si detectas un PR, FELICITA al usuario ENORMEMENTE 🎉
- No inventes datos de entrenamiento que el usuario no haya dado
- Si no entiendes el formato, pide aclaración amigablemente
- Sé empático pero directo — no sobre-expliques
- Una notificación proactiva por turno máximo

TOOLS DISPONIBLES:
{{toolsDescription}}
```

---

## Post-Session Analysis Logic

```
trigger(afterLogWorkout):
  1. Calcular volumen semanal (suma weight*reps de los últimos 7 días)
  2. Comparar con semana anterior → % change
  3. Por cada ejercicio en la sesión:
     - Buscar máximo histórico de peso para ese ejercicio
     - Si superó → PR detected
  4. Si 3+ semanas de aumento consistente de volumen → recomendar deload
  5. Retornar SessionAnalysis con insights

Esto se ejecuta en AgentService DESPUÉS de logWorkout tool.
No es un proceso separado — es síncrono en el flujo del agente.
```
