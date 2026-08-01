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
import {
  getBossSignature,
  layersForAction,
  type SignatureLayerId,
} from '../../data/combat/bossSignatureManifest';
import { BossWeaponRing, type RingPhase } from './BossWeaponRing';
import { BossRuneHalo } from './BossRuneHalo';
import { BossFlowerBed } from './BossFlowerBed';
import { BossSceneDressing } from './BossSceneDressing';
import { BossSummonedFlowers } from './BossSummonedFlowers';
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
  /**
   * WHICH action is charging, not merely that one is.
   *
   * `charging` alone tells the player something is coming but not what — every
   * heavy intent lights up identically, which is the same defect the wind-up
   * clip work fixed at the sprite level ("a telegraph the player can only read
   * in the banner text is not a telegraph"), repeating one level up. Holding the
   * action id lets each attack power up its OWN signature layer, so the Still
   * Season's two moves announce themselves in different colours in different
   * parts of the screen. See `bossSignatureManifest`.
   */
  const [chargingActionId, setChargingActionId] = useState<string | undefined>();
  const lastChargeBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastChargeBeatId.current) return;
    lastChargeBeatId.current = currentBeat.id;
    const e = currentBeat.event;
    if (e.kind === 'boss_intent_declared' && currentBeat.severity === 'heavy') {
      setCharging(true);
      setChargingActionId(e.intent.actionId);
    } else if (e.kind === 'damage_dealt' && e.sourceActorId === boss.actorId) {
      setCharging(false);
    } else if (e.kind === 'action_denied' && e.actorId === boss.actorId && e.reason === 'interrupted') {
      setCharging(false);
    } else if (e.kind === 'actor_defeated' && e.actorId === boss.actorId) {
      // Killed mid-charge. Without this the charge pulse keeps running over
      // the defeat pose — the boss dies still visibly winding up an attack
      // that will never land, which reads as the fight being unfinished at the
      // exact moment it is won. Only reachable when the party kills her during
      // a telegraph, which is a GOOD outcome and looked like a bug.
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

  /**
   * What the weapon ring is doing.
   *
   * Derived from the same beat the sprite reads, so the ring and the figure can
   * never disagree about what is happening. Precedence matches the sprite's:
   * death outranks a launch, a launch outranks a charge.
   */
  const ringEvent = currentBeat?.event;
  const bossIsDealingDamage =
    ringEvent?.kind === 'damage_dealt' && ringEvent.sourceActorId === boss.actorId;
  const ringPhase: RingPhase = boss.defeated
    ? 'defeated'
    : bossIsDealingDamage && !currentBeat?.suppressEffects
      ? 'firing'
      : charging
        ? 'charging'
        : 'idle';

  // Stable per-beat, so the same blow always throws the same weapon.
  const firingIndex = hashToIndex(currentBeat?.id ?? '');

  /**
   * Signature layers, and which of them this particular action owns.
   *
   * The action id comes from the charge while a telegraph is up, and from the
   * landing blow's `sourceActionId` at impact — so a layer that lit up during
   * the wind-up is the same one that flashes when the hit connects. Reading only
   * the charge would leave the flash unattributed on the frame that matters.
   */
  const signature = getBossSignature(boss.snapshot.bossId);
  const impactActionId =
    ringEvent?.kind === 'damage_dealt' && ringEvent.sourceActorId === boss.actorId
      ? ringEvent.sourceActionId
      : undefined;
  const activeLayers = layersForAction(
    boss.snapshot.bossId,
    bossIsDealingDamage ? impactActionId : chargingActionId,
  );
  /**
   * A layer only advances past `idle` when the CURRENT action owns it — EXCEPT
   * on an ultimate, which outranks ownership.
   *
   * The ultimate is read off `clipState`, the same projection the sprite uses,
   * so the halo's swell and the boss's scream are driven by one value and cannot
   * drift apart. Deriving it independently from the event is how a telegraph and
   * a pose end up a frame out of step.
   */
  const phaseFor = (layer: SignatureLayerId): RingPhase | 'ultimate' =>
    boss.defeated
      ? 'defeated'
      : clipState === 'ultimate'
        ? 'ultimate'
        : !activeLayers.includes(layer)
          ? 'idle'
          : bossIsDealingDamage && !currentBeat?.suppressEffects
            ? 'firing'
            : charging
              ? 'charging'
              : 'idle';

  return (
    <>
      {/* The flower bed is a SIBLING of the sprite box, not a child of it. The
          box below is width-constrained to the figure (clamp(300px, 32vw,
          440px)); a floor-wide bed nested inside it would be clipped to his
          shoulders. As a sibling it shares the arena's coordinate space and
          spans the whole floor, which is the point — it is the area-attack
          tell, so it has to cover the ground the party is standing on. */}
      {/* Atmosphere, behind everything: overgrowth, the light he throws into
          the room, shafts and motes. Answers "it doesn't feel very druid" with
          CONTENT rather than with a tint on the arena — see BossSceneDressing. */}
      {signature?.dressing && (
        <BossSceneDressing
          spec={signature.dressing}
          resolveUrl={resolveCombatAssetPath}
          motionLevel={motionLevel}
          // An ULTIMATE also lights the ground. `charging` is only set by a
          // heavy intent, so keying the ground effects off it alone left the
          // floor completely dark during the biggest move in the fight — every
          // other layer escalated and the ground sat out.
          charging={charging || clipState === 'ultimate'}
          defeated={boss.defeated}
        />
      )}
      {/* PixelLab flower props that grow out of the floor, tear free and rise
          as he charges. A sibling of the sprite box for the same reason the
          flower bed is: they scatter across the whole arena floor, and the
          sprite box is width-clamped to the figure. */}
      {signature?.dressing?.summonProps && (
        <BossSummonedFlowers
          paths={signature.dressing.summonProps}
          resolveUrl={resolveCombatAssetPath}
          motionLevel={motionLevel}
          phase={
            boss.defeated
              ? 'off'
              : clipState === 'ultimate'
                ? 'ultimate'
                : charging
                  ? 'charging'
                  : 'off'
          }
          bloomKey={chargingActionId ?? currentBeat?.id ?? 0}
        />
      )}
      {signature?.flowers && (
        <BossFlowerBed
          spec={signature.flowers}
          resolveUrl={resolveCombatAssetPath}
          motionLevel={motionLevel}
          phase={phaseFor('flower_bed')}
          fireKey={currentBeat?.id ?? 0}
        />
      )}
    <div
      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
      style={{
        // Tuned per arena art: his feet (and the scorch ring drawn at them)
        // have to land inside the moot-ground's painted stone circle, whose
        // near edge sits ~62% down the plate. At 10% he stood above it, on
        // nothing.
        //
        // Raised from 19% to 27% together with the shorter box below. Once he
        // gained a WIND-UP pose his raised fists reached the top of the arena
        // and slid under the boss HUD panel — the old geometry was tuned when
        // every clip was the same standing still, so nothing ever reached
        // above his own head.
        top: '27%',
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
          // The ultimate gets its own escalation on the SPRITE BOX, on top of
          // whatever the clip is doing. The clip alone was legible but small —
          // it is a 200px figure screaming, and the fight's biggest moment
          // should be felt at the scale of the stage, not the sprite.
          clipState === 'ultimate' && !feel.staticFallback && 'boss-stage-ultimate',
          // Death. Listed last so it wins on source order over the charge and
          // hit rules — nothing outranks the fight being over.
          boss.defeated && 'boss-stage-defeated',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          width: 'clamp(300px, 32vw, 440px)',
          // Shortened from 44vh/380 min. The box has to fit between the boss
          // HUD's lower edge and the dais his feet stand on, and the wind-up
          // pose uses the FULL height of that box where the old idle-only
          // sprite left slack at the top.
          height: 'clamp(300px, 39vh, 480px)',
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
        {/* The seat he is actually sitting on. Inside the sprite box, not out
            at arena level, because it has to register against the FIGURE — he
            is cross-legged, so his sprite's ground line is his own shins and
            the throne is what puts a floor under them. Anchored to the box
            bottom, the same edge the platform uses. */}
        {signature?.dressing?.throne && (
          <img
            src={resolveCombatAssetPath(signature.dressing.throne.path)}
            alt=""
            aria-hidden
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: `${signature.dressing.throne.bottomOffset * 100}%`,
              width: `${signature.dressing.throne.scale * 100}%`,
              height: 'auto',
              translate: '-50% 0',
              zIndex: 0,
              filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.7))',
            }}
          />
        )}
        {/* Signature layers. The halo sits behind the sprite so he occludes its
            lower inner edge — that overlap is what reads as "behind him". */}
        {signature?.halo && (
          <BossRuneHalo
            spec={signature.halo}
            resolveUrl={resolveCombatAssetPath}
            motionLevel={motionLevel}
            phase={phaseFor('rune_halo')}
            fireKey={currentBeat?.id ?? 0}
          />
        )}
        {ring && (
          <BossWeaponRing
            spec={ring}
            resolveUrl={resolveCombatAssetPath}
            motionLevel={motionLevel}
            phase={ringPhase}
            // Which weapon flies is derived from the beat id, so it varies
            // between attacks but is identical on replay of the same fight.
            firingIndex={firingIndex}
            fireKey={currentBeat?.id ?? 0}
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
            // Stack a rim-light on the dark ground drop-shadow so the sprite
            // reads as lit by its own arena rather than pasted onto it.
            //
            // The colour is PER BOSS. It was hardcoded to the Debt-Bearer's
            // ember `rgba(255,110,40,0.30)`, with a comment noting it matched
            // her lava veins — true of the only boss that existed, and wrong
            // for every other. That is exactly the bug `ARENA_GROUND_TINT` was
            // split out to fix: a skeletal druid in a forest colosseum lit by
            // an orange rim is lit by a fire that is not there.
            style={{
              filter:
                'brightness(0.96) saturate(1.08) ' +
                'drop-shadow(0 18px 18px rgba(0,0,0,0.85)) ' +
                `drop-shadow(0 0 24px ${signature?.rimLight ?? 'rgba(255,110,40,0.30)'})`,
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

        /* ULTIMATE — exaggerate the scream at stage scale.
           Declared AFTER .boss-stage-charging so it wins on source order: an
           ultimate that fires mid-charge is the bigger read, the same
           precedence the charge takes over a hit.

           Three things at once, because one alone was not enough. He GROWS
           (a screaming thing swells), he RECOILS from his own noise on a fast
           offbeat shudder, and he BLOOMS. The scale is what carries it — a
           200px figure at a fixed size cannot own the frame no matter how good
           the pixels are. Kept under 1.09 because his ground line is his seat,
           so scaling him up also lifts him off it. */
        .boss-stage-ultimate {
          animation:
            boss-stage-ult-swell 1.25s ease-in-out infinite alternate,
            boss-stage-ult-shudder 0.11s steps(2, end) infinite !important;
          transform-origin: 50% 92%;
        }
        @keyframes boss-stage-ult-swell {
          from {
            scale: 1;
            filter: brightness(1.15) saturate(1.25)
                    drop-shadow(0 0 18px rgba(190,255,120,0.55));
          }
          to {
            scale: 1.085;
            filter: brightness(1.85) saturate(1.7)
                    drop-shadow(0 0 46px rgba(220,255,140,0.95))
                    drop-shadow(0 0 90px rgba(150,255,90,0.5));
          }
        }
        /* Sub-pixel would do nothing under NEAREST filtering — the sprite is
           chunky, so the shudder has to be whole pixels to register at all. */
        @keyframes boss-stage-ult-shudder {
          0%   { translate: -2px 0; }
          100% { translate: 2px 1px; }
        }

        /* DEFEAT — the fire goes out of her.
           The sprite manifest claimed this was already handled ("grayscale on
           defeat ... produced in CSS by the battle view"); it was not, and a
           defeated boss simply stood there lit and burning while the result
           modal opened over her.
           Settles rather than falls: the art is a standing pose, so a big
           collapse would just slide a standing figure downward. A short sink,
           the colour draining and the ember light dying reads as defeat
           without pretending to be an animation we do not have yet. */
        @keyframes boss-stage-defeat {
          0%   { filter: none; translate: 0 0; opacity: 1; }
          30%  { filter: brightness(1.6) saturate(0.9); translate: 0 -2px; opacity: 1; }
          100% { filter: grayscale(0.85) brightness(0.45); translate: 0 10px; opacity: 0.72; }
        }
        .boss-stage-defeated {
          animation: boss-stage-defeat 1100ms ease-in forwards !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .boss-stage-defeated {
            animation: none !important;
            filter: grayscale(0.85) brightness(0.45) !important;
            opacity: 0.72;
          }
        }

        /* Safety net only — the Motion setting is the real control. */
        @media (prefers-reduced-motion: reduce) {
          .boss-stage-sprite { animation: none !important; }
          .boss-stage-charging {
            animation: none !important;
            filter: brightness(1.3) saturate(1.2);
          }
          /* Motion stops; the READ does not. An ultimate still has to look
             different from an ordinary turn, so it keeps the bloom and the
             size — it just holds them instead of pulsing. */
          .boss-stage-ultimate {
            animation: none !important;
            scale: 1.06;
            filter: brightness(1.6) saturate(1.5)
                    drop-shadow(0 0 34px rgba(200,255,130,0.8));
          }
        }
      `}</style>
    </div>
    </>
  );
}

/**
 * Deterministic small hash of a beat id.
 *
 * Picks which weapon leaves the ring. Deliberately NOT Math.random(): a replay
 * of the same fight has to throw the same weapon on the same blow, and combat
 * is otherwise fully deterministic from its seed. Randomising the visuals would
 * be the one place a replay silently diverged.
 */
function hashToIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
