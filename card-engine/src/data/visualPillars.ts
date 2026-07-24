import type { ArchetypeName } from '../types/card';
import type {
  ElementName,
  ImageDirective,
  StoryPillarAnswers,
  StoryPillarOption,
  StoryPillarQuestion,
} from '../types/bible';
import { formsFor } from '../services/imageEngine/formFamilies';
import { BODY_CLASSES, BODY_ALLOWLIST, type BodyClassId } from '../services/imageEngine/identityPools';
import { getWeaponPool } from './archetypeWeapons';
import { getCompanionPool } from './archetypeCompanions';
import { beastmasterSummonOptions, LYCAN_MOON_PHASE_IDS } from '../services/portraitAssembler';

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

// ---- Seraph — MORAL PATH (Good / Fallen / Balanced), chosen and LOCKED at the
// forge (2026-07-24, replaces the retired tier-up alignment recompute). The path
// value is the lowercase band id the claudeApi Seraph anchor + tierUp carry.
// Fallen + Light transmutes the element to Infernal at forge time (forgeController).
const SERAPH_PATH_OPTION: Record<string, { id: string; path: string; label: string }> = {
  good: { id: 'vf_seraph_good', path: 'good', label: 'The Good path — a radiant guardian of gold-and-white, wings of brilliant light, an intact halo' },
  fallen: { id: 'vf_seraph_fallen', path: 'fallen', label: 'The Fallen path — a corrupted but majestic ruined angel, charred wings, molten-obsidian black light' },
  balanced: { id: 'vf_seraph_balanced', path: 'balanced', label: 'The Balanced (Twilight) path — one figure split down the middle, radiant gold and charred obsidian at once' },
};

function seraphPathQuestion(): VisualQuestionSet {
  return {
    questions: [{ id: 'vf_seraph_path', pillarIndex: 1, prompt: 'Where does your contested spark fall?' }],
    // No image pin — the path drives narrativeAxis (resolveNarrativePath), not the
    // deterministic identity roll. collectImagePins ignores un-pinned options.
    options: Object.values(SERAPH_PATH_OPTION).map((o) => ({
      id: o.id,
      questionId: 'vf_seraph_path',
      text: o.label,
      tags: [],
    })),
  };
}

/**
 * Resolve the Seraph alignment path (band id) the player chose, from the answers.
 * Returns undefined for non-Seraph or if no path option was answered.
 */
export function resolveNarrativePath(
  archetype: ArchetypeName,
  answers: StoryPillarAnswers,
): string | undefined {
  if (archetype !== 'Seraph') return undefined;
  const byOptionId = new Map(Object.values(SERAPH_PATH_OPTION).map((o) => [o.id, o.path]));
  for (const a of answers.answers) {
    const path = byOptionId.get(a.optionId);
    if (path) return path;
  }
  return undefined;
}

// Beastmaster — the summoned APEX BEAST (a companion-style pick, NOT a body form:
// the Beastmaster stays human). Element-gated species; pins `summon` (never
// `species`). Replaces the generic companion question for Beastmaster.
function summonQuestion(element: ElementName): VisualQuestionSet {
  const options = beastmasterSummonOptions(element);
  if (options.length === 0) return { questions: [], options: [] };
  return {
    questions: [{ id: 'vf_summon', pillarIndex: 4, prompt: 'What beast answers your call?' }],
    options: options.map((o) =>
      vopt('vf_summon_' + o.id, 'vf_summon', `A ${o.label.toLowerCase()} of pure ${element.toLowerCase()}`, {
        summon: o.id,
      }),
    ),
  };
}

// Lycanthrope birth moon — the "minor slider" (Raheem): sets the Foundation
// transformation start stage on the fixed human→full-wolf ramp. Pins moonPhase.
const LYCAN_MOON_LABELS: Record<string, string> = {
  new_moon: 'New moon — born mostly human, the change barely stirring',
  crescent: 'Crescent moon — the first coarse fur and wolfish tells',
  half: 'Half moon — half-shifted, a powerful were-guardian',
  gibbous: 'Gibbous moon — mostly wolf, towering and furred',
  full: 'Full moon — born already a full Lycan Guardian',
};
function lycanMoonQuestion(): VisualQuestionSet {
  return {
    questions: [{ id: 'vf_moon', pillarIndex: 5, prompt: 'Under what moon were you born?' }],
    options: LYCAN_MOON_PHASE_IDS.map((id) =>
      vopt('vf_moon_' + id, 'vf_moon', LYCAN_MOON_LABELS[id] ?? id, { moonPhase: id }),
    ),
  };
}

/**
 * The visual (image-pinned) question set for an archetype's forge, gated by the
 * already-chosen element. Every archetype gets build + weapon + companion (where
 * a pool exists); the form question appears where FORM_FAMILIES gates one; Seraph
 * gets its moral-path question, Beastmaster its summoned-beast question, and
 * Lycanthrope an extra birth-moon slider.
 */
export function visualQuestionsFor(archetype: ArchetypeName, element: ElementName): VisualQuestionSet {
  const parts = [
    archetype === 'Seraph' ? seraphPathQuestion() : formQuestion(archetype, element),
    buildQuestion(archetype),
    weaponQuestion(archetype),
    archetype === 'Beastmaster' ? summonQuestion(element) : companionQuestion(archetype),
    archetype === 'Lycanthrope' ? lycanMoonQuestion() : { questions: [], options: [] },
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
