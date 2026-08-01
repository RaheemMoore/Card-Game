/**
 * What this action does about THAT problem — and what it doesn't.
 *
 * A typed rule registry mapping frozen ability EFFECT PRIMITIVES against the
 * current threat's objectives. Three hard rules govern everything here:
 *
 * 1. **Mechanics come from primitives only.** Never from a name, tag,
 *    description, telegraph string or display colour. `Load-Bearing` is not
 *    "the tank ability" because it is called that; it carries `guard` and
 *    `taunt` effects, and that is the entire basis for anything said about it.
 *
 * 2. **Every note states its limit.** "Helps" without "but" is how a player
 *    learns the wrong lesson and blames the game.
 *
 * 3. **No ranking.** No `BEST MOVE`, no scores, no sorting by quality, no
 *    highlighting a winner. The player compares; the system explains. A system
 *    that answers the question has removed the reason to ask it.
 *
 * Three truths encoded here contradict what the fight LOOKS like, and each one
 * was verified against the reducer rather than assumed:
 *
 *   - A `guard` EFFECT does not satisfy a `party_action: guard` charge break.
 *     The reducer counts `player_action_selected` where `action.kind` is
 *     literally `'guard'` (reducer.ts `evaluateChargeProgress`); an ability
 *     carrying a guard effect logs `kind: 'ability'`. So `Load-Bearing`
 *     protects its caster and contributes NOTHING to First Notice.
 *   - Damage-over-time advances neither a damage charge break nor the
 *     interrupt bar. DoT emits `dot_ticked`, and both evaluators count only
 *     `damage_dealt`.
 *   - `remove_status` cleanses what is already there. It cannot pre-empt a
 *     status the boss has not applied yet, because heroes act before the boss
 *     resolves.
 *
 * All three are filed as open mechanics questions. Until they are ruled on,
 * the UI says what the engine does.
 */

import type { AbilityEffect } from '../../../types/abilities';
import type { AbilityCombatSnapshot, BattleState } from '../../../types/combat';
import type { ActionProjection } from './projectAction';
import type { ObjectiveVM, ThreatVM } from './objectives';

/* ------------------------------------------------------------------ */
/*  Note grammar                                                       */
/* ------------------------------------------------------------------ */

/**
 * The only five shapes a note may take. A closed set on purpose — it is what
 * stops "Helps: ..." drifting into "Great pick here!" one commit at a time.
 */
export type NoteForm =
  /** Directly answers the current threat. */
  | 'strong_now'
  /** Real benefit, with a stated remainder. */
  | 'helps'
  /** The mechanic does not reach this target, scope or objective. */
  | 'limited_here'
  /** Moves a named objective by a stated amount. */
  | 'advances'
  /** Cannot be used right now, and why. */
  | 'unavailable';

export interface RelevanceNote {
  form: NoteForm;
  text: string;
  /** Objective this note is about, when it is about one. */
  objectiveKind?: ObjectiveVM['kind'];
}

export interface ContextualAbilityVM {
  definitionId: string;
  displayName: string;
  /** Compact mechanical identity, e.g. `Shield + Cleanse`. Built from primitives. */
  tacticalLabel: string;
  resourceType: string;
  resourceCost: number;
  cooldownRounds: number;
  projection: ActionProjection;
  relevance: readonly RelevanceNote[];
  limitations: readonly RelevanceNote[];
}

/* ------------------------------------------------------------------ */
/*  Tactical label                                                     */
/* ------------------------------------------------------------------ */

const EFFECT_LABEL: Record<AbilityEffect['type'], string> = {
  direct_damage: 'Damage',
  damage_over_time: 'DoT',
  healing: 'Heal',
  shielding: 'Shield',
  apply_status: 'Status',
  remove_status: 'Cleanse',
  resource_gain: 'Resource',
  resource_drain: 'Drain',
  summon: 'Summon',
  lifesteal: 'Drain',
  multi_hit: 'Multi-hit',
  guard: 'Guard',
  taunt: 'Taunt',
  conditional_bonus: 'Conditional',
  ultimate_charge_gain: 'Charge',
};

/**
 * `Shield + Cleanse`, `Taunt + Guard` — the mechanical identity the flavour
 * text is allowed to be poetic about because this line is not.
 *
 * `apply_status` resolves to the STATUS name rather than the generic word, so
 * `Rootgrasp` reads `Damage + Weakened` and the player learns the vocabulary
 * the status catalog uses instead of a synonym they have to re-map later.
 */
export function tacticalLabel(ability: AbilityCombatSnapshot): string {
  const parts: string[] = [];
  for (const e of ability.version.effects) {
    const label =
      e.type === 'apply_status'
        ? titleCase(e.status.statusId)
        : EFFECT_LABEL[e.type];
    if (label && !parts.includes(label)) parts.push(label);
  }
  return parts.join(' + ') || 'Utility';
}

function titleCase(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  Rules                                                              */
/* ------------------------------------------------------------------ */

interface RuleContext {
  state: BattleState;
  threat: ThreatVM | null;
  ability: AbilityCombatSnapshot;
  effects: readonly AbilityEffect[];
  projection: ActionProjection;
}

type Rule = (ctx: RuleContext) => RelevanceNote[];

const has = (effects: readonly AbilityEffect[], type: AbilityEffect['type']) =>
  effects.some((e) => e.type === type);

function damageObjective(threat: ThreatVM | null) {
  return threat?.objectives.find(
    (o): o is Extract<ObjectiveVM, { kind: 'charge' }> =>
      o.kind === 'charge' && o.break.kind === 'damage',
  );
}

function interruptObjective(threat: ThreatVM | null) {
  return threat?.objectives.find(
    (o): o is Extract<ObjectiveVM, { kind: 'interrupt' }> => o.kind === 'interrupt',
  );
}

function partyActionObjective(threat: ThreatVM | null) {
  return threat?.objectives.find(
    (o): o is Extract<ObjectiveVM, { kind: 'charge' }> =>
      o.kind === 'charge' && o.break.kind === 'party_action',
  );
}

/** Damage advances damage-shaped objectives, by the exact projected amount. */
const damageRule: Rule = ({ threat, projection }) => {
  const dealt = projection.damageToBoss;
  if (dealt <= 0) return [];
  const notes: RelevanceNote[] = [];

  const charge = damageObjective(threat);
  if (charge?.damage && !charge.broken) {
    const after = Math.min(charge.damage.required, charge.damage.dealt + dealt);
    notes.push({
      form: 'advances',
      objectiveKind: 'charge',
      text: `Advances ${threat!.displayName}: ${after} of ${charge.damage.required} damage (${dealt} from this).`,
    });
  }

  const interrupt = interruptObjective(threat);
  if (interrupt && !interrupt.met) {
    const after = interrupt.dealt + dealt;
    notes.push(
      after >= interrupt.required
        ? {
            form: 'strong_now',
            objectiveKind: 'interrupt',
            text: `Interrupts ${threat!.displayName}: reaches ${after} of the ${interrupt.required} needed this round.`,
          }
        : {
            form: 'advances',
            objectiveKind: 'interrupt',
            text: `Advances the interrupt: ${after} of ${interrupt.required} this round. Falling short cancels nothing — the interrupt gives no partial credit.`,
          },
    );
  }
  return notes;
};

/** DoT does not count. Stated only when the player would expect it to. */
const dotRule: Rule = ({ threat, effects }) => {
  if (!has(effects, 'damage_over_time')) return [];
  const notes: RelevanceNote[] = [];
  if (damageObjective(threat)) {
    notes.push({
      form: 'limited_here',
      objectiveKind: 'charge',
      text: `Damage over time does not advance ${threat!.displayName} — only direct damage counts toward the break.`,
    });
  }
  if (interruptObjective(threat)) {
    notes.push({
      form: 'limited_here',
      objectiveKind: 'interrupt',
      text: 'Damage over time does not count toward the interrupt.',
    });
  }
  return notes;
};

/**
 * A guard EFFECT protects its target and does NOT contribute a body to a
 * coordinated-Guard break. This note is the single most surprising thing in
 * the system and the reason the rule engine reads primitives.
 */
const guardEffectRule: Rule = ({ threat, effects }) => {
  const guard = effects.find((e) => e.type === 'guard');
  if (!guard || guard.type !== 'guard') return [];
  const notes: RelevanceNote[] = [
    {
      form: 'helps',
      text: `Reduces incoming damage to this hero by ${Math.round(guard.reductionPercent * 100)}% for ${guard.duration} rounds.`,
    },
  ];
  const partyAction = partyActionObjective(threat);
  if (partyAction && partyAction.break.kind === 'party_action' && partyAction.break.action === 'guard') {
    notes.push({
      form: 'limited_here',
      objectiveKind: 'charge',
      text: `Does not count toward ${threat!.displayName} — that break needs the Guard action itself, not an ability that grants guarding.`,
    });
  }
  return notes;
};

/** Taunt reaches a single-target intent and cannot reach a party-wide one. */
const tauntRule: Rule = ({ threat, effects }) => {
  if (!has(effects, 'taunt')) return [];
  if (!threat) return [];
  return [
    threat.hitsWholeParty
      ? {
          form: 'limited_here',
          text: `Taunt cannot redirect ${threat.displayName} — it hits the whole party, so there is no single target to pull.`,
        }
      : {
          form: 'strong_now',
          text: `Pulls ${threat.displayName} onto this hero instead of its current target.`,
        },
  ];
};

/** Cleanse clears what is on the board; it cannot pre-empt what is coming. */
const cleanseRule: Rule = ({ state, threat, effects, projection }) => {
  const remove = effects.find((e) => e.type === 'remove_status');
  if (!remove || remove.type !== 'remove_status') return [];

  const removed = projection.statuses.filter((s) => s.change === 'removed');
  const notes: RelevanceNote[] = [];

  notes.push(
    removed.length > 0
      ? {
          form: 'strong_now',
          text: `Removes ${removed.map((s) => titleCase(s.statusId)).join(', ')} from the target.`,
        }
      : {
          form: 'limited_here',
          text: 'Nothing to cleanse on the target right now.',
        },
  );

  // The timing trap: heroes act before the boss resolves, so cleansing now
  // does not stop the application landing this round.
  const incoming = threat?.statuses ?? [];
  if (incoming.length > 0) {
    notes.push({
      form: 'limited_here',
      text: `Does not prevent ${incoming.map((s) => titleCase(s.statusId)).join(', ')} from ${threat!.displayName} — heroes act first, so the new application still lands.`,
    });
  }

  if (threat?.hitsWholeParty && state.heroes.filter((h) => !h.defeated).length > 1) {
    notes.push({
      form: 'limited_here',
      text: 'Covers one hero. A party-wide hit leaves the rest uncovered.',
    });
  }
  return notes;
};

/** Shields and heals buy survival, never objective progress. */
const survivalRule: Rule = ({ threat, effects, projection }) => {
  const notes: RelevanceNote[] = [];
  const shield = projection.shields.filter((s) => s.amount > 0);
  if (has(effects, 'shielding') && shield.length > 0) {
    notes.push({
      form: 'helps',
      text: `Grants ${shield.map((s) => s.amount).join(' + ')} shield, but absorbs damage rather than stopping the action.`,
    });
  }
  if (has(effects, 'healing')) {
    const healed = projection.hp.filter((h) => h.hpDelta > 0);
    if (healed.length > 0) {
      notes.push({
        form: 'helps',
        text: `Heals ${healed.map((h) => h.hpDelta).join(' + ')}, but spends the round without moving the objective.`,
      });
    }
  }
  if ((has(effects, 'shielding') || has(effects, 'healing')) && damageObjective(threat)) {
    notes.push({
      form: 'limited_here',
      objectiveKind: 'charge',
      text: `Survival does not advance ${threat!.displayName} — that break is measured in damage dealt.`,
    });
  }
  return notes;
};

/** Execute threat: healing above the line actually removes the multiplier. */
const executeRule: Rule = ({ state, threat, projection }) => {
  const pct = threat?.executeThresholdPercent;
  if (pct === undefined) return [];
  const notes: RelevanceNote[] = [];
  for (const h of projection.hp) {
    if (h.hpDelta <= 0) continue;
    const hero = state.heroes.find((x) => x.actorId === h.actorId);
    if (!hero) continue;
    const line = hero.snapshot.maxHp * pct;
    if (h.hpBefore < line && h.hpAfter >= line) {
      notes.push({
        form: 'strong_now',
        text: `Lifts ${hero.snapshot.displayName} above the execute line — ${threat!.displayName} loses its bonus damage against them.`,
      });
    }
  }
  return notes;
};

const RULES: readonly Rule[] = [
  damageRule,
  dotRule,
  guardEffectRule,
  tauntRule,
  cleanseRule,
  survivalRule,
  executeRule,
];

/* ------------------------------------------------------------------ */
/*  Compilation                                                        */
/* ------------------------------------------------------------------ */

const DENIAL_TEXT: Record<string, string> = {
  insufficient_resource: 'Not enough in the party chamber.',
  on_cooldown: 'On cooldown.',
  invalid_target: 'No legal target.',
};

/**
 * Compile every note for one ability against the current threat.
 *
 * A rule that throws or has nothing to say is not an error — the ability still
 * renders with its exact mechanics. Guidance degrading to plain facts is fine;
 * an ability vanishing because a note failed is not.
 */
export function explainAbility(
  state: BattleState,
  threat: ThreatVM | null,
  ability: AbilityCombatSnapshot,
  projection: ActionProjection,
): ContextualAbilityVM {
  const base: Omit<ContextualAbilityVM, 'relevance' | 'limitations'> = {
    definitionId: ability.definitionId,
    displayName: ability.displayName,
    tacticalLabel: tacticalLabel(ability),
    resourceType: ability.resourceType,
    resourceCost: ability.resourceCost,
    cooldownRounds: ability.cooldownRounds,
    projection,
  };

  if (projection.deniedReason) {
    return {
      ...base,
      relevance: [],
      limitations: [
        {
          form: 'unavailable',
          text: `Unavailable: ${DENIAL_TEXT[projection.deniedReason] ?? projection.deniedReason}`,
        },
      ],
    };
  }

  const ctx: RuleContext = {
    state,
    threat,
    ability,
    effects: ability.version.effects,
    projection,
  };

  const notes: RelevanceNote[] = [];
  for (const rule of RULES) {
    try {
      notes.push(...rule(ctx));
    } catch {
      // Fall back to exact mechanics rather than hiding the ability.
    }
  }

  return {
    ...base,
    relevance: notes.filter((n) => n.form !== 'limited_here'),
    limitations: notes.filter((n) => n.form === 'limited_here'),
  };
}
