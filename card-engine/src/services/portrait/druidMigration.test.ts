import { describe, it, expect } from 'vitest';
import { resolveLockedSelections, buildCharacterSheet } from './characterSheetFactory';
import { assemblePortraitPrompt } from '../portraitAssembler';
import { emptyHiddenFate } from '../hiddenFate';
import { getPosePool } from '../../data/archetypePoses';
import type { HiddenFate } from '../../types/bible';

function druidFate(extra: Partial<HiddenFate> = {}): HiddenFate {
  return { ...emptyHiddenFate(), age: '50s', sex: 'female', bodyType: 'lean', skinTone: 'warm brown', ...extra };
}

const seq = (v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

describe('Druid pose pools — disjoint across ranks (a tier-up never reuses a pose)', () => {
  it('Foundation / Forged / Ascendant pools share no pose', () => {
    const f = new Set(getPosePool('Druid', 'Foundation'));
    const g = new Set(getPosePool('Druid', 'Forged'));
    const a = new Set(getPosePool('Druid', 'Ascendant'));
    expect(f.size).toBeGreaterThan(0);
    for (const p of g) expect(f.has(p)).toBe(false);
    for (const p of a) expect(f.has(p) || g.has(p)).toBe(false);
  });
});

describe('Druid factory resolution', () => {
  it('rolls a living-plant weapon and environment, and NO companion (Druids have none)', () => {
    const out = resolveLockedSelections(druidFate(), 'Druid', seq([0, 0, 0.1]));
    expect(out.weaponId).toBeTruthy();
    expect(out.environmentId).toBeTruthy();
    expect(out.companionPresent).toBe(false); // empty companion pool → never present
    expect(out.companionId).toBeUndefined();
  });

  it('weapon descriptor avoids the bare word "wood" and evolves per rank', () => {
    const fate = resolveLockedSelections(druidFate(), 'Druid', seq([0, 0, 0.9])); // living_staff (index 0)
    const foundation = buildCharacterSheet(fate, {
      archetype: 'Druid', rank: 'Foundation', resolvedElement: 'Nature',
      diversityAxis: '', isEvolution: false, abilityRefs: [], storyMotifs: [],
    }, seq([0]));
    const ascendant = buildCharacterSheet(fate, {
      archetype: 'Druid', rank: 'Ascendant', resolvedElement: 'Nature',
      diversityAxis: '', isEvolution: true, abilityRefs: [], storyMotifs: [],
    }, seq([0]));
    expect(foundation.weapon).toContain('Living Staff');
    expect((foundation.weapon ?? '').toLowerCase()).not.toContain('wood');
    expect(ascendant.weapon).toContain('Elder-Grove'); // rank-evolved, same weapon
    expect(foundation.companion).toBe('');
  });
});

describe('Druid assembler — photoreal + negative subtraction', () => {
  const sheet = () => buildCharacterSheet(
    resolveLockedSelections(druidFate({ environmentId: 'heart_grove_cathedral' }), 'Druid', seq([0, 0, 0.9])),
    { archetype: 'Druid', rank: 'Foundation', resolvedElement: 'Nature', diversityAxis: '', isEvolution: false, abilityRefs: [], storyMotifs: [] },
    seq([0]),
  );

  it('uses the PHOTOREALISTIC style lead, not the painterly one', () => {
    const { portraitPrompt } = assemblePortraitPrompt(sheet());
    expect(portraitPrompt).toContain('PHOTOREALISTIC');
    expect(portraitPrompt).not.toContain('painterly fantasy action card art');
  });

  it('drops the growth-suppressor negatives for Druid but keeps modesty', () => {
    const { negativePrompt } = assemblePortraitPrompt(sheet());
    expect(negativePrompt).not.toMatch(/\bbad anatomy\b/);
    expect(negativePrompt).not.toMatch(/\bdeformed\b/);
    expect(negativePrompt).not.toMatch(/\bdisfigured\b/);
    expect(negativePrompt).not.toMatch(/\bbad proportions\b/);
    // modesty survives
    expect(negativePrompt.toLowerCase()).toContain('nudity');
    // count-guards survive (only the 4 growth-suppressors were removed)
    expect(negativePrompt).toContain('extra limbs');
  });
});
