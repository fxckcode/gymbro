import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe as AppValidationPipe } from './common/pipes/validation.pipe';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: AppValidationPipe,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
