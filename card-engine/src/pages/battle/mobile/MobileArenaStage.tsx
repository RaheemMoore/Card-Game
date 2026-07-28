import { useEffect, useRef, useState } from 'react';
import type { BossCombatant } from '../../../types/combat';
import type { AnimationBeat, BeatSeverity } from '../../../services/combat/presentation/types';
import { getGameFeel } from '../../../services/combat/presentation/gameFeel';
import type { MotionLevel } from '../../../vfx/types';
import { ARENA_MANIFEST, DEFAULT_ARENA_ID } from '../../../data/combat/arenaManifest';
import { getBossSprite } from '../../../data/combat/bossSpriteManifest';
import { resolveCombatAssetUrl } from '../../../data/combat/types';
import { FloatingDamage } from '../FloatingDamage';

interface Props {
  boss: BossCombatant;
  currentBeat: AnimationBeat | null;
  motionLevel: MotionLevel;
  /** Extra vertical emphasis when the party is in Playback Mode. */
  emphasized: boolean;
  /** Bottom reserve (px) where party cards float over the arena — used to
   *  bias the arena's ember gradient upward so cards read against a darker
   *  band without a hard edge. */
  cardTrayHeight: number;
}

/**
 * Mobile Arena — one continuous full-bleed background covering the entire
 * top zone of the mobile viewport (from screen top down to the player-
 * controls dock). Boss sprite is positioned in the upper third of the arena
 * so the head reads at the very top of the phone screen; the lower half
 * hosts the party card tray floating over the arena.
 */
export function MobileArenaStage({ boss, currentBeat, motionLevel, emphasized, cardTrayHeight }: Props) {
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

  // World-level reaction, tracked SEPARATELY from the boss-hit reaction
  // above. That one only fires when the boss is the target, but heavy blows
  // run boss -> hero, so keying the arena shake off it would mean the screen
  // never moved for exactly the hits that earned it.
  const [world, setWorld] = useState<{ key: number; severity?: BeatSeverity } | null>(null);
  const lastWorldBeatId = useRef<string | null>(null);
  const lastFlashAt = useRef(0);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastWorldBeatId.current) return;
    if (currentBeat.suppressEffects) return;
    if (currentBeat.event.kind !== 'damage_dealt') return;
    lastWorldBeatId.current = currentBeat.id;
    if (getGameFeel(currentBeat.severity, motionLevel).arenaShakeX === 0) return;
    // An area attack emits one damage event per hero; without this the
    // screen would strobe once per target.
    const now = performance.now();
    if (now - lastFlashAt.current < 400) return;
    lastFlashAt.current = now;
    setWorld((cur) => ({ key: (cur?.key ?? 0) + 1, severity: currentBeat.severity }));
  }, [currentBeat, motionLevel]);

  const worldFeel = getGameFeel(world?.severity, motionLevel);
  const worldShaking = world !== null && worldFeel.arenaShakeX > 0;

  // Charge-up — mirrors BossStage.tsx's desktop treatment. See that file for
  // the full rationale (real telegraphed heavy attack, not ambient motion).
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

  const arena = ARENA_MANIFEST[DEFAULT_ARENA_ID];
  const arenaUrl = arena ? resolveCombatAssetUrl(arena) : null;
  const sprite = getBossSprite(boss.snapshot.bossId, 'idle');
  const spriteUrl = sprite ? resolveCombatAssetUrl(sprite) : null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* The whole arena zone shakes as one on heavy/ultimate hits. Cheaper
          than the desktop tree's wrapper because this element ALREADY bounds
          exactly the diegetic content (background + atmosphere + boss) and
          already clips — the controls dock is a flex sibling, not an overlay.
          Overscan 1.02 is static, so displacement never exposes an edge.
          Amplitudes come from the same gameFeel table as desktop. */}
      <div
        key={world?.key ?? 0}
        className={worldShaking ? 'mobile-arena-shake' : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'scale(1.02)',
          willChange: 'transform',
          ...({
            '--arena-shake-x': `${worldFeel.arenaShakeX}px`,
            '--arena-shake-y': `${worldFeel.arenaShakeY}px`,
            '--arena-shake-ms': `${worldFeel.arenaShakeMs}ms`,
          } as React.CSSProperties),
        }}
      >
      {/* Arena background — full bleed */}
      <div
        className="absolute inset-0"
        style={
          arenaUrl
            ? {
                backgroundImage: `url("${arenaUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 22%',
              }
            : { background: 'radial-gradient(ellipse at 50% 25%, #3a1c14 0%, #0a0508 70%)' }
        }
      />

      {/* Ember atmosphere — biased so the top stays cool (HUD legibility) and
          the strip where the party card tray floats gets a slightly darker
          band so card frames read cleanly. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, ' +
              'rgba(5,3,8,0.60) 0%, ' +
              'rgba(5,3,8,0.15) 18%, ' +
              'rgba(5,3,8,0.00) 45%, ' +
              'rgba(60,18,8,0.20) 68%, ' +
              'rgba(20,10,12,0.55) 88%, ' +
              'rgba(6,4,10,0.85) 100%)',
        }}
      />

      {/* Boss sprite — anchored to the upper portion so the head reads near
          the top of the phone screen but stays below the boss header chip.
          The container spans from an upper offset down to just above the
          party card tray; the sprite uses explicit clamped dimensions and
          justifies to the top so its feet land near the tray's upper edge. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-start pointer-events-none"
        style={{
          top: emphasized ? '4%' : '6%',
          bottom: `${cardTrayHeight - 20}px`,
          transition: 'top 300ms ease-out, bottom 300ms ease-out',
          overflow: 'hidden',
        }}
      >
        <div
          key={hit.key}
          className={[
            feel.staticFallback ? 'mobile-boss-static-hit' : 'mobile-boss-sprite',
            'relative',
            charging && (feel.staticFallback ? 'mobile-boss-charging-static' : 'mobile-boss-charging'),
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            width: emphasized ? 'min(74vw, 320px)' : 'min(64vw, 280px)',
            height: emphasized ? 'min(42dvh, 320px)' : 'min(38dvh, 280px)',
            transition: 'width 300ms ease-out, height 300ms ease-out',
            ...({
              '--react-ms': `${feel.spriteShakeMs}ms`,
              '--shake-px': `${feel.spriteShakePx}px`,
              '--impact-flash': `${feel.impactFlash}`,
            } as React.CSSProperties),
          }}
          aria-label={`${boss.snapshot.name}${charging ? ' — charging a heavy attack' : ''}`}
        >
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={boss.snapshot.name}
              className="w-full h-full object-contain"
              style={{
                imageRendering: 'auto',
                filter:
                  'brightness(0.96) saturate(1.08) ' +
                  'drop-shadow(0 12px 12px rgba(0,0,0,0.85)) ' +
                  'drop-shadow(0 0 20px rgba(255,110,40,0.30))',
              }}
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 50%, #f0a24a 0%, #c04010 30%, #5a1006 65%, transparent 100%)',
              }}
            >
              <span className="font-fantasy text-4xl text-bone/80">🜂</span>
            </div>
          )}
          <FloatingDamage currentBeat={currentBeat} actorId={boss.actorId} />
        </div>
        {/* Ground contact shadow — kept minimal (drop-shadow filters on the
            sprite handle the primary ground read; a soft ember pool anchors
            the sprite to the arena floor without a floating grey blob). */}
      </div>

      </div>

      {/* Impact flash — last child, so it is naturally clipped to the arena
          zone and can never reach the card tray or the controls dock. Peak is
          capped lower than desktop: the screen is much closer to the face. */}
      {world && worldFeel.flashPeak > 0 && (
        <div
          key={`flash-${world.key}`}
          className="absolute inset-0 mobile-impact-flash"
          style={{
            background: 'radial-gradient(circle 70% at 50% 30%, #fff3d9 0%, #fff3d900 62%)',
            ...({
              '--flash-peak': `${Math.min(worldFeel.flashPeak, 0.28)}`,
              '--flash-ms': `${worldFeel.flashMs}ms`,
            } as React.CSSProperties),
          }}
        />
      )}

      <style>{`
        @keyframes mobile-arena-shake {
          0%   { transform: scale(1.02) translate(0, 0); }
          12%  { transform: scale(1.02) translate(calc(var(--arena-shake-x) * -1), var(--arena-shake-y)); }
          28%  { transform: scale(1.02) translate(var(--arena-shake-x), calc(var(--arena-shake-y) * -0.7)); }
          46%  { transform: scale(1.02) translate(calc(var(--arena-shake-x) * -0.6), calc(var(--arena-shake-y) * 0.5)); }
          64%  { transform: scale(1.02) translate(calc(var(--arena-shake-x) * 0.4), calc(var(--arena-shake-y) * -0.3)); }
          82%  { transform: scale(1.02) translate(calc(var(--arena-shake-x) * -0.15), 0); }
          100% { transform: scale(1.02) translate(0, 0); }
        }
        .mobile-arena-shake { animation: mobile-arena-shake var(--arena-shake-ms) cubic-bezier(0.25, 0.8, 0.35, 1); }

        @keyframes mobile-impact-flash {
          0%   { opacity: 0; }
          22%  { opacity: var(--flash-peak); }
          45%  { opacity: var(--flash-peak); }
          100% { opacity: 0; }
        }
        .mobile-impact-flash { animation: mobile-impact-flash var(--flash-ms) ease-out forwards; }

        /* Hitstop first, same 18% as the desktop tree — see gameFeel.ts. */
        @keyframes mobile-boss-hit-shake {
          0%, 18% { transform: translate(0, 0); filter: brightness(var(--impact-flash, 2.2)) saturate(0.5); }
          32%     { transform: translate(calc(var(--shake-px, 4px) * -1), 1px); filter: brightness(1.2); }
          48%     { transform: translate(var(--shake-px, 4px), -1px); }
          64%     { transform: translate(calc(var(--shake-px, 4px) * -0.5), 0); }
          82%     { transform: translate(calc(var(--shake-px, 4px) * 0.25), 0); }
          100%    { transform: translate(0, 0); filter: brightness(1); }
        }
        .mobile-boss-sprite { animation: mobile-boss-hit-shake var(--react-ms, 350ms) ease-out; }

        /* Motion off: hold the tint, move nothing. */
        @keyframes mobile-boss-static-hit {
          0%, 92% { filter: brightness(1.35) saturate(1.25); }
          100%    { filter: none; }
        }
        .mobile-boss-static-hit { animation: mobile-boss-static-hit 900ms steps(1, end); }

        @keyframes mobile-boss-charge-pulse {
          0%   { filter: brightness(1) saturate(1); }
          70%  { filter: brightness(1.15) saturate(1.1); }
          100% { filter: brightness(1.55) saturate(1.35); }
        }
        /* Not compounded with .mobile-boss-sprite — the base class changes when
           motion is off, and the charge tell has to survive that. */
        .mobile-boss-charging {
          animation: mobile-boss-charge-pulse 1.4s ease-in-out infinite alternate;
        }
        .mobile-boss-charging-static { filter: brightness(1.3) saturate(1.2); }

        @media (prefers-reduced-motion: reduce) {
          .mobile-boss-sprite { animation: none !important; }
          .mobile-arena-shake { animation: none !important; }
          .mobile-impact-flash { animation: none !important; opacity: 0 !important; }
          .mobile-boss-charging {
            animation: none !important;
            filter: brightness(1.3) saturate(1.2);
          }
        }
      `}</style>
    </div>
  );
}
