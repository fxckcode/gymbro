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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';

@ApiTags('Workouts')
@Controller()
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post('users/:userId/workout-plans')
  @ApiOperation({ summary: 'Create a workout plan' })
  @ApiResponse({ status: 201, description: 'Workout plan created' })
  createPlan(
    @Param('userId') userId: string,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    return this.workoutsService.createPlan(userId, dto);
  }

  @Get('users/:userId/workout-plans')
  @ApiOperation({ summary: 'Get all workout plans for a user' })
  @ApiResponse({ status: 200, description: 'List of workout plans' })
  getPlans(
    @Param('userId') userId: string,
    @Query('active') active?: string,
  ) {
    const activeFilter = active !== undefined ? active === 'true' : undefined;
    return this.workoutsService.getPlans(userId, activeFilter);
  }

  @Patch('workout-plans/:id')
  @ApiOperation({ summary: 'Update a workout plan' })
  @ApiResponse({ status: 200, description: 'Workout plan updated' })
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutPlanDto,
  ) {
    return this.workoutsService.updatePlan(id, dto);
  }

  @Delete('workout-plans/:id')
  @ApiOperation({ summary: 'Delete a workout plan' })
  @ApiResponse({ status: 200, description: 'Workout plan deleted' })
  deletePlan(@Param('id') id: string) {
    return this.workoutsService.deletePlan(id);
  }

  @Post('users/:userId/workout-sessions')
  @ApiOperation({ summary: 'Create a workout session' })
  @ApiResponse({ status: 201, description: 'Workout session created' })
  createSession(
    @Param('userId') userId: string,
    @Body() dto: CreateWorkoutSessionDto,
  ) {
    return this.workoutsService.createSession(userId, dto);
  }

  @Get('users/:userId/workout-sessions')
  @ApiOperation({ summary: 'Get paginated workout sessions for a user' })
  @ApiResponse({ status: 200, description: 'Paginated workout sessions' })
  getSessions(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.workoutsService.getSessions(
      userId,
      limit ? parseInt(limit, 10) : 10,
      offset ? parseInt(offset, 10) : 0,
      from,
      to,
    );
  }

  @Get('workout-sessions/:id')
  @ApiOperation({ summary: 'Get a workout session by ID' })
  @ApiResponse({ status: 200, description: 'Workout session' })
  getSession(@Param('id') id: string) {
    return this.workoutsService.getSession(id);
  }

  @Delete('workout-sessions/:id')
  @ApiOperation({ summary: 'Delete a workout session' })
  @ApiResponse({ status: 200, description: 'Workout session deleted' })
  deleteSession(@Param('id') id: string) {
    return this.workoutsService.deleteSession(id);
  }
}
