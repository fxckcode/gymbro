import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe as AppValidationPipe } from './common/pipes/validation.pipe';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { UsersModule } from './modules/users/users.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ChatModule } from './modules/chat/chat.module';
import { ChannelModule } from './common/channels/channel.module';
import { AgentModule } from './modules/agent/agent.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { WebhookModule } from './modules/webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    WorkoutsModule,
    GoalsModule,
    ChatModule,
    ChannelModule,
    AgentModule,
    SchedulerModule,
    WebhookModule,
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
