import type { ArchetypeName, Rank } from '../types/card';

// Lab → Workshop handoff. The Prompt Lab "Send to Workshop" button stashes the
// current test here; the Archetype Workshop reads it on mount and opens with
// that test pre-loaded as the critique subject. sessionStorage (not a query
// param) because the payload includes prompt text too large/ugly for a URL.

const KEY = 'lab-workshop-handoff';

export interface LabHandoff {
  source: 'prompt-lab';
  runId: string;
  archetype: ArchetypeName;
  tier: Rank;
  cardName?: string;
  nameAndTitle?: string;
  lore?: string;
  portraitPrompt?: string;
  negativePrompt?: string;
  /** Signed image URL if available at stash time; may expire — advisory only. */
  imageUrl?: string;
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
