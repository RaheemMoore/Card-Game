import type { ArchetypeName, CardStats, Rank } from '../../types/card';
import type { AbilityCandidate, AbilityResourceType, AbilitySlotType } from '../../types/abilities';
import type { ElementSelection } from '../../types/bible';
import { EFFECT_TYPES, TARGET_TYPES, TRIGGER_TYPES } from '../../types/abilities';
import { STATUS_IDS } from '../../data/abilities/statuses';
import { ARCHETYPE_PREFERRED_FAMILIES } from '../../data/abilities/families';
import { getBibleChapter } from '../../data/archetypeBible';

/**
 * Builds the ability-generation segment of the forge / tier-up Claude prompt.
 * Kept as a separate module so claudeApi.ts doesn't bloat with catalog lists
 * every time we add an effect type.
 */

const RARITY_BY_RANK: Record<Rank, string> = {
  Foundation: 'common',
  Forged: 'uncommon',
  Ascendant: 'rare',
};

const COST_HINT: Record<AbilitySlotType, string> = {
  core: '0-2',
  signature: '2-4',
  ultimate: '3-6',
};

export interface AbilityPromptInput {
  archetype: ArchetypeName;
  stats: CardStats;
  rank: Rank;
  slotType: AbilitySlotType;
  /** Optional — when provided, ability flavor should weave the element + bond. */
  element?: ElementSelection;
}

export function buildAbilityPromptFragment(input: AbilityPromptInput): string {
  const { archetype, stats, rank, slotType, element } = input;
  const resource: AbilityResourceType = stats.Tech ? 'tech' : 'mana';
  const rarity = RARITY_BY_RANK[rank];
  const affinity = ARCHETYPE_PREFERRED_FAMILIES[archetype];
  const chapter = getBibleChapter(archetype);

  return `

=== ABILITY GENERATION ===
Propose an ability for this card, returned as JSON key \`abilityCandidate\` alongside your usual fields.

SLOT: "${slotType}"
RESOURCE: "${resource}"
RARITY GUIDANCE: "${rarity}" (this is the target rarity band; the validator will reject candidates whose power budget is far outside band)
RESOURCE COST BAND: ${COST_HINT[slotType]}

ARCHETYPE IDENTITY (Bible §${archetype}):
- Identity through: ${chapter.identityThrough}
- Core fantasy: ${chapter.coreFantasy}
- Virtues to reflect in ability flavor: ${chapter.beliefs.virtues.slice(0, 4).join(', ')}
- Materials/symbols to reference: ${chapter.symbolAndMaterial.symbols}
- §14 Avoid list (do NOT lean on these tropes): ${chapter.claudeGuidance.avoid.join(', ')}
${element ? `- Element woven into ability flavor: ${element.element} (bond: "${element.bond}")` : ''}

ARCHETYPE FAMILY AFFINITY (${archetype}):
- Preferred (pick from here first): ${affinity.preferred.join(', ') || 'none'}
- Secondary (occasional, only if lore justifies): ${affinity.secondary.join(', ') || 'none'}
- Restricted (NEVER use — lore forbids): ${affinity.restricted.join(', ') || 'none'}

AVAILABLE EFFECT TYPES: ${EFFECT_TYPES.join(', ')}
AVAILABLE TARGET TYPES: ${TARGET_TYPES.join(', ')}
AVAILABLE TRIGGER TYPES: ${TRIGGER_TYPES.join(', ')}
AVAILABLE STATUS IDS (for apply_status / damage_over_time): ${STATUS_IDS.join(', ')}

CANDIDATE SHAPE:
{
  "displayName": "1-3 word ability name that matches the character's identity",
  "familyIds": ["martial"],           // 1-2 from preferred, occasionally 1 secondary
  "rarity": "${rarity}",
  "role": "damage" | "defense" | "support" | "control" | "summon" | "utility" | "hybrid",
  "tags": ["short", "lowercase", "tags"],
  "descriptionShort": "One sentence player-facing summary of what the ability does.",
  "slotType": "${slotType}",
  "resourceType": "${resource}",
  "resourceCost": <${COST_HINT[slotType]}>,
  "cooldownRounds": <0-4 or omit>,
  "targetRule": { "type": "one_of_available_target_types" },
  "effects": [
    // 1-3 effects. Each effect object matches the effect type's runtime shape.
    // Examples:
    // { "type": "direct_damage", "amount": 15, "damageType": "physical", "scaling": { "stat": "atk", "coefficient": 0.5 } }
    // { "type": "damage_over_time", "statusId": "burn", "amountPerTick": 4, "duration": 3 }
    // { "type": "healing", "amount": 12, "scaling": { "stat": "mana", "coefficient": 0.4 } }
    // { "type": "shielding", "amount": 20, "duration": 3 }
    // { "type": "apply_status", "status": { "statusId": "mark", "duration": 2 } }
    // { "type": "guard", "reductionPercent": 0.3, "duration": 2 }
    // { "type": "lifesteal", "percentOfDamage": 0.5 }
    // { "type": "multi_hit", "hitCount": 3, "amountPerHit": 6 }
    // { "type": "ultimate_charge_gain", "amount": 3 }
  ],
  "triggers": [ { "type": "on_use" } ],  // active abilities use on_use; passives use start_of_round / on_damage_received / etc.
  "scalingRules": [ { "stat": "atk", "coefficient": 0.5 } ]  // optional; each stat coefficient must be 0..2.5
}

TUNING TARGETS (provisional, playtest will refine):
- direct_damage amount 8-25 flat + optional scaling
- healing 8-20; shielding 10-25
- damage_over_time amountPerTick 3-8 for duration 2-4
- Ultimate slot only appears at Ascendant rank; don't mark a Foundation/Forged ability as ultimate

RULES:
1. Weave the ability into THIS character's lore, name, whisper words, and modifiers — no generic abilities.
2. Only use effect / target / trigger / status IDs from the AVAILABLE lists above. If you need something not listed, prefer a close approximation from the list.
3. familyIds MUST NOT include any restricted family for ${archetype}.
4. resourceCost 0 requires resourceType "none" — if you set resourceType "${resource}", cost must be >= 1.
5. Prefer 1-2 effects for readability. Save conditional_bonus for signature/ultimate slots.

If you can't produce a coherent ability, omit \`abilityCandidate\` entirely — the card will be forged without one and the admin queue will nudge me to backfill.`;
}

/**
 * Best-effort parse of Claude's `abilityCandidate` field. Returns undefined
 * when the field is missing, malformed, or fails a shallow shape check.
 * The proposal service validates the full runtime contract; this only rejects
 * shapes that would crash the validator itself.
 */
export function parseAbilityCandidate(raw: unknown): AbilityCandidate | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.displayName !== 'string' || obj.displayName.trim() === '') return undefined;
  if (!Array.isArray(obj.familyIds)) return undefined;
  if (typeof obj.rarity !== 'string') return undefined;
  if (typeof obj.role !== 'string') return undefined;
  if (!Array.isArray(obj.tags)) return undefined;
  if (typeof obj.descriptionShort !== 'string') return undefined;
  if (typeof obj.slotType !== 'string') return undefined;
  if (typeof obj.resourceType !== 'string') return undefined;
  if (typeof obj.resourceCost !== 'number') return undefined;
  if (!obj.targetRule || typeof obj.targetRule !== 'object') return undefined;
  if (!Array.isArray(obj.effects) || obj.effects.length === 0) return undefined;
  // Trust the shape and let the validator do the rest.
  return obj as unknown as AbilityCandidate;
}
