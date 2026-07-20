import type { ArchetypeName, NarrativeAxisId } from '../../types/card';
import type { ElementName } from '../../types/bible';

/**
 * Seraph corruption arc — narrative axis definition (P4, approved by
 * Raheem 2026-07-20).
 *
 * Seraphs are 50/50 angel/demon. The alignment score is the sum of
 * `alignmentWeight` tags on the player's Story Pillar answers
 * (data/storyPillars.ts), recomputed at tier-up. Three paths:
 *   - Good (score >= +1)
 *   - Fallen (score <= -1) — LOSES Light, gains the Fallen-exclusive
 *     element Infernal via elementTransmutation.
 *   - Balanced (score === 0) — earned-rare.
 *
 * "Resist the Fall": at tier-up the player may pay Gold once to shift the
 * score 1 step toward 0 (resistOverride).
 */

export interface NarrativeAxisBand {
  id: string;
  label: string;
  min: number;
  max: number;
  rare?: boolean;
}

export interface NarrativeAxisDefinition {
  axisId: NarrativeAxisId;
  appliesToArchetypes: ArchetypeName[];
  scoreRange: { min: number; max: number };
  bands: NarrativeAxisBand[];
  elementTransmutation?: { whenPath: string; from: ElementName; to: ElementName };
  resistOverride?: { shiftTowardCenter: number };
}

export const SERAPH_ALIGNMENT: NarrativeAxisDefinition = {
  axisId: 'seraph_alignment',
  appliesToArchetypes: ['Seraph'],
  scoreRange: { min: -4, max: 4 }, // 4 tagged questions × ±1 (NOT ±9 — architect over-estimated; corrected)
  bands: [
    { id: 'fallen', label: 'Fallen', min: -4, max: -1 },
    { id: 'balanced', label: 'Balanced', min: 0, max: 0, rare: true },
    { id: 'good', label: 'Good', min: 1, max: 4 },
  ],
  elementTransmutation: { whenPath: 'fallen', from: 'Light', to: 'Infernal' },
  resistOverride: { shiftTowardCenter: 1 },
};
