import { useEffect, useRef, useState } from 'react';
import { JOURNAL_KIND_LABEL, type JournalEntry } from '../../services/combat/presentation/journalSummary';
import { PaintedPanel } from './PaintedPanel';

interface Props {
  /** Condensed one-line-per-action view over the event stream. */
  journalEntries: readonly JournalEntry[];
  /** Beat-pacing semantics (skip button, "N pending") stay beat-driven. */
  isPlaying: boolean;
  pendingCount: number;
  onSkip: () => void;
  /** Authoritative round from BattleState — the header used to derive this
   *  from the latest entry, which lags the reducer by a beat. */
  round: number;
  /** Rounds left before the timeout defeat. Was the Turn Badge's third line;
   *  the badge is gone, and this is otherwise invisible to the player. */
  roundsRemaining: number;
}

/**
 * Combat Journal, sourced from Figma node 17:18 (CombatFrame/Journal).
 *
 * Positions itself as a bounded TOP-RIGHT CORNER BOX, tucked under the Turn
 * Badge — it is no longer the full-height right column of a two-column grid.
 * That column permanently cost ~280px of width and boxed the command shelf
 * into the arena cell; see `CombatViewport.tsx`.
 *
 * Collapsed by default — shows only the 2 most recent entries, so the
 * journal (a Secondary/Tertiary-weight surface, see CombatFrame.tsx's
 * panel-tier comment) can't outweigh the Boss HUD or command shelf just by
 * being tall. A header control expands a full-screen overlay with the
 * complete, still-scrollable history — no data is ever dropped, only how
 * much renders inline at once. Mirrors the pattern
 * `mobile/MobileCombatJournal.tsx` already uses for its drawer (same
 * close affordances: button, backdrop click, Escape).
 *
 * Since the upper-left Intent panel was removed, this is the ONLY surface
 * carrying boss-intent detail — so a boss-intent latest entry now gets the
 * full ACTIVE treatment (it used to be deliberately suppressed to avoid
 * competing with that panel) plus the target + projected damage that panel
 * uniquely showed, carried on the entry from `journalSummary.ts`.
 *
 * Layout:
 *   - Journal Header  — dark strip, gold hairline, uppercase title, round pill
 *   - Expand control  — slim row, opens the full-history overlay
 *   - Ornament Divider — a short scrollwork rule + diamond
 *   - Event cards     — 76px tall, 5px radius; boss-intent variant has warm orange border
 *   - Active Event    — 92px, 6px radius, orange border, gold ACTIVE label
 */
export function CombatJournalRail({
  journalEntries,
  isPlaying,
  pendingCount,
  onSkip,
  round,
  roundsRemaining,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const expandedScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [journalEntries.length]);

  useEffect(() => {
    if (!expanded) return;
    const el = expandedScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const latest = journalEntries[journalEntries.length - 1] ?? null;
  // Amber inside the last 5 rounds — same threshold the Turn Badge used.
  const timeoutNear = roundsRemaining <= 5;

  // Collapsed: only the 2 most recent entries, so the box stays corner-sized.
  const collapsedHistory = journalEntries.slice(-2, -1);
  const fullHistory = journalEntries.slice(0, -1);

  return (
    <>
      {/* Self-positioning corner box, hard right at the top. The Turn Badge
          sits to its LEFT on the same row (see CombatScene.tsx), not above
          it — so this owns the corner and its `top` matches the Boss HUD's.
          Geometry lives in `.combat-journal-box` (CombatViewport.tsx) so a
          media query can move it below the Boss HUD on narrow viewports,
          where 360 + 320 side by side no longer fits. */}
      <div
        className="absolute z-30 combat-journal-box"
        style={{ maxWidth: 'calc(100vw - 24px)' }}
      >
      <PaintedPanel
        borderWidth={8}
        cornerSize={24}
        background="#060708"
        style={{ position: 'relative', maxHeight: 300, boxShadow: '0px 10px 22px rgba(0,0,0,0.58)' }}
        ariaLabel="Combat Journal"
      >
        <div className="flex flex-col" style={{ maxHeight: 284, padding: '2px 4px 6px 4px' }}>
          {/* Header — title row. The dark inset strip it used to sit on was
              removed: inside the painted ring that was a second frame edge,
              and the rule for these panels is one ring per panel. */}
          {/* One flex row, not absolute-positioned children: the header used
              to be 56px tall with the round pill and the Skip button stacked
              on separate lines, and dropping it to a single 40px row made
              them collide. */}
          <div
            className="flex items-baseline"
            style={{
              gap: 8,
              padding: '10px 12px 6px 12px',
              borderBottom: '1px solid rgba(120,80,40,0.28)',
            }}
          >
            <div
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                color: '#ebd1a3',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: 1.5,
                fontFamily: 'Inter, system-ui, sans-serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              COMBAT JOURNAL
            </div>
            {isPlaying && (
              <button
                type="button"
                onClick={onSkip}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                style={{
                  flex: '0 0 auto',
                  color: 'rgba(230,220,180,0.65)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  textDecoration: 'underline',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
                aria-label={`Skip ${pendingCount} pending combat beats`}
              >
                Skip · {pendingCount}
              </button>
            )}
          </div>

          {/* Sub-header row: the full-history control on the left, the turn
              counter + timeout clock on the right. Those two readouts moved
              here from the removed top-right Turn Badge; the title row above
              is already carrying the Skip button and truncates if they go
              there too. */}
          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: '5px 12px',
              borderBottom: '1px solid rgba(120,80,40,0.2)',
            }}
          >
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'rgba(216,197,163,0.6)',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              aria-haspopup="dialog"
              aria-label={`Expand combat journal — view full history (${journalEntries.length} entries)`}
            >
              <span aria-hidden style={{ fontSize: 10 }}>⤢</span>
              Full history
            </button>
            <div
              style={{
                flex: '0 0 auto',
                color: '#a88c63',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1.1,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
              aria-label={`Turn ${round}, ${roundsRemaining} rounds remaining before timeout defeat`}
            >
              TURN {round}
              <span style={{ color: timeoutNear ? '#e6a04a' : '#6f5c44', marginLeft: 6 }}>
                · {roundsRemaining} LEFT
              </span>
            </div>
          </div>

          {/* Ornament divider (short scrollwork rule + diamond) */}
          <OrnamentDivider />

          {/* History (scrolls) — collapsed to the 2 most recent entries */}
          <div
            ref={scrollRef}
            className="min-h-0 overflow-y-auto"
            style={{ paddingTop: 4, paddingBottom: 4 }}
            aria-live="polite"
          >
            {collapsedHistory.map((entry) => (
              <JournalEventCard key={entry.id} entry={entry} tone="history" />
            ))}
          </div>

          {/* Active event card — pinned */}
          {latest && (
            <div style={{ marginTop: 8 }}>
              <JournalEventCard entry={latest} tone="active" />
            </div>
          )}
        </div>
      </PaintedPanel>
      </div>

      {/* Full-history overlay */}
      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full combat journal history"
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div
            onClick={() => setExpanded(false)}
            aria-hidden
            style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,8,0.8)' }}
          />
          <div className="relative w-full max-w-xl mx-4" style={{ maxHeight: '82dvh' }}>
            <PaintedPanel
              borderWidth={8}
              cornerSize={24}
              background="#060708"
              style={{ position: 'relative', maxHeight: '82dvh', boxShadow: '0px 10px 22px rgba(0,0,0,0.58)' }}
            >
              <div className="flex flex-col" style={{ maxHeight: 'calc(82dvh - 16px)', padding: '2px 4px 6px 4px' }}>
                <div
                  className="relative flex items-center justify-between"
                  style={{
                    height: 44,
                    paddingLeft: 12,
                    paddingRight: 8,
                    borderBottom: '1px solid rgba(120,80,40,0.28)',
                  }}
                >
                  <span
                    style={{
                      color: '#ebd1a3',
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: 1.5,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    COMBAT JOURNAL
                    <span style={{ marginLeft: 10, color: '#a88c63', fontSize: 10, letterSpacing: 1 }}>
                      TURN {round}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-label="Close full journal history"
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    style={{
                      width: 28,
                      height: 28,
                      border: 'none',
                      background: 'transparent',
                      color: '#d6c7a8',
                      cursor: 'pointer',
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <OrnamentDivider />
                <div
                  ref={expandedScrollRef}
                  className="overflow-y-auto"
                  style={{ paddingTop: 4, paddingBottom: 4 }}
                  aria-live="polite"
                >
                  {fullHistory.map((entry) => (
                    <JournalEventCard key={entry.id} entry={entry} tone="history" />
                  ))}
                  {latest && (
                    <div style={{ marginTop: 8, marginBottom: 4 }}>
                      <JournalEventCard entry={latest} tone="active" />
                    </div>
                  )}
                </div>
              </div>
            </PaintedPanel>
          </div>
        </div>
      )}
    </>
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
 * One journal entry, rendered as a ROW rather than a card.
 *
 * Was three bordered-box variants (Figma 17:27–17:46). Inside the painted
 * panel ring those boxes read as a second, competing frame, so they were
 * dropped entirely: entries are now separated by a hairline rule, the pinned
 * `active` entry is marked with a gold left accent plus brighter type, and
 * height is content-driven instead of a fixed 76/92/106.
 */
function JournalEventCard({
  entry,
  tone,
}: {
  entry: JournalEntry;
  tone: 'active' | 'history';
}) {
  // Round markers render as a slim scrollwork divider instead of a full card.
  if (entry.kind === 'round_marker' && tone === 'history') {
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
          {entry.text}
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.25)' }} />
      </div>
    );
  }

  const category = JOURNAL_KIND_LABEL[entry.kind];
  const isBossIntent = entry.kind === 'boss_intent';
  const isActive = tone === 'active';
  const isHighlighted = isActive || isBossIntent;

  const categoryColor = isActive ? '#f59c30' : isHighlighted ? '#f0942e' : '#a38763';
  // The target + projected-damage readout the removed upper-left Intent panel
  // used to own. Only on the pinned active row — history entries are past
  // tense, where a projection is noise.
  const showIntentMeta =
    isActive && isBossIntent && (entry.intentTargetLabel != null || (entry.intentDamage ?? 0) > 0);

  return (
    <div
      className="flex"
      style={{
        gap: 9,
        padding: '8px 10px',
        // No box: rows are separated by a hairline rule, and the pinned
        // active row is marked by a gold left accent. One ring per panel —
        // a bordered card here fought the painted frame around it.
        borderBottom: '1px solid rgba(120,80,40,0.28)',
        borderLeft: isActive ? '2px solid #d4af37' : '2px solid transparent',
      }}
    >
      <div aria-hidden style={{ flex: '0 0 auto', width: 20, height: 20, marginTop: 2 }}>
        <IconGem kind={entry.kind} highlighted={isHighlighted} />
      </div>

      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        {/* Label row — category on the left, intent target on the right */}
        <div className="flex items-baseline" style={{ gap: 8 }}>
          <span
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              color: categoryColor,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 1.1,
              fontFamily: 'Inter, system-ui, sans-serif',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isActive ? (isBossIntent ? 'INTENT' : 'ACTIVE') : category}
          </span>
          {showIntentMeta && (
            <span
              style={{
                flex: '0 0 auto',
                color: '#d1bd9c',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1,
                fontFamily: 'Inter, system-ui, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              {`TARGET ${entry.intentTargetLabel ?? '\u2014'}`}
            </span>
          )}
        </div>

        {/* Body row — telegraph/result text, with the damage number pulled
            out to the right so it stays scannable at a glance. */}
        <div className="flex items-center" style={{ gap: 10, marginTop: 3 }}>
          <div
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              color: isActive ? '#ebd9b2' : '#d6c7a8',
              fontSize: isActive ? 12 : 11,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: 1.35,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {entry.text}
          </div>
          {showIntentMeta && (entry.intentDamage ?? 0) > 0 && (
            <div
              style={{
                flex: '0 0 auto',
                color: '#ff571f',
                fontSize: 19,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 6px rgba(0,0,0,0.7)',
              }}
              aria-label={`Projected damage ${entry.intentDamage}`}
            >
              {entry.intentDamage}
              {entry.intentTargetLabel === 'ALL HEROES' ? ' EACH' : ''}
            </div>
          )}
        </div>
        {entry.receipts.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: 4, marginTop: 5 }}>
            {entry.receipts.slice(0, 3).map((receipt) => (
              <span
                key={receipt.text}
                style={{
                  color: receipt.tone === 'damage' ? '#ff7656' : receipt.tone === 'warning' ? '#f0a14a' : '#9fe0ab',
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: 0.7,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {receipt.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IconGem({ kind, highlighted }: { kind: JournalEntry['kind']; highlighted: boolean }) {
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
        {glyphFor(kind)}
      </text>
    </svg>
  );
}

function glyphFor(kind: JournalEntry['kind']): string {
  switch (kind) {
    case 'boss_intent': return '👁';
    case 'action': return '⚔';
    case 'boss_action': return '⚔';
    case 'phase': return '⚡';
    case 'round_marker': return '»';
    case 'battle_end': return '★';
    default: return '·';
  }
}
