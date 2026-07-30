import { useEffect, useRef, useState } from 'react';
import type { BossCombatant } from '../../types/combat';
import type { AnimationBeat, BeatSeverity } from '../../services/combat/presentation/types';
import { getGameFeel } from '../../services/combat/presentation/gameFeel';
import type { MotionLevel } from '../../vfx/types';
import { getBossClip } from '../../data/combat/bossSpriteManifest';
import { SpriteClipPlayer } from './SpriteClipPlayer';
import { bossClipForBeat } from './bossClipState';
import { resolveCombatAssetUrl, resolveCombatAssetPath } from '../../data/combat/types';
import { getBossRing } from '../../data/combat/bossRingManifest';
import { BossWeaponRing } from './BossWeaponRing';
import { BossPlatform, getBossPlatform } from './BossPlatform';
import { FloatingDamage } from './FloatingDamage';

interface Props {
  boss: BossCombatant;
  currentBeat: AnimationBeat | null;
  motionLevel: MotionLevel;
}

/**
 * The boss as a large presence on the battlefield. Center-upper of the
 * Arena, grounded by a shadow, plays hit/wind-up presentation. This is
 * SEPARATE from the HUD portrait — this is the actual boss.
 */
export function BossStage({ boss, currentBeat, motionLevel }: Props) {
  const [hit, setHit] = useState<{ key: number; severity?: BeatSeverity }>({ key: 0 });
  const lastShakeBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastShakeBeatId.current) return;
    if (currentBeat.suppressEffects) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt' || e.targetActorId !== boss.actorId) return;
    lastShakeBeatId.current = currentBeat.id;
    setHit((cur) => ({ key: cur.key + 1, severity: currentBeat.severity }));
  }, [currentBeat, boss.actorId]);

  const feel = getGameFeel(hit.severity, motionLevel);

  // Charge-up: a heavy (interruptible) boss intent lights this up and holds
  // it — spanning however many hero turns pass — until the matching
  // damage_dealt beat fires (hit lands) or the action fizzles from an
  // interrupt. This is a real telegraphed attack building, not the ambient
  // idle motion Raheem pulled from the intent panel on 2026-07-20 — that
  // was decorative; this is tied to an actual imminent hit.
  const [charging, setCharging] = useState(false);
  const lastChargeBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastChargeBeatId.current) return;
    lastChargeBeatId.current = currentBeat.id;
    const e = currentBeat.event;
    if (e.kind === 'boss_intent_declared' && currentBeat.severity === 'heavy') {
      setCharging(true);
    } else if (e.kind === 'damage_dealt' && e.sourceActorId === boss.actorId) {
      setCharging(false);
    } else if (e.kind === 'action_denied' && e.actorId === boss.actorId && e.reason === 'interrupted') {
      setCharging(false);
    }
  }, [currentBeat, boss.actorId]);

  // Which pose the boss holds is a projection of the CURRENT BEAT, not of live
  // battle state — live state has already run ahead of what the player sees.
  const clipState = bossClipForBeat(currentBeat, {
    bossActorId: boss.actorId,
    bossDefeated: boss.defeated,
    enraged: charging,
  });
  const clip = getBossClip(boss.snapshot.bossId, clipState);
  const spriteUrl = clip ? resolveCombatAssetUrl(clip.asset) : null;
  const ring = getBossRing(boss.snapshot.bossId);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
      style={{
        // P1: dropped from 2% → 10% so the sprite's feet land on the pixel
        // arena's central dais (candidate-4 dais sits at ~55% down the arena).
        top: '10%',
        pointerEvents: 'none',
      }}
    >
      <div
        key={hit.key}
        className={[
          feel.staticFallback ? 'boss-stage-static-hit' : 'boss-stage-sprite',
          // Bottom-aligned: the sprite is WIDTH-constrained inside this taller
          // box, so without this its feet sit well above the box bottom and the
          // platform (anchored to that bottom) lands far below him.
          'relative flex items-end justify-center',
          charging && (feel.staticFallback ? 'boss-stage-charging-static' : 'boss-stage-charging'),
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          width: 'clamp(320px, 34vw, 460px)',
          height: 'clamp(380px, 44vh, 560px)',
          ...({
            '--react-ms': `${feel.spriteShakeMs}ms`,
            '--shake-px': `${feel.spriteShakePx}px`,
            '--impact-flash': `${feel.impactFlash}`,
          } as React.CSSProperties),
        }}
        aria-label={`${boss.snapshot.name}${charging ? ' — charging a heavy attack' : ''}`}
      >
        {/* The ground he stands on, drawn here rather than painted into the
            arena so his feet meet it by construction — see BossPlatform. */}
        <BossPlatform spec={getBossPlatform(boss.snapshot.bossId)} motionLevel={motionLevel} />
        {/* Behind the sprite: the figure occludes the arc's inner edge, which
            is what sells the pieces as orbiting rather than floating in front. */}
        {ring && (
          <BossWeaponRing
            spec={ring}
            resolveUrl={resolveCombatAssetPath}
            motionLevel={motionLevel}
          />
        )}
        {spriteUrl && clip ? (
          <SpriteClipPlayer
            clip={clip}
            src={spriteUrl}
            // Restarting on the state alone would leave a second attack in a
            // row parked on its held last frame; the beat id makes each
            // firing a fresh play.
            clipKey={`${clipState}:${currentBeat?.id ?? 'none'}`}
            motion={motionLevel}
            alt={boss.snapshot.name}
            // P1: stack a warm ember rim-light on top of the existing dark
            // ground drop-shadow so the sprite reads as lit by the lava veins,
            // not pasted onto the arena.
            style={{
              filter:
                'brightness(0.96) saturate(1.08) ' +
                'drop-shadow(0 18px 18px rgba(0,0,0,0.85)) ' +
                'drop-shadow(0 0 24px rgba(255,110,40,0.30))',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, #f0a24a 0%, #c04010 30%, #5a1006 65%, transparent 100%)',
            }}
          >
            <span className="font-fantasy text-5xl text-bone/80">🜂</span>
          </div>
        )}
        {/* Floating damage lives at boss center */}
        <FloatingDamage currentBeat={currentBeat} actorId={boss.actorId} />
      </div>
      <style>{`
        /* Boss is anchored to the pedestal. No idle bob, no zoom, no drift —
           translate only, so the sprite never appears to scale or leave the
           dais it is standing on.

           The run opens with 18% of HITSTOP: the contact pose held frozen and
           blown out before anything moves. That pause is what carries the
           weight; the rattle after it only sells the recovery. Amplitude and
           duration arrive as custom properties from gameFeel.ts, so the boss
           and the heroes are struck with exactly the same force. */
        @keyframes boss-stage-hit-shake {
          0%, 18% { transform: translate(0, 0); filter: brightness(var(--impact-flash, 1.4)) saturate(0.5); }
          32%     { transform: translate(calc(var(--shake-px, 5px) * -1), 1px); filter: brightness(1.2); }
          48%     { transform: translate(var(--shake-px, 5px), -1px); }
          64%     { transform: translate(calc(var(--shake-px, 5px) * -0.5), 0); }
          82%     { transform: translate(calc(var(--shake-px, 5px) * 0.25), 0); }
          100%    { transform: translate(0, 0); filter: brightness(1); }
        }
        .boss-stage-sprite {
          animation: boss-stage-hit-shake var(--react-ms, 350ms) ease-out;
        }

        /* Motion off: hold the tint, move nothing. steps(1, end) snaps rather
           than interpolates, so nothing on screen actually moves — there is
           only a state the player can read. */
        @keyframes boss-stage-static-hit {
          0%, 92% { filter: brightness(1.35) saturate(1.25); }
          100%    { filter: none; }
        }
        .boss-stage-static-hit { animation: boss-stage-static-hit 900ms steps(1, end); }

        /* Charge-up — a real telegraphed heavy attack building, held for
           however many hero turns pass before it resolves. Brightens and
           intensifies over the loop rather than a flat pulse, so the last
           stretch before lock-in reads as "about to happen" (still
           stoppable — matches the existing interrupt mechanic). */
        @keyframes boss-stage-charge-pulse {
          0%   { filter: brightness(1) saturate(1); }
          70%  { filter: brightness(1.15) saturate(1.1); }
          100% { filter: brightness(1.55) saturate(1.35); }
        }
        /* Deliberately NOT compounded with .boss-stage-sprite: the base class
           changes when motion is off, and the charge tell must survive that.
           Declared after the hit-shake rule so it wins on source order when
           a hit lands mid-charge — the charge is the more important read. */
        .boss-stage-charging {
          animation: boss-stage-charge-pulse 1.4s ease-in-out infinite alternate;
        }
        .boss-stage-charging-static { filter: brightness(1.3) saturate(1.2); }

        /* Safety net only — the Motion setting is the real control. */
        @media (prefers-reduced-motion: reduce) {
          .boss-stage-sprite { animation: none !important; }
          .boss-stage-charging {
            animation: none !important;
            filter: brightness(1.3) saturate(1.2);
          }
        }
      `}</style>
    </div>
  );
}
