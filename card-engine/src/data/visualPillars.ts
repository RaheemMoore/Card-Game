import type { ArchetypeName } from '../types/card';
import type {
  ElementName,
  ImageDirective,
  StoryPillarOption,
  StoryPillarQuestion,
} from '../types/bible';
import { formsFor } from '../services/imageEngine/formFamilies';
import { BODY_CLASSES, BODY_ALLOWLIST, type BodyClassId } from '../services/imageEngine/identityPools';
import { getWeaponPool } from './archetypeWeapons';
import { getCompanionPool } from './archetypeCompanions';

/**
 * Image-first visual pillars (2026-07-24).
 *
 * The forge's overt visual choices, generated per-archetype and gated by the
 * already-chosen element. Each option carries an `image: ImageDirective` — that
 * is the whole point: the player's pick controls the portrait. Options still
 * read as short lines so the ritual holds together (image-first; lore is added
 * back as separate Story Pillar questions later).
 *
 * ONE SOURCE OF TRUTH: both the wizard and `collectImagePins` call
 * `visualQuestionsFor`, so a rendered option and its image pin can never drift.
 *
 * COVERAGE (2026-07-24 rollout):
 *   - build / weapon / companion — GENERIC, every archetype (from the existing
 *     BODY_ALLOWLIST / WEAPON_POOLS / COMPANION_POOLS pools). Companion only
 *     appears for archetypes that actually have a retinue pool.
 *   - form — only where FORM_FAMILIES has element-gated entries (Vampire today).
 *     Other archetypes' bespoke forms are still SCENE-rolled by the assembler
 *     until they are authored as explicit player choices in a later batch.
 */

export interface VisualQuestionSet {
  questions: StoryPillarQuestion[];
  options: StoryPillarOption[];
}

/** How many build silhouettes to offer per archetype (a spread from its allowlist). */
const BUILD_CHOICES = 6;

function vopt(
  id: string,
  questionId: string,
  text: string,
  image: ImageDirective,
  tags: string[] = [],
): StoryPillarOption {
  return { id, questionId, text, tags, image };
}

/** Trim a form concept to a short clause for the selection label. */
function shortFlavor(concept: string): string {
  const clause = concept.split(/[—;]/)[0]?.trim() ?? concept;
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

// Per-archetype prompt for the form question (falls back to a generic line).
const FORM_PROMPTS: Partial<Record<ArchetypeName, string>> = {
  Vampire: 'What shape does your power take?',
  Necromancer: 'What do you sacrifice your soul to become?',
  Lycanthrope: 'What is your role in the pack?',
  Android: 'What were you built to be?',
};

function formQuestion(archetype: ArchetypeName, element: ElementName): VisualQuestionSet {
  // Ascension forms are never offered at the forge (Ascendant-tier only).
  const all = formsFor(archetype).filter((f) => !f.ascensionOnly);
  if (all.length === 0) return { questions: [], options: [] };
  // Unified gate rule: forms whose gate matches the chosen element win (Vampire's
  // element→pair; Druid's Poison→corrupted); if none match, the ungated forms
  // show (role/form/division families, and Druid's non-Poison good set).
  const gatedMatch = all.filter((f) => f.gate === element);
  const ungated = all.filter((f) => !f.gate);
  const forms = gatedMatch.length > 0 ? gatedMatch : ungated;
  if (forms.length === 0) return { questions: [], options: [] };
  const questions: StoryPillarQuestion[] = [
    { id: 'vf_form', pillarIndex: 1, prompt: FORM_PROMPTS[archetype] ?? 'What form do you take?' },
  ];
  const options = forms.map((form) =>
    vopt('vf_form_' + form.id, 'vf_form', `${form.name} — ${shortFlavor(form.concept)}`, {
      species: form.id,
    }),
  );
  return { questions, options };
}

function buildQuestion(archetype: ArchetypeName): VisualQuestionSet {
  const ids = BODY_ALLOWLIST[archetype].slice(0, BUILD_CHOICES) as BodyClassId[];
  const options = ids.map((id) => {
    const cls = BODY_CLASSES[id];
    return vopt('vf_build_' + id, 'vf_build', `${cls.label} — ${cls.leoDescription}`, { build: id });
  });
  return { questions: [{ id: 'vf_build', pillarIndex: 2, prompt: 'What kind of body carries it?' }], options };
}

function weaponQuestion(archetype: ArchetypeName): VisualQuestionSet {
  const pool = getWeaponPool(archetype);
  if (pool.length === 0) return { questions: [], options: [] };
  const options = pool.map((w) => vopt('vf_weapon_' + w.id, 'vf_weapon', w.name, { weapon: w.id }));
  return { questions: [{ id: 'vf_weapon', pillarIndex: 3, prompt: 'What do you wield?' }], options };
}

function companionQuestion(archetype: ArchetypeName): VisualQuestionSet {
  const pool = getCompanionPool(archetype);
  if (pool.length === 0) return { questions: [], options: [] };
  const options: StoryPillarOption[] = [
    vopt('vf_companion_none', 'vf_companion', 'No one — I stand alone.', {
      companionPresence: 'solitary',
    }),
  ];
  for (const c of pool) {
    const label = c.descriptor.charAt(0).toUpperCase() + c.descriptor.slice(1);
    options.push(
      vopt('vf_companion_' + c.id, 'vf_companion', label, {
        companionPresence: 'retinue',
        companion: c.id,
      }),
    );
  }
  return { questions: [{ id: 'vf_companion', pillarIndex: 4, prompt: 'Who stands with you?' }], options };
}

/**
 * The visual (image-pinned) question set for an archetype's forge, gated by the
 * already-chosen element. Every archetype gets build + weapon + companion (where
 * a pool exists); the form question appears where FORM_FAMILIES gates one.
 */
export function visualQuestionsFor(archetype: ArchetypeName, element: ElementName): VisualQuestionSet {
  const parts = [
    formQuestion(archetype, element),
    buildQuestion(archetype),
    weaponQuestion(archetype),
    companionQuestion(archetype),
  ];
  return {
    questions: parts.flatMap((p) => p.questions),
    options: parts.flatMap((p) => p.options),
  };
}

/** Whether this archetype uses the image-first visual pillars (vs legacy chains). */
export function hasVisualPillars(_archetype: ArchetypeName): boolean {
  // Rollout 2026-07-24: every archetype is image-first. Kept as a function so a
  // future archetype could opt out without touching call sites.
  return true;
}
