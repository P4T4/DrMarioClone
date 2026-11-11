export type ChatSeat = 0 | 1;

export interface ChatMessage {
  readonly seat: ChatSeat;
  readonly text: string;
  readonly sentAt: number;
}

export interface Delivered {
  readonly kind: 'delivered';
  readonly message: ChatMessage;
  readonly recipients: readonly [ChatSeat, ChatSeat];
}

export type ChatSendResult =
  Delivered | 'InvalidText' | 'RateLimited' | 'NotInRoom';

export class ChatService {
  private readonly messages: ChatMessage[] = [];
  private readonly lastSentAt: [number | null, number | null] = [null, null];
  private lastLogicalTime: number | null = null;
  private active = true;

  send(seat: number, text: unknown, logicalTime: number): ChatSendResult {
    if (!this.active || (seat !== 0 && seat !== 1)) {
      return 'NotInRoom';
    }
    if (!Number.isSafeInteger(logicalTime) || logicalTime < 0) {
      throw new RangeError('Chat time must be a non-negative safe integer');
    }
    if (this.lastLogicalTime !== null && logicalTime < this.lastLogicalTime) {
      throw new RangeError('Chat time cannot move backwards');
    }
    this.lastLogicalTime = logicalTime;
    if (
      typeof text !== 'string' ||
      text.trim().length === 0 ||
      [...text].length > 200 ||
      /\p{Cc}/u.test(text)
    ) {
      return 'InvalidText';
    }

    const previousSentAt = this.lastSentAt[seat];
    if (previousSentAt !== null) {
      if (logicalTime - previousSentAt < 1_000) {
        return 'RateLimited';
      }
    }

    const message: ChatMessage = { seat, text, sentAt: logicalTime };
    this.messages.push(message);
    this.lastSentAt[seat] = logicalTime;
    return {
      kind: 'delivered',
      message: { ...message },
      recipients: [0, 1],
    };
  }

  getHistory(): readonly ChatMessage[] {
    return this.messages.map((message) => ({ ...message }));
  }

  finish(): void {
    this.active = false;
    this.messages.length = 0;
  }
}
