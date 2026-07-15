import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCard, deleteCard } from '../services/storage';
import { CardRenderer } from '../components/CardRenderer';
import { BORDER_COLORS } from '../data/stats';
import type { StatName } from '../types/card';
import {
  deriveRank,
  getOverallRank,
  computeRankSum,
  getStatNames,
  getBorderForDominantStat,
} from '../data/powerSystem';

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

  const card = cardId ? getCard(cardId) : null;

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

  const borderColor = BORDER_COLORS[card.border.baseVariant];
  const overallRank = getOverallRank(card.stats);
  const rankSum = computeRankSum(card.stats);
  const activeStats = getStatNames(card.archetype);

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
          <CardRenderer card={card} />
        </div>

        <div className="flex-1 space-y-6 min-w-0">
          <div>
            <h1 className="font-fantasy text-3xl font-bold text-ivory">{card.nameAndTitle}</h1>
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

          {card.lore && (
            <div className="border-l-2 pl-4" style={{ borderColor: `${borderColor.primary}44` }}>
              <p className="text-bone/80 italic leading-relaxed">"{card.lore}"</p>
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

          <div className="text-xs text-ash/60 space-y-1">
            <p>Border: {card.border.baseVariant} — {card.dominantStat ? `${card.dominantStat} dominant` : 'no dominant stat'}</p>
            <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
            <p>ID: {card.cardId}</p>
          </div>

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
    </div>
  );
}
