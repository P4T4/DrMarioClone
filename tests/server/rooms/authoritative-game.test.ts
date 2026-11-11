import { describe, expect, it } from 'vitest';
import { GameCore } from '../../../src/game/core/game-core';
import type { GameInput, GameState } from '../../../src/game/core/types';
import {
  RoomService,
  type RoomServiceOptions,
  type RoomTerminalEvent,
} from '../../../src/server/rooms/room-service';

function createHarness(options: Partial<RoomServiceOptions> = {}) {
  let now = 1_000;
  let seedIndex = 0;
  const service = new RoomService({
    now: () => now,
    generateCode: () => 'ABCDEFGH',
    generateSeed: () => `server-seed-${seedIndex++}`,
    ...options,
  });
  const room = service.create('Owner');

  if (typeof room === 'string') {
    throw new Error(`Expected room creation, got ${room}`);
  }
  const joined = service.join(room.code, 'Guest');

  if (typeof joined === 'string') {
    throw new Error(`Expected room join, got ${joined}`);
  }

  return {
    service,
    roomId: room.code,
    setNow(value: number) {
      now = value;
    },
    start() {
      now = joined.startsAt;
      return service.getMatchState(room.code);
    },
  };
}

function outgoingAttackState(seed: string, difficulty: number): GameState {
  const board = GameCore.initialize(seed, difficulty);
  const state = GameCore.start(board);
  return GameCore.applyMatchEvents(state, [
    {
      type: 'matches-cleared',
      chain: 1,
      virusCount: 4,
      positions: [],
    },
  ]);
}

describe('RoomService authoritative game', () => {
  it('starts equal-difficulty boards only when the shared countdown ends', () => {
    const harness = createHarness();
    const beforeStart = harness.service.submitInput(
      harness.roomId,
      0,
      1,
      'MoveLeft',
    );

    expect(beforeStart).toMatchObject({
      kind: 'rejected',
      reason: 'not-started',
      match: null,
    });
    const started = harness.start();
    expect(started).toMatchObject({
      states: [{ board: { difficulty: 1 } }, { board: { difficulty: 1 } }],
      result: null,
      paused: false,
      elapsedMs: 0,
    });
    expect(started?.states.map((state) => state.board.difficulty)).toEqual([
      1, 1,
    ]);
    expect(started !== null && 'seed' in started.states[0].board).toBe(false);
    expect(started).not.toHaveProperty('nextCapsules');
    expect(harness.service.getNextCapsule(harness.roomId, 0)).toEqual(
      GameCore.previewNextCapsule(
        GameCore.start(GameCore.initialize('server-seed-0', 1)),
      ),
    );
    expect(harness.service.getNextCapsule(harness.roomId, 1)).toEqual(
      GameCore.previewNextCapsule(
        GameCore.start(GameCore.initialize('server-seed-1', 1)),
      ),
    );

    harness.setNow(9_000);
    expect(harness.service.getMatchState(harness.roomId)?.elapsedMs).toBe(
      5_000,
    );
  });

  it('applies valid inputs through Game Core and rejects invalid or replayed inputs without mutation', () => {
    const harness = createHarness();
    harness.start();

    const accepted = harness.service.submitInput(
      harness.roomId,
      0,
      1,
      'MoveLeft',
    );
    expect(accepted.kind).toBe('accepted');
    if (accepted.kind !== 'accepted') {
      return;
    }

    expect(accepted.match.states[0].activeCapsule?.pivot.column).toBe(2);
    expect(accepted.match.states[1].activeCapsule?.pivot.column).toBe(3);

    const beforeRejectedInputs = harness.service.getMatchState(harness.roomId);
    expect(
      harness.service.submitInput(harness.roomId, 0, 1, 'MoveRight'),
    ).toMatchObject({ kind: 'rejected', reason: 'invalid-sequence' });
    expect(
      harness.service.submitInput(
        harness.roomId,
        0,
        2,
        'Teleport' as GameInput,
      ),
    ).toMatchObject({ kind: 'rejected', reason: 'invalid-input' });
    expect(
      harness.service.submitInput(harness.roomId, 0, 2, 'GravityTick'),
    ).toMatchObject({ kind: 'rejected', reason: 'invalid-input' });
    expect(
      harness.service.submitInput(harness.roomId, 2, 2, 'MoveLeft'),
    ).toMatchObject({ kind: 'rejected', reason: 'invalid-seat' });
    expect(harness.service.getMatchState(harness.roomId)).toEqual(
      beforeRejectedInputs,
    );

    harness.service.submitInput(harness.roomId, 0, 2, 'MoveLeft');
    harness.service.submitInput(harness.roomId, 0, 3, 'MoveLeft');
    const beforeCollision = harness.service.getMatchState(harness.roomId);
    expect(
      harness.service.submitInput(harness.roomId, 0, 4, 'MoveLeft'),
    ).toMatchObject({ kind: 'rejected', reason: 'out-of-bounds' });
    expect(harness.service.getMatchState(harness.roomId)).toEqual(
      beforeCollision,
    );
    expect(beforeRejectedInputs?.states[1]).toEqual(accepted.match.states[1]);
  });

  it('advances both boards on the server clock and ignores duplicate ticks', () => {
    const harness = createHarness();
    harness.start();
    harness.setNow(5_000);

    const advanced = harness.service.advance(harness.roomId);
    expect(
      advanced?.match.states.map((state) => state.activeCapsule?.pivot.row),
    ).toEqual([1, 1]);
    expect(advanced?.events.map((events) => events[0]?.type)).toEqual([
      'capsule-moved',
      'capsule-moved',
    ]);

    expect(harness.service.advance(harness.roomId)).toBeNull();
  });

  it('transfers generated outgoing attacks to the opponent state', () => {
    const harness = createHarness({ createGameState: outgoingAttackState });
    harness.start();

    const result = harness.service.submitInput(
      harness.roomId,
      0,
      1,
      'HardDrop',
    );

    expect(result.kind).toBe('accepted');
    if (result.kind !== 'accepted') {
      return;
    }

    expect(result.match.states[0].outgoingObstacles).toBe(0);
    expect(result.match.states[1].pendingObstacles).toBe(1);
    expect(result.events).toEqual([expect.any(Array), []]);
  });

  it('publishes the same final result and excludes countdown and paused time', () => {
    const harness = createHarness();
    harness.start();
    harness.setNow(6_000);
    expect(harness.service.pause(harness.roomId)).toBe(true);
    expect(
      harness.service.submitInput(harness.roomId, 0, 1, 'MoveLeft'),
    ).toMatchObject({ kind: 'rejected', reason: 'paused' });
    expect(harness.service.advance(harness.roomId)).toBeNull();

    harness.setNow(11_000);
    expect(harness.service.resume(harness.roomId)).toBe(true);
    harness.setNow(14_000);
    expect(() =>
      harness.service.finish(harness.roomId, [[{ type: 'board-blocked' }], []]),
    ).toThrow(RangeError);
    expect(harness.service.getMatchState(harness.roomId)?.result).toBeNull();
    const terminalEvents: readonly [
      readonly RoomTerminalEvent[],
      readonly RoomTerminalEvent[],
    ] = [[{ type: 'disconnected' }], []];
    const result = harness.service.finish(harness.roomId, terminalEvents);

    expect(result).toMatchObject({
      winnerIndex: 1,
      reason: 'Disconnected',
      durationMs: 5_000,
    });
    expect(harness.service.getMatchState(harness.roomId)?.result).toEqual(
      result,
    );
    expect(harness.service.getMatchState(harness.roomId)).toEqual(
      harness.service.getMatchState(harness.roomId),
    );
    expect(
      harness.service.submitInput(harness.roomId, 1, 1, 'MoveLeft'),
    ).toMatchObject({ kind: 'rejected', reason: 'finished' });
  });
});
