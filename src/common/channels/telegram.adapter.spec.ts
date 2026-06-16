import { Test, TestingModule } from '@nestjs/testing';
import { TelegramAdapter } from './telegram.adapter';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('TelegramAdapter', () => {
  let adapter: TelegramAdapter;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, TELEGRAM_BOT_TOKEN: 'test:token' };
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramAdapter],
    }).compile();

    adapter = module.get<TelegramAdapter>(TelegramAdapter);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('normalize', () => {
    it('should extract chat id and text from Telegram update', () => {
      const payload = {
        message: { chat: { id: 12345 }, text: 'Hola GymBro!' },
      };
      const result = adapter.normalize(payload);
      expect(result).toEqual({
        channel: 'telegram',
        channelUid: '12345',
        text: 'Hola GymBro!',
      });
    });

    it('should handle empty payload', () => {
      const result = adapter.normalize({});
      expect(result.channelUid).toBe('');
      expect(result.text).toBe('');
    });
  });

  describe('send', () => {
    it('should post to Telegram Bot API with MarkdownV2', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      });

      await adapter.send('12345', 'Hola!');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest:token/sendMessage',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('chat_id'),
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.chat_id).toBe('12345');
      expect(body.text).toBe('Hola!');
      expect(body.parse_mode).toBe('MarkdownV2');
    });

    it('should handle 429 rate limit with retry', async () => {
      // First call: 429, Second call: success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: () => '1' },
          json: async () => ({ ok: false, error_code: 429 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, result: { message_id: 2 } }),
        });

      await adapter.send('12345', 'test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on 401 invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ ok: false, error_code: 401 }),
      });

      await expect(adapter.send('12345', 'test')).rejects.toThrow(
        'Invalid Telegram bot token',
      );
    });
  });

  describe('escapeMarkdown', () => {
    it('should escape special MarkdownV2 characters', () => {
      const input = '100kg (nuevo PR!) +5kg *importante*';
      const result = (adapter as any).escapeMarkdown(input);
      expect(result).toContain('\\(');
      expect(result).toContain('\\)');
      expect(result).toContain('\\*');
      expect(result).toContain('\\+');
    });

    it('should not escape normal text', () => {
      const input = 'Hola como estas 123';
      const result = (adapter as any).escapeMarkdown(input);
      expect(result).toBe(input);
    });
  });

  describe('getMe', () => {
    it('should call getMe endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { username: 'test_bot' } }),
      });

      const result = await adapter.getMe();
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest:token/getMe',
        expect.any(Object),
      );
    });
  });
});
