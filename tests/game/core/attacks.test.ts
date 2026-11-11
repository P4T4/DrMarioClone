import { describe, expect, it } from 'vitest';
import { GameCore } from '../../../src/game/core/game-core';
import type { GameEvent } from '../../../src/game/core/types';
import { cellIndex, makeCapsule, makeState, virus } from './game-fixtures';

function matchesCleared(chain: number, virusCount: number): GameEvent {
  return {
    type: 'matches-cleared',
    chain,
    virusCount,
    positions: [],
  };
}

describe('GameCore scoring and attacks', () => {
  it('updates player stats from a completed capsule resolution', () => {
    const state = makeState(
      [
        [15, 0, virus('red')],
        [15, 1, virus('red')],
      ],
      makeCapsule(15, 2, 'red', 'red'),
    );
    const result = GameCore.resolve(state, 'HardDrop', 0);

    expect(result.kind).toBe('transition');
    if (result.kind !== 'transition') {
      return;
    }

    expect(result.state.stats).toEqual({
      score: 2,
      virusesCleared: 2,
      chains: 1,
    });
    expect(result.state.attackPoints).toBe(2);
  });

  it('awards one score and attack point per virus, plus later-chain bonuses', () => {
    const state = makeState();
    const next = GameCore.applyMatchEvents(state, [
      matchesCleared(1, 2),
      matchesCleared(2, 1),
      matchesCleared(3, 0),
    ]);

    expect(next.stats).toEqual({ score: 5, virusesCleared: 3, chains: 3 });
    expect(next.attackPoints).toBe(1);
    expect(next.outgoingObstacles).toBe(1);
  });

  it('generates an obstacle at the four-point threshold', () => {
    const state = makeState();
    const threePoints = GameCore.applyMatchEvents(state, [
      matchesCleared(1, 3),
    ]);

    expect(threePoints.attackPoints).toBe(3);
    expect(threePoints.outgoingObstacles).toBe(0);

    const fourPoints = GameCore.applyMatchEvents(threePoints, [
      matchesCleared(1, 1),
    ]);
    expect(fourPoints.attackPoints).toBe(0);
    expect(fourPoints.outgoingObstacles).toBe(1);
  });

  it('limits obstacles to three per resolution and preserves excess points', () => {
    const state = makeState();
    const first = GameCore.applyMatchEvents(state, [
      matchesCleared(1, 15),
      matchesCleared(2, 0),
      matchesCleared(3, 0),
    ]);

    expect(first.attackPoints).toBe(5);
    expect(first.outgoingObstacles).toBe(3);

    const next = GameCore.applyMatchEvents(first, []);
    expect(next.attackPoints).toBe(1);
    expect(next.outgoingObstacles).toBe(4);
  });

  it('delivers one queued obstacle when a capsule is fixed', () => {
    const state = GameCore.queueIncomingObstacles(makeState(), 2);
    const result = GameCore.resolve(state, 'HardDrop', 0);

    expect(result.kind).toBe('transition');
    if (result.kind !== 'transition') {
      return;
    }

    expect(result.state.pendingObstacles).toBe(1);
    expect(result.state.board.cells[cellIndex(15, 0)]?.kind).toBe('obstacle');
    expect(result.events).toContainEqual({
      type: 'obstacle-delivered',
      position: { row: 15, column: 0 },
    });
  });

  it('clears obstacles adjacent to a color match', () => {
    const state = makeState(
      [
        [15, 0, virus('red')],
        [15, 1, virus('red')],
        [14, 0, { kind: 'obstacle' }],
      ],
      makeCapsule(15, 2, 'red', 'red'),
    );
    const result = GameCore.resolve(state, 'HardDrop', 0);

    expect(result.kind).toBe('transition');
    if (result.kind !== 'transition') {
      return;
    }

    expect(result.state.board.cells[cellIndex(14, 0)]?.kind).toBe('empty');
    expect(result.events).toContainEqual({
      type: 'obstacles-cleared',
      positions: [{ row: 14, column: 0 }],
    });
  });

  it('clears outgoing attacks only when they are taken for delivery', () => {
    const state = GameCore.applyMatchEvents(makeState(), [
      matchesCleared(1, 4),
    ]);
    const taken = GameCore.takeOutgoingObstacles(state);

    expect(taken.count).toBe(1);
    expect(taken.state.outgoingObstacles).toBe(0);
    expect(state.outgoingObstacles).toBe(1);
  });

  it('rejects invalid incoming obstacle counts without changing state', () => {
    const state = makeState();

    expect(() => GameCore.queueIncomingObstacles(state, -1)).toThrow(
      RangeError,
    );
    expect(state.pendingObstacles).toBe(0);
  });

  it('rejects incoming counts that overflow the pending queue', () => {
    const state = {
      ...makeState(),
      pendingObstacles: Number.MAX_SAFE_INTEGER,
    };

    expect(() => GameCore.queueIncomingObstacles(state, 1)).toThrow(RangeError);
    expect(state.pendingObstacles).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects cumulative match counts that exceed safe integer precision', () => {
    const state = makeState();

    expect(() =>
      GameCore.applyMatchEvents(state, [
        matchesCleared(1, Number.MAX_SAFE_INTEGER),
        matchesCleared(2, 1),
      ]),
    ).toThrow(RangeError);
    expect(state.stats.virusesCleared).toBe(0);
  });
});
