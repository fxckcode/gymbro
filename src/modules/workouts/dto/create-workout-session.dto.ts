import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SetEntry {
  @ApiProperty({ description: 'Weight used in kg' })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({ description: 'Number of reps performed' })
  @IsNumber()
  @Min(0)
  reps: number;

  @ApiPropertyOptional({ description: 'Reps in reserve' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rir?: number;

  @ApiPropertyOptional({ description: 'Rate of perceived exertion' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  rpe?: number;
}

class ExerciseEntry {
  @ApiProperty({ description: 'Name of the exercise' })
  @IsString()
  @IsNotEmpty()
  exerciseName: string;

  @ApiProperty({ description: 'Sets performed for this exercise', type: [SetEntry] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetEntry)
  sets: SetEntry[];
}

export class CreateWorkoutSessionDto {
  @ApiPropertyOptional({ description: 'Associated workout plan ID' })
  @IsUUID()
  @IsOptional()
  workoutPlanId?: string;

  @ApiPropertyOptional({ description: 'Day name from the workout plan' })
  @IsString()
  @IsOptional()
  dayName?: string;

  @ApiProperty({ description: 'Exercises performed in the session', type: [ExerciseEntry] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseEntry)
  entries: ExerciseEntry[];

  @ApiPropertyOptional({ description: 'Notes about the session' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'When the session was performed (ISO 8601)' })
  @IsISO8601()
  @IsOptional()
  performedAt?: string;
}
