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
        top: '4%',
        pointerEvents: 'none',
      }}
    >
      <div
        key={shakeKey}
        className={`boss-stage-sprite relative ${isWindingUp ? 'boss-stage-windup' : ''}`}
        style={{
          width: 'min(360px, 34vw)',
          height: 'min(440px, 44vh)',
        }}
        aria-label={boss.snapshot.name}
      >
        {spriteUrl ? (
          <img
            src={spriteUrl}
            alt={boss.snapshot.name}
            className="w-full h-full object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.85)]"
            style={{ imageRendering: 'auto' }}
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
      {/* Ground shadow */}
      <div
        aria-hidden
        className="rounded-full mt-[-16px]"
        style={{
          width: 'min(280px, 28vw)',
          height: 'min(38px, 5vh)',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0) 75%)',
        }}
      />

      <style>{`
        @keyframes boss-stage-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes boss-stage-hit-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-6px, 2px); filter: brightness(1.5); }
          30%  { transform: translate(6px, -2px); filter: brightness(1.5); }
          45%  { transform: translate(-3px, 0); }
          60%  { transform: translate(3px, 0); }
          75%  { transform: translate(-1px, 1px); }
          100% { transform: translate(0, 0); filter: brightness(1); }
        }
        @keyframes boss-stage-windup {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.35) drop-shadow(0 0 32px rgba(255,120,40,0.7)); }
        }
        .boss-stage-sprite {
          animation: boss-stage-bob 3.5s ease-in-out infinite, boss-stage-hit-shake 0.4s ease-out;
        }
        .boss-stage-sprite.boss-stage-windup {
          animation: boss-stage-bob 3.5s ease-in-out infinite, boss-stage-windup 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .boss-stage-sprite, .boss-stage-sprite.boss-stage-windup {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
