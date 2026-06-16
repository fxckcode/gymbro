import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCheckinDto {
  @ApiProperty({ description: 'Check-in value', example: 85 })
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @ApiPropertyOptional({ description: 'Optional note', example: 'Felt strong today' })
  @IsString()
  @IsOptional()
  note?: string;
}
