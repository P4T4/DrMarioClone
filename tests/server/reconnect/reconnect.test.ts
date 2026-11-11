import { describe, expect, it } from 'vitest';
import { RoomService } from '../../../src/server/rooms/room-service';

function createHarness() {
  let now = 1_000;
  let nextToken = 0;
  const service = new RoomService({
    now: () => now,
    generateCode: () => 'ABCDEFGH',
    generateSeed: () => 'reconnect-test-seed',
    generateSeatToken: () => `seat-secret-${nextToken++}`,
  });
  const created = service.create('Owner');

  if (typeof created === 'string') {
    throw new Error(`Expected room creation, got ${created}`);
  }
  const joined = service.join(created.code, 'Guest');

  if (typeof joined === 'string') {
    throw new Error(`Expected room join, got ${joined}`);
  }

  return {
    service,
    roomId: created.code,
    ownerToken: created.seatToken,
    guestToken: joined.seatToken,
    setNow(value: number) {
      now = value;
    },
    start() {
      now = joined.startsAt;
      return service.getMatchState(created.code);
    },
  };
}

describe('RoomService reconnection', () => {
  it('pauses both seats, preserves state and resumes the same match with the seat token', () => {
    const harness = createHarness();
    const initial = harness.start();
    expect(harness.ownerToken).toBeTypeOf('string');
    expect(harness.guestToken).toBeTypeOf('string');
    expect(initial?.room).not.toHaveProperty('seatToken');
    expect('seatToken' in (harness.service.getRoom(harness.roomId) ?? {})).toBe(
      false,
    );

    harness.setNow(6_000);
    const accepted = harness.service.submitInput(
      harness.roomId,
      0,
      1,
      'MoveLeft',
    );
    expect(accepted.kind).toBe('accepted');
    if (accepted.kind !== 'accepted') {
      throw new Error(`Expected accepted input, got ${accepted.reason}`);
    }
    expect(accepted.match.states).not.toEqual(initial?.states);
    expect(harness.service.disconnect(harness.roomId, 1)).toBe(true);
    harness.setNow(11_000);

    expect(harness.service.getMatchState(harness.roomId)).toMatchObject({
      paused: true,
      states: accepted.match.states,
      elapsedMs: 2_000,
    });
    expect(
      harness.service.submitInput(harness.roomId, 0, 2, 'MoveRight'),
    ).toMatchObject({ kind: 'rejected', reason: 'paused' });
    expect(harness.service.advance(harness.roomId)).toBeNull();

    const reconnected = harness.service.reconnect(
      harness.roomId,
      harness.guestToken,
    );
    expect(reconnected).toMatchObject({
      kind: 'reconnected',
      seat: 1,
      match: { paused: false, states: accepted.match.states },
    });
    if (typeof reconnected !== 'string') {
      expect(reconnected.match.room).not.toHaveProperty('seatToken');
    }

    harness.setNow(12_000);
    const result = harness.service.finish(harness.roomId, [
      [{ type: 'disconnected' }],
      [],
    ]);
    expect(result.durationMs).toBe(3_000);
  });

  it('rejects another seat token and expires through the server tick', () => {
    const harness = createHarness();
    harness.start();
    harness.setNow(6_000);
    expect(harness.service.disconnect(harness.roomId, 0)).toBe(true);

    expect(harness.service.reconnect(harness.roomId, harness.guestToken)).toBe(
      'InvalidToken',
    );
    expect(harness.service.reconnect(harness.roomId, 'forged-token')).toBe(
      'InvalidToken',
    );
    expect(harness.service.getMatchState(harness.roomId)?.paused).toBe(true);
    harness.setNow(36_000);
    expect(harness.service.advance(harness.roomId)).toBeNull();
    expect(harness.service.getMatchState(harness.roomId)?.result).toMatchObject(
      { winnerIndex: 1, reason: 'Disconnected', durationMs: 2_000 },
    );
    expect(harness.service.reconnect(harness.roomId, harness.ownerToken)).toBe(
      'Expired',
    );
  });

  it('expires a reconnect request at exactly 30 seconds', () => {
    const harness = createHarness();
    harness.start();
    harness.setNow(6_000);
    expect(harness.service.disconnect(harness.roomId, 0)).toBe(true);

    harness.setNow(36_000);
    expect(harness.service.reconnect(harness.roomId, harness.ownerToken)).toBe(
      'Expired',
    );
    expect(harness.service.getMatchState(harness.roomId)?.result).toMatchObject(
      { winnerIndex: 1, reason: 'Disconnected', durationMs: 2_000 },
    );
  });

  it('allows reconnection until just before the 30-second deadline', () => {
    const harness = createHarness();
    harness.start();
    harness.setNow(6_000);
    expect(harness.service.disconnect(harness.roomId, 0)).toBe(true);

    harness.setNow(35_999);
    expect(
      harness.service.reconnect(harness.roomId, harness.ownerToken),
    ).toMatchObject({
      kind: 'reconnected',
      seat: 0,
      match: { paused: false, result: null },
    });
  });

  it('rejects invalid seats and missing tokens without pausing the room', () => {
    const harness = createHarness();
    harness.start();

    expect(harness.service.disconnect(harness.roomId, 2)).toBe(false);
    expect(harness.service.reconnect(harness.roomId, '')).toBe('InvalidToken');
    expect(harness.service.reconnect(harness.roomId, 123)).toBe('InvalidToken');
    expect(harness.service.getMatchState(harness.roomId)?.paused).toBe(false);
  });
});
