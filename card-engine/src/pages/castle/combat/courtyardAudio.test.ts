import { describe, expect, it } from 'vitest';
import type { HitSeverity } from './feel';
import { contactVoice } from './courtyardAudio';

/**
 * Almost nothing in `courtyardAudio.ts` can be tested without a sound device,
 * and pretending otherwise by mocking the Web Audio API would only assert that
 * the mock was called — it would not catch a single thing that could actually
 * be wrong with a sound.
 *
 * What CAN be tested is the one thing most worth pinning: that a heavier hit is
 * audibly bigger in every dimension at once. A synth that got quieter or
 * thinner as the hit got harder would be obvious the moment anyone played it,
 * and completely invisible in a code review.
 */

const TIERS: HitSeverity[] = ['light', 'normal', 'heavy'];

describe('contact voice', () => {
  it('gets louder as the hit gets harder', () => {
    const peaks = TIERS.map((s) => contactVoice(s).peak);
    expect(peaks[0]).toBeLessThan(peaks[1]);
    expect(peaks[1]).toBeLessThan(peaks[2]);
  });

  it('gets LOWER as the hit gets harder', () => {
    // Weight is pitch falling, not just volume rising. A heavy hit at the same
    // pitch as a tap is the same hit with the volume up, which is what a
    // synthesized impact sounds like when nobody thought about it.
    const thumps = TIERS.map((s) => contactVoice(s).thumpHz);
    const snaps = TIERS.map((s) => contactVoice(s).snapHz);
    expect(thumps[0]).toBeGreaterThan(thumps[1]);
    expect(thumps[1]).toBeGreaterThan(thumps[2]);
    expect(snaps[0]).toBeGreaterThan(snaps[1]);
    expect(snaps[1]).toBeGreaterThan(snaps[2]);
  });

  it('lasts longer as the hit gets harder', () => {
    const durs = TIERS.map((s) => contactVoice(s).durationMs);
    expect(durs[0]).toBeLessThan(durs[1]);
    expect(durs[1]).toBeLessThan(durs[2]);
  });

  it('keeps the snap above the thump in every tier', () => {
    // Two layers doing two jobs: the snap says something was struck, the thump
    // says how hard. If they crossed, the hit would lose its transient and
    // read as a rumble with no point of contact.
    for (const s of TIERS) {
      const v = contactVoice(s);
      expect(v.snapHz, s).toBeGreaterThan(v.thumpHz * 4);
    }
  });

  it('never asks for a peak that would clip against the master gain', () => {
    // Master sits at 0.75 and contact can land on the same frame as the defeat
    // cue. Headroom is not a nicety here — a clipped hit sounds broken rather
    // than loud, which is the opposite of what every tier above is for.
    for (const s of TIERS) {
      expect(contactVoice(s).peak, s).toBeLessThanOrEqual(0.5);
    }
  });
});
