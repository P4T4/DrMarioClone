import { describe, expect, it } from 'vitest';
import { GameCore } from '../../../src/game/core/game-core';

describe('GameCore.initialize', () => {
  it('creates 15 viruses, five of each color, on a 128-cell board', () => {
    const board = GameCore.initialize('fixed-server-seed', 3);
    const viruses = board.cells.filter((cell) => cell.kind === 'virus');

    expect(board.cells).toHaveLength(128);
    expect(viruses).toHaveLength(15);
    expect(
      viruses.filter((cell) => cell.kind === 'virus' && cell.color === 'red'),
    ).toHaveLength(5);
    expect(
      viruses.filter((cell) => cell.kind === 'virus' && cell.color === 'blue'),
    ).toHaveLength(5);
    expect(
      viruses.filter(
        (cell) => cell.kind === 'virus' && cell.color === 'yellow',
      ),
    ).toHaveLength(5);
  });

  it('preserves the difficulty and leaves the centered spawn cells empty', () => {
    const board = GameCore.initialize('fixed-server-seed', 3);

    expect(board.difficulty).toBe(3);
    expect(board.cells[3]).toEqual({ kind: 'empty' });
    expect(board.cells[4]).toEqual({ kind: 'empty' });
  });

  it('repeats the same board for the same server seed and difficulty', () => {
    const first = GameCore.initialize('fixed-server-seed', 3);
    const second = GameCore.initialize('fixed-server-seed', 3);

    expect(second).toEqual(first);
  });

  it('uses the seed to vary virus placement', () => {
    const first = GameCore.initialize('first-server-seed', 3);
    const second = GameCore.initialize('second-server-seed', 3);

    expect(second.cells).not.toEqual(first.cells);
  });

  it('keeps the first capsule playable through its initial gravity tick', () => {
    const board = GameCore.initialize('seed-5', 1);
    const firstTick = GameCore.resolve(
      GameCore.start(board),
      'GravityTick',
      1_000,
    );

    expect(firstTick.kind).toBe('transition');
    if (firstTick.kind === 'transition') {
      expect(firstTick.state.status).toBe('active');
    }
  });

  it('keeps a legal lateral move from blocking the next spawn immediately', () => {
    const board = GameCore.initialize('seed-6', 1);
    const moved = GameCore.resolve(GameCore.start(board), 'MoveLeft', 0);

    expect(moved.kind).toBe('transition');
    if (moved.kind === 'transition') {
      const firstTick = GameCore.resolve(moved.state, 'GravityTick', 1_000);

      expect(firstTick.kind).toBe('transition');
      if (firstTick.kind === 'transition') {
        expect(firstTick.state.status).toBe('active');
      }
    }
  });
});
