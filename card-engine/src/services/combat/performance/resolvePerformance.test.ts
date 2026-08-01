import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import type { Card } from '../../../types/card';
import { compileActionScopes } from './actionScope';
import { resolvePerformance, buildCardLookup } from './resolvePerformance';

const BOSS = 'boss_1';
const HERO = 'hero_0';

const card = (element?: string) => ({ currentElement: element } as unknown as Card);

function scopeFor(events: BattleEvent[]) {
  const scope = compileActionScopes(events, BOSS).scopes.find((s) => !s.isBoss);
  if (!scope) throw new Error('fixture produced no hero scope');
  return scope;
}

const ctx = (events: BattleEvent[], element?: string, extra = {}) => ({
  events,
  cardByActorId: new Map([[HERO, card(element)]]),
  motionLevel: 'full' as const,
  ...extra,
});

const cast = (id: string): BattleEvent => ({
  kind: 'player_action_selected',
  actorId: HERO,
  action: { kind: 'ability', abilityDefinitionId: id, targetActorIds: [BOSS] },
});

const damage: BattleEvent = {
  kind: 'damage_dealt',
  sourceActorId: HERO,
  targetActorId: BOSS,
  amount: 10,
  damageType: 'kinetic',
  blockedByShield: 0,
};

describe('resolvePerformance — precedence', () => {
  it('rung 1: uses the exact recipe for a known ability', () => {
    const events = [cast('ability_rootgrasp'), damage];
    const p = resolvePerformance(scopeFor(events), ctx(events, 'Nature'));

    expect(p.recipeId).toBe('recipe_rootgrasp');
    expect(p.form).toBe('growth');
    expect(p.isFallback).toBe(false);
  });

  it('rung 2: infers a form for an unmapped ability from its consequences', () => {
    // Damage plus a heal to the caster is a drain whatever it is called.
    const events: BattleEvent[] = [
      cast('ability_unknown'),
      damage,
      { kind: 'healing_applied', sourceActorId: HERO, targetActorId: HERO, amount: 6, overheal: 0 },
    ];
    const p = resolvePerformance(scopeFor(events), ctx(events, 'Blood'));

    expect(p.form).toBe('drain');
    expect(p.material.element).toBe('Blood');
    expect(p.isFallback).toBe(true);
    expect(p.fallbackReason).toMatch(/inferred drain/);
  });

  it('rung 2: a shield-granting unknown becomes a barrier, not a bolt', () => {
    const events: BattleEvent[] = [
      cast('ability_unknown'),
      { kind: 'shield_gained', sourceActorId: HERO, targetActorId: HERO, amount: 12, types: [] },
    ];
    expect(resolvePerformance(scopeFor(events), ctx(events, 'Holy')).form).toBe('barrier');
  });

  it('rung 3: a caster with no element still resolves, with a generic material', () => {
    const events = [cast('ability_rootgrasp'), damage];
    const p = resolvePerformance(scopeFor(events), ctx(events, undefined));

    expect(p.form).toBe('growth');
    expect(p.isFallback).toBe(true);
    expect(p.fallbackReason).toMatch(/no element/);
  });

  it('rung 4: an unknown ability with no inferable form falls through to generic', () => {
    const events: BattleEvent[] = [
      cast('ability_unknown'),
      { kind: 'status_applied', sourceActorId: HERO, targetActorId: BOSS, statusId: 's', instanceId: 'i', duration: 1 },
    ];
    const p = resolvePerformance(scopeFor(events), ctx(events, 'Fire'));

    expect(p.form).toBe('generic');
    expect(p.isFallback).toBe(true);
  });

  it('never returns nothing, even for an action with no consequences at all', () => {
    const events = [cast('ability_unknown')];
    const p = resolvePerformance(scopeFor(events), ctx(events, 'Fire'));

    expect(p).toBeTruthy();
    expect(p.stages.length).toBeGreaterThan(0);
  });
});

describe('resolvePerformance — material', () => {
  it('reads the LIVE card element, not the damage type', () => {
    // Blood and Void both resolve as `umbral` damage. If material came from the
    // damage type they would be identical — which is the exact bug this whole
    // system exists to fix.
    const events = [cast('ability_attuned_strike'), damage];

    const blood = resolvePerformance(scopeFor(events), ctx(events, 'Blood'));
    const water = resolvePerformance(scopeFor(events), ctx(events, 'Water'));

    expect(blood.material.element).toBe('Blood');
    expect(water.material.element).toBe('Water');
    // And they must differ in SHAPE, not merely in colour.
    expect(blood.material.silhouette).not.toBe(water.material.silhouette);
    expect(blood.material.impact).not.toBe(water.material.impact);
  });

  it('shares form infrastructure across materials — the reuse proof', () => {
    const events = [cast('ability_attuned_strike'), damage];
    const results = ['Blood', 'Water', 'Fire'].map((e) =>
      resolvePerformance(scopeFor(events), ctx(events, e)),
    );

    // Same recipe, same form, same stage shape. Only the material differs.
    expect(new Set(results.map((r) => r.recipeId)).size).toBe(1);
    expect(new Set(results.map((r) => r.form)).size).toBe(1);
    expect(new Set(results.map((r) => r.stages.map((s) => s.stage).join(',')))).toHaveProperty('size', 1);
    expect(new Set(results.map((r) => r.material.element)).size).toBe(3);
  });

  it('flags a provisional material kit without treating it as a resolution failure', () => {
    const events = [cast('ability_attuned_strike'), damage];
    const p = resolvePerformance(scopeFor(events), ctx(events, 'Void'));

    expect(p.material.provisional).toBe(true);
    expect(p.isFallback).toBe(false);
    expect(p.fallbackReason).toMatch(/family default/);
  });
});

describe('resolvePerformance — degradation and keys', () => {
  it('degrades safely when assets are missing, keeping the form', () => {
    const events = [cast('ability_rootgrasp'), damage];
    const p = resolvePerformance(
      scopeFor(events),
      ctx(events, 'Nature', { simulateMissingAssets: true }),
    );

    // Missing art is not a reason to stop the ability looking like what it is.
    expect(p.form).toBe('growth');
    expect(p.stages.length).toBeGreaterThan(0);
  });

  it('gives repeat casts of the same ability distinct keys', () => {
    const events: BattleEvent[] = [
      cast('ability_attuned_strike'),
      damage,
      cast('ability_attuned_strike'),
      damage,
    ];
    const scopes = compileActionScopes(events, BOSS).scopes;
    const ids = scopes.map((s) => resolvePerformance(s, ctx(events, 'Fire')).id);

    expect(new Set(ids).size).toBe(2);
  });

  it('re-times but never collapses under reduced motion', () => {
    const events = [cast('ability_sanguine_tithe'), damage];
    const full = resolvePerformance(scopeFor(events), ctx(events, 'Blood'));
    const off = resolvePerformance(scopeFor(events), {
      ...ctx(events, 'Blood'),
      motionLevel: 'off' as const,
    });

    expect(off.totalMs).toBeLessThan(full.totalMs);
    expect(off.totalMs).toBeGreaterThan(0);
    // Sequence, and therefore the ordering information, survives.
    expect(off.stages.map((s) => s.stage)).toEqual(full.stages.map((s) => s.stage));
  });
});

describe('buildCardLookup', () => {
  it('maps hero actor ids to party cards positionally', () => {
    const cards = [card('Fire'), card('Water')];
    const map = buildCardLookup(['hero_0', 'hero_1'], cards);

    expect(map.get('hero_0')).toBe(cards[0]);
    expect(map.get('hero_1')).toBe(cards[1]);
  });

  it('tolerates fewer cards than actors', () => {
    const map = buildCardLookup(['hero_0', 'hero_1'], [card('Fire')]);
    expect(map.size).toBe(1);
  });
});
