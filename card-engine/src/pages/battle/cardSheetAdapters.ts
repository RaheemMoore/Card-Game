import type { HeroCombatant } from '../../types/combat';
import type { CardSheetAbility, CardSheetLiveState } from '../../components/CardSheet';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';
import { getStatus } from '../../data/abilities/statuses';

/** Builds the shared CardSheet's ability rows from a hero's frozen combat
 *  snapshot, including live status (ready/cooldown/no resource/locked) —
 *  the whole reason a player opens this mid-fight. */
export function buildBattleCardSheetAbilities(hero: HeroCombatant): CardSheetAbility[] {
  const store = getAbilityStore();
  return hero.snapshot.abilities.map((a) => {
    const cooldownEntry = hero.cooldowns.find((c) => c.abilityDefinitionId === a.definitionId);
    const onCd = cooldownEntry !== undefined;
    const short = hero.resource < a.resourceCost;
    const notCharged = a.slot === 'ultimate' && hero.ultimateCharge < 100;
    const liveStatus = onCd ? 'cooldown' : short ? 'no_resource' : notCharged ? 'locked' : 'ready';
    const art = store.getArtForAbility(a.definitionId);
    return {
      slot: a.slot,
      displayName: a.displayName,
      descriptionShort: a.def.descriptionShort,
      descriptionLong: a.def.descriptionLong,
      resourceCost: a.resourceCost,
      resourceLabel: a.resourceType === 'mana' ? 'MANA' : a.resourceType === 'tech' ? 'TECH' : 'NONE',
      cooldownRounds: a.cooldownRounds,
      artUrl: art ? getArtCrops(art).combat.url : null,
      liveStatus,
      cooldownRemaining: cooldownEntry?.remainingRounds,
    };
  });
}

export function buildBattleLiveState(hero: HeroCombatant): CardSheetLiveState {
  return {
    hp: hero.hp,
    maxHp: hero.snapshot.maxHp,
    resource: hero.resource,
    maxResource: hero.snapshot.maxResource,
    resourceLabel: hero.snapshot.resourceType === 'mana' ? 'MANA' : 'TECH',
    ultimateChargePct: Math.max(0, Math.min(100, hero.ultimateCharge)),
    statuses: hero.statuses.map((s) => ({
      instanceId: s.instanceId,
      label: getStatus(s.statusId)?.displayName ?? s.statusId,
    })),
    defeated: hero.defeated,
  };
}
