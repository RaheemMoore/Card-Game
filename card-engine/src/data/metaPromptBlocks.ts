import type { ArchetypeName } from '../types/card';

/**
 * Snapshot of the per-archetype Layer-D escalation blocks that live inside
 * claudeApi.ts. Read-only in the Archetype Workshop UI so lore directors
 * can see exactly what mandate (if any) each archetype currently ships
 * with, and file proposals against it.
 *
 * NOTE: this is a snapshot, not the source of truth. When we add a new
 * escalation block for an archetype in step (b) we must update BOTH
 * claudeApi.ts AND this file. A later PR should unify them by having
 * claudeApi.ts consume this constant directly.
 */
export const META_PROMPT_BLOCKS: Partial<Record<ArchetypeName, string>> = {
  Lycanthrope: `LYCANTHROPE ESCALATION RULE — Higher ranks mean MORE WOLF ANATOMY, LESS HUMAN ANATOMY. Not just cosmetic hair and eyes — real morphological change.

- Foundation → near-human primal warrior blessed by the Moon Goddess. SUBTLE wolfish tells only: elongated canines, glowing eyes matching moon phase, pointed ear tips, long unkempt mane in fur color.

- Forged → MID-SHIFT HYBRID. Fully anatomical wolf head, fur spreading down shoulders/forearms, dark claws replacing fingernails, human torso broken up by fur patches (NOT clean six-pack abs), torn practical clothing splitting at the seams.

- Ascendant → FULLY ANTHROPOMORPHIC WOLF-LORD. Digitigrade legs, visible wolf tail, full-body fur, pawed hands with long talons, canine musculature (NOT human gym body), silver moonlight aura, articulated dark plate armor with silver moon-sigil filigree.

Plus a PROMPT-STRUCTURE OVERRIDE for Forged/Ascendant that forces the wolf-anatomy mandate into slot #2 of the prompt (right after style anchor, before identity or modifiers). Plus LYCANTHROPE NEGATIVE-PROMPT ADDITIONS that forbid clean six-pack abs, gym body, smooth human hands, human anatomy, etc.

Also carries the LOCKED LYCAN IDENTITY (fur color + moon phase, rolled at Foundation) and the MOON GODDESS LORE INSTRUCTION.`,

  'Mech Pilot': `TECH-CLASS ESCALATION RULE — Higher ranks mean MORE machine, MORE technology, MORE mechanical dominance — never less. Intensify the tech (bigger chassis, more exposed circuitry, more integrated weapons, brighter energy cores, more visible mechanical joints) instead of softening toward 'human' or 'sleek' or 'refined'. A Forged/Ascendant Mech Pilot should look MORE like a machine than the Foundation, not less. Add tech vocabulary to every clause the evolution touches. Prosthetics and mechanical limbs are ENHANCED, not hidden.`,

  Android: `TECH-CLASS ESCALATION RULE — Higher ranks mean MORE machine, MORE technology, MORE mechanical dominance — never less. Intensify the tech (bigger chassis, more exposed circuitry, more integrated weapons, brighter energy cores, more visible mechanical joints) instead of softening toward 'human' or 'sleek' or 'refined'. A Forged/Ascendant Android should look MORE like a machine than the Foundation, not less. Add tech vocabulary to every clause the evolution touches. Prosthetics and mechanical limbs are ENHANCED, not hidden.`,
};

export function getMetaPromptBlock(archetype: ArchetypeName): string | null {
  return META_PROMPT_BLOCKS[archetype] ?? null;
}
