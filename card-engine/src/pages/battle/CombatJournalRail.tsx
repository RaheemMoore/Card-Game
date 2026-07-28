import { useEffect, useRef, useState } from 'react';
import { JOURNAL_KIND_LABEL, type JournalEntry } from '../../services/combat/presentation/journalSummary';
import { CombatFrame } from './CombatFrame';

interface Props {
  /** Condensed one-line-per-action view over the event stream. */
  journalEntries: readonly JournalEntry[];
  /** Beat-pacing semantics (skip button, "N pending") stay beat-driven. */
  isPlaying: boolean;
  pendingCount: number;
  onSkip: () => void;
}

/**
 * Right-rail Combat Journal, sourced verbatim from Figma node 17:18
 * (CombatFrame/Journal, 330×760).
 *
 * Collapsed by default — shows only the 3 most recent entries, so the
 * journal (a Secondary/Tertiary-weight surface, see CombatFrame.tsx's
 * panel-tier comment) can't outweigh the boss intent panel or command
 * shelf just by being tall. A header control expands a full-screen
 * overlay with the complete, still-scrollable history — no data is ever
 * dropped, only how much renders inline at once. Mirrors the pattern
 * `mobile/MobileCombatJournal.tsx` already uses for its drawer (same
 * close affordances: button, backdrop click, Escape).
 *
 * Layout:
 *   - Journal Header  — dark strip, gold hairline, uppercase title, round pill
 *   - Expand control  — slim row, opens the full-history overlay
 *   - Ornament Divider — a short scrollwork rule + diamond
 *   - Event cards     — 282×76, 5px radius; boss-intent variant has warm orange border
 *   - Active Event    — 282×92, 6px radius, orange border, gold ACTIVE label
 *     (suppressed to normal-history styling when it duplicates the boss
 *     intent panel's own content — see `isDuplicateIntent` below)
 */
export function CombatJournalRail({ journalEntries, isPlaying, pendingCount, onSkip }: Props) {
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
  // The upper-left BossHUDOverlay intent panel is already the detailed,
  // authoritative source for the boss's current intent — when the most
  // recent journal entry is that same intent, pin it with plain history
  // styling instead of the loud "ACTIVE" orange card so it doesn't compete
  // with (or just re-announce) that panel. Non-intent entries (action
  // results, phase changes) keep the active treatment since they're not
  // shown anywhere else.
  const activeToneSuppressed = latest?.kind === 'boss_intent';
  const currentRound = latest ? latest.round : 0;

  // Collapsed: only the 3 most recent entries.
  const collapsedSlice = journalEntries.slice(-3);
  const collapsedHistory = activeToneSuppressed ? collapsedSlice : collapsedSlice.slice(0, -1);
  // Full: everything, same active/history split.
  const fullHistory = activeToneSuppressed ? journalEntries : journalEntries.slice(0, -1);

  return (
    <>
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

          {/* Expand control — opens the full-history overlay. Kept as its
              own slim row rather than crammed into the header, which is
              already carrying the round pill + skip button. */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{
              marginLeft: -8,
              marginRight: -8,
              padding: '5px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(51,31,15,0.6)',
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

          {/* Ornament divider (short scrollwork rule + diamond) */}
          <OrnamentDivider />

          {/* History (scrolls) — collapsed to the 3 most recent entries */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto"
            style={{ paddingTop: 4, paddingBottom: 4 }}
            aria-live="polite"
          >
            {collapsedHistory.map((entry, i) => (
              <JournalEventCard
                key={entry.id}
                entry={entry}
                tone="history"
                isLatest={activeToneSuppressed && i === collapsedHistory.length - 1}
              />
            ))}
          </div>

          {/* Active event card — pinned, unless it duplicates boss intent */}
          {latest && !activeToneSuppressed && (
            <div style={{ marginTop: 8 }}>
              <JournalEventCard entry={latest} tone="active" />
            </div>
          )}
        </div>
      </CombatFrame>

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
            <CombatFrame preset="journal" style={{ maxHeight: '82dvh' }}>
              <div className="flex flex-col" style={{ maxHeight: '82dvh', padding: '2px 8px 8px 8px' }}>
                <div
                  className="relative flex items-center justify-between"
                  style={{
                    height: 48,
                    marginLeft: -8,
                    marginRight: -8,
                    marginTop: -2,
                    paddingLeft: 24,
                    paddingRight: 16,
                    borderBottom: '1px solid rgba(51,31,15,0.9)',
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
                    {currentRound > 0 && (
                      <span style={{ marginLeft: 10, color: '#a88c63', fontSize: 10, letterSpacing: 1 }}>
                        ROUND {currentRound}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-label="Close full journal history"
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      border: '1px solid #573b1f',
                      background: '#0f0e0f',
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
                  {fullHistory.map((entry, i) => (
                    <JournalEventCard
                      key={entry.id}
                      entry={entry}
                      tone="history"
                      isLatest={activeToneSuppressed && i === fullHistory.length - 1}
                    />
                  ))}
                  {latest && !activeToneSuppressed && (
                    <div style={{ marginTop: 8, marginBottom: 4 }}>
                      <JournalEventCard entry={latest} tone="active" />
                    </div>
                  )}
                </div>
              </div>
            </CombatFrame>
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
 * Journal event card matching Figma nodes 17:27–17:46. Three visual variants:
 *   - active (17:47): 92px, `#160d07` bg, `#ba6e21` 1.5px border, orange ACTIVE label
 *   - highlight (17:27): 76px, `#130d08` bg, `#874f1a` border, orange category text
 *   - default (17:31/35/39/43): 76px, `#09090a` bg, `#241c14` border
 */
function JournalEventCard({
  entry,
  tone,
  isLatest = false,
}: {
  entry: JournalEntry;
  tone: 'active' | 'history';
  /** True when this history-toned card is still the most recent entry
   *  (its "active" treatment was suppressed as a boss-intent duplicate).
   *  Gets a thin gold accent instead of the full orange "ACTIVE" card, so
   *  recency stays identifiable without re-competing with the intent panel. */
  isLatest?: boolean;
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
  const isHighlighted = tone === 'active' || isBossIntent;

  const bg = tone === 'active'
    ? '#160d07'
    : isHighlighted
    ? '#130d08'
    : '#09090a';
  const border = tone === 'active'
    ? '1.5px solid #ba6e21'
    : isLatest
    ? '1px solid #57381c'
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
        borderLeft: isLatest && tone === 'history' ? '2px solid #d4af37' : undefined,
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
        {tone === 'active' ? 'ACTIVE' : isLatest ? `${category} · LATEST` : category}
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
          <IconGem kind={entry.kind} highlighted={isHighlighted} />
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
        {entry.text}
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
