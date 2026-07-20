import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import { createQueueState, drainNext, skipAll, syncEvents } from './queue';

const evt = (kind: BattleEvent['kind'], round = 1): BattleEvent => {
  // Small factory covering the kinds this test needs.
  switch (kind) {
    case 'round_started':
      return { kind: 'round_started', round };
    case 'damage_dealt':
      return {
        kind: 'damage_dealt',
        sourceActorId: 'boss',
        targetActorId: 'hero_1',
        amount: 10,
        damageType: 'fire',
        blockedByShield: 0,
      };
    case 'phase_transition':
      return { kind: 'phase_transition', fromPhaseId: 'a', toPhaseId: 'b' };
    default:
      return { kind: 'round_started', round };
  }
};

describe('presentation queue', () => {
  it('createQueueState starts empty', () => {
    const s = createQueueState();
    expect(s.journal).toEqual([]);
    expect(s.pending).toEqual([]);
    expect(s.consumedCount).toBe(0);
  });

  it('syncEvents enqueues only the tail (not duplicates)', () => {
    let s = createQueueState();
    const stream: BattleEvent[] = [evt('round_started', 1), evt('damage_dealt')];
    s = syncEvents(s, stream);
    expect(s.pending).toHaveLength(2);
    expect(s.consumedCount).toBe(2);

    // Second call with same array should be a no-op.
    const s2 = syncEvents(s, stream);
    expect(s2).toBe(s);

    // Append one more event; only the new one is enqueued.
    const grown = [...stream, evt('phase_transition')];
    const s3 = syncEvents(s, grown);
    expect(s3.pending).toHaveLength(3);
    expect(s3.consumedCount).toBe(3);
  });

  it('syncEvents resets state when stream shrinks (new battle)', () => {
    let s = createQueueState();
    s = syncEvents(s, [evt('round_started', 1), evt('damage_dealt')]);
    s = drainNext(s).state;
    expect(s.journal).toHaveLength(1);
    expect(s.pending).toHaveLength(1);

    // New shorter stream (fresh battle).
    const reset = syncEvents(s, [evt('round_started', 1)]);
    expect(reset.journal).toEqual([]);
    expect(reset.pending).toEqual([]);
    expect(reset.consumedCount).toBe(0);
  });

  it('drainNext moves head of pending to journal in order', () => {
    let s = createQueueState();
    s = syncEvents(s, [
      evt('round_started', 1),
      evt('damage_dealt'),
      evt('phase_transition'),
    ]);
    const step1 = drainNext(s);
    expect(step1.drained?.event.kind).toBe('round_started');
    expect(step1.state.journal).toHaveLength(1);
    expect(step1.state.pending).toHaveLength(2);

    const step2 = drainNext(step1.state);
    expect(step2.drained?.event.kind).toBe('damage_dealt');

    const step3 = drainNext(step2.state);
    expect(step3.drained?.event.kind).toBe('phase_transition');
    expect(step3.state.pending).toHaveLength(0);
  });

  it('drainNext on empty queue is a no-op', () => {
    const s = createQueueState();
    const step = drainNext(s);
    expect(step.drained).toBeNull();
    expect(step.state).toBe(s);
  });

  it('skipAll flushes every pending beat into journal in order', () => {
    let s = createQueueState();
    s = syncEvents(s, [
      evt('round_started', 1),
      evt('damage_dealt'),
      evt('phase_transition'),
    ]);
    const flushed = skipAll(s);
    expect(flushed.pending).toHaveLength(0);
    expect(flushed.journal).toHaveLength(3);
    expect(flushed.journal.map((b) => b.event.kind)).toEqual([
      'round_started',
      'damage_dealt',
      'phase_transition',
    ]);
  });

  it('skipAll on empty queue is a no-op reference', () => {
    const s = createQueueState();
    const flushed = skipAll(s);
    expect(flushed).toBe(s);
  });

  it('beat ids remain monotonic across multiple sync calls', () => {
    let s = createQueueState();
    s = syncEvents(s, [evt('round_started', 1)]);
    s = syncEvents(s, [evt('round_started', 1), evt('damage_dealt')]);
    s = syncEvents(s, [evt('round_started', 1), evt('damage_dealt'), evt('phase_transition')]);
    expect(s.pending.map((b) => b.id)).toEqual(['beat_0', 'beat_1', 'beat_2']);
  });
});
