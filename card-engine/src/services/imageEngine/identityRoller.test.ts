import { describe, test, expect } from 'vitest';
import { rollIdentity } from './identityRoller';
import { BODY_ALLOWLIST, AGE_BANDS } from './identityPools';

const N = 3000;
const ids = Array.from({ length: N }, (_, i) => `card_${i}`);

describe('rollIdentity — determinism & precedence', () => {
  test('same cardId reproduces the same person', () => {
    const a = rollIdentity({ archetype: 'Necromancer', cardId: 'card_fixed_42' });
    const b = rollIdentity({ archetype: 'Necromancer', cardId: 'card_fixed_42' });
    expect(a).toEqual(b);
  });

  test('player pins win over the roll', () => {
    const r = rollIdentity({
      archetype: 'Barbarian',
      cardId: 'card_1',
      pins: { build: 'towering', age: 'ancient', sex: 'female', mark: 'iron_jaw_plate' },
    });
    expect(r.build).toBe('towering');
    expect(r.age).toBe('ancient');
    expect(r.sex).toBe('female');
    expect(r.mark).toBe('iron_jaw_plate');
  });

  test('existing (locked/legacy) wins over pins and roll', () => {
    const r = rollIdentity({
      archetype: 'Seraph',
      cardId: 'card_2',
      pins: { build: 'towering', sex: 'male' },
      existing: { build: 'hollowed', sex: 'female', species: 'humanoid', age: 'mature' },
    });
    expect(r.build).toBe('hollowed');
    expect(r.sex).toBe('female');
    expect(r.age).toBe('mature');
  });

  test('invalid pin ids are ignored (fall back to roll)', () => {
    const r = rollIdentity({ archetype: 'Monk', cardId: 'card_3', pins: { build: 'not-a-class' } });
    expect(BODY_ALLOWLIST.Monk).toContain(r.build);
  });
});

describe('rollIdentity — presentation distribution', () => {
  test('supporting archetype is ~40% non-human, humanoids ~50/50 M/F', () => {
    const rolls = ids.map((cardId) => rollIdentity({ archetype: 'Necromancer', cardId }));
    const nonHuman = rolls.filter((r) => r.species !== 'humanoid').length / N;
    expect(nonHuman).toBeGreaterThan(0.34);
    expect(nonHuman).toBeLessThan(0.46);

    const humanoids = rolls.filter((r) => r.species === 'humanoid');
    const female = humanoids.filter((r) => r.sex === 'female').length / humanoids.length;
    expect(female).toBeGreaterThan(0.44);
    expect(female).toBeLessThan(0.56);
    // non-human forms carry sex 'entity'
    expect(rolls.filter((r) => r.species !== 'humanoid').every((r) => r.sex === 'entity')).toBe(true);
  });

  test('rooted-mortal archetype is always humanoid, ~50/50 M/F, never entity', () => {
    const rolls = ids.map((cardId) => rollIdentity({ archetype: 'Barbarian', cardId }));
    expect(rolls.every((r) => r.species === 'humanoid')).toBe(true);
    expect(rolls.every((r) => r.sex === 'male' || r.sex === 'female')).toBe(true);
    const female = rolls.filter((r) => r.sex === 'female').length / N;
    expect(female).toBeGreaterThan(0.44);
    expect(female).toBeLessThan(0.56);
  });

  // The live forge (claudeApi.generateCardText) pins species:'humanoid' so the
  // per-archetype form-families own the non-human/transformation space instead.
  test('forge contract: pinning species=humanoid forces humanoid + ~50/50 M/F even for a non-human archetype', () => {
    const rolls = ids.map((cardId) => rollIdentity({ archetype: 'Necromancer', cardId, pins: { species: 'humanoid' } }));
    expect(rolls.every((r) => r.species === 'humanoid')).toBe(true);
    expect(rolls.every((r) => r.sex === 'male' || r.sex === 'female')).toBe(true);
    const female = rolls.filter((r) => r.sex === 'female').length / N;
    expect(female).toBeGreaterThan(0.44);
    expect(female).toBeLessThan(0.56);
    // and a real spread of builds (not one dominant body)
    expect(new Set(rolls.map((r) => r.build)).size).toBeGreaterThan(3);
  });

  test('build always drawn from the archetype allowlist', () => {
    for (const archetype of ['Barbarian', 'Necromancer', 'Seraph', 'Human'] as const) {
      const rolls = ids.slice(0, 500).map((cardId) => rollIdentity({ archetype, cardId }));
      expect(rolls.every((r) => BODY_ALLOWLIST[archetype].includes(r.build))).toBe(true);
    }
  });

  test('mummified age only appears on archetypes it is restricted to', () => {
    const barb = ids.map((cardId) => rollIdentity({ archetype: 'Barbarian', cardId }));
    expect(barb.some((r) => r.age === 'mummified')).toBe(false); // Barbarian not in restrictTo
    expect(AGE_BANDS.mummified.restrictTo).toContain('Necromancer');
  });
});

describe('rollIdentity — form-family pins (image-first, 2026-07-24)', () => {
  test('a COUNT form (isNonHuman:false) presents as a rolled male/female person', () => {
    // gothic_sovereign is the aristocratic humanoid count — must NOT read entity.
    const r = rollIdentity({
      archetype: 'Vampire',
      cardId: 'card_count_1',
      pins: { species: 'gothic_sovereign' },
    });
    expect(r.species).toBe('gothic_sovereign');
    expect(['male', 'female']).toContain(r.sex);
  });

  test('a NON-HUMAN form (isNonHuman:true) reads as entity', () => {
    const r = rollIdentity({
      archetype: 'Vampire',
      cardId: 'card_nosferatu_1',
      pins: { species: 'nosferatu' },
    });
    expect(r.species).toBe('nosferatu');
    expect(r.sex).toBe('entity');
  });

  test('form pin is deterministic from cardId', () => {
    const a = rollIdentity({ archetype: 'Vampire', cardId: 'card_x', pins: { species: 'crimson_knight', build: 'towering' } });
    const b = rollIdentity({ archetype: 'Vampire', cardId: 'card_x', pins: { species: 'crimson_knight', build: 'towering' } });
    expect(a).toEqual(b);
    expect(a.species).toBe('crimson_knight');
    expect(a.build).toBe('towering');
  });
});
