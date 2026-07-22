import type { ArchetypeName, Rank } from './card';

/**
 * Which generation ENGINE a proposal targets (2026-07-21 image/lore
 * decoupling). Every proposal is engine-first: exactly one engine per
 * proposal (no "both"). This is the director-facing dimension; `ProposalLayer`
 * below is the internal coarse tag it maps onto.
 *
 *  - 'lore'  → the Claude call (name/title/lore/hiddenFate/storyMotifs)
 *  - 'image' → the deterministic portrait assembler (Leonardo prompt)
 */
export type ProposalEngine = 'image' | 'lore';

/**
 * Which of the four layers a proposal is asking us to change — kept as an
 * INTERNAL coarse tag (the approval console, regen-verify, and layerSnapshot
 * key off it). Directors no longer pick this directly; they pick an engine +
 * a plain-language area (see data/archetypeLayers.ts) which maps onto a layer.
 */
export type ProposalLayer = 'A' | 'B' | 'C' | 'D';

/**
 * The recognized failure modes a director can pick. Engine-scoped: the first
 * five are Image-engine (portrait) issues; the last three are Lore-engine
 * (text) issues. The filing form shows only the set matching the chosen engine.
 */
export type ProposalFailureType =
  // Image engine
  | 'not_same_character'
  | 'wrong_archetype_vibe'
  | 'evolution_wrong'
  | 'lore_portrait_misaligned'
  | 'off_brand'
  // Lore engine
  | 'lore_off_canon'
  | 'pillar_options_weak'
  | 'tone_or_motifs_off';

/**
 * The plain-language AREA a director files against — the director-facing
 * successor to the raw A/B/C/D layer. Engine-scoped. Each area maps onto an
 * internal ProposalLayer (see data/archetypeLayers.ts areaToLayer). Stored in
 * the payload (not a column) so the approval console can show the specific
 * area without a schema change.
 */
export type ImageArea =
  | 'look_escalation'
  | 'props'
  | 'element_visuals'
  | 'global_rules';
export type LoreArea = 'canon' | 'pillars_elements' | 'lore_writing';
export type ProposalArea = ImageArea | LoreArea;

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'awaiting_claude'
  | 'awaiting_approval'
  | 'approved'
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
  classSignaturePoolSample: string[];
  /**
   * Snapshot of the live Image-Engine surfaces the deterministic assembler
   * ACTUALLY reads, captured on image-engine proposals. Replaces the retired
   * `statVisualsForCard` (powerSystem getVisualMotif) and `metaPromptBlock`
   * (getMetaPromptBlock) — both orphaned by the 2026-07-21 decoupling: the new
   * assembler never calls them, so snapshotting them recorded dead code. Absent
   * on lore-engine proposals. Strings, not blobs (honors the P1 payload-shrink).
   */
  imageSurfaces?: ImageEngineSnapshot;
}

/**
 * What the Image Engine (services/portraitAssembler.ts + its data pools +
 * archetypeHooks) resolves for this archetype, sampled at file time so a
 * proposal reviewed weeks later reflects the engine that actually ran.
 */
export interface ImageEngineSnapshot {
  /** styleLeadFor(archetype) — photoreal (Druid) vs painterly. */
  styleLead: string;
  /**
   * Per-rank resolved hook strings (posePrefix / mandatorySegment /
   * narrativeAnchor). `sampled` flags ranks whose hook uses Math.random
   * (Vampire feral, pose picks) — a single sample is illustrative, not canon.
   */
  hookOutputs: {
    rank: Rank;
    posePrefix: string;
    mandatorySegment: string;
    narrativeAnchor: string;
    sampled: boolean;
  }[];
  /** Pool id/label samples the assembler draws from (not full descriptors). */
  weaponPoolSample: string[];
  environmentPoolSample: string[];
  posePoolSample: string[];
  companionPoolSample: string[];
  /** Fire-family membership + which element-language fields feed the render. */
  elementHandling: { element: string; fireFamily: boolean; consumedFields: string[] };
  /**
   * Global assembler rules in force: the segment-order version tag, the
   * reserved negative leads, the Druid growth-suppressor subtraction flag, and
   * the bare-chest gate params (rank/sex/roll). Free-text so it survives the
   * assembler evolving without a schema change.
   */
  globalRules: string;
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
  /**
   * The plain-language area the director filed against (engine-scoped). The
   * `layer` column is derived from this; kept in the payload too so the
   * approval console can render the specific area, not just the coarse layer.
   * Absent on legacy rows filed before the engine-first reshape.
   */
  area?: ProposalArea;
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
  /**
   * Claude-authored, per-layer summary of what a WORKED proposal actually
   * changed — written during the /work-proposal flow before the proposal is
   * parked for approval. One entry per touched layer (A/B/C/D); untouched
   * layers are simply absent. This is the "what changed" the approval console
   * renders as bullets against the 4 layers, distinct from the free-text
   * `change` (the original request) and `layerSnapshot` (the pre-change state).
   */
  layerChanges?: LayerChange[];
  /**
   * Whether this proposal changes the PORTRAIT (art prompt / visual layers),
   * set during the /work-proposal flow. Lore-only changes (canon text, story
   * pillars) leave this false/undefined and need no before/after image — the
   * per-layer summary alone gates them. Image-affecting changes must show a
   * passing before/after regen. Keeps Leonardo spend to only the proposals
   * that actually touch the image (one generation per verify run).
   */
  affectsImage?: boolean;
  /**
   * The GitHub PR the /work-proposal flow opened for this change. `prNumber`
   * lets the guarded "Merge & ship" endpoint merge exactly that PR after Raheem
   * approves; `branch` is informational. Absent until a PR is opened.
   */
  prNumber?: number;
  branch?: string;
}

export interface LayerChange {
  layer: ProposalLayer;
  /** Short bulleted summary (may contain newlines) of what changed in this layer. */
  summary: string;
}

/**
 * Result of a regen-verify run. `before` is either the original Lab generation
 * the proposal was filed against (source 'lab') or the referenced card's
 * current portrait (source 'card'); `after` is a fresh generation with the
 * current pipeline. Both images live in the prompt-lab storage bucket and are
 * signed on demand from their object paths. `verdict`/`note` are set by the
 * reviewer after eyeballing the two portraits.
 */
export interface VerifyEvidence {
  ranAt: string;
  archetype: ArchetypeName;
  tier: 'Foundation' | 'Forged' | 'Ascendant';
  /**
   * Where the "before" image came from:
   *  - 'lab'  → the original Lab run referenced by payload.labRunId
   *  - 'card' → the referenced card's current portrait at verify time
   * Older rows predate this field and are treated as 'lab'.
   */
  source?: 'lab' | 'card';
  /** Original Lab run the proposal referenced (payload.labRunId), or a before-run id for card-sourced. */
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
  /**
   * Human-readable ticket, e.g. `IMG00042` / `LOR00042`. Server-assigned +
   * immutable. Null on legacy rows filed before ticketing landed — those keep
   * `id` (uuid) as their handle and render a neutral "legacy" chip.
   */
  ticketNumber: string | null;
  /** Which engine this proposal targets. See ProposalEngine. */
  engine: ProposalEngine;
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
