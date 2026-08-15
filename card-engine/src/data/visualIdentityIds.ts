import type { ElementName } from '../types/bible';

/**
 * Player-facing identity option ids — the choices a player actually makes.
 *
 * These lived in services/portraitAssembler.ts, which is a 1500-line prompt
 * builder for the retired runtime image pipeline. Three player surfaces reached
 * INTO that module to borrow constants: the Card Detail page (Android paths),
 * and the Story Pillar wizard (Beastmaster summons, Lycan moon phases). That
 * back-edge meant deleting the generation stack would have broken player code
 * that has nothing to do with generation.
 *
 * So the ids live here now, on the data side, and portraitAssembler imports
 * them rather than owning them. When the assembler is eventually deleted these
 * choices are unaffected — which is the whole point.
 *
 * The ids are PERSISTED on cards (hiddenFate.androidPath, .moonPhase,
 * .summonId). Renaming one silently rewrites what an existing character chose,
 * so treat these strings as frozen.
 */

// ---------- Android ----------

/**
 * What the android did with the human it found. Chosen at the Forged→Ascendant
 * tier-up. ORDER IS LOAD-BEARING — services/ascendantPaths.ts indexes into its
 * own parallel list by the same position.
 */
export const ANDROID_PATH_IDS: readonly string[] = ['protect', 'destroy', 'befriend', 'leave'];

// ---------- Lycanthrope ----------

/**
 * Moon phase at birth, index = transformation level 0–4. Sets where a Lycan
 * STARTS; every Lycan ends full at Ascendant regardless (Bible §Lycanthrope).
 */
export const LYCAN_MOON_PHASE_IDS: readonly string[] = [
  'new_moon',
  'crescent',
  'half',
  'gibbous',
  'full',
];

// ---------- Beastmaster ----------

export interface SummonOption {
  id: string;
  label: string;
}

/**
 * The Beastmaster's choosable apex beasts, gated by element.
 *
 * Labels are authored here rather than scraped out of the prompt prose. They
 * used to be derived by regex from the assembler's generation strings — a
 * leading run of CAPS words, lowercased and re-capitalised — which meant the
 * words a player read in the wizard were a side effect of how a prompt happened
 * to be worded, and editing a prompt for the image model silently renamed a
 * player-facing option. The strings below reproduce exactly what that regex
 * produced (pinned by test), but they are now their own authored thing.
 *
 * Ids are the persisted values (hiddenFate.summonId) and MUST NOT change.
 * Order matches BEASTMASTER_BEASTS in portraitAssembler, which indexes by
 * position to pick the matching prompt prose.
 */
export const BEASTMASTER_SUMMONS: Partial<Record<ElementName, readonly SummonOption[]>> = {
  Beast: [
    { id: 'dire_wolf', label: 'Dire wolf' },
    { id: 'sabertooth', label: 'Sabertooth great-cat' },
    { id: 'war_boar', label: 'Tusked war-boar' },
  ],
  Earth: [
    { id: 'dire_bear', label: 'Dire bear' },
    { id: 'war_rhino', label: 'War-rhino' },
    { id: 'tortoise_titan', label: 'Tortoise-titan' },
  ],
  Wind: [
    { id: 'storm_raptor', label: 'Storm-raptor' },
    { id: 'wind_serpent', label: 'Wind-serpent' },
    { id: 'gale_stallion', label: 'Gale-stallion' },
  ],
  Water: [
    { id: 'river_serpent', label: 'River-serpent' },
    { id: 'orca_beast', label: 'Orca-beast' },
    { id: 'water_hound', label: 'Water-hound' },
  ],
  Spirit: [
    { id: 'spirit_stag', label: 'Spirit-stag' },
    { id: 'spectral_tiger', label: 'Spectral tiger' },
    { id: 'spectral_owl', label: 'Spectral owl' },
  ],
  Ice: [
    { id: 'frost_mammoth', label: 'Mammoth' },
    { id: 'glacial_wolf', label: 'Dire-wolf' },
    { id: 'ice_elk', label: 'Ice-elk' },
  ],
};

/** The choosable beasts for an element, or [] when the element has no pool. */
export function beastmasterSummonOptions(element: ElementName): SummonOption[] {
  return [...(BEASTMASTER_SUMMONS[element] ?? [])];
}

/** Parallel id list, in prompt order. Consumed by the prompt assembler. */
export function beastmasterSummonIds(element: ElementName): readonly string[] {
  return (BEASTMASTER_SUMMONS[element] ?? []).map((o) => o.id);
}
