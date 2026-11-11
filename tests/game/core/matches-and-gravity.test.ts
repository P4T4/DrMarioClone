import { describe, expect, it } from 'vitest';
import { GameCore } from '../../../src/game/core/game-core';
import type {
  GameEvent,
  GameTransition,
  RejectedInput,
} from '../../../src/game/core/types';
import {
  cellIndex,
  makeCapsule,
  makeState,
  settledCapsule,
  virus,
} from './game-fixtures';

type GameResult = GameTransition | RejectedInput;

function transition(result: GameResult): GameTransition {
  if (result.kind !== 'transition') {
    throw new Error(`Expected transition, got ${result.reason}`);
  }
  return result;
}

function clearedMatches(events: readonly GameEvent[]) {
  return events.filter((event) => event.type === 'matches-cleared');
}

describe('GameCore matches and gravity', () => {
  it('clears horizontal groups of four or more and counts only viruses', () => {
    const state = makeState(
      [
        [15, 0, virus('red')],
        [15, 1, virus('red')],
      ],
      makeCapsule(15, 2, 'red', 'red'),
    );
    const result = transition(GameCore.resolve(state, 'HardDrop', 0));
    const matches = clearedMatches(result.events);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ chain: 1, virusCount: 2 });
    expect(
      result.state.board.cells.filter((cell) => cell.kind === 'virus'),
    ).toHaveLength(0);
  });

  it('clears vertical groups including capsule segments', () => {
    const state = makeState(
      [
        [12, 0, virus('blue')],
        [13, 0, virus('blue')],
        [14, 0, virus('blue')],
      ],
      makeCapsule(10, 0, 'blue', 'blue', {
        row: 1,
        column: 0,
      }),
    );
    const result = transition(GameCore.resolve(state, 'HardDrop', 0));
    const matches = clearedMatches(result.events);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ chain: 1, virusCount: 3 });
    expect(
      result.state.board.cells.filter((cell) => cell.kind === 'virus'),
    ).toHaveLength(0);
  });

  it('does not clear a group of only three matching cells', () => {
    const state = makeState(
      [
        [15, 0, virus('yellow')],
        [15, 1, virus('yellow')],
        [15, 2, virus('yellow')],
      ],
      makeCapsule(15, 6, 'red', 'blue'),
    );
    const result = transition(GameCore.resolve(state, 'HardDrop', 0));

    expect(clearedMatches(result.events)).toHaveLength(0);
    expect(
      result.state.board.cells.filter((cell) => cell.kind === 'virus'),
    ).toHaveLength(3);
  });

  it('lets disconnected capsule segments fall independently', () => {
    const state = makeState(
      [
        [15, 0, virus('red')],
        [15, 1, virus('red')],
        [15, 4, virus('blue')],
        [10, 4, settledCapsule('red')],
        [10, 5, settledCapsule('blue')],
      ],
      makeCapsule(15, 2, 'red', 'red'),
    );
    const result = transition(GameCore.resolve(state, 'HardDrop', 0));

    expect(result.state.board.cells[cellIndex(14, 4)]?.kind).toBe('capsule');
    expect(result.state.board.cells[cellIndex(15, 5)]?.kind).toBe('capsule');
  });

  it('keeps connected capsule segments together while they are supported', () => {
    const state = makeState(
      [
        [15, 2, virus('red')],
        [15, 3, virus('red')],
        [10, 4, settledCapsule('yellow', 7)],
        [10, 5, settledCapsule('blue', 7)],
        [14, 4, virus('yellow')],
      ],
      makeCapsule(15, 0, 'red', 'red'),
    );
    const result = transition(GameCore.resolve(state, 'HardDrop', 0));

    expect(result.state.board.cells[cellIndex(13, 4)]?.kind).toBe('capsule');
    expect(result.state.board.cells[cellIndex(13, 5)]?.kind).toBe('capsule');
    expect(result.state.board.cells[cellIndex(10, 4)]?.kind).toBe('empty');
  });

  it('resolves new matches as chains after capsule segments settle', () => {
    const state = makeState(
      [
        [13, 3, virus('blue')],
        [13, 4, virus('blue')],
        [12, 5, virus('red')],
        [12, 6, virus('red')],
        [11, 6, settledCapsule('blue')],
        [13, 6, virus('blue')],
        [14, 6, virus('blue')],
        [15, 6, virus('blue')],
      ],
      makeCapsule(12, 3, 'red', 'red'),
    );
    const result = transition(GameCore.resolve(state, 'HardDrop', 0));
    const matches = clearedMatches(result.events);

    expect(matches).toHaveLength(2);
    expect(matches.map((event) => event.chain)).toEqual([1, 2]);
    expect(matches.map((event) => event.virusCount)).toEqual([2, 3]);
    expect(
      result.state.board.cells.filter((cell) => cell.kind === 'virus'),
    ).toHaveLength(2);
  });
});
