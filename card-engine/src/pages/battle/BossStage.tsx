import { useEffect, useRef, useState } from 'react';
import type { BossCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { getBossSprite } from '../../data/combat/bossSpriteManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { FloatingDamage } from './FloatingDamage';

interface Props {
  boss: BossCombatant;
  currentBeat: AnimationBeat | null;
}

/**
 * The boss as a large presence on the battlefield. Center-upper of the
 * Arena, grounded by a shadow, plays hit/wind-up presentation. This is
 * SEPARATE from the HUD portrait — this is the actual boss.
 */
export function BossStage({ boss, currentBeat }: Props) {
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

  const sprite = getBossSprite(boss.snapshot.bossId, 'idle');
  const spriteUrl = sprite ? resolveCombatAssetUrl(sprite) : null;

  const isWindingUp =
    currentBeat?.event.kind === 'boss_intent_declared' &&
    ['heavy_attack', 'area_attack', 'ultimate', 'execute'].includes(
      currentBeat.event.intent.intentType,
    );

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
        key={shakeKey}
        className="boss-stage-sprite relative"
        style={{
          width: 'clamp(320px, 34vw, 460px)',
          height: 'clamp(380px, 44vh, 560px)',
        }}
        aria-label={boss.snapshot.name}
      >
        {spriteUrl ? (
          <img
            src={spriteUrl}
            alt={boss.snapshot.name}
            className="w-full h-full object-contain"
            // P1: stack a warm ember rim-light on top of the existing dark
            // ground drop-shadow so the sprite reads as lit by the lava veins,
            // not pasted onto the arena.
            style={{
              imageRendering: 'auto',
              filter:
                'brightness(0.96) saturate(1.08) ' +
                'drop-shadow(0 18px 18px rgba(0,0,0,0.85)) ' +
                'drop-shadow(0 0 24px rgba(255,110,40,0.30))',
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
            <span className="font-fantasy text-5xl text-bone/80">🜂</span>
          </div>
        )}
        {/* Floating damage lives at boss center */}
        <FloatingDamage currentBeat={currentBeat} actorId={boss.actorId} />
      </div>
      {/* Ground shadow — tighter contact ellipse with a warm ember bleed so
          the sprite reads as physically standing on the lava-veined dais
          instead of floating over a neutral grey shadow. */}
      <div
        aria-hidden
        className="rounded-full mt-[-40px]"
        style={{
          width: 'clamp(200px, 22vw, 300px)',
          height: 'clamp(30px, 4.2vh, 46px)',
          background:
            'radial-gradient(ellipse at center, ' +
              'rgba(0,0,0,0.95) 0%, ' +
              'rgba(80,20,10,0.55) 42%, ' +
              'rgba(255,120,40,0.18) 72%, ' +
              'rgba(255,120,40,0) 92%)',
        }}
      />

      <style>{`
        /* Boss is anchored to the pedestal. No idle bob, no wind-up pulse,
           no zoom, no drift. The only motion is a brief violent shake on hit
           (fires when shakeKey changes) so damage feels impactful without
           breaking the sense that the boss is physically standing on the
           dais. Filters (brightness / drop-shadow) stay inside translate
           range so the sprite never appears to scale. */
        @keyframes boss-stage-hit-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-5px, 1px); filter: brightness(1.4); }
          30%  { transform: translate(5px, -1px); filter: brightness(1.4); }
          45%  { transform: translate(-3px, 0); }
          60%  { transform: translate(3px, 0); }
          75%  { transform: translate(-1px, 0); }
          100% { transform: translate(0, 0); filter: brightness(1); }
        }
        .boss-stage-sprite {
          animation: boss-stage-hit-shake 0.35s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .boss-stage-sprite { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
