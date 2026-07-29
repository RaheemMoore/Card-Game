import type { RewardDefinition, RewardItem } from '../../types/economy';

/**
 * Reward catalog — one entry per rewardId. A6 populates the discovery
 * rewards; Phase 3 minigame + boss rewards land later.
 *
 * ── Governance ──────────────────────────────────────────────────────────
 * Discovery values below were approved by Raheem on 2026-07-18. This
 * approval OVERRIDES Stage 0 decision #5 ("gameplay currency only") —
 * discovery now grants both Gold and Forge Crystals per rarity. Any
 * further value change requires a NEW Raheem approval per §13; cite the
 * decision date in the commit message and bump `version`.
 *
 * Approved ladder (per first-time player+ability discovery):
 *   common:    50 gold + 20 crystals
 *   uncommon: 100 gold + 30 crystals
 *   rare:     150 gold + 50 crystals
 *   legendary:300 gold + 80 crystals
 *   mythic:   600 gold + 150 crystals
 */

const DISCOVERY_AMOUNTS: Record<
  'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic',
  { gold: number; crystals: number }
> = {
  common:    { gold:  50, crystals:  20 },
  uncommon:  { gold: 100, crystals:  30 },
  rare:      { gold: 150, crystals:  50 },
  legendary: { gold: 300, crystals:  80 },
  mythic:    { gold: 600, crystals: 150 },
};

function discoveryReward(
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic',
): RewardDefinition {
  const amounts = DISCOVERY_AMOUNTS[rarity];
  const guaranteed: RewardItem[] = [
    { currency: 'gameplay', amount: amounts.gold },
    { currency: 'premium', amount: amounts.crystals },
  ];
  return {
    rewardId: `ability_discovery_${rarity}`,
    mode: 'milestone',
    guaranteed,
    limits: { firstClearOnly: true },
    approvedBy: 'Raheem',
    version: 2, // v2 = approved amounts (2026-07-18). v1 was zero placeholders.
  };
}

export const REWARD_CATALOG: Record<string, RewardDefinition> = {
  ability_discovery_common: discoveryReward('common'),
  ability_discovery_uncommon: discoveryReward('uncommon'),
  ability_discovery_rare: discoveryReward('rare'),
  ability_discovery_legendary: discoveryReward('legendary'),
  ability_discovery_mythic: discoveryReward('mythic'),
};

/**
 * Convenience lookup — returns the reward for an ability's rarity. Undefined
 * when the rarity isn't a discovery-rewardable one (should never happen with
 * the current rarity enum, but kept defensive).
 */
export function getDiscoveryRewardForRarity(
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic',
): RewardDefinition | undefined {
  return REWARD_CATALOG[`ability_discovery_${rarity}`];
}

/* ------------------------------------------------------------------ */
/*  Boss battle rewards (B5)                                           */
/*                                                                     */
/*  Governance: values below are the initial B5 pass, provisional      */
/*  pending B6 balance. Any live-tuning requires explicit Raheem       */
/*  approval per §13.                                                  */
/*                                                                     */
/*  Rules:                                                             */
/*    - First-clear grants a one-time bonus per (userId, bossId).      */
/*    - Repeat-clear grants a smaller flat reward, unlimited times.    */
/*    - Defeat grants nothing (no consolation currency in B5).         */
/* ------------------------------------------------------------------ */

interface BossRewardAmounts {
  firstClear: { gold: number; crystals: number };
  repeat: { gold: number; crystals: number };
}

const BOSS_REWARD_AMOUNTS: Record<string, BossRewardAmounts> = {
  // Floor 0 — the gatekeeper. Unchanged, and the only boss paying Crystals.
  boss_fire_elemental_v0: {
    firstClear: { gold: 500, crystals: 100 },
    repeat: { gold: 100, crystals: 15 },
  },

  /* ---------------- The Overreach champions ----------------
   * GOLD ONLY. Approved by Raheem 2026-07-28: "leave it gold for now."
   *
   * Reason for the addition (economy plan §13): a boss with no row in this
   * map silently pays ZERO — `bossReward` returns an empty `guaranteed` array
   * and the grant resolves as `no_reward / zero_value`. So clearing a champion
   * paid nothing at all, which is worse than paying too little.
   *
   * Player impact: the three floors together add 400 + 600 + 800 = 1,800 Gold
   * of one-time income, roughly three and a half Forged `resistTheFall`
   * spends (200 Gold each). Repeats pay a quarter of first clear, matching the
   * Wraith's existing 500 → 100 shape, so grinding floor 1 is not competitive
   * with climbing.
   *
   * Crystals are deliberately withheld. Crystals buy AI generation, and until
   * the run loop exists there is no per-run sink to balance a premium faucet
   * against — the Wraith's one-time 100 stays the only Crystal boss payout.
   *
   * The ladder is `200 + 200 × floor`, matching the tower curve's shape: a
   * higher floor is worth more because it demands a better party, not because
   * it takes longer. */
  boss_champion_barbarian: {
    firstClear: { gold: 400, crystals: 0 },
    repeat: { gold: 100, crystals: 0 },
  },
  boss_champion_druid: {
    firstClear: { gold: 600, crystals: 0 },
    repeat: { gold: 150, crystals: 0 },
  },
  boss_champion_seraph: {
    firstClear: { gold: 800, crystals: 0 },
    repeat: { gold: 200, crystals: 0 },
  },
};

function bossReward(bossId: string, tier: 'first_clear' | 'repeat'): RewardDefinition {
  const amounts = BOSS_REWARD_AMOUNTS[bossId];
  if (!amounts) {
    return {
      rewardId: `boss_${bossId}_${tier}`,
      mode: 'milestone',
      guaranteed: [],
      approvedBy: 'Raheem',
      version: 1,
    };
  }
  const bucket = tier === 'first_clear' ? amounts.firstClear : amounts.repeat;
  // Zero-amount entries are omitted rather than granted as "+0", so a
  // gold-only boss does not show the player an empty Crystal line.
  const guaranteed: RewardItem[] = [
    ...(bucket.gold > 0 ? [{ currency: 'gameplay' as const, amount: bucket.gold }] : []),
    ...(bucket.crystals > 0 ? [{ currency: 'premium' as const, amount: bucket.crystals }] : []),
  ];
  return {
    rewardId: `boss_${bossId}_${tier}`,
    mode: 'milestone',
    guaranteed,
    limits: tier === 'first_clear' ? { firstClearOnly: true } : undefined,
    approvedBy: 'Raheem',
    version: 1,
  };
}

for (const bossId of Object.keys(BOSS_REWARD_AMOUNTS)) {
  REWARD_CATALOG[`boss_${bossId}_first_clear`] = bossReward(bossId, 'first_clear');
  REWARD_CATALOG[`boss_${bossId}_repeat`] = bossReward(bossId, 'repeat');
}

export function getBossReward(
  bossId: string,
  tier: 'first_clear' | 'repeat',
): RewardDefinition | undefined {
  return REWARD_CATALOG[`boss_${bossId}_${tier}`];
}
