import type { ArchetypeName } from './card';

/**
 * Which of the four layers a proposal is asking us to change. See
 * data/archetypeLayers.ts for the plain-language explanation copy shown
 * in the workshop UI.
 */
export type ProposalLayer = 'A' | 'B' | 'C' | 'D';

/**
 * The five recognized failure modes a lore director can pick. These map
 * to the layer picker's guidance (D covers most Forged/Ascendant issues).
 */
export type ProposalFailureType =
  | 'not_same_character'
  | 'wrong_archetype_vibe'
  | 'evolution_wrong'
  | 'lore_portrait_misaligned'
  | 'off_brand';

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'awaiting_claude'
  | 'shipped'
  | 'rejected';

/**
 * Snapshot of the archetype's Layer state at the moment the proposal was
 * filed. Frozen inside the payload so a proposal reviewed weeks later can
 * still be compared against "what canon looked like when this was raised."
 */
export interface LayerSnapshot {
  canonIdentity: string;
  canonMotifs: string;
  canonRankProgression: { Foundation: string; Forged: string; Ascendant: string };
  statVisualsForCard?: string;
  classSignaturePoolSample: string[];
  metaPromptBlock: string;
}

/**
 * Card lineage the proposal references — the character being critiqued,
 * plus its Foundation/Forged/Ascendant art snapshots (whichever are
 * present in evolutionHistory) so a reviewer can see exactly what was
 * generated.
 */
export interface CardLineageRef {
  cardId: string;
  cardName: string;
  archetype: ArchetypeName;
  tiers: {
    Foundation?: { portraitUrl: string; nameAndTitle: string; lore: string };
    Forged?: { portraitUrl: string; nameAndTitle: string; lore: string };
    Ascendant?: { portraitUrl: string; nameAndTitle: string; lore: string };
  };
}

export interface ArchetypeProposalPayload {
  keep: string;
  change: string;
  rejectIf: string;
  notes?: string;
  referenceImageUrl?: string;
  layerSnapshot: LayerSnapshot;
  cardLineage?: CardLineageRef;
}

export interface ArchetypeProposal {
  id: string;
  archetype: ArchetypeName;
  layer: ProposalLayer;
  failureType: ProposalFailureType;
  status: ProposalStatus;
  submittedBy: string | null;
  cardId: string | null;
  payload: ArchetypeProposalPayload;
  commitSha: string | null;
  decidedReason: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
