# Wildlife system

This package is intentionally isolated from `CourtyardV2.scene`. The separate
`WildlifeLab.scene` is the visual test room. Do not connect wildlife to Courtyard
V2 until the lab behavior and generated animal art have both passed review.

## How the life is assembled

Think of the pieces this way:

1. `WildlifeManager` is the park ranger. It owns the animals, updates them, and
   applies global rules such as reduced motion.
2. `WildlifeAgent` is one individual animal. It connects one Sprite placed in
   Phaser Editor to its brain, movement, facing, depth, and animations.
3. `WildlifeBrain` decides *what to do next*. A reactive safety layer handles the
   player first. A utility layer then scores energy, curiosity, signature urge,
   recent memory, cooldowns, and species preferences for ordinary activities.
4. `movement.ts` answers *how to get there*. It chooses destinations and takes
   frame-rate-independent steps. The courtyard later injects its existing traced
   wall collision instead of creating a second physics system.
5. `profiles.ts` is the personality sheet. Fox, rabbit, and tortoise use the same
   code but have different speeds, timing, behavior weights, and player reactions.

The brain does not know about artwork. This is the load-bearing idea: replacing a
temporary ellipse with an approved fox sprite does not change the fox's decisions.

## First behavior set

| Species | Routine activities | Close-player response |
| --- | --- | --- |
| Red fox | trot, pause, sniff, observe | run away |
| Forest rabbit | hop, pause, nibble, observe | run away sooner |
| Glowcap tortoise | toddle, pause, softly glow, observe | stop and watch |

The brain prevents an activity from immediately repeating and adds cooldowns to
signature actions. Controlled randomness only breaks close scores; changing needs
do the real choosing. This produces variation without pretending randomness alone
is believable behavior.

## What the player edits visually later

After the animal sprites become Phaser Editor prefabs, the user should only need
to drag them into a scene and edit Inspector values such as species, roaming area,
speed multiplier, and starting facing. Invisible Editor rectangles can define safe
roaming areas until real drinking, resting, and hiding locations are added.

## Asset boundary

The first asset pass contains animals only. No trees, pond, dens, plants, habitat
props, or shadows are generated. Each animal needs a consistent low-top-down base,
four movement facings, and one signature activity. Final generation must use the
project's PixelLab provenance and review pipeline; one-off pictures are not valid
animation assets.
