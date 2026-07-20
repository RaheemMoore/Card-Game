import { useEffect, useMemo, useState } from 'react';
import type { AnimationBeat } from '../../../services/combat/presentation/types';
import type { BattleEvent } from '../../../types/combat';
import { formatEvent } from '../formatEvent';
import { CombatFrame } from '../CombatFrame';

interface Props {
  journal: readonly AnimationBeat[];
  isPlaying: boolean;
  pendingCount: number;
  onSkip: () => void;
}

/**
 * Mobile Combat Journal. Collapsed by default: shows the most recent event
 * on a single row with an up-chevron. Tapping expands a bottom drawer that
 * covers the ability / actions area, showing full history. Closes on
 * chevron tap, backdrop tap, Escape key, or swipe-down.
 *
 * Reuses the Combat Frame journal preset for material continuity with the
 * desktop rail (Figma 17:18).
 */
export function MobileCombatJournal({ journal, isPlaying, pendingCount, onSkip }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { active, history, currentRound } = useMemo(() => {
    const activeBeat = journal[journal.length - 1] ?? null;
    const historyBeats = journal.slice(0, -1);
    let round = 0;
    for (const b of journal) {
      if (b.event.kind === 'round_started') round = b.event.round;
    }
    return { active: activeBeat, history: historyBeats, currentRound: round };
  }, [journal]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const activeText = active ? formatEvent(active.event) : 'The arena settles.';

  return (
    <>
      {/* Collapsed strip */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{
          padding: '6px 12px',
          background: '#0e0c0b',
          borderTop: '1px solid rgba(51,31,15,0.9)',
          borderBottom: expanded ? '1px solid rgba(51,31,15,0.9)' : 'none',
          color: '#ebd1a3',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: 44,
        }}
        aria-expanded={expanded}
        aria-controls="mobile-journal-drawer"
      >
        <div className="flex items-center justify-between">
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.4,
              color: '#c8a86a',
            }}
          >
            COMBAT JOURNAL
            {currentRound > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  color: '#8a7554',
                  fontSize: 9,
                  letterSpacing: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ROUND {currentRound}
              </span>
            )}
          </span>
          <span
            aria-hidden
            style={{
              color: '#c8a86a',
              fontSize: 12,
              lineHeight: 1,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms',
            }}
          >
            ▲
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: '#d6c7a8',
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span aria-hidden style={{ color: '#f0942e', fontSize: 10 }}>◆</span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
            }}
          >
            {activeText}
          </span>
        </div>
      </button>

      {/* Expanded drawer */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setExpanded(false)}
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 45,
              background: 'rgba(4,3,8,0.72)',
              backdropFilter: 'blur(2px)',
            }}
          />
          {/* Drawer */}
          <div
            id="mobile-journal-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Combat journal history"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 46,
              maxHeight: '75dvh',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <CombatFrame preset="journal" style={{ borderRadius: 0, borderBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(75dvh - env(safe-area-inset-bottom, 0px))',
                }}
              >
                {/* Drawer header */}
                <div
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(51,31,15,0.9)',
                  }}
                >
                  <span
                    style={{
                      color: '#ebd1a3',
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: 1.4,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    COMBAT JOURNAL
                    {currentRound > 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: '#a88c63',
                          fontSize: 10,
                          letterSpacing: 1,
                        }}
                      >
                        ROUND {currentRound}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {isPlaying && (
                      <button
                        type="button"
                        onClick={onSkip}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                        style={{
                          color: 'rgba(230,220,180,0.7)',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: 1.4,
                          textDecoration: 'underline',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        aria-label={`Skip ${pendingCount} pending combat beats`}
                      >
                        Skip · {pendingCount}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      aria-label="Close journal"
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        border: '1px solid #573b1f',
                        background: '#0f0e0f',
                        color: '#d6c7a8',
                        cursor: 'pointer',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body — history above, active pinned at bottom */}
                <div
                  className="overflow-y-auto"
                  aria-live="polite"
                  style={{
                    flex: 1,
                    padding: '8px 10px 4px',
                    maxHeight: 'calc(75dvh - env(safe-area-inset-bottom, 0px) - 130px)',
                  }}
                >
                  {history.map((beat) => (
                    <MobileJournalCard key={beat.id} beat={beat} tone="history" />
                  ))}
                  {history.length === 0 && (
                    <div
                      style={{
                        color: '#7a6a4c',
                        fontSize: 11,
                        fontStyle: 'italic',
                        padding: '18px 8px',
                      }}
                    >
                      No prior events yet — the arena watches.
                    </div>
                  )}
                </div>
                {active && (
                  <div style={{ padding: '4px 10px 10px' }}>
                    <MobileJournalCard beat={active} tone="active" />
                  </div>
                )}
              </div>
            </CombatFrame>
          </div>
        </>
      )}
    </>
  );
}

function MobileJournalCard({
  beat,
  tone,
}: {
  beat: AnimationBeat;
  tone: 'active' | 'history';
}) {
  const e = beat.event;
  if (e.kind === 'round_started' && tone === 'history') {
    return (
      <div
        className="flex items-center gap-2"
        style={{ margin: '4px 8px', height: 12 }}
        aria-hidden
      >
        <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.22)' }} />
        <span
          style={{
            color: 'rgba(212,175,55,0.6)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.4,
            fontFamily: 'Inter, system-ui, sans-serif',
            textTransform: 'uppercase',
          }}
        >
          Round {(e as Extract<BattleEvent, { kind: 'round_started' }>).round}
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.22)' }} />
      </div>
    );
  }

  const category = categoryOf(e);
  const isBossIntent = e.kind === 'boss_intent_declared';
  const isDamage = e.kind === 'damage_dealt';
  const isHighlighted = tone === 'active' || isBossIntent || (isDamage && e.amount >= 50);

  const bg = tone === 'active' ? '#160d07' : isHighlighted ? '#130d08' : '#09090a';
  const border =
    tone === 'active' ? '1.5px solid #ba6e21' : isHighlighted ? '1px solid #874f1a' : '1px solid #241c14';
  const categoryColor = tone === 'active' ? '#f59c30' : isHighlighted ? '#f0942e' : '#a38763';

  return (
    <div
      style={{
        margin: '3px 0',
        padding: '6px 10px',
        background: bg,
        border,
        borderRadius: tone === 'active' ? 6 : 4,
      }}
    >
      <div
        style={{
          color: categoryColor,
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1.2,
          fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase',
        }}
      >
        {tone === 'active' ? 'ACTIVE' : category}
      </div>
      <div
        style={{
          color: tone === 'active' ? '#ebd9b2' : '#d6c7a8',
          fontSize: tone === 'active' ? 12 : 11,
          fontWeight: tone === 'active' ? 600 : 400,
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: 1.35,
          marginTop: 2,
        }}
      >
        {formatEvent(e)}
      </div>
    </div>
  );
}

function categoryOf(e: BattleEvent): string {
  switch (e.kind) {
    case 'battle_started': return 'BATTLE';
    case 'round_started': return 'TURN';
    case 'boss_intent_declared': return 'BOSS INTENT';
    case 'player_action_selected': return 'HERO ACTION';
    case 'damage_dealt': return 'DAMAGE';
    case 'healing_applied': return 'HEAL';
    case 'shield_gained': return 'SHIELD';
    case 'status_applied':
    case 'status_removed':
      return 'STATUS';
    case 'resource_changed':
    case 'ultimate_charge_changed':
    case 'cooldown_started':
    case 'cooldown_ticked':
      return 'TICK';
    case 'actor_defeated': return 'DEFEATED';
    case 'phase_transition': return 'PHASE';
    case 'action_denied': return 'DENIED';
    case 'battle_ended': return 'ENDED';
    default: return 'EVENT';
  }
}
