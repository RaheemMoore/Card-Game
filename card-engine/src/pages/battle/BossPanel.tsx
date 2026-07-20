import { useEffect, useRef, useState } from 'react';
import type { BossCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { ARENA_MANIFEST, DEFAULT_ARENA_ID } from '../../data/combat/arenaManifest';
import { getBossSprite } from '../../data/combat/bossSpriteManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { FloatingDamage } from './FloatingDamage';

interface Props {
  boss: BossCombatant;
  intentText: string | null;
  currentBeat: AnimationBeat | null;
}

/**
 * Boss panel. Renders Arena background + Combat Sprite from the C5/C6 asset
 * manifests. C7 wires visual effects (hit-shake, heavy-attack wind-up glow,
 * floating damage) to the presentation queue's currentBeat instead of raw
 * reducer state so effects pace with the Journal.
 */
export function BossPanel({ boss, intentText, currentBeat }: Props) {
  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const [shakeKey, setShakeKey] = useState(0);
  const lastShakeBeatId = useRef<string | null>(null);

  // Trigger hit-shake when the CURRENT beat is a damage_dealt targeting the boss.
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastShakeBeatId.current) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt' || e.targetActorId !== boss.actorId) return;
    lastShakeBeatId.current = currentBeat.id;
    setShakeKey((n) => n + 1);
  }, [currentBeat, boss.actorId]);

  const arena = ARENA_MANIFEST[DEFAULT_ARENA_ID];
  const bossSprite = getBossSprite(boss.snapshot.bossId, 'idle');
  const arenaUrl = arena ? resolveCombatAssetUrl(arena) : null;
  const spriteUrl = bossSprite ? resolveCombatAssetUrl(bossSprite) : null;

  const isWindingUp =
    currentBeat?.event.kind === 'boss_intent_declared' &&
    (currentBeat.event.intent.intentType === 'heavy_attack' ||
      currentBeat.event.intent.intentType === 'ultimate' ||
      currentBeat.event.intent.intentType === 'area_attack');

  return (
    <div
      className="rounded-lg border border-crimson/30 p-4 mb-3 relative overflow-hidden"
      style={
        arenaUrl
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(10,5,10,0.35), rgba(10,5,10,0.75)), url("${arenaUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { background: 'rgba(20,10,20,0.6)' }
      }
    >
      <div className="flex items-start gap-4 relative">
        <div
          key={shakeKey}
          className={`shrink-0 rounded-md relative overflow-hidden boss-portrait flex items-center justify-center ${
            isWindingUp ? 'boss-windup' : ''
          }`}
          style={{
            width: 148,
            height: 148,
            background: spriteUrl
              ? 'rgba(10,5,10,0.4)'
              : 'radial-gradient(ellipse at 50% 55%, #f0a24a 0%, #c04010 32%, #5a1006 68%, #1a0300 100%)',
            border: '2px solid rgba(184, 134, 11, 0.5)',
            boxShadow: 'inset 0 0 32px rgba(0,0,0,0.55), 0 0 18px rgba(216,76,13,0.35)',
          }}
          aria-label={`${boss.snapshot.name} — ${bossSprite?.approvalStatus ?? 'placeholder'} sprite`}
        >
          <span className="font-fantasy text-[10px] uppercase tracking-widest text-bone/50 absolute top-1 left-2 z-10">
            Boss
          </span>
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={boss.snapshot.name}
              className="w-full h-full object-contain"
              style={{ imageRendering: 'auto' }}
            />
          ) : (
            <div
              className="font-fantasy text-center text-bone px-2"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}
            >
              <div className="text-2xl leading-tight">🜂</div>
              <div className="text-[11px] mt-1 opacity-90">Emberborn</div>
            </div>
          )}
          <FloatingDamage currentBeat={currentBeat} actorId={boss.actorId} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-fantasy text-xl text-bone truncate">{boss.snapshot.name}</div>
          <div className="mt-2 h-3 rounded-full bg-void/80 overflow-hidden border border-bone/20">
            <div
              className="h-full bg-gradient-to-r from-crimson to-red-500 transition-all duration-300"
              style={{ width: `${hpPct * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-bone/60 mt-1 tabular-nums">
            {boss.hp} / {boss.snapshot.maxHp} HP · Phase{' '}
            {boss.currentPhaseId.replace(/^phase_fe_/, '')}
          </div>
          {intentText && (
            <div
              className={`mt-3 p-2 rounded border text-sm text-bone transition-colors ${
                isWindingUp
                  ? 'bg-crimson/30 border-crimson/70 shadow-[0_0_16px_rgba(216,76,13,0.55)]'
                  : 'bg-crimson/15 border-crimson/30'
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest text-crimson/80 mr-2">
                {isWindingUp ? 'Winding up' : 'Intent'}
              </span>
              {intentText}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes boss-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes boss-hit-shake {
          0% { transform: translate(0, 0); }
          15% { transform: translate(-3px, 1px); filter: brightness(1.6); }
          30% { transform: translate(3px, -1px); filter: brightness(1.6); }
          45% { transform: translate(-2px, 0); }
          60% { transform: translate(2px, 0); }
          75% { transform: translate(-1px, 1px); }
          100% { transform: translate(0, 0); filter: brightness(1); }
        }
        @keyframes boss-windup-pulse {
          0%, 100% { box-shadow: inset 0 0 32px rgba(0,0,0,0.55), 0 0 18px rgba(216,76,13,0.35); }
          50%      { box-shadow: inset 0 0 40px rgba(0,0,0,0.55), 0 0 34px rgba(255,120,40,0.85); }
        }
        .boss-portrait {
          animation: boss-bob 3s ease-in-out infinite, boss-hit-shake 0.35s ease-out;
        }
        .boss-portrait.boss-windup {
          animation: boss-bob 3s ease-in-out infinite, boss-windup-pulse 900ms ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .boss-portrait, .boss-portrait.boss-windup {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
