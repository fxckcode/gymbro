# Tasks: Telegram Adapter Real + Supabase

## Dependency Order
```
T1 ← T2 ← T3
```

## Tasks

### T1: TelegramAdapter real + TelegramPollingService (AFK · cmd 15 turns)
- **Files:**
  - `src/common/channels/telegram.adapter.ts` — rewrite
  - `src/common/channels/telegram-polling.service.ts` — new
  - `src/common/channels/channel.module.ts` — add polling provider
  - `.env.example` — TELEGRAM_BOT_TOKEN
- **Acceptance:**
  - TelegramAdapter.send() hace fetch a Bot API con parse_mode MarkdownV2
  - Maneja 429 con retry hasta 3 veces + backoff
  - Escapa caracteres especiales de MarkdownV2: _ * [ ] ( ) ~ > # + - = | { } . !
  - TelegramPollingService arranca en onModuleInit, hace getUpdates con timeout 30s
  - Los mensajes recibidos se normalizan, identifican user y llaman al agent
- **Done condition:** build pasa, tests unitarios pasan
- **Dominant risk:** fetch nativo vs axios — usar AbortController para timeout

### T2: Supabase DB setup + Prisma migration (AFK · terminal directo)
- **Files:**
  - `.env.example` — DATABASE_URL (Supabase)
  - `prisma/prisma.config.ts` — ya configurado
- **Acceptance:**
  - `prisma db push` funciona contra Supabase
  - Health check verifica `SELECT 1`
- **Done condition:** `npx prisma db push --accept-data-loss` exitoso
- **Dominant risk:** connection string de Supabase con pgbouncer requiere flags especiales

### T3: Integración webhook + health check + tests (AFK · cmd 8 turns)
- **Files:**
  - `src/health.controller.ts` — agregar verificación a Telegram API + DB
  - `src/common/channels/telegram.adapter.spec.ts` — tests unitarios
- **Acceptance:**
  - GET /health retorna status de Telegram bot y DB
  - Tests cubren: send exitoso, 429 retry, MarkdownV2 escape, timeout
- **Done condition:** build pasa, tests pasan
