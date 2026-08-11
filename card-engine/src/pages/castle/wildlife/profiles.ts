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
    // THE ONLY AMPHIBIOUS ANIMAL, Raheem 2026-08-10: "it'll be cool for it to maybe
    // hang out around the water and just float like a shell around the water."
    //
    // It needs no "get in the water" routine, and deliberately has none. Amphibious
    // simply means the waterline stops being a boundary, so its ordinary roaming
    // sometimes picks a spot in the pond and it ambles in — which is a more
    // convincing reason to be swimming than a decision to swim.
    habitat: 'amphibious',
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
  /**
   * The first creature that lives IN the water rather than beside it.
   *
   * No drinking, for the obvious reason, and no `observe`: a fish does not stop to
   * watch you, it leaves. `fleeRadius` is small because the player can never get
   * into the pond — only lean over it — so a fish that bolted at the same distance
   * as a rabbit would spend the whole game hiding.
   *
   * `signature` is the jump. It is paced by the same rising urge and cooldown as the
   * fox's sniff, which is what makes it the occasional surprise Raheem asked for
   * rather than a metronome.
   */
  'pond-fish': {
    id: 'pond-fish',
    label: 'Pond Fish',
    movementStyle: 'swim',
    habitat: 'water',
    // Unhurried, and quick when startled — a fish cruises then darts.
    roamSpeed: 26,
    fleeSpeed: 88,
    arrivalRadius: 5,
    noticeRadius: 70,
    fleeRadius: 44,
    closePlayerResponse: 'flee',
    signatureLabel: 'break the surface',
    routines: [
      { activity: 'roam', weight: 6, durationMs: [2_200, 5_000], cooldownMs: 600 },
      { activity: 'idle', weight: 2, durationMs: [700, 1_800], cooldownMs: 800 },
      { activity: 'signature', weight: 3, durationMs: [900, 1_400], cooldownMs: 22_000 },
    ],
  },
};
