import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('users/:userId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get chat message history for a user' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User UUID' })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Number of messages to return (default 30)',
  })
  getHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getHistory(userId, limit ? Number(limit) : 30);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search chat message history for a user' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User UUID' })
  @ApiQuery({
    name: 'q',
    type: 'string',
    required: true,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Number of results to return (default 10)',
  })
  search(
    @Param('userId') userId: string,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.searchHistory(userId, q, limit ? Number(limit) : 10);
  }
}
