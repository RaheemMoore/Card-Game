import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleEvent, BossCombatant, BossSnapshot } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { TIMINGS } from '../../services/combat/presentation/types';
import { SEED_BOSSES } from '../../data/bosses/seedBosses';
import { ARENA_MANIFEST, DEFAULT_ARENA_ID } from '../../data/combat/arenaManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { BossStage } from '../battle/BossStage';
import { SpriteClipPlayer } from '../battle/SpriteClipPlayer';
import { getBossClip, type BossSpriteState } from '../../data/combat/bossSpriteManifest';
import { resolveCombatAssetUrl as clipUrl } from '../../data/combat/types';
import { CardRenderer } from '../../components/CardRenderer';
import { CardCracks, CardShieldPane, CardTargetMark, CardCombatFxStyles } from '../battle/CardCombatFx';
import type { MotionLevel } from '../../vfx/types';
import { LiquidVessel } from '../../vfx/LiquidVessel';
import { LatticeCore } from '../../vfx/LatticeCore';
import { buildCardShell, generateStats } from '../../services/cardGenerator';
import type { Card, ArchetypeName } from '../../types/card';

/**
 * Boss animation preview — pick a boss, press play, watch what the fight will
 * actually show.
 *
 * ── Why it renders the real BossStage ────────────────────────────────────
 * This does not draw the boss itself. It builds the same two inputs the
 * battle view feeds `BossStage` — a boss combatant and the current animation
 * beat — and hands them over. So the platform, the orbiting weapon ring, the
 * ember rim-light, the charge pulse, the hit shake and the defeat pose are not
 * reproduced here; they ARE the game's, running in a page with no combat
 * attached.
 *
 * A preview that drew its own version of the boss could look perfect while the
 * fight still looked wrong, which would make it worse than useless.
 */

const HERO_ACTOR = 'hero_preview';
const BOSS_ACTOR = 'boss_0';

/** One step of the scripted run-through, in the order a fight reveals them. */
interface Step {
  label: string;
  /** Null renders the resting pose. */
  event: BattleEvent | null;
  cue: AnimationBeat['cue'];
  severity?: AnimationBeat['severity'];
  durationMs: number;
}

/**
 * The sequence a boss actually goes through in a round, with the real beat
 * durations from `TIMINGS` — so what plays here runs at fight speed rather
 * than at a speed chosen to look good in a preview.
 */
function buildSteps(): Step[] {
  return [
    {
      label: 'Idle',
      event: null,
      cue: 'narration',
      durationMs: 2000,
    },
    {
      label: 'Winding up',
      // A heavy intent is what lights the charge-up and holds it.
      event: {
        kind: 'boss_intent_declared',
        round: 1,
        intent: {
          actionId: 'preview',
          intentType: 'heavy_attack',
          telegraphText: 'preview',
          targetActorIds: [HERO_ACTOR],
          interruptible: true,
        },
      },
      cue: 'wind_up',
      severity: 'heavy',
      durationMs: TIMINGS.windUpHeavy + 600,
    },
    {
      label: 'Attacking',
      event: {
        kind: 'damage_dealt',
        sourceActorId: BOSS_ACTOR,
        targetActorId: HERO_ACTOR,
        amount: 84,
        damageType: 'physical',
        blockedByShield: 0,
      },
      cue: 'impact',
      severity: 'heavy',
      durationMs: TIMINGS.impactHeavy + 400,
    },
    {
      label: 'Struck',
      event: {
        kind: 'damage_dealt',
        sourceActorId: HERO_ACTOR,
        targetActorId: BOSS_ACTOR,
        amount: 137,
        damageType: 'holy',
        blockedByShield: 0,
      },
      cue: 'impact',
      severity: 'normal',
      durationMs: TIMINGS.impact + 500,
    },
    {
      label: 'Defeated',
      event: { kind: 'actor_defeated', actorId: BOSS_ACTOR },
      cue: 'impact',
      severity: 'normal',
      durationMs: 2500,
    },
  ];
}

export function SpritePreview() {
  const bosses = useMemo(
    () =>
      SEED_BOSSES.filter((b) => b.definition.status !== 'retired').map((b) => ({
        id: b.definition.id,
        name: b.definition.name,
        arenaId: b.definition.arenaId,
      })),
    [],
  );

  const [bossId, setBossId] = useState(() => bosses[0]?.id ?? '');
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  /**
   * Playing runs the sequence; holding parks on one state until told
   * otherwise. Without this split, clicking a state to LOOK at it immediately
   * ran on to the next one — asking for the wind-up and being shown the swing.
   */
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const steps = useMemo(() => buildSteps(), []);
  const selected = bosses.find((b) => b.id === bossId);
  const arena = ARENA_MANIFEST[selected?.arenaId ?? DEFAULT_ARENA_ID] ?? ARENA_MANIFEST[DEFAULT_ARENA_ID];

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
    setStepIndex(null);
  }, []);

  // Advance through the sequence. Each step holds for its own beat duration,
  // so the run-through is paced the way the fight is.
  useEffect(() => {
    if (!playing || stepIndex === null) return;
    if (stepIndex >= steps.length) {
      setPlaying(false);
      setStepIndex(null);
      return;
    }
    timer.current = window.setTimeout(() => {
      setStepIndex((i) => (i === null ? null : i + 1));
    }, steps[stepIndex].durationMs);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [playing, stepIndex, steps]);

  // Switching boss mid-run would show the new sprite in the old pose.
  useEffect(() => stop(), [bossId, stop]);

  const step = stepIndex === null ? null : steps[stepIndex];
  const beat: AnimationBeat | null =
    step && step.event
      ? {
          id: `preview_${stepIndex}`,
          event: step.event,
          cue: step.cue,
          durationMs: step.durationMs,
          ...(step.severity ? { severity: step.severity } : {}),
        }
      : null;

  const boss = useMemo<BossCombatant>(
    () => previewCombatant(bossId, selected?.name ?? 'Boss', step?.label === 'Defeated'),
    [bossId, selected?.name, step?.label],
  );

  return (
    <div className="min-h-screen bg-[#0d0b10] text-bone p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-fantasy text-2xl text-amber-200 mr-2">Boss Animation Preview</h1>

        <select
          value={bossId}
          onChange={(e) => setBossId(e.target.value)}
          className="bg-black/60 border border-amber-900/50 rounded px-3 py-2"
        >
          {bosses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            if (playing) {
              stop();
            } else {
              setStepIndex(0);
              setPlaying(true);
            }
          }}
          className="px-5 py-2 rounded bg-amber-800/70 border border-amber-600/60 hover:bg-amber-700/70 font-semibold"
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>

        <span className="text-sm text-bone/60 min-w-32">
          {step ? step.label : 'Resting'}
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-amber-900/40 h-[70vh]">
        {arena && (
          <img
            src={resolveCombatAssetUrl(arena)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
        {/*
          The real component, with the real inputs.

          Keyed by step so each state starts clean. A fight only ever moves
          forward, so BossStage carries state across beats by design; jumping
          straight from a wind-up to a defeat is something only this page can
          do, and without the remount the previous state's effects bleed into
          the next one and you are no longer previewing what the fight shows.
        */}
        <BossStage
          key={stepIndex ?? 'resting'}
          boss={boss}
          currentBeat={beat}
          motionLevel="full"
        />
      </div>

      {/* Jump straight to one moment, for when you only care about the swing. */}
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <button
            key={s.label}
            onClick={() => {
              if (timer.current !== null) window.clearTimeout(timer.current);
              setPlaying(false);
              setStepIndex(i);
            }}
            className={[
              'px-3 py-1.5 rounded text-sm border',
              stepIndex === i
                ? 'bg-amber-800/70 border-amber-500/70'
                : 'bg-black/40 border-amber-900/40 hover:bg-black/70',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-bone/40 max-w-2xl">
        Renders the game&apos;s own BossStage at fight speed. Every clip comes from the sprite
        manifest, so whatever plays here is exactly what the battle will show.
      </p>

      <ClipGallery bossId={bossId} />

      <CardStatePreview />

      <ResourceVesselPreview />
    </div>
  );
}

/**
 * The minimum boss the stage needs.
 *
 * `BossStage` reads four things — actorId, snapshot.bossId, snapshot.name and
 * defeated — and the rest of `BossCombatant` exists for the reducer. Filling
 * it out honestly rather than casting keeps this compiling against the real
 * type, so if the stage ever starts reading a fifth field this stops building
 * instead of silently previewing something the fight will not show.
 */
function previewCombatant(bossId: string, name: string, defeated: boolean): BossCombatant {
  const snapshot: BossSnapshot = {
    bossId,
    versionId: 'preview',
    name,
    maxHp: 1000,
    phases: [],
    resistanceProfileId: 'preview',
    weaknessProfileId: 'preview',
    resistance: { resistant: [], weak: [] },
  };
  return {
    actorId: BOSS_ACTOR,
    snapshot,
    hp: defeated ? 0 : 1000,
    currentPhaseId: 'preview',
    actionCooldowns: [],
    statuses: [],
    shields: [],
    defeated,
    currentIntent: null,
    pendingCharge: null,
  };
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  Card-as-character states                                              */
/* ══════════════════════════════════════════════════════════════════════ */

/**
 * The hero card's combat states, side by side.
 *
 * These live on `/battle`, which is behind the session wall, so without this
 * the only way to see a change to them is to sign in and start a real fight —
 * and reaching a DEFEATED card that way means actually losing a hero. Every
 * state is reachable here in one click.
 */
function CardStatePreview() {
  const cards = useMemo(() => {
    // Three different archetypes so the border variants differ and a change
    // that only works on one frame colour is obvious.
    return (['Barbarian', 'Seraph', 'Necromancer'] as ArchetypeName[]).map((archetype) => {
      const stats = generateStats(archetype);
      const shell = buildCardShell(archetype, stats);
      return {
        ...shell,
        cardName: archetype,
        nameAndTitle: `${archetype} of the Preview`,
        lore: '',
      } as Card;
    });
  }, []);

  const states = [
    { key: 'idle', label: 'Untouched', hp: 1, cls: '' },
    { key: 'acting', label: 'Acting', hp: 1, cls: 'card-acting card-ignited' },
    // Full HP on purpose: being aimed at is not being hurt, and showing this
    // state pre-cracked was itself part of why the old red glow read as damage.
    { key: 'marked', label: 'Marked by boss', hp: 1, cls: '' },
    // Rise, hold, flinch, return. Click it twice to replay — the state button
    // bumps a key that remounts the card, which is the same thing a fresh
    // `damage_dealt` beat does in a real fight.
    { key: 'struck', label: 'Taking a hit', hp: 0.6, cls: 'card-struck' },
    { key: 'hurt', label: 'Badly damaged', hp: 0.28, cls: '' },
    { key: 'dead', label: 'Fallen', hp: 0, cls: 'card-defeated' },
  ];

  const [state, setState] = useState(states[0]);
  const [replay, setReplay] = useState(0);
  const card = cards[0];

  const W = 168;
  const H = Math.round((W / 326) * 470);

  return (
    <section className="space-y-3 pt-4 border-t border-amber-900/30">
      <CardCombatFxStyles />
      <h2 className="font-fantasy text-xl text-amber-200">Card states</h2>
      <p className="text-xs text-bone/50 max-w-2xl">
        The hero card IS the character. Cracks are the health bar, the border ignites on the
        card&apos;s turn, a red mark shows who the boss has named, and death turns the card
        face-down.
      </p>

      <div className="flex flex-wrap gap-2">
        {states.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setState(s);
              setReplay((n) => n + 1);
            }}
            className={[
              'px-3 py-1.5 rounded text-sm border',
              state.key === s.key
                ? 'bg-amber-800/70 border-amber-500/70'
                : 'bg-black/40 border-amber-900/40 hover:bg-black/70',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        className="dock-stage flex items-end gap-8 p-8 rounded-lg border border-amber-900/40"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, #1b1420 0%, #0d0b10 70%)' }}
      >
        <div
          key={replay}
          className={`relative ${state.cls}`}
          style={{ width: W, height: H, transformStyle: 'preserve-3d' }}
        >
          <div
            style={{
              width: 326,
              height: 470,
              transform: `scale(${W / 326})`,
              transformOrigin: 'top left',
              backfaceVisibility: 'hidden',
            }}
          >
            <CardRenderer card={card} size="full" />
          </div>
          <CardCracks hpFraction={state.hp} seed={card.cardId} width={100} height={144} />
          {state.key === 'marked' && <CardTargetMark />}
          {state.key === 'dead' && (
            <div
              aria-hidden
              className="absolute inset-0 rounded"
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                background: 'repeating-linear-gradient(45deg, #241a12 0 6px, #2e2418 6px 12px)',
                border: '2px solid rgba(212,175,55,0.35)',
                boxShadow: 'inset 0 0 24px rgba(0,0,0,0.9)',
              }}
            />
          )}
        </div>

        {/* Two shielded cards, because the pane means two different things.
            An INTACT shield is only the moving reflection — that alone says
            "protected". The webbing is not part of what a shield looks like,
            it is damage the shield has already absorbed, so a fresh one must
            show none of it. */}
        <div className="relative" style={{ width: W, height: H }}>
          <div
            style={{
              width: 326,
              height: 470,
              transform: `scale(${W / 326})`,
              transformOrigin: 'top left',
            }}
          >
            <CardRenderer card={cards[1]} size="full" />
          </div>
          <CardShieldPane integrity={1} />
          <span className="absolute -bottom-6 left-0 text-xs text-bone/50">Shielded — intact</span>
        </div>

        <div className="relative" style={{ width: W, height: H }}>
          <div
            style={{
              width: 326,
              height: 470,
              transform: `scale(${W / 326})`,
              transformOrigin: 'top left',
            }}
          >
            <CardRenderer card={cards[2]} size="full" />
          </div>
          <CardShieldPane integrity={0.4} />
          <span className="absolute -bottom-6 left-0 text-xs text-bone/50">
            Shield holding, 60% spent
          </span>
        </div>
      </div>
    </section>
  );
}


/* ══════════════════════════════════════════════════════════════════════ */
/*  Party resource vessels                                                */
/* ══════════════════════════════════════════════════════════════════════ */

/**
 * The two chambers, side by side on a slider.
 *
 * In a real battle you only ever see the chambers your PARTY uses — an
 * all-Mana party hides the Tech lattice entirely, which is correct there and
 * useless for judging the art. Here both render at any fill, so the two can be
 * compared and the charge/drain motion can be scrubbed without seeding a
 * mixed-archetype party and casting until the numbers move.
 */
function ResourceVesselPreview() {
  const [fill, setFill] = useState(0.62);
  const [motion, setMotion] = useState<MotionLevel>('full');

  return (
    <section className="space-y-3 pt-4 border-t border-amber-900/30">
      <h2 className="font-fantasy text-xl text-amber-200">Party resource vessels</h2>
      <p className="text-xs text-bone/50 max-w-2xl">
        Mana FLOWS, Tech CHARGES — the contrast is deliberate. Both live in{' '}
        <code className="text-amber-200">src/vfx/</code> and know nothing about combat, so
        they can be reused for forge heat, boss rage, or a minigame charge.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-bone/60 w-10">Fill</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(fill * 100)}
            onChange={(e) => setFill(Number(e.target.value) / 100)}
            style={{ width: 220 }}
          />
          <span className="text-amber-200 w-10">{Math.round(fill * 100)}%</span>
        </label>
        <select
          value={motion}
          onChange={(e) => setMotion(e.target.value as MotionLevel)}
          className="bg-black/60 border border-amber-900/50 rounded px-2 py-1 text-sm"
        >
          <option value="full">motion: full</option>
          <option value="subtle">motion: subtle</option>
          <option value="off">motion: off</option>
        </select>
      </div>

      <div
        className="flex items-end gap-8 p-6 rounded-lg border border-amber-900/40"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, #12101a 0%, #0d0b10 70%)' }}
      >
        <LiquidVessel
          fill={fill}
          motion={motion}
          label="Mana"
          readout={`${Math.round(fill * 19)}`}
          palette={{
            deep: '#2b1a5d',
            mid: 'var(--ability-resource-mana-surface, #6d4bd8)',
            crest: 'var(--ability-resource-mana-glow, #b2a3ff)',
            glow: '#8b6ce0',
          }}
        />
        <LatticeCore
          fill={fill}
          motion={motion}
          label="Tech"
          readout={`${Math.round(fill * 12)}`}
          palette={{
            dormant: '#132230',
            charged: 'var(--ability-resource-tech-surface, #3d9be0)',
            edge: 'var(--ability-resource-tech-core, #cfe8ff)',
            glow: '#4aa8ef',
          }}
        />
      </div>
    </section>
  );
}


/* ══════════════════════════════════════════════════════════════════════ */
/*  Every clip, played directly                                           */
/* ══════════════════════════════════════════════════════════════════════ */

const ALL_STATES: BossSpriteState[] = [
  'idle',
  'windup',
  'attack',
  'hit',
  'rage',
  'defeat',
  'ultimate',
];

/**
 * Each sprite state played on its own, side by side.
 *
 * The scripted run-through above goes through the real beat machine, which is
 * the honest test — but it only reaches the states a normal round produces.
 * `rage` needs the boss below its phase threshold and `ultimate` needs a
 * charged action to come due, so judging either one meant playing until the
 * fight happened to get there. This plays them on demand.
 *
 * Deliberately renders through `SpriteClipPlayer`, the same player the arena
 * uses, at each clip's real fps and loop setting — so what you see here is the
 * clip as configured, not as re-timed for a gallery.
 */
function ClipGallery({ bossId }: { bossId: string }) {
  const [replay, setReplay] = useState(0);

  return (
    <section className="space-y-3 pt-4 border-t border-amber-900/30">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-fantasy text-xl text-amber-200">Every clip</h2>
        <button
          onClick={() => setReplay((n) => n + 1)}
          className="px-3 py-1 rounded text-sm bg-amber-900/40 border border-amber-700/50 hover:bg-amber-900/60"
        >
          ↻ Replay one-shots
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        {ALL_STATES.map((st) => {
          const clip = getBossClip(bossId, st);
          if (!clip) return null;
          const ms = clip.frameCount > 1 ? Math.round((clip.frameCount / clip.fps) * 1000) : 0;
          return (
            <div key={st} className="flex flex-col items-center gap-1">
              <div
                style={{
                  width: 150,
                  height: 150,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  background: 'radial-gradient(ellipse at 50% 100%, #1b1420 0%, #0d0b10 70%)',
                  borderRadius: 6,
                  border: '1px solid rgba(128,79,33,0.4)',
                }}
              >
                <SpriteClipPlayer
                  clip={clip}
                  src={clipUrl(clip.asset)}
                  clipKey={`${st}:${replay}`}
                  motion="full"
                  alt={st}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <span className="text-xs text-amber-200">{st}</span>
              <span className="text-[10px] text-bone/45">
                {clip.frameCount}f · {clip.fps}fps · {ms}ms · {clip.loop ? 'loop' : 'once'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
