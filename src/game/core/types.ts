export type ServerSeed = string;

export type Difficulty = number;

export type VirusColor = 'red' | 'blue' | 'yellow';

export type BoardCell =
  | { readonly kind: 'empty' }
  | { readonly kind: 'virus'; readonly color: VirusColor }
  | { readonly kind: 'obstacle' }
  | {
      readonly kind: 'capsule';
      readonly color: VirusColor;
      readonly capsuleId?: number;
    };

export interface PlayerStats {
  readonly score: number;
  readonly virusesCleared: number;
  readonly chains: number;
}

export type TerminalOutcome =
  'Active' | 'AllVirusesCleared' | 'BoardBlocked' | 'Disconnected';

export type MatchEndReason =
  Exclude<TerminalOutcome, 'Active'> | 'SimultaneousTerminal';

export interface MatchResult {
  readonly winnerIndex: 0 | 1 | null;
  readonly reason: MatchEndReason;
  readonly stats: readonly [PlayerStats, PlayerStats];
  readonly durationMs: number;
}

export interface BoardState {
  readonly cells: readonly BoardCell[];
  readonly difficulty: Difficulty;
  readonly seed: ServerSeed;
}

export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

export interface GridOffset {
  readonly row: number;
  readonly column: number;
}

export interface ActiveCapsule {
  readonly pivot: GridPosition;
  readonly pivotColor: VirusColor;
  readonly otherColor: VirusColor;
  readonly otherOffset: GridOffset;
}

export interface CapsulePreview {
  readonly pivotColor: VirusColor;
  readonly otherColor: VirusColor;
}

export type GameInput =
  | 'MoveLeft'
  | 'MoveRight'
  | 'SoftDrop'
  | 'HardDrop'
  | 'RotateClockwise'
  | 'RotateCounterclockwise'
  | 'GravityTick';

export type LogicalTime = number;

export interface GameState {
  readonly board: BoardState;
  readonly activeCapsule: ActiveCapsule | null;
  readonly status: 'active' | 'blocked';
  readonly logicalTime: LogicalTime;
  readonly lastGravityAt: LogicalTime;
  readonly lastSoftDropAt: LogicalTime | null;
  readonly nextCapsuleIndex: number;
  readonly stats: PlayerStats;
  readonly attackPoints: number;
  readonly outgoingObstacles: number;
  readonly pendingObstacles: number;
}

export interface CapsuleSegment {
  readonly position: GridPosition;
  readonly color: VirusColor;
}

export type GameEvent =
  | {
      readonly type: 'capsule-moved';
      readonly cause: 'input' | 'soft-drop' | 'gravity';
      readonly from: ActiveCapsule;
      readonly to: ActiveCapsule;
    }
  | {
      readonly type: 'capsule-rotated';
      readonly direction: 'clockwise' | 'counterclockwise';
      readonly from: ActiveCapsule;
      readonly to: ActiveCapsule;
    }
  | {
      readonly type: 'capsule-fixed';
      readonly segments: readonly CapsuleSegment[];
    }
  | {
      readonly type: 'matches-cleared';
      readonly chain: number;
      readonly virusCount: number;
      readonly positions: readonly GridPosition[];
    }
  | {
      readonly type: 'obstacles-cleared';
      readonly positions: readonly GridPosition[];
    }
  | {
      readonly type: 'obstacle-delivered';
      readonly position: GridPosition;
    }
  | {
      readonly type: 'capsule-spawned';
      readonly capsule: ActiveCapsule;
    }
  | { readonly type: 'board-blocked' };

export type GameTransition = {
  readonly kind: 'transition';
  readonly state: GameState;
  readonly events: readonly GameEvent[];
};

export type RejectedInput = {
  readonly kind: 'rejected';
  readonly reason:
    | 'board-blocked'
    | 'collision'
    | 'out-of-bounds'
    | 'gravity-not-due'
    | 'rate-limited'
    | 'invalid-time';
  readonly state: GameState;
};
