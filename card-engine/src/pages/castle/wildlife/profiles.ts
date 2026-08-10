import type { WildlifeSpeciesId, WildlifeSpeciesProfile } from './types';

export const WILDLIFE_SPECIES: Record<WildlifeSpeciesId, WildlifeSpeciesProfile> = {
  'red-fox': {
    id: 'red-fox',
    label: 'Red Fox',
    movementStyle: 'trot',
    roamSpeed: 48,
    fleeSpeed: 104,
    arrivalRadius: 7,
    noticeRadius: 150,
    fleeRadius: 82,
    closePlayerResponse: 'flee',
    signatureLabel: 'sniff the ground',
    drinkLabel: 'drink at the water',
    drinkRange: 34,
    // A fox drinking has its head well out over the water; its tongue lands a good
    // way past the edge its paws are standing on.
    muzzleReach: 13,
    routines: [
      { activity: 'roam', weight: 5, durationMs: [1_800, 4_200], cooldownMs: 1_000 },
      { activity: 'idle', weight: 3, durationMs: [1_000, 3_200], cooldownMs: 600 },
      { activity: 'signature', weight: 3, durationMs: [1_600, 3_200], cooldownMs: 4_500 },
      { activity: 'observe', weight: 2, durationMs: [900, 2_000], cooldownMs: 2_000 },
      { activity: 'drink', weight: 4, durationMs: [2_600, 4_400], cooldownMs: 40_000 },
    ],
  },
  'forest-rabbit': {
    id: 'forest-rabbit',
    label: 'Forest Rabbit',
    movementStyle: 'hop',
    roamSpeed: 58,
    fleeSpeed: 126,
    arrivalRadius: 6,
    noticeRadius: 175,
    fleeRadius: 108,
    closePlayerResponse: 'flee',
    signatureLabel: 'nibble and groom',
    drinkLabel: 'sip at the water',
    // Shorter muzzle, and it keeps more of itself over dry ground.
    muzzleReach: 8,
    // Tighter than the fox's and the drink is shorter: a rabbit at open water is
    // a rabbit in danger, and it behaves like one.
    drinkRange: 24,
    routines: [
      { activity: 'roam', weight: 5, durationMs: [1_100, 2_800], cooldownMs: 800 },
      { activity: 'idle', weight: 2, durationMs: [700, 1_900], cooldownMs: 500 },
      { activity: 'signature', weight: 4, durationMs: [1_400, 2_800], cooldownMs: 3_800 },
      { activity: 'observe', weight: 3, durationMs: [650, 1_500], cooldownMs: 1_800 },
      { activity: 'drink', weight: 4, durationMs: [1_500, 2_600], cooldownMs: 35_000 },
    ],
  },
  'glowcap-tortoise': {
    id: 'glowcap-tortoise',
    label: 'Glowcap Tortoise',
    movementStyle: 'toddle',
    roamSpeed: 20,
    fleeSpeed: 0,
    arrivalRadius: 5,
    noticeRadius: 105,
    fleeRadius: 58,
    closePlayerResponse: 'observe',
    signatureLabel: 'tuck in and softly glow',
    // No `drink` routine, so no drinking — Raheem's call, 2026-08-09. A tortoise
    // ambling to the water and back would eat most of a minute at 20px/s, and the
    // glow is what it is for. Giving it one is a two-line change if that shifts.
    routines: [
      { activity: 'roam', weight: 3, durationMs: [2_400, 5_800], cooldownMs: 1_000 },
      { activity: 'idle', weight: 5, durationMs: [1_800, 4_500], cooldownMs: 500 },
      { activity: 'signature', weight: 3, durationMs: [2_000, 4_000], cooldownMs: 5_000 },
      { activity: 'observe', weight: 2, durationMs: [1_200, 2_600], cooldownMs: 2_200 },
    ],
  },
};
