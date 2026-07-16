import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCard, deleteCard } from '../services/storage';
import { CardRenderer } from '../components/CardRenderer';
import { BORDER_COLORS } from '../data/stats';
import type { StatName, Card, ArtSnapshot, Rank } from '../types/card';
import {
  deriveRank,
  getOverallRank,
  computeRankSum,
  getStatNames,
} from '../data/powerSystem';
import { canTierUp, tierUpCard } from '../services/tierUp';
import { regeneratePortrait } from '../services/regeneratePortrait';
import { generateAscendantPaths, type AscendantPath } from '../services/ascendantPaths';

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
  // Ascendant Whisper Fusion: null = not open, [] = loading, [p1, p2] = ready
  const [ascendantPaths, setAscendantPaths] = useState<AscendantPath[] | null>(null);
  const [isLoadingPaths, setIsLoadingPaths] = useState(false);

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
    setIsRegenerating(true);
    setTierUpWarning(null);
    try {
      const updated = await regeneratePortrait(card);
      setCard(updated);
    } catch (err) {
      console.error('Portrait regeneration failed:', err);
      setTierUpWarning(
        `Portrait regeneration failed: ${err instanceof Error ? err.message : String(err)}. ` +
          'Try again — Leonardo\'s content moderator sometimes blocks a specific roll but passes the next.',
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleTierUp() {
    if (!card || isTieringUp || isLoadingPaths) return;
    setTierUpWarning(null);

    // Ascendant tier-up gets the Whisper Fusion modal — Claude generates 2
    // dramatic combined-whisper narratives, the user picks one, then the
    // main tier-up runs with that narrative as the organizing image.
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
    setIsTieringUp(true);
    setTierUpWarning(null);
    try {
      const result = await tierUpCard(card, ascendantNarrative);
      setCard(result.card);
      if (!result.portraitRegenerated) {
        setTierUpWarning(
          `New portrait couldn't be generated (${result.portraitError ?? 'unknown error'}). ` +
            'Stats and lore updated; previous portrait kept. You can retry Tier Up to try again.',
        );
      }
    } catch (err) {
      console.error('Tier up failed:', err);
      setTierUpWarning(`Tier up failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTieringUp(false);
    }
  }

  async function handleChoosePath(path: AscendantPath) {
    setAscendantPaths(null);
    await runTierUp(path.narrative);
  }

  function handleCancelAscendantModal() {
    setAscendantPaths(null);
  }

  const borderColor = BORDER_COLORS[card.border.baseVariant];
  const overallRank = getOverallRank(card.stats);
  const rankSum = computeRankSum(card.stats);
  const activeStats = getStatNames(card.archetype);
  const canUpgrade = canTierUp(card);

  const tierTimeline = useMemo(() => buildTierTimeline(card), [card]);
  const hasPreviousTiers = tierTimeline.length > 0;
  const allTiers = [...tierTimeline, { rank: overallRank as Rank, snapshot: null }];
  const currentIdx = viewingTierIdx === -1 ? allTiers.length - 1 : viewingTierIdx;

  const isViewingHistory = currentIdx !== allTiers.length - 1 && !!allTiers[currentIdx]?.snapshot;
  const displayCard = useMemo(() => {
    if (!isViewingHistory) return card;
    const snap = allTiers[currentIdx].snapshot!;
    return {
      ...card,
      portraitAsset: snap.portraitUrl,
      cardName: snap.cardName,
      nameAndTitle: snap.nameAndTitle ?? snap.cardName,
      lore: snap.lore,
    };
  }, [card, currentIdx, isViewingHistory, allTiers]);

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
              <p className="text-bone/80 italic leading-relaxed">"{displayCard.lore}"</p>
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
                    className="rounded-lg p-3 border transition-colors"
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
                    <span className="text-2xl font-bold tabular-nums" style={{ color: colors.text }}>
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

          {card.whisperWords.length > 0 && (
            <div>
              <h3 className="font-fantasy text-sm font-bold text-ivory mb-1">Whisper Words</h3>
              <div className="flex gap-2">
                {card.whisperWords.map((w, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs italic"
                    style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}


          {card.modifiers && (
            <div>
              <h3 className="font-fantasy text-sm font-bold text-ivory mb-1">Portrait Modifiers</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="text-ash"><span className="text-bone/60">Setting:</span> {card.modifiers.setting}</div>
                <div className="text-ash"><span className="text-bone/60">Demeanor:</span> {card.modifiers.demeanor}</div>
                <div className="text-ash"><span className="text-bone/60">Detail:</span> {card.modifiers.signatureDetail}</div>
                <div className="text-ash"><span className="text-bone/60">Lighting:</span> {card.modifiers.lighting}</div>
              </div>
            </div>
          )}

          <div className="text-xs text-ash/60 space-y-1">
            <p>Border: {card.border.baseVariant} — {card.dominantStat ? `${card.dominantStat} dominant` : 'no dominant stat'}</p>
            <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
            <p>ID: {card.cardId}</p>
          </div>

          {/* Regenerate Portrait — ONLY appears when the portrait is broken/missing.
              Prevents users from burning Leonardo credits on cosmetic re-rolls. */}
          {!card.portraitAsset && (
            <div className="border border-power/50 rounded-lg p-3 bg-power/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-fantasy text-xs font-bold text-power">Portrait Missing</span>
                  <p className="text-[10px] text-ash/70 mt-0.5">
                    This card's portrait was corrupted or blocked by content moderation.
                    Rebuild it (~$0.036) — stats, name, lore, and evolution history are all preserved.
                  </p>
                </div>
                <button
                  onClick={handleRegeneratePortrait}
                  disabled={isRegenerating || isTieringUp}
                  className="shrink-0 px-4 py-1.5 rounded-lg font-fantasy text-xs font-bold transition-all
                    bg-gradient-to-r from-power to-power-glow text-ivory
                    hover:shadow-[0_0_12px_rgba(220,38,38,0.4)]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegenerating ? 'Rebuilding...' : 'Rebuild Portrait'}
                </button>
              </div>
              {isRegenerating && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-ash/30 border-t-bone rounded-full animate-spin" />
                  <span className="text-[10px] text-ash/70 animate-pulse">Painting portrait...</span>
                </div>
              )}
            </div>
          )}

          {/* Dev: Tier Up */}
          {canUpgrade && (
            <div className="border border-dashed border-gold/30 rounded-lg p-3 bg-gold/5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-fantasy text-xs font-bold text-gold/80">DEV: Tier Up</span>
                  <p className="text-[10px] text-ash/60 mt-0.5">
                    Bumps stats to next rank, regenerates portrait &amp; lore (~$0.04)
                  </p>
                </div>
                <button
                  onClick={handleTierUp}
                  disabled={isTieringUp || isLoadingPaths}
                  className="px-4 py-1.5 rounded-lg font-fantasy text-xs font-bold transition-all
                    bg-gradient-to-r from-gold/80 to-amber-600/80 text-obsidian
                    hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTieringUp ? 'Evolving...' : isLoadingPaths ? 'Divining fate...' : `Tier Up → ${overallRank === 'Foundation' ? 'Forged' : 'Ascendant'}`}
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
                  <h3 className="font-fantasy text-xl font-bold text-gold">Ascendant Apotheosis</h3>
                  <p className="text-xs text-ash/80 italic mt-1">
                    Two paths fuse {card.cardName}'s whispers into a mythic ending.
                    Choose the one you want their legend to become.
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
