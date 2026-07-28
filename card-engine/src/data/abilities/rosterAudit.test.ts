import { describe, it, expect } from 'vitest';
import { SEED_ABILITIES, SHARED_BASIC_ABILITY_IDS } from './seedAbilities';
import { calculatePowerBudget, getBudgetBand } from './powerBudget';
import { validateAbilityVersion } from '../../services/abilities/validator';

describe('starting roster', () => {
  it('every ability passes the validator', () => {
    const failures: string[] = [];
    for (const { definition, version } of SEED_ABILITIES) {
      const result = validateAbilityVersion(version, definition);
      if (!result.ok) failures.push(`${definition.slug}: ${JSON.stringify(result.errors)}`);
    }
    expect(failures).toEqual([]);
  });

  it('every ability lands inside its power band', () => {
    const rows = SEED_ABILITIES.map(({ definition, version }) => {
      const score = calculatePowerBudget(version);
      const band = getBudgetBand(version.slotType, definition.rarity);
      return { slug: definition.slug, slot: version.slotType, rarity: definition.rarity, score, band, ok: score >= band.min && score <= band.max };
    });
    // eslint-disable-next-line no-console
    console.info('\n' + rows.map((r) => `  ${r.ok ? 'OK ' : 'OUT'} ${r.slug.padEnd(26)} ${r.slot.padEnd(10)} ${r.rarity.padEnd(9)} score=${String(r.score).padStart(3)} band=${r.band.min}-${r.band.max}`).join('\n'));
    expect(rows.filter((r) => !r.ok).map((r) => `${r.slug} score=${r.score} band=${r.band.min}-${r.band.max}`)).toEqual([]);
  });

  it('has a non-empty shared basics pool usable by any archetype', () => {
    expect(SHARED_BASIC_ABILITY_IDS.length).toBeGreaterThan(0);
    for (const id of SHARED_BASIC_ABILITY_IDS) {
      const seed = SEED_ABILITIES.find((s) => s.definition.id === id);
      expect(seed, `${id} missing from SEED_ABILITIES`).toBeDefined();
      // Resource-free so a Mana hero and a Tech hero can both fall back here.
      expect(seed!.version.resourceType).toBe('none');
      expect(seed!.version.resourceCost).toBe(0);
    }
  });

  it('covers every effect type the reducer implements', () => {
    const used = new Set(SEED_ABILITIES.flatMap((s) => s.version.effects.map((e) => e.type)));
    for (const t of ['direct_damage','multi_hit','damage_over_time','healing','shielding','guard','taunt','apply_status','remove_status','resource_gain','ultimate_charge_gain','conditional_bonus']) {
      expect(used.has(t as never), `no ability exercises ${t}`).toBe(true);
    }
  });

  it('reaches both of the boss weaknesses', () => {
    const types = new Set(
      SEED_ABILITIES.flatMap((s) => s.version.effects.flatMap((e) => ('damageType' in e && e.damageType ? [e.damageType] : []))),
    );
    expect(types.has('holy')).toBe(true);
    expect(types.has('nature')).toBe(true);
  });
});
