import { describe, it, expect } from 'vitest';
import { SEED_ABILITIES, SHARED_BASIC_ABILITY_IDS } from './seedAbilities';
import { SEED_BOSSES } from '../bosses/seedBosses';
import { getBossReward } from '../economy/rewardCatalog';
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

describe('boss rewards', () => {
  it('every shipped boss actually pays something', () => {
    // A boss missing from BOSS_REWARD_AMOUNTS does not error — `bossReward`
    // returns an empty `guaranteed` array and the grant resolves as
    // `no_reward / zero_value`. So an unregistered boss silently pays NOTHING,
    // which is exactly what the three champions did when they first shipped.
    const unpaid: string[] = [];
    for (const { definition } of SEED_BOSSES) {
      for (const tier of ['first_clear', 'repeat'] as const) {
        const reward = getBossReward(definition.id, tier);
        const total = (reward?.guaranteed ?? []).reduce((n, i) => n + i.amount, 0);
        if (total <= 0) unpaid.push(`${definition.slug}:${tier}`);
      }
    }
    expect(unpaid).toEqual([]);
  });

  it('pays more for a higher floor, and repeats pay less than a first clear', () => {
    const goldOf = (id: string, tier: 'first_clear' | 'repeat') =>
      (getBossReward(id, tier)?.guaranteed ?? [])
        .filter((i) => i.currency === 'gameplay')
        .reduce((n, i) => n + i.amount, 0);

    const champions = SEED_BOSSES.filter((b) => b.definition.bossKind === 'champion').sort(
      (a, b) => (a.definition.towerFloor ?? 0) - (b.definition.towerFloor ?? 0),
    );

    for (const { definition } of champions) {
      // Grinding a low floor must never beat climbing.
      expect(goldOf(definition.id, 'repeat')).toBeLessThan(goldOf(definition.id, 'first_clear'));
    }
    for (let i = 1; i < champions.length; i++) {
      expect(goldOf(champions[i].definition.id, 'first_clear')).toBeGreaterThan(
        goldOf(champions[i - 1].definition.id, 'first_clear'),
      );
    }
  });

  it('champions pay gold only — no premium currency', () => {
    // Raheem 2026-07-28: "leave it gold for now." Crystals buy AI generation,
    // and there is no per-run sink to balance a premium faucet against until
    // the run loop exists.
    for (const { definition } of SEED_BOSSES) {
      if (definition.bossKind !== 'champion') continue;
      for (const tier of ['first_clear', 'repeat'] as const) {
        const premium = (getBossReward(definition.id, tier)?.guaranteed ?? []).filter(
          (i) => i.currency === 'premium',
        );
        expect(premium, `${definition.slug} pays premium currency`).toEqual([]);
      }
    }
  });
});
