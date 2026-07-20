import type { ArchetypeName, Rank } from '../types/card';

// Lab → Workshop handoff. The Prompt Lab "Send to Workshop" button stashes the
// current test here; the Archetype Workshop reads it on mount and opens with
// that test pre-loaded as the critique subject. sessionStorage (not a query
// param) because the payload includes prompt text too large/ugly for a URL.

const KEY = 'lab-workshop-handoff';

/** One generated tier from the batch, carried so the Workshop can show it. */
export interface LabHandoffTier {
  tier: Rank;
  runId: string;
  /** Stable storage path (re-signed on display); null if the image expired. */
  objectPath: string | null;
  cardName?: string;
  nameAndTitle?: string;
  lore?: string;
  portraitPrompt?: string;
  negativePrompt?: string;
}

export interface LabHandoff {
  source: 'prompt-lab';
  archetype: ArchetypeName;
  /** All completed tiers from the batch — the images being sent to critique. */
  tiers: LabHandoffTier[];
  /** Which tier is the initial critique subject (drives labRunId). */
  primaryRunId: string;
  // ── Back-compat: the primary tier flattened, for older readers. ──
  runId: string;
  tier: Rank;
  cardName?: string;
  nameAndTitle?: string;
  lore?: string;
  portraitPrompt?: string;
  negativePrompt?: string;
}

export function stashLabHandoff(h: LabHandoff): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(h)); } catch { /* ignore */ }
}

export function readLabHandoff(): LabHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LabHandoff;
    return parsed.source === 'prompt-lab' && parsed.runId ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLabHandoff(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
