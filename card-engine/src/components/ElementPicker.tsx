import type { ArchetypeName } from '../types/card';
import type { ElementName, ElementSelection } from '../types/bible';
import { ELEMENT_COMPATIBILITY, bucketFor } from '../data/elements';

/**
 * Element picker — image-first forge (2026-07-24).
 *
 * Replaces the auto-roll + BondPicker. The element is now an EXPLICIT,
 * per-archetype-gated player choice — it gates the form family that unlocks in
 * the next step (see data/visualPillars.ts). The bond question is dropped; a
 * neutral bond is assigned so the downstream pipeline (Claude flavor) still has
 * one.
 *
 * Rarity is not color-only (accessibility): every tile carries a text label,
 * and the Rare/ascension tile is a keyboard-reachable, aria-disabled tile with
 * a spoken reason rather than being hidden.
 */

// Dropped-question default (Raheem 2026-07-24): the bond field still feeds the
// Claude prompt, so pick a neutral one when there is no bond question.
const DEFAULT_BOND = 'It is part of who I am.' as const;

const NATURAL_STYLE = {
  ring: 'border-emerald-500/60',
  text: 'text-emerald-300',
  glow: 'hover:shadow-[0_0_28px_rgba(16,185,129,0.35)]',
};

interface ElementPickerProps {
  archetype: ArchetypeName;
  onComplete: (selection: ElementSelection) => void;
}

export function ElementPicker({ archetype, onComplete }: ElementPickerProps) {
  const buckets = ELEMENT_COMPATIBILITY[archetype];
  const natural = buckets.naturally_compatible;
  // Rare elements are the ascension/late-game fork — surfaced as locked tiles at
  // the forge so the player learns they exist, but not selectable here.
  const locked = buckets.rare;

  const pick = (element: ElementName) => {
    onComplete({ element, bond: DEFAULT_BOND, compatibility: bucketFor(archetype, element) });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 min-h-0">
      <header className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Your Power</h2>
        <p className="text-ash text-sm italic">
          The element you choose unlocks the forms you can become.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-0">
        {natural.map((element) => (
          <button
            key={element}
            onClick={() => pick(element)}
            className={`rounded-xl border-2 bg-obsidian/70 p-5 text-center transition-all
              ${NATURAL_STYLE.ring} ${NATURAL_STYLE.glow} hover:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/60`}
          >
            <span className="block font-fantasy text-2xl font-bold text-ivory">{element}</span>
            <span className={`mt-2 block text-[10px] uppercase tracking-widest ${NATURAL_STYLE.text}`}>
              Naturally Compatible
            </span>
          </button>
        ))}

        {locked.map((element) => (
          <div
            key={element}
            aria-disabled="true"
            aria-describedby={`lock-${element}`}
            tabIndex={0}
            className="rounded-xl border-2 border-fuchsia-400/30 bg-obsidian/40 p-5 text-center
              opacity-60 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
          >
            <span className="block font-fantasy text-2xl font-bold text-bone/60">
              🔒 {element}
            </span>
            <span id={`lock-${element}`} className="mt-2 block text-[10px] uppercase tracking-widest text-fuchsia-300/70">
              Unlocks at Ascendant
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
