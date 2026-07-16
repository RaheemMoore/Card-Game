import type { ArchetypeName, Rank, CardStats, ModifierStack } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';
import {
  getDominantStat,
  deriveStatRanks,
  getVisualMotif,
  getAbsenceMotifs,
} from '../data/powerSystem';

const RANK_DRAMATIC_DIRECTION: Record<Rank, string> = {
  Foundation:
    'Fantasy character portrait, painterly digital art, chest-up composition, single character centered, calm or ready stance, character at the beginning of their journey, detailed face, rich textures, high detail',
  Forged:
    'Fantasy character portrait, painterly digital art, dynamic action pose showing power, battle-ready stance, energy or aura visible around the character, mid-combat intensity, detailed face with battle experience, rich textures, high detail, dramatic lighting',
  Ascendant:
    'Fantasy character portrait, painterly digital art, ultimate form, explosive power display, dramatic pose channeling devastating energy, overwhelming aura filling the frame, legendary presence, climactic moment of peak power, detailed face radiating authority, rich textures, high detail, epic dramatic lighting',
};

const RANK_AGING: Record<Rank, string> = {
  Foundation:
    'Youthful face, unblemished skin, bright eyes full of potential, untested appearance, fresh and eager',
  Forged:
    'Weathered face with visible battle scars, harder eyes that have seen real combat, more muscular or seasoned build, faint lines of experience, confident and dangerous',
  Ascendant:
    'Ancient-looking eyes in a powerful face, deep scars telling stories of legendary battles, intense piercing gaze radiating wisdom and fury, physical form at absolute peak power but marked by countless wars, aura of someone who has conquered death itself',
};

const RANK_NEGATIVE_ADDITIONS: Partial<Record<Rank, string>> = {
  Forged: 'baby face, young looking, unmarked skin, innocent expression, peaceful, static pose',
  Ascendant: 'baby face, young looking, unmarked skin, innocent expression, peaceful, calm, static pose, subtle, understated',
};

export function assemblePortraitPrompt(
  archetype: ArchetypeName,
  rank: Rank,
  stats: CardStats,
  modifiers: ModifierStack,
): { prompt: string; negativePrompt: string } {
  const arch = ARCHETYPES[archetype];
  const dominant = getDominantStat(stats);
  const ranks = deriveStatRanks(stats);
  const dominantRank = dominant ? ranks[dominant]! : rank;

  const visualMotif = getVisualMotif(dominant, dominantRank);
  const absenceMotifs = getAbsenceMotifs(stats);

  const parts: string[] = [
    RANK_DRAMATIC_DIRECTION[rank],
    `Character archetype: ${archetype} — ${arch.identity}`,
    `Visual elements: ${arch.motifs}`,
    `Rank appearance (${rank}): ${arch.rankProgression[rank]}`,
    `Character maturity: ${RANK_AGING[rank]}`,
  ];

  if (rank !== 'Foundation') {
    parts.push(
      'This is the SAME character at a later stage of their journey — maintain consistent facial structure, skin tone, and distinguishing features while showing the passage of time and accumulated power',
    );
  }

  if (visualMotif) {
    parts.push(`Dominant trait visuals: ${visualMotif}`);
  }
  if (absenceMotifs.length > 0) {
    parts.push(`Weakness visuals: ${absenceMotifs.join('; ')}`);
  }

  parts.push(
    `Setting/backdrop: ${modifiers.setting}`,
    `Character demeanor: ${modifiers.demeanor}`,
    `Signature detail: ${modifiers.signatureDetail}`,
    `Lighting: ${modifiers.lighting}`,
  );

  const prompt = parts.join('. ');

  const baseNegative = [
    'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
    'extra limbs', 'extra fingers', 'disfigured', 'bad anatomy',
    'bad proportions', 'duplicate', 'multiple characters', 'split frame',
    'comic panels', 'UI elements', 'border', 'frame', 'card border',
  ].join(', ');

  const rankNegative = RANK_NEGATIVE_ADDITIONS[rank] ?? '';
  const negativePrompt = rankNegative ? `${baseNegative}, ${rankNegative}` : baseNegative;

  return { prompt, negativePrompt };
}
