import { describe, expect, it } from 'vitest';
import type { Card, BiasTier, StatEntry, StatName } from '../../../types/card';
import { applyTrainingOutcome, VERY_LOW_WINS_PER_POINT } from './training';

function entry(value: number, bias: BiasTier, hardCap: number): StatEntry {
  return { value, bias, hardCap };
}

/** Minimal Barbarian card (Atk High, Def Mid, Mana Very Low). */
function makeCard(stats: Partial<Record<StatName, StatEntry>>): Card {
  return {
    cardId: 'test',
    archetype: 'Barbarian',
    cardName: '',
    nameAndTitle: '',
    portraitAsset: '',
    stats: {
      Atk: stats.Atk ?? entry(55, 'High', 100),
      Def: stats.Def ?? entry(40, 'Mid', 85),
      Mana: stats.Mana ?? entry(20, 'Very Low', 55),
    },
    dominantStat: null,
    border: { baseVariant: 'Default', baseSource: '' },
    lore: '',
    whisperWords: [],
    evolutionHistory: {},
    createdAt: '2026-01-01',
  };
}

describe('win / loss on ordinary (non–Very Low) stats', () => {
  it('a win adds +1 to the trained stat', () => {
    const r = applyTrainingOutcome(makeCard({ Atk: entry(55, 'High', 100) }), 'Atk', 'win');
    expect(r.kind).toBe('applied');
    if (r.kind === 'applied') {
      expect(r.delta).toBe(1);
      expect(r.card.stats.Atk.value).toBe(56);
    }
  });

  it('a loss subtracts 1 from the trained stat', () => {
    const r = applyTrainingOutcome(makeCard({ Atk: entry(55, 'High', 100) }), 'Atk', 'loss');
    expect(r.kind).toBe('applied');
    if (r.kind === 'applied') {
      expect(r.delta).toBe(-1);
      expect(r.card.stats.Atk.value).toBe(54);
    }
  });

  it('a win at the hard cap does nothing', () => {
    const r = applyTrainingOutcome(makeCard({ Atk: entry(100, 'High', 100) }), 'Atk', 'win');
    expect(r.kind).toBe('no_change');
    if (r.kind === 'no_change') expect(r.reason).toBe('hard_cap');
  });

  it('a loss at the floor does nothing', () => {
    const r = applyTrainingOutcome(makeCard({ Atk: entry(1, 'High', 100) }), 'Atk', 'loss');
    expect(r.kind).toBe('no_change');
    if (r.kind === 'no_change') expect(r.reason).toBe('floor');
  });

  it('never mutates the input card', () => {
    const card = makeCard({ Atk: entry(55, 'High', 100) });
    const before = JSON.stringify(card);
    applyTrainingOutcome(card, 'Atk', 'win');
    expect(JSON.stringify(card)).toBe(before);
  });
});

describe('Very Low grind — three wins buy one point', () => {
  it('banks wins until the threshold, then applies +1 and resets', () => {
    let card = makeCard({ Mana: entry(20, 'Very Low', 55) });
    for (let i = 1; i < VERY_LOW_WINS_PER_POINT; i++) {
      const r = applyTrainingOutcome(card, 'Mana', 'win');
      expect(r.kind).toBe('accumulated');
      if (r.kind === 'accumulated') {
        expect(r.wins).toBe(i);
        expect(r.needed).toBe(VERY_LOW_WINS_PER_POINT);
        expect(r.card.stats.Mana!.value).toBe(20); // no point yet
      }
      card = (r as { card: Card }).card;
    }
    const final = applyTrainingOutcome(card, 'Mana', 'win');
    expect(final.kind).toBe('applied');
    if (final.kind === 'applied') {
      expect(final.card.stats.Mana!.value).toBe(21);
      expect(final.card.trainingProgress?.veryLowWins?.Mana).toBe(0); // reset
    }
  });

  it('a loss does NOT wipe banked wins by default', () => {
    let card = makeCard({ Mana: entry(20, 'Very Low', 55) });
    card = (applyTrainingOutcome(card, 'Mana', 'win') as { card: Card }).card; // bank 1
    const afterLoss = applyTrainingOutcome(card, 'Mana', 'loss');
    expect(afterLoss.card.trainingProgress?.veryLowWins?.Mana).toBe(1);
    expect(afterLoss.kind).toBe('applied'); // still deducts the point
    if (afterLoss.kind === 'applied') expect(afterLoss.card.stats.Mana!.value).toBe(19);
  });

  it('resetVeryLowOnLoss wipes the accumulator when enabled', () => {
    let card = makeCard({ Mana: entry(20, 'Very Low', 55) });
    card = (applyTrainingOutcome(card, 'Mana', 'win') as { card: Card }).card;
    const afterLoss = applyTrainingOutcome(card, 'Mana', 'loss', { resetVeryLowOnLoss: true });
    expect(afterLoss.card.trainingProgress?.veryLowWins?.Mana).toBe(0);
  });
});

describe('rank-sum cap (7) — trade required, win not consumed', () => {
  // Atk High 80 = Forged, Def Mid 71 = Ascendant, Mana Very Low 26 = Forged → sum 2+3+2 = 7.
  const nearCap = () =>
    makeCard({
      Atk: entry(80, 'High', 100),
      Def: entry(71, 'Mid', 85),
      Mana: entry(26, 'Very Low', 55),
    });

  it('a +1 that would raise rank-sum past 7 asks for a trade and does not apply', () => {
    const r = applyTrainingOutcome(nearCap(), 'Atk', 'win'); // 80→81 = Ascendant
    expect(r.kind).toBe('trade_required');
    if (r.kind === 'trade_required') {
      expect(r.stat).toBe('Atk');
      // Def (Ascendant) and Mana (Forged) can absorb a demotion; both above Foundation.
      expect(r.demoteOptions.sort()).toEqual(['Def', 'Mana']);
    }
  });

  it('a +1 that crosses a rank but stays within the cap still applies', () => {
    // All Foundation: Atk High 65 = Foundation → 66 = Forged; sum 1+1+1 → 2+1+1 = 4 ≤ 7.
    const card = makeCard({
      Atk: entry(65, 'High', 100),
      Def: entry(40, 'Mid', 85),
      Mana: entry(20, 'Very Low', 55),
    });
    const r = applyTrainingOutcome(card, 'Atk', 'win');
    expect(r.kind).toBe('applied');
    if (r.kind === 'applied') expect(r.card.stats.Atk.value).toBe(66);
  });
});
