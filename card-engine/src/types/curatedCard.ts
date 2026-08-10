/**
 * The permanent roster — the Workshop's output types.
 *
 * Direction change (Raheem, 2026-08-10). The game stops generating characters
 * at runtime. Raheem + Tori hand-curate ~10 CHARACTERS per archetype, and each
 * character is produced in every element its archetype allows.
 *
 *   Story Pillar answers  →  which CHARACTER you get
 *   Element choice        →  which VARIANT of that character
 *
 * "Only cards that go through this workshop and are now labeled as permanent
 * cards will be included in the game." Everything in `Card` / public.cards is
 * TEMPORARY and stays that way. These types are the other side of that line.
 *
 * Schema: supabase/migrations/20260810_curated_roster.sql
 */

import type { ArchetypeName, Rank } from './card';
import type {
  ElementBond,
  ElementName,
  HiddenFate,
  ImageDirective,
  PrestigeRole,
} from './bible';

// ---------- Status ----------

/**
 * The workflow state machine. A character's journey from an idea to a thing
 * that exists in the game, across two surfaces.
 *
 *   draft          being set up in the Workshop
 *   seeded         a bench candidate is chosen and the three rank images are
 *                  being made OUTSIDE the app. A real working state, not a
 *                  nicety — without it a half-started character is invisible on
 *                  the roster board and gets stranded
 *   awaiting_lore  proposal sent; sitting on Tori's desk in the studio wiki
 *   lore_ready     Tori confirmed; sitting in the Workshop's review queue
 *   approved       passed final review; its variants may now be published
 *   retired        pulled from the roster
 *
 * Schema: supabase/migrations/20260811_curated_roster_lore_workflow.sql
 */
export type CuratedStatus =
  | 'draft'
  | 'seeded'
  | 'awaiting_lore'
  | 'lore_ready'
  | 'approved'
  | 'retired';

/**
 * The publication state — a separate lifecycle from the workflow above. The
 * character passes review once; then each of its element variants is published
 * on its own schedule, because a Monk has eight and must not wait for all of
 * them.
 */
export type CuratedVariantStatus = 'draft' | 'permanent' | 'hidden';

/**
 * `bespoke` — three images generated for this element specifically.
 * `derived`  — reuses the character's master art.
 * Recorded so we always know which variants got real art and which are wearing
 * the master's (Raheem's "mixed" call, 2026-08-10).
 */
export type CuratedArtMode = 'bespoke' | 'derived';

// ---------- Art ----------

/**
 * One rank's finished art and text. Deliberately NOT `EvolutionHistory` — that
 * type is keyed stat-first then rank, holds only PAST ranks, and is written in
 * exactly one place (services/tierUp.ts snapshotCurrentState). A curated
 * variant needs all three ranks present and addressable, so it keeps its own
 * clean rank map. When the future matcher instantiates a player card it copies
 * the current rank's fields onto the Card and lets tier-up keep working
 * untouched.
 */
export interface CuratedRankArt {
  rank: Rank;
  /** Public URL in the `curated-art` bucket. */
  portraitUrl: string;
  /** Object path, kept for provenance and re-upload. */
  storagePath: string;
  cardName: string;
  nameAndTitle: string;
  lore: string;
}

// ---------- Matching ----------

/**
 * Which existing Story Pillar options point at this character — the payload the
 * player-side matcher will consume.
 *
 * Bound by `optionId`, deliberately. A StoryPillarAnswer persists only
 * `{questionId, optionId, answer}` and NOT the option's tags, so anything
 * matching on tags has to re-resolve them through a Map (see
 * services/forge/collectImagePins.ts). Binding on the id sidesteps that
 * entirely, and avoids the answer-text substring matching that
 * elements.ts:elementIsNarrativelyEligible and prestigeInference.ts rely on —
 * which is why a Lycanthrope option has to literally contain the word "poison"
 * in its prose today.
 */
export interface AnswerBinding {
  questionId: string;
  optionIds: string[];
  /** Default 10. Raise it for an answer that is signature to this character. */
  weight: number;
}

/** The one authored visual question that breaks ties between equal scorers. */
export interface VisualTiebreakerClaim {
  questionId: string;
  optionId: string;
}

// ---------- Provenance ----------

/** What the Image Engine produced, when a character came off the bench. */
export interface CuratedSeed {
  /** prompt_test_runs.id */
  runId: string;
  /** prompt_test_batches.id */
  batchId: string;
  imageUrl: string;
  /** The assembled prompt, snapshotted — the engine's pools drift over time. */
  promptSnapshot: string;
  /** Exactly what was pinned, so Stage 3 can pre-fill what we already know. */
  directive: ImageDirective;
}

export interface CuratedProvenance {
  source: 'generated' | 'upload' | 'promoted';
  /** Set when this crossed the boundary from an existing temporary card. */
  promotedFromCardId?: string;
  authoredBy: string;
  notes?: string;
}

// ---------- Review ----------

/**
 * The argument about whether this character is good enough, kept attached to
 * the character. Raheem: "Make sure we figure out a good question in
 * conversations before something becomes permanent." The checklist is the gate;
 * this is where the judgment actually happens, and six months later it is still
 * here.
 *
 * The thread travels between BOTH surfaces — the Workshop's review space and
 * Tori's desk in the wiki — so a send-back and the reply to it sit next to each
 * other rather than in two systems.
 */
export interface ReviewNote {
  id: string;
  author: string;
  authoredAt: string;
  /**
   * A plain note is commentary. A `send_back` is a note with consequences: it
   * returned the character to `awaiting_lore`, and it is what Tori sees on her
   * desk explaining why.
   */
  kind: 'note' | 'send_back';
  /** Which surface the note came from. */
  origin: 'workshop' | 'desk';
  body: string;
}

/** The named human decision. The final entry in the review thread. */
export interface SignOff {
  by: string;
  at: string;
  note: string;
}

// ---------- Loose drafts ----------

/**
 * The lore itself — Tori's work, written at her desk in the studio wiki rather
 * than in the Workshop (Raheem, 2026-08-10: the lore director owns the lore for
 * every card before it becomes permanent).
 *
 * The card's NAME lives here, not on the character, because naming is a lore
 * act. `displayName` on the character is only the operators' working handle for
 * a roster slot — "the scarred one" — and may never be what a player sees.
 */
export interface LoreEntry {
  cardName: string;
  nameAndTitle: string;
  /** A paragraph per rank. A card with no Ascendant lore is not finished. */
  rankLore: Partial<Record<Rank, string>>;
}

/**
 * A prior version of the lore. Appended, never overwritten — a send-back from
 * review must NOT clear Tori's draft. It is an edit request, not a reset.
 */
export interface LoreDraft extends LoreEntry {
  id: string;
  authoredAt: string;
  author: string;
}

// ---------- The character ----------

export interface CuratedCharacter {
  id: string;
  archetype: ArchetypeName;
  /** 1..10 — the roster slot. */
  slotIndex: number;
  status: CuratedStatus;
  /** The operators' working handle for this roster slot. Not the card's name. */
  displayName: string;

  // ---- The Workshop's half ----

  /**
   * Authored by reading the art, not invented by a model. This inverts the old
   * pipeline — the images are the truth and the sheet describes them, which is
   * what makes Bible §Rank continuity correct by construction (all three ranks
   * are in hand at once) and is what gives Tori facts to write against instead
   * of a guess.
   */
  identity: HiddenFate;
  /** Set only when a human has accepted the identity sheet field by field. */
  identityAcceptedAt?: string;

  // NOTE — there are deliberately no stats here (Raheem, 2026-08-10).
  //
  // A curated character is an IDENTITY, not a statline. When a player pulls
  // one, their stats are rolled fresh inside the archetype's CLASS_AFFINITY
  // bias tiers and they level them up through play. Two players who match to
  // the same character do not get the same numbers.
  //
  // That keeps progression meaningful — the thing that is fixed is who they
  // are, and the thing you earn is what they can do. Authoring a statline here
  // would quietly make every copy of a character identical and turn levelling
  // into catch-up rather than growth.

  /** When the proposal was sent to Tori's desk. */
  proposedAt?: string;

  // ---- Tori's half ----

  /** A one-paragraph premise the Workshop can carry into the proposal. */
  coreLore: string;
  /** The finished lore. Written at Tori's desk. */
  lore?: LoreEntry;
  /** Appended on every revision; a send-back never clears it. */
  loreDrafts: LoreDraft[];
  loreConfirmedBy?: string;
  loreConfirmedAt?: string;
  prestige?: PrestigeRole;

  /** Claimed by Tori — the questions come out of who the character is. */
  answerBindings: AnswerBinding[];
  visualTiebreaker?: VisualTiebreakerClaim;

  /** The `derived` art mode's source set. */
  masterArt?: Partial<Record<Rank, CuratedRankArt>>;

  seed?: CuratedSeed;
  provenance: CuratedProvenance;
  reviewThread: ReviewNote[];
}

// ---------- The variant ----------

export interface CuratedVariant {
  id: string;
  characterId: string;
  element: ElementName;
  bond: ElementBond;
  status: CuratedVariantStatus;
  artMode: CuratedArtMode;
  ranks: Partial<Record<Rank, CuratedRankArt>>;
  /**
   * A short addendum, never a rewrite. The Fire version and the Ice version are
   * the SAME PERSON (Raheem, 2026-08-10) — one name, one backstory; the element
   * is how their power manifests.
   */
  elementLore?: string;
  signOff?: SignOff;
}

// ---------- Row shapes ----------

/** Mirrors public.curated_characters. */
export interface CuratedCharacterRow {
  id: string;
  archetype: string;
  slot_index: number;
  status: CuratedStatus;
  display_name: string | null;
  data: CuratedCharacter;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Mirrors public.curated_variants. */
export interface CuratedVariantRow {
  id: string;
  character_id: string;
  element: string;
  status: CuratedVariantStatus;
  art_mode: CuratedArtMode;
  data: CuratedVariant;
  created_at?: string;
  updated_at?: string;
}

// ---------- Helpers ----------

/** Every rank a finished variant must carry. */
export const CURATED_RANKS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

/** Slots per archetype on the roster board. */
export const ROSTER_SLOTS_PER_ARCHETYPE = 10;

/** Default binding weight. Raised only for a character's signature answers. */
export const DEFAULT_BINDING_WEIGHT = 10;

export function curatedCharacterId(archetype: ArchetypeName, slug: string): string {
  return `char_${archetype.toLowerCase().replace(/\s+/g, '_')}_${slug}`;
}

export function curatedVariantId(characterId: string, element: ElementName): string {
  return `var_${characterId.replace(/^char_/, '')}_${element.toLowerCase()}`;
}

/** Storage path for a piece of curated art. `_master` is the derived-art source. */
export function curatedArtPath(
  characterId: string,
  scope: ElementName | '_master',
  rank: Rank,
  ext: string,
): string {
  return `${characterId}/${scope === '_master' ? '_master' : scope.toLowerCase()}/${rank.toLowerCase()}.${ext}`;
}
