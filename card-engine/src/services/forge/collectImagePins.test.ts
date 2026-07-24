import { describe, test, expect } from 'vitest';
import { collectImagePins } from './collectImagePins';
import { visualQuestionsFor } from '../../data/visualPillars';
import type { StoryPillarAnswers } from '../../types/bible';

// Build an answers object by picking a specific option per question from the
// SAME generator the wizard uses, then assert collectImagePins recovers the
// pins those options carry.
function answersFor(optionIds: string[]): StoryPillarAnswers {
  return { answers: optionIds.map((optionId) => ({ questionId: '', optionId, answer: '' })) };
}

describe('collectImagePins — Vampire image-first', () => {
  test('resolves form + build + weapon + companion pins from chosen option ids', () => {
    const { options } = visualQuestionsFor('Vampire', 'Nocturne');
    const form = options.find((o) => o.image?.species === 'gothic_sovereign')!;
    const build = options.find((o) => o.image?.build === 'regal')!;
    const weapon = options.find((o) => o.image?.weapon === 'bloodline_rapier')!;
    const companion = options.find((o) => o.image?.companion === 'winged_familiars')!;

    const pins = collectImagePins(
      'Vampire',
      'Nocturne',
      answersFor([form.id, build.id, weapon.id, companion.id]),
    );

    expect(pins.species).toBe('gothic_sovereign');
    expect(pins.build).toBe('regal');
    expect(pins.weapon).toBe('bloodline_rapier');
    expect(pins.companion).toBe('winged_familiars');
    expect(pins.companionPresence).toBe('retinue');
  });

  test('the solitary companion option pins solitary (no companion id)', () => {
    const { options } = visualQuestionsFor('Vampire', 'Blood');
    const solitary = options.find((o) => o.image?.companionPresence === 'solitary')!;
    const pins = collectImagePins('Vampire', 'Blood', answersFor([solitary.id]));
    expect(pins.companionPresence).toBe('solitary');
    expect(pins.companion).toBeUndefined();
  });

  test('the element gates which forms are offered (Shadow ≠ Nocturne forms)', () => {
    const shadow = visualQuestionsFor('Vampire', 'Shadow').options
      .filter((o) => o.questionId === 'vam_form')
      .map((o) => o.image?.species);
    expect(shadow).toContain('nosferatu');
    expect(shadow).toContain('mist_swarm');
    expect(shadow).not.toContain('gothic_sovereign');
  });

  test('ascension-only forms (Void) are never offered at the forge', () => {
    const voidForms = visualQuestionsFor('Vampire', 'Void').options.filter(
      (o) => o.questionId === 'vam_form',
    );
    expect(voidForms).toHaveLength(0);
  });

  test('non-piloted archetypes yield no pins (keeps the humanoid default)', () => {
    const pins = collectImagePins('Barbarian', 'Fire', answersFor(['whatever']));
    expect(pins).toEqual({});
  });
});
