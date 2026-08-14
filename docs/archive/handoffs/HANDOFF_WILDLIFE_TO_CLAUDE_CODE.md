# Wildlife System Handoff for Claude Code

## What the user wants

Create three believable forest animals that appear to be living their own lives:

- Red fox: trot, sniff, sit and listen; curious; flees when approached closely.
- Forest rabbit: hop, nibble and groom; timid; notices and flees sooner.
- Glowcap tortoise: slow walk; peaceful and slightly magical; watches rather than sprinting away.

Do not add habitat props yet. First make the animals and their behavior work reliably in the separate Wildlife Lab. Do not connect them to Courtyard V2 until the user approves the lab.

## Current state

- The generated animal art and animation sheets already exist in the repository.
- The fox, rabbit and tortoise are real Sprite objects in `WildlifeLab.scene`; there are no remaining animal ellipses or placeholders.
- All three animals visibly move and animate in the playable Wildlife Lab.
- All six animation sheets are loaded and registered by `WildlifeLab.js`: three fox actions, two rabbit actions and the tortoise walk.
- A reusable wildlife brain, agent and manager system exists and has passing tests.
- Important: `WildlifeLab.js` currently uses a small three-animal visual demonstration routine. The reusable TypeScript wildlife system has **not yet been wired into that scene**.
- The sprite sheets were repacked with safe transparent cell padding to prevent neighbouring-frame bleed. Do not regenerate or repack them without a demonstrated reason.
- The generation spend reached 196 of the approved 200 maximum. Do not generate more art unless the user explicitly reopens that decision.

## Where everything is

### Playable test scene

- Scene source: `WildlifeLab.scene`
- Compiled/runtime scene: `WildlifeLab.js`
- Browser preview: `http://localhost:5173/dev/scene?start=WildlifeLab`

The scene contains real editor-visible Sprite objects named `foxSprite`, `rabbitSprite` and `tortoiseSprite`. It is deliberately separate from `CourtyardV2.scene`.

### Approved animation sheets

All runtime sheets and their metadata are in:

`card-engine/public/assets/wildlife-lab/`

| Animal | Action | Sheet | Frame size | Frames per direction |
| --- | --- | --- | --- | --- |
| Fox | Trot | `fox-trot-4dir.png` | 171 x 109 | 7 |
| Fox | Sniff | `fox-sniff-4dir.png` | 195 x 108 | 7 |
| Fox | Sit and listen | `fox-sit-alert-4dir.png` | 177 x 112 | 9 |
| Rabbit | Hop | `rabbit-hop-4dir.png` | 148 x 121 | 7 |
| Rabbit | Nibble and groom | `rabbit-nibble-groom-4dir.png` | 128 x 125 | 7 |
| Tortoise | Slow walk | `tortoise-toddle-4dir.png` | 154 x 106 | 7 |

Every sheet has four rows in this order:

1. Down
2. Up
3. Left
4. Right

The matching `*.meta.json` files contain the exact dimensions and frame indexes. Phaser Editor's asset pack is:

`card-engine/public/assets/wildlife-lab/wildlife-lab-pack.json`

The original individual generated frames are retained in:

`card-engine/scripts/sprite-lab/out/wildlife-animations/`

Generation descriptions and provenance are in:

- `card-engine/scripts/sprite-lab/configs/wildlife-animals.json`
- `card-engine/scripts/sprite-lab/configs/wildlife-animations.json`

### Animation review and teaching tools

- Review lab source: `card-engine/src/pages/dev/WildlifeAnimationLab.tsx`
- Review lab URL: `http://localhost:5173/dev/wildlife-animation-lab`
- Phaser School: `http://localhost:5173/dev/phaser-school`
- Lesson: ChatGPT Lessons > **Creating Life: Review the Animations**

The review lab can select every animal, action and direction; play or pause; step frame-by-frame; change preview speed; and automatically review the full set.

## The reusable brain system

The implementation lives in:

`card-engine/src/pages/castle/wildlife/`

Start by reading its `README.md`, then read every TypeScript file in the folder.

### 1. `WildlifeManager` - the scene-level owner

The manager is like the park ranger. It owns all active animals, updates each one every Phaser frame, passes in the player position, propagates reduced-motion settings, and cleans the animals up when the scene closes.

### 2. `WildlifeAgent` - one individual animal

An agent connects one visually placed Phaser Sprite to:

- its species profile;
- its brain;
- its permitted roaming rectangle;
- its current target and facing;
- movement and collision resolution;
- the Phaser animation keys appropriate to its activity and direction.

The agent receives the brain's decision, moves the sprite when appropriate, selects the matching animation, and sets depth from the sprite's Y position.

### 3. `WildlifeBrain` - decides what to do next

The brain knows nothing about sprites, artwork or Phaser animation frames. It returns activities only:

- `idle`
- `roam`
- `signature`
- `observe`
- `flee`

It has two decision layers:

1. **Immediate reaction:** player distance can interrupt ordinary life. Foxes and rabbits flee; the tortoise observes.
2. **Ordinary routine selection:** activities receive utility scores based on species weights, changing needs, cooldowns, recent memory and a small amount of randomness.

The brain tracks three changing needs:

- Energy: movement spends it and rest restores it.
- Curiosity: encourages roaming or observing, then falls after those activities.
- Signature urge: gradually rises until the species-specific action becomes attractive, then resets after that action.

It also prevents immediate repetition, remembers the two most recent activities, keeps selected activities running for a chosen duration, and gives actions cooldowns. Randomness only breaks close scores; it is not the entire behavior system.

### 4. `profiles.ts` - species personality data

All three animals use the same brain and agent code. Their profiles supply different speeds, reaction distances, activity weights, durations, cooldowns and close-player responses. This is what makes the rabbit timid, the fox curious and the tortoise calm without creating three unrelated AI systems.

### 5. `movement.ts` - frame-rate-independent movement

Movement helpers choose legal destinations, step toward them using `deltaMs`, determine facing, and choose a flee point away from the player. `WildlifeAgent` accepts an injected `moveResolver`, allowing Courtyard V2 to use its existing traced-wall collision later instead of creating a second physics system.

### 6. Animation mapping - how decisions become visible

`WildlifeAnimationSet` maps activity groups to Phaser animation keys for each direction:

- `move`: used by roam and flee;
- `signature`: sniff for fox, nibble/groom for rabbit, and later a restrained tortoise glow/tuck treatment;
- `observe`: optional alert/watch animation;
- `idle`: standing or resting fallback.

This separation is load-bearing: artwork can be replaced or improved without rewriting the brain.

## Tests and validation

Tests are located at:

- `card-engine/src/pages/castle/wildlife/WildlifeBrain.test.ts`
- `card-engine/src/pages/castle/wildlife/movement.test.ts`

Current result: 9 tests passing. They cover activity duration, repetition prevention, player interruption, tortoise observation, continuing flee reactions, changing needs, bounded destinations, frame-rate-independent steps and bounded flee targets.

Run from `card-engine/`:

```powershell
npm.cmd test -- src/pages/castle/wildlife/WildlifeBrain.test.ts src/pages/castle/wildlife/movement.test.ts
npm.cmd exec tsc -- -p tsconfig.app.json --noEmit
```

## Recommended next phases

1. Read the complete system and explain it back to the user in plain language before editing anything.
2. Inspect the live review lab and Wildlife Lab scene. Confirm all three real sprites and all six animation sheets are present, and confirm the current visual demonstration and reusable TypeScript system are separate layers.
3. Plan the smallest safe adapter that wires `WildlifeManager` and three `WildlifeAgent` instances into `WildlifeLab`, using the existing sheets and editor-placed sprites.
4. Replace the temporary demonstration routine with the shared system and verify all three animals only in Wildlife Lab. Keep the tortoise simple. Do not add habitat props or modify Courtyard V2.
5. After the user visually approves the lab, propose - do not silently perform - the Courtyard V2 integration and its collision/roaming-area setup.

## Safety rules

- Do not modify `CourtyardV2.scene` during the lab phase.
- Do not generate new animal or environmental art.
- Do not replace the existing wildlife architecture with three separate hard-coded animals.
- Preserve visual authoring: sprites and roaming areas should ultimately be placeable/editable in Phaser Editor.
- Do not manually edit generated `.scene` JSON when Phaser Editor can own that change.
- Phaser Editor can overwrite externally changed generated code if it has a stale copy open. Refresh the Editor project before saving scene-generated files.
- Preserve unrelated dirty worktree changes belonging to the user or other agents.

## Copy-and-paste prompt for Claude Code

```text
Please take over the wildlife feature in this repository.

First, read HANDOFF_WILDLIFE_TO_CLAUDE_CODE.md completely. Then inspect every file it identifies, especially the entire card-engine/src/pages/castle/wildlife/ folder, WildlifeLab.js, WildlifeLab.scene, the wildlife asset metadata, the animation review lab, and the existing tests.

Do not edit anything yet. Your first response must explain the complete system back to me in clear, beginner-friendly language. Explain:

1. What WildlifeManager, WildlifeAgent, WildlifeBrain, profiles.ts and movement.ts each do.
2. How needs, utility scores, recent memory, cooldowns and player-distance reactions work together to avoid repetitive behavior.
3. How a brain decision becomes movement, facing and a Phaser animation.
4. What is already working visually and what is still only prepared in code.
5. The difference between the current three-animal WildlifeLab demonstration and the reusable TypeScript wildlife architecture.
6. The safest step-by-step plan to wire the fox, rabbit and simple glowcap tortoise into WildlifeLab without touching Courtyard V2.

Confirm the exact asset and file paths you found. Confirm that you will use the existing assets, spend no generation budget, preserve Phaser Editor visual authoring, and avoid unrelated worktree changes.

After explaining everything, stop and wait for my approval before implementing the next phase.
```
