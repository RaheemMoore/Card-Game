import { describe, expect, it } from 'vitest';
import type { Card } from '../../../types/card';
import { FORGE_STRIKE_CONFIG_V1 as CFG } from './config';
import { applyRunToTemper, getTemper, temperGain } from './temper';

function makeCard(temperProgress?: Card['temperProgress']): Card {
  return {
    cardId: 'test',
    archetype: 'Barbarian',
    cardName: '',
    nameAndTitle: '',
    portraitAsset: '',
    stats: { Atk: { value: 55, bias: 'High', hardCap: 100 }, Def: { value: 40, bias: 'Mid', hardCap: 85 } },
    dominantStat: null,
    border: { baseVariant: 'Default', baseSource: '' },
    lore: '',
    whisperWords: [],
    evolutionHistory: {},
    createdAt: '2026-01-01',
    temperProgress,
  };
}

describe('temper gain per rating', () => {
  it('maps rating to configured fill; fail pours nothing', () => {
    expect(temperGain(CFG, 'gold')).toBe(CFG.temperFill.gold);
    expect(temperGain(CFG, 'silver')).toBe(CFG.temperFill.silver);
    expect(temperGain(CFG, 'bronze')).toBe(CFG.temperFill.bronze);
    expect(temperGain(CFG, 'fail')).toBe(0);
  });
});

describe('applyRunToTemper', () => {
  it('a fresh card starts empty', () => {
    expect(getTemper(makeCard())).toEqual({ fill: 0, bursts: 0 });
  });

  it('a successful run pours into the gauge', () => {
    const r = applyRunToTemper(CFG, makeCard(), 'bronze');
    expect(r.gained).toBe(CFG.temperFill.bronze);
    expect(r.burst).toBe(false);
    expect(r.temper.fill).toBeCloseTo(CFG.temperFill.bronze, 10);
    expect(r.temper.bursts).toBe(0);
  });

  it('a failed run adds nothing and does not drain', () => {
    const r = applyRunToTemper(CFG, makeCard({ fill: 0.4, bursts: 0 }), 'fail');
    expect(r.gained).toBe(0);
    expect(r.temper.fill).toBe(0.4);
    expect(r.burst).toBe(false);
  });

  it('reaching full bursts, increments the count, and carries the remainder', () => {
    // 0.85 + gold(0.4) = 1.25 → burst, fill 0.25
    const r = applyRunToTemper(CFG, makeCard({ fill: 0.85, bursts: 1 }), 'gold');
    expect(r.burst).toBe(true);
    expect(r.temper.bursts).toBe(2);
    expect(r.temper.fill).toBeCloseTo(0.25, 10);
  });

  it('never mutates the input card', () => {
    const card = makeCard({ fill: 0.5, bursts: 0 });
    const before = JSON.stringify(card);
    applyRunToTemper(CFG, card, 'gold');
    expect(JSON.stringify(card)).toBe(before);
  });
});
