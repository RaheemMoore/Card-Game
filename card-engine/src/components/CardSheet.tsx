import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../types/card';
import type { AbilitySlotType } from '../types/abilities';
import { getOverallRank, getResourceStat } from '../data/powerSystem';
import { CardRenderer } from './CardRenderer';

/** One ability row, normalized from either a live battle snapshot or the
 *  static ability registry — CardSheet doesn't care which. */
export interface CardSheetAbility {
  slot: AbilitySlotType;
  displayName: string;
  descriptionShort?: string;
  descriptionLong?: string;
  resourceCost: number;
  resourceLabel: 'MANA' | 'TECH' | 'NONE';
  cooldownRounds: number;
  artUrl?: string | null;
  /** Present only when shown with `liveState` — battle status for this ability. */
  liveStatus?: 'ready' | 'cooldown' | 'no_resource' | 'locked';
  cooldownRemaining?: number;
}

export interface CardSheetLiveState {
  hp: number;
  maxHp: number;
  resource: number;
  maxResource: number;
  resourceLabel: 'MANA' | 'TECH';
  ultimateChargePct: number;
  statuses: { label: string; instanceId: string }[];
  defeated: boolean;
}

interface Props {
  card: Card;
  abilities: CardSheetAbility[];
  /** Present only in battle — overlays current HP/MP/statuses/ultimate and
   *  per-ability cooldown/lock state. Absent for Collection/Card Detail,
   *  which show the card as static data. */
  liveState?: CardSheetLiveState;
  onClose: () => void;
}

const SLOT_LABEL: Record<AbilitySlotType, string> = {
  core: 'CORE',
  signature: 'SIGNATURE',
  ultimate: 'ULTIMATE',
};

/**
 * Shared expanded-card overlay — full art + stats + ability text. Used from
 * battle (PartyDock's ⤢ affordance, with `liveState` for current combat
 * status) and from Collection (static, no `liveState`). Follows the
 * `fixed inset-0 z-50` + backdrop overlay pattern already established by
 * CombatJournalRail's full-history view.
 */
export function CardSheet({ card, abilities, liveState, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [onClose]);

  const overallRank = getOverallRank(card.stats);
  const resource = getResourceStat(card.stats);
  const hpPct = liveState ? Math.max(0, liveState.hp / liveState.maxHp) : null;
  const rPct = liveState
    ? liveState.maxResource === 0
      ? 0
      : liveState.resource / liveState.maxResource
    : null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${card.nameAndTitle || card.cardName} card sheet`} className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={onClose}
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,8,0.85)' }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full mx-4 outline-none card-sheet-panel"
        style={{ maxWidth: 880, maxHeight: '86dvh' }}
      >
        <div
          className="relative flex flex-col md:flex-row gap-6 overflow-y-auto rounded-2xl border border-gold/30"
          style={{
            maxHeight: '86dvh',
            padding: 24,
            background: 'linear-gradient(to bottom, #14100c, #0a0806)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card sheet"
            className="absolute top-3 right-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: '1px solid #573b1f',
              background: 'rgba(15,14,15,0.8)',
              color: '#d6c7a8',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>

          <div className="shrink-0 mx-auto md:mx-0" style={{ width: 260 }}>
            <CardRenderer card={card} size="full" />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="font-fantasy text-xl font-bold text-ivory">{card.cardName}</h2>
              <p className="text-sm text-gold/80">{card.nameAndTitle}</p>
              <p className="text-xs text-ash/70 mt-1">
                {card.archetype} · {overallRank}
                {liveState?.defeated ? ' · Defeated' : ''}
              </p>
            </div>

            {liveState ? (
              <div className="space-y-1.5">
                <LiveBar label="HP" value={liveState.hp} max={liveState.maxHp} pct={hpPct!} color="from-emerald-400 to-emerald-600" />
                <LiveBar
                  label={liveState.resourceLabel === 'MANA' ? 'MP' : 'TP'}
                  value={liveState.resource}
                  max={liveState.maxResource}
                  pct={rPct!}
                  color="from-sky-400 to-sky-600"
                />
                <div className="flex items-center gap-2 text-xs text-bone/70">
                  <span className="w-7 shrink-0 font-bold">ULT</span>
                  <span className="tabular-nums">{Math.round(liveState.ultimateChargePct)}%</span>
                </div>
                {liveState.statuses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {liveState.statuses.map((s) => (
                      <span
                        key={s.instanceId}
                        className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-slate-dark/60 text-bone/80 border border-gold/20"
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-bone/70">
                <span>ATK {card.stats.Atk.value}</span>
                <span>DEF {card.stats.Def.value}</span>
                <span>
                  {resource.name.toUpperCase()} {resource.entry.value}
                </span>
              </div>
            )}

            <div>
              <h3 className="font-fantasy text-sm font-bold text-ivory mb-2">Abilities</h3>
              {abilities.length === 0 ? (
                <p className="text-xs text-ash/70 italic">No abilities yet for this rank.</p>
              ) : (
                <div className="grid gap-2">
                  {abilities.map((a) => (
                    <AbilityRow key={`${a.slot}-${a.displayName}`} ability={a} />
                  ))}
                </div>
              )}
            </div>

            {card.lore && (
              <div>
                <h3 className="font-fantasy text-sm font-bold text-ivory mb-1">Lore</h3>
                <p className="text-xs text-bone/70 leading-relaxed">{card.lore}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .card-sheet-panel { animation: card-sheet-in 150ms ease-out; }
        @keyframes card-sheet-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .card-sheet-panel { animation: card-sheet-in-reduced 120ms ease-out; }
          @keyframes card-sheet-in-reduced {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function LiveBar({
  label,
  value,
  max,
  pct,
  color,
}: {
  label: string;
  value: number;
  max: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 text-xs font-bold text-bone/70">{label}</span>
      <div className="relative flex-1 h-2.5 rounded-full bg-void/90 overflow-hidden border border-bone/20">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} />
      </div>
      <span className="tabular-nums text-xs text-bone/90 font-semibold" style={{ minWidth: '5ch', textAlign: 'right' }}>
        {value}/{max}
      </span>
    </div>
  );
}

function AbilityRow({ ability }: { ability: CardSheetAbility }) {
  const statusText = !ability.liveStatus
    ? null
    : ability.liveStatus === 'ready'
    ? 'READY'
    : ability.liveStatus === 'cooldown'
    ? `COOLDOWN (${ability.cooldownRemaining ?? ability.cooldownRounds})`
    : ability.liveStatus === 'no_resource'
    ? 'NO RESOURCE'
    : 'LOCKED';
  const statusColor =
    statusText === 'READY' ? '#8ab87d' : statusText === 'LOCKED' ? '#c88a45' : statusText ? '#b06062' : undefined;

  return (
    <div className="flex gap-3 rounded-md p-3 border border-gold/20 bg-slate-dark/40">
      {ability.artUrl ? (
        <img src={ability.artUrl} alt="" className="w-12 h-12 rounded shrink-0 border border-gold/20 object-cover" />
      ) : (
        <div className="w-12 h-12 rounded shrink-0 border border-gold/20 bg-gradient-to-br from-[#3a2612] to-[#1a1210]" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="font-fantasy text-sm text-ivory truncate">{ability.displayName}</span>
          <span className="text-[10px] uppercase tracking-widest text-gold/70 shrink-0">{SLOT_LABEL[ability.slot]}</span>
        </div>
        {(ability.descriptionLong || ability.descriptionShort) && (
          <p className="text-xs text-bone/70">{ability.descriptionLong || ability.descriptionShort}</p>
        )}
        <div className="flex items-center gap-2 text-[10px] text-ash/60 mt-1 tabular-nums">
          <span>
            cost {ability.resourceCost} {ability.resourceLabel !== 'NONE' ? ability.resourceLabel.toLowerCase() : ''}
            {ability.cooldownRounds ? ` · cd ${ability.cooldownRounds}` : ''}
          </span>
          {statusText && (
            <span className="font-bold tracking-wide" style={{ color: statusColor }}>
              {statusText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
