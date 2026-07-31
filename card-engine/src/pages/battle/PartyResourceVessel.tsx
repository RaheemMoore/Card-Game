import type { BattleState } from '../../types/combat';
import type { MotionLevel } from '../../vfx/types';
import { LiquidVessel } from '../../vfx/LiquidVessel';
import { LatticeCore } from '../../vfx/LatticeCore';

/**
 * The party's shared resource, as two vessels.
 *
 * This is the ONLY component that knows what a chamber is — `LiquidVessel` and
 * `LatticeCore` live in `src/vfx/` under a portability contract that forbids
 * them from importing anything about combat. This file is the seam: it reads
 * battle state and hands the visuals plain numbers and colours.
 *
 * ── An empty chamber is hidden, not drawn empty ──────────────────────────
 * A party with no Tech hero has a tech chamber whose MAX is 0. Drawing it
 * would show a permanently empty vessel, which reads as "a resource you have
 * run out of" rather than "a resource this party does not use" — the single
 * most likely misread of a two-chamber pool.
 *
 * ── Colours come from tokens ─────────────────────────────────────────────
 * Mana violet and tech blue are already this game's resource identity, set in
 * `index.css` and used by `AbilityResourceBadge`. Hardcoding new hexes here
 * would fork that identity the first time either is retuned.
 */

interface Props {
  state: BattleState;
  motionLevel: MotionLevel;
}

const MANA_PALETTE = {
  deep: '#2b1a5d',
  mid: 'var(--ability-resource-mana-surface, #6d4bd8)',
  crest: 'var(--ability-resource-mana-glow, #b2a3ff)',
  glow: '#8b6ce0',
};

const TECH_PALETTE = {
  dormant: '#132230',
  charged: 'var(--ability-resource-tech-surface, #3d9be0)',
  edge: 'var(--ability-resource-tech-core, #cfe8ff)',
  glow: '#4aa8ef',
};

export function PartyResourceVessel({ state, motionLevel }: Props) {
  const { partyResource: cur, partyResourceMax: max } = state;
  const showMana = max.mana > 0;
  const showTech = max.tech > 0;
  if (!showMana && !showTech) return null;

  return (
    <div
      className="flex items-end justify-center"
      style={{ gap: 10 }}
      role="group"
      aria-label="Party resources"
    >
      {showMana && (
        <LiquidVessel
          fill={cur.mana / max.mana}
          palette={MANA_PALETTE}
          motion={motionLevel}
          label="Mana"
          readout={`${cur.mana}`}
          // aria lives on the group; the vessels are decorative renderings of
          // a number that is also written on them.
        />
      )}
      {showTech && (
        <LatticeCore
          fill={cur.tech / max.tech}
          palette={TECH_PALETTE}
          motion={motionLevel}
          label="Tech"
          readout={`${cur.tech}`}
        />
      )}
      <span className="sr-only">
        {showMana ? `Mana ${cur.mana} of ${max.mana}. ` : ''}
        {showTech ? `Tech ${cur.tech} of ${max.tech}.` : ''}
      </span>
    </div>
  );
}
