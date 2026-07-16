import type { RewardDefinition } from '../../types/economy';

// Empty scaffold. Populated in master project Phase 3 (Leveling & Minigames)
// when match-3, boss battles, and chest games ship. Each future minigame
// declares a rewardId here rather than calling walletService directly.
export const REWARD_CATALOG: Record<string, RewardDefinition> = {};
