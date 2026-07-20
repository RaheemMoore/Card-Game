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
 * Card lineage the proposal references — the character being critiqued.
 * We ONLY store cardId + textual metadata (nameAndTitle, lore) per tier,
 * NEVER the portraitUrl. Portraits are looked up on-demand from the cards
 * table when a reviewer expands a proposal row. This keeps proposal
 * payloads small (was 1.25MB+ per row with inline data URLs, now ~4KB).
 * Non-existent tiers are simply missing from the map.
 */
export interface CardLineageRef {
  cardId: string;
  cardName: string;
  archetype: ArchetypeName;
  tiers: {
    Foundation?: { nameAndTitle: string; lore: string };
    Forged?: { nameAndTitle: string; lore: string };
    Ascendant?: { nameAndTitle: string; lore: string };
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
  /**
   * Set when the proposal was opened from a Prompt Lab test via "Send to
   * Workshop". The runId lets the regen-verify step re-run that exact
   * Lab generation with the shipped fix and attach before/after — closing
   * the Lab → Workshop → fix → verify loop.
   */
  labRunId?: string;
  /**
   * Attached by the regen-verify step (Workshop "Run regen verify" button)
   * on a shipped proposal. Re-runs the referenced Lab generation with the
   * current — i.e. post-fix — Claude + Leonardo pipeline and records the
   * before/after so a reviewer can confirm the fix actually changed the
   * output. Only object-path references are stored (never inline image
   * blobs), keeping the payload small per the P1 shrink.
   */
  verify?: VerifyEvidence;
}

/**
 * Result of a regen-verify run. `before` is the original Lab generation the
 * proposal was filed against; `after` is a fresh generation with the shipped
 * pipeline. Both images live in the prompt-lab storage bucket and are signed
 * on demand from their object paths. `verdict`/`note` are set by the reviewer
 * after eyeballing the two portraits.
 */
export interface VerifyEvidence {
  ranAt: string;
  archetype: ArchetypeName;
  tier: 'Foundation' | 'Forged' | 'Ascendant';
  /** Original Lab run the proposal referenced (payload.labRunId). */
  beforeRunId: string;
  beforeObjectPath: string | null;
  /** New Lab run created by the regen-verify pass. */
  afterRunId: string;
  afterObjectPath: string | null;
  verdict?: 'pass' | 'fail' | 'unsure';
  note?: string;
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
