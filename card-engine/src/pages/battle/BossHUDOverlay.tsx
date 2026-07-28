import { useEffect, useRef, useState } from 'react';
import type { BossCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { getCurrentBossVersion } from '../../services/bosses/registry';
import { PaintedPanel } from './PaintedPanel';

interface Props {
  boss: BossCombatant;
  currentBeat: AnimationBeat | null;
}

/**
 * Upper-left Boss HUD.
 *
 * Renders through the shared CombatFrame primitive using the canonical Figma
 * `bossHud` preset. Layout, stroke, and typography values follow the Figma
 * Combat Frame System spec (file 9IIvc01ts7LZJ0RaCMGanf, node 22:39). Do not
 * fork.
 *
 * The attached Intent panel (Figma 22:76) that used to hang below this frame
 * was removed — it was a second large left-hand box restating what the Turn
 * Badge and the Combat Journal already carry. Its two unique data points
 * (intent target + projected damage) moved onto the journal's boss-intent
 * entry; see `journalSummary.ts`.
 */
export function BossHUDOverlay({ boss, currentBeat }: Props) {
  // P1 pulled the wind-up shadow pulse from the intent panel per Raheem
  // 2026-07-20 (no screen motion) — `currentBeat` stayed unused since. It's
  // used now for one restrained thing: `cue === 'phase'` (phase
  // transitions) had zero visual consumer anywhere in the combat UI, a real
  // existing hook nothing was wired to. One-shot border flash, same
  // beat-id-tracking pattern HeroForeground already uses for its hit-shake.
  const [phaseFlashKey, setPhaseFlashKey] = useState(0);
  const lastPhaseFlashBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat || currentBeat.cue !== 'phase') return;
    if (currentBeat.id === lastPhaseFlashBeatId.current) return;
    lastPhaseFlashBeatId.current = currentBeat.id;
    setPhaseFlashKey((k) => k + 1);
  }, [currentBeat]);

  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const phaseLabel = boss.currentPhaseId.replace(/^phase_fe_/, '').toUpperCase();
  const isRage = phaseLabel === 'RAGE';

  const RAGE_THRESHOLD = 0.25;
  const rageFillPct = Math.max(
    0,
    Math.min(100, ((RAGE_THRESHOLD - hpPct) / RAGE_THRESHOLD) * -100 + 100),
  );

  const version = getCurrentBossVersion(boss.snapshot.bossId);
  const resistances = version?.resistanceProfile ?? { resistant: [], weak: [] };

  return (
    <div className="absolute top-3 left-3 z-30" style={{ width: 372 }}>
      {/* Localized dark radial for legibility over arena */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-lg"
        style={{
          top: '-12px',
          left: '-14px',
          right: '-14px',
          bottom: '-12px',
          background: 'radial-gradient(ellipse at 30% 45%, rgba(4,2,8,0.7) 0%, rgba(4,2,8,0) 78%)',
        }}
      />

      {/* Primary HUD frame — painted ring + filigree corners, same family as
          the command shelf. The Figma interior is 356×180 (22:39); declared
          size is that plus 2×borderWidth so the absolutely-positioned children
          below keep the exact offsets they had under CombatFrame's 2px stroke.
          Rage no longer swaps a stroke token (the ring is art now) — it reads
          through the warm elevation shadow instead. */}
      <PaintedPanel
        key={phaseFlashKey}
        className="boss-hud-phase-flash"
        borderWidth={8}
        cornerSize={24}
        background="#060708"
        style={{
          position: 'relative',
          width: 372,
          height: 196,
          boxShadow: isRage
            ? '0px 8px 22px rgba(255,120,40,0.35)'
            : '0px 8px 18px rgba(0,0,0,0.55)',
        }}
        role="status"
        ariaLabel={`${boss.snapshot.name}: ${boss.hp} of ${boss.snapshot.maxHp} HP, phase ${phaseLabel}`}
      >
        {/* Boss name — Figma: Inter Semi-Bold 18px #eddbb5 at (22,18) */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 18,
            color: '#eddbb5',
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: 0.4,
            lineHeight: 'normal',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {boss.snapshot.name.toUpperCase()}
        </div>

        {/* Subtitle — Figma: Inter Regular 10px #8c7d63 tracking 1.2px at (22,45) */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 45,
            color: '#8c7d63',
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: 1.2,
            whiteSpace: 'pre',
          }}
        >
          {`BOSS  •  ${phaseLabel}`}
        </div>

        {/* HP bar — Figma: frame 312×14, fill 276-scaled by pct */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 68,
            width: 312,
            height: 14,
            background: '#1a0909',
            border: '1px solid #4a1f14',
            borderRadius: 7,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 2,
              top: 2,
              width: `${Math.max(0, hpPct * 308)}px`,
              height: 10,
              background: '#c71412',
              borderRadius: 5,
              transition: 'width 300ms',
            }}
          />
        </div>

        {/* HP text — Figma: Inter Regular 11px #d9c7a6 at (22,89) */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 89,
            color: '#d9c7a6',
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {boss.hp} / {boss.snapshot.maxHp} HP
        </div>

        {/* RAGE label + bar — Figma: label Inter Semi-Bold 10px #e0912e at (22,110);
            bar frame 126×8 at (88,113); fill scaled by pct */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 110,
            color: '#e0912e',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'pre',
          }}
        >
          {`RAGE  ${Math.round(rageFillPct)}%`}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 113,
            width: 126,
            height: 8,
            background: '#1c140a',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 1,
              top: 1,
              width: `${(rageFillPct / 100) * 124}px`,
              height: 6,
              background: '#ed8c1a',
              borderRadius: 3,
              transition: 'width 500ms',
            }}
          />
        </div>

        {/* Resistance tiles — Figma: originally 3 chips at y=140, 24px tall.
            Down to 2: the 3rd ("RAGE") was a redundant 3rd signal for the
            same boolean already shown by the RAGE bar above AND this
            frame's amber border/glow when raging — dropped, not hidden.
            "ARMOR N" was also a mislabel: N is `resistant.length`, a count
            of resisted elemental types, not a mitigation stat — renamed to
            say what it actually is. Widened to fill the freed width. */}
        <ResistTile
          x={22}
          w={98}
          label={`FIRE ${resistances.resistant.includes('fire' as never) ? '−' : ' '}`}
          active={resistances.resistant.includes('fire' as never)}
        />
        <ResistTile
          x={130}
          w={98}
          label={`RESISTS ${resistances.resistant.length}`}
          active={resistances.resistant.length > 0}
        />
      </PaintedPanel>

      <style>{`
        @keyframes boss-hud-phase-flash {
          0%   { box-shadow: 0 0 0 0 rgba(255,214,140,0); }
          20%  { box-shadow: 0 0 26px 6px rgba(255,214,140,0.65); }
          100% { box-shadow: 0 0 0 0 rgba(255,214,140,0); }
        }
        .boss-hud-phase-flash { animation: boss-hud-phase-flash 900ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .boss-hud-phase-flash { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/**
 * Resistance readout — a gem pip plus its label, with NO box of its own.
 *
 * Was a bordered 24px chip (Figma 15:33/15:35/15:37). Inside the painted
 * ring that read as a second frame competing with the panel's own; the rule
 * for these surfaces is now one ring per panel, and everything inside it is
 * a pip, a rule, or an accent. The pip carries the active/inactive state
 * through fill AND brightness, so it isn't color-alone.
 */
function ResistTile({
  x,
  w,
  label,
  active,
}: {
  x: number;
  w: number;
  label: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 142,
        width: w,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
      aria-label={label}
    >
      <svg
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
        style={{ width: 11, height: 11, flex: '0 0 auto' }}
      >
        <path
          d="M11.3 6L6 11.3L0.7 6L6 0.7L11.3 6Z"
          fill={active ? '#e69c38' : '#33291a'}
          stroke={active ? '#ffcc63' : '#5c4526'}
          strokeWidth="1"
        />
      </svg>
      <span
        style={{
          color: active ? '#e6d3ab' : '#8d7c60',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 0.8,
          fontFamily: 'Inter, system-ui, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
    </div>
  );
}

