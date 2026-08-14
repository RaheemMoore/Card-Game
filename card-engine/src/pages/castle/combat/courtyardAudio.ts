import type { HitSeverity } from './feel';

/**
 * The courtyard's combat sound — SYNTHESIZED, and deliberately replaceable.
 *
 * WHY IT EXISTS. Nothing in the courtyard made a sound. Every other channel a
 * hit has — the flash, the freeze, the shove, the camera — was built and
 * approved, and sound is the one that reaches the player first: you hear a blow
 * before you have finished seeing it. A silent fight reads as a preview of a
 * fight.
 *
 * RAHEEM'S RULING, 2026-08-13: synth now, samples later. Build it in code so
 * the cue list, the timing and the balance are all proven against the visuals,
 * then swap the sources once he has heard where sound actually matters. So the
 * durable part of this file is NOT the oscillators — it is:
 *
 *   - `CourtyardCue`, the vocabulary of moments worth hearing, and
 *   - `VOICES`, one table mapping each of those to how it is made.
 *
 * Swapping to recorded samples means replacing `VOICES` and nothing else. No
 * call site anywhere in the game names an oscillator, a frequency or a file.
 * That is the whole reason for the indirection, and it is why this is worth
 * building before the samples exist rather than waiting for them.
 *
 * THE RULES IT INHERITS from `forgeStrikeAudio.ts`, which is the precedent and
 * has already survived a playtest:
 *
 *   - No files, no network, no dependencies.
 *   - The AudioContext is created lazily and resumed on a real user gesture;
 *     browsers keep it suspended otherwise.
 *   - Mute is LOCAL and persisted, and never touches a global preference.
 *   - **Gameplay never waits on audio.** Every failure degrades to silence.
 *     Nothing here is allowed to throw into a frame.
 */

export type CourtyardCue =
  /** The blast leaving the card. Scales with how hard it was charged. */
  | 'release'
  /** Something took damage. The strongest transient in the game. */
  | 'contact'
  /** A blast that hit stone. Information, not an event — quieter on purpose. */
  | 'blocked'
  /** The construct winding up. The tell, in a second channel. */
  | 'telegraph'
  /** The construct going down. */
  | 'defeat'
  /** The Card-wright being hit. Lower and duller than hitting something. */
  | 'hurt';

const MUTE_KEY = 'castle.combatAudio.muted.v1';

/**
 * How a contact sounds, as numbers.
 *
 * Pulled out and exported because it is the ONE thing here that is testable
 * without an audio device, and it is the thing most worth pinning: a heavy hit
 * must be audibly bigger than a tap in every dimension at once. A synth that
 * got quieter as the hit got harder would be obvious in play and invisible in
 * a code review.
 */
export interface ContactVoice {
  /** The body of the hit — the low thump you feel. */
  thumpHz: number;
  /** The transient on top — the snap that makes it read as contact. */
  snapHz: number;
  peak: number;
  durationMs: number;
}

export function contactVoice(severity: HitSeverity): ContactVoice {
  switch (severity) {
    case 'light':
      return { thumpHz: 150, snapHz: 2200, peak: 0.22, durationMs: 90 };
    case 'normal':
      return { thumpHz: 110, snapHz: 1700, peak: 0.34, durationMs: 130 };
    case 'heavy':
      // Lower and longer, not merely louder. Pitch falling as weight rises is
      // what separates a big hit from the same hit with the volume up.
      return { thumpHz: 74, snapHz: 1250, peak: 0.5, durationMs: 200 };
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();

/** The charge, held open between release and the next press. */
let chargeOsc: OscillatorNode | null = null;
let chargeGain: GainNode | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* storage unavailable — the mute still applies for this session */
  }
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.75, ctx.currentTime, 0.01);
  if (next) stopCharge();
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

/**
 * Create or resume the context. Must be reached from a real gesture.
 *
 * Safe to call on every key and every click, which is exactly how it is wired —
 * asking "was this the first one" would be a second thing to get wrong for no
 * benefit, since a resumed context resumes for free.
 */
export function unlock(): void {
  try {
    if (!ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      // Under Forge Strike's 0.9. This plays under a whole walking-around
      // world rather than in a focused minigame, and combat is not the only
      // thing that will eventually want to be heard here.
      master.gain.value = muted ? 0 : 0.75;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
    master = null;
  }
}

/** Shut everything down — for scene teardown, so a sound cannot outlive its world. */
export function dispose(): void {
  stopCharge();
  try {
    void ctx?.close();
  } catch {
    /* already gone */
  }
  ctx = null;
  master = null;
}

function env(gain: GainNode, t: number, peak: number, attack: number, release: number): void {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

/**
 * A tone that falls as it sounds
 *
 * There is deliberately no flat-pitch `tone()` here, unlike the Forge Strike
 * precedent this file otherwise follows. Every pitched thing in a fight is
 * falling — a blow, a body, a shot leaving a card — and a steady tone in the
 * middle of one reads as a user-interface beep rather than as an impact. — what makes a thump land rather than beep. */
function drop(from: number, to: number, t: number, dur: number, peak: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  env(g, t, peak, 0.004, dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Filtered noise. The texture of everything that is not a pitch. */
function noise(t: number, dur: number, peak: number, cutoff: number, q = 0.8): void {
  if (!ctx || !master) return;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = cutoff;
  bp.Q.value = q;
  const g = ctx.createGain();
  env(g, t, peak, 0.002, dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export interface CueOptions {
  /** How hard it was. Contact and release both scale on it. */
  severity?: HitSeverity;
}

/**
 * How each moment is made.
 *
 * THE SWAP POINT. When recorded samples arrive, this table is what changes;
 * every trigger in the game calls `playCue` and knows nothing below this line.
 */
const VOICES: Record<CourtyardCue, (t: number, opts: CueOptions) => void> = {
  release: (t, { severity = 'normal' }) => {
    // Air leaving the card, plus a pitched body that drops further the harder
    // the shot was — so the release already tells you what is about to land.
    const heavy = severity === 'heavy';
    noise(t, heavy ? 0.18 : 0.1, heavy ? 0.3 : 0.2, heavy ? 900 : 1500, 0.6);
    drop(heavy ? 480 : 660, heavy ? 180 : 300, t, heavy ? 0.16 : 0.1, heavy ? 0.24 : 0.16);
  },

  contact: (t, { severity = 'normal' }) => {
    const v = contactVoice(severity);
    const dur = v.durationMs / 1000;
    // Two layers, deliberately: the snap says something was struck, the thump
    // says how hard. One alone reads as either a click or a rumble.
    noise(t, dur * 0.45, v.peak * 0.9, v.snapHz, 1.1);
    drop(v.thumpHz * 2.2, v.thumpHz, t, dur, v.peak);
  },

  blocked: (t) => {
    // Stone. Dry, short, no low end — it is information that the shot stopped,
    // not an event that happened to anybody.
    noise(t, 0.07, 0.16, 800, 1.6);
  },

  telegraph: (t) => {
    // Rising, so it says "now" the way the growing ring and the warming colour
    // do. Under everything else on purpose: the tell must be noticeable
    // without being the loudest thing in a busy moment.
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.68);
    osc.connect(lp).connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.72);
  },

  defeat: (t) => {
    // The kill gets the longest sound in the game, because it is the moment
    // the whole exchange was for. Collapse, then debris.
    drop(300, 45, t, 0.42, 0.42);
    noise(t + 0.05, 0.3, 0.24, 500, 0.5);
    noise(t + 0.16, 0.22, 0.14, 260, 0.5);
  },

  hurt: (t) => {
    // Lower and duller than hitting something. Being hit should not sound
    // satisfying — it is the one cue in the set that is not a reward.
    drop(200, 70, t, 0.2, 0.36);
    noise(t, 0.06, 0.14, 400, 0.7);
  },
};

/** Play a moment. Silent and harmless if audio never came up. */
export function playCue(cue: CourtyardCue, opts: CueOptions = {}): void {
  if (muted || !ctx || !master) return;
  try {
    VOICES[cue](ctx.currentTime + 0.001, opts);
  } catch {
    /* a frame must never fail because of a sound */
  }
}

/**
 * The charge, as one held note that climbs while the trigger is down.
 *
 * A held tone rather than repeated ticks because the charge is one continuous
 * thing the player is doing, and because ticks would need their own clock —
 * a second timeline to keep in step with a bar that is already drawn from the
 * action state.
 */
export function setCharge(charge: number): void {
  if (muted) return;
  if (!ctx || !master) return;
  const c = charge < 0 ? 0 : charge > 1 ? 1 : charge;
  try {
    if (!chargeOsc) {
      chargeOsc = ctx.createOscillator();
      chargeGain = ctx.createGain();
      chargeOsc.type = 'triangle';
      chargeGain.gain.value = 0.0001;
      chargeOsc.connect(chargeGain).connect(master);
      chargeOsc.start();
    }
    const t = ctx.currentTime;
    // Rises about an octave and a half over the charge, and gets louder — both,
    // because pitch alone is easy to lose under everything else in the world.
    chargeOsc.frequency.setTargetAtTime(220 + 300 * c * c, t, 0.05);
    chargeGain?.gain.setTargetAtTime(0.03 + 0.09 * c, t, 0.05);
  } catch {
    chargeOsc = null;
    chargeGain = null;
  }
}

/** Let the charge go. Idempotent — the release path may reach it more than once. */
export function stopCharge(): void {
  if (!chargeOsc) return;
  const osc = chargeOsc;
  const g = chargeGain;
  chargeOsc = null;
  chargeGain = null;
  try {
    const t = ctx?.currentTime ?? 0;
    // Faded rather than cut. A held tone stopping dead is a click, and the
    // click would land in the same instant as the release cue and muddy it.
    g?.gain.setTargetAtTime(0.0001, t, 0.02);
    osc.stop(t + 0.12);
  } catch {
    /* context already gone */
  }
}
