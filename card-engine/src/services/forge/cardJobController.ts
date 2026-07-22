import type { Card } from '../../types/card';
import type { AbilitySlotType } from '../../types/abilities';
import { getCard } from '../storage';
import { regeneratePortrait } from '../regeneratePortrait';
import { tierUpCard } from '../tierUp';
import { generateAscendantPaths, type AscendantPath } from '../ascendantPaths';
import { getOverallRank } from '../../data/powerSystem';
import * as wallet from '../economy/walletService';
import * as ledger from '../economy/transactionLedger';
import { PREMIUM_PRICE_CATALOG } from '../../data/economy/premiumPriceCatalog';

/**
 * Card-detail job controller (reforge + tier-up).
 *
 * Regenerating a portrait or tiering a card up fires the same 20–60s paid
 * Claude → Leonardo chain the forge does. When that chain lived inside
 * CardDetail's local state, a plain SPA route change (open the Codex, glance at
 * the collection) unmounted the awaiting promise and the player lost track of
 * which card was cooking.
 *
 * This module owns the job instead — a framework-agnostic singleton with the
 * same subscribe/notify surface as forgeController, so a floating indicator can
 * observe it via useSyncExternalStore and the player can wander the app and
 * still be pulled back to the card when it's ready.
 *
 * WHY NO localStorage RESUME (unlike forgeController): the forge rebuilds its
 * card from deterministic inputs, so replaying an interrupted forge upserts the
 * same row — safe. Tier-up instead MUTATES the card's current stats (Foundation
 * → Forged bumps the numbers in place); replaying it after a hard reload would
 * double-bump the stats or double-charge. So the job lives only in module
 * memory: it survives every in-app screen change (the actual complaint) but a
 * full page reload ends it, and any reservation it was holding is refunded by
 * sweepOrphanedCardReservations() on the next startup. Nothing is silently
 * lost — the player's currency always comes back if the card didn't.
 */

export type ForgeResource = 'mana' | 'tech';

export type CardJobKind = 'reforge' | 'tierup';

export type CardJobStatus =
  | 'running'
  // tier-up Forged → Ascendant only: paths are generated, waiting for the
  // player to pick one in the card's modal before the second (portrait) phase.
  | 'awaiting-path'
  | 'succeeded'
  | 'failed';

export interface CardJobDiscovery {
  abilityId: string;
  slotType: AbilitySlotType;
  resource?: ForgeResource;
}

export interface CardJob {
  jobId: string;
  kind: CardJobKind;
  cardId: string;
  cardName: string;
  status: CardJobStatus;
  /** Human-readable phase, shown in the indicator + on the card. */
  step: string;
  reservationTxnId: string;
  startedAt: string;
  /** The card as it was when the job started — tier-up runs against this. */
  inputCard: Card;
  /** Present while status === 'awaiting-path'. */
  ascendantPaths?: AscendantPath[];
  /** tier-up result surfaced back to CardDetail on success. */
  portraitRegenerated?: boolean;
  newAbilityDiscovery?: CardJobDiscovery;
  error?: string;
}

const REGEN_PRICE = PREMIUM_PRICE_CATALOG.regenerate_portrait.premiumCost;
const EVOLVE_PRICE = PREMIUM_PRICE_CATALOG.evolve_card_art.premiumCost;

// ---- Store ------------------------------------------------------------

let currentJob: CardJob | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function getJob(): CardJob | null {
  return currentJob;
}

function setJob(next: CardJob | null): void {
  currentJob = next;
  notify();
}

function patchJob(patch: Partial<CardJob>): void {
  if (!currentJob) return;
  setJob({ ...currentJob, ...patch });
}

function newJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Public API -------------------------------------------------------

/**
 * Reserve premium currency and start a portrait reroll. Throws
 * wallet.InsufficientFundsError (caller shows the modal). No-op if a job is
 * already in flight.
 */
export function startReforge(card: Card): void {
  if (currentJob && currentJob.status !== 'succeeded' && currentJob.status !== 'failed') return;

  const reservation = wallet.reserve({
    currency: 'premium',
    amount: REGEN_PRICE,
    actionId: 'regenerate_portrait',
    cardId: card.cardId,
  });

  const job: CardJob = {
    jobId: newJobId(),
    kind: 'reforge',
    cardId: card.cardId,
    cardName: card.cardName,
    status: 'running',
    step: 'Painting portrait…',
    reservationTxnId: reservation.transactionId,
    startedAt: new Date().toISOString(),
    inputCard: card,
  };
  setJob(job);
  void runReforge(job);
}

/**
 * Reserve premium currency and start a tier-up. For Foundation → Forged this
 * runs straight through. For Forged → Ascendant it first generates the two
 * narrative paths and pauses at 'awaiting-path' for choosePath(). Throws
 * wallet.InsufficientFundsError (caller shows the modal). No-op if a job is
 * already in flight.
 */
export function startTierUp(card: Card): void {
  if (currentJob && currentJob.status !== 'succeeded' && currentJob.status !== 'failed') return;

  // Reserve once — the Ascendant path lookup's extra Claude call is bundled
  // into evolve_card_art per economy plan §4.2, so we never reserve twice.
  const reservation = wallet.reserve({
    currency: 'premium',
    amount: EVOLVE_PRICE,
    actionId: 'evolve_card_art',
    cardId: card.cardId,
  });

  const job: CardJob = {
    jobId: newJobId(),
    kind: 'tierup',
    cardId: card.cardId,
    cardName: card.cardName,
    status: 'running',
    step: 'Forging new form…',
    reservationTxnId: reservation.transactionId,
    startedAt: new Date().toISOString(),
    inputCard: card,
  };
  setJob(job);

  if (getOverallRank(card.stats) === 'Forged') {
    job.step = 'Divining fate…';
    setJob({ ...job });
    void loadAscendantPaths(job);
    return;
  }

  void runTierUp(job);
}

/**
 * Player picked an Ascendant path — run the second (portrait) phase against the
 * same reservation. Only valid while awaiting-path.
 */
export function choosePath(): void {
  const job = currentJob;
  if (!job || job.status !== 'awaiting-path') return;
  // The narrative was folded into the Bible-driven Ascendant Paths; the pick
  // itself just commits the player to advancing. See runTierUp's void of it.
  setJob({ ...job, status: 'running', step: 'Forging new form…', ascendantPaths: undefined });
  void runTierUp(job);
}

/**
 * Player backed out of the Ascendant modal before picking. Refund the held
 * reservation — no portrait was minted.
 */
export function cancelPath(): void {
  const job = currentJob;
  if (!job || job.status !== 'awaiting-path') return;
  refundOnce(job.reservationTxnId, 'user_cancelled_ascendant_modal');
  setJob(null);
}

/**
 * Clear the current job. Called once CardDetail has consumed the result (or the
 * failure) so it stops driving the UI + indicator.
 */
export function acknowledge(): void {
  setJob(null);
}

/**
 * Refund any `pending` reforge/tier-up reservation that no live job owns.
 * A hard reload drops the in-memory job (see file header) but leaves its
 * reservation pending; this heals it on the next startup. Call once at startup
 * after the ledger hydrates.
 */
export function sweepOrphanedCardReservations(): number {
  let reclaimed = 0;
  for (const txn of ledger.byStatus('pending')) {
    if (txn.actionId !== 'regenerate_portrait' && txn.actionId !== 'evolve_card_art') continue;
    wallet.refund(txn.transactionId, 'orphaned card-job reservation reclaimed on startup');
    reclaimed += 1;
  }
  return reclaimed;
}

// ---- Generation -------------------------------------------------------

async function runReforge(job: CardJob): Promise<void> {
  try {
    await regeneratePortrait(job.inputCard);
    commitOnce(job.reservationTxnId);
    if (currentJob?.jobId !== job.jobId) return;
    patchJob({ status: 'succeeded' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    refundOnce(job.reservationTxnId, message);
    if (currentJob?.jobId !== job.jobId) return;
    patchJob({ status: 'failed', error: reforgeFailureMessage(message) });
  }
}

async function loadAscendantPaths(job: CardJob): Promise<void> {
  try {
    const paths = await generateAscendantPaths(job.inputCard);
    if (currentJob?.jobId !== job.jobId) return;
    patchJob({ status: 'awaiting-path', step: 'Choose your Ascendant path', ascendantPaths: paths });
  } catch (err) {
    // Path generation failed — proceed without fusion rather than stranding
    // the player's reservation (mirrors the prior inline behavior).
    console.error('Ascendant paths generation failed:', err);
    if (currentJob?.jobId !== job.jobId) return;
    setJob({ ...job, status: 'running', step: 'Forging new form…' });
    void runTierUp(job);
  }
}

async function runTierUp(job: CardJob): Promise<void> {
  try {
    const result = await tierUpCard(job.inputCard);
    // tierUpCard catches Leonardo failures and returns portraitRegenerated=false
    // (keeping the old portrait). For a paid evolution that's an unfulfilled
    // promise — per economy plan §7.3 we refund and leave the card unchanged.
    if (!result.portraitRegenerated) {
      refundOnce(job.reservationTxnId, `portrait_failed`);
      if (currentJob?.jobId !== job.jobId) return;
      patchJob({
        status: 'failed',
        portraitRegenerated: false,
        error:
          `New portrait couldn't be generated. Your ${EVOLVE_PRICE} was refunded. ` +
          `Card is unchanged. Retry Tier Up when ready.`,
      });
      return;
    }
    commitOnce(job.reservationTxnId);
    if (currentJob?.jobId !== job.jobId) return;
    patchJob({
      status: 'succeeded',
      portraitRegenerated: true,
      newAbilityDiscovery: result.newAbilityDiscovery,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    refundOnce(job.reservationTxnId, message);
    if (currentJob?.jobId !== job.jobId) return;
    patchJob({
      status: 'failed',
      error: `Tier up failed: ${message}. Your ${EVOLVE_PRICE} was refunded.`,
    });
  }
}

function reforgeFailureMessage(detail: string): string {
  return (
    `Portrait regeneration failed: ${detail}. Your ${REGEN_PRICE} was refunded. ` +
    `Try again — Leonardo's content moderator sometimes blocks a specific roll but passes the next.`
  );
}

// Guarded commit/refund: act only while the reservation is still pending.
function commitOnce(txnId: string): void {
  const txn = ledger.byId(txnId);
  if (txn?.status === 'pending') wallet.commit(txnId);
}

function refundOnce(txnId: string, reason: string): void {
  const txn = ledger.byId(txnId);
  if (txn?.status === 'pending') wallet.refund(txnId, reason);
}

// ---- Read helper for CardDetail --------------------------------------

/** Re-read the freshly-saved card for a succeeded job. */
export function readResultCard(job: CardJob): Card | null {
  return getCard(job.cardId);
}
