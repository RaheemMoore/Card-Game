import { useEffect, useMemo, useRef } from 'react';
import type { AnimationBeat, BeatCue } from '../../services/combat/presentation/types';
import type { BattleEvent } from '../../types/combat';
import { formatEvent } from './formatEvent';
import { CombatFrame } from './CombatFrame';

interface Props {
  journal: readonly AnimationBeat[];
  isPlaying: boolean;
  pendingCount: number;
  onSkip: () => void;
}

/**
 * Right-rail Combat Journal, sourced verbatim from Figma node 17:18
 * (CombatFrame/Journal, 330×760).
 *
 * Layout:
 *   - Journal Header  — dark strip, gold hairline, uppercase title, round pill
 *   - Ornament Divider — a short scrollwork rule + diamond
 *   - Event cards     — 282×76, 5px radius; boss-intent variant has warm orange border
 *   - Active Event    — 282×92, 6px radius, orange border, gold ACTIVE label
 */
export function CombatJournalRail({ journal, isPlaying, pendingCount, onSkip }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [journal.length]);

  const { active, history, currentRound } = useMemo(() => {
    const activeBeat = journal[journal.length - 1] ?? null;
    const historyBeats = journal.slice(0, -1);
    let round = 0;
    for (const b of journal) {
      if (b.event.kind === 'round_started') round = b.event.round;
    }
    return { active: activeBeat, history: historyBeats, currentRound: round };
  }, [journal]);

  return (
    <CombatFrame
      preset="journal"
      className="h-full"
      style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderRight: 0 }}
      ariaLabel="Combat Journal"
    >
      <div className="flex flex-col h-full" style={{ padding: '2px 8px 8px 8px' }}>
        {/* Header — Figma: dark strip with gold hairline, 64px tall */}
        <div
          className="relative"
          style={{
            height: 56,
            background: '#0e0c0b',
            marginLeft: -8,
            marginRight: -8,
            marginTop: -2,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 20,
            borderBottom: '1px solid rgba(51,31,15,0.9)',
          }}
        >
          {/* Gold top hairline inside header */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 8,
              left: 18,
              right: 18,
              height: 2,
              background: '#f0a840',
              opacity: 0.6,
              borderRadius: 1,
            }}
          />
          <div
            style={{
              color: '#ebd1a3',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 1.5,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            COMBAT JOURNAL
          </div>
          <div
            style={{
              position: 'absolute',
              right: 24,
              top: 24,
              color: '#a88c63',
              fontSize: 10,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {currentRound > 0 ? `ROUND ${currentRound}` : ''}
          </div>
          {isPlaying && (
            <button
              type="button"
              onClick={onSkip}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              style={{
                position: 'absolute',
                right: 24,
                bottom: 6,
                color: 'rgba(230,220,180,0.65)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
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
        </div>

        {/* Ornament divider (short scrollwork rule + diamond) */}
        <OrnamentDivider />

        {/* History (scrolls) */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ paddingTop: 4, paddingBottom: 4 }}
          aria-live="polite"
        >
          {history.map((beat) => (
            <JournalEventCard key={beat.id} beat={beat} tone="history" />
          ))}
        </div>

        {/* Active event card — 282×92, orange border */}
        {active && (
          <div style={{ marginTop: 8 }}>
            <JournalEventCard beat={active} tone="active" />
          </div>
        )}
      </div>
    </CombatFrame>
  );
}

/**
 * Ornament divider — Figma node 14:42: 420×20 rule with centered rotated
 * diamond gem. Scaled to fit the 282-ish inner width.
 */
function OrnamentDivider() {
  return (
    <div
      className="relative"
      style={{ height: 20, marginTop: 12, marginBottom: 4 }}
      aria-hidden
    >
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: 9,
          height: 2,
          background: '#57381c',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 'calc(50% - 8px)',
          top: 2,
          width: 16,
          height: 16,
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" style={{ width: '100%', height: '100%' }}>
          <path
            d="M15 8L8 15L1 8L8 1L15 8Z"
            fill="#a86a2a"
            stroke="#d99340"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Journal event card matching Figma nodes 17:27–17:46. Three visual variants:
 *   - active (17:47): 92px, `#160d07` bg, `#ba6e21` 1.5px border, orange ACTIVE label
 *   - highlight (17:27): 76px, `#130d08` bg, `#874f1a` border, orange category text
 *   - default (17:31/35/39/43): 76px, `#09090a` bg, `#241c14` border
 */
function JournalEventCard({
  beat,
  tone,
}: {
  beat: AnimationBeat;
  tone: 'active' | 'history';
}) {
  const e = beat.event;
  // Round-start renders as a slim scrollwork divider instead of a full card.
  if (e.kind === 'round_started' && tone === 'history') {
    return (
      <div
        className="flex items-center gap-2"
        style={{ margin: '6px 12px', height: 12 }}
        aria-hidden
      >
        <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.25)' }} />
        <span
          style={{
            color: 'rgba(212,175,55,0.6)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 1.5,
            fontFamily: 'Inter, system-ui, sans-serif',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Round {(e as Extract<BattleEvent, { kind: 'round_started' }>).round}
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.25)' }} />
      </div>
    );
  }

  const category = categoryOf(e);
  const isBossIntent = e.kind === 'boss_intent_declared';
  const isDamage = e.kind === 'damage_dealt';
  const isHighlighted = tone === 'active' || isBossIntent || (isDamage && e.amount >= 50);

  const bg = tone === 'active'
    ? '#160d07'
    : isHighlighted
    ? '#130d08'
    : '#09090a';
  const border = tone === 'active'
    ? '1.5px solid #ba6e21'
    : isHighlighted
    ? '1px solid #874f1a'
    : '1px solid #241c14';
  const categoryColor = tone === 'active'
    ? '#f59c30'
    : isHighlighted
    ? '#f0942e'
    : '#a38763';
  const height = tone === 'active' ? 92 : 76;

  return (
    <div
      className="relative"
      style={{
        margin: '4px 4px',
        height,
        background: bg,
        border,
        borderRadius: tone === 'active' ? 6 : 5,
        overflow: 'hidden',
      }}
    >
      {/* Category label */}
      <div
        style={{
          position: 'absolute',
          left: tone === 'active' ? 12.5 : 51,
          top: tone === 'active' ? 10 : 12,
          color: categoryColor,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 1.1,
          fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {tone === 'active' ? 'ACTIVE' : category}
      </div>

      {/* Icon gem — only on non-active cards; matches Figma 17:28 22px diamond at left */}
      {tone !== 'active' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 13,
            top: 22,
            width: 22,
            height: 22,
          }}
        >
          <IconGem cue={beat.cue} highlighted={isHighlighted} />
        </div>
      )}

      {/* Body text */}
      <div
        style={{
          position: 'absolute',
          left: tone === 'active' ? 12.5 : 51,
          top: tone === 'active' ? 32 : 30,
          right: 12,
          color: tone === 'active' ? '#ebd9b2' : '#d6c7a8',
          fontSize: tone === 'active' ? 12 : 11,
          fontWeight: tone === 'active' ? 600 : 400,
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: 1.35,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {formatEvent(e)}
      </div>
    </div>
  );
}

function IconGem({ cue, highlighted }: { cue: BeatCue; highlighted: boolean }) {
  const fill = highlighted ? '#e69c38' : '#4a3a22';
  const stroke = highlighted ? '#ffcc63' : '#7a5a30';
  return (
    <svg viewBox="0 0 22 22" fill="none" style={{ width: '100%', height: '100%' }}>
      <path
        d="M20 11L11 20L2 11L11 2L20 11Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
      />
      <text
        x="11"
        y="14"
        textAnchor="middle"
        fontSize="10"
        fill={highlighted ? '#1a0f05' : '#d6c7a8'}
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {glyphFor(cue)}
      </text>
    </svg>
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

function glyphFor(cue: BeatCue): string {
  switch (cue) {
    case 'intent': return '👁';
    case 'impact': return '⚔';
    case 'floating': return '+';
    case 'wind_up': return '↑';
    case 'phase': return '⚡';
    case 'handoff': return '»';
    case 'ultimate': return '★';
    default: return '·';
  }
}
