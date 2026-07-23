import { describe, it, expect } from 'vitest';
import { getWeaponPool, getWeaponDescriptor } from '../../data/archetypeWeapons';
import { getEnvironmentPool, getEnvironmentDescriptor } from '../../data/archetypeEnvironments';
import { getPosePool } from '../../data/archetypePoses';
import { hookPosePrefix, hookMandatorySegment, hookNarrativeAnchor } from './archetypeHooks';
import { assemblePortraitPrompt } from '../portraitAssembler';
import { resolveLockedSelections } from './characterSheetFactory';
import { ARCHETYPE_NAMES, type ArchetypeName, type Rank } from '../../types/card';
import type { CharacterSheet } from '../../types/characterSheet';

const RANKS: Rank[] = ['Foundation', 'Forged', 'Ascendant'];

describe('every archetype is populated for the unified Image Engine', () => {
  for (const archetype of ARCHETYPE_NAMES) {
    it(`${archetype} has weapon / environment / pose pools`, () => {
      const weapons = getWeaponPool(archetype);
      const envs = getEnvironmentPool(archetype);
      expect(weapons.length).toBeGreaterThanOrEqual(5);
      expect(envs.length).toBeGreaterThanOrEqual(5);

      // Weapons + environments evolve (distinct per rank), keeping identity.
      for (const w of weapons) {
        const d = RANKS.map((r) => getWeaponDescriptor(archetype, w.id, r));
        expect(new Set(d).size).toBe(3);
        for (const s of d) expect(s).toContain(w.name);
      }
      for (const e of envs) {
        expect(new Set(RANKS.map((r) => getEnvironmentDescriptor(archetype, e.id, r))).size).toBe(3);
      }

      // Pose pools non-empty and disjoint across ranks (no tier reuses a pose).
      const [f, fg, a] = RANKS.map((r) => new Set(getPosePool(archetype, r)));
      expect(f.size).toBeGreaterThan(0);
      for (const p of fg) expect(f.has(p)).toBe(false);
      for (const p of a) expect(f.has(p) || fg.has(p)).toBe(false);
    });
  }
});

// --- Special-case hooks -----------------------------------------------------

function sheet(archetype: ArchetypeName, over: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    hiddenFate: {} as CharacterSheet['hiddenFate'],
    storyMotifs: [], archetype, rank: 'Foundation', resolvedElement: 'Fire',
    pose: '', diversityAxis: '', isEvolution: false, abilityRefs: [], ...over,
  };
}

describe('archetype hooks', () => {
  it('Mech Pilot always mandates a mech in frame, at every rank', () => {
    for (const rank of RANKS) {
      expect(hookMandatorySegment(sheet('Mech Pilot', { rank }))).toContain('MECH REQUIRED IN FRAME');
    }
  });

  it('Lycanthrope anatomy lock fires only at Ascendant', () => {
    expect(hookMandatorySegment(sheet('Lycanthrope', { rank: 'Foundation' }))).toBe('');
    const asc = hookMandatorySegment(sheet('Lycanthrope', { rank: 'Ascendant' }));
    expect(asc).toContain('EXACTLY FOUR legs');
    expect(asc).toMatch(/NEVER horns/);
  });

  it('Seraph anchor reflects the resolved narrative-axis path', () => {
    expect(hookNarrativeAnchor(sheet('Seraph', { rank: 'Foundation' }))).toContain('austerity');
    expect(hookNarrativeAnchor(sheet('Seraph', { rank: 'Ascendant', narrativeAxisPath: 'Fallen' }))).toContain('FALLEN');
    expect(hookNarrativeAnchor(sheet('Seraph', { rank: 'Ascendant', narrativeAxisPath: 'Good' }))).toContain('GOOD');
    // Balanced = the TWILIGHT split path (anchor rewritten 2026-07-23 to force
    // a vivid half-light/half-dark division rather than naming the axis).
    expect(hookNarrativeAnchor(sheet('Seraph', { rank: 'Forged', narrativeAxisPath: 'Balanced' }))).toContain('TWILIGHT');
  });

  it('Android keeps identity anchors across the form escalation', () => {
    expect(hookMandatorySegment(sheet('Android', { rank: 'Foundation' }))).toContain('IDENTITY ANCHORS');
    expect(hookMandatorySegment(sheet('Android', { rank: 'Ascendant' }))).toContain('echoed');
  });

  // Bare chest RETIRED game-wide (Raheem 2026-07-23): no shirtless, ever — even
  // a legacy bareChestRoll:true male at Ascendant stays fully clothed.
  it('Ascendant-male stays fully clothed even with a legacy bareChestRoll', () => {
    const bare = { sex: 'male', bareChestRoll: true } as CharacterSheet['hiddenFate'];
    const clad = { sex: 'male', bareChestRoll: false } as CharacterSheet['hiddenFate'];
    const rolled = assemblePortraitPrompt(sheet('Barbarian', { rank: 'Ascendant', isEvolution: true, hiddenFate: bare })).portraitPrompt;
    const notRolled = assemblePortraitPrompt(sheet('Barbarian', { rank: 'Ascendant', isEvolution: true, hiddenFate: clad })).portraitPrompt;
    expect(rolled).not.toContain('bare muscular chest');
    expect(rolled).toContain('FULLY CLOTHED');
    expect(notRolled).toContain('FULLY CLOTHED');
  });

  it('the bare-chest roll is forced false (retired game-wide)', () => {
    for (let i = 0; i < 200; i++) {
      const fate = resolveLockedSelections({} as CharacterSheet['hiddenFate'], 'Barbarian');
      expect(fate.bareChestRoll).toBe(false);
    }
  });

  it('Vampire feral gate never fires on tier-up or above Foundation', () => {
    // 50 draws at Forged/tier-up must all be non-feral (generic pose).
    for (let i = 0; i < 50; i++) {
      expect(hookPosePrefix(sheet('Vampire', { rank: 'Forged' }))).toBeNull();
      expect(hookPosePrefix(sheet('Vampire', { rank: 'Foundation', isEvolution: true }))).toBeNull();
    }
  });
});
