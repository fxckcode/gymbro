import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class IdentifyUserDto {
  @ApiProperty({ description: 'The channel (e.g. telegram, discord, web)' })
  @IsString()
  channel: string;

  @ApiProperty({ description: 'The unique user ID within that channel' })
  @IsString()
  channelUid: string;
}
