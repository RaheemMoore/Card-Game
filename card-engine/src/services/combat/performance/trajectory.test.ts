import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import type { Card } from '../../../types/card';
import {
  assetAvailable,
  assetKitIdFor,
  ALL_PERFORMANCE_ASSETS,
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

  it('reports availability strictly from approval status, never from a path', () => {
    /*
     * Structural rather than naming elements, because the element-naming
     * version of this test went stale three times in one afternoon — every
     * time a material landed, the thing it asserted was un-generated became
     * generated. What actually needs guarding is the RULE: a renderer must
     * reach for a file only when the manifest says it is approved, never
     * because a path string looks truthy. Every row has a path; a path is a
     * spec, not a file.
     */
    for (const asset of ALL_PERFORMANCE_ASSETS) {
      const shouldBeUsable =
        asset.approvalStatus === 'candidate' || asset.approvalStatus === 'approved';
      expect(assetAvailable(asset), `${asset.id} (${asset.approvalStatus})`).toBe(shouldBeUsable);
      expect(asset.path.length, `${asset.id} has no path`).toBeGreaterThan(0);
    }
  });

  it('carries frames and a fps on anything declared a flipbook', () => {
    // A flipbook with no frames would silently render as a still — the kind of
    // bug that only shows up as "why isn't the splash moving".
    for (const asset of ALL_PERFORMANCE_ASSETS) {
      if (asset.kind !== 'flipbook') continue;
      expect(asset.frames?.length, `${asset.id} frames`).toBeGreaterThan(1);
      expect(asset.fps, `${asset.id} fps`).toBeGreaterThan(0);
      expect(asset.frameCount).toBe(asset.frames!.length);
    }
  });

  it('exposes Water as a second complete material — no code change required', () => {
    // The payoff for the form/material split: a new element is a manifest
    // entry. If this ever needs a renderer change to pass, the split has
    // sprung a leak.
    const kit = getAssetKit(assetKitIdFor('lash', 'Water'));
    expect(assetAvailable(kit?.stream)).toBe(true);
    expect(assetAvailable(kit?.impact)).toBe(true);
    // Animated, and the splash resolves once rather than looping.
    expect(kit!.stream!.frames?.length).toBe(9);
    expect(kit!.impact!.loop).toBe(false);
  });
});
