import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService, PrismaService],
})
export class WorkoutsModule {}
