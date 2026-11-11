import type { GameInput } from '../game/core/types';
import type { RoomFailure } from '../rooms/types';

export type { RoomFailure } from '../rooms/types';

export type TouchAction =
  | 'MoveLeft'
  | 'MoveRight'
  | 'SoftDrop'
  | 'HardDrop'
  | 'RotateClockwise'
  | 'RotateCounterclockwise';

export type RecoveryAction = 'CorrectInput' | 'Retry' | 'Reconnect' | 'Leave';

export function mapKeyboard(key: string): GameInput | null {
  switch (key) {
    case 'ArrowLeft':
      return 'MoveLeft';
    case 'ArrowRight':
      return 'MoveRight';
    case 'ArrowDown':
      return 'SoftDrop';
    case 'ArrowUp':
    case 'x':
    case 'X':
      return 'RotateClockwise';
    case 'z':
    case 'Z':
      return 'RotateCounterclockwise';
    case ' ':
      return 'HardDrop';
    default:
      return null;
  }
}

export function mapTouch(action: TouchAction): GameInput {
  return action;
}

export function presentRoomFailure(reason: RoomFailure): {
  message: string;
  actions: RecoveryAction[];
} {
  switch (reason) {
    case 'InvalidAlias':
      return {
        message: 'El alias debe tener entre 1 y 20 caracteres válidos.',
        actions: ['CorrectInput', 'Leave'],
      };
    case 'InvalidCode':
      return {
        message:
          'El código de sala no es válido. Revísalo e inténtalo de nuevo.',
        actions: ['CorrectInput', 'Leave'],
      };
    case 'Expired':
      return {
        message:
          'El código de sala ha caducado. Puedes crear otra sala o salir.',
        actions: ['Retry', 'Leave'],
      };
    case 'Full':
      return {
        message: 'La sala está llena. Revisa el código o vuelve a intentarlo.',
        actions: ['Retry', 'Leave'],
      };
    case 'CapacityUnavailable':
      return {
        message: 'No se pudo crear una sala ahora. Inténtalo de nuevo o sal.',
        actions: ['Retry', 'Leave'],
      };
    case 'Disconnected':
      return {
        message: 'Se perdió la conexión. Puedes reconectar o salir.',
        actions: ['Reconnect', 'Leave'],
      };
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}
