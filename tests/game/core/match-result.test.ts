import { describe, expect, it } from 'vitest';
import { GameCore } from '../../../src/game/core/game-core';
import type {
  PlayerStats,
  TerminalOutcome,
} from '../../../src/game/core/types';

const playerStats: readonly [PlayerStats, PlayerStats] = [
  { score: 9, virusesCleared: 6, chains: 2 },
  { score: 4, virusesCleared: 4, chains: 0 },
];

function resolve(outcomes: readonly [TerminalOutcome, TerminalOutcome]) {
  return GameCore.resolveResult(outcomes, playerStats, 12_345);
}

describe('GameCore match result', () => {
  it('awards victory to the player who clears all viruses', () => {
    expect(resolve(['AllVirusesCleared', 'Active'])).toEqual({
      winnerIndex: 0,
      reason: 'AllVirusesCleared',
      stats: playerStats,
      durationMs: 12_345,
    });
    expect(resolve(['Active', 'AllVirusesCleared']).winnerIndex).toBe(1);
  });

  it('awards victory to the opponent when a board is blocked', () => {
    expect(resolve(['BoardBlocked', 'Active'])).toMatchObject({
      winnerIndex: 1,
      reason: 'BoardBlocked',
    });
    expect(resolve(['Active', 'BoardBlocked'])).toMatchObject({
      winnerIndex: 0,
      reason: 'BoardBlocked',
    });
  });

  it('awards victory to the opponent when a player disconnects', () => {
    expect(resolve(['Disconnected', 'Active'])).toMatchObject({
      winnerIndex: 1,
      reason: 'Disconnected',
    });
    expect(resolve(['Active', 'Disconnected'])).toMatchObject({
      winnerIndex: 0,
      reason: 'Disconnected',
    });
  });

  it('draws when both players reach terminal outcomes together', () => {
    expect(resolve(['AllVirusesCleared', 'BoardBlocked'])).toMatchObject({
      winnerIndex: null,
      reason: 'SimultaneousTerminal',
    });
  });

  it('rejects results without a terminal outcome', () => {
    expect(() => resolve(['Active', 'Active'])).toThrow(RangeError);
  });

  it('rejects an invalid duration', () => {
    expect(() =>
      GameCore.resolveResult(['AllVirusesCleared', 'Active'], playerStats, -1),
    ).toThrow(RangeError);
    expect(() =>
      GameCore.resolveResult(
        ['AllVirusesCleared', 'Active'],
        playerStats,
        Number.NaN,
      ),
    ).toThrow(RangeError);
  });

  it('rejects invalid player statistics', () => {
    const invalidStats: readonly [PlayerStats, PlayerStats] = [
      { ...playerStats[0], score: -1 },
      playerStats[1],
    ];

    expect(() =>
      GameCore.resolveResult(
        ['AllVirusesCleared', 'Active'],
        invalidStats,
        12_345,
      ),
    ).toThrow(RangeError);
  });
});
