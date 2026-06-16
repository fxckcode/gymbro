import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentService } from './agent.service';

class ChatMessageDto {
  userId: string = '';
  text: string = '';
  channel: string = 'unknown';
}

@ApiTags('Agent')
@Controller('chat')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);
  constructor(private readonly agentService: AgentService) {}

  @Post('message')
  @ApiOperation({ summary: 'Enviar mensaje al agente GymBro' })
  @ApiResponse({ status: 201, description: 'Respuesta del agente' })
  async sendMessage(@Body() dto: ChatMessageDto) {
    this.logger.log(`Message from ${dto.userId} via ${dto.channel}`);
    return this.agentService.processMessage(dto.userId, dto.text, dto.channel);
  }
}
