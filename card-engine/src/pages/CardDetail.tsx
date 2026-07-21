import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCard, deleteCard, saveCard } from '../services/storage';
import { CardRenderer } from '../components/CardRenderer';
import { BORDER_COLORS } from '../data/stats';
import type { StatName, Card, ArtSnapshot, Rank } from '../types/card';
import {
  deriveRank,
  getOverallRank,
  computeRankSum,
  getStatNames,
} from '../data/powerSystem';
import { canTierUp, tierUpCard, applySeraphTransmutation } from '../services/tierUp';
import { resistFall } from '../services/narrativeAxisService';
import { SERAPH_ALIGNMENT } from '../data/narrativeAxes';
import { resistFallActionId, resistFallCost } from '../services/economy/resistFall';
import { regeneratePortrait } from '../services/regeneratePortrait';
import { generateAscendantPaths, type AscendantPath } from '../services/ascendantPaths';
import * as wallet from '../services/economy/walletService';
import { PREMIUM_PRICE_CATALOG } from '../data/economy/premiumPriceCatalog';
import { CurrencyCost } from '../components/economy/CurrencyCost';
import { InsufficientFundsModal } from '../components/economy/InsufficientFundsModal';
import { useBalance } from '../services/economy/useWallet';
import {
  getReferencesForCard,
  getDefinition,
  getCurrentVersion,
  getArtForAbility,
} from '../services/abilities/registry';
import { RelicDiscoveryModal } from '../components/RelicDiscoveryModal';
import type { BadgeResource, RelicMoment } from '../components/abilities';
import { getQuestionsForArchetype } from '../data/storyPillars';
import { getElementVisual, elementGlowShadow } from '../data/elementVisuals';

const REGEN_PRICE = PREMIUM_PRICE_CATALOG.regenerate_portrait.premiumCost;
const EVOLVE_PRICE = PREMIUM_PRICE_CATALOG.evolve_card_art.premiumCost;

const STAT_COLORS: Record<StatName, { bg: string; border: string; text: string }> = {
  Atk:  { bg: 'rgba(220,38,38,0.1)', border: '#dc2626', text: '#ef4444' },
  Def:  { bg: 'rgba(37,99,235,0.1)',  border: '#2563eb', text: '#60a5fa' },
  Mana: { bg: 'rgba(124,58,237,0.1)', border: '#7c3aed', text: '#a78bfa' },
  Tech: { bg: 'rgba(217,119,6,0.1)',  border: '#d97706', text: '#fbbf24' },
};

const RANK_BADGE_COLORS = {
  Foundation: { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af' },
  Forged:     { bg: 'rgba(59,130,246,0.2)',  text: '#60a5fa' },
  Ascendant:  { bg: 'rgba(234,179,8,0.2)',   text: '#fbbf24' },
};

export function CardDetail() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [card, setCard] = useState<Card | null>(() => cardId ? getCard(cardId) : null);
  const [isTieringUp, setIsTieringUp] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [viewingTierIdx, setViewingTierIdx] = useState(-1); // -1 = current
  const [tierUpWarning, setTierUpWarning] = useState<string | null>(null);
  // Gate 7A: newly-discovered ability on this tier-up → Relic modal. Moment
  // depends on which slot filled: signature = evolution, ultimate = ultimate.
  const [relicDiscovery, setRelicDiscovery] = useState<
    { abilityId: string; moment: RelicMoment; resource?: BadgeResource } | null
  >(null);
  // Ascendant Whisper Fusion: null = not open, [] = loading, [p1, p2] = ready
  const [ascendantPaths, setAscendantPaths] = useState<AscendantPath[] | null>(null);
  const [isLoadingPaths, setIsLoadingPaths] = useState(false);
  const [insufficientFor, setInsufficientFor] = useState<
    | null
    | { currency: 'premium'; required: number; actionLabel: string }
  >(null);
  const premiumBalance = useBalance('premium');
  const goldBalance = useBalance('gameplay');
  const [isResisting, setIsResisting] = useState(false);
  const [loreExpanded, setLoreExpanded] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  // Ascendant tier-up reservation must be held across the modal — the wallet
  // is charged when the user clicks Tier Up, but the actual generation waits
  // for the path pick. Kept in a ref so re-renders don't lose the txn ID.
  const pendingTierUpTxnId = useRef<string | null>(null);

  // Hoisted above the early return so rules-of-hooks isn't violated when the
  // card lookup fails. All null-card branches return safe defaults; the real
  // computation is guarded internally.
  const tierTimeline = useMemo(() => (card ? buildTierTimeline(card) : []), [card]);
  const viewState = useMemo(() => {
    if (!card) return null;
    const overallRank = getOverallRank(card.stats);
    const allTiers = [...tierTimeline, { rank: overallRank as Rank, snapshot: null }];
    const currentIdx = viewingTierIdx === -1 ? allTiers.length - 1 : viewingTierIdx;
    const isViewingHistory =
      currentIdx !== allTiers.length - 1 && !!allTiers[currentIdx]?.snapshot;
    const displayCard = isViewingHistory
      ? (() => {
          const snap = allTiers[currentIdx].snapshot!;
          return {
            ...card,
            portraitAsset: snap.portraitUrl,
            cardName: snap.cardName,
            nameAndTitle: snap.nameAndTitle ?? snap.cardName,
            lore: snap.lore,
          };
        })()
      : card;
    return { overallRank, allTiers, currentIdx, isViewingHistory, displayCard };
  }, [card, tierTimeline, viewingTierIdx]);

  if (!card) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-4">
        <h1 className="font-fantasy text-2xl font-bold text-ivory">Card Not Found</h1>
        <button
          onClick={() => navigate('/collection')}
          className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
            font-fantasy text-sm transition-colors"
        >
          Back to Collection
        </button>
      </div>
    );
  }

  function handleDelete() {
    if (!cardId) return;
    deleteCard(cardId);
    navigate('/collection');
  }

  async function handleRegeneratePortrait() {
    if (!card || isRegenerating) return;

    let reservation;
    try {
      reservation = wallet.reserve({
        currency: 'premium',
        amount: REGEN_PRICE,
        actionId: 'regenerate_portrait',
        cardId: card.cardId,
      });
    } catch (err) {
      if (err instanceof wallet.InsufficientFundsError) {
        setInsufficientFor({
          currency: 'premium',
          required: REGEN_PRICE,
          actionLabel: 'Rebuilding this portrait',
        });
        return;
      }
      throw err;
    }

    setIsRegenerating(true);
    setTierUpWarning(null);
    try {
      const updated = await regeneratePortrait(card);
      wallet.commit(reservation.transactionId);
      setCard(updated);
    } catch (err) {
      wallet.refund(
        reservation.transactionId,
        err instanceof Error ? err.message : String(err),
      );
      console.error('Portrait regeneration failed:', err);
      setTierUpWarning(
        `Portrait regeneration failed: ${err instanceof Error ? err.message : String(err)}. ` +
          `Your ${REGEN_PRICE} was refunded. Try again — Leonardo's content moderator sometimes blocks a specific roll but passes the next.`,
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleTierUp() {
    if (!card || isTieringUp || isLoadingPaths) return;
    setTierUpWarning(null);

    // Reserve once. The Ascendant path (Forged→Ascendant) makes an extra
    // Claude call for path options; per plan Section 4.2 this cost is bundled
    // into evolve_card_art so we do NOT reserve twice.
    let reservation;
    try {
      reservation = wallet.reserve({
        currency: 'premium',
        amount: EVOLVE_PRICE,
        actionId: 'evolve_card_art',
        cardId: card.cardId,
      });
    } catch (err) {
      if (err instanceof wallet.InsufficientFundsError) {
        setInsufficientFor({
          currency: 'premium',
          required: EVOLVE_PRICE,
          actionLabel: 'Evolving this card',
        });
        return;
      }
      throw err;
    }
    pendingTierUpTxnId.current = reservation.transactionId;

    const currentRank = getOverallRank(card.stats);
    if (currentRank === 'Forged') {
      setIsLoadingPaths(true);
      try {
        const paths = await generateAscendantPaths(card);
        setAscendantPaths(paths);
      } catch (err) {
        console.error('Ascendant paths generation failed:', err);
        setTierUpWarning(`Couldn't generate Ascendant paths: ${err instanceof Error ? err.message : String(err)}. Proceeding without fusion.`);
        await runTierUp(undefined);
      } finally {
        setIsLoadingPaths(false);
      }
      return;
    }

    // Foundation → Forged: no fusion, straight through.
    await runTierUp(undefined);
  }

  async function runTierUp(ascendantNarrative: string | undefined) {
    if (!card) return;
    const txnId = pendingTierUpTxnId.current;
    setIsTieringUp(true);
    setTierUpWarning(null);
    try {
      // ascendantNarrative was folded into the Bible-driven Ascendant Paths
      // per Bible §Rank Evolution — the paths themselves carry the story.
      void ascendantNarrative;
      const result = await tierUpCard(card);
      // tierUpCard uses generatePortraitStrict internally BUT it catches the
      // error and returns portraitRegenerated=false, keeping the old portrait.
      // For a paid action that's a "text-only evolution" and per Section 7.3
      // we refund — the player didn't get the promised new artwork.
      if (!result.portraitRegenerated) {
        if (txnId) {
          wallet.refund(
            txnId,
            `portrait_failed: ${result.portraitError ?? 'unknown'}`,
          );
        }
        // Don't save the partially-evolved card — the plan requires preserving
        // the original card on portrait failure.
        setTierUpWarning(
          `New portrait couldn't be generated (${result.portraitError ?? 'unknown error'}). ` +
            `Your ${EVOLVE_PRICE} was refunded. Card is unchanged. Retry Tier Up when ready.`,
        );
        return;
      }
      if (txnId) wallet.commit(txnId);
      setCard(result.card);
      if (result.newAbilityDiscovery) {
        setRelicDiscovery({
          abilityId: result.newAbilityDiscovery.abilityId,
          moment: result.newAbilityDiscovery.slotType === 'ultimate' ? 'ultimate' : 'evolution',
          resource: result.newAbilityDiscovery.resource,
        });
      }
    } catch (err) {
      if (txnId) {
        wallet.refund(
          txnId,
          err instanceof Error ? err.message : String(err),
        );
      }
      console.error('Tier up failed:', err);
      setTierUpWarning(
        `Tier up failed: ${err instanceof Error ? err.message : String(err)}. Your ${EVOLVE_PRICE} was refunded.`,
      );
    } finally {
      setIsTieringUp(false);
      pendingTierUpTxnId.current = null;
    }
  }

  async function handleChoosePath(path: AscendantPath) {
    setAscendantPaths(null);
    await runTierUp(path.narrative);
  }

  function handleCancelAscendantModal() {
    setAscendantPaths(null);
    // User backed out AFTER we already paid for the ascendant paths lookup.
    // Refund the reservation — no portrait was minted.
    if (pendingTierUpTxnId.current) {
      wallet.refund(pendingTierUpTxnId.current, 'user_cancelled_ascendant_modal');
      pendingTierUpTxnId.current = null;
    }
  }

  // P8 — "Resist the Fall". Gold-only sink that nudges a Fallen Seraph's
  // alignment one step toward center; reverts a prior Light→Infernal
  // transmutation once the path leaves 'fallen'.
  async function handleResistFall() {
    if (!card || isResisting || !card.narrativeAxis) return;
    const rank = getOverallRank(card.stats);
    const actionId = resistFallActionId(rank);
    const cost = resistFallCost(rank);
    if (!actionId || cost === null) return;

    setIsResisting(true);
    let reservation;
    try {
      reservation = wallet.reserve({
        currency: 'gameplay',
        amount: cost,
        actionId,
        cardId: card.cardId,
      });
    } catch (err) {
      setIsResisting(false);
      if (err instanceof wallet.InsufficientFundsError) return; // button is balance-gated
      throw err;
    }
    try {
      const newAxis = resistFall(card.narrativeAxis, SERAPH_ALIGNMENT, rank);
      const patch = applySeraphTransmutation(card, newAxis);
      const updated: Card = {
        ...card,
        narrativeAxis: patch.narrativeAxis,
        currentElement: patch.currentElement ?? card.currentElement,
        originalElement: patch.originalElement ?? card.originalElement,
      };
      saveCard(updated);
      wallet.commit(reservation.transactionId);
      setCard(updated);
    } catch (err) {
      wallet.refund(reservation.transactionId, err instanceof Error ? err.message : String(err));
    } finally {
      setIsResisting(false);
    }
  }

  const borderColor = BORDER_COLORS[card.border.baseVariant];
  const rankSum = computeRankSum(card.stats);
  const activeStats = getStatNames(card.archetype);
  const canUpgrade = canTierUp(card);
  const hasPreviousTiers = tierTimeline.length > 0;
  const { overallRank, allTiers, currentIdx, isViewingHistory, displayCard } = viewState!;

  // P8 — Seraph alignment panel + Resist the Fall gating.
  const seraphAxis = card.archetype === 'Seraph' ? card.narrativeAxis : undefined;
  const resistCost = resistFallCost(overallRank);
  const canAffordResist = resistCost !== null && goldBalance >= resistCost;
  const SERAPH_PATH_META: Record<string, { label: string; color: string }> = {
    good: { label: 'Radiant', color: '#fbbf24' },
    balanced: { label: 'Twilight', color: '#a78bfa' },
    fallen: { label: 'Fallen', color: '#ef4444' },
  };
  const pathMeta = seraphAxis ? SERAPH_PATH_META[seraphAxis.path] : undefined;

  return (
    <div className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
      <button
        onClick={() => navigate('/collection')}
        className="text-ash hover:text-ivory text-sm mb-6 transition-colors"
      >
        &larr; Back to Collection
      </button>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="shrink-0 mx-auto md:mx-0">
          <CardRenderer card={displayCard} />

          {/* Tier navigation */}
          {hasPreviousTiers && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setViewingTierIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="w-8 h-8 rounded-full border border-slate-dark text-ash
                  hover:text-ivory hover:border-gold/50 transition-colors
                  disabled:opacity-20 disabled:cursor-not-allowed
                  flex items-center justify-center text-sm"
              >
                ◀
              </button>

              <div className="flex items-center gap-2">
                {allTiers.map((tier, i) => {
                  const isActive = i === currentIdx;
                  const isCurrent = i === allTiers.length - 1;
                  const colors = RANK_BADGE_COLORS[tier.rank];
                  return (
                    <button
                      key={i}
                      onClick={() => setViewingTierIdx(i === allTiers.length - 1 ? -1 : i)}
                      className="flex flex-col items-center gap-1 transition-all"
                    >
                      <span
                        className="px-2 py-0.5 rounded-full font-fantasy text-[10px] transition-all"
                        style={{
                          background: isActive ? colors.text : colors.bg,
                          color: isActive ? '#0a0a0f' : colors.text,
                          opacity: isActive ? 1 : 0.6,
                        }}
                      >
                        {tier.rank}
                      </span>
                      {isCurrent && (
                        <span className="text-[8px] text-ash/50">current</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setViewingTierIdx(
                  currentIdx >= allTiers.length - 1 ? -1 : currentIdx + 1 === allTiers.length - 1 ? -1 : currentIdx + 1
                )}
                disabled={currentIdx === allTiers.length - 1}
                className="w-8 h-8 rounded-full border border-slate-dark text-ash
                  hover:text-ivory hover:border-gold/50 transition-colors
                  disabled:opacity-20 disabled:cursor-not-allowed
                  flex items-center justify-center text-sm"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 min-w-0">
          <div>
            <h1 className="font-fantasy text-3xl font-bold text-ivory">{displayCard.nameAndTitle}</h1>
            {isViewingHistory && (
              <p className="text-xs text-gold/60 mt-1 font-fantasy italic">
                Viewing {allTiers[currentIdx].rank} tier
              </p>
            )}
            <div className="flex gap-3 mt-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-slate-dark text-ash">{card.archetype}</span>
              <span
                className="px-2 py-0.5 rounded font-fantasy"
                style={{
                  background: `${borderColor.primary}20`,
                  color: borderColor.primary,
                }}
              >
                {overallRank}
              </span>
              {card.dominantStat && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: STAT_COLORS[card.dominantStat].bg,
                    color: STAT_COLORS[card.dominantStat].text,
                  }}
                >
                  {card.dominantStat} dominant
                </span>
              )}
            </div>
          </div>

          {displayCard.lore && (
            <div className="border-l-2 pl-4" style={{ borderColor: `${borderColor.primary}44` }}>
              <p
                className={`text-bone/80 italic leading-relaxed ${
                  loreExpanded ? '' : 'line-clamp-3'
                }`}
              >
                "{displayCard.lore}"
              </p>
              <button
                onClick={() => setLoreExpanded((v) => !v)}
                className="mt-1 text-xs font-fantasy uppercase tracking-widest text-gold/70 hover:text-gold transition-colors"
              >
                {loreExpanded ? 'Show less' : 'Read more'}
              </button>
            </div>
          )}

          {/* Combat Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-fantasy text-sm font-bold text-ivory">Combat Stats</h3>
              <span className="text-xs text-ash">
                Rank Sum: {rankSum}/7
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {activeStats.map((name) => {
                const entry = card.stats[name]!;
                const rank = deriveRank(entry.value, entry.bias);
                const colors = STAT_COLORS[name];
                const rankBadge = RANK_BADGE_COLORS[rank];
                const isDominant = card.dominantStat === name;

                return (
                  <div
                    key={name}
                    className="rounded-lg p-2 sm:p-3 border transition-colors"
                    style={{
                      background: colors.bg,
                      borderColor: isDominant ? colors.border : `${colors.border}33`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-fantasy text-xs font-bold" style={{ color: colors.border }}>
                        {name}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-fantasy"
                        style={{ background: rankBadge.bg, color: rankBadge.text }}
                      >
                        {rank}
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: colors.text }}>
                      {entry.value}
                    </span>
                    <div className="mt-1">
                      <div className="w-full h-1 rounded-full bg-black/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(entry.value / entry.hardCap) * 100}%`,
                            background: colors.border,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-ash/60">{entry.bias}</span>
                        <span className="text-[9px] text-ash/60">cap {entry.hardCap}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Abilities — A5 minimal slot indicator. Full tile art comes at A7. */}
          <div className="space-y-2">
            <h3 className="font-fantasy text-sm font-bold text-ivory">Abilities</h3>
            {(() => {
              const refs = getReferencesForCard(card.cardId).filter(
                (r) => r.localTier === overallRank,
              );
              if (refs.length === 0) {
                return (
                  <p className="text-xs text-ash/70 italic">
                    No abilities yet — reforge or tier-up will add one for this rank.
                  </p>
                );
              }
              refs.sort((a, b) => a.displayOrder - b.displayOrder);
              return (
                <div className="grid gap-2">
                  {refs.map((ref) => {
                    const def = getDefinition(ref.abilityId);
                    const version = getCurrentVersion(ref.abilityId);
                    const art = getArtForAbility(ref.abilityId);
                    return (
                      <div
                        key={`${ref.slotType}-${ref.localTier}`}
                        className="flex gap-3 rounded-md p-3 border border-gold/20 bg-slate-dark/40"
                      >
                        {art && (
                          <img
                            src={art.assetUrl}
                            alt=""
                            className="w-12 h-12 rounded shrink-0 border border-gold/20"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="font-fantasy text-sm text-ivory truncate">
                              {def?.displayName ?? ref.abilityId}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-gold/70 shrink-0">
                              {ref.slotType}
                            </span>
                          </div>
                          {def?.descriptionShort && (
                            <p className="text-xs text-bone/70">{def.descriptionShort}</p>
                          )}
                          {version && (
                            <div className="text-[10px] text-ash/60 mt-1 tabular-nums">
                              cost {version.resourceCost} {version.resourceType}
                              {version.cooldownRounds ? ` · cd ${version.cooldownRounds}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {card.storyPillars && card.storyPillars.answers.length > 0 && (
            <div>
              <button
                onClick={() => setStoryExpanded((v) => !v)}
                aria-expanded={storyExpanded}
                className="flex items-center gap-2 w-full text-left group"
              >
                <h3 className="font-fantasy text-sm font-bold text-ivory">Their Story</h3>
                <span
                  className={`text-gold/60 text-xs transition-transform group-hover:text-gold ${
                    storyExpanded ? 'rotate-90' : ''
                  }`}
                >
                  ▸
                </span>
                {!storyExpanded && (
                  <span className="text-[10px] uppercase tracking-widest text-ash/50 ml-auto">
                    Reveal
                  </span>
                )}
              </button>
              {storyExpanded && (
                <div className="mt-2">
                  <StoryPillarSummary card={card} />
                </div>
              )}
            </div>
          )}

          {card.elementSelection && (() => {
            const visual = getElementVisual(card.elementSelection.element);
            return (
              <div>
                <h3 className="font-fantasy text-sm font-bold text-ivory mb-1">Element</h3>
                <span
                  className="font-fantasy text-lg"
                  style={{
                    color: visual.color,
                    textShadow: elementGlowShadow(card.elementSelection.element, overallRank),
                  }}
                >
                  {card.elementSelection.element}
                </span>
                <div className="text-[11px] text-ash mt-1">
                  <span className="italic">"{card.elementSelection.bond}"</span>
                  <span className="text-bone/50 ml-2">
                    ({card.elementSelection.compatibility.replace(/_/g, ' ')})
                  </span>
                </div>
              </div>
            );
          })()}

          {card.prestige && (
            <div className="rounded-lg border border-gold/40 bg-gold/5 p-3">
              <h3 className="font-fantasy text-sm font-bold text-gold mb-1">
                Prestige: {card.prestige.title}
              </h3>
              <p className="text-[11px] text-bone/70 italic">{card.prestige.justification}</p>
            </div>
          )}

          <div className="text-xs text-ash/60 space-y-1">
            <p>Border: {card.border.baseVariant} — {card.dominantStat ? `${card.dominantStat} dominant` : 'no dominant stat'}</p>
            <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
            <p>ID: {card.cardId}</p>
          </div>

          {/* Regenerate Portrait — visible for missing OR healthy portraits.
              M3.7: prompts iterate rapidly right now, so at-will regen is
              useful. Missing-portrait case gets stronger visual language;
              healthy-portrait case is a quieter action. */}
          <div className={`border rounded-lg p-3 ${
            !card.portraitAsset ? 'border-power/50 bg-power/5' : 'border-slate-dark bg-obsidian/40'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {!card.portraitAsset ? (
                  <>
                    <span className="font-fantasy text-xs font-bold text-power">Portrait Missing</span>
                    <p className="text-[10px] text-ash/70 mt-0.5">
                      This card's portrait was corrupted or blocked by content moderation.
                      Rebuild it — stats, name, lore, and evolution history are all preserved.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-fantasy text-xs font-bold text-ivory">Regenerate Portrait</span>
                    <p className="text-[10px] text-ash/70 mt-0.5">
                      Reroll the portrait against the current prompt system. Stats, name, lore,
                      Story Pillars, and evolution history are all preserved — only the image changes.
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={handleRegeneratePortrait}
                disabled={isRegenerating || isTieringUp}
                className={`shrink-0 px-4 py-1.5 rounded-lg font-fantasy text-xs font-bold transition-all
                  text-ivory
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2
                  ${!card.portraitAsset
                    ? 'bg-gradient-to-r from-power to-power-glow hover:shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                    : 'bg-slate-dark hover:bg-slate-dark/80 border border-ash/40'}`}
              >
                <span>{isRegenerating ? 'Rebuilding...' : !card.portraitAsset ? 'Rebuild Portrait' : 'Regenerate'}</span>
                <span
                  className="px-1.5 py-0.5 rounded bg-black/30"
                  style={{ opacity: 0.9 }}
                >
                  <CurrencyCost
                    currency="premium"
                    amount={REGEN_PRICE}
                    insufficient={premiumBalance < REGEN_PRICE}
                  />
                </span>
              </button>
            </div>
            {isRegenerating && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-ash/30 border-t-bone rounded-full animate-spin" />
                <span className="text-[10px] text-ash/70 animate-pulse">Painting portrait...</span>
              </div>
            )}
          </div>

          {/* P8 — Seraph alignment + Resist the Fall */}
          {seraphAxis && pathMeta && !isViewingHistory && (
            <div
              className="border rounded-lg p-3"
              style={{ borderColor: `${pathMeta.color}55`, background: `${pathMeta.color}0d` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-fantasy text-xs font-bold" style={{ color: pathMeta.color }}>
                    Divine Alignment
                  </span>
                  <p className="text-[11px] text-bone/70 mt-0.5">
                    Path:{' '}
                    <span className="font-bold" style={{ color: pathMeta.color }}>
                      {pathMeta.label}
                    </span>
                    <span className="text-ash/50"> · score {seraphAxis.score >= 0 ? `+${seraphAxis.score}` : seraphAxis.score}</span>
                    {seraphAxis.resistedFall && <span className="text-ash/50"> · resisted</span>}
                  </p>
                </div>
                {seraphAxis.path === 'fallen' && resistCost !== null && (
                  <button
                    onClick={handleResistFall}
                    disabled={isResisting || !canAffordResist}
                    className="px-3 py-1.5 rounded-lg font-fantasy text-xs font-bold transition-all
                      bg-gradient-to-r from-violet-500/70 to-indigo-500/70 text-ivory
                      hover:shadow-[0_0_12px_rgba(139,92,246,0.35)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center gap-2 shrink-0"
                    title="Nudge your alignment one step back toward the light"
                  >
                    <span>{isResisting ? 'Resisting...' : 'Resist the Fall'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/30">
                      <CurrencyCost
                        currency="gameplay"
                        amount={resistCost}
                        insufficient={!canAffordResist}
                      />
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tier Up */}
          {canUpgrade && (
            <div className="border border-dashed border-gold/30 rounded-lg p-3 bg-gold/5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-fantasy text-xs font-bold text-gold/80">Tier Up</span>
                  <p className="text-[10px] text-ash/60 mt-0.5">
                    Bumps stats to next rank; regenerates portrait &amp; lore.
                  </p>
                </div>
                <button
                  onClick={handleTierUp}
                  disabled={isTieringUp || isLoadingPaths}
                  className="px-4 py-1.5 rounded-lg font-fantasy text-xs font-bold transition-all
                    bg-gradient-to-r from-gold/80 to-amber-600/80 text-obsidian
                    hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-2"
                >
                  <span>
                    {isTieringUp ? 'Evolving...' : isLoadingPaths ? 'Divining fate...' : `Tier Up → ${overallRank === 'Foundation' ? 'Forged' : 'Ascendant'}`}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/30">
                    <CurrencyCost
                      currency="premium"
                      amount={EVOLVE_PRICE}
                      insufficient={premiumBalance < EVOLVE_PRICE}
                    />
                  </span>
                </button>
              </div>
              {(isTieringUp || isLoadingPaths) && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  <span className="text-[10px] text-gold/60 animate-pulse">
                    {isLoadingPaths ? 'Weaving Ascendant paths...' : 'Forging new form...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {tierUpWarning && (
            <div className="border border-power/40 rounded-lg p-3 bg-power/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-fantasy text-xs font-bold text-power">Portrait not updated</span>
                  <p className="text-[11px] text-bone/70 mt-1 leading-relaxed">{tierUpWarning}</p>
                </div>
                <button
                  onClick={() => setTierUpWarning(null)}
                  className="text-ash hover:text-ivory text-sm shrink-0"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg text-sm text-ash hover:text-power
                  border border-slate-dark hover:border-power/50 transition-colors"
              >
                Destroy Card
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-power">Destroy this card forever?</span>
                <button
                  onClick={handleDelete}
                  className="px-4 py-1.5 rounded-lg bg-power text-ivory text-sm font-bold
                    hover:bg-power-glow transition-colors"
                >
                  Yes, destroy
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-dark text-ash text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {insufficientFor && (
        <InsufficientFundsModal
          currency={insufficientFor.currency}
          required={insufficientFor.required}
          available={premiumBalance}
          actionLabel={insufficientFor.actionLabel}
          onClose={() => setInsufficientFor(null)}
        />
      )}

      {relicDiscovery && (
        <RelicDiscoveryModal
          abilityId={relicDiscovery.abilityId}
          moment={relicDiscovery.moment}
          resourceAccent={relicDiscovery.resource}
          onClose={() => setRelicDiscovery(null)}
        />
      )}

      {/* Ascendant Whisper Fusion modal */}
      {ascendantPaths && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-[fadeIn_0.3s_ease-out]"
          onClick={handleCancelAscendantModal}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-obsidian border-2 border-gold/60
              rounded-xl shadow-[0_0_40px_rgba(212,175,55,0.4)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gold/30 bg-gradient-to-b from-gold/10 to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-fantasy text-xl font-bold text-gold">Your Ascendant Story</h3>
                  <p className="text-xs text-ash/80 italic mt-1">
                    Two paths continue {card.cardName}'s story into their Ascendant form.
                    Choose the direction their legend takes.
                  </p>
                </div>
                <button
                  onClick={handleCancelAscendantModal}
                  className="text-ash hover:text-ivory text-2xl leading-none shrink-0"
                  aria-label="Cancel"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {ascendantPaths.map((path, i) => (
                <button
                  key={i}
                  onClick={() => handleChoosePath(path)}
                  disabled={isTieringUp}
                  className="w-full text-left p-4 rounded-lg border-2 border-slate-dark
                    bg-slate-dark/40 hover:border-gold/60 hover:bg-gold/5
                    hover:shadow-[0_0_18px_rgba(212,175,55,0.25)]
                    transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    group"
                >
                  <div className="font-fantasy text-sm font-bold text-gold group-hover:text-amber-300 mb-2">
                    {path.title}
                  </div>
                  <p className="text-bone/85 text-sm italic leading-relaxed">
                    "{path.narrative}"
                  </p>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-slate-dark text-center">
              <button
                onClick={handleCancelAscendantModal}
                className="text-xs text-ash hover:text-ivory font-fantasy transition-colors"
              >
                Cancel — don't tier up yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildTierTimeline(card: Card): { rank: Rank; snapshot: ArtSnapshot }[] {
  const entries: { rank: Rank; snapshot: ArtSnapshot }[] = [];
  const seen = new Set<string>();

  for (const statHistory of Object.values(card.evolutionHistory)) {
    if (!statHistory) continue;
    for (const [rank, snapshot] of Object.entries(statHistory)) {
      if (!snapshot) continue;
      if (seen.has(rank)) continue;
      seen.add(rank);
      entries.push({ rank: rank as Rank, snapshot });
    }
  }

  const rankOrder: Record<string, number> = { Foundation: 0, Forged: 1, Ascendant: 2 };
  entries.sort((a, b) => rankOrder[a.rank] - rankOrder[b.rank]);
  return entries;
}

/**
 * Renders the player's Story Pillar answers alongside the questions that
 * produced them, per Bible §Guided Narrative Chains. Answers are immutable
 * — this view is read-only.
 */
function StoryPillarSummary({ card }: { card: Card }) {
  if (!card.storyPillars) return null;
  const questions = getQuestionsForArchetype(card.archetype);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  return (
    <div className="space-y-2">
      {card.storyPillars.answers.map((a) => {
        const q = questionById.get(a.questionId);
        return (
          <div key={a.questionId} className="rounded-md border border-slate-dark bg-obsidian/40 p-2">
            {q && (
              <div className="text-[10px] uppercase tracking-widest text-gold/60 mb-0.5">
                {q.prompt}
              </div>
            )}
            <div className="text-[12px] text-bone/90 italic">"{a.answer}"</div>
          </div>
        );
      })}
    </div>
  );
}
