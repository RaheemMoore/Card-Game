/**
 * Forge Strike — LOCAL, PLACEHOLDER audio.
 *
 * Every sound here is synthesized on the fly with the Web Audio API. This is
 * intentionally temporary: it exists so the timing/impact can be *felt* with
 * sound during playtesting. It is NOT final sound design and must not be
 * treated as approved just because it works (plan §11.3). Real, authored
 * assets replace this later behind the Stage-5 sound gate.
 *
 * Contract (plan §11.2):
 *   - No files, no network, no dependencies — pure oscillator/noise synthesis.
 *   - AudioContext is created lazily and resumed on a user gesture (unlock()).
 *   - Forge Strike-local mute, persisted to localStorage; never touches any
 *     global app audio preference.
 *   - Gameplay never waits on audio; every failure degrades silently.
 */

export type ForgeCue = 'ready' | 'good' | 'perfect' | 'miss' | 'win' | 'lose';

const MUTE_KEY = 'forgeStrike.muted.v1';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();

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
    /* storage unavailable — mute still applies for this session */
  }
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.01);
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

/**
 * Create/resume the AudioContext. Must be called from a user-gesture handler
 * (first strike or Start) or browsers keep it suspended. Safe to call often.
 */
export function unlock(): void {
  try {
    if (!ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
    master = null;
  }
}

function env(gain: GainNode, t: number, peak: number, attack: number, release: number): void {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone(freq: number, t: number, dur: number, peak: number, type: OscillatorType = 'sine'): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  env(g, t, peak, 0.006, dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Short filtered-noise burst — the metallic "clink" of hammer on anvil. */
function clink(t: number, dur: number, peak: number, cutoff: number): void {
  if (!ctx || !master) return;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = cutoff;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  env(g, t, peak, 0.002, dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export function playCue(cue: ForgeCue): void {
  if (muted || !ctx || !master) return;
  let t: number;
  try {
    t = ctx.currentTime + 0.001;
  } catch {
    return;
  }

  switch (cue) {
    case 'ready':
      tone(523.25, t, 0.18, 0.25, 'triangle');
      break;
    case 'miss':
      // Dull, low thud — glancing blow.
      clink(t, 0.12, 0.35, 320);
      tone(120, t, 0.16, 0.3, 'sine');
      break;
    case 'good':
      clink(t, 0.09, 0.5, 1600);
      tone(392, t, 0.14, 0.28, 'triangle');
      break;
    case 'perfect':
      // Brighter strike + a magical shimmer layer on top.
      clink(t, 0.1, 0.6, 2600);
      tone(587.33, t, 0.16, 0.3, 'triangle');
      tone(1174.66, t + 0.02, 0.22, 0.16, 'sine');
      tone(1567.98, t + 0.05, 0.26, 0.1, 'sine');
      break;
    case 'win': {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => tone(f, t + i * 0.11, 0.28, 0.24, 'triangle'));
      break;
    }
    case 'lose': {
      const notes = [392, 349.23, 293.66];
      notes.forEach((f, i) => tone(f, t + i * 0.13, 0.3, 0.22, 'sine'));
      break;
    }
  }
}
