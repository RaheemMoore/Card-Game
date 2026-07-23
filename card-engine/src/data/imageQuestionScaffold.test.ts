import { describe, test, expect } from 'vitest';
import { ARCHETYPE_NAMES } from '../types/card';
import { IMAGE_QUESTION_SCAFFOLD } from './imageQuestionScaffold';
import {
  BODY_CLASSES,
  AGE_BANDS,
  FANTASY_MARKS,
  bespokeFormsFor,
  marksForArchetype,
} from '../services/imageEngine/identityPools';
import { getWeaponPool } from './archetypeWeapons';
import { getCompanionPool } from './archetypeCompanions';

const markIds = new Set(FANTASY_MARKS.map((m) => m.id));

describe('image-question scaffold — id integrity', () => {
  test('every archetype has at least one scaffold question', () => {
    for (const a of ARCHETYPE_NAMES) {
      expect(IMAGE_QUESTION_SCAFFOLD[a]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test('all pinned ids reference real pool entries and respect archetype gating', () => {
    for (const archetype of ARCHETYPE_NAMES) {
      const bespokeIds = new Set(bespokeFormsFor(archetype).map((b) => b.id));
      const archetypeMarkIds = new Set(marksForArchetype(archetype).map((m) => m.id));
      const weaponIds = new Set(getWeaponPool(archetype).map((w) => w.id));
      const companionIds = new Set(getCompanionPool(archetype).map((c) => c.id));

      for (const q of IMAGE_QUESTION_SCAFFOLD[archetype]) {
        for (const opt of q.options) {
          const img = opt.image;
          if (img.build) expect(BODY_CLASSES, `${archetype}: build ${img.build}`).toHaveProperty(img.build);
          if (img.age) expect(AGE_BANDS, `${archetype}: age ${img.age}`).toHaveProperty(img.age);
          if (img.mark) {
            expect(markIds.has(img.mark), `${archetype}: mark ${img.mark} not a real mark`).toBe(true);
            expect(archetypeMarkIds.has(img.mark), `${archetype}: mark ${img.mark} not affinity-tagged for it`).toBe(true);
          }
          if (img.species && img.species !== 'humanoid') {
            expect(bespokeIds.has(img.species), `${archetype}: species ${img.species} not a bespoke form for it`).toBe(true);
          }
          if (img.weapon) {
            expect(weaponIds.has(img.weapon), `${archetype}: weapon ${img.weapon} not in its pool`).toBe(true);
          }
          if (img.companion) {
            expect(companionIds.has(img.companion), `${archetype}: companion ${img.companion} not in its pool`).toBe(true);
          }
          if (img.companionPresence) {
            expect(['solitary', 'retinue']).toContain(img.companionPresence);
          }
        }
      }
    }
  });

  test('form (species) and company questions only appear where supported', () => {
    for (const archetype of ARCHETYPE_NAMES) {
      const hasBespoke = bespokeFormsFor(archetype).length > 0;
      const hasCompanions = getCompanionPool(archetype).length > 0;
      for (const q of IMAGE_QUESTION_SCAFFOLD[archetype]) {
        if (q.dimension === 'form') expect(hasBespoke, `${archetype} has a form question but no bespoke form`).toBe(true);
        if (q.dimension === 'company') expect(hasCompanions, `${archetype} has a company question but no companion pool`).toBe(true);
      }
    }
  });
});
