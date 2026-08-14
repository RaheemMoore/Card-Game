// Combat resolution. Ratio-compression damage (never one-shots, self-normalises
// to ~2-3 clashes), simultaneous trade, and the Freeze -> Melt reaction.
// See card-engine-warband-battle-design.md "Combat Resolution".

import type { Unit, UnitState, WarbandEvent } from './types';

// dmg = Def_target * Atk / (Atk + Def_target). Always strictly < Def_target,
// so a single blow can never empty a full pool.
export function damage(atk: number, targetDefMax: number): number {
  return Math.round((targetDefMax * atk) / (atk + targetDefMax));
}

// A reaction burst ~= one clash of damage, capped so it also cannot one-shot.
export function reactionBurst(ability: number, targetDefMax: number): number {
  return Math.round(Math.min(ability * 0.4, targetDefMax * 0.5));
}

export interface ClashOutcome {
  attackerDef: number; // attacker's HP pool after the clash
  targetDef: number; // target's HP pool after the clash
  targetState: UnitState; // frozen is consumed by a Melt
  melt: number;
  events: WarbandEvent[];
}

// Pure: computes the result of `attacker` clashing `target`. Damage is
// simultaneous (both deal their Atk) unless the target is frozen — a frozen
// target is struck by fire for a Melt burst and does not retaliate.
export function resolveClash(attacker: Unit, target: Unit): ClashOutcome {
  const wasFrozen = target.state === 'frozen';
  const isMelt = attacker.element === 'fire' && wasFrozen;

  const base = damage(attacker.atk, target.defMax);
  const melt = isMelt ? reactionBurst(target.statePower, target.defMax) : 0;
  const dmgToTarget = base + melt;

  // Frozen targets are struck helpless — no counter-damage.
  const counter = wasFrozen ? 0 : damage(target.atk, attacker.defMax);

  const targetDef = target.def - dmgToTarget;
  const attackerDef = attacker.def - counter;
  const targetState: UnitState = isMelt ? 'none' : target.state;

  let text = `${attacker.name} clashes ${target.name}: deals ${dmgToTarget}`;
  if (melt) text += ` (Melt +${melt}!)`;
  if (counter) text += `, takes ${counter}`;
  else if (wasFrozen) text += ' — frozen, no counter';

  return {
    attackerDef,
    targetDef,
    targetState,
    melt,
    events: [
      {
        kind: isMelt ? 'reaction' : 'attack',
        text,
        unitId: attacker.id,
        targetId: target.id,
        amount: dmgToTarget,
      },
    ],
  };
}
