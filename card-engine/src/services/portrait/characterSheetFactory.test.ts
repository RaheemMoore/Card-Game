import { describe, it, expect } from 'vitest';
import { resolveLockedSelections, buildCharacterSheet } from './characterSheetFactory';
import { preserveIdentityAcrossRanks, emptyHiddenFate } from '../hiddenFate';
import type { HiddenFate } from '../../types/bible';

/** A deterministic rng that replays a fixed sequence, then holds the last. */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function foundationFate(): HiddenFate {
  return { ...emptyHiddenFate(), age: '40s', sex: 'male', bodyType: 'broad', skinTone: 'olive' };
}

describe('resolveLockedSelections — rolls + locks at Foundation', () => {
  it('rolls a weapon, environment, and companion for Necromancer (has all pools)', () => {
    // rng order: weapon pick, environment pick, companionAppears (<0.5 = present), companion pick
    const out = resolveLockedSelections(foundationFate(), 'Necromancer', seq([0, 0, 0.1, 0]));
    expect(out.weaponId).toBeTruthy();
    expect(out.environmentId).toBeTruthy();
    expect(out.companionPresent).toBe(true);
    expect(out.companionId).toBeTruthy();
  });

  it('locks companionPresent=false when the 50/50 roll misses, and sets no id', () => {
    const out = resolveLockedSelections(foundationFate(), 'Necromancer', seq([0, 0, 0.9]));
    expect(out.companionPresent).toBe(false);
    expect(out.companionId).toBeUndefined();
  });

  it('does not mutate the input hiddenFate', () => {
    const input = foundationFate();
    resolveLockedSelections(input, 'Necromancer', seq([0, 0, 0.1, 0]));
    expect(input.weaponId).toBeUndefined();
  });

  it('never re-rolls an already-locked id (drift-proof)', () => {
    const locked: HiddenFate = { ...foundationFate(), weaponId: 'grave_scythe', environmentId: 'cemetery_district', companionPresent: false };
    const out = resolveLockedSelections(locked, 'Necromancer', seq([0.99, 0.99, 0.99]));
    expect(out.weaponId).toBe('grave_scythe');
    expect(out.environmentId).toBe('cemetery_district');
    expect(out.companionPresent).toBe(false);
  });
});

describe('locked selections survive a tier-up via preserveIdentityAcrossRanks', () => {
  it('carries weaponId/environmentId/companionPresent(false) verbatim into the next rank', () => {
    const foundation = resolveLockedSelections(foundationFate(), 'Necromancer', seq([0, 0, 0.9]));
    // Claude returns a fresh fate at Forged with none of the ids set.
    const incoming = { ...emptyHiddenFate(), age: '40s', sex: 'male', bodyType: 'broad', skinTone: 'olive' };
    const merged = preserveIdentityAcrossRanks(foundation, incoming);
    expect(merged.weaponId).toBe(foundation.weaponId);
    expect(merged.environmentId).toBe(foundation.environmentId);
    expect(merged.companionPresent).toBe(false);
    // And resolveLockedSelections on the merged fate is a no-op (already locked).
    const reresolved = resolveLockedSelections(merged, 'Necromancer', seq([0.99]));
    expect(reresolved.weaponId).toBe(foundation.weaponId);
    expect(reresolved.companionPresent).toBe(false);
  });
});

describe('buildCharacterSheet — resolves descriptors from locked ids', () => {
  it('produces a rank-scaled pose, weapon descriptor, and (Forged+) companion for Necromancer', () => {
    const fate = resolveLockedSelections(foundationFate(), 'Necromancer', seq([0, 0, 0.1, 0]));
    const forged = buildCharacterSheet(fate, {
      archetype: 'Necromancer', rank: 'Forged', resolvedElement: 'Shadow',
      diversityAxis: '', isEvolution: true, abilityRefs: [], storyMotifs: [],
    }, seq([0]));
    expect(forged.pose).toBeTruthy();
    expect(forged.weapon).toContain('Soul-Bound'); // Forged descriptor
    expect(forged.companion).toBeTruthy(); // a few gather at Forged
  });

  it('shows NO companion at Foundation even when one is locked (restraint)', () => {
    const fate = resolveLockedSelections(foundationFate(), 'Necromancer', seq([0, 0, 0.1, 0]));
    const foundation = buildCharacterSheet(fate, {
      archetype: 'Necromancer', rank: 'Foundation', resolvedElement: 'Shadow',
      diversityAxis: '', isEvolution: false, abilityRefs: [], storyMotifs: [],
    }, seq([0]));
    expect(foundation.companion).toBe('');
  });

  it('honors a poseOverride instead of rolling', () => {
    const fate = resolveLockedSelections(foundationFate(), 'Necromancer', seq([0, 0, 0.9]));
    const sheet = buildCharacterSheet(fate, {
      archetype: 'Necromancer', rank: 'Foundation', resolvedElement: 'Shadow',
      diversityAxis: '', isEvolution: false, abilityRefs: [], storyMotifs: [],
      poseOverride: 'a specific forced pose',
    });
    expect(sheet.pose).toBe('a specific forced pose');
  });
});
