import type { ArchetypeName } from '../types/card';
import type {
  ElementBond,
  ElementCompatibility,
  ElementName,
  ElementSelection,
} from '../types/bible';
import { ELEMENT_BONDS } from '../types/bible';
import { bucketFor } from '../data/elements';

/**
 * Bond picker — Bible §Global Element Pillar step 2.
 *
 * The ELEMENT is rolled automatically before this component renders
 * (see services/elementRoller.ts). The player is shown their element
 * as a reveal, then chooses which BOND they have with it.
 *
 * This makes the element feel like the character revealing themselves,
 * not a menu pick, and increases variety across playthroughs.
 */

const COMPATIBILITY_LABEL: Record<ElementCompatibility, string> = {
  naturally_compatible: 'Naturally Compatible',
  rare: 'Rare',
  not_available: 'Not Available',
};

const COMPATIBILITY_STYLE: Record<ElementCompatibility, { ring: string; text: string; glow: string; hint: string }> = {
  naturally_compatible: {
    ring: 'border-emerald-500/60',
    text: 'text-emerald-300',
    glow: 'shadow-[0_0_28px_rgba(16,185,129,0.35)]',
    hint: 'This power fits your kind naturally.',
  },
  rare: {
    ring: 'border-fuchsia-400/70',
    text: 'text-fuchsia-300',
    glow: 'shadow-[0_0_32px_rgba(232,121,249,0.5)]',
    hint: 'This power rarely finds a home in your kind — but your story allows it.',
  },
  not_available: {
    ring: 'border-slate-dark',
    text: 'text-ash',
    glow: '',
    hint: 'This power does not answer to your archetype.',
  },
};

interface BondPickerProps {
  archetype: ArchetypeName;
  element: ElementName;
  onComplete: (selection: ElementSelection) => void;
}

export function BondPicker({ archetype, element, onComplete }: BondPickerProps) {
  const compatibility = bucketFor(archetype, element);
  const style = COMPATIBILITY_STYLE[compatibility];

  const pickBond = (bond: ElementBond) => {
    onComplete({ element, bond, compatibility });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Element reveal card */}
      <div className={`rounded-xl border-2 bg-obsidian/70 p-6 text-center transition-all animate-[fadeIn_0.6s_ease-out] ${style.ring} ${style.glow}`}>
        <p className="text-[10px] uppercase tracking-widest text-ash mb-2">
          The power that answers you
        </p>
        <h2 className="font-fantasy text-4xl font-bold text-ivory">
          {element}
        </h2>
        <p className={`mt-2 text-xs uppercase tracking-widest ${style.text}`}>
          {COMPATIBILITY_LABEL[compatibility]}
        </p>
        <p className="mt-2 text-sm italic text-bone/70">{style.hint}</p>
      </div>

      <header className="text-center">
        <h3 className="font-fantasy text-xl font-bold text-gold">
          What is your bond with {element}?
        </h3>
        <p className="text-ash text-xs italic mt-1">
          The bond you choose shapes how {element.toLowerCase()} lives in your body,
          your equipment, and the shape of your story.
        </p>
      </header>

      <div className="space-y-2">
        {ELEMENT_BONDS.map((bond) => (
          <button
            key={bond}
            onClick={() => pickBond(bond)}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-dark
              bg-obsidian/60 font-fantasy text-sm text-bone/90
              hover:text-ivory hover:border-gold/60 transition-colors"
          >
            {bond}
          </button>
        ))}
      </div>
    </div>
  );
}
