import type { BossCardManifest, BossSpriteManifest, CombatArtAsset } from './types';

/**
 * Boss combat sprites (pixel per the C0 hybrid decision — see plan §15.1)
 * and boss card portraits (painted, Picker-only). C5 ships placeholder rows;
 * C6 fires the Leonardo batches after prompt approval.
 */

export type BossSpriteState = 'idle' | 'attack' | 'hit' | 'rage' | 'defeat';

function spriteKey(bossId: string, state: BossSpriteState): string {
  return `${bossId}:${state}`;
}

const EMBERBORN_WRAITH_ID = 'boss_fire_elemental_v0';

const EMBERBORN_WRAITH_SPRITES: Record<BossSpriteState, CombatArtAsset> = {
  idle: {
    id: 'emberborn_wraith_idle',
    kind: 'boss_sprite',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/sprite-idle.png',
    dimensions: { width: 1024, height: 1024 },
    approvalStatus: 'approved',
    promptVersion: 'c6.v1',
    notes: 'Leonardo Phoenix 1.0, seed=555666 (sprite-candidate-1). Approved by Raheem 2026-07-19. Losing candidate-2 kept on disk.',
  },
  attack: {
    id: 'emberborn_wraith_attack',
    kind: 'boss_sprite',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/sprite-attack.svg',
    dimensions: { width: 384, height: 384 },
    approvalStatus: 'placeholder',
    notes: 'Placeholder — CSS transform on idle until C6 delivers a distinct pose.',
  },
  hit: {
    id: 'emberborn_wraith_hit',
    kind: 'boss_sprite',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/sprite-idle.png',
    dimensions: { width: 1024, height: 1024 },
    approvalStatus: 'approved',
    promptVersion: 'c6.v1',
    notes: 'Same asset as idle with a red-flash CSS overlay applied in C7.',
  },
  rage: {
    id: 'emberborn_wraith_rage',
    kind: 'boss_sprite',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/sprite-idle.png',
    dimensions: { width: 1024, height: 1024 },
    approvalStatus: 'approved',
    promptVersion: 'c6.v1',
    notes: 'Rage aura overlay in CSS; unique rage sprite optional in C6.',
  },
  defeat: {
    id: 'emberborn_wraith_defeat',
    kind: 'boss_sprite',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/sprite-idle.png',
    dimensions: { width: 1024, height: 1024 },
    approvalStatus: 'approved',
    promptVersion: 'c6.v1',
    notes: 'Same asset as idle with opacity + grayscale until a defeat pose lands.',
  },
};

export const BOSS_SPRITE_MANIFEST: BossSpriteManifest = Object.fromEntries(
  Object.entries(EMBERBORN_WRAITH_SPRITES).map(([state, asset]) => [
    spriteKey(EMBERBORN_WRAITH_ID, state as BossSpriteState),
    asset,
  ]),
);

export function getBossSprite(bossId: string, state: BossSpriteState) {
  return BOSS_SPRITE_MANIFEST[spriteKey(bossId, state)];
}

export const BOSS_CARD_MANIFEST: BossCardManifest = {
  [EMBERBORN_WRAITH_ID]: {
    id: 'emberborn_wraith_card',
    kind: 'boss_card',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/card.png',
    dimensions: { width: 832, height: 1216 },
    approvalStatus: 'approved',
    promptVersion: 'c6.v1',
    notes:
      'Leonardo Phoenix 1.0, seed=333444 (card-candidate-2). Picker/Codex only — never in active combat. ' +
      'Approved by Raheem 2026-07-19 with acknowledged M5.7 drift (fitted feminine chest armor with molten crack). ' +
      'M5.7 modesty rule targets hero portraits; boss cards are Raheem-discretion. Consider a re-fire in a later ' +
      'polish pass if we want to align the ash-elemental read more closely.',
  },
};

export function getBossCard(bossId: string) {
  return BOSS_CARD_MANIFEST[bossId];
}
