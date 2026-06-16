import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@ApiTags('Goals')
@ApiBearerAuth()
@Controller()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post('users/:userId/goals')
  @ApiOperation({ summary: 'Create a goal for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  createGoal(@Param('userId') userId: string, @Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(userId, dto);
  }

  @Get('users/:userId/goals')
  @ApiOperation({ summary: 'Get all goals for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (e.g. active)' })
  getGoals(@Param('userId') userId: string, @Query('status') status?: string) {
    return this.goalsService.getGoals(userId, status);
  }

  @Patch('goals/:id')
  @ApiOperation({ summary: 'Update a goal' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  updateGoal(@Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.updateGoal(id, dto);
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Delete a goal' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  deleteGoal(@Param('id') id: string) {
    return this.goalsService.deleteGoal(id);
  }

  @Post('goals/:goalId/checkins')
  @ApiOperation({ summary: 'Create a check-in for a goal' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  createCheckin(@Param('goalId') goalId: string, @Body() dto: CreateCheckinDto) {
    return this.goalsService.createCheckin(goalId, dto);
  }

  @Get('goals/:goalId/checkins')
  @ApiOperation({ summary: 'Get check-ins for a goal' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of check-ins to return' })
  getCheckins(@Param('goalId') goalId: string, @Query('limit') limit?: string) {
    return this.goalsService.getCheckins(goalId, limit ? Number(limit) : undefined);
  }

  @Get('goals/:id/progress')
  @ApiOperation({ summary: 'Get progress for a goal' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  getProgress(@Param('id') id: string) {
    return this.goalsService.getProgress(id);
  }
}
