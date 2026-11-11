import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../src/game/core/game-core';
import type {
  ActiveCapsule,
  BoardCell,
  BoardState,
  GameState,
  GridOffset,
  VirusColor,
} from '../../../src/game/core/types';

export type CellPlacement = readonly [
  row: number,
  column: number,
  cell: BoardCell,
];

export function cellIndex(row: number, column: number): number {
  return row * BOARD_WIDTH + column;
}

export function makeBoard(
  placements: readonly CellPlacement[] = [],
): BoardState {
  const cells: BoardCell[] = Array.from(
    { length: BOARD_WIDTH * BOARD_HEIGHT },
    () => ({ kind: 'empty' }),
  );

  for (const [row, column, cell] of placements) {
    if (row < 0 || row >= BOARD_HEIGHT || column < 0 || column >= BOARD_WIDTH) {
      throw new Error(`Fixture cell is outside the board: ${row},${column}`);
    }

    const index = cellIndex(row, column);
    cells[index] = cell;
  }

  return { cells, difficulty: 1, seed: 'fixture-seed' };
}

export function makeCapsule(
  row: number,
  column: number,
  pivotColor: VirusColor = 'red',
  otherColor: VirusColor = 'blue',
  otherOffset: GridOffset = { row: 0, column: 1 },
): ActiveCapsule {
  return {
    pivot: { row, column },
    pivotColor,
    otherColor,
    otherOffset,
  };
}

export function makeState(
  placements: readonly CellPlacement[] = [],
  capsule: ActiveCapsule = makeCapsule(4, 3),
): GameState {
  const board = makeBoard(placements);
  return {
    board,
    activeCapsule: capsule,
    status: 'active',
    logicalTime: 0,
    lastGravityAt: 0,
    lastSoftDropAt: null,
    nextCapsuleIndex: 1,
    stats: { score: 0, virusesCleared: 0, chains: 0 },
    attackPoints: 0,
    outgoingObstacles: 0,
    pendingObstacles: 0,
  };
}

export function virus(color: VirusColor): BoardCell {
  return { kind: 'virus', color };
}

export function settledCapsule(
  color: VirusColor,
  capsuleId?: number,
): BoardCell {
  return capsuleId === undefined
    ? { kind: 'capsule', color }
    : { kind: 'capsule', color, capsuleId };
}
