import type { ArchetypeName, CardStats, Card, AbilityHistorySnapshot } from '../../types/card';
import type { CardAbilityReference } from '../../types/abilities';
import type { ElementSelection, StoryPillarAnswers } from '../../types/bible';
import { buildCardShell } from '../cardGenerator';
import { generateCardTextWithRetry } from '../claudeApi';
import { generatePortraitStrict, pickAbTestModel } from '../leonardoApi';
import { saveCard } from '../storage';
import { proposeAbility } from '../abilities/proposalService';
import { getAbilityStore, saveReference } from '../abilities/registry';
import { grantDiscoveryReward } from '../abilities/discoveryLedger';
import * as wallet from '../economy/walletService';
import * as ledger from '../economy/transactionLedger';
import { PREMIUM_PRICE_CATALOG } from '../../data/economy/premiumPriceCatalog';
import { getCurrentUserId } from '../persistence/supabaseClient';

/**
 * Forge job controller.
 *
 * The forge fires a long chain of paid calls (Claude → Leonardo, 20–60s). When
 * that chain lived inside the CardForge component, closing the tab or reloading
 * mid-forge orphaned the premium reservation forever (money gone, no card) and
 * even a plain SPA route change unmounted the awaiting promise.
 *
 * This module owns the job instead. It is a framework-agnostic singleton with a
 * subscribe/notify surface (same shape as walletService) so any component can
 * observe it via useSyncExternalStore, and it persists the job to localStorage
 * so a reload can resume it. Exactly one premium reservation exists per job; the
 * card id is derived from the job id so re-running (on resume) upserts the same
 * card row rather than creating a duplicate, and commit is guarded so it runs at
 * most once.
 */

export type ForgeResource = 'mana' | 'tech';

export interface ForgeInputs {
  archetype: ArchetypeName;
  stats: CardStats;
  storyPillars: StoryPillarAnswers;
  element: ElementSelection;
}

export type ForgeJobStatus = 'running' | 'succeeded' | 'failed';

export interface ForgeRelicDiscovery {
  abilityId: string;
  resource?: ForgeResource;
}

export interface ForgeJob {
  jobId: string;
  status: ForgeJobStatus;
  reservationTxnId: string;
  startedAt: string;
  inputs: ForgeInputs;
  card?: Card;
  relicDiscovery?: ForgeRelicDiscovery;
  error?: string;
}

const FORGE_PRICE = PREMIUM_PRICE_CATALOG.forge_card.premiumCost;

// A running job older than this on startup is not auto-resumed — its
// reservation is refunded instead, so a tab abandoned hours ago never
// silently re-spends our API budget on the next visit.
const RESUME_MAX_AGE_MS = 10 * 60 * 1000;

// ---- Store ------------------------------------------------------------

let currentJob: ForgeJob | null = null;

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

export function getJob(): ForgeJob | null {
  return currentJob;
}

// Keyed by uid so a shared device never resumes another account's forge. In
// the legacy (no-Supabase) path there is no uid; a fixed fallback keeps
// reload-resume working for that single localStorage user.
function storageKey(): string {
  const uid = getCurrentUserId();
  return uid ? `card-engine-forge-job:${uid}` : 'card-engine-forge-job:local';
}

function persist(): void {
  const key = storageKey();
  try {
    if (currentJob) {
      globalThis.localStorage?.setItem(key, JSON.stringify(currentJob));
    } else {
      globalThis.localStorage?.removeItem(key);
    }
  } catch {
    // localStorage full/unavailable — the in-memory job still drives the UI;
    // only reload-resume is lost. Not worth surfacing.
  }
}

function setJob(next: ForgeJob | null): void {
  currentJob = next;
  persist();
  notify();
}

function readPersistedJob(): ForgeJob | null {
  const key = storageKey();
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ForgeJob;
    if (!parsed || typeof parsed.jobId !== 'string' || typeof parsed.reservationTxnId !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function newJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Public API -------------------------------------------------------

/**
 * Reserve premium currency and kick off generation. Throws
 * wallet.InsufficientFundsError (caller shows the modal) if the balance is
 * short. A no-op if a job is already running.
 */
export function startForge(inputs: ForgeInputs): void {
  if (currentJob?.status === 'running') return;

  // Reserve up-front — surfaces InsufficientFundsError to the caller.
  const reservation = wallet.reserve({
    currency: 'premium',
    amount: FORGE_PRICE,
    actionId: 'forge_card',
  });

  const job: ForgeJob = {
    jobId: newJobId(),
    status: 'running',
    reservationTxnId: reservation.transactionId,
    startedAt: new Date().toISOString(),
    inputs,
  };
  setJob(job);
  void runForge(job);
}

/**
 * Clear the current job. Called when the player has seen the reveal (or the
 * failure) so it stops driving the UI and the persisted record is removed.
 */
export function acknowledge(): void {
  setJob(null);
}

/**
 * Startup reconciliation. Re-runs a recently-interrupted running job (reusing
 * the same reservation) or refunds an unresumable one. Leaves a persisted
 * succeeded job in place so the reveal + indicator still surface. Call once
 * after auth + ledger hydrate.
 */
export function resumeIfPending(): void {
  const job = readPersistedJob();
  if (!job) return;

  if (job.status !== 'running') {
    // succeeded → keep so CardForge can show the reveal / indicator can flag it.
    // failed → drop it; there's nothing to resume and the money was already
    // refunded before it was persisted.
    currentJob = job.status === 'succeeded' ? job : null;
    if (job.status !== 'succeeded') persist();
    notify();
    return;
  }

  const txn = ledger.byId(job.reservationTxnId);

  // The reservation already resolved — the prior run committed (card saved,
  // deterministic id means no duplicate) or was refunded. Nothing to redo.
  if (!txn || txn.status !== 'pending') {
    setJob(null);
    return;
  }

  const age = Date.now() - new Date(job.startedAt).getTime();
  if (Number.isNaN(age) || age > RESUME_MAX_AGE_MS) {
    wallet.refund(job.reservationTxnId, 'forge abandoned — reservation reclaimed on startup');
    setJob(null);
    return;
  }

  // Recent, still-pending, resumable: re-run against the same reservation.
  currentJob = job;
  notify();
  void runForge(job);
}

/**
 * Refund any `pending` forge reservation that no live job owns. Heals money
 * orphaned by the pre-controller bug (a tab closed mid-forge left the
 * reservation pending forever, silently reducing the balance). Call once at
 * startup AFTER resumeIfPending, so a job it just resumed keeps its reservation.
 */
export function sweepOrphanedReservations(): number {
  const ownedTxnId = currentJob?.status === 'running' ? currentJob.reservationTxnId : null;
  let reclaimed = 0;
  for (const txn of ledger.byStatus('pending')) {
    if (txn.actionId !== 'forge_card') continue;
    if (txn.transactionId === ownedTxnId) continue;
    wallet.refund(txn.transactionId, 'orphaned forge reservation reclaimed on startup');
    reclaimed += 1;
  }
  return reclaimed;
}

// ---- Generation (moved verbatim from CardForge.handleElementComplete) ----

async function runForge(job: ForgeJob): Promise<void> {
  const { archetype, stats, storyPillars, element } = job.inputs;
  // Deterministic id: a resumed re-run upserts the same card row instead of
  // minting a duplicate.
  const cardId = `card_${job.jobId}`;

  try {
    const shell = buildCardShell(archetype, stats);
    shell.cardId = cardId;

    const text = await generateCardTextWithRetry({
      archetype,
      stats,
      answers: storyPillars,
      element,
      cardId, // seeds the image-first identity roll (deterministic per forge)
      abilitySlotToFill: 'core',
    });

    // M3.6 A/B — rotate painterly Leonardo models on Foundation forges.
    const abModel = pickAbTestModel();
    const portrait = await generatePortraitStrict(
      text.portraitPrompt,
      text.negativePrompt,
      undefined,
      undefined,
      abModel,
    );

    let abilityHistorySnapshot: AbilityHistorySnapshot[] = [];
    let relicDiscovery: ForgeRelicDiscovery | undefined;
    if (text.abilityCandidate) {
      try {
        const outcome = proposeAbility(getAbilityStore(), {
          candidate: text.abilityCandidate,
          userId: getCurrentUserId() ?? 'anon',
        });
        if (outcome.kind === 'attached') {
          const ref: CardAbilityReference = {
            cardId: shell.cardId,
            abilityId: outcome.abilityId,
            abilityVersionId: outcome.abilityVersionId,
            slotType: 'core',
            localTier: 'Foundation',
            displayOrder: 0,
          };
          saveReference(ref);
          abilityHistorySnapshot = [{
            abilityId: outcome.abilityId,
            abilityVersionId: outcome.abilityVersionId,
            slotType: 'core',
          }];
          if (outcome.firstDiscoveryForPlayer) {
            const reward = grantDiscoveryReward(getAbilityStore(), outcome.abilityId);
            if (reward.kind === 'granted' && import.meta.env.DEV) {
              const summary = reward.items.map((i) => `+${i.amount} ${i.currency}`).join(', ');
              console.debug(`[forge] discovery reward granted: ${summary}`);
            }
            const version = getAbilityStore().getCurrentVersion(outcome.abilityId);
            const resource: ForgeResource | undefined =
              version?.resourceType === 'mana' || version?.resourceType === 'tech'
                ? version.resourceType
                : undefined;
            relicDiscovery = { abilityId: outcome.abilityId, resource };
          }
        } else if (outcome.kind === 'rejected') {
          console.warn('[forge] ability candidate rejected:', outcome.errors);
        }
      } catch (err) {
        console.warn('[forge] ability proposal failed, card ships without ability:', err);
      }
    }

    const fullCard: Card = {
      ...shell,
      cardName: text.cardName,
      nameAndTitle: text.nameAndTitle,
      lore: text.lore,
      portraitAsset: portrait.dataUrl,
      generationModel: portrait.modelKey,
      storyPillars,
      elementSelection: element,
      hiddenFate: text.hiddenFate,
      abilityHistory: abilityHistorySnapshot.length > 0
        ? { Foundation: abilityHistorySnapshot }
        : undefined,
    };

    saveCard(fullCard);
    commitOnce(job.reservationTxnId);

    // The job may have been acknowledged/replaced while awaiting — only write
    // back if this is still the live job.
    if (currentJob?.jobId !== job.jobId) return;
    setJob({ ...job, status: 'succeeded', card: fullCard, relicDiscovery });
  } catch (err) {
    refundOnce(job.reservationTxnId, err instanceof Error ? err.message : String(err));
    if (currentJob?.jobId !== job.jobId) return;
    setJob({ ...job, status: 'failed', error: err instanceof Error ? err.message : String(err) });
  }
}

// Guarded commit/refund: on a resumed re-run the reservation may already have
// resolved. Only act while it is still pending.
function commitOnce(txnId: string): void {
  const txn = ledger.byId(txnId);
  if (txn?.status === 'pending') wallet.commit(txnId);
}

function refundOnce(txnId: string, reason: string): void {
  const txn = ledger.byId(txnId);
  if (txn?.status === 'pending') wallet.refund(txnId, reason);
}
