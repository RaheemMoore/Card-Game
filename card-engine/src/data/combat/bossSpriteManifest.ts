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
    path: 'bosses/emberborn-wraith/sprite-idle.svg',
    dimensions: { width: 384, height: 384 },
    approvalStatus: 'placeholder',
    notes: 'Placeholder — pixel Combat Sprite pending C6.',
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
    path: 'bosses/emberborn-wraith/sprite-idle.svg',
    dimensions: { width: 384, height: 384 },
    approvalStatus: 'placeholder',
    notes: 'Same asset as idle with a red-flash CSS overlay applied in C7.',
  },
  rage: {
    id: 'emberborn_wraith_rage',
    kind: 'boss_sprite',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/sprite-idle.svg',
    dimensions: { width: 384, height: 384 },
    approvalStatus: 'placeholder',
    notes: 'Rage aura overlay in CSS; unique rage sprite optional in C6.',
  },
  defeat: {
    id: 'emberborn_wraith_defeat',
    kind: 'boss_sprite',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/sprite-idle.svg',
    dimensions: { width: 384, height: 384 },
    approvalStatus: 'placeholder',
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
    path: 'bosses/emberborn-wraith/card.svg',
    dimensions: { width: 512, height: 720 },
    approvalStatus: 'placeholder',
    notes: 'Painted front-facing three-quarter portrait. Picker/Codex only — never in active combat.',
  },
};

export function getBossCard(bossId: string) {
  return BOSS_CARD_MANIFEST[bossId];
}
