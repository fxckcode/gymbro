# Spec: Telegram Adapter Real + Supabase DB Setup

## Requirements

### Functional
- [ ] REQ-F1: TelegramAdapter.send() envía mensajes a la Bot API de Telegram
- [ ] REQ-F2: TelegramAdapter soporta MarkdownV2 en los mensajes
- [ ] REQ-F3: TelegramAdapter maneja rate limiting (429) con retry y backoff
- [ ] REQ-F4: Sistema polling recibe mensajes de Telegram sin webhook
- [ ] REQ-F5: Los mensajes recibidos se normalizan via ChannelAdapter y se procesan con el agente
- [ ] REQ-F6: Supabase PostgreSQL reemplaza la DB local de desarrollo
- [ ] REQ-F7: Health check verifica la conexión a Supabase
- [ ] REQ-F8: Prisma schema se migra a Supabase

### Non-Functional
- [ ] REQ-NF1: Token de bot nunca se loggea ni expone en respuestas
- [ ] REQ-NF2: Polling no consume > 1% CPU (interval 1s, timeout 30s)
- [ ] REQ-NF3: Rate limiting: max 30 mensajes/s, backoff exponencial en 429
- [ ] REQ-NF4: Timeout de conexión a Telegram API: 5s

## Scenarios

### Happy Path: Enviar mensaje a usuario
**Given** un chatId de Telegram y un texto
**When** `TelegramAdapter.send(chatId, "Hola! 🎉")`
**Then** hace fetch a `POST https://api.telegram.org/bot{token}/sendMessage`
  Body: `{ chat_id, text: "Hola! 🎉", parse_mode: "MarkdownV2" }`
  Response: `{ ok: true, result: { message_id: 123 } }`
  **Resultado:** promesa resuelta sin error

### Happy Path: Recibir mensaje via polling
**Given** el polling service está activo
**When** `getUpdates` retorna `{ ok: true, result: [{ update_id: 1, message: { chat: { id: 123 }, text: "hola" } }] }`
**Then** normaliza el mensaje, busca/crea el user, llama al agentService.processMessage()
**Y** envía offset = update_id + 1 para el próximo polling

### Edge Case: Rate Limited (429)
**Given** Telegram responde con 429
**When** `send()` detecta status 429
**Then** lee `Retry-After` header (o body.parameters.retry_after)
**Espera** ese tiempo + jitter (1-2s adicional)
**Reintenta** la request hasta 3 veces
**Si falla** después de 3 retries, loggea error y rechaza la promesa

### Edge Case: Token inválido (401)
**Given** TELEGRAM_BOT_TOKEN es inválido
**When** `send()` hace fetch
**Then** Telegram responde 401 `{ ok: false, error_code: 401, description: "Unauthorized" }`
**Resultado:** TelegramAdapter lanza `HttpException(401, 'Invalid Telegram bot token')`

### Error Case: Timeout de red
**Given** la API de Telegram no responde en 5s
**When** `send()` hace fetch
**Then** AbortController aborta a los 5s
**Resultado:** lanza `RequestTimeout`

### Edge Case: MarkdownV2 character escaping
**Given** el texto contiene caracteres especiales: `_ * [ ] ( ) ~ > # + - = | { } . !`
**When** se envía con parse_mode: MarkdownV2
**Then** TelegramAdapter escapa esos caracteres con `\` antes de enviar
**Ejemplo:** `"100kg (nuevo PR!)"` → `"100kg \\(nuevo PR\\!\\)"`

## Telegram Adapter Interface (final)

```typescript
@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  readonly channel = 'telegram';
  
  constructor(private configService?: ConfigService) {
    // Token desde process.env para evitar DI issues
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  normalize(rawPayload: unknown): NormalizedMessage { ... }
  
  async send(chatId: string, text: string): Promise<void> {
    // Escapar MarkdownV2
    // POST a Bot API con fetch + AbortController (5s)
    // Manejar 429 con retry
  }

  // Para pruebas / diagnóstico
  async getMe(): Promise<{ ok: boolean }> {
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
    return res.json();
  }
}
```

## TelegramPollingService

```typescript
@Injectable()
export class TelegramPollingService implements OnModuleInit, OnModuleDestroy {
  private offset = 0;
  private polling = false;
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly telegramAdapter: TelegramAdapter,
    private readonly agentService: AgentService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Start polling after 3s delay
    setTimeout(() => this.start(), 3000);
  }

  async start() {
    this.polling = true;
    this.poll();
  }

  private async poll() {
    while (this.polling) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates`,
          { method: 'POST', body: JSON.stringify({ 
            offset: this.offset, 
            timeout: 30 
          }), headers: { 'Content-Type': 'application/json' } }
        );
        const data = await res.json();
        if (data.ok && data.result?.length > 0) {
          for (const update of data.result) {
            await this.processUpdate(update);
            this.offset = update.update_id + 1;
          }
        }
      } catch (e) {
        logger.error('Polling error', e);
        await sleep(5000);
      }
    }
  }

  private async processUpdate(update: any) { ... }

  onModuleDestroy() { this.polling = false; }
}
```

## Supabase Setup

```bash
# .env
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-xx-xx-xx.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma config (prisma.config.ts)
export default defineConfig({
  datasource: { url: process.env.DATABASE_URL },
});

# Migrate
npx prisma db push
```

## Files to Change

| File | Change |
|------|--------|
| `src/common/channels/telegram.adapter.ts` | Rewrite con Bot API real + MarkdownV2 + rate limit |
| `src/common/channels/telegram-polling.service.ts` | NEW: polling loop |
| `src/common/channels/channel.module.ts` | Agregar TelegramPollingService como provider |
| `.env.example` | TELEGRAM_BOT_TOKEN, DATABASE_URL |
| `src/health.controller.ts` | Agregar verificación DB + Telegram connectivity |
| `prisma/prisma.config.ts` | Confirmar DATABASE_URL usage |
