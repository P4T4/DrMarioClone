import type { NextFunction, Request, Response } from 'express';
import { Room, Server, type Client } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ChatService } from './chat/chat-service';
import {
  RoomService,
  type CreatedRoom,
  type ConnectionView,
  type RoomMatchSnapshot,
  type RoomTerminalEvent,
} from './rooms/room-service';
import type {
  PlayerInput,
  RoomAuthMessage,
  RoomViewMessage,
} from '../shared/room-protocol';
import type { RoomSeat, RoomSnapshot } from './rooms/room-service';

interface RoomAuth extends RoomAuthMessage {
  readonly reconnecting: boolean;
}

const PLAYER_INPUTS: ReadonlySet<string> = new Set([
  'MoveLeft',
  'MoveRight',
  'SoftDrop',
  'HardDrop',
  'RotateClockwise',
  'RotateCounterclockwise',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRoomSeat(value: unknown): value is RoomSeat {
  return value === 0 || value === 1;
}

function isPlayerInput(value: unknown): value is PlayerInput {
  return typeof value === 'string' && PLAYER_INPUTS.has(value);
}

function isRoomAuth(value: unknown): value is RoomAuth {
  return (
    isRecord(value) &&
    isRoomSeat(value.seat) &&
    typeof value.seatToken === 'string' &&
    typeof value.alias === 'string' &&
    typeof value.reconnecting === 'boolean'
  );
}

function failureError(reason: string): Error {
  return new Error(`ROOM_FAILURE:${reason}`);
}

function createRoomService(): RoomService {
  const configuredTtl = process.env.GAME_WAITING_ROOM_TTL_MS;
  return configuredTtl === undefined
    ? new RoomService()
    : new RoomService({ waitingRoomTtlMs: Number(configuredTtl) });
}

class PrivateDuelRoom extends Room {
  private readonly roomService = createRoomService();
  private readonly chatService = new ChatService();
  private readonly seats = new Map<string, RoomSeat>();
  private readonly seatTokens: [string | null, string | null] = [null, null];
  private readonly droppedSessions = new Set<string>();
  private readonly droppedAt: [number | null, number | null] = [null, null];
  private createdRoom: CreatedRoom | null = null;
  private players: [string, string] = ['', ''];
  private creatorAuthenticated = false;
  private previousRoomView = '';
  private previousPauseSecond = -1;
  private resultPublished = false;
  private matchStatePublished = false;
  private expiredRoomPublished = false;
  private chatPausedAt: number | null = null;
  private chatPausedDurationMs = 0;

  async onCreate(options: unknown): Promise<void> {
    const alias = isRecord(options) ? options.alias : undefined;
    if (typeof alias !== 'string') {
      throw failureError('InvalidAlias');
    }

    const created = this.roomService.create(alias);
    if (typeof created === 'string') {
      throw failureError(created);
    }

    this.createdRoom = created;
    this.roomId = created.code;
    this.players = [created.players[0], ''];
    this.seatTokens[0] = created.seatToken;
    this.maxClients = 3;
    await this.setPrivate(true);

    this.onMessage('ready', (client) => this.sendInitialState(client));
    this.onMessage('input', (client, payload: unknown) =>
      this.handleInput(client, payload),
    );
    this.onMessage('chat', (client, payload: unknown) =>
      this.handleChat(client, payload),
    );

    this.setTimestep(() => this.tick(), 100);
  }

  async onAuth(_client: Client, options: unknown): Promise<RoomAuth> {
    if (!isRecord(options)) {
      throw failureError('InvalidAlias');
    }

    if (typeof options.seatToken === 'string') {
      const reconnect = this.roomService.reconnect(
        this.roomId,
        options.seatToken,
      );
      if (typeof reconnect === 'string') {
        throw failureError(reconnect);
      }

      const alias = reconnect.match.room.players[reconnect.seat];
      this.seatTokens[reconnect.seat] = options.seatToken;
      this.players[reconnect.seat] = alias;
      return {
        seat: reconnect.seat,
        seatToken: options.seatToken,
        alias,
        reconnecting: true,
      };
    }

    if (typeof options.alias !== 'string') {
      throw failureError('InvalidAlias');
    }

    if (!this.creatorAuthenticated) {
      if (this.createdRoom === null) {
        throw new Error('Room creator seat is missing');
      }
      this.creatorAuthenticated = true;
      return {
        seat: 0,
        seatToken: this.createdRoom.seatToken,
        alias: this.createdRoom.players[0],
        reconnecting: false,
      };
    }

    const joined = this.roomService.join(this.roomId, options.alias);
    if (typeof joined === 'string') {
      throw failureError(joined);
    }

    this.seatTokens[1] = joined.seatToken;
    this.players = [joined.players[0], joined.players[1]];
    return {
      seat: 1,
      seatToken: joined.seatToken,
      alias: joined.players[1],
      reconnecting: false,
    };
  }

  onJoin(client: Client, _options: unknown, auth: unknown): void {
    if (!isRoomAuth(auth)) {
      throw new Error('Authenticated room seat is missing');
    }

    this.seats.set(client.sessionId, auth.seat);
    this.seatTokens[auth.seat] = auth.seatToken;
    this.players[auth.seat] = auth.alias;
    this.droppedSessions.delete(client.sessionId);
    this.droppedAt[auth.seat] = null;

    if (auth.reconnecting) {
      if (this.chatPausedAt !== null) {
        this.chatPausedDurationMs += Date.now() - this.chatPausedAt;
        this.chatPausedAt = null;
      }
      this.broadcast('connection-state', {
        view: 'Connected' satisfies ConnectionView,
      });
    }

    this.publishRoomView();
  }

  onDrop(client: Client): void {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined || !this.roomService.disconnect(this.roomId, seat)) {
      return;
    }

    this.droppedSessions.add(client.sessionId);
    this.droppedAt[seat] = Date.now();
    this.chatPausedAt = this.droppedAt[seat];
    this.previousPauseSecond = 30;
    this.broadcast('connection-state', {
      view: 'Paused' satisfies ConnectionView,
      secondsRemaining: 30,
    });
  }

  onLeave(client: Client): void {
    const seat = this.seats.get(client.sessionId);
    this.seats.delete(client.sessionId);

    if (seat === undefined || this.droppedSessions.delete(client.sessionId)) {
      return;
    }

    const match = this.roomService.getMatchState(this.roomId);
    if (match === null || match.result !== null) {
      return;
    }

    const terminalEvents: [RoomTerminalEvent[], RoomTerminalEvent[]] = [[], []];
    terminalEvents[seat].push({ type: 'disconnected' });
    this.roomService.finish(this.roomId, terminalEvents);
    this.publishMatchState();
  }

  onDispose(): void {
    this.chatService.finish();
  }

  private sendInitialState(client: Client): void {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined) {
      client.send('room-error', { reason: 'Disconnected' });
      return;
    }

    const seatToken = this.seatTokens[seat];
    if (seatToken === null) {
      throw new Error('Authenticated room seat has no reconnection token');
    }
    client.send('seat', { seat, seatToken, alias: this.players[seat] });

    const room = this.roomService.getRoom(this.roomId);
    if (room === null) {
      client.send('room-error', { reason: 'Expired' });
      return;
    }
    client.send('room-view', this.roomView(room));

    const match = this.roomService.getMatchState(this.roomId);
    if (match !== null) {
      client.send('match-state', match);
      client.send(
        'next-capsule',
        this.roomService.getNextCapsule(this.roomId, seat),
      );
      if (match.paused) {
        client.send('connection-state', {
          view: 'Paused' satisfies ConnectionView,
          secondsRemaining: this.remainingReconnectSeconds(),
        });
      }
      if (match.result !== null) {
        client.send('match-result', match.result);
      }
    }

    client.send('chat-history', this.chatService.getHistory());
  }

  private handleInput(client: Client, payload: unknown): void {
    const seat = this.seats.get(client.sessionId);
    const sequence = isRecord(payload) ? payload.sequence : undefined;
    const input = isRecord(payload) ? payload.input : undefined;
    if (
      seat === undefined ||
      typeof sequence !== 'number' ||
      !Number.isSafeInteger(sequence) ||
      !isPlayerInput(input)
    ) {
      client.send('action-error', { message: 'La entrada no es válida.' });
      return;
    }

    const result = this.roomService.submitInput(
      this.roomId,
      seat,
      sequence,
      input,
    );
    if (result.kind === 'rejected') {
      client.send('action-error', {
        message: 'La entrada no se pudo aplicar. La partida no cambió.',
      });
      return;
    }

    client.send('action-accepted', { sequence });
    this.publishMatch(result.match);
  }

  private handleChat(client: Client, payload: unknown): void {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined || !isRecord(payload)) {
      client.send('chat-error', { reason: 'NotInRoom' });
      return;
    }

    const match = this.roomService.getMatchState(this.roomId);
    if (match === null || match.result !== null || match.paused) {
      client.send('chat-error', { reason: 'NotInRoom' });
      return;
    }

    const message = this.chatService.send(
      seat,
      payload.text,
      Date.now() -
        match.room.startedAt -
        this.chatPausedDurationMs -
        (this.chatPausedAt === null ? 0 : Date.now() - this.chatPausedAt),
    );
    if (
      message === 'InvalidText' ||
      message === 'RateLimited' ||
      message === 'NotInRoom'
    ) {
      client.send('chat-error', { reason: message });
      return;
    }

    this.broadcast('chat-message', message.message);
  }

  private tick(): void {
    const room = this.roomService.getRoom(this.roomId);
    if (room === null) {
      if (!this.expiredRoomPublished) {
        this.expiredRoomPublished = true;
        this.broadcast('room-error', { reason: 'Expired' });
      }
      return;
    }

    this.publishRoomView(room);
    if (room.status !== 'playing') {
      return;
    }

    const advanced = this.roomService.advance(this.roomId);
    if (advanced !== null) {
      this.publishMatch(advanced.match);
      return;
    }

    const match = this.roomService.getMatchState(this.roomId);
    if (match === null) {
      return;
    }

    if (!this.matchStatePublished) {
      this.publishMatch(match);
      return;
    }

    if (match.paused) {
      const secondsRemaining = this.remainingReconnectSeconds();
      if (secondsRemaining !== this.previousPauseSecond) {
        this.previousPauseSecond = secondsRemaining;
        this.broadcast('connection-state', {
          view: 'Paused' satisfies ConnectionView,
          secondsRemaining,
        });
      }
    }

    if (match.result !== null) {
      this.publishMatch(match);
    }
  }

  private publishRoomView(room?: RoomSnapshot): void {
    const currentRoom = room ?? this.roomService.getRoom(this.roomId);
    if (currentRoom === null) {
      return;
    }

    const message = this.roomView(currentRoom);
    const key = `${message.status}:${message.countdownSeconds ?? ''}:${message.players.join('|')}`;
    if (key === this.previousRoomView) {
      return;
    }
    this.previousRoomView = key;
    this.broadcast('room-view', message);
  }

  private roomView(room: RoomSnapshot): RoomViewMessage {
    if (room.status !== 'countdown') {
      return {
        status: room.status,
        code: room.code,
        players: room.players,
      };
    }

    return {
      status: room.status,
      code: room.code,
      players: room.players,
      countdownSeconds: Math.max(
        0,
        Math.ceil((room.startsAt - Date.now()) / 1_000),
      ),
    };
  }

  private publishMatch(match: RoomMatchSnapshot): void {
    this.matchStatePublished = true;
    this.broadcast('match-state', match);
    for (const client of this.clients) {
      const seat = this.seats.get(client.sessionId);
      if (seat !== undefined && !this.droppedSessions.has(client.sessionId)) {
        client.send(
          'next-capsule',
          this.roomService.getNextCapsule(this.roomId, seat),
        );
      }
    }
    if (match.result !== null && !this.resultPublished) {
      this.resultPublished = true;
      this.chatService.finish();
      this.broadcast('match-result', match.result);
    }
  }

  private publishMatchState(): void {
    const match = this.roomService.getMatchState(this.roomId);
    if (match !== null) {
      this.publishMatch(match);
    }
  }

  private remainingReconnectSeconds(): number {
    const disconnectTime = this.droppedAt.find(
      (time): time is number => time !== null,
    );
    if (disconnectTime === undefined) {
      return 0;
    }
    return Math.max(
      0,
      Math.ceil((disconnectTime + 30_000 - Date.now()) / 1_000),
    );
  }
}

const port = Number(process.env.GAME_PORT ?? 2567);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new RangeError('GAME_PORT must be a valid TCP port');
}

const allowedOrigins = new Set(
  (
    process.env.GAME_ALLOWED_ORIGINS ??
    'http://127.0.0.1:4321,http://localhost:4321'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const gameServer = new Server({
  transport: new WebSocketTransport(),
  greet: false,
  express: (app) => {
    app.use((request: Request, response: Response, next: NextFunction) => {
      const origin = request.get('origin');
      if (origin !== undefined && allowedOrigins.has(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type',
        );
        response.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, OPTIONS',
        );
      }

      if (request.method === 'OPTIONS') {
        response.sendStatus(204);
        return;
      }
      next();
    });
    app.get('/health', (_request: Request, response: Response) => {
      response.json({ status: 'ok' });
    });
  },
});

gameServer.define('private-duel', PrivateDuelRoom);
await gameServer.listen(port, process.env.GAME_HOST ?? '0.0.0.0');
console.info(`Private duel server listening on port ${port}`);
