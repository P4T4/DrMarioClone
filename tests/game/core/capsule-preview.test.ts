import { describe, expect, it } from 'vitest';
import { GameCore } from '../../../src/game/core/game-core';
import { makeBoard } from './game-fixtures';

describe('next capsule preview', () => {
  it('matches the next capsule spawned by the deterministic game core', () => {
    const state = GameCore.start(makeBoard());
    const preview = GameCore.previewNextCapsule(state);
    const transition = GameCore.resolve(state, 'HardDrop', 0);

    expect(transition.kind).toBe('transition');
    if (transition.kind !== 'transition') {
      throw new Error(`Expected hard drop, got ${transition.reason}`);
    }

    expect(preview).toEqual({
      pivotColor: transition.state.activeCapsule?.pivotColor,
      otherColor: transition.state.activeCapsule?.otherColor,
    });
  });

  it('does not preview a capsule when the board is blocked', () => {
    const board = makeBoard([
      [0, 3, { kind: 'virus', color: 'red' }],
      [0, 4, { kind: 'virus', color: 'blue' }],
    ]);

    expect(GameCore.previewNextCapsule(GameCore.start(board))).toBeNull();
  });
});
