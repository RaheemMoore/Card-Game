import type { ArchetypeName } from '../types/card';
import type { PrestigeRole, StoryPillarAnswers } from '../types/bible';
import { getBibleChapter } from '../data/archetypeBible';

/**
 * Prestige inference — Bible §Prestige roles.
 *
 * "Prestige roles should be earned through the generated narrative, not
 * selected directly by the player."
 *
 * A card's prestige is null unless the completed Story Pillar answers
 * clearly support one of the archetype's approved titles. Even then, the
 * inference is conservative — we err on the side of NOT assigning a
 * prestige rather than granting one that the narrative does not earn.
 *
 * Prestige is typically inferred at Ascendant tier-up (when the character's
 * full arc is on the table), though eligibility can be checked earlier for
 * previews.
 */

/**
 * Keyword patterns that gesture toward a leadership / authority arc. If
 * a card's Story Pillar answers hit a threshold count of these, the
 * character has narratively earned a role of responsibility.
 *
 * Case-insensitive substring match against the answer text.
 */
const LEADERSHIP_HINTS = [
  'lead',
  'chief',
  'trust me',
  'they turn to me',
  'sent to speak',
  'i decide',
  'elder',
  'pack',
  'clan',
  'chosen',
  'promise',
  'oath',
  'i was the only',
  'no one else',
] as const;

const SERVICE_HINTS = [
  'service',
  'teach',
  'heal',
  'guard',
  'protect',
  'carry',
  'stand between',
] as const;

/**
 * Rough eligibility heuristic. The Lore & Fantasy Director should be
 * consulted before adding new prestige titles or tuning these thresholds.
 */
function narrativeSupportsAuthority(answers: StoryPillarAnswers): boolean {
  const blob = answers.answers.map((a) => a.answer.toLowerCase()).join(' ');
  const leadershipHits = LEADERSHIP_HINTS.filter((k) => blob.includes(k)).length;
  const serviceHits = SERVICE_HINTS.filter((k) => blob.includes(k)).length;
  // Require at least 3 leadership hints and at least 2 service hints.
  // Authority without service is exactly the kind of self-elevation the
  // Bible avoids (see Vampire §14, Seraph §14, Lycanthrope §14).
  return leadershipHits >= 3 && serviceHits >= 2;
}

export interface PrestigeInferenceResult {
  role: PrestigeRole | null;
  /** True when the character narratively COULD earn a prestige but the exact
   *  title cannot yet be chosen (e.g. Forged tier — wait until Ascendant). */
  eligibleButDeferred?: boolean;
}

/**
 * Infer a prestige role from Story Pillar answers. Returns null when the
 * narrative does not clearly support one. Non-Ascendant cards always
 * defer — Bible §Rank Evolution puts prestige emergence at Ascendant.
 */
export function inferPrestige(
  archetype: ArchetypeName,
  answers: StoryPillarAnswers,
  rank: 'Foundation' | 'Forged' | 'Ascendant',
): PrestigeInferenceResult {
  const supportsAuthority = narrativeSupportsAuthority(answers);
  if (!supportsAuthority) return { role: null };
  if (rank !== 'Ascendant') return { role: null, eligibleButDeferred: true };

  const chapter = getBibleChapter(archetype);
  const approved = chapter.approvedPrestigeRoles;
  if (approved.length === 0) return { role: null };

  // Conservative default: pick the FIRST approved title for the archetype.
  // Later, we can build a matcher that reads the answer text against
  // each title's semantic signature. For now, the archetype's leading
  // prestige is the safest inference.
  const title = approved[0];

  // Build a one-sentence justification quoting the most authority-heavy
  // answer so the Codex + card detail page can show why the title stuck.
  const justificationAnchor = pickAuthorityAnchor(answers) ?? 'the character\'s completed narrative';

  return {
    role: {
      title,
      justification: `Earned through ${justificationAnchor}.`,
      inferredAtRank: 'Ascendant',
    },
  };
}

function pickAuthorityAnchor(answers: StoryPillarAnswers): string | null {
  for (const a of answers.answers) {
    const t = a.answer.toLowerCase();
    if (t.includes('lead') || t.includes('trust me') || t.includes('sent to speak')) {
      return `"${a.answer}"`;
    }
  }
  return answers.answers[0] ? `"${answers.answers[0].answer}"` : null;
}
