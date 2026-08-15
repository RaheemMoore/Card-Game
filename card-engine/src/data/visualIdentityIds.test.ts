import { describe, it, expect } from 'vitest';
import type { ElementName } from '../types/bible';
import {
  ANDROID_PATH_IDS,
  LYCAN_MOON_PHASE_IDS,
  BEASTMASTER_SUMMONS,
  beastmasterSummonOptions,
  beastmasterSummonIds,
} from './visualIdentityIds';

/**
 * These ids are PERSISTED on existing cards (hiddenFate.androidPath, .moonPhase,
 * .summonId). Renaming one silently rewrites what a character already chose, so
 * the values are pinned here rather than merely type-checked.
 */

describe('ANDROID_PATH_IDS', () => {
  it('is frozen, in the order ascendantPaths.ts indexes by', () => {
    expect(ANDROID_PATH_IDS).toEqual(['protect', 'destroy', 'befriend', 'leave']);
  });
});

describe('LYCAN_MOON_PHASE_IDS', () => {
  it('is frozen, index = transformation level 0-4', () => {
    expect(LYCAN_MOON_PHASE_IDS).toEqual(['new_moon', 'crescent', 'half', 'gibbous', 'full']);
  });
});

describe('BEASTMASTER_SUMMONS', () => {
  const ELEMENTS_WITH_POOLS: ElementName[] = ['Beast', 'Earth', 'Wind', 'Water', 'Spirit', 'Ice'];

  it('covers exactly the six elements the Beastmaster can summon for', () => {
    expect(Object.keys(BEASTMASTER_SUMMONS).sort()).toEqual([...ELEMENTS_WITH_POOLS].sort());
  });

  it('offers three beasts per element', () => {
    for (const element of ELEMENTS_WITH_POOLS) {
      expect(beastmasterSummonOptions(element), element).toHaveLength(3);
    }
  });

  it('returns an empty pool for an element with no beasts', () => {
    expect(beastmasterSummonOptions('Fire')).toEqual([]);
    expect(beastmasterSummonIds('Fire')).toEqual([]);
  });

  it('uses globally unique ids', () => {
    const ids = ELEMENTS_WITH_POOLS.flatMap((e) => beastmasterSummonIds(e));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hands back a copy, so a caller cannot mutate the pool', () => {
    const first = beastmasterSummonOptions('Beast');
    first.pop();
    expect(beastmasterSummonOptions('Beast')).toHaveLength(3);
  });

  /**
   * The labels used to be scraped out of the prompt prose in portraitAssembler
   * by regex — the leading run of CAPS words, lowercased then re-capitalised.
   * They are authored data now. This pins the exact strings that regex produced
   * so the rehome could not quietly rename a player-facing option.
   *
   * Derived from BEASTMASTER_BEASTS via /[A-Z][A-Z-]+(?:\s+[A-Z][A-Z-]+)?/.
   */
  it('reproduces the labels the old prompt-prose regex produced', () => {
    expect(beastmasterSummonOptions('Beast')).toEqual([
      { id: 'dire_wolf', label: 'Dire wolf' },
      { id: 'sabertooth', label: 'Sabertooth great-cat' },
      { id: 'war_boar', label: 'Tusked war-boar' },
    ]);
    expect(beastmasterSummonOptions('Earth')).toEqual([
      { id: 'dire_bear', label: 'Dire bear' },
      { id: 'war_rhino', label: 'War-rhino' },
      { id: 'tortoise_titan', label: 'Tortoise-titan' },
    ]);
    expect(beastmasterSummonOptions('Wind')).toEqual([
      { id: 'storm_raptor', label: 'Storm-raptor' },
      { id: 'wind_serpent', label: 'Wind-serpent' },
      { id: 'gale_stallion', label: 'Gale-stallion' },
    ]);
    expect(beastmasterSummonOptions('Water')).toEqual([
      { id: 'river_serpent', label: 'River-serpent' },
      { id: 'orca_beast', label: 'Orca-beast' },
      { id: 'water_hound', label: 'Water-hound' },
    ]);
    expect(beastmasterSummonOptions('Spirit')).toEqual([
      { id: 'spirit_stag', label: 'Spirit-stag' },
      { id: 'spectral_tiger', label: 'Spectral tiger' },
      { id: 'spectral_owl', label: 'Spectral owl' },
    ]);
    expect(beastmasterSummonOptions('Ice')).toEqual([
      { id: 'frost_mammoth', label: 'Mammoth' },
      { id: 'glacial_wolf', label: 'Dire-wolf' },
      { id: 'ice_elk', label: 'Ice-elk' },
    ]);
  });
});
