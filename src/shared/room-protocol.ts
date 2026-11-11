import type { MatchResult, GameInput } from '../game/core/types';
import type { CapsulePreview } from '../game/core/types';
import type {
  RoomMatchSnapshot,
  RoomSeat,
  RoomSnapshot,
} from '../server/rooms/room-service';
import type { ChatMessage } from '../server/chat/chat-service';

export type PlayerInput = Exclude<GameInput, 'GravityTick'>;

export interface RoomAuthMessage {
  readonly seat: RoomSeat;
  readonly seatToken: string;
  readonly alias: string;
}

export interface RoomViewMessage {
  readonly status: RoomSnapshot['status'];
  readonly code: string;
  readonly players: readonly string[];
  readonly countdownSeconds?: number;
}

export interface InputMessage {
  readonly sequence: number;
  readonly input: PlayerInput;
}

export interface RoomActionAcceptedMessage {
  readonly sequence: number;
}

export interface RoomActionErrorMessage {
  readonly message: string;
}

export interface ChatSendMessage {
  readonly text: string;
}

export interface ConnectionStateMessage {
  readonly view: 'Connected' | 'Paused' | 'Reconnecting' | 'Finished';
  readonly secondsRemaining?: number;
}

export interface ChatErrorMessage {
  readonly reason: 'InvalidText' | 'RateLimited' | 'NotInRoom';
}

export interface RoomErrorMessage {
  readonly reason:
    | 'InvalidAlias'
    | 'InvalidCode'
    | 'Expired'
    | 'Full'
    | 'CapacityUnavailable'
    | 'Disconnected';
}

export interface ClientToRoomMessages {
  readonly ready: undefined;
  readonly input: InputMessage;
  readonly chat: ChatSendMessage;
}

export interface RoomToClientMessages {
  readonly seat: RoomAuthMessage;
  readonly 'room-view': RoomViewMessage;
  readonly 'match-state': RoomMatchSnapshot;
  readonly 'next-capsule': CapsulePreview | null;
  readonly 'match-result': MatchResult;
  readonly 'connection-state': ConnectionStateMessage;
  readonly 'action-accepted': { readonly sequence: number };
  readonly 'action-error': { readonly message: string };
  readonly 'chat-history': readonly ChatMessage[];
  readonly 'chat-message': ChatMessage;
  readonly 'chat-error': ChatErrorMessage;
  readonly 'room-error': RoomErrorMessage;
}
