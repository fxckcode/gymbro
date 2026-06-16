import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkoutPlanDto {
  @ApiProperty({ description: 'Name of the workout plan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Structure of the workout plan (days, exercises, etc.)' })
  @IsObject()
  structure: any;

  @ApiProperty({ description: 'Whether the plan is active', required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
