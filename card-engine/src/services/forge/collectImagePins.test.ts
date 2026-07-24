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
    const build = options.find((o) => o.image?.build === 'towering')!;
    const weapon = options.find((o) => o.image?.weapon === 'bloodline_rapier')!;
    const companion = options.find((o) => o.image?.companion === 'winged_familiars')!;

    const pins = collectImagePins(
      'Vampire',
      'Nocturne',
      answersFor([form.id, build.id, weapon.id, companion.id]),
    );

    expect(pins.species).toBe('gothic_sovereign');
    expect(pins.build).toBe('towering');
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
      .filter((o) => o.questionId === 'vf_form')
      .map((o) => o.image?.species);
    expect(shadow).toContain('nosferatu');
    expect(shadow).toContain('mist_swarm');
    expect(shadow).not.toContain('gothic_sovereign');
  });

  test('ascension-only forms (Void) are never offered at the forge', () => {
    const voidForms = visualQuestionsFor('Vampire', 'Void').options.filter(
      (o) => o.questionId === 'vf_form',
    );
    expect(voidForms).toHaveLength(0);
  });

  test('unmatched option ids yield no pins', () => {
    const pins = collectImagePins('Barbarian', 'Fire', answersFor(['not-a-real-option']));
    expect(pins).toEqual({});
  });

  test('generic levers roll out to a non-Vampire archetype (build + weapon)', () => {
    const { options } = visualQuestionsFor('Barbarian', 'Fire');
    const build = options.find((o) => o.image?.build)!;
    const weapon = options.find((o) => o.image?.weapon)!;
    const pins = collectImagePins('Barbarian', 'Fire', answersFor([build.id, weapon.id]));
    expect(pins.build).toBe(build.image!.build);
    expect(pins.weapon).toBe(weapon.image!.weapon);
    // Barbarian has no companion pool, so no companion question is generated.
    expect(options.some((o) => o.questionId === 'vf_companion')).toBe(false);
  });
});
