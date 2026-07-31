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
  /** Free basic attack — the action that FILLS these vessels. */
  onStrike: () => void;
  canAct: boolean;
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

export function PartyResourceVessel({ state, motionLevel, onStrike, canAct }: Props) {
  const { partyResource: cur, partyResourceMax: max } = state;

  /**
   * BOTH chambers always render, even at max 0.
   *
   * The first version hid an unused chamber, on the reasoning that a
   * permanently empty vessel reads as "a resource you have run out of". In
   * practice hiding it was worse: the shelf zone changed width depending on
   * party composition, so the same slot held one vessel in one fight and two
   * in the next, and the gap left behind read as missing UI.
   *
   * An unused chamber is drawn DORMANT instead — dimmed, with a dash rather
   * than a zero — so it reads as a socket waiting to be filled rather than as
   * a resource at empty. That is also the honest fiction: bring a Tech hero
   * and it lights up.
   */
  const manaFill = max.mana > 0 ? cur.mana / max.mana : 0;
  const techFill = max.tech > 0 ? cur.tech / max.tech : 0;
  const manaUnused = max.mana === 0;
  const techUnused = max.tech === 0;

  return (
    <div
      className="flex items-end justify-center"
      style={{ gap: 8 }}
      role="group"
      aria-label="Party resources"
    >
      {/* Tech sits LEFT of Mana. */}
      <div style={{ opacity: techUnused ? 0.4 : 1, transition: 'opacity 300ms' }}>
        <LatticeCore
          fill={techFill}
          palette={TECH_PALETTE}
          motion={motionLevel}
          label="Tech"
          readout={techUnused ? '—' : `${cur.tech}`}
        />
      </div>
      <div style={{ opacity: manaUnused ? 0.4 : 1, transition: 'opacity 300ms' }}>
        <LiquidVessel
          fill={manaFill}
          palette={MANA_PALETTE}
          motion={motionLevel}
          label="Mana"
          readout={manaUnused ? '—' : `${cur.mana}`}
        />
      </div>
      {/*
        STRIKE, next to the thing it fills.
        It used to sit beside End Turn, where its 88px + 12px margin was
        exactly what pushed that button off the right edge of the screen. It
        reads better here anyway: this is the action that GENERATES resource,
        so putting it beside the vessels makes the spend/build loop legible
        instead of filing it with the turn controls.
      */}
      <button
        type="button"
        onClick={() => canAct && onStrike()}
        disabled={!canAct}
        aria-label="Strike — a free basic attack that adds to the party's resource"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{
          width: 44,
          height: 104,
          borderRadius: 6,
          border: '2px solid #7a5530',
          background: canAct
            ? 'linear-gradient(to bottom, #2a1d12, #17100a)'
            : 'linear-gradient(to bottom, #16120f, #0d0a08)',
          color: canAct ? '#e8d6b2' : '#6b6058',
          cursor: canAct ? 'pointer' : 'not-allowed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          padding: 2,
          opacity: canAct ? 1 : 0.55,
          transition: 'opacity 200ms',
        }}
      >
        {/* Vertical, because the button is tall and narrow to match the
            vessels it stands beside. */}
        <span style={{ fontSize: 11, letterSpacing: 1.4, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          STRIKE
        </span>
        <span aria-hidden style={{ fontSize: 12, color: '#8ab87d', lineHeight: 1 }}>
          +
        </span>
      </button>

      <span className="sr-only">
        {techUnused ? 'Tech unused by this party. ' : `Tech ${cur.tech} of ${max.tech}. `}
        {manaUnused ? 'Mana unused by this party.' : `Mana ${cur.mana} of ${max.mana}.`}
      </span>
    </div>
  );
}
