import { useEffect, useRef, useState } from 'react';
import type { BattleState } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import type { DamageType } from '../../types/abilities';
import { resolveImpactAnchors } from './combatAnchors';
import { useViewportWidth } from './useViewportWidth';

interface Props {
  state: BattleState;
  currentBeat: AnimationBeat | null;
}

interface Point {
  x: number;
  y: number;
}

/* Anchor points used to live here as local constants. They now come from
 * `combatAnchors.ts`, which is the single source both this layer and the
 * impact flash read — see `resolveImpactAnchors`. */

const ELEMENT_COLOR: Record<DamageType, string> = {
  kinetic: '#e8d6b2',
  searing: '#ff6a2b',
  radiant: '#ffe28a',
  umbral: '#8b5cf6',
  primal: '#6bcf6b',
  tech: '#7dd3fc',
  /* Nebula magenta, deliberately far from shadow's violet — the two are
     adjacent in the lore and must never be confused mid-fight. */
  astral: '#e879f9',
  true: '#f5f5f5',
};

interface Shot {
  id: string;
  from: Point;
  to: Point;
  color: string;
  /** True for a boss-sourced hit that resolved a 'heavy' (interruptible)
   *  charge-up — gets a visibly bigger, longer-held bolt/impact so the
   *  drama of the charge pays off in the hit itself. */
  heavy: boolean;
}

/**
 * A 2D bolt/zap that travels from attacker to target and bursts on impact,
 * keyed off the same `damage_dealt` events that already drive the hit-shake
 * on BossStage/HeroSpriteLayer. Purely decorative — reads events, never
 * feeds back into the reducer. Desktop only for now: the mobile party tray
 * rotates hero lanes on selection, so a stable per-hero anchor point would
 * need its own follow-up pass.
 */
export function AttackVFX({ state, currentBeat }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);
  const lastBeatId = useRef<string | null>(null);
  const viewportWidth = useViewportWidth();

  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastBeatId.current) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt') return;
    lastBeatId.current = currentBeat.id;

    // Shared resolver rather than a second copy of the anchor maths. This file
    // used to recompute the hero point itself, which is exactly how an anchor
    // drifts off its target when one side is tweaked.
    const anchors = resolveImpactAnchors(state, e.sourceActorId, e.targetActorId, viewportWidth);
    if (!anchors) return;
    const { from, to, sourceIsBoss } = anchors;
    const color = ELEMENT_COLOR[e.damageType] ?? ELEMENT_COLOR.kinetic;
    const heavy = sourceIsBoss && currentBeat.severity === 'heavy';

    const id = currentBeat.id;
    setShots((cur) => [...cur, { id, from, to, color, heavy }]);
    const timeout = window.setTimeout(() => {
      setShots((cur) => cur.filter((s) => s.id !== id));
    }, heavy ? 750 : 500);
    return () => window.clearTimeout(timeout);
  }, [currentBeat, state.boss.actorId, state.heroes, viewportWidth]);

  if (shots.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 22 }} aria-hidden>
      {shots.map((shot) => (
        <Bolt key={shot.id} {...shot} />
      ))}
    </div>
  );
}

function Bolt({ from, to, color, heavy }: Shot) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const length = Math.hypot(dx, dy);

  const boltHeight = heavy ? 10 : 4;
  const impactSize = heavy ? 84 : 44;
  const glowPx = heavy ? 16 : 6;
  const boltMs = heavy ? 320 : 220;
  const impactMs = heavy ? 520 : 380;

  return (
    <>
      <div
        className="attack-bolt"
        style={{
          position: 'absolute',
          left: `${from.x}%`,
          top: `${from.y}%`,
          width: `${length}%`,
          height: boltHeight,
          transformOrigin: '0 50%',
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(to right, transparent, ${color})`,
          borderRadius: boltHeight / 2,
        }}
      />
      <div
        className="attack-impact"
        style={{
          position: 'absolute',
          left: `${to.x}%`,
          top: `${to.y}%`,
          width: impactSize,
          height: impactSize,
          marginLeft: -impactSize / 2,
          marginTop: -impactSize / 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        }}
      />
      <style>{`
        @keyframes attack-bolt-travel {
          0%   { opacity: 0; transform: rotate(${angle}deg) scaleX(0); filter: drop-shadow(0 0 0 transparent); }
          10%  { opacity: 1; filter: drop-shadow(0 0 ${glowPx}px ${color}); }
          65%  { opacity: 1; transform: rotate(${angle}deg) scaleX(1); filter: drop-shadow(0 0 ${glowPx}px ${color}); }
          100% { opacity: 0; transform: rotate(${angle}deg) scaleX(1); filter: drop-shadow(0 0 ${glowPx}px ${color}); }
        }
        .attack-bolt { animation: attack-bolt-travel ${boltMs}ms ease-in forwards; }

        @keyframes attack-impact-burst {
          0%, 55% { opacity: 0; transform: scale(0.3); }
          70%     { opacity: 1; transform: scale(1.2); }
          100%    { opacity: 0; transform: scale(1.7); }
        }
        .attack-impact { animation: attack-impact-burst ${impactMs}ms ease-out forwards; }

        @media (prefers-reduced-motion: reduce) {
          .attack-bolt, .attack-impact { animation: none !important; display: none; }
        }
      `}</style>
    </>
  );
}
