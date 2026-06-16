import { Module } from '@nestjs/common';
import { ChannelAdapter } from './channel-adapter.interface';
import { TelegramAdapter } from './telegram.adapter';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { ChatwootAdapter } from './chatwoot.adapter';

export const CHANNEL_ADAPTER = 'CHANNEL_ADAPTER';

const adapters = [TelegramAdapter, WhatsAppAdapter, ChatwootAdapter];

@Module({
  providers: [
    ...adapters,
    {
      provide: CHANNEL_ADAPTER,
      useFactory: (adapters: ChannelAdapter[]) => adapters,
      inject: [TelegramAdapter, WhatsAppAdapter, ChatwootAdapter],
    },
  ],
  exports: [CHANNEL_ADAPTER],
})
export class ChannelModule {}
