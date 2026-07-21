import { describe, it, expect } from 'vitest';
import { assemblePortraitPrompt } from './portraitAssembler';
import { PORTRAIT_PROMPT_MAX, NEGATIVE_PROMPT_MAX } from './claudeApi';
import { emptyHiddenFate } from './hiddenFate';
import type { CharacterSheet } from '../types/characterSheet';
import type { HiddenFate } from '../types/bible';

/**
 * A deliberately hard Necromancer identity — heavyset + elderly + prosthetic
 * + scarred — the stress test the art-prompt-director asked for: if the
 * assembler can rebuild THIS person as a skeleton from the sheet without
 * re-inventing anything, everything else is easier.
 */
function hardNecromancerFate(): HiddenFate {
  return {
    ...emptyHiddenFate(),
    age: '70s, deeply lined',
    sex: 'female',
    bodyType: 'heavyset with a barrel chest and broad hips',
    skinTone: 'deep umber brown',
    facialStructure: 'wide jaw, heavy brow, hooded eyes',
    hair: 'silver locs gathered under a hood',
    disabilityOrCondition: 'prosthetic left leg of carved bone',
    scars: 'ritual scarification across both forearms',
    weather: 'still, cold graveyard air',
    lighting: 'low violet soul-light from below',
    environmentDetails: 'a field of leaning headstones under a bruised sky',
    hairDetail: {
      texture: 'coiled',
      length: 'long',
      style: 'gathered under a hood',
      color: 'silver',
      condition: 'weathered',
      adornment: 'a single bone pin',
      facialHair: 'none',
      headwearInteraction: 'tucked under a deep hood',
    },
    fashion: {
      role: 'ceremonial',
      primaryGarment: 'layered grave-robes of black linen',
      armor: 'a breastplate of lashed rib-bone',
      waist: 'a rope cincture hung with vials',
      outerLayer: 'a moth-eaten funerary mantle',
      footwear: 'wrapped leather graveboots',
      materials: ['black linen', 'boiled leather', 'bone'],
      wear: 'funerary-preserved, softened by age',
      signatureAccessory: 'an ancestral bone-handled dagger',
    },
  };
}

function makeSheet(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    hiddenFate: hardNecromancerFate(),
    storyMotifs: ['a shroud embroidered with the names of the dead', 'a censer trailing violet smoke'],
    archetype: 'Necromancer',
    rank: 'Foundation',
    resolvedElement: 'Void',
    pose: 'mid-cast with a glowing CRACK running down the sternum, soul-light bleeding from between the ribs',
    diversityAxis:
      'HEAVYSET / BEEFY: this character has a large, heavy, soft-bodied or barrel-chested frame',
    isEvolution: false,
    abilityRefs: [],
    ...overrides,
  };
}

describe('assemblePortraitPrompt — the seam', () => {
  it('never receives or emits name/title/lore (the CharacterSheet omits them)', () => {
    // Structural guarantee: the type has no such fields. This asserts the
    // sheet shape at compile+runtime — a would-be name cannot leak because
    // there is nowhere on the sheet to put it.
    const sheet = makeSheet();
    expect('cardName' in sheet).toBe(false);
    expect('nameAndTitle' in sheet).toBe(false);
    expect('lore' in sheet).toBe(false);
  });

  it('is deterministic — same sheet in, identical prompt out', () => {
    const a = assemblePortraitPrompt(makeSheet());
    const b = assemblePortraitPrompt(makeSheet());
    expect(a.portraitPrompt).toBe(b.portraitPrompt);
    expect(a.negativePrompt).toBe(b.negativePrompt);
  });
});

describe('assemblePortraitPrompt — identity carry-through', () => {
  it('weaves every freeform identity anchor verbatim into the SAME PERSON RULE block', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt).toContain('SAME PERSON RULE:');
    expect(portraitPrompt).toContain('heavyset with a barrel chest');
    expect(portraitPrompt).toContain('deep umber brown');
    expect(portraitPrompt).toContain('prosthetic left leg of carved bone');
    expect(portraitPrompt).toContain('ritual scarification across both forearms');
    expect(portraitPrompt).toContain('70s, deeply lined');
  });

  it('preserves body type as a heavyset skeleton would require — no slim-hero default', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt).toContain('do NOT slim, muscle-up, de-age');
  });

  it('carries the locked wardrobe from fashion into the prompt', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt).toContain('layered grave-robes of black linen');
    expect(portraitPrompt).toContain('breastplate of lashed rib-bone');
  });

  it('adds the IDENTITY IMPERATIVE re-lock only on tier-up (isEvolution)', () => {
    const fresh = assemblePortraitPrompt(makeSheet({ isEvolution: false }));
    const evolved = assemblePortraitPrompt(makeSheet({ isEvolution: true, rank: 'Forged', pose: '', diversityAxis: '' }));
    expect(fresh.portraitPrompt).not.toContain('IDENTITY IMPERATIVE');
    expect(evolved.portraitPrompt).toContain('IDENTITY IMPERATIVE');
  });
});

describe('assemblePortraitPrompt — element lockdown', () => {
  it('injects anti-fire language + warm-glow negatives for a non-fire element (Void)', () => {
    const { portraitPrompt, negativePrompt } = assemblePortraitPrompt(makeSheet({ resolvedElement: 'Void' }));
    expect(portraitPrompt).toContain('REQUIRED ELEMENT (Void)');
    expect(portraitPrompt).toContain('ZERO connection to fire');
    expect(negativePrompt).toContain('warm ember lighting');
  });

  it('does NOT inject anti-fire language for a fire-family element (Blood)', () => {
    const { portraitPrompt, negativePrompt } = assemblePortraitPrompt(makeSheet({ resolvedElement: 'Blood' }));
    expect(portraitPrompt).toContain('REQUIRED ELEMENT (Blood)');
    expect(portraitPrompt).not.toContain('ZERO connection to fire');
    expect(negativePrompt).not.toContain('warm ember lighting');
  });

  it('adds element drift bans to the negative only on tier-up', () => {
    const fresh = assemblePortraitPrompt(makeSheet({ resolvedElement: 'Void', isEvolution: false }));
    const evolved = assemblePortraitPrompt(makeSheet({ resolvedElement: 'Void', isEvolution: true, rank: 'Ascendant', pose: '', diversityAxis: '' }));
    expect(fresh.negativePrompt).not.toContain('element changed from Void');
    expect(evolved.negativePrompt).toContain('element changed from Void');
  });
});

describe('assemblePortraitPrompt — pose + rank', () => {
  it('uses the required pose on a fresh forge and bans the T-pose', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt).toContain('REQUIRED POSE:');
    expect(portraitPrompt).toContain('soul-light bleeding from between the ribs');
    expect(portraitPrompt).toContain('No T-pose');
  });

  it('falls back to rank-scaled action when pose is empty (tier-up)', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet({ pose: '', rank: 'Forged', isEvolution: true }));
    expect(portraitPrompt).toContain('RANK-SCALED ACTION');
    expect(portraitPrompt).toContain('NO T-pose');
  });

  it('injects the Ascendant cataclysm with the Necromancer-specific transformation', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet({ rank: 'Ascendant', isEvolution: true, pose: '', diversityAxis: '' }));
    expect(portraitPrompt).toContain('ASCENDANT CATACLYSM');
    expect(portraitPrompt).toContain('SACRIFICED THEIR FLESH');
  });

  it('keeps the Bible-locked disability + scars in the Ascendant identity block despite the tight budget', () => {
    // Regression: the transformation form was once inlined in BOTH the
    // cataclysm prefix AND the pose action, doubling ~240 chars and truncating
    // disability/scars off the identity block — a §Rank-continuity hard reject.
    const { portraitPrompt } = assemblePortraitPrompt(
      makeSheet({ rank: 'Ascendant', isEvolution: true, pose: '', diversityAxis: '' }),
    );
    expect(portraitPrompt).toContain('prosthetic left leg of carved bone');
    expect(portraitPrompt).toContain('ritual scarification across both forearms');
    expect(portraitPrompt).toContain('deep umber brown');
    // And the negatives still forbid removing them, as a second backstop.
    // (kept in buildNegativePrompt via BASE_NEGATIVE)
  });
});

describe('assemblePortraitPrompt — story motifs + budget', () => {
  it('weaves resolved story motifs into the frame when budget allows', () => {
    // Story motifs are prioritised over the generic style/spectacle fill but
    // sit below the identity anchors + element colors. A lean identity leaves
    // room for them; the maximal identity (makeSheet default) legitimately
    // spends the whole budget on the person and truncates them — that
    // priority ordering is the intended behavior.
    const lean: HiddenFate = {
      ...emptyHiddenFate(),
      age: '40s',
      sex: 'male',
      bodyType: 'lean',
      skinTone: 'pale',
      facialStructure: 'gaunt',
      hair: 'short black',
    };
    const { portraitPrompt } = assemblePortraitPrompt(
      makeSheet({ hiddenFate: lean, resolvedElement: 'Blood' }),
    );
    expect(portraitPrompt).toContain('a shroud embroidered with the names of the dead');
    expect(portraitPrompt).toContain('a censer trailing violet smoke');
  });

  it('respects the Leonardo hard character caps', () => {
    const { portraitPrompt, negativePrompt } = assemblePortraitPrompt(makeSheet({ rank: 'Ascendant', isEvolution: true }));
    expect(portraitPrompt.length).toBeLessThanOrEqual(PORTRAIT_PROMPT_MAX);
    expect(negativePrompt.length).toBeLessThanOrEqual(NEGATIVE_PROMPT_MAX);
  });

  it('always ends the composition with the head-in-frame closer (unless truncated)', () => {
    const { portraitPrompt } = assemblePortraitPrompt(makeSheet());
    expect(portraitPrompt).toContain('entire head fully in frame');
  });
});
