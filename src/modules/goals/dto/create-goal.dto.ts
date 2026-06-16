import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ description: 'Goal title', example: 'Bench press 100kg' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Goal type', example: 'strength', enum: ['strength', 'weight', 'frequency', 'habit'] })
  @IsString()
  @IsIn(['strength', 'weight', 'frequency', 'habit'])
  type: 'strength' | 'weight' | 'frequency' | 'habit';

  @ApiPropertyOptional({ description: 'Target numeric value', example: 100 })
  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Deadline (ISO date string)', example: '2024-12-31T23:59:59Z' })
  @IsString()
  @IsOptional()
  deadline?: string;
}
