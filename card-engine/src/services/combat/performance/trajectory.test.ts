import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import type { Card } from '../../../types/card';
import {
  assetAvailable,
  assetKitIdFor,
  getAssetKit,
  performanceAssetUrl,
} from '../../../data/combat/performance/assetKits';
import { compileActionScopes } from './actionScope';
import { resolvePerformance } from './resolvePerformance';

const BOSS = 'boss_1';
const HERO = 'hero_0';

const card = (element?: string) => ({ currentElement: element } as unknown as Card);

const events = (abilityId: string): BattleEvent[] => [
  {
    kind: 'player_action_selected',
    actorId: HERO,
    action: { kind: 'ability', abilityDefinitionId: abilityId, targetActorIds: [BOSS] },
  },
  {
    kind: 'damage_dealt',
    sourceActorId: HERO,
    targetActorId: BOSS,
    amount: 14,
    damageType: 'umbral',
    blockedByShield: 0,
  },
];

function resolve(abilityId: string, element?: string) {
  const evs = events(abilityId);
  const scope = compileActionScopes(evs, BOSS).scopes[0];
  return resolvePerformance(scope, {
    events: evs,
    cardByActorId: new Map([[HERO, card(element)]]),
    motionLevel: 'full',
  });
}

describe('trajectory', () => {
  it('fires Attuned Strike as a beam, not a whip', () => {
    // Raheem's call after the first review: the whip's lateral wobble read as
    // "a squiggle" mid-flight rather than as something being fired.
    expect(resolve('ability_attuned_strike', 'Blood').trajectory).toBe('beam');
  });

  it('keeps a drain as a continuous beam', () => {
    // A drain is material flowing in both directions along one connection. A
    // whip crack would break the read that something is being siphoned.
    expect(resolve('ability_sanguine_tithe', 'Blood').trajectory).toBe('beam');
  });

  it('lobs an unmapped damage-only ability', () => {
    expect(resolve('ability_no_such_thing', 'Fire').trajectory).toBe('arc');
  });

  it('always resolves a trajectory, never undefined', () => {
    for (const id of ['ability_rootgrasp', 'ability_bearing_witness', 'ability_unknown']) {
      expect(resolve(id, 'Nature').trajectory).toBeTruthy();
    }
  });
});

describe('the first real asset', () => {
  it('exposes the Blood impact splash as available', () => {
    // The manifest is the gate: renderers ask `assetAvailable`, never whether a
    // path string is truthy — every row has a path, because a path is a spec.
    const kit = getAssetKit(assetKitIdFor('lash', 'Blood'));
    expect(kit).toBeTruthy();
    expect(assetAvailable(kit!.impact)).toBe(true);
    expect(performanceAssetUrl(kit!.impact!)).toBe('/assets/combat/effects/lash/blood/impact.png');
  });

  it('carries full provenance, as the acquisition contract requires', () => {
    const asset = getAssetKit('lash_blood')!.impact!;
    expect(asset.provenance?.provider).toBe('pixellab');
    expect(asset.provenance?.tool).toBe('create_image_pixen');
    expect(asset.provenance?.jobOrObjectId).toBeTruthy();
    expect(asset.provenance?.seed).toBe(7331);
    expect(asset.provenance?.generationCost).toBe(1);
  });

  it('still treats every un-generated piece as unavailable', () => {
    // Guards against a stray status flip making the renderers reach for files
    // that do not exist.
    const kit = getAssetKit('lash_blood')!;
    expect(assetAvailable(kit.segment)).toBe(false);
    expect(assetAvailable(kit.particle)).toBe(false);
    expect(assetAvailable(getAssetKit('lash_water')!.impact)).toBe(false);
  });
});
