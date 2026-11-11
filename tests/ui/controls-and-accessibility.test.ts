import { describe, expect, it } from 'vitest';
import {
  mapKeyboard,
  mapTouch,
  presentRoomFailure,
  type RecoveryAction,
  type RoomFailure,
  type TouchAction,
} from '../../src/ui/controls';
import { PIECE_PRESENTATIONS } from '../../src/ui/piece-presentations';
import type { GameInput } from '../../src/game/core/types';

describe('keyboard controls', () => {
  it.each([
    ['ArrowLeft', 'MoveLeft'],
    ['ArrowRight', 'MoveRight'],
    ['ArrowDown', 'SoftDrop'],
    ['ArrowUp', 'RotateClockwise'],
    ['x', 'RotateClockwise'],
    ['X', 'RotateClockwise'],
    ['z', 'RotateCounterclockwise'],
    ['Z', 'RotateCounterclockwise'],
    [' ', 'HardDrop'],
  ] as const)('maps %s to %s', (key, input) => {
    expect(mapKeyboard(key)).toBe(input);
  });

  it('ignores keys without a game action', () => {
    expect(mapKeyboard('Escape')).toBeNull();
    expect(mapKeyboard('Enter')).toBeNull();
  });
});

describe('touch controls', () => {
  it('maps each supported touch action to its game input', () => {
    const actions: readonly [TouchAction, GameInput][] = [
      ['MoveLeft', 'MoveLeft'],
      ['MoveRight', 'MoveRight'],
      ['SoftDrop', 'SoftDrop'],
      ['HardDrop', 'HardDrop'],
      ['RotateClockwise', 'RotateClockwise'],
      ['RotateCounterclockwise', 'RotateCounterclockwise'],
    ];

    for (const [action, input] of actions) {
      expect(mapTouch(action)).toBe(input);
    }
  });
});

describe('room failure presentation', () => {
  it('distinguishes each failure and offers a relevant recovery action', () => {
    const failures: readonly RoomFailure[] = [
      'InvalidAlias',
      'InvalidCode',
      'Expired',
      'Full',
      'CapacityUnavailable',
      'Disconnected',
    ];
    const presentations = failures.map(presentRoomFailure);

    expect(new Set(presentations.map(({ message }) => message)).size).toBe(
      failures.length,
    );
    expect(presentations.every(({ message }) => message.length > 0)).toBe(true);

    const expectedActions: readonly [RoomFailure, RecoveryAction][] = [
      ['InvalidAlias', 'CorrectInput'],
      ['InvalidCode', 'CorrectInput'],
      ['Expired', 'Retry'],
      ['Full', 'Retry'],
      ['CapacityUnavailable', 'Retry'],
      ['Disconnected', 'Reconnect'],
    ];

    for (const [failure, action] of expectedActions) {
      expect(presentRoomFailure(failure).actions).toContain(action);
      expect(presentRoomFailure(failure).actions).toContain('Leave');
    }
  });
});

describe('piece presentation', () => {
  it('describes each piece with a distinct shape and visual pattern', () => {
    expect(PIECE_PRESENTATIONS).toEqual([
      {
        kind: 'virus',
        label: 'Virus',
        shape: 'redonda',
        pattern: 'marcas faciales',
      },
      {
        kind: 'capsule',
        label: 'Cápsula',
        shape: 'dos segmentos alargados',
        pattern: 'unidos en una pieza',
      },
      {
        kind: 'obstacle',
        label: 'Obstáculo',
        shape: 'cuadrada',
        pattern: 'trama cruzada',
      },
    ]);
  });
});
