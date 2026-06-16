# Tasks: GymBro — Implementación

## Dependency Order
```
T1 (Scaffold)
  ├── T2 (Users Module)
  ├── T3 (Workouts Module)
  ├── T4 (Goals Module)
  └── T5 (Chat Module)
        ├── T6 (Channel Adapters)
        ├── T7 (Agent Module)
        └── T8 (Scheduler Module)
              └── T9 (Webhook Controller)
                    └── T10 (Swagger + Postman)
```

## Parallel Groups
- **Grupo 1** (tras T1): T2 + T3 + T4 + T5 en paralelo (sin colisión de archivos)
- **Grupo 2** (tras Grupo 1): T6 + T7 + T8 en paralelo
- **Grupo 3** (secuencial): T9 → T10

## Model Routing
| Tarea | Modelo | Razón |
|-------|--------|-------|
| T1-T5 | deepseek/deepseek-v4-flash | Scaffolding + CRUDs mecánicos |
| T6 | deepseek/deepseek-v4-flash | Adapters con patrón conocido |
| T7 | deepseek/deepseek-v4-pro | Lógica de agente, tool calling, parsing AI |
| T8 | deepseek/deepseek-v4-flash | Cron jobs, patrón conocido |
| T9-T10 | deepseek/deepseek-v4-flash | Webhook + docs |

---

## Tasks

### T1: Scaffold Proyecto NestJS + Prisma 7 + Config Base (AFK · 20 turns)
- **Files:** package.json, tsconfig.json, tsconfig.build.json, nest-cli.json, .env.example, docker-compose.yml, Dockerfile, prisma/schema.prisma, src/main.ts, src/app.module.ts, src/common/filters/http-exception.filter.ts, src/common/pipes/validation.pipe.ts, .husky/pre-commit, .husky/commit-msg, commitlint.config.js, .gitignore, .editorconfig
- **Acceptance:** `pnpm build` compila, `pnpm prisma generate` funciona, `pnpm start:dev` arranca sin errores
- **Done condition:** NestJS app arranca en puerto 3000, GET /health → 200, DB conectada
- **Dominant risk:** Prisma 7 sin DATABASE_URL falla — usar flag --url en generate

### T2: Users Module — User + ChannelIdentity (AFK · 12 turns)
- **Files:** src/modules/users/users.module.ts, users.service.ts, users.controller.ts, prisma (ya en schema)
- **Acceptance:** POST /users/identify crea/retorna user, PATCH /users/:id funciona
- **Dependencies:** T1
- **Done condition:** Tests unitarios pasan, endpoints responden

### T3: Workouts Module — WorkoutPlan + WorkoutSession (AFK · 12 turns)
- **Files:** src/modules/workouts/workouts.module.ts, workouts.service.ts, workouts.controller.ts, src/modules/workouts/dto/
- **Acceptance:** CRUD completo de planes y sesiones, POST con entries JSON, GET paginado
- **Dependencies:** T1
- **Done condition:** Tests unitarios pasan, endpoints responden

### T4: Goals Module — Goal + GoalCheckIn (AFK · 10 turns)
- **Files:** src/modules/goals/goals.module.ts, goals.service.ts, goals.controller.ts
- **Acceptance:** CRUD de metas, check-ins, endpoint de progreso con tendencia
- **Dependencies:** T1
- **Done condition:** Tests unitarios pasan, endpoints responden

### T5: Chat Module — Historial y búsqueda (AFK · 8 turns)
- **Files:** src/modules/chat/chat.module.ts, chat.service.ts, chat.controller.ts
- **Acceptance:** GET /history con paginación, GET /search con full-text search
- **Dependencies:** T1
- **Done condition:** Tests unitarios pasan, endpoints responden

### T6: Channel Adapters — Telegram, WhatsApp, Chatwoot (AFK · 12 turns)
- **Files:** src/common/channels/channel-adapter.interface.ts, telegram.adapter.ts, whatsapp.adapter.ts, chatwoot.adapter.ts, channel.module.ts
- **Acceptance:** Cada adapter normaliza su payload y puede send(), el CHANNEL_ADAPTER provider resuelve dinámicamente
- **Dependencies:** T1, T2
- **Done condition:** Tests unitarios pasan, factory resuelve adapters

### T7: Agent Module — Vercel AI SDK + Tools + Parsing (AFK · 25 turns)
- **Files:** src/modules/agent/agent.module.ts, agent.service.ts, tools/*.tool.ts, prompts/*.prompt.ts, src/modules/agent/schemas/workout-parse.schema.ts, src/modules/agent/agent.controller.ts
- **Acceptance:** POST /chat/message procesa mensaje, ejecuta tools, persiste historial, responde. Parseo de entrenamiento funciona con los 3 formatos del spec.
- **Dependencies:** T1, T2, T3, T4, T5
- **Done condition:** Chat de prueba con "hoy hice press 80x5" registra la sesión, retorna análisis post-sesión

### T8: Scheduler Module — Cron jobs (AFK · 8 turns)
- **Files:** src/modules/scheduler/scheduler.module.ts, scheduler.service.ts
- **Acceptance:** Cron diario detecta inactividad, cron semanal envía resumen. Reputation check evita spam.
- **Dependencies:** T6
- **Done condition:** Tests unitarios pasan, lógica de rate-limiting funciona

### T9: Webhook Controller — Endpoint unificado (AFK · 6 turns)
- **Files:** src/modules/webhook/webhook.module.ts, webhook.controller.ts, webhook.service.ts
- **Acceptance:** POST /webhooks/incoming recibe payload, normaliza, llama al agente, responde
- **Dependencies:** T6, T7
- **Done condition:** Endpoint responde 200 con payload simulado

### T10: Swagger + Postman Collection (AFK · 6 turns)
- **Files:** src/main.ts (Swagger config), gymbro-postman-collection.json (raíz)
- **Acceptance:** Swagger UI en /api/docs, Postman Collection con todos los endpoints, variables de entorno y tests
- **Dependencies:** T9 (todos los endpoints existentes)
- **Done condition:** Exportación de Swagger genera JSON completo, Postman Collection funcional
