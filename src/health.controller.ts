import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const checks: Record<string, any> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    // Database check
    try {
      const dbUrl = process.env.DATABASE_URL ?? '';
      checks.database = {
        configured: !!dbUrl && !dbUrl.includes('***'),
        // Actual connection will be checked via PrismaService
      };
    } catch {
      checks.database = { configured: false, error: 'Check failed' };
    }

    // Telegram bot check
    const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
    if (token && !token.includes('***')) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getMe`,
          { signal: AbortSignal.timeout(5000) },
        );
        const data: any = await res.json();
        checks.telegram = {
          configured: true,
          connected: data.ok === true,
          botName: data.result?.username ?? null,
        };
      } catch (e: any) {
        checks.telegram = {
          configured: true,
          connected: false,
          error: e.message,
        };
      }
    } else {
      checks.telegram = { configured: false };
    }

    return checks;
  }
}
