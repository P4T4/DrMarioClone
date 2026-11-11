import { describe, expect, it } from 'vitest';
import { ChatService } from '../../../src/server/chat/chat-service';

describe('ChatService', () => {
  it('validates message text and delivers accepted messages to both seats', () => {
    const chat = new ChatService();
    const text = '😀'.repeat(200);

    expect(chat.send(0, '', 100)).toBe('InvalidText');
    expect(chat.send(0, '   ', 100)).toBe('InvalidText');
    expect(chat.send(0, 'x'.repeat(201), 100)).toBe('InvalidText');
    expect(chat.send(0, 'hello\nthere', 100)).toBe('InvalidText');
    expect(chat.send(0, null, 100)).toBe('InvalidText');
    expect(chat.send(2, 'hello', 100)).toBe('NotInRoom');

    expect(chat.send(0, text, 100)).toEqual({
      kind: 'delivered',
      message: { seat: 0, text, sentAt: 100 },
      recipients: [0, 1],
    });
    expect(chat.getHistory()).toEqual([{ seat: 0, text, sentAt: 100 }]);
  });

  it('rate-limits each seat independently and accepts at the one-second boundary', () => {
    const chat = new ChatService();

    expect(chat.send(0, 'first', 1_000)).toMatchObject({
      kind: 'delivered',
    });
    expect(chat.send(0, 'too soon', 1_999)).toBe('RateLimited');
    expect(chat.send(1, 'other seat', 1_999)).toMatchObject({
      kind: 'delivered',
    });
    expect(chat.send(0, 'at boundary', 2_000)).toMatchObject({
      kind: 'delivered',
    });
  });

  it('clears ephemeral history at match end and refuses further messages', () => {
    const chat = new ChatService();
    expect(chat.send(0, 'hello', 0)).toMatchObject({
      kind: 'delivered',
    });
    expect(chat.send(1, 'hi', 0)).toMatchObject({
      kind: 'delivered',
    });
    expect(chat.getHistory()).toHaveLength(2);

    chat.finish();

    expect(chat.getHistory()).toEqual([]);
    expect(chat.send(0, 'after finish', 1_000)).toBe('NotInRoom');
  });

  it('rejects invalid logical times explicitly', () => {
    const chat = new ChatService();

    expect(() => chat.send(0, 'hello', -1)).toThrow(RangeError);
    expect(() => chat.send(0, 'hello', Number.NaN)).toThrow(RangeError);

    chat.send(0, 'first', 1_000);
    expect(() => chat.send(1, 'backwards', 999)).toThrow(RangeError);
  });
});
