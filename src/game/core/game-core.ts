import type {
  ActiveCapsule,
  BoardCell,
  BoardState,
  CapsuleSegment,
  CapsulePreview,
  Difficulty,
  GameEvent,
  GameInput,
  GameState,
  GameTransition,
  GridPosition,
  LogicalTime,
  MatchResult,
  PlayerStats,
  RejectedInput,
  ServerSeed,
  TerminalOutcome,
} from './types';

export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 16;
export const VIRUSES_PER_COLOR = 5;

const INITIAL_CAPSULE_CELLS = new Set([
  3,
  4,
  ...Array.from({ length: BOARD_WIDTH }, (_, column) => BOARD_WIDTH + column),
]);
const VIRUS_COLORS = ['red', 'blue', 'yellow'] as const;
const GRAVITY_INTERVAL_MS = 1000;
const SOFT_DROP_INTERVAL_MS = 100;

function createRandom(seed: ServerSeed): () => number {
  let state = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 0x01000193);
  }

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function shuffle<T>(values: T[], random: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = values[index];
    const swapValue = values[swapIndex];

    if (currentValue === undefined || swapValue === undefined) {
      throw new Error('Shuffle index is outside the values array');
    }

    values[index] = swapValue;
    values[swapIndex] = currentValue;
  }
}

function cellIndex(row: number, column: number): number {
  return row * BOARD_WIDTH + column;
}

function cellColor(cell: BoardCell | undefined) {
  return cell?.kind === 'virus' || cell?.kind === 'capsule' ? cell.color : null;
}

function getCapsuleSegments(capsule: ActiveCapsule): CapsuleSegment[] {
  return [
    {
      position: capsule.pivot,
      color: capsule.pivotColor,
    },
    {
      position: {
        row: capsule.pivot.row + capsule.otherOffset.row,
        column: capsule.pivot.column + capsule.otherOffset.column,
      },
      color: capsule.otherColor,
    },
  ];
}

function canPlaceCapsule(
  board: BoardState,
  capsule: ActiveCapsule,
): RejectedInput['reason'] | null {
  const occupiedCells = new Set<number>();

  for (const segment of getCapsuleSegments(capsule)) {
    const { row, column } = segment.position;
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(column) ||
      row < 0 ||
      row >= BOARD_HEIGHT ||
      column < 0 ||
      column >= BOARD_WIDTH
    ) {
      return 'out-of-bounds';
    }

    const index = cellIndex(row, column);
    if (occupiedCells.has(index)) {
      return 'collision';
    }
    occupiedCells.add(index);

    const cell = board.cells[index];
    if (cell === undefined) {
      throw new Error('Board state does not contain all 128 cells');
    }
    if (cell.kind !== 'empty') {
      return 'collision';
    }
  }

  return null;
}

function createActiveCapsule(
  seed: ServerSeed,
  capsuleIndex: number,
): ActiveCapsule {
  const random = createRandom(`${seed}:capsule:${capsuleIndex}`);
  const pivotColor = VIRUS_COLORS[Math.floor(random() * VIRUS_COLORS.length)];
  const otherColor = VIRUS_COLORS[Math.floor(random() * VIRUS_COLORS.length)];

  if (pivotColor === undefined || otherColor === undefined) {
    throw new Error('Unable to generate capsule colors');
  }

  return {
    pivot: { row: 0, column: 3 },
    pivotColor,
    otherColor,
    otherOffset: { row: 0, column: 1 },
  };
}

function findMatches(cells: readonly BoardCell[]): Set<number> {
  const matches = new Set<number>();

  function collectRuns(line: readonly number[]): void {
    let start = 0;

    while (start < line.length) {
      const startIndex = line[start];
      if (startIndex === undefined) {
        break;
      }

      const color = cellColor(cells[startIndex]);
      if (color === null) {
        start += 1;
        continue;
      }

      let end = start + 1;
      while (end < line.length) {
        const index = line[end];
        if (index === undefined || cellColor(cells[index]) !== color) {
          break;
        }
        end += 1;
      }

      if (end - start >= 4) {
        for (let match = start; match < end; match += 1) {
          const index = line[match];
          if (index !== undefined) {
            matches.add(index);
          }
        }
      }

      start = end;
    }
  }

  for (let row = 0; row < BOARD_HEIGHT; row += 1) {
    const line: number[] = [];
    for (let column = 0; column < BOARD_WIDTH; column += 1) {
      line.push(cellIndex(row, column));
    }
    collectRuns(line);
  }

  for (let column = 0; column < BOARD_WIDTH; column += 1) {
    const line: number[] = [];
    for (let row = 0; row < BOARD_HEIGHT; row += 1) {
      line.push(cellIndex(row, column));
    }
    collectRuns(line);
  }

  return matches;
}

function settleCapsules(cells: BoardCell[]): void {
  type CapsuleCell = Extract<BoardCell, { kind: 'capsule' }>;
  type CapsulePosition = { index: number; cell: CapsuleCell };

  while (true) {
    const linkedSegments = new Map<number, CapsulePosition[]>();
    const units: CapsulePosition[][] = [];

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      if (cell?.kind !== 'capsule') {
        continue;
      }

      const segment = { index, cell };
      if (cell.capsuleId === undefined) {
        units.push([segment]);
        continue;
      }

      const linked = linkedSegments.get(cell.capsuleId);
      if (linked === undefined) {
        linkedSegments.set(cell.capsuleId, [segment]);
      } else {
        linked.push(segment);
      }
    }

    for (const linked of linkedSegments.values()) {
      if (linked.length > 2) {
        throw new Error('A capsule cannot contain more than two segments');
      }
      units.push(linked);
    }

    units.sort((left, right) => {
      const leftBottom = Math.max(
        ...left.map(({ index }) => Math.floor(index / BOARD_WIDTH)),
      );
      const rightBottom = Math.max(
        ...right.map(({ index }) => Math.floor(index / BOARD_WIDTH)),
      );
      return rightBottom - leftBottom;
    });

    let moved = false;
    for (const unit of units) {
      const sourceIndices = new Set(unit.map(({ index }) => index));
      const destinationIndices = unit.map(({ index }) => index + BOARD_WIDTH);
      const canFall = destinationIndices.every((index) => {
        const row = Math.floor(index / BOARD_WIDTH);
        return (
          row < BOARD_HEIGHT &&
          (sourceIndices.has(index) || cells[index]?.kind === 'empty')
        );
      });

      if (!canFall) {
        continue;
      }

      for (const { index } of unit) {
        cells[index] = { kind: 'empty' };
      }
      for (
        let segmentIndex = 0;
        segmentIndex < unit.length;
        segmentIndex += 1
      ) {
        const segment = unit[segmentIndex];
        const destinationIndex = destinationIndices[segmentIndex];
        if (segment === undefined || destinationIndex === undefined) {
          throw new Error('Capsule fall destination is incomplete');
        }
        cells[destinationIndex] = segment.cell;
      }
      moved = true;
    }

    if (!moved) {
      return;
    }
  }
}

function resolveMatches(cells: BoardCell[]): GameEvent[] {
  const events: GameEvent[] = [];
  let chain = 0;

  while (true) {
    const matches = [...findMatches(cells)].sort((left, right) => left - right);
    if (matches.length === 0) {
      return events;
    }

    chain += 1;
    let virusCount = 0;
    const positions: GridPosition[] = [];

    for (const index of matches) {
      const cell = cells[index];
      if (cell === undefined) {
        throw new Error('Match index is outside the board');
      }
      if (cell.kind === 'virus') {
        virusCount += 1;
      }

      positions.push({
        row: Math.floor(index / BOARD_WIDTH),
        column: index % BOARD_WIDTH,
      });
      cells[index] = { kind: 'empty' };
    }

    events.push({
      type: 'matches-cleared',
      chain,
      virusCount,
      positions,
    });

    const adjacentObstacles = new Set<number>();
    for (const index of matches) {
      const row = Math.floor(index / BOARD_WIDTH);
      const column = index % BOARD_WIDTH;
      const neighbors: GridPosition[] = [];

      if (row > 0) neighbors.push({ row: row - 1, column });
      if (row + 1 < BOARD_HEIGHT) neighbors.push({ row: row + 1, column });
      if (column > 0) neighbors.push({ row, column: column - 1 });
      if (column + 1 < BOARD_WIDTH) neighbors.push({ row, column: column + 1 });

      for (const neighbor of neighbors) {
        const neighborIndex = cellIndex(neighbor.row, neighbor.column);
        if (cells[neighborIndex]?.kind === 'obstacle') {
          adjacentObstacles.add(neighborIndex);
        }
      }
    }

    if (adjacentObstacles.size > 0) {
      const positions: GridPosition[] = [];
      for (const index of adjacentObstacles) {
        cells[index] = { kind: 'empty' };
        positions.push({
          row: Math.floor(index / BOARD_WIDTH),
          column: index % BOARD_WIDTH,
        });
      }
      events.push({ type: 'obstacles-cleared', positions });
    }

    settleCapsules(cells);
  }
}

function placeObstacle(cells: BoardCell[]): GridPosition | null {
  for (let row = BOARD_HEIGHT - 1; row >= 0; row -= 1) {
    for (let column = 0; column < BOARD_WIDTH; column += 1) {
      const index = cellIndex(row, column);
      const cell = cells[index];
      if (cell === undefined) {
        throw new Error('Board state does not contain all 128 cells');
      }
      if (cell.kind === 'empty') {
        cells[index] = { kind: 'obstacle' };
        return { row, column };
      }
    }
  }

  return null;
}

function assertCounter(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

function movedCapsule(
  capsule: ActiveCapsule,
  rowDelta: number,
  columnDelta: number,
): ActiveCapsule {
  return {
    ...capsule,
    pivot: {
      row: capsule.pivot.row + rowDelta,
      column: capsule.pivot.column + columnDelta,
    },
  };
}

function transition(
  state: GameState,
  events: readonly GameEvent[],
): GameTransition {
  return { kind: 'transition', state, events };
}

function reject(
  state: GameState,
  reason: RejectedInput['reason'],
): RejectedInput {
  return { kind: 'rejected', reason, state };
}

function lockCapsule(
  state: GameState,
  capsule: ActiveCapsule,
  logicalTime: LogicalTime,
): GameTransition | RejectedInput {
  const placementFailure = canPlaceCapsule(state.board, capsule);
  if (placementFailure !== null) {
    return reject(state, placementFailure);
  }

  const cells = [...state.board.cells];
  const segments = getCapsuleSegments(capsule);

  for (const segment of segments) {
    const index = cellIndex(segment.position.row, segment.position.column);
    const cell = cells[index];
    if (cell === undefined || cell.kind !== 'empty') {
      return reject(state, cell === undefined ? 'out-of-bounds' : 'collision');
    }
    cells[index] = {
      kind: 'capsule',
      color: segment.color,
      capsuleId: state.nextCapsuleIndex - 1,
    };
  }

  const events: GameEvent[] = [{ type: 'capsule-fixed', segments }];
  const matchEvents = resolveMatches(cells);
  events.push(...matchEvents);

  const scoredState = GameCore.applyMatchEvents(state, matchEvents);
  let pendingObstacles = scoredState.pendingObstacles;
  let obstacleBlocked = false;

  if (pendingObstacles > 0) {
    const position = placeObstacle(cells);
    if (position === null) {
      obstacleBlocked = true;
    } else {
      pendingObstacles -= 1;
      events.push({ type: 'obstacle-delivered', position });
    }
  }

  const board: BoardState = { ...state.board, cells };
  const nextCapsule = createActiveCapsule(board.seed, state.nextCapsuleIndex);
  const spawnFailure = canPlaceCapsule(board, nextCapsule);
  const nextState: GameState = {
    ...scoredState,
    board,
    activeCapsule: spawnFailure === null ? nextCapsule : null,
    status: spawnFailure === null && !obstacleBlocked ? 'active' : 'blocked',
    logicalTime,
    lastGravityAt: logicalTime,
    nextCapsuleIndex: state.nextCapsuleIndex + 1,
    pendingObstacles,
  };

  if (spawnFailure === null && !obstacleBlocked) {
    events.push({ type: 'capsule-spawned', capsule: nextCapsule });
  } else {
    events.push({ type: 'board-blocked' });
  }

  return transition(nextState, events);
}

export class GameCore {
  static previewNextCapsule(state: GameState): CapsulePreview | null {
    if (state.status !== 'active' || state.activeCapsule === null) {
      return null;
    }

    const capsule = createActiveCapsule(
      state.board.seed,
      state.nextCapsuleIndex,
    );
    return {
      pivotColor: capsule.pivotColor,
      otherColor: capsule.otherColor,
    };
  }

  static initialize(seed: ServerSeed, difficulty: Difficulty): BoardState {
    const cellCount = BOARD_WIDTH * BOARD_HEIGHT;
    const cells: BoardCell[] = Array.from(
      { length: cellCount },
      (): BoardCell => ({
        kind: 'empty',
      }),
    );
    const availablePositions = Array.from(
      { length: cellCount },
      (_, index) => index,
    ).filter((index) => !INITIAL_CAPSULE_CELLS.has(index));
    const virusColors = VIRUS_COLORS.flatMap((color) =>
      Array.from({ length: VIRUSES_PER_COLOR }, () => color),
    );
    const random = createRandom(seed);

    shuffle(availablePositions, random);
    shuffle(virusColors, random);

    for (const color of virusColors) {
      const position = availablePositions.pop();

      if (position === undefined) {
        throw new Error('Board has insufficient cells for initial viruses');
      }

      if (cells[position] === undefined) {
        throw new Error('Virus position is outside the board');
      }

      cells[position] = { kind: 'virus', color };
    }

    return { cells, difficulty, seed };
  }

  static start(board: BoardState, logicalTime: LogicalTime = 0): GameState {
    if (board.cells.length !== BOARD_WIDTH * BOARD_HEIGHT) {
      throw new Error('Board state must contain exactly 128 cells');
    }

    const initialCapsule = createActiveCapsule(board.seed, 0);
    const spawnFailure = canPlaceCapsule(board, initialCapsule);

    return {
      board,
      activeCapsule: spawnFailure === null ? initialCapsule : null,
      status: spawnFailure === null ? 'active' : 'blocked',
      logicalTime,
      lastGravityAt: logicalTime,
      lastSoftDropAt: null,
      nextCapsuleIndex: 1,
      stats: { score: 0, virusesCleared: 0, chains: 0 },
      attackPoints: 0,
      outgoingObstacles: 0,
      pendingObstacles: 0,
    };
  }

  static applyMatchEvents(
    state: GameState,
    events: readonly GameEvent[],
  ): GameState {
    assertCounter(state.stats.score, 'Score');
    assertCounter(state.stats.virusesCleared, 'Cleared virus count');
    assertCounter(state.stats.chains, 'Chain count');
    assertCounter(state.attackPoints, 'Attack point count');
    assertCounter(state.outgoingObstacles, 'Outgoing obstacle count');

    let virusesCleared = 0;
    let chains = 0;
    let chainBonus = 0;

    for (const event of events) {
      if (event.type !== 'matches-cleared') {
        continue;
      }
      if (!Number.isSafeInteger(event.chain) || event.chain < 1) {
        throw new RangeError(
          'Match events must contain a positive chain number',
        );
      }

      assertCounter(event.virusCount, 'Matched virus count');
      virusesCleared += event.virusCount;
      chains += 1;
      if (event.chain > 1) {
        chainBonus += 1;
      }
      assertCounter(virusesCleared, 'Cumulative cleared virus count');
      assertCounter(chains, 'Cumulative chain count');
      assertCounter(chainBonus, 'Cumulative chain bonus');
    }

    const earnedPoints = virusesCleared + chainBonus;
    const availablePoints = state.attackPoints + earnedPoints;
    const generatedObstacles = Math.min(3, Math.floor(availablePoints / 4));
    const stats: PlayerStats = {
      score: state.stats.score + earnedPoints,
      virusesCleared: state.stats.virusesCleared + virusesCleared,
      chains: state.stats.chains + chains,
    };
    const outgoingObstacles = state.outgoingObstacles + generatedObstacles;

    assertCounter(earnedPoints, 'Earned attack points');
    assertCounter(availablePoints, 'Available attack points');
    assertCounter(stats.score, 'Score');
    assertCounter(stats.virusesCleared, 'Cleared virus count');
    assertCounter(stats.chains, 'Chain count');
    assertCounter(outgoingObstacles, 'Outgoing obstacle count');

    return {
      ...state,
      stats,
      attackPoints: availablePoints - generatedObstacles * 4,
      outgoingObstacles,
    };
  }

  static queueIncomingObstacles(state: GameState, count: number): GameState {
    assertCounter(count, 'Incoming obstacle count');
    if (count === 0) {
      return state;
    }

    const pendingObstacles = state.pendingObstacles + count;
    assertCounter(pendingObstacles, 'Pending obstacle count');

    return { ...state, pendingObstacles };
  }

  static takeOutgoingObstacles(state: GameState): {
    state: GameState;
    count: number;
  } {
    return {
      state: { ...state, outgoingObstacles: 0 },
      count: state.outgoingObstacles,
    };
  }

  static resolveResult(
    outcomes: readonly [TerminalOutcome, TerminalOutcome],
    stats: readonly [PlayerStats, PlayerStats],
    durationMs: number,
  ): MatchResult {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new RangeError(
        'Match duration must be a non-negative finite number',
      );
    }

    for (const [index, playerStats] of stats.entries()) {
      assertCounter(playerStats.score, `Player ${index} score`);
      assertCounter(
        playerStats.virusesCleared,
        `Player ${index} cleared virus count`,
      );
      assertCounter(playerStats.chains, `Player ${index} chain count`);
    }

    const [firstOutcome, secondOutcome] = outcomes;
    let winnerIndex: MatchResult['winnerIndex'];
    let reason: MatchResult['reason'];

    if (firstOutcome !== 'Active' && secondOutcome !== 'Active') {
      winnerIndex = null;
      reason = 'SimultaneousTerminal';
    } else if (firstOutcome !== 'Active') {
      winnerIndex = firstOutcome === 'AllVirusesCleared' ? 0 : 1;
      reason = firstOutcome;
    } else if (secondOutcome !== 'Active') {
      winnerIndex = secondOutcome === 'AllVirusesCleared' ? 1 : 0;
      reason = secondOutcome;
    } else {
      throw new RangeError('At least one player must have a terminal outcome');
    }

    const resultStats: readonly [PlayerStats, PlayerStats] = [
      { ...stats[0] },
      { ...stats[1] },
    ];

    return {
      winnerIndex,
      reason,
      stats: resultStats,
      durationMs,
    };
  }

  static resolve(
    state: GameState,
    input: GameInput,
    logicalTime: LogicalTime,
  ): GameTransition | RejectedInput {
    if (!Number.isFinite(logicalTime) || logicalTime < state.logicalTime) {
      return reject(state, 'invalid-time');
    }
    if (state.status === 'blocked' || state.activeCapsule === null) {
      return reject(state, 'board-blocked');
    }

    const capsule = state.activeCapsule;

    switch (input) {
      case 'MoveLeft':
      case 'MoveRight': {
        const columnDelta = input === 'MoveLeft' ? -1 : 1;
        const nextCapsule = movedCapsule(capsule, 0, columnDelta);
        const failure = canPlaceCapsule(state.board, nextCapsule);
        if (failure !== null) {
          return reject(state, failure);
        }

        return transition(
          {
            ...state,
            activeCapsule: nextCapsule,
            logicalTime,
          },
          [
            {
              type: 'capsule-moved',
              cause: 'input',
              from: capsule,
              to: nextCapsule,
            },
          ],
        );
      }
      case 'RotateClockwise':
      case 'RotateCounterclockwise': {
        const { row, column } = capsule.otherOffset;
        const otherOffset =
          input === 'RotateClockwise'
            ? { row: column, column: row === 0 ? 0 : -row }
            : { row: column === 0 ? 0 : -column, column: row };
        const nextCapsule = { ...capsule, otherOffset };
        const failure = canPlaceCapsule(state.board, nextCapsule);
        if (failure !== null) {
          return reject(state, failure);
        }

        return transition(
          {
            ...state,
            activeCapsule: nextCapsule,
            logicalTime,
          },
          [
            {
              type: 'capsule-rotated',
              direction:
                input === 'RotateClockwise' ? 'clockwise' : 'counterclockwise',
              from: capsule,
              to: nextCapsule,
            },
          ],
        );
      }
      case 'SoftDrop': {
        if (
          state.lastSoftDropAt !== null &&
          logicalTime - state.lastSoftDropAt < SOFT_DROP_INTERVAL_MS
        ) {
          return reject(state, 'rate-limited');
        }

        const nextCapsule = movedCapsule(capsule, 1, 0);
        const failure = canPlaceCapsule(state.board, nextCapsule);
        if (failure !== null) {
          return reject(state, failure);
        }

        return transition(
          {
            ...state,
            activeCapsule: nextCapsule,
            logicalTime,
            lastSoftDropAt: logicalTime,
          },
          [
            {
              type: 'capsule-moved',
              cause: 'soft-drop',
              from: capsule,
              to: nextCapsule,
            },
          ],
        );
      }
      case 'GravityTick': {
        if (logicalTime - state.lastGravityAt < GRAVITY_INTERVAL_MS) {
          return reject(state, 'gravity-not-due');
        }

        const nextCapsule = movedCapsule(capsule, 1, 0);
        const failure = canPlaceCapsule(state.board, nextCapsule);
        if (failure !== null) {
          return lockCapsule(state, capsule, logicalTime);
        }

        return transition(
          {
            ...state,
            activeCapsule: nextCapsule,
            logicalTime,
            lastGravityAt: logicalTime,
          },
          [
            {
              type: 'capsule-moved',
              cause: 'gravity',
              from: capsule,
              to: nextCapsule,
            },
          ],
        );
      }
      case 'HardDrop': {
        let destination = capsule;
        while (true) {
          const nextCapsule = movedCapsule(destination, 1, 0);
          if (canPlaceCapsule(state.board, nextCapsule) !== null) {
            break;
          }
          destination = nextCapsule;
        }
        return lockCapsule(state, destination, logicalTime);
      }
      default: {
        const exhaustiveInput: never = input;
        return exhaustiveInput;
      }
    }
  }
}
