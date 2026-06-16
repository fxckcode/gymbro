# Proposal: Telegram Adapter Real + Supabase DB Setup

## Intent
Reemplazar el placeholder del Telegram adapter actual por una implementación real que use la Bot API via HTTP, y configurar Supabase como base de datos PostgreSQL para Prisma 7.

## Scope

### In
- [ ] TelegramAdapter real con Bot API (sendMessage via fetch)
- [ ] Soporte para **polling** (long-polling con getUpdates, sin webhook inicial)
- [ ] Soporte para **MarkdownV2** en mensajes enviados
- [ ] Manejo de rate limiting (429 Too Many Requests — retry con backoff)
- [ ] Configuración via `TELEGRAM_BOT_TOKEN` en .env
- [ ] Supabase PostgreSQL connection string en .env
- [ ] Prisma migration inicial (db push a Supabase)
- [ ] Health check que verifique conexión a Supabase
- [ ] Tests unitarios para TelegramAdapter

### Out
- [ ] Webhook mode de Telegram (por ahora polling)
- [ ] WhatsApp/Chatwoot adapters reales (ya existen como placeholder)
- [ ] File upload/download (fotos, videos)
- [ ] Inline keyboards / botones
- [ ] Redis para rate limiting distribuido

## Approach

1. **TelegramAdapter** — usar `fetch()` nativo (Node 22+), sin axios ni librerías externas. 
   - `send(chatId, text)` → `POST https://api.telegram.org/bot{token}/sendMessage`
   - `startPolling()` → loop con `getUpdates` + offset + timeout 30s
   - Rate limit: detectar 429, esperar `Retry-After` header, reintentar con exponential backoff
   - Formatear mensajes con MarkdownV2 (escapar caracteres especiales)

2. **Supabase** — connection string de Supabase PostgreSQL reemplaza la DB local.
   - `DATABASE_URL` apunta a Supabase
   - `prisma db push` para crear tablas
   - Health check en `GET /health` verifica `SELECT 1`

3. **NestJS Best Practices aplicadas**:
   - `error-throw-http-exceptions` — errores HTTP tipados
   - `security-rate-limiting` — backoff en API externa
   - `test-use-testing-module` — tests con mocks
   - `api-use-dto-serialization` — DTOs para webhook

## Tech Stack
| Capa | Tecnología |
|------|-----------|
| Telegram API | fetch() nativo (Node 22) |
| DB Hosting | Supabase PostgreSQL 16 |
| ORM | Prisma 7 |
| Polling | setInterval + getUpdates + offset |

## Modules Affected
- `src/common/channels/telegram.adapter.ts` — rewrite con Bot API real
- `src/common/channels/channel.module.ts` — agregar TelegramPollingService
- `.env.example` — TELEGRAM_BOT_TOKEN, DATABASE_URL (Supabase)
- `src/health.controller.ts` — agregar verificación DB
- `src/modules/webhook/webhook.controller.ts` — integrar con agent
- `src/common/channels/telegram-polling.service.ts` — nuevo: polling loop

## Risks
| Riesgo | Mitigación |
|--------|-----------|
| Bot token expuesto en logs/env | Usar ConfigModule, no loggear tokens |
| Rate limiting de Telegram (30 msg/s) | Backoff + cola interna si es necesario |
| Polling consume recursos | Interval de 1s, timeout 30s en getUpdates |
