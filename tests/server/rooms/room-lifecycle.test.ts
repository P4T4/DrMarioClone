import { describe, expect, it, vi } from 'vitest';
import {
  RoomService,
  type CreateRoomResult,
  type JoinRoomResult,
  type RoomServiceOptions,
  type WaitingRoom,
} from '../../../src/server/rooms/room-service';

function expectWaitingRoom(result: CreateRoomResult): WaitingRoom {
  if (typeof result === 'string') {
    throw new Error(`Expected a waiting room, got ${result}`);
  }
  return result;
}

function expectJoinedRoom(result: JoinRoomResult) {
  if (typeof result === 'string') {
    throw new Error(`Expected a joined room, got ${result}`);
  }
  return result;
}

function createHarness(
  options: Pick<RoomServiceOptions, 'generateCode' | 'hasCapacity'> = {},
) {
  let now = 1_000;
  let nextCode = 0;
  const service = new RoomService({
    now: () => now,
    generateCode: () =>
      options.generateCode?.() ?? String(nextCode++).padStart(8, '0'),
    hasCapacity: options.hasCapacity,
  });

  return {
    service,
    setNow(value: number) {
      now = value;
    },
  };
}

describe('RoomService lifecycle', () => {
  it('trims aliases and validates Unicode code points and control characters', () => {
    const { service } = createHarness();

    expect(service.create('')).toBe('InvalidAlias');
    expect(service.create('   ')).toBe('InvalidAlias');
    expect(service.create('x'.repeat(21))).toBe('InvalidAlias');
    expect(service.create('player\u0000one')).toBe('InvalidAlias');
    expect(service.create('\tplayer\n')).toBe('InvalidAlias');

    const room = expectWaitingRoom(service.create(`  ${'😀'.repeat(20)}  `));
    expect(room.players).toEqual(['😀'.repeat(20)]);
    expect(service.join(room.code, '\tGuest\n')).toBe('InvalidAlias');
  });

  it('rejects invalid aliases when joining before modifying the room', () => {
    const { service } = createHarness();
    const room = expectWaitingRoom(service.create('Owner'));

    expect(service.join(room.code, 'y'.repeat(21))).toBe('InvalidAlias');
    expect(service.getRoom(room.code)).toMatchObject({
      status: 'waiting',
      players: ['Owner'],
    });
  });

  it('normalizes codes and refuses invalid or unknown codes', () => {
    const { service } = createHarness({
      generateCode: () => 'ABCDEFGH',
    });
    const room = expectWaitingRoom(service.create('Owner'));

    expect(service.join('  abcdefgh  ', '  Guest  ')).toMatchObject({
      code: room.code,
      status: 'countdown',
      players: ['Owner', 'Guest'],
    });
    expect(service.join('ABCDEFG', 'Third')).toBe('InvalidCode');
    expect(service.join('ABCDEFGH1', 'Third')).toBe('InvalidCode');
    expect(service.join('I2345678', 'Third')).toBe('InvalidCode');
    expect(service.join('ABCDEFßH', 'Third')).toBe('InvalidCode');
    expect(service.join('ZZZZZZZZ', 'Third')).toBe('InvalidCode');
  });

  it('expires waiting rooms at five minutes and reports the expired code', () => {
    const { service, setNow } = createHarness();
    const room = expectWaitingRoom(service.create('Owner'));

    expect(room.expiresAt).toBe(301_000);
    setNow(room.expiresAt);

    expect(service.join(room.code, 'Guest')).toBe('Expired');
    expect(service.join(room.code, 'Guest')).toBe('Expired');
    expect(service.getRoom(room.code)).toBeNull();
  });

  it('uses the configured waiting timeout and still identifies expired codes', () => {
    let now = 1_000;
    const service = new RoomService({
      now: () => now,
      generateCode: () => 'ABCDEFGH',
      waitingRoomTtlMs: 1_000,
    });
    const room = expectWaitingRoom(service.create('Owner'));

    expect(room.expiresAt).toBe(2_000);
    now = room.expiresAt;
    expect(service.join(room.code, 'Guest')).toBe('Expired');
  });

  it('rejects invalid waiting timeout configuration', () => {
    expect(() => new RoomService({ waitingRoomTtlMs: 0 })).toThrow(RangeError);
  });

  it('fills only two seats and starts one shared three-second countdown', () => {
    const { service, setNow } = createHarness();
    const room = expectWaitingRoom(service.create('Owner'));
    const joined = expectJoinedRoom(service.join(room.code, 'Guest'));
    const { seatToken, ...publicRoom } = joined;

    expect(seatToken).toBeTypeOf('string');
    expect(joined.startsAt).toBe(4_000);
    expect(service.getRoom(room.code)).toEqual(publicRoom);
    expect(service.getRoom(room.code)).not.toHaveProperty('seatToken');
    expect(service.join(room.code, 'Third')).toBe('Full');

    setNow(joined.startsAt - 1);
    expect(service.getRoom(room.code)?.status).toBe('countdown');

    setNow(joined.startsAt);
    expect(service.getRoom(room.code)).toEqual({
      code: room.code,
      status: 'playing',
      players: ['Owner', 'Guest'],
      startedAt: joined.startsAt,
    });
  });

  it('keeps a room alive if the second player joins before expiration', () => {
    const { service, setNow } = createHarness();
    const room = expectWaitingRoom(service.create('Owner'));
    setNow(room.expiresAt - 1);
    const joined = expectJoinedRoom(service.join(room.code, 'Guest'));
    const { seatToken, ...publicRoom } = joined;

    expect(seatToken).toBeTypeOf('string');
    setNow(room.expiresAt);
    expect(service.getRoom(room.code)).toEqual(publicRoom);
  });

  it('returns capacity unavailable without creating a room', () => {
    const generateCode = vi.fn(() => 'ABCDEFGH');
    const { service } = createHarness({
      generateCode,
      hasCapacity: () => false,
    });

    expect(service.create('Owner')).toBe('CapacityUnavailable');
    expect(generateCode).not.toHaveBeenCalled();
  });

  it('generates eight-character Crockford codes by default', () => {
    const service = new RoomService({ now: () => 1_000 });
    const room = expectWaitingRoom(service.create('Owner'));
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

    expect(room.code).toHaveLength(8);
    expect(
      [...room.code].every((character) => alphabet.includes(character)),
    ).toBe(true);
  });
});
