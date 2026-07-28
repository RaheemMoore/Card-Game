import { useEffect, useRef, useState } from 'react';
import type { HeroCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { getHeroSprite, getHeroSpriteAnchor } from '../../data/combat/heroSpriteManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { getStatus } from '../../data/abilities/statuses';
import { FloatingDamage } from './FloatingDamage';
import { computeHeroLaneXPercents } from './PartyDock';
import { useViewportWidth } from './useViewportWidth';

interface TargetPickMode {
  pickableActorIds: string[];
}

interface Props {
  heroes: HeroCombatant[];
  actingActorId: string;
  canAct: boolean;
  currentBeat: AnimationBeat | null;
  targetPickMode?: TargetPickMode | null;
}

/**
 * Height every archetype's SILHOUETTE is normalized to — not the height of
 * the source image, which varies by a factor of three between the two art
 * sources. See `HERO_SPRITE_ANCHORS` for why that distinction matters.
 */
const HERO_BODY_HEIGHT = 'clamp(165px, 22vh, 265px)';

/**
 * Hero pixel sprites, standing in the arena floor band directly above the
 * command shelf. Purely presentational — no click handling at all; the
 * docked mini-cards (`PartyDock.tsx`) remain the single source of truth for
 * turn-order select and ability targeting. This layer only ECHOES that
 * state (acting glow, target-pickable pulse) so the two representations of
 * the same hero never visually disagree, and carries the actual combat
 * reactions: hit-shake, attack-lunge, floating damage/heal/shield numbers,
 * a shield ring, an ambient low-HP tint, and small status pills.
 *
 * Every sprite is anchored FEET-DOWN to one shared floor line at one shared
 * body height, using the per-archetype `anchor` fractions in the sprite
 * manifest. This replaced a fixed box + `object-contain object-bottom`, which
 * aligned the images' bottom EDGES rather than the characters' feet — so the
 * Figma-pack archetypes (~23% padding under the feet) floated well above the
 * Leonardo ones and rendered ~40% smaller. Anything positional added here
 * must hang off the floor line too, or it will reintroduce that drift.
 */
export function HeroSpriteLayer({ heroes, actingActorId, canAct, currentBeat, targetPickMode = null }: Props) {
  const viewportWidth = useViewportWidth();
  // Lanes sit entirely right of the reserved party-dock width (see
  // computeHeroLaneXPercents docstring) — never under the fanned mini-cards,
  // filling the open floor space between the dock and the arena's right
  // edge. AttackVFX.tsx must call this exact same function so beam anchors
  // never drift off the sprites.
  const laneXPercents = computeHeroLaneXPercents(viewportWidth);

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        // Just above PartyDock (z-index 20) so the sprites are never hidden
        // behind the fanned cards, and below the AttackVFX bolt layer (22).
        zIndex: 21,
        // The floor line — feet land just inside the shelf's top frame line
        // (the shelf is 8.5rem tall with a 10px painted border), so the party
        // stands ON the large frame rather than sunk down onto the ability
        // tiles. Deep enough to close the gap, shallow enough that the top
        // edge still reads as the ground they're standing on.
        bottom: 'calc(8.5rem - 12px)',
        height: 0,
      }}
      aria-hidden
    >
      {heroes.map((combatant, i) => {
        const pickable = targetPickMode ? targetPickMode.pickableActorIds.includes(combatant.actorId) : false;
        const isActing = canAct && combatant.actorId === actingActorId;
        return (
          <div
            key={combatant.actorId}
            className="absolute"
            // Zero-sized: this element IS the lane's floor point (lane center ×
            // floor line). Every child positions itself against it, so nothing
            // — status pills included — can push a sprite off the baseline.
            style={{ left: `${laneXPercents[i]}%`, bottom: 0, width: 0, height: 0 }}
          >
            <HeroSprite combatant={combatant} isActing={isActing} currentBeat={currentBeat} pickable={pickable} />
          </div>
        );
      })}
    </div>
  );
}

function HeroSprite({
  combatant,
  isActing,
  currentBeat,
  pickable,
}: {
  combatant: HeroCombatant;
  isActing: boolean;
  currentBeat: AnimationBeat | null;
  pickable: boolean;
}) {
  const isDefeated = combatant.defeated;

  // A single reaction slot — 'hit' (this hero was the damage TARGET, plays
  // the shake) or 'attack' (this hero was the damage SOURCE, plays the
  // lunge). Kept mutually exclusive on one key so the two animations never
  // both fire on the same beat and layer into a muddled combined motion.
  const [reaction, setReaction] = useState<{ key: number; type: 'hit' | 'attack' } | null>(null);
  const lastReactionBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastReactionBeatId.current) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt') return;
    if (e.targetActorId === combatant.actorId) {
      lastReactionBeatId.current = currentBeat.id;
      setReaction((cur) => ({ key: (cur?.key ?? 0) + 1, type: 'hit' }));
    } else if (e.sourceActorId === combatant.actorId) {
      lastReactionBeatId.current = currentBeat.id;
      setReaction((cur) => ({ key: (cur?.key ?? 0) + 1, type: 'attack' }));
    }
  }, [currentBeat, combatant.actorId]);

  const spriteAsset = getHeroSprite(combatant.snapshot.archetype);
  const spriteUrl = spriteAsset ? resolveCombatAssetUrl(spriteAsset) : null;
  const anchor = getHeroSpriteAnchor(combatant.snapshot.archetype);

  // Scale the whole PNG so the character inside it lands at HERO_BODY_HEIGHT,
  // then offset it so the character's feet — not the image's bottom edge —
  // sit on the floor line and its silhouette center sits on the lane center.
  // Pure calc() so the vh-driven sizing stays responsive without a JS resize.
  const imgH = `calc(${HERO_BODY_HEIGHT} * ${anchor.heightScale ?? 1} / ${anchor.bodyHeight})`;
  const imgW = `calc(${imgH} * ${spriteAsset.dimensions.width / spriteAsset.dimensions.height})`;
  const frame = {
    position: 'absolute' as const,
    width: imgW,
    height: imgH,
    // Dead space below the feet hangs below the floor line...
    bottom: `calc(${imgH} * ${-(1 - anchor.baseline)})`,
    // ...and the silhouette's own center, not the image's, lands on the lane.
    left: `calc(${imgW} * ${-anchor.centerX})`,
  };

  const hpPct = Math.max(0, combatant.hp / combatant.snapshot.maxHp);
  const lowHp = !isDefeated && hpPct <= 0.25;
  const shieldTotal = combatant.shields.reduce((sum, s) => sum + s.amount, 0);
  const statuses = combatant.statuses.slice(0, 3);
  const overflowCount = combatant.statuses.length - statuses.length;

  if (isDefeated) {
    return (
      <div className="pointer-events-none">
        {spriteUrl && (
          <div style={{ ...frame, opacity: 0.35, filter: 'grayscale(1) brightness(0.5)' }}>
            <img src={spriteUrl} alt="" aria-hidden className="w-full h-full" draggable={false} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-none">
      {spriteUrl && (
        <>
          <div
            key={reaction?.key ?? 0}
            className={`${reaction?.type === 'hit' ? 'hero-sprite-shake' : ''} ${reaction?.type === 'attack' ? 'hero-sprite-attack' : ''} ${pickable ? 'hero-sprite-target-pulse' : ''} ${lowHp ? 'hero-sprite-low-hp' : ''}`}
            style={{
              ...frame,
              filter: isActing
                ? 'brightness(1) saturate(1)'
                : 'brightness(0.82) saturate(0.9)',
              boxShadow: shieldTotal > 0 ? '0 0 0 2px rgba(190,225,255,0.65), 0 0 10px 2px rgba(140,200,255,0.35)' : 'none',
              borderRadius: 10,
            }}
          >
            <img
              src={spriteUrl}
              alt={combatant.snapshot.displayName}
              className="w-full h-full"
              draggable={false}
            />
            {shieldTotal > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 14,
                  padding: '0 3px',
                  background: 'rgba(15,43,58,0.85)',
                  border: '1px solid rgba(140,200,255,0.6)',
                  color: '#bfe6f5',
                }}
              >
                🛡{shieldTotal}
              </span>
            )}
            <FloatingDamage currentBeat={currentBeat} actorId={combatant.actorId} />
          </div>

          {/* Ground shadow — centered on the floor point, sunk slightly under
              it so the feet read as touching it rather than resting on a disc. */}
          <div
            aria-hidden
            className="absolute rounded-full -translate-x-1/2"
            style={{
              width: 'clamp(70px, 7vw, 110px)',
              height: 'clamp(11px, 1.4vh, 17px)',
              left: 0,
              bottom: -4,
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, transparent 90%)',
            }}
          />

          {/* Status pills — small, static, informational only. Absolute (they
              used to be in flow, which lifted any hero carrying a status off
              the shared baseline by the pill row's own height). */}
          {statuses.length > 0 && (
            <div
              className="absolute flex flex-wrap items-center justify-center gap-0.5 -translate-x-1/2"
              style={{ maxWidth: 96, width: 96, left: 0, top: 6 }}
            >
              {statuses.map((s) => {
                const def = getStatus(s.statusId);
                const positive = def?.category === 'positive';
                return (
                  <span
                    key={s.instanceId}
                    className="rounded uppercase tracking-wide"
                    style={{
                      fontSize: 7,
                      padding: '1px 3px',
                      background: 'rgba(20,20,24,0.75)',
                      border: `1px solid ${positive ? 'rgba(52,211,153,0.4)' : 'rgba(220,38,38,0.4)'}`,
                      color: '#cbb98f',
                    }}
                  >
                    {def?.displayName ?? s.statusId}
                  </span>
                );
              })}
              {overflowCount > 0 && (
                <span
                  className="rounded"
                  style={{ fontSize: 7, padding: '1px 3px', background: 'rgba(20,20,24,0.75)', border: '1px solid rgba(120,110,90,0.4)', color: '#cbb98f' }}
                >
                  +{overflowCount}
                </span>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes hero-sprite-hit-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-4px, 1px); filter: brightness(1.4); }
          30%  { transform: translate(4px, -1px); filter: brightness(1.4); }
          45%  { transform: translate(-3px, 0); }
          60%  { transform: translate(3px, 0); }
          100% { transform: translate(0, 0); }
        }
        .hero-sprite-shake { animation: hero-sprite-hit-shake 0.35s ease-out; }

        @keyframes hero-sprite-attack-lunge {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(-6px) scale(1.05); filter: brightness(1.15); }
          100% { transform: translateY(0) scale(1); }
        }
        .hero-sprite-attack { animation: hero-sprite-attack-lunge 0.3s ease-out; }

        @keyframes hero-sprite-target-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(235,150,46,0.6)); }
          50%      { filter: drop-shadow(0 0 14px rgba(235,150,46,0.9)); }
        }
        .hero-sprite-target-pulse { animation: hero-sprite-target-pulse 1.1s ease-in-out infinite; }

        /* Ambient low-HP tell — deliberately much slower than every other
           animation here (hit-shake 0.35s, target-pulse 1.1s) so it reads
           as a quiet ongoing fact, not a competing alert. No color shift,
           no size change, no glow — the dock's HP bar + "!" glyph remain
           the legible, explicit signal; this is a secondary ambient one. */
        @keyframes hero-sprite-low-hp-breathe {
          0%, 100% { filter: saturate(1) brightness(1); }
          50%      { filter: saturate(0.72) brightness(0.94); }
        }
        .hero-sprite-low-hp { animation: hero-sprite-low-hp-breathe 4.2s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .hero-sprite-shake { animation: none !important; }
          .hero-sprite-attack { animation: none !important; }
          .hero-sprite-target-pulse { animation: none !important; filter: drop-shadow(0 0 10px rgba(235,150,46,0.8)) !important; }
          .hero-sprite-low-hp { animation: none !important; filter: saturate(0.82) !important; }
        }
      `}</style>
    </div>
  );
}
