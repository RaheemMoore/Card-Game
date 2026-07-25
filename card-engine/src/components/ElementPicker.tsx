import type { ArchetypeName } from '../types/card';
import type { ElementName, ElementSelection } from '../types/bible';
import { ELEMENT_COMPATIBILITY, bucketFor } from '../data/elements';
import { getElementImage } from '../data/elementImages';
import { getElementVisual } from '../data/elementVisuals';

/**
 * Element picker — image-first forge (2026-07-24, art tiles 2026-07-25).
 *
 * Replaces the auto-roll + BondPicker. The element is now an EXPLICIT,
 * per-archetype-gated player choice — it gates the form family that unlocks in
 * the next step (see data/visualPillars.ts). The bond question is dropped; a
 * neutral bond is assigned so the downstream pipeline (Claude flavor) still has
 * one.
 *
 * Each tile shows the element's custom crystal artwork (data/elementImages.ts)
 * with the name + rarity label beneath — mirroring the archetype-emblem tiles
 * in ArchetypeSelector. The tile border/glow echoes the element's own hue
 * (data/elementVisuals.ts). Elements without artwork fall back to a lettered
 * gradient tile.
 *
 * Rarity is not color-only (accessibility): every tile carries a text label,
 * and the Rare tile stays keyboard-reachable with a spoken rarity.
 */

// Dropped-question default (Raheem 2026-07-24): the bond field still feeds the
// Claude prompt, so pick a neutral one when there is no bond question.
const DEFAULT_BOND = 'It is part of who I am.' as const;

interface ElementPickerProps {
  archetype: ArchetypeName;
  onComplete: (selection: ElementSelection) => void;
}

interface ElementTileProps {
  element: ElementName;
  rarityLabel: string;
  rarityClass: string;
  onPick: (element: ElementName) => void;
}

function ElementTile({ element, rarityLabel, rarityClass, onPick }: ElementTileProps) {
  const image = getElementImage(element);
  const { color, glow } = getElementVisual(element);

  return (
    <button
      onClick={() => onPick(element)}
      className="group relative rounded-xl border-2 bg-obsidian/70 p-2 text-center transition-all
        hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-gold/60"
      style={{ borderColor: `${color}66` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 0 28px rgba(${glow},0.45)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${color}66`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {image ? (
        <img
          src={image}
          alt={`${element} crystal`}
          className="w-full aspect-square rounded-md mb-2 object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full aspect-square rounded-md mb-2 flex items-center justify-center text-3xl font-bold font-fantasy"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
        >
          {element.charAt(0)}
        </div>
      )}
      <span className="block font-fantasy text-lg font-bold text-ivory leading-tight">
        {element}
      </span>
      <span className={`mt-0.5 block text-[10px] uppercase tracking-widest ${rarityClass}`}>
        {rarityLabel}
      </span>
    </button>
  );
}

export function ElementPicker({ archetype, onComplete }: ElementPickerProps) {
  const buckets = ELEMENT_COMPATIBILITY[archetype];
  const natural = buckets.naturally_compatible;
  // Rares are FULLY SELECTABLE during testing (Raheem 2026-07-24) — the "Rare"
  // label stays for info, but nothing is locked. The narrative-eligibility /
  // decision gate that hides them behind choices lands in a later batch.
  const rare = buckets.rare;

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
          <ElementTile
            key={element}
            element={element}
            rarityLabel="Naturally Compatible"
            rarityClass="text-emerald-300/90"
            onPick={pick}
          />
        ))}

        {rare.map((element) => (
          <ElementTile
            key={element}
            element={element}
            rarityLabel="Rare"
            rarityClass="text-fuchsia-300/90"
            onPick={pick}
          />
        ))}
      </div>
    </div>
  );
}
