export interface NormalizedMessage {
  channel: string;
  channelUid: string;
  text: string;
}

export interface ChannelAdapter {
  readonly channel: string;
  normalize(rawPayload: unknown): NormalizedMessage;
  send(chatId: string, text: string): Promise<void>;
}
