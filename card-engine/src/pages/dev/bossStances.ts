import { getBossClip, type BossSpriteState } from '../../data/combat/bossSpriteManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';

/**
 * Still frames pulled out of the boss's animation sheets, for the readout.
 *
 * The sprites ship as horizontal strip sheets — one PNG per state, frames left
 * to right. The battle plays them; a document needs one telling frame instead,
 * so this crops a chosen frame out of each sheet onto a canvas and hands back a
 * data URL.
 *
 * Data URLs specifically, not asset paths: the readout is meant to be
 * downloaded and mailed around, and a document whose art 404s on someone
 * else's laptop is worse than a document with no art. Inlining is what makes
 * the export a single self-contained file.
 *
 * ── Which frame ─────────────────────────────────────────────────────────
 * Not frame 0 for everything. Frame 0 of `attack` is the wind-up's last pose
 * — fists still up, nothing struck yet — which is precisely the frame that
 * makes an attack look like a wind-up. Each state names the moment that
 * actually reads as that state, as a fraction of the clip.
 */

export interface Stance {
  state: BossSpriteState;
  /** What the player is looking at. */
  label: string;
  /** When the game shows this pose. */
  when: string;
  /** PNG data URL of the chosen frame, or null if the sheet failed to load. */
  dataUrl: string | null;
  width: number;
  height: number;
}

interface StanceSpec {
  state: BossSpriteState;
  label: string;
  when: string;
  /** 0 = first frame, 1 = last frame. */
  at: number;
}

const SPECS: readonly StanceSpec[] = [
  { state: 'idle', label: 'At rest', when: 'Between moves, while he is still counting.', at: 0 },
  {
    state: 'windup',
    label: 'Winding up',
    when: 'The telegraph. Shown the moment an ordinary attack is declared, a full round before it lands.',
    at: 1,
  },
  {
    // Not mid-flash. The impact frames are mostly white plume, which hides the
    // figure the picture exists to show — the readable frame is the one where
    // the fists have come down and the effect has not yet filled the box.
    state: 'attack',
    label: 'Striking',
    when: 'The blow itself, on the round it resolves.',
    at: 0.3,
  },
  {
    state: 'ultimate',
    label: 'Gathering an ultimate',
    when: 'A charged ultimate winding up — First Notice or The Whole Ledger. Deliberately its own pose, so the fight’s biggest moment never looks routine.',
    at: 0.6,
  },
  {
    state: 'rage',
    label: 'Enraged',
    when: 'His phase-two resting pose, and what Running the Tally leaves him in.',
    at: 0.5,
  },
  { state: 'hit', label: 'Struck', when: 'Recoiling from a hero landing a blow.', at: 0.35 },
  {
    state: 'defeat',
    label: 'Defeated',
    when: 'The fight is over. He stops — a ledger-keeper kneels, he does not sprawl.',
    at: 1,
  },
];

/** Crop one frame out of a strip sheet. Pixel art, so no smoothing, and 2× up. */
function cropFrame(
  img: HTMLImageElement,
  frameIndex: number,
  frameW: number,
  frameH: number,
  scale = 2,
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = frameW * scale;
  canvas.height = frameH * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    frameIndex * frameW,
    0,
    frameW,
    frameH,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  try {
    return canvas.toDataURL('image/png');
  } catch {
    // Tainted canvas — only reachable if a sheet is ever served cross-origin.
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Build the stance gallery for a boss. Resolves to whatever loaded — a boss
 * with no sprites yet simply yields an empty list rather than throwing, which
 * is the honest presentation for art that does not exist.
 */
export async function buildStances(bossId: string): Promise<Stance[]> {
  const out: Stance[] = [];
  const seen = new Set<string>();

  for (const spec of SPECS) {
    const clip = getBossClip(bossId, spec.state);
    if (!clip) continue;

    // getBossClip falls back to `idle` for any state a boss has not authored.
    // Without this, a boss with one sprite would render the same picture seven
    // times under seven different captions — a gallery that lies.
    if (seen.has(clip.asset.id)) continue;
    seen.add(clip.asset.id);

    const img = await loadImage(resolveCombatAssetUrl(clip.asset));
    if (!img) continue;

    const index = Math.min(
      clip.frameCount - 1,
      Math.max(0, Math.round(spec.at * (clip.frameCount - 1))),
    );
    const dataUrl = cropFrame(img, index, clip.frame.width, clip.frame.height);
    // `clip.asset.notes` is deliberately NOT carried through. Those notes are
    // generation records — which PixelLab animation id produced the sheet,
    // which frame it was chained from — and they are the right thing to keep
    // in the manifest and the wrong thing to put in a document someone reads
    // to understand the fight.
    out.push({
      state: spec.state,
      label: spec.label,
      when: spec.when,
      dataUrl,
      width: clip.frame.width * 2,
      height: clip.frame.height * 2,
    });
  }

  return out;
}
