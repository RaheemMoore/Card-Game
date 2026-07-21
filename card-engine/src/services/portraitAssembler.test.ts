import { describe, it, expect } from 'vitest';
import { assemblePortraitPrompt } from './portraitAssembler';
import { PORTRAIT_PROMPT_MAX } from './claudeApi';
import { emptyHiddenFate } from './hiddenFate';
import type { CharacterSheet } from '../types/characterSheet';
import type { HiddenFate } from '../types/bible';

/** A deliberately hard, diverse identity — the anti-white-default stress test. */
function hardFate(): HiddenFate {
  return {
    ...emptyHiddenFate(),
    age: '70s, deeply lined',
    sex: 'female',
    bodyType: 'heavyset with a barrel chest and broad hips',
    skinTone: 'deep umber brown, warm undertone',
    facialStructure: 'wide jaw, hooded eyes',
    hair: 'silver locs',
    disabilityOrCondition: 'prosthetic left leg of carved bone',
    scars: 'ritual scarification across both forearms',
    weather: 'cold graveyard mist',
    environmentDetails: 'a fog-choked graveyard of leaning headstones',
    fashion: {
      role: 'ceremonial',
      primaryGarment: 'layered grave-robes of black linen',
      armor: 'a breastplate of lashed rib-bone',
      waist: 'a rope cincture',
      footwear: 'wrapped graveboots',
      materials: ['black linen', 'bone'],
      wear: 'funerary-preserved',
      signatureAccessory: 'an ancestral bone-handled dagger',
    },
  };
}

function makeSheet(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    hiddenFate: hardFate(),
    storyMotifs: [],
    archetype: 'Necromancer',
    rank: 'Foundation',
    resolvedElement: 'Void',
    pose: 'mid-cast with a glowing crack down the sternum leaking soul-light',
    weapon: 'a Grave Scythe — blackened funeral steel and bone',
    diversityAxis: 'HEAVYSET / BEEFY: large heavy barrel-chested frame',
    isEvolution: false,
    abilityRefs: [],
    ...overrides,
  };
}

describe('assemblePortraitPrompt — element dominance (must render in EVERY image)', () => {
  it('leads with the ELEMENT SCENE PALETTE saturating the whole image', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt.startsWith('SCENE —')).toBe(true);
    expect(portraitPrompt).toContain('starless absolute black, reality-tear purple');
    expect(portraitPrompt).toContain('never greyed or desaturated');
  });

  it('repeats the element at the closer so it bookends the prompt', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt).toContain('Void power filling the frame');
  });

  it('scales element intensity by rank', () => {
    expect(assemblePortraitPrompt(makeSheet({ rank: 'Foundation' })).portraitPrompt).toContain('RESTRAINED POWER');
    expect(assemblePortraitPrompt(makeSheet({ rank: 'Forged', isEvolution: true })).portraitPrompt).toContain('ESCALATING POWER');
    expect(assemblePortraitPrompt(makeSheet({ rank: 'Ascendant', isEvolution: true })).portraitPrompt).toContain('OVERWHELMING POWER');
  });

  it('bans the washed-out neutral scene in the negatives (root cause of tan renders)', () => {
    const { negativePrompt } = assemblePortraitPrompt(makeSheet());
    expect(negativePrompt).toContain('neutral tan background');
    expect(negativePrompt).toContain('washed-out');
  });
});

describe('assemblePortraitPrompt — the non-negotiables survive the budget', () => {
  for (const rank of ['Foundation', 'Forged', 'Ascendant'] as const) {
    it(`keeps palette + identity + wardrobe + pose + weapon + background at ${rank}`, () => {
      const { portraitPrompt } = assemblePortraitPrompt(
        makeSheet({ rank, isEvolution: rank !== 'Foundation' }),
      );
      expect(portraitPrompt).toContain('Void colours');
      expect(portraitPrompt).toContain('deep umber brown'); // ancestry held
      expect(portraitPrompt).toContain('dressed in'); // garments described
      expect(portraitPrompt).toContain('Grave Scythe'); // weapon must render
      expect(portraitPrompt).toContain('BACKGROUND'); // real setting
      expect(portraitPrompt.length).toBeLessThanOrEqual(PORTRAIT_PROMPT_MAX);
    });
  }
});

describe('assemblePortraitPrompt — modesty is impossible to truncate off', () => {
  for (const rank of ['Foundation', 'Forged', 'Ascendant'] as const) {
    it(`keeps the anti-explicit-content negatives at ${rank}`, () => {
      const { negativePrompt } = assemblePortraitPrompt(
        makeSheet({ rank, isEvolution: rank !== 'Foundation' }),
      );
      for (const term of ['nudity', 'exposed nipples', 'bare breasts', 'bare midriff', 'crotch bulge']) {
        expect(negativePrompt).toContain(term);
      }
    });
  }
});

describe('assemblePortraitPrompt — identity + modesty + weapon', () => {
  it('holds the Bible-locked disability + scars even at the tight Ascendant budget', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet({ rank: 'Ascendant', isEvolution: true }));
    expect(portraitPrompt).toContain('prosthetic left leg of carved bone');
    expect(portraitPrompt).toContain('ritual scarification');
  });

  it('describes the wardrobe and wreaths the weapon in the element', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt).toContain('dressed in');
    expect(portraitPrompt).toContain('wreathed in visible Void energy');
  });

  it('is deterministic — same sheet in, identical prompt out', () => {
    const a = assemblePortraitPrompt(makeSheet());
    const b = assemblePortraitPrompt(makeSheet());
    expect(a.portraitPrompt).toBe(b.portraitPrompt);
    expect(a.negativePrompt).toBe(b.negativePrompt);
  });

  it('never receives name/title/lore (the seam guarantee)', () => {
    const sheet = makeSheet();
    expect('cardName' in sheet).toBe(false);
    expect('nameAndTitle' in sheet).toBe(false);
    expect('lore' in sheet).toBe(false);
  });
});

describe('assemblePortraitPrompt — bare chest is gated to Ascendant + male ONLY', () => {
  const male = (rank: 'Foundation' | 'Forged' | 'Ascendant') =>
    makeSheet({ rank, isEvolution: rank !== 'Foundation', hiddenFate: { ...hardFate(), sex: 'male' } });
  const female = (rank: 'Foundation' | 'Forged' | 'Ascendant') =>
    makeSheet({ rank, isEvolution: rank !== 'Foundation', hiddenFate: { ...hardFate(), sex: 'female' } });

  it('Foundation male stays super modest — anti-shirtless negatives + FULLY COVERED cue', () => {
    const { portraitPrompt, negativePrompt } = assemblePortraitPrompt(male('Foundation'));
    expect(negativePrompt).toContain('shirtless');
    expect(negativePrompt).toContain('bare chest');
    expect(portraitPrompt).toContain('FULLY COVERED');
    expect(portraitPrompt).not.toContain('bare muscular chest');
  });

  it('Forged male stays covered (only the PEAK is bared)', () => {
    const { portraitPrompt, negativePrompt } = assemblePortraitPrompt(male('Forged'));
    expect(negativePrompt).toContain('bare chest');
    expect(portraitPrompt).toContain('FULLY COVERED');
  });

  it('Ascendant female stays covered — guards the AND-vs-OR gate bug', () => {
    const { portraitPrompt, negativePrompt } = assemblePortraitPrompt(female('Ascendant'));
    expect(negativePrompt).toContain('bare chest');
    expect(portraitPrompt).toContain('FULLY COVERED');
    expect(portraitPrompt).not.toContain('bare muscular chest');
  });

  it('Ascendant male may be bared — no anti-shirtless negative, open-robe cue present', () => {
    const { portraitPrompt, negativePrompt } = assemblePortraitPrompt(male('Ascendant'));
    expect(negativePrompt).not.toContain('bare chest');
    expect(negativePrompt).not.toContain('shirtless');
    expect(portraitPrompt).toContain('bare muscular chest');
    expect(portraitPrompt).not.toContain('FULLY COVERED');
    // Female-explicit + groin negatives must STILL hold in the allowed case.
    expect(negativePrompt).toContain('bare breasts');
    expect(negativePrompt).toContain('crotch bulge');
  });
});
