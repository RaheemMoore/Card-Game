import { useEffect, useRef, useState } from 'react';
import type { HeroCombatant } from '../../types/combat';
import type { AnimationBeat, BeatSeverity } from '../../services/combat/presentation/types';
import { getGameFeel } from '../../services/combat/presentation/gameFeel';
import type { MotionLevel } from '../../vfx/types';
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
  motionLevel: MotionLevel;
}

/** The boss stands dead centre; a hero's lane sits somewhere to its right.
 *  +1 means "the boss is to my right", which is the direction an attacker
 *  lunges and the opposite of the direction a victim is knocked. */
function towardBoss(laneXPercent: number): 1 | -1 {
  return laneXPercent > 50 ? -1 : 1;
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
export function HeroSpriteLayer({ heroes, actingActorId, canAct, currentBeat, targetPickMode = null, motionLevel }: Props) {
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
            <HeroSprite
              combatant={combatant}
              isActing={isActing}
              currentBeat={currentBeat}
              pickable={pickable}
              motionLevel={motionLevel}
              facing={towardBoss(laneXPercents[i] ?? 50)}
            />
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
  motionLevel,
  facing,
}: {
  combatant: HeroCombatant;
  isActing: boolean;
  currentBeat: AnimationBeat | null;
  pickable: boolean;
  motionLevel: MotionLevel;
  facing: 1 | -1;
}) {
  const isDefeated = combatant.defeated;

  // A single reaction slot — 'hit' (this hero was the damage TARGET, plays
  // the shake) or 'attack' (this hero was the damage SOURCE, plays the
  // lunge). Kept mutually exclusive on one key so the two animations never
  // both fire on the same beat and layer into a muddled combined motion.
  // Severity rides along so the reaction can be sized to the blow.
  const [reaction, setReaction] = useState<
    { key: number; type: 'hit' | 'attack'; severity?: BeatSeverity } | null
  >(null);
  const lastReactionBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastReactionBeatId.current) return;
    // Beats flushed by skip() never earned their build-up; replaying the
    // last one's reaction in isolation just looks like a glitch.
    if (currentBeat.suppressEffects) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt') return;
    const severity = currentBeat.severity;
    if (e.targetActorId === combatant.actorId) {
      lastReactionBeatId.current = currentBeat.id;
      setReaction((cur) => ({ key: (cur?.key ?? 0) + 1, type: 'hit', severity }));
    } else if (e.sourceActorId === combatant.actorId) {
      lastReactionBeatId.current = currentBeat.id;
      setReaction((cur) => ({ key: (cur?.key ?? 0) + 1, type: 'attack', severity }));
    }
  }, [currentBeat, combatant.actorId]);

  const feel = getGameFeel(reaction?.severity, motionLevel);

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
  // Scoped per hero — three sprites on screen would otherwise share one id.
  const shieldGradientId = `shield-face-${combatant.actorId}`;
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
            className={[
              // With motion off the reaction becomes a held tint instead of
              // being dropped. Losing movement must never mean losing the
              // fact that something happened to this hero.
              reaction?.type === 'hit' && (feel.staticFallback ? 'hero-sprite-static-hit' : 'hero-sprite-shake'),
              reaction?.type === 'attack' && (feel.staticFallback ? 'hero-sprite-static-act' : 'hero-sprite-attack'),
              pickable && 'hero-sprite-target-pulse',
              lowHp && 'hero-sprite-low-hp',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              ...frame,
              filter: isActing
                ? 'brightness(1) saturate(1)'
                : 'brightness(0.82) saturate(0.9)',
              borderRadius: 10,
              // Drive the shared keyframes per-instance. Percentages inside
              // @keyframes cannot be parameterised, so the HOLD is a fixed
              // fraction of the run and severity varies the duration instead.
              ...({
                '--react-ms': `${feel.spriteShakeMs}ms`,
                '--shake-px': `${feel.spriteShakePx}px`,
                '--knock-px': `${feel.spriteShakePx * -facing}px`,
                '--lunge-px': `${feel.lungePx * facing}px`,
                '--anticipate-px': `${feel.lungePx * -facing * 0.25}px`,
                '--impact-flash': `${feel.impactFlash}`,
              } as React.CSSProperties),
            }}
          >
            <img
              src={spriteUrl}
              alt={combatant.snapshot.displayName}
              className="w-full h-full"
              draggable={false}
            />
            <FloatingDamage currentBeat={currentBeat} actorId={combatant.actorId} />
          </div>

          {/* Shield — a crest floating off the hero's shoulder rather than a
              ring around the whole sprite. The full-perimeter glow it replaced
              traced the IMAGE's bounding box, not the character, so it read as
              a rectangle of light around a person instead of a ward they were
              carrying. Anchored to shoulder height off the shared floor line
              (see this file's docstring — anything positional must be, or it
              drifts between the two art sources). */}
          {shieldTotal > 0 && (
            <div
              aria-hidden
              className={feel.staticFallback ? '' : 'hero-shield-crest'}
              style={{
                position: 'absolute',
                left: 26,
                bottom: `calc(${HERO_BODY_HEIGHT} * 0.7)`,
                width: 30,
                height: 34,
              }}
            >
              <svg viewBox="0 0 30 34" width="30" height="34">
                <defs>
                  <linearGradient id={shieldGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8fd4ff" stopOpacity="0.95" />
                    <stop offset="55%" stopColor="#3f8fd0" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#12395e" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                {/* Heater shield: flat top, shoulders, tapering to a point. */}
                <path
                  d="M15 1.5 L28 6 L28 17 C28 25 21 30.5 15 32.5 C9 30.5 2 25 2 17 L2 6 Z"
                  fill={`url(#${shieldGradientId})`}
                  stroke="#cfeaff"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(120,200,255,0.75))' }}
                />
                <text
                  x="15"
                  y="20"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#f2fbff"
                  style={{ paintOrder: 'stroke', stroke: '#0b2740', strokeWidth: 2.5 }}
                >
                  {shieldTotal}
                </text>
              </svg>
            </div>
          )}

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
        /* HITSTOP. The first 18% of the run holds the contact pose, frozen
           and blown out, before anything moves. That pause is what gives a
           blow weight — the motion afterwards only sells the recovery. It is
           baked into the keyframes rather than driven by a game loop, so it
           costs no new infrastructure and cannot desync from the beat. */
        @keyframes hero-sprite-hit-shake {
          0%, 18% { transform: translate(0, 0); filter: brightness(var(--impact-flash)) saturate(0.4); }
          /* Knockback: the first real displacement goes AWAY from the
             attacker, then decays into the symmetric rattle. */
          30%     { transform: translate(var(--knock-px), 1px); filter: brightness(1.15); }
          46%     { transform: translate(calc(var(--shake-px) * -0.7), -1px); }
          62%     { transform: translate(calc(var(--shake-px) * 0.5), 0); }
          80%     { transform: translate(calc(var(--shake-px) * -0.25), 0); }
          100%    { transform: translate(0, 0); }
        }
        .hero-sprite-shake { animation: hero-sprite-hit-shake var(--react-ms, 350ms) ease-out; }

        /* A STRIKE, not a hop. This used to be translateY(-6px) scale(1.05),
           which read as the hero jumping on the spot while the damage landed
           somewhere else entirely. Now they pull back a frame (anticipation),
           drive horizontally at the boss, and settle. */
        @keyframes hero-sprite-attack-lunge {
          0%   { transform: translateX(0); }
          18%  { transform: translateX(var(--anticipate-px)); }
          42%  { transform: translateX(var(--lunge-px)) scale(1.04); filter: brightness(1.2); }
          58%  { transform: translateX(var(--lunge-px)) scale(1.04); filter: brightness(1.2); }
          100% { transform: translateX(0) scale(1); }
        }
        .hero-sprite-attack { animation: hero-sprite-attack-lunge 380ms cubic-bezier(0.2, 0.9, 0.3, 1); }

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

        /* The ward drifts — it is a held magical object, not part of the
           body, so a slow bob separates it from the sprite's own motion.
           Deliberately far slower than any reaction animation so it reads as
           an ongoing state rather than competing for attention. */
        @keyframes hero-shield-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        .hero-shield-crest { animation: hero-shield-float 3s ease-in-out infinite; }

        /* Motion-off substitutes. steps(1, end) means the value SNAPS and
           then holds — no interpolation, so there is genuinely no movement
           on screen, only a state that is legible for long enough to read.
           This is the house rule: kill the motion, keep the information. */
        @keyframes hero-sprite-static-hit {
          0%, 92% { filter: brightness(1.35) saturate(1.25); }
          100%    { filter: brightness(0.82) saturate(0.9); }
        }
        .hero-sprite-static-hit { animation: hero-sprite-static-hit 900ms steps(1, end); }

        @keyframes hero-sprite-static-act {
          0%, 92% { filter: brightness(1.2); }
          100%    { filter: brightness(0.82) saturate(0.9); }
        }
        .hero-sprite-static-act { animation: hero-sprite-static-act 600ms steps(1, end); }

        /* Safety net only. The Motion setting is the real control and it
           already defaults to 'off' when the OS asks for reduced motion; this
           guarantees correct behaviour even if a class slips through. */
        @media (prefers-reduced-motion: reduce) {
          .hero-sprite-shake { animation: none !important; }
          .hero-sprite-attack { animation: none !important; }
          .hero-sprite-target-pulse { animation: none !important; filter: drop-shadow(0 0 10px rgba(235,150,46,0.8)) !important; }
          .hero-sprite-low-hp { animation: none !important; filter: saturate(0.82) !important; }
          .hero-shield-crest { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
