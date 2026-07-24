import type { ArchetypeName } from '../types/card';
import type {
  ElementName,
  ImageDirective,
  StoryPillarOption,
  StoryPillarQuestion,
} from '../types/bible';
import { formsForGate } from '../services/imageEngine/formFamilies';
import { BODY_CLASSES, BODY_ALLOWLIST, type BodyClassId } from '../services/imageEngine/identityPools';
import { getWeaponPool } from './archetypeWeapons';
import { getCompanionPool } from './archetypeCompanions';

/**
 * Image-first visual pillars (2026-07-24).
 *
 * The forge's overt visual choices, generated as an element-gated question set
 * the StoryPillarWizard renders and `collectImagePins` re-resolves. Each option
 * carries an `image: ImageDirective` — that is the whole point: the player's
 * pick controls the portrait. Options still read as narrative lines so the
 * ritual holds together (image-first; lore rides along, added back later).
 *
 * ONE SOURCE OF TRUTH: both the wizard and `collectImagePins` call
 * `visualQuestionsFor`, so a form/build/weapon/companion option and its pin can
 * never drift apart.
 *
 * PILOT SCOPE: Vampire only. Every other archetype returns an empty set, so the
 * wizard falls back to the legacy `STORY_PILLAR_CHAINS` questions and the forge
 * keeps its `species:'humanoid'` default (no regression).
 */

export interface VisualQuestionSet {
  questions: StoryPillarQuestion[];
  options: StoryPillarOption[];
}

const EMPTY: VisualQuestionSet = { questions: [], options: [] };

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

// Curated Vampire build shortlist (a subset of BODY_ALLOWLIST.Vampire) — a
// spread of silhouettes that all read as a vampire. Image-first: the pick pins
// hiddenFate.bodyType via ImageDirective.build.
const VAMPIRE_BUILDS: BodyClassId[] = ['lean', 'willowy', 'towering', 'hollowed', 'regal', 'heroic'];

function vampireVisualQuestions(element: ElementName): VisualQuestionSet {
  const questions: StoryPillarQuestion[] = [];
  const options: StoryPillarOption[] = [];

  // Q1 — FORM (element-gated). Void's ascension forms are never offered at the
  // forge (Ascendant-tier only), so ascensionOnly forms are excluded.
  const forms = formsForGate('Vampire', element).filter((f) => !f.ascensionOnly);
  if (forms.length > 0) {
    questions.push({ id: 'vam_form', pillarIndex: 1, prompt: 'What shape does your power take?' });
    for (const form of forms) {
      options.push(
        vopt('vam_form_' + form.id, 'vam_form', `${form.name} — ${shortFlavor(form.concept)}`, {
          species: form.id,
        }),
      );
    }
  }

  // Q2 — BUILD.
  questions.push({ id: 'vam_build', pillarIndex: 2, prompt: 'What kind of body carries it?' });
  for (const id of VAMPIRE_BUILDS.filter((b) => BODY_ALLOWLIST.Vampire.includes(b))) {
    const cls = BODY_CLASSES[id];
    options.push(
      vopt('vam_build_' + id, 'vam_build', `${cls.label} — ${cls.leoDescription}`, { build: id }),
    );
  }

  // Q3 — WEAPON.
  const weapons = getWeaponPool('Vampire');
  if (weapons.length > 0) {
    questions.push({ id: 'vam_weapon', pillarIndex: 3, prompt: 'What do you wield?' });
    for (const w of weapons) {
      options.push(vopt('vam_weapon_' + w.id, 'vam_weapon', w.name, { weapon: w.id }));
    }
  }

  // Q4 — COMPANION / RETINUE.
  const companions = getCompanionPool('Vampire');
  questions.push({ id: 'vam_companion', pillarIndex: 4, prompt: 'Who attends you?' });
  options.push(
    vopt('vam_companion_none', 'vam_companion', 'No one — I walk alone.', {
      companionPresence: 'solitary',
    }),
  );
  for (const c of companions) {
    const label = c.descriptor.charAt(0).toUpperCase() + c.descriptor.slice(1);
    options.push(
      vopt('vam_companion_' + c.id, 'vam_companion', label, {
        companionPresence: 'retinue',
        companion: c.id,
      }),
    );
  }

  return { questions, options };
}

/**
 * The visual (image-pinned) question set for an archetype's forge, gated by the
 * already-chosen element. Empty for non-piloted archetypes.
 */
export function visualQuestionsFor(archetype: ArchetypeName, element: ElementName): VisualQuestionSet {
  if (archetype === 'Vampire') return vampireVisualQuestions(element);
  return EMPTY;
}

/** Whether this archetype uses the image-first visual pillars (vs legacy chains). */
export function hasVisualPillars(archetype: ArchetypeName): boolean {
  return archetype === 'Vampire';
}
