import { describe, expect, it } from 'vitest';
import { GameCore } from '../../../src/game/core/game-core';
import type {
  GameTransition,
  RejectedInput,
} from '../../../src/game/core/types';
import {
  cellIndex,
  makeBoard,
  makeCapsule,
  makeState,
  virus,
} from './game-fixtures';

type GameResult = GameTransition | RejectedInput;

function transition(result: GameResult): GameTransition {
  if (result.kind !== 'transition') {
    throw new Error(`Expected transition, got ${result.reason}`);
  }
  return result;
}

function rejected(result: GameResult): RejectedInput {
  if (result.kind !== 'rejected') {
    throw new Error('Expected rejected input');
  }
  return result;
}

describe('GameCore capsule controls', () => {
  it('starts a horizontal capsule in the two centered spawn cells', () => {
    const state = GameCore.start(makeBoard());
    const capsule = state.activeCapsule;

    expect(state.status).toBe('active');
    expect(capsule?.pivot).toEqual({ row: 0, column: 3 });
    expect(capsule?.otherOffset).toEqual({ row: 0, column: 1 });
    expect(
      capsule &&
        state.board.cells[
          cellIndex(
            capsule.pivot.row + capsule.otherOffset.row,
            capsule.pivot.column + capsule.otherOffset.column,
          )
        ]?.kind,
    ).toBe('empty');
  });

  it('moves one column left or right', () => {
    const state = makeState([], makeCapsule(4, 3));
    const left = transition(GameCore.resolve(state, 'MoveLeft', 0));
    const right = transition(GameCore.resolve(left.state, 'MoveRight', 1));

    expect(left.state.activeCapsule?.pivot).toEqual({ row: 4, column: 2 });
    expect(right.state.activeCapsule?.pivot).toEqual({ row: 4, column: 3 });
  });

  it('rotates both directions around the fixed pivot', () => {
    const state = makeState([], makeCapsule(4, 3));
    const clockwise = transition(GameCore.resolve(state, 'RotateClockwise', 0));
    const counterclockwise = transition(
      GameCore.resolve(state, 'RotateCounterclockwise', 0),
    );

    expect(clockwise.state.activeCapsule?.pivot).toEqual(
      state.activeCapsule?.pivot,
    );
    expect(clockwise.state.activeCapsule?.otherOffset).toEqual({
      row: 1,
      column: 0,
    });
    expect(counterclockwise.state.activeCapsule?.pivot).toEqual(
      state.activeCapsule?.pivot,
    );
    expect(counterclockwise.state.activeCapsule?.otherOffset).toEqual({
      row: -1,
      column: 0,
    });
  });

  it('rejects wall and occupied-cell moves without changing state', () => {
    const wallState = makeState([], makeCapsule(4, 0));
    const wallResult = rejected(GameCore.resolve(wallState, 'MoveLeft', 0));
    const occupiedState = makeState(
      [[4, 4, virus('yellow')]],
      makeCapsule(4, 2),
    );
    const occupiedResult = rejected(
      GameCore.resolve(occupiedState, 'MoveRight', 0),
    );

    expect(wallResult.state).toBe(wallState);
    expect(occupiedResult.state).toBe(occupiedState);
  });

  it('rejects a blocked rotation without wall-kick or mutation', () => {
    const state = makeState([[3, 3, virus('yellow')]], makeCapsule(4, 3));
    const result = rejected(
      GameCore.resolve(state, 'RotateCounterclockwise', 0),
    );

    expect(result.state).toBe(state);
  });

  it('limits soft drop to one row per 100 milliseconds', () => {
    const state = makeState([], makeCapsule(4, 3));
    const first = transition(GameCore.resolve(state, 'SoftDrop', 0));
    const tooSoon = rejected(GameCore.resolve(first.state, 'SoftDrop', 99));
    const allowed = transition(GameCore.resolve(first.state, 'SoftDrop', 100));

    expect(first.state.activeCapsule?.pivot.row).toBe(5);
    expect(tooSoon.state).toBe(first.state);
    expect(allowed.state.activeCapsule?.pivot.row).toBe(6);
  });

  it('applies one automatic row only after one second', () => {
    const state = makeState([], makeCapsule(4, 3));
    const tooSoon = rejected(GameCore.resolve(state, 'GravityTick', 999));
    const due = transition(GameCore.resolve(state, 'GravityTick', 1000));

    expect(tooSoon.state).toBe(state);
    expect(due.state.activeCapsule?.pivot.row).toBe(5);

    const duplicateTick = rejected(
      GameCore.resolve(due.state, 'GravityTick', 1000),
    );
    expect(duplicateTick.state).toBe(due.state);
  });

  it('hard-drops and fixes both capsule segments', () => {
    const state = makeState([], makeCapsule(0, 3));
    const result = transition(GameCore.resolve(state, 'HardDrop', 0));

    expect(result.state.board.cells[cellIndex(15, 3)]?.kind).toBe('capsule');
    expect(result.state.board.cells[cellIndex(15, 4)]?.kind).toBe('capsule');
    expect(result.state.activeCapsule?.pivot).toEqual({ row: 0, column: 3 });
    expect(result.events.some((event) => event.type === 'capsule-fixed')).toBe(
      true,
    );
  });

  it('locks when gravity is blocked and marks an occupied spawn as blocked', () => {
    const board = makeBoard([[1, 3, virus('yellow')]]);
    const state = GameCore.start(board);
    const result = transition(GameCore.resolve(state, 'GravityTick', 1000));

    expect(result.state.status).toBe('blocked');
    expect(result.state.activeCapsule).toBeNull();
    expect(result.events.some((event) => event.type === 'board-blocked')).toBe(
      true,
    );
    expect(result.state.board.cells[cellIndex(0, 3)]?.kind).toBe('capsule');
    expect(result.state.board.cells[cellIndex(0, 4)]?.kind).toBe('capsule');
  });

  it('starts blocked when a spawn cell is occupied', () => {
    const state = GameCore.start(makeBoard([[0, 3, virus('red')]]));

    expect(state.status).toBe('blocked');
    expect(state.activeCapsule).toBeNull();
  });
});
