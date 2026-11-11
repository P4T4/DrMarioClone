import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { GameCore } from '../../game/core/game-core';
import type {
  BoardState,
  CapsulePreview,
  Difficulty,
  GameEvent,
  GameInput,
  GameState,
  MatchResult,
  TerminalOutcome,
} from '../../game/core/types';
import type { RoomFailure } from '../../rooms/types';

export interface WaitingRoom {
  readonly code: string;
  readonly status: 'waiting';
  readonly players: readonly [string];
  readonly expiresAt: number;
}

export interface CreatedRoom extends WaitingRoom {
  readonly seatToken: string;
}

export interface JoinedRoom {
  readonly code: string;
  readonly status: 'countdown';
  readonly players: readonly [string, string];
  readonly startsAt: number;
}

export interface JoinedRoomWithToken extends JoinedRoom {
  readonly seatToken: string;
}

export interface PlayingRoom {
  readonly code: string;
  readonly status: 'playing';
  readonly players: readonly [string, string];
  readonly startedAt: number;
}

export type RoomSnapshot = WaitingRoom | JoinedRoom | PlayingRoom;
export type RoomId = string;
export type RoomSeat = 0 | 1;
export type ConnectionView =
  'Connected' | 'Paused' | 'Reconnecting' | 'Finished';
export type PublicGameState = Omit<GameState, 'board'> & {
  readonly board: Omit<BoardState, 'seed'>;
};

export interface RoomMatchSnapshot {
  readonly room: PlayingRoom;
  readonly states: readonly [PublicGameState, PublicGameState];
  readonly elapsedMs: number;
  readonly paused: boolean;
  readonly result: MatchResult | null;
}

export interface RoomAdvanceResult {
  readonly match: RoomMatchSnapshot;
  readonly events: readonly [readonly GameEvent[], readonly GameEvent[]];
}

export type RoomInputResult =
  | {
      readonly kind: 'accepted';
      readonly match: RoomMatchSnapshot;
      readonly events: readonly [readonly GameEvent[], readonly GameEvent[]];
    }
  | {
      readonly kind: 'rejected';
      readonly reason:
        | 'not-started'
        | 'paused'
        | 'finished'
        | 'invalid-seat'
        | 'invalid-sequence'
        | 'invalid-input'
        | 'board-blocked'
        | 'collision'
        | 'out-of-bounds'
        | 'gravity-not-due'
        | 'rate-limited'
        | 'invalid-time';
      readonly match: RoomMatchSnapshot | null;
    };

export type RoomTerminalEvent = GameEvent | { readonly type: 'disconnected' };

export type ReconnectResult =
  | {
      readonly kind: 'reconnected';
      readonly seat: RoomSeat;
      readonly match: RoomMatchSnapshot;
    }
  | 'Expired'
  | 'InvalidToken';

interface MatchSession {
  states: [GameState, GameState];
  lastSequences: [number, number];
  startedAt: number;
  pausedAt: number | null;
  pausedDurationMs: number;
  disconnectedAt: number | null;
  disconnectedSeat: RoomSeat | null;
  result: MatchResult | null;
}

export type CreateRoomResult =
  CreatedRoom | Extract<RoomFailure, 'InvalidAlias' | 'CapacityUnavailable'>;
export type JoinRoomResult =
  | JoinedRoomWithToken
  | Extract<RoomFailure, 'InvalidAlias' | 'InvalidCode' | 'Expired' | 'Full'>;

export interface RoomServiceOptions {
  readonly now?: () => number;
  readonly generateCode?: () => string;
  readonly generateSeed?: () => string;
  readonly generateSeatToken?: () => string;
  readonly waitingRoomTtlMs?: number;
  readonly difficulty?: Difficulty;
  readonly createGameState?: (
    seed: string,
    difficulty: Difficulty,
    seat: RoomSeat,
  ) => GameState;
  readonly hasCapacity?: () => boolean;
}

type InternalRoom = WaitingRoom | JoinedRoom | PlayingRoom;

const ROOM_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
type PlayerInput = Exclude<GameInput, 'GravityTick'>;

const PLAYER_INPUTS = new Set<PlayerInput>([
  'MoveLeft',
  'MoveRight',
  'SoftDrop',
  'HardDrop',
  'RotateClockwise',
  'RotateCounterclockwise',
]);
const ROOM_CODE_LENGTH = 8;
const WAITING_ROOM_TTL_MS = 5 * 60 * 1000;
const EXPIRED_CODE_RETENTION_MS = 5 * 60 * 1000;
const COUNTDOWN_MS = 3 * 1000;
const RECONNECT_WINDOW_MS = 30 * 1000;
const CODE_GENERATION_ATTEMPTS = 8;
const INITIAL_VIRUS_COUNT = 15;

function createRoomCode(): string {
  const randomValues = randomBytes(ROOM_CODE_LENGTH);
  return Array.from(randomValues, (value) =>
    ROOM_CODE_ALPHABET.charAt(value & 31),
  ).join('');
}

function createServerSeed(): string {
  return randomBytes(16).toString('hex');
}

function createSeatToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashSeatToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}

function isPlayerInput(input: unknown): input is PlayerInput {
  return typeof input === 'string' && PLAYER_INPUTS.has(input as PlayerInput);
}

function publicGameState(state: GameState): PublicGameState {
  return {
    ...state,
    board: {
      difficulty: state.board.difficulty,
      cells: state.board.cells.map((cell) => ({ ...cell })),
    },
    activeCapsule:
      state.activeCapsule === null
        ? null
        : {
            ...state.activeCapsule,
            pivot: { ...state.activeCapsule.pivot },
            otherOffset: { ...state.activeCapsule.otherOffset },
          },
    stats: { ...state.stats },
  };
}

function copyMatchResult(result: MatchResult): MatchResult {
  return {
    ...result,
    stats: [{ ...result.stats[0] }, { ...result.stats[1] }],
  };
}

function copyGameEvents(events: readonly GameEvent[]): readonly GameEvent[] {
  return events.map((event) => {
    switch (event.type) {
      case 'capsule-moved':
      case 'capsule-rotated':
        return {
          ...event,
          from: {
            ...event.from,
            pivot: { ...event.from.pivot },
            otherOffset: { ...event.from.otherOffset },
          },
          to: {
            ...event.to,
            pivot: { ...event.to.pivot },
            otherOffset: { ...event.to.otherOffset },
          },
        };
      case 'capsule-fixed':
        return {
          ...event,
          segments: event.segments.map((segment) => ({
            ...segment,
            position: { ...segment.position },
          })),
        };
      case 'matches-cleared':
      case 'obstacles-cleared':
        return {
          ...event,
          positions: event.positions.map((position) => ({ ...position })),
        };
      case 'obstacle-delivered':
        return { ...event, position: { ...event.position } };
      case 'capsule-spawned':
        return {
          ...event,
          capsule: {
            ...event.capsule,
            pivot: { ...event.capsule.pivot },
            otherOffset: { ...event.capsule.otherOffset },
          },
        };
      case 'board-blocked':
        return { ...event };
      default: {
        const exhaustive: never = event;
        return exhaustive;
      }
    }
  });
}

function normalizeAlias(alias: string): string | null {
  if (/\p{Cc}/u.test(alias)) {
    return null;
  }

  const normalized = alias.trim();
  const codePointCount = [...normalized].length;

  if (codePointCount < 1 || codePointCount > 20) {
    return null;
  }

  return normalized;
}

function normalizeRoomCode(code: string): string | null {
  const normalized = code
    .trim()
    .replace(/[a-z]/g, (letter) => letter.toUpperCase());
  if ([...normalized].length !== ROOM_CODE_LENGTH) {
    return null;
  }

  for (const character of normalized) {
    if (!ROOM_CODE_ALPHABET.includes(character)) {
      return null;
    }
  }

  return normalized;
}

function addMilliseconds(now: number, duration: number): number {
  const deadline = now + duration;
  if (!Number.isSafeInteger(deadline)) {
    throw new RangeError('Room deadline must be a safe integer timestamp');
  }
  return deadline;
}

export class RoomService {
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly matches = new Map<string, MatchSession>();
  private readonly seatTokenHashes = new Map<
    string,
    readonly [Buffer, Buffer | null]
  >();
  private readonly expiredCodes = new Map<string, number>();
  private readonly now: () => number;
  private readonly generateCode: () => string;
  private readonly generateSeed: () => string;
  private readonly generateSeatToken: () => string;
  private readonly waitingRoomTtlMs: number;
  private readonly difficulty: Difficulty;
  private readonly createGameState: NonNullable<
    RoomServiceOptions['createGameState']
  >;
  private readonly hasCapacity: () => boolean;

  constructor(options: RoomServiceOptions = {}) {
    this.now = options.now ?? Date.now;
    this.generateCode = options.generateCode ?? createRoomCode;
    this.generateSeed = options.generateSeed ?? createServerSeed;
    this.generateSeatToken = options.generateSeatToken ?? createSeatToken;
    this.waitingRoomTtlMs = options.waitingRoomTtlMs ?? WAITING_ROOM_TTL_MS;
    if (
      !Number.isSafeInteger(this.waitingRoomTtlMs) ||
      this.waitingRoomTtlMs < 1
    ) {
      throw new RangeError('Waiting room TTL must be a positive safe integer');
    }
    this.difficulty = options.difficulty ?? 1;
    this.createGameState =
      options.createGameState ??
      ((seed, difficulty) =>
        GameCore.start(GameCore.initialize(seed, difficulty)));
    this.hasCapacity = options.hasCapacity ?? (() => true);
  }

  create(alias: string): CreateRoomResult {
    const normalizedAlias = normalizeAlias(alias);
    if (normalizedAlias === null) {
      return 'InvalidAlias';
    }

    const now = this.readNow();
    this.expireWaitingRooms(now);
    if (!this.hasCapacity()) {
      return 'CapacityUnavailable';
    }

    const code = this.allocateCode();
    const room: WaitingRoom = {
      code,
      status: 'waiting',
      players: [normalizedAlias],
      expiresAt: addMilliseconds(now, this.waitingRoomTtlMs),
    };
    const seatToken = this.generateSeatToken();
    if (seatToken.length === 0) {
      throw new Error('Seat token generator returned an empty token');
    }
    this.rooms.set(code, room);
    this.seatTokenHashes.set(code, [hashSeatToken(seatToken), null]);
    return { ...room, players: [normalizedAlias], seatToken };
  }

  join(code: string, alias: string): JoinRoomResult {
    const normalizedAlias = normalizeAlias(alias);
    if (normalizedAlias === null) {
      return 'InvalidAlias';
    }

    const normalizedCode = normalizeRoomCode(code);
    if (normalizedCode === null) {
      return 'InvalidCode';
    }

    const now = this.readNow();
    this.expireWaitingRooms(now);
    const room = this.rooms.get(normalizedCode);
    if (room === undefined) {
      return this.expiredCodes.has(normalizedCode) ? 'Expired' : 'InvalidCode';
    }
    if (room.status !== 'waiting') {
      return 'Full';
    }

    const joinedRoom: JoinedRoom = {
      code: room.code,
      status: 'countdown',
      players: [room.players[0], normalizedAlias],
      startsAt: addMilliseconds(now, COUNTDOWN_MS),
    };
    const seatToken = this.generateSeatToken();
    if (seatToken.length === 0) {
      throw new Error('Seat token generator returned an empty token');
    }
    this.rooms.set(normalizedCode, joinedRoom);
    const seatTokens = this.seatTokenHashes.get(normalizedCode);
    if (seatTokens === undefined) {
      throw new Error('Waiting room has no seat token');
    }
    this.seatTokenHashes.set(normalizedCode, [
      seatTokens[0],
      hashSeatToken(seatToken),
    ]);
    return {
      ...joinedRoom,
      players: [room.players[0], normalizedAlias],
      seatToken,
    };
  }

  getRoom(code: string): RoomSnapshot | null {
    const normalizedCode = normalizeRoomCode(code);
    if (normalizedCode === null) {
      return null;
    }

    const now = this.readNow();
    this.expireWaitingRooms(now);
    const room = this.rooms.get(normalizedCode);
    if (room === undefined) {
      return null;
    }

    if (room.status === 'countdown' && now >= room.startsAt) {
      const playingRoom: PlayingRoom = {
        code: room.code,
        status: 'playing',
        players: [room.players[0], room.players[1]],
        startedAt: room.startsAt,
      };
      this.rooms.set(normalizedCode, playingRoom);
      this.initializeMatch(playingRoom);
      return this.snapshot(playingRoom);
    }

    return this.snapshot(room);
  }

  getMatchState(roomId: RoomId): RoomMatchSnapshot | null {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing') {
      return null;
    }

    const match = this.matches.get(room.code);
    if (match === undefined) {
      return null;
    }
    this.expireDisconnection(room.code, match, this.readNow());

    return this.matchSnapshot(room, match);
  }

  getNextCapsule(roomId: RoomId, seat: RoomSeat): CapsulePreview | null {
    const snapshot = this.getMatchState(roomId);
    if (snapshot === null || snapshot.result !== null) {
      return null;
    }

    const match = this.matches.get(snapshot.room.code);
    if (match === undefined) {
      return null;
    }

    return GameCore.previewNextCapsule(match.states[seat]);
  }

  submitInput(
    roomId: RoomId,
    seat: number,
    sequence: number,
    input: GameInput,
  ): RoomInputResult {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing') {
      return { kind: 'rejected', reason: 'not-started', match: null };
    }

    const match = this.matches.get(room.code);
    if (match === undefined) {
      return { kind: 'rejected', reason: 'not-started', match: null };
    }
    const now = this.readNow();
    this.expireDisconnection(room.code, match, now);
    const currentSnapshot = () => this.matchSnapshot(room, match);

    if (match.result !== null) {
      return {
        kind: 'rejected',
        reason: 'finished',
        match: currentSnapshot(),
      };
    }
    if (match.pausedAt !== null) {
      return {
        kind: 'rejected',
        reason: 'paused',
        match: currentSnapshot(),
      };
    }
    if (seat !== 0 && seat !== 1) {
      return {
        kind: 'rejected',
        reason: 'invalid-seat',
        match: currentSnapshot(),
      };
    }
    if (
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      sequence <= match.lastSequences[seat]
    ) {
      return {
        kind: 'rejected',
        reason: 'invalid-sequence',
        match: currentSnapshot(),
      };
    }
    if (!isPlayerInput(input)) {
      return {
        kind: 'rejected',
        reason: 'invalid-input',
        match: currentSnapshot(),
      };
    }

    const logicalTime = this.logicalTime(match, now);
    const transition = GameCore.resolve(match.states[seat], input, logicalTime);
    if (transition.kind === 'rejected') {
      return {
        kind: 'rejected',
        reason: transition.reason,
        match: currentSnapshot(),
      };
    }

    const nextStates: [GameState, GameState] = [
      match.states[0],
      match.states[1],
    ];
    let ownState = transition.state;
    const outgoing = GameCore.takeOutgoingObstacles(ownState);
    ownState = outgoing.state;
    nextStates[seat] = ownState;

    if (outgoing.count > 0) {
      const opponentSeat: RoomSeat = seat === 0 ? 1 : 0;
      nextStates[opponentSeat] = GameCore.queueIncomingObstacles(
        nextStates[opponentSeat],
        outgoing.count,
      );
    }

    match.states = nextStates;
    match.lastSequences[seat] = sequence;
    const events: readonly [readonly GameEvent[], readonly GameEvent[]] =
      seat === 0 ? [transition.events, []] : [[], transition.events];
    this.finishIfTerminal(room.code, events);

    return {
      kind: 'accepted',
      match: this.matchSnapshot(room, match),
      events: [copyGameEvents(events[0]), copyGameEvents(events[1])],
    };
  }

  advance(roomId: RoomId): RoomAdvanceResult | null {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing') {
      return null;
    }

    const match = this.matches.get(room.code);
    if (match === undefined) {
      return null;
    }

    const now = this.readNow();
    this.expireDisconnection(room.code, match, now);
    if (match.result !== null || match.pausedAt !== null) {
      return null;
    }

    const logicalTime = this.logicalTime(match, now);
    const nextStates: [GameState, GameState] = [
      match.states[0],
      match.states[1],
    ];
    const events: [readonly GameEvent[], readonly GameEvent[]] = [[], []];
    const outgoingCounts: [number, number] = [0, 0];

    for (const seat of [0, 1] as const) {
      const transition = GameCore.resolve(
        match.states[seat],
        'GravityTick',
        logicalTime,
      );
      if (transition.kind === 'rejected') {
        if (
          transition.reason !== 'gravity-not-due' &&
          transition.reason !== 'board-blocked'
        ) {
          throw new RangeError(
            `Unable to advance player ${seat}: ${transition.reason}`,
          );
        }
        continue;
      }

      const outgoing = GameCore.takeOutgoingObstacles(transition.state);
      nextStates[seat] = outgoing.state;
      outgoingCounts[seat] = outgoing.count;
      events[seat] = transition.events;
    }

    if (events[0].length === 0 && events[1].length === 0) {
      return null;
    }

    for (const seat of [0, 1] as const) {
      const opponentSeat: RoomSeat = seat === 0 ? 1 : 0;
      if (outgoingCounts[seat] > 0) {
        nextStates[opponentSeat] = GameCore.queueIncomingObstacles(
          nextStates[opponentSeat],
          outgoingCounts[seat],
        );
      }
    }

    match.states = nextStates;
    this.finishIfTerminal(room.code, events);

    return {
      match: this.matchSnapshot(room, match),
      events: [copyGameEvents(events[0]), copyGameEvents(events[1])],
    };
  }

  disconnect(roomId: RoomId, seat: number): boolean {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing' || (seat !== 0 && seat !== 1)) {
      return false;
    }

    const match = this.matches.get(room.code);
    if (
      match === undefined ||
      match.result !== null ||
      match.pausedAt !== null
    ) {
      return false;
    }

    const now = this.readNow();
    if (now < match.startedAt) {
      throw new RangeError(
        'Room clock cannot move backwards before a disconnect',
      );
    }
    match.pausedAt = now;
    match.disconnectedAt = now;
    match.disconnectedSeat = seat;
    return true;
  }

  reconnect(roomId: RoomId, seatToken: unknown): ReconnectResult {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing') {
      return 'InvalidToken';
    }

    const match = this.matches.get(room.code);
    if (match === undefined) {
      return 'InvalidToken';
    }
    const now = this.readNow();
    this.expireDisconnection(room.code, match, now);
    const seat = this.seatForToken(room.code, seatToken);
    if (seat === null) {
      return 'InvalidToken';
    }
    if (match.result !== null) {
      return match.result.reason === 'Disconnected' &&
        match.disconnectedSeat === seat
        ? 'Expired'
        : 'InvalidToken';
    }
    if (
      match.disconnectedSeat !== seat ||
      match.disconnectedAt === null ||
      match.pausedAt === null
    ) {
      return 'InvalidToken';
    }

    this.resumeMatch(match, now);
    return {
      kind: 'reconnected',
      seat,
      match: this.matchSnapshot(room, match),
    };
  }

  pause(roomId: RoomId): boolean {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing') {
      return false;
    }

    const match = this.matches.get(room.code);
    if (
      match === undefined ||
      match.result !== null ||
      match.pausedAt !== null
    ) {
      return false;
    }

    const now = this.readNow();
    if (now < match.startedAt) {
      throw new RangeError('Room clock cannot move backwards before a pause');
    }
    match.pausedAt = now;
    return true;
  }

  resume(roomId: RoomId): boolean {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing') {
      return false;
    }

    const match = this.matches.get(room.code);
    if (
      match === undefined ||
      match.result !== null ||
      match.pausedAt === null ||
      match.disconnectedSeat !== null
    ) {
      return false;
    }

    const now = this.readNow();
    return this.resumeMatch(match, now);
  }

  finish(
    roomId: RoomId,
    terminalEvents: readonly [
      readonly RoomTerminalEvent[],
      readonly RoomTerminalEvent[],
    ],
  ): MatchResult {
    const room = this.getRoom(roomId);
    if (room?.status !== 'playing') {
      throw new RangeError('Room has not started');
    }

    const match = this.matches.get(room.code);
    if (match === undefined) {
      throw new RangeError('Room has no match state');
    }
    if (match.result !== null) {
      return copyMatchResult(match.result);
    }

    const outcomes: readonly [TerminalOutcome, TerminalOutcome] = [
      this.terminalOutcome(match.states[0], terminalEvents[0]),
      this.terminalOutcome(match.states[1], terminalEvents[1]),
    ];
    const result = GameCore.resolveResult(
      outcomes,
      [match.states[0].stats, match.states[1].stats],
      this.logicalTime(match, this.readNow()),
    );
    match.result = result;
    return copyMatchResult(result);
  }

  private initializeMatch(room: PlayingRoom): void {
    const firstSeed = this.generateSeed();
    const secondSeed = this.generateSeed();
    const states: [GameState, GameState] = [
      this.createGameState(firstSeed, this.difficulty, 0),
      this.createGameState(secondSeed, this.difficulty, 1),
    ];
    const match: MatchSession = {
      states,
      lastSequences: [0, 0],
      startedAt: room.startedAt,
      pausedAt: null,
      pausedDurationMs: 0,
      disconnectedAt: null,
      disconnectedSeat: null,
      result: null,
    };
    this.matches.set(room.code, match);
    this.finishIfTerminal(room.code, [[], []]);
  }

  private matchSnapshot(
    room: PlayingRoom,
    match: MatchSession,
  ): RoomMatchSnapshot {
    return {
      room: { ...room, players: [room.players[0], room.players[1]] },
      states: [
        publicGameState(match.states[0]),
        publicGameState(match.states[1]),
      ],
      elapsedMs:
        match.result?.durationMs ?? this.logicalTime(match, this.readNow()),
      paused: match.pausedAt !== null,
      result: match.result === null ? null : copyMatchResult(match.result),
    };
  }

  private logicalTime(match: MatchSession, now: number): number {
    const currentPauseDuration =
      match.pausedAt === null ? 0 : now - match.pausedAt;
    if (currentPauseDuration < 0) {
      throw new RangeError('Room clock cannot move backwards');
    }

    const logicalTime =
      now - match.startedAt - match.pausedDurationMs - currentPauseDuration;
    if (!Number.isSafeInteger(logicalTime) || logicalTime < 0) {
      throw new RangeError('Match logical time must be a non-negative integer');
    }

    return logicalTime;
  }

  private resumeMatch(match: MatchSession, now: number): boolean {
    if (match.pausedAt === null) {
      return false;
    }
    if (now < match.pausedAt) {
      throw new RangeError('Room clock cannot move backwards during a pause');
    }
    const pausedDurationMs = match.pausedDurationMs + now - match.pausedAt;
    if (!Number.isSafeInteger(pausedDurationMs)) {
      throw new RangeError('Paused duration must be a safe integer');
    }
    match.pausedDurationMs = pausedDurationMs;
    match.pausedAt = null;
    match.disconnectedAt = null;
    match.disconnectedSeat = null;
    return true;
  }

  private seatForToken(roomId: string, seatToken: unknown): RoomSeat | null {
    if (typeof seatToken !== 'string' || seatToken.length === 0) {
      return null;
    }
    const seatTokens = this.seatTokenHashes.get(roomId);
    if (seatTokens === undefined) {
      return null;
    }

    const tokenHash = hashSeatToken(seatToken);
    let matchedSeat: RoomSeat | null = null;
    for (const seat of [0, 1] as const) {
      const expectedHash = seatTokens[seat];
      if (expectedHash !== null && timingSafeEqual(expectedHash, tokenHash)) {
        matchedSeat = seat;
      }
    }
    return matchedSeat;
  }

  private expireDisconnection(
    roomId: string,
    match: MatchSession,
    now: number,
  ): void {
    if (
      match.disconnectedAt === null ||
      match.disconnectedSeat === null ||
      match.result !== null
    ) {
      return;
    }
    if (now < match.disconnectedAt) {
      throw new RangeError('Room clock cannot move backwards after disconnect');
    }
    if (now - match.disconnectedAt < RECONNECT_WINDOW_MS) {
      return;
    }

    const events: readonly [
      readonly RoomTerminalEvent[],
      readonly RoomTerminalEvent[],
    ] =
      match.disconnectedSeat === 0
        ? [[{ type: 'disconnected' }], []]
        : [[], [{ type: 'disconnected' }]];
    this.finish(roomId, events);
  }

  private terminalOutcome(
    state: GameState,
    events: readonly RoomTerminalEvent[],
  ): TerminalOutcome {
    if (events.some((event) => event.type === 'disconnected')) {
      return 'Disconnected';
    }
    if (state.status === 'blocked') {
      return 'BoardBlocked';
    }
    if (state.stats.virusesCleared >= INITIAL_VIRUS_COUNT) {
      return 'AllVirusesCleared';
    }
    return 'Active';
  }

  private finishIfTerminal(
    roomId: string,
    events: readonly [
      readonly RoomTerminalEvent[],
      readonly RoomTerminalEvent[],
    ],
  ): void {
    const match = this.matches.get(roomId);
    if (match === undefined) {
      return;
    }
    const outcomes: readonly [TerminalOutcome, TerminalOutcome] = [
      this.terminalOutcome(match.states[0], events[0]),
      this.terminalOutcome(match.states[1], events[1]),
    ];
    if (outcomes.some((outcome) => outcome !== 'Active')) {
      this.finish(roomId, events);
    }
  }

  private readNow(): number {
    const now = this.now();
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new RangeError('Room clock must be a non-negative safe integer');
    }
    return now;
  }

  private expireWaitingRooms(now: number): void {
    for (const [code, room] of this.rooms) {
      if (room.status === 'waiting' && now >= room.expiresAt) {
        this.rooms.delete(code);
        this.seatTokenHashes.delete(code);
        const retainUntil = room.expiresAt + EXPIRED_CODE_RETENTION_MS;
        if (Number.isSafeInteger(retainUntil) && now < retainUntil) {
          this.expiredCodes.set(code, retainUntil);
        }
      }
    }

    for (const [code, retainUntil] of this.expiredCodes) {
      if (now >= retainUntil) {
        this.expiredCodes.delete(code);
      }
    }
  }

  private allocateCode(): string {
    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const code = normalizeRoomCode(this.generateCode());
      if (code === null) {
        throw new Error('Room code generator returned an invalid code');
      }
      if (!this.rooms.has(code) && !this.expiredCodes.has(code)) {
        return code;
      }
    }

    throw new Error('Unable to generate a unique room code');
  }

  private snapshot(room: InternalRoom): RoomSnapshot {
    switch (room.status) {
      case 'waiting': {
        const players: readonly [string] = [room.players[0]];
        return { ...room, players };
      }
      case 'countdown': {
        const players: readonly [string, string] = [
          room.players[0],
          room.players[1],
        ];
        return { ...room, players };
      }
      case 'playing': {
        const players: readonly [string, string] = [
          room.players[0],
          room.players[1],
        ];
        return { ...room, players };
      }
      default: {
        const exhaustive: never = room;
        return exhaustive;
      }
    }
  }
}
