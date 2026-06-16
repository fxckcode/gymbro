import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from './channel-adapter.interface';

@Injectable()
export class ChatwootAdapter implements ChannelAdapter {
  readonly channel = 'chatwoot';

  normalize(rawPayload: unknown): NormalizedMessage {
    const payload = rawPayload as Record<string, unknown>;

    // Webhook payload: { conversation: { contact_inbox: { source_id } }, content }
    if (payload.conversation) {
      const conversation = payload.conversation as Record<string, unknown>;
      const contactInbox = conversation.contact_inbox as
        | Record<string, unknown>
        | undefined;
      return {
        channel: this.channel,
        channelUid: String(contactInbox?.source_id ?? ''),
        text: String(payload.content ?? ''),
      };
    }

    // Incoming message payload: { message: { content, sender: { id } } }
    if (payload.message) {
      const message = payload.message as Record<string, unknown>;
      const sender = message.sender as Record<string, unknown> | undefined;
      return {
        channel: this.channel,
        channelUid: String(sender?.id ?? ''),
        text: String(message.content ?? ''),
      };
    }

    return {
      channel: this.channel,
      channelUid: '',
      text: '',
    };
  }

  async send(chatId: string, text: string): Promise<void> {
    console.log(`[Chatwoot] Sending to ${chatId}: ${text}`);
  }
}
