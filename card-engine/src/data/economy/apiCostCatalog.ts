import type { ApiCostEntry, PaidActionId } from '../../types/economy';

const REVIEWED_AT = '2026-07-16';

export const API_COST_CATALOG: Record<PaidActionId, ApiCostEntry> = {
  forge_card: {
    actionId: 'forge_card',
    version: 1,
    enabled: true,
    components: [
      {
        provider: 'anthropic',
        operation: 'claude-haiku-4-5 messages (name/lore/identity/prompt)',
        estimatedCostUsd: 0.001,
        notes: '~1200 output tokens, temperature 1.0',
      },
      {
        provider: 'leonardo',
        operation: 'Phoenix 512x512 img2img with alchemy',
        estimatedCostUsd: 0.036,
      },
    ],
    estimatedDirectCostUsd: 0.037,
    lastReviewedAt: REVIEWED_AT,
    reviewedBy: 'Raheem',
    confidence: 'medium',
    notes: 'Leonardo dominates ~97% of per-forge cost. Reviewed after Claude model switch to Haiku.',
  },
  evolve_card_art: {
    actionId: 'evolve_card_art',
    version: 1,
    enabled: true,
    components: [
      {
        provider: 'anthropic',
        operation: 'claude-haiku-4-5 messages (evolved modifiers/lore/prompt)',
        estimatedCostUsd: 0.001,
      },
      {
        provider: 'anthropic',
        operation: 'claude-haiku-4-5 ascendant path options (Forged→Ascendant only)',
        estimatedCostUsd: 0.0001,
        notes: 'Bundled: only fires on Forged→Ascendant tier-ups, not every evolution.',
      },
      {
        provider: 'leonardo',
        operation: 'Phoenix 512x512 evolved portrait',
        estimatedCostUsd: 0.036,
      },
    ],
    estimatedDirectCostUsd: 0.0371,
    lastReviewedAt: REVIEWED_AT,
    reviewedBy: 'Raheem',
    confidence: 'medium',
    notes: 'Ascendant paths call is bundled here rather than a separate PaidActionId.',
  },
  regenerate_portrait: {
    actionId: 'regenerate_portrait',
    version: 1,
    enabled: true,
    components: [
      {
        provider: 'anthropic',
        operation: 'claude-haiku-4-5 messages (portrait prompt rebuild)',
        estimatedCostUsd: 0.001,
      },
      {
        provider: 'leonardo',
        operation: 'Phoenix 512x512 replacement portrait',
        estimatedCostUsd: 0.036,
      },
    ],
    estimatedDirectCostUsd: 0.037,
    lastReviewedAt: REVIEWED_AT,
    reviewedBy: 'Raheem',
    confidence: 'medium',
  },
  regenerate_text: {
    actionId: 'regenerate_text',
    version: 1,
    enabled: true,
    components: [
      {
        provider: 'anthropic',
        operation: 'claude-haiku-4-5 messages (text-only regen)',
        estimatedCostUsd: 0.001,
      },
    ],
    estimatedDirectCostUsd: 0.001,
    lastReviewedAt: REVIEWED_AT,
    reviewedBy: 'Raheem',
    confidence: 'medium',
    notes: 'No Leonardo call; used for lore/name refresh without artwork change.',
  },
};
