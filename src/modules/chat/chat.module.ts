import { Module } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AppModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
