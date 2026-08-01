/**
 * Frozen fixtures for the Decision Lab — the three approved pilot scenarios,
 * built by actually running the real reducer to a known point rather than
 * hand-authoring a `BattleState`. That is the only honest way to get here:
 * a hand-built mid-charge state could describe a `PendingCharge` the reducer
 * would never actually produce.
 *
 * Each fixture is deterministic — same seed, same scripted filler policy,
 * same round every reload — which is what makes the Lab reviewable instead
 * of a different fight every refresh.
 */
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  baselineHeroPolicy,
  snapshotFromBossVersion,
} from '../../services/combat/harness';
import { advance, initializeBattle, pickActingHero, submitPlayerAction } from '../../services/combat/reducer';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import { SEED_BOSSES } from '../../data/bosses/seedBosses';
import type { BattleState } from '../../types/combat';
import type { CardStats } from '../../types/card';

const DEBT_BEARER = SEED_BOSSES.find((b) => b.definition.slug === 'the-debt-bearer')!;

function statsFor(atk: number, def: number, mana: number): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function ability(id: string) {
  const seed = SEED_ABILITIES.find((s) => s.definition.id === id)!;
  return buildAbilitySnapshot(seed.definition, seed.version);
}

// Load-Bearing appended LAST: `baselineHeroPolicy`'s filler picks the FIRST
// usable core ability it finds, so adding it after the other three cannot
// change which action the scripted filler chooses whenever the earlier ones
// are still usable — it only becomes reachable exactly when it's needed,
// same as any real hero's fourth ability. It's here so the First Notice pilot
// can demonstrate its own headline truth: this ability's `guard` EFFECT does
// not satisfy that charge's break condition (see relationships.ts).
const PILOT_ABILITY_IDS = [
  'ability_rootgrasp',
  'ability_bearing_witness',
  'ability_sanguine_tithe',
  'ability_load_bearing',
];

function pilotHero(id: string, stats: CardStats) {
  return buildHeroSnapshot({
    cardId: id,
    archetype: 'Barbarian',
    displayName: id,
    stats,
    rank: 'Forged',
    elementDamageType: 'kinetic',
    abilities: PILOT_ABILITY_IDS.map(ability),
  });
}

function freshBattle(seed: number): BattleState {
  const snapshot = buildBattleSnapshot({
    heroes: [
      pilotHero('Vanguard', statsFor(70, 55, 60)),
      pilotHero('Warden', statsFor(50, 70, 55)),
      pilotHero('Reaver', statsFor(65, 45, 65)),
    ],
    boss: snapshotFromBossVersion(DEBT_BEARER.definition, DEBT_BEARER.version),
    seed,
  });
  let state = initializeBattle(snapshot);
  for (let i = 0; i < 20 && state.phase !== 'awaiting_player_action'; i++) {
    state = advance(state).state;
  }
  return state;
}

/** Drive the fight, using the balance suite's scripted filler, until the
 *  named boss action is charging (or declared, for an interruptible one). */
function driveUntil(
  predicate: (s: BattleState) => boolean,
  seed: number,
  cap = 8000,
): BattleState {
  let s = freshBattle(seed);
  for (let i = 0; i < cap; i++) {
    if (predicate(s)) return s;
    if (s.phase === 'battle_over') {
      s = freshBattle(seed);
      continue;
    }
    s =
      s.phase === 'awaiting_player_action'
        ? submitPlayerAction(s, baselineHeroPolicy.chooseAction(s, pickActingHero(s)!)).state
        : advance(s).state;
  }
  throw new Error('fixture: predicate never satisfied — check the boss data has not changed shape');
}

export type PilotId = 'interest_accrues' | 'first_notice' | 'whole_ledger';

export const PILOTS: readonly { id: PilotId; label: string; proves: string }[] = [
  {
    id: 'interest_accrues',
    label: 'Interest Accrues',
    proves:
      'All-party damage + Bleed, single-round interruptible. Single-target protection is only PARTIAL party coverage.',
  },
  {
    id: 'first_notice',
    label: 'First Notice',
    proves:
      'Two-round charge broken by two DIFFERENT heroes literally Guarding — a Guard EFFECT from an ability does not count.',
  },
  {
    id: 'whole_ledger',
    label: 'The Whole Ledger',
    proves:
      'Two-round cumulative-damage objective at 28% of frozen max HP. DoT does not advance it — only direct damage does.',
  },
];

/** Build (or rebuild) the named pilot's frozen starting state. Pure — same
 *  id always returns the same state, so "reload the fixture" really means it. */
export function buildPilotFixture(id: PilotId): BattleState {
  switch (id) {
    case 'interest_accrues':
      return driveUntil((s) => s.boss.currentIntent?.actionId === 'act_debt_interest', 6);
    case 'first_notice':
      return driveUntil((s) => s.boss.pendingCharge?.actionId === 'act_debt_first_notice', 11);
    case 'whole_ledger':
      return driveUntil((s) => s.boss.pendingCharge?.actionId === 'act_debt_ledger', 12345);
  }
}
