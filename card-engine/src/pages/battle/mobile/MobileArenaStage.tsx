import { useEffect, useRef, useState } from 'react';
import type { BossCombatant } from '../../../types/combat';
import type { AnimationBeat } from '../../../services/combat/presentation/types';
import { ARENA_MANIFEST, DEFAULT_ARENA_ID } from '../../../data/combat/arenaManifest';
import { getBossSprite } from '../../../data/combat/bossSpriteManifest';
import { resolveCombatAssetUrl } from '../../../data/combat/types';
import { FloatingDamage } from '../FloatingDamage';

interface Props {
  boss: BossCombatant;
  currentBeat: AnimationBeat | null;
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
export function MobileArenaStage({ boss, currentBeat, emphasized, cardTrayHeight }: Props) {
  const [shakeKey, setShakeKey] = useState(0);
  const lastShakeBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastShakeBeatId.current) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt' || e.targetActorId !== boss.actorId) return;
    lastShakeBeatId.current = currentBeat.id;
    setShakeKey((n) => n + 1);
  }, [currentBeat, boss.actorId]);

  const arena = ARENA_MANIFEST[DEFAULT_ARENA_ID];
  const arenaUrl = arena ? resolveCombatAssetUrl(arena) : null;
  const sprite = getBossSprite(boss.snapshot.bossId, 'idle');
  const spriteUrl = sprite ? resolveCombatAssetUrl(sprite) : null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
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
          key={shakeKey}
          className="mobile-boss-sprite relative"
          style={{
            width: emphasized ? 'min(74vw, 320px)' : 'min(64vw, 280px)',
            height: emphasized ? 'min(42dvh, 320px)' : 'min(38dvh, 280px)',
            transition: 'width 300ms ease-out, height 300ms ease-out',
          }}
          aria-label={boss.snapshot.name}
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

      <style>{`
        @keyframes mobile-boss-hit-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-4px, 1px); filter: brightness(1.4); }
          30%  { transform: translate(4px, -1px); filter: brightness(1.4); }
          45%  { transform: translate(-2px, 0); }
          60%  { transform: translate(2px, 0); }
          100% { transform: translate(0, 0); filter: brightness(1); }
        }
        .mobile-boss-sprite { animation: mobile-boss-hit-shake 0.35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .mobile-boss-sprite { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
