# Castle Front V4 — Side-View Combat Truth Slice

**Status:** Approved direction; implementation handoff for Claude
**Date:** 2026-08-16
**Work mode:** FULL
**Implementation owner:** Claude Studio Lead
**Visual/product authority:** Raheem
**Post-build visual refinement lead:** Codex with Raheem
**Required specialist:** `phaser-runtime-director` before implementation because this adds a Scene, camera policy, side-view physics contract, and runtime bridge adapter
**Paid generation:** Not authorized by this handoff
**Deployment/push:** Not authorized by this handoff

---

## 1. The assignment in one sentence

Build a new, isolated, playable Phaser 3 scene named **CastleFrontV4** that recreates the current CourtyardV3 combat truth slice from a side-on perspective: a weak Card-wright stands outside a front-facing castle gate, moves left and right with no innate jump, cycles and fires the existing cards horizontally, and fights the existing Ember Jelly whose new readable leap can be evaded by running beneath it.

This is a perspective proof, not a replacement launch. It must be playable enough for Raheem and Codex to inspect visually and decide whether the project should fully move from top-down/three-quarter exploration to side-view exploration.

---

## 2. Why this exists

The current four-directional world makes every important character performance expensive. Walking, aiming, charging, attacking, falling, recovering, summoning, and future card abilities all multiply across directions. The new direction deliberately concentrates animation effort into left- and right-facing performances so the team can spend its time on dramatic card magic rather than directional coverage.

The player fantasy is unchanged:

> The Card-wright is physically ordinary and comparatively weak. Cards are the source of extraordinary power.

The first proof does not need finished art. It needs a trustworthy technical vessel that lets Raheem and Codex see the new perspective running, then refine scale, composition, imagery, animation, and effects afterward.

---

## 3. Approval record and settled decisions

Treat the following as approved product direction for this slice. Do not reopen these choices unless implementation evidence reveals a genuine blocker.

1. The new view is a **2D side-on / side-scrolling perspective**.
2. The first deliverable is **one exterior combat screen only**.
3. The first camera is **fixed**, but the world and camera ownership must not prevent later horizontal scrolling to the east.
4. The castle is the permanent western origin of the world. Future exploration grows to the right/east.
5. The visible castle is a **front-facing gate/building façade behind the Card-wright**, in the visual language of a side-view Kingdom-like building.
6. The castle interior, Forge interior, doorway transition, waypoints, village travel, and long world are later work.
7. The art mood remains **warm medieval fantasy at dusk/sunset**: cinematic, adventurous, orange/golden light, welcoming rather than evil or grim.
8. Use current or provisional assets. Do not spend on Leonardo or PixelLab during this implementation.
9. The Card-wright begins with **no jump**.
10. Do not bind `Space`, `W`, or `Up` to a jump in this slice. Jump will be unlocked later through progression; cards may eventually grant superior leaps, wings, flight, or other exceptional movement.
11. Ledge climbing will exist later, but climbing and ledges are out of scope here.
12. The Ember Jelly may leap. Its first side-view combat trick is a telegraphed arc high enough for the Card-wright to run underneath.
13. The Jelly leap must commit to its trajectory. It must not home onto the player after launch.
14. The player cycles carried cards with the mouse wheel. Number keys `1–4` may directly select slots.
15. `F` is the canonical fire/charge/release input for this proof.
16. There is no mouse aiming and no click-to-walk.
17. Card attacks fire horizontally in the current left/right facing direction unless a future card explicitly defines another targeting rule.
18. Preserve the current combat truth: readable telegraph, blast, hit reaction, knockback, strong knockdown, all carried cards scattering, proximity recovery, defeat, and reset/revive.
19. CourtyardV3 must remain intact and remain the production `/castle` experience while this proof is evaluated.
20. Subjective visual quality remains **HUMAN REVIEW**. Claude does not approve its own composition, animation quality, or feel.

---

## 4. Player-facing first-run experience

On entering the development route, the player should immediately see:

- a warm dusk sky/background;
- a large front-facing castle gate façade occupying the western/left part of the screen;
- a readable horizontal ground plane;
- the Card-wright outside the castle, near the left-middle of the playable space;
- the Ember Jelly farther to the right;
- the existing four-slot hand/readout and concise test controls.

The playable loop is:

```text
spawn outside the castle
→ walk left/right
→ select a card with the mouse wheel or 1–4
→ face the Jelly
→ hold/release F for the existing quick/heavy blast behavior
→ projectile travels horizontally from the authored card muzzle
→ Jelly takes damage, reacts, and is knocked back when appropriate
→ Jelly approaches and clearly telegraphs a committed leap
→ Card-wright runs beneath or away from the leap
→ a landed strong hit knocks the Card-wright backward and down
→ every carried card scatters across valid ground
→ Card-wright stands again
→ proximity recovers cards without E
→ firing becomes available again
→ Jelly is defeated
→ reset/revive makes the loop immediately repeatable
```

This loop is the definition of the first playable deliverable. A scene that only walks, or only fires at a passive sprite, is incomplete.

---

## 5. Explicit non-goals

Do not add any of the following during this handoff:

- Castle interior or Forge interior
- `E` doorway behavior
- Castle health, wall damage, waves, or loss conditions
- Bosses, boss summoning, boss minions, or boss projectiles
- Multiple enemy types
- Procedural level generation
- Long scrolling world content
- Waypoints or teleportation
- Village systems
- Ledges or climbing
- Player jump, double-jump, roll, dodge, dash, shield, or air control
- A new mana, cooldown, stamina, or card-consumption economy
- New permanent card definitions
- New persistence or Supabase work
- New Leonardo or PixelLab generations
- Redesign of the Card-wright
- Finished side-profile knockdown or summon art
- Replacing `/castle` or changing `PRODUCTION_SCENE`
- Deployment, push, PR creation, or destructive cleanup

If something on this list appears necessary, stop and report the exact dependency instead of silently widening the task.

---

## 6. Naming, route, and isolation boundary

Use these canonical prototype names unless an exact code collision is found:

- **Phaser Scene key:** `CastleFrontV4`
- **React surface:** `CastleFrontV4`
- **Development route:** `/dev/castle-front-v4`
- **Primary named scenario:** `castle-front-v4-combat-loop`
- **Secondary scenario:** `castle-front-v4-jelly-leap-evade`
- **Secondary scenario:** `castle-front-v4-scatter-recover`

The route must be lazy-loaded and gated by the existing `DEV_ROUTES` convention in `card-engine/src/App.tsx`. It must be absent from the production game bundle when `VITE_DEV_ROUTES=false`.

Do not redirect `/castle`. Do not change `card-engine/src/pages/castle/v2/courtyardRuntime.ts::PRODUCTION_SCENE`.

Recommended source boundary:

```text
card-engine/src/pages/castle/front-v4/
  CastleFrontV4.tsx          React host, status/readout, cleanup ownership
  createGame.ts              the only constructor of this Phaser.Game
  CastleFrontV4Scene.ts      Scene orchestration, thin Phaser seam
  layout.ts                  logical viewport, ground, bounds, spawn anchors
  playerController.ts        pure horizontal intent/capability rules
  jellyLeap.ts               pure committed leap trajectory and hit contract
  sideViewScatter.ts         valid ground-only scatter adapter
  studioBridge.ts            DEV-only adapter and named scenarios
  types.ts                   stable local contracts where needed
  index.ts                   lazy route export
```

File names may be adjusted to match existing conventions, but ownership must remain separated: pure rules must not be buried inside a giant Scene update method.

---

## 7. Phaser ownership and lifecycle contract

1. `CastleFrontV4.tsx` owns exactly one Phaser game for the lifetime of its mounted host.
2. Phaser must remain dynamically imported so the engine stays out of the synchronous application bundle.
3. Preserve the existing async import + `alive` flag + cleanup pattern used by `card-engine/src/pages/castle/usePhaserGame.ts` and `CastleV2.tsx`.
4. React StrictMode must never create a duplicate or orphaned canvas.
5. Cleanup must remove the DEV bridge, event listeners, timers, tweens, particle emitters, and game instance.
6. Do not create a module-scope Phaser singleton.
7. The Scene owns simulation and presentation. React receives bounded state for the hand/readout only; it must not render at 60 Hz.
8. A scene restart, route exit, and route re-entry must all work without duplicate input handlers or frozen global animation time.

---

## 8. Coordinate, scale, and camera contract

Use a stable 16:9 logical world for the first proof. Recommended starting values are provisional tuning constants, not canon:

```ts
VIEWPORT_WIDTH = 1280
VIEWPORT_HEIGHT = 720
GROUND_Y = 590
WORLD_LEFT = 0
WORLD_RIGHT = 1280
PLAYER_SPAWN_X = 470
JELLY_HOME_X = 1030
CASTLE_CENTER_X = 230
```

Requirements:

- World X increases toward the east/right.
- World Y increases downward, matching Phaser.
- `GROUND_Y` is the canonical contact line.
- Player position is represented at the feet/ground contact.
- Jelly state position is represented at its ground contact; airborne height is a separate presentation/simulation offset.
- Projectiles use world coordinates.
- Card pickups store landed ground X plus the canonical `GROUND_Y`.
- The fixed camera shows one 16:9 frame and never exposes void beyond world bounds.
- Use a FIT/letterbox policy rather than stretching the world on resize.
- The initial camera does not follow the player.
- Do not couple player bounds to DOM pixels or hardcode camera-screen coordinates into combat.
- Keep camera setup in one policy function or configuration object so later work can add horizontal follow and larger world bounds without rewriting combat.

The implementation does not need to ship a follow-camera mode now. It does need to avoid assumptions such as “world width always equals browser width” or “player X is screen X.”

---

## 9. Physics and collision contract

Use Phaser Arcade Physics for the side-view world foundation.

- World gravity exists because the Jelly leaps now and the Card-wright will unlock jumping later.
- The Card-wright is affected by gravity and collides with the ground, but the player capability `canJump` is false.
- No input may assign upward velocity to the player in this slice.
- The player has a feet/body collider appropriate to the existing 36×71 hero presentation, not a full transparent-frame rectangle.
- The western combat boundary prevents knockback from pushing the player through or behind the castle.
- The eastern boundary prevents escape from the proof arena.
- The Jelly and player must not become permanently interpenetrated.
- Choose collision/separation behavior that still permits the intended run-under leap; a static invisible wall on the Jelly is incorrect while it is airborne.
- Projectiles collide with the Jelly target and proof-arena boundaries.
- Dropped cards collide with or settle onto the canonical ground and never remain airborne forever.

Do not add platforms, slopes, one-way ledges, ladders, or climb sensors yet.

---

## 10. Player movement contract

Baseline movement expresses an ordinary human, not an action hero.

- `A` / `Left Arrow`: move west/left.
- `D` / `Right Arrow`: move east/right.
- Opposing inputs cancel rather than selecting arbitrarily.
- Default facing is right/east on spawn.
- Last nonzero horizontal movement determines facing.
- Releasing movement returns to the matching left/right idle frame.
- Acceleration/deceleration may be modest rather than instantaneous if it does not make the truth slice sluggish.
- Use the current `WALK_SPEED = 190` world units/second as the initial parity value unless play evidence shows the new scale requires adjustment.
- Preserve `walkScale()` behavior while charging/attacking where compatible.
- `canJump` is false and visible in the DEV snapshot.
- `Space`, `W`, and `Up` do not jump.
- No dodge, roll, dash, scramble, shield, or invulnerability frames.

Reduced motion must preserve movement and facing while suppressing nonessential bob, particles, shake, or tween exaggeration. It must not disable telegraphs or hide attack state.

---

## 11. Card selection and firing contract

Reuse the existing four-slot hand and action state rather than creating a parallel card runtime.

Required reuse candidates:

- `card-engine/src/pages/castle/combat/hand.ts`
- `card-engine/src/pages/castle/combat/actionState.ts`
- `card-engine/src/pages/castle/combat/cardActions.ts`
- `card-engine/src/pages/castle/combat/blast.ts`
- `card-engine/src/pages/castle/combat/effectKit.ts`
- `card-engine/src/pages/castle/combat/blastVfx.ts`
- `card-engine/src/pages/castle/combat/feel.ts`
- `card-engine/src/pages/castle/v2/hitstop.ts`

Input behavior:

- Mouse wheel cycles selection through occupied slots and wraps at the ends.
- `1–4` directly select occupied slots.
- Wheel scrolling over the game canvas must not scroll the page.
- `F` press/hold/release drives the existing quick/heavy charge behavior.
- No mouse position is sampled for aim.
- No pointer movement can steal or alter facing.
- The committed aim is always `{ x: -1, y: 0 }` or `{ x: 1, y: 0 }` from facing.
- A fired shot keeps its committed direction even if the player turns afterward.
- The player may move while readying/charging according to the existing action-state rules.
- Use four deterministic fixture cards/elements on the DEV route when no real collection is supplied. Do not add persistence work.

Presentation behavior:

- Use the existing approved left/right card-blast sheets.
- Spawn the projectile from the existing measured left/right muzzle data.
- Use existing elemental stream/impact art when available and the visible fallback when not.
- Preserve charge scaling, damage, projectile speed, impact, knockback, hit severity, hit-stop, camera kick, and recovery.
- Do not use the up/down blast sheets in this scene.
- Do not generate new attack animation.

---

## 12. Ember Jelly contract

Use the existing Ember Jelly body and core combat behavior:

- `card-engine/src/data/castle/jellySprite.ts`
- `card-engine/public/assets/castle/construct/ember-jelly.png`
- `card-engine/src/pages/castle/combat/construct.ts`
- `card-engine/src/pages/castle/v2/constructPresenter.ts` as behavior/presentation reference, not as a mandatory side-view renderer

Preserve:

- idle, alert, approach, telegraph, attack, recovery, hit reaction, knockback reaction, defeat, and revive;
- hit points and damage handling;
- interrupting a telegraph with a hit;
- committed targeting;
- AI enable/disable;
- strong-hit toggle;
- reset/revive commands;
- idle/hop/gather/splat animation clips;
- a long, readable telegraph;
- a punishable recovery window.

Do not drag top-down depth, facing notch, Y-sort, or radial strike presentation into the new scene.

### 12.1 The side-view leap

The leap is the one intentional enemy behavior change in this slice.

Create a small pure `jellyLeap` rule/controller rather than hiding the trajectory inside Phaser tween callbacks. It must be time-driven and testable without booting Phaser.

Required behavior:

1. During approach, the Jelly remains grounded and advances horizontally.
2. On entering telegraph, it captures the player's X once.
3. The existing `gather` clip and visible tell play for the telegraph.
4. At launch, the Jelly commits to a start X, landing X, duration, and apex.
5. Once launched, later player movement does not change the landing X.
6. The horizontal position interpolates from start to committed landing.
7. Airborne height follows a deterministic arc, for example `4 * apex * t * (1 - t)` with `t` in `[0,1]`.
8. The apex is only slightly above the Card-wright: the Jelly's underside should clear the player's collision top by a small readable margin, not leave the screen.
9. The player can run beneath the Jelly during the high part of the arc.
10. Contact damage/knockback comes from real body overlap during the dangerous part of the leap, not an invisible full-screen ray.
11. A miss remains a miss; no damage is applied merely because the Jelly entered `attack`.
12. On landing, the Jelly is grounded at its committed landing X and enters recovery.
13. Heavy card impact may interrupt or knock the Jelly out of its action using the current hit rules.
14. The landing point is clamped within the combat bounds.
15. A leap may cross to the other side of the player. The Jelly must face/approach correctly afterward.

Initial tuning may begin near the existing 650 ms telegraph. Leap duration, apex, overshoot, and collision windows must live together in one exported tuning object and remain explicitly provisional.

### 12.2 Fairness invariant

The Card-wright cannot jump, roll, or block. Therefore the leap must be avoidable by ordinary horizontal movement.

Add a pure fairness test proving that, from the intended commitment range and baseline walk speed, there is a legal interval in which the player can cross beneath or clear the committed body path before contact.

Do not certify fairness from appearance alone.

---

## 13. Hit, knockdown, and card-scatter contract

Preserve the current meaning of hits:

- Ordinary/light contact hurts and knocks the Card-wright backward but does not scatter the hand.
- A clearly telegraphed strong hit causes knockdown and scatters every carried card.
- Knockback direction is away from the Jelly/contact direction.
- Knockback clamps against the western castle boundary rather than passing through it.
- Stand-up grace prevents immediate unavoidable chaining.

Side-view scatter differs from top-down radial scatter:

- Reuse hand state transitions from `hand.ts`.
- Do not reuse radial ground-placement assumptions unchanged from `scatter.ts`.
- Create a side-view placement adapter that selects separated landing X positions along valid ground.
- Cards may visually arc through the air, but every destination lies on `GROUND_Y`.
- Destinations remain inside combat bounds and outside blocking castle geometry.
- Cards cannot overlap each other beyond the accepted minimum separation.
- Cards cannot land inside the Jelly's occupied ground footprint; choose a safe nearby fallback.
- Proximity recovery remains automatic. Do not use `E`.
- Recovering one card restores a usable attack as soon as the hand rules allow it.

The existing knockdown sheet is front-facing and therefore temporary in this side-view proof. Reuse it only as an explicitly provisional placeholder, or use a clearly provisional non-destructive presentation built from existing frames. Do not generate or pretend to approve final side-profile knockdown art.

---

## 14. Art and composition contract for the proof

Claude is implementing, not art-directing.

Use existing assets and simple code layers:

### Required existing assets

- Walking hero: `card-engine/public/assets/castle/hero/chibi.png`
  - 36×71 frames, four rows, seven columns
  - use only the left/right idle and walk rows
- Left attack: `card-engine/public/assets/castle/hero/card-blast/card-blast-sheet.png`
- Right attack: `card-engine/public/assets/castle/hero/card-blast/card-blast-right-sheet.png`
- Knockdown placeholder: `card-engine/public/assets/castle/hero/knockdown/knockdown-sheet.png`
- Ember Jelly: `card-engine/public/assets/castle/construct/ember-jelly.png`
- Castle façade anchor: `card-engine/public/assets/kits/halo-stone-castle/structures/gate/castle-gate-house-v3.png`
- Existing elemental effect assets through the current asset packs/effect kit

### Composition

- Castle façade sits behind the playable character on the left, approximately half-visible/half-dominant rather than centered as the whole level.
- The gate should feel like the western home landmark.
- Player and Jelly must silhouette clearly against the ground/background.
- The right half needs open combat space.
- Use a warm dusk gradient, restrained distant silhouettes, and simple ground/foreground treatment if no suitable existing plate fits.
- Do not bake the player, Jelly, cards, hit effects, UI, or colliders into a background image.
- Do not make the background visually louder than the combat.
- Keep effect colors readable against the provisional environment.

Suggested initial placement at 1280×720:

- Gate façade bottom-center near `(230, GROUND_Y)` at an approximately 2× display scale
- Card-wright feet near `(470, GROUND_Y)`
- Jelly ground contact near `(1030, GROUND_Y)`
- Western player clamp near `x=120`
- Eastern clamp near `x=1220`

These are starting values for a playable composition, not subjective approval. Expose them in `layout.ts` so Raheem and Codex can tune them after seeing a screenshot.

### Hard prohibitions

- No paid generation
- No silent replacement of approved assets
- No attempt to declare temporary composition final
- No global `pixelArt: true` if it damages smooth or gradient background layers; apply nearest filtering per pixel texture as the current castle pipeline does

---

## 15. UI and visible test controls

Reuse the current hand/readout concepts where practical. The first screen must make its state understandable without opening developer tools.

Show:

- four card slots;
- selected slot;
- ready/committed/dropped state;
- current action phase or concise charge indication;
- Jelly HP/state;
- concise controls;
- a visible indication when AI and strong hits are enabled.

Required human test controls should preserve current semantics where possible:

- `F`: fire/charge/release
- Mouse wheel / `1–4`: select card
- `R`: reset/revive Jelly
- `T`: toggle Jelly AI
- `Y`: toggle strong hits
- `K`: force player knockdown as a development shortcut

`E` may be listed as reserved for future castle entry, but it must not imply an interior exists.

Automation must call semantic commands through the DEV bridge, not synthesize these keyboard shortcuts.

---

## 16. Development observation bridge

Install a DEV-only adapter following `.claude/studio/PHASER_RUNTIME_BRIDGE_SPEC.md`. Do not expose the Phaser instance or arbitrary private fields.

Snapshot fields required for this scene:

- bridge version;
- route and active Scene key;
- logical viewport and actual canvas size;
- camera mode, bounds, scroll, and zoom;
- ground Y and combat bounds;
- player feet position, body bounds, velocity, grounded state, facing, animation key, action phase, and `canJump: false`;
- selected hand slot and all slot states;
- projectile count, directions, positions, and outcomes;
- dropped-card landed positions and recovery states;
- Jelly phase, HP, ground position, airborne height, committed landing X, AI flag, strong-hit flag, animation key, and last strike result;
- hit-stop/reduced-motion state;
- bounded scenario assertions and runtime errors.

Commands required:

- reset the entire scene to a deterministic state;
- place player at a bounded X;
- select a slot;
- trigger a tap shot;
- trigger a held/heavy shot;
- enable/disable Jelly AI;
- enable/disable strong hits;
- force Jelly phase/telegraph;
- force player knockdown;
- defeat and revive Jelly;
- run each named scenario.

The bridge and any URL/output transport must be excluded from production bundles.

---

## 17. Named scenarios and objective evidence

### 17.1 `castle-front-v4-combat-loop`

**Start state**

- fixed camera;
- player at spawn, facing right;
- four ready fixture cards;
- Jelly at home, AI enabled;
- strong hits enabled for the scenario;
- no projectiles or dropped cards;
- reduced motion off.

**Actions**

1. Select a known elemental card.
2. Trigger one tap shot and verify horizontal rightward travel.
3. Trigger one held/heavy shot.
4. Confirm hit, HP loss, hit reaction/knockback, and effect outcome.
5. Force or wait for the telegraphed leap.
6. Move player through the safe run-under interval.
7. Confirm the committed leap misses and lands beyond/on the other side as configured.
8. Enable/force a strong hit and allow it to land.
9. Confirm knockdown and four-card scatter.
10. Stand and recover at least one card by proximity.
11. Fire again.
12. Defeat the Jelly.
13. Reset/revive it.

**Assertions**

- Scene remains active and console has no new error.
- No duplicate canvas or input listener.
- Player Y remains grounded throughout normal movement; no input-created jump occurs.
- Shots have `dir.y === 0` and the correct facing sign.
- Heavy shot has greater presentation/damage consequences according to existing rules.
- Jelly trajectory does not change after commitment.
- Run-under produces no hit.
- Strong contact transitions player to knockdown.
- Every in-hand card becomes dropped exactly once.
- Every dropped destination is valid ground and inside bounds.
- Proximity recovery requires no `E`.
- Player can fire after recovery.
- Jelly reaches defeated and can return to idle through reset/revive.

**Visual evidence**

- Screenshot of initial castle/front composition
- Short video covering horizontal blast, Jelly leap/run-under, and knockdown/scatter/recovery
- Final runtime snapshot and clean console capture
- Verdict must remain HUMAN REVIEW for composition and feel even when objective assertions pass

### 17.2 `castle-front-v4-jelly-leap-evade`

Reset directly to the telegraph setup and prove both branches:

- standing in the committed path results in one hit and backward knockback;
- crossing beneath during the safe interval results in no hit;
- changing direction after launch does not cause the Jelly to home;
- landing stays within bounds.

### 17.3 `castle-front-v4-scatter-recover`

Reset with four ready cards, force strong knockdown near the castle and near the eastern bound, and prove:

- four unique dropped slots;
- valid separated destinations;
- no card behind the western wall or outside the world;
- proximity recovery;
- no duplicate card identities;
- firing resumes after recovery.

---

## 18. Deterministic tests

Add narrowly scoped tests before or alongside implementation. Suggested file boundaries:

- `front-v4/playerController.test.ts`
  - left/right intent;
  - opposing inputs cancel;
  - facing persistence;
  - `canJump` false;
  - jump inputs cannot create vertical velocity.
- `front-v4/jellyLeap.test.ts`
  - start/end positions;
  - deterministic apex;
  - small positive clearance over player collision top;
  - committed landing does not track later player movement;
  - collision/miss branches;
  - bounds clamp;
  - baseline-speed run-under fairness invariant.
- `front-v4/sideViewScatter.test.ts`
  - every landing on ground;
  - bounds;
  - separation;
  - blocker/Jelly avoidance;
  - safe fallback near western/eastern edges.
- Route/lifecycle test where existing conventions support it
  - lazy DEV route present when enabled;
  - absent from game build when disabled;
  - cleanup does not leave duplicate bridge/canvas.

Continue running the existing combat tests for modules reused unchanged:

```powershell
npm.cmd test -- --run `
  src/pages/castle/combat/actionState.test.ts `
  src/pages/castle/combat/hand.test.ts `
  src/pages/castle/combat/blast.test.ts `
  src/pages/castle/combat/cardActions.test.ts `
  src/pages/castle/combat/construct.test.ts `
  src/pages/castle/combat/feel.test.ts `
  src/pages/castle/combat/effectKit.test.ts `
  src/pages/castle/v2/hitstop.test.ts
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown.

---

## 19. Implementation sequence

Claude should execute in this order and keep the app runnable after each milestone.

### Phase 0 — Preflight and ruling

1. Read `PRODUCTION.md`, `CLAUDE.md`, this handoff, `PHASER_RUNTIME_BRIDGE_SPEC.md`, and the relevant live runtime files.
2. Confirm the worktree/branch and preserve unrelated changes.
3. Run the current targeted combat tests and record baseline results.
4. Use the project `consult-specialist` workflow with `phaser-runtime-director`.
5. Return the specialist ruling and note any exact conflict with this plan. Do not reopen settled product decisions.

### Phase 1 — Pure evidence first

1. Add the named scenario descriptors/assertion shapes.
2. Implement and test pure horizontal movement intent/capability rules.
3. Implement and test the pure Jelly leap arc/fairness rules.
4. Implement and test side-view scatter destination selection.

### Phase 2 — Route and lifecycle shell

1. Add the lazy DEV route.
2. Add the React host and dynamic Phaser constructor.
3. Prove one canvas, clean teardown, and route re-entry.
4. Add a simple status overlay for loading/error/ready.

### Phase 3 — Exterior scene and camera

1. Create `CastleFrontV4` with fixed 1280×720 logical framing.
2. Add ground, bounds, warm provisional background, and castle façade.
3. Apply per-texture nearest filtering to pixel sprites.
4. Add the fixed camera and resize/FIT contract.
5. Spawn the hero and Jelly at layout anchors.

### Phase 4 — Player controller

1. Add grounded Arcade body and horizontal movement.
2. Add left/right idle/walk animation registration.
3. Add facing persistence.
4. Explicitly ignore/disable jump inputs.
5. Add boundary and knockback clamping.

### Phase 5 — Hand and blast integration

1. Reuse the hand/action modules.
2. Add wheel and number-key selection.
3. Bind `F` charge/release.
4. Use only horizontal committed aim.
5. Register left/right attack sheets and existing effect assets.
6. Spawn, step, render, collide, and resolve projectiles.
7. Preserve charge, quick/heavy, impact, hit-stop, and camera response.

### Phase 6 — Jelly integration

1. Reuse HP/phases/commands and animation clips.
2. Build a side-view presenter rather than importing Y-sort behavior.
3. Connect approach and facing horizontally.
4. Connect telegraph to the committed leap controller.
5. Resolve real overlap hit/miss and knockback.
6. Connect hit reaction, interrupt, defeat, recovery, and revive.

### Phase 7 — Knockdown and recovery

1. Connect light versus strong enemy contact.
2. Connect action-state knockdown and stand-up grace.
3. Connect all-card scatter through side-view destinations.
4. Render pickup arcs and grounded cards.
5. Connect automatic proximity recovery and restored firing.

### Phase 8 — Bridge, visible controls, and evidence

1. Install DEV-only bridge adapter.
2. Implement semantic commands and all named scenarios.
3. Add bounded player-facing test instructions/readouts.
4. Run static checks.
5. Run scenarios and visual playtest.
6. Capture screenshots/video/runtime snapshots/console evidence.
7. Return PASS/FAIL for objective behavior and HUMAN REVIEW for visual/feel questions.

### Phase 9 — Documentation without promotion

1. Add the new route/scenarios to `HARNESS_INDEX.md` if implementation lands.
2. Update `PRODUCTION.md` through the existing production-log workflow to say the side-view proof exists and remains non-production.
3. Do not change the canonical production scene.
4. Do not call the perspective migration complete.

---

## 20. Verification commands

From `card-engine/`, run at minimum:

```powershell
npm.cmd test -- --run <new-front-v4-tests-and-reused-combat-tests>
npm.cmd run assets:pack:check
npm.cmd run lint
npm.cmd run build
npm.cmd run build:game
```

Also run the repository verifier when available:

```powershell
bash ../.claude/verify/card-engine.sh
```

If an existing lint/build failure is encountered, distinguish baseline failure from regression with exact evidence. Do not “fix” unrelated code as part of this handoff.

Production exclusion must be checked explicitly:

- `/dev/castle-front-v4` is not routed in the game build;
- the CastleFrontV4 bridge and URL transport are absent from production bundles;
- `/castle` still loads CourtyardV3;
- the existing CourtyardV3 targeted tests still pass.

---

## 21. Acceptance checklist

### Scene and lifecycle

- [ ] `/dev/castle-front-v4` loads one Phaser canvas.
- [ ] Scene key reports `CastleFrontV4`.
- [ ] Route exit/re-entry produces no duplicate canvas or handlers.
- [ ] Scene is excluded from the production game bundle.
- [ ] `/castle` remains CourtyardV3.

### Perspective and environment

- [ ] Scene reads unmistakably as a side-on exterior.
- [ ] Front-facing castle gate façade anchors the left/west.
- [ ] Warm dusk palette is present provisionally.
- [ ] Ground contact is clear.
- [ ] Camera is fixed and bounded.
- [ ] Layout constants are centralized for later visual tuning.

### Player

- [ ] Walks left/right and faces correctly.
- [ ] Uses left/right idle and walk animation.
- [ ] Cannot jump through any normal input.
- [ ] Has no roll/dodge/dash/shield.
- [ ] Cannot leave bounds or be knocked through the castle.

### Cards and blasts

- [ ] Wheel cycles four slots and wraps.
- [ ] `1–4` select slots.
- [ ] `F` performs quick/heavy charge and release.
- [ ] Shot direction matches committed left/right facing.
- [ ] Existing left/right firing animation plays.
- [ ] Existing element stream/impact or explicit fallback renders.
- [ ] Hit reaction, knockback, hit-stop, camera response, and recovery occur.

### Ember Jelly

- [ ] Existing Jelly art and clips render at correct ground anchor.
- [ ] AI approaches horizontally.
- [ ] Telegraph is readable and interruptible.
- [ ] Leap uses a committed, non-homing arc.
- [ ] Apex clears the Card-wright by a small readable margin.
- [ ] Player can run underneath during the safe interval.
- [ ] Staying in the collision path causes one hit and backward knockback.
- [ ] Misses remain misses.
- [ ] Jelly can be hit, knocked back, defeated, reset, and revived.

### Knockdown/scatter/recovery

- [ ] Light hit does not scatter cards.
- [ ] Strong hit knocks down and scatters all carried cards once.
- [ ] Every card lands on valid ground within bounds.
- [ ] Cards remain unique and sufficiently separated.
- [ ] Pickup is automatic by proximity.
- [ ] Firing becomes possible again after recovery.
- [ ] Stand-up grace prevents unavoidable immediate chaining.

### Evidence

- [ ] New pure tests pass.
- [ ] Reused combat tests pass.
- [ ] Asset-pack check passes.
- [ ] Lint/build/game-build checks pass or baseline failures are isolated.
- [ ] All three named scenarios return objective results.
- [ ] Console is clean during the complete loop.
- [ ] Initial composition screenshot is captured.
- [ ] Short combat-loop video is captured.
- [ ] Visual verdict is returned as HUMAN REVIEW for Raheem/Codex.

---

## 22. Known art debt that must not block the proof

Record these honestly in the final report:

1. The existing castle façade was created for the current kit and may not be the final side-view castle.
2. The current walking hero is provisional for this perspective.
3. The current knockdown is front-facing and needs future side-profile art.
4. The current summon slam is front-facing and is not a required first-slice performance.
5. A natural ledge-climb animation does not yet exist.
6. The Card-wright's future unlocked jump does not yet exist.
7. Final parallax backgrounds, environmental animation, cinematic lighting, and ultimate-scale card abilities come after this proof.

These are future visual-production tasks for Raheem and Codex to direct after seeing the running scene. Do not solve them speculatively.

---

## 23. Risks and rollback

### Risk: modifying the 154k CourtyardV3 runtime to fit side-view physics

**Detection:** large changes to `courtyardRuntime.ts`, new side-view branches mixed through top-down code, CourtyardV3 regressions.
**Prevention:** separate `front-v4` runtime; reuse pure modules only.
**Rollback boundary:** delete the DEV route and `front-v4` directory; CourtyardV3 remains untouched.

### Risk: code that appears horizontal but still uses top-down assumptions

**Detection:** Y aim, mouse-driven facing, Y-sort, radial scatter, feet wandering off ground, strike capsules hitting through a leap.
**Prevention:** explicit coordinate contract and pure side-view adapters.

### Risk: Jelly leap is visually convincing but mechanically unfair

**Detection:** committed trajectory changes, hidden ray hit, no legal run-under interval at baseline speed.
**Prevention:** deterministic trajectory, overlap-based hit, fairness unit test, named scenario.

### Risk: temporary art becomes accidental canon

**Detection:** plan/docs call the composition final or spend generation credits before human review.
**Prevention:** HUMAN REVIEW verdict and explicit art-debt section.

### Risk: prototype silently replaces production

**Detection:** `/castle` changes, `PRODUCTION_SCENE` changes, production bundle includes DEV bridge.
**Prevention:** gated route, production exclusion checks, no deploy authorization.

---

## 24. Required final report from Claude

Claude must return:

1. **Outcome:** what is playable now.
2. **Files changed:** grouped by scene/runtime/tests/docs.
3. **Reuse statement:** which existing modules/assets were reused unchanged, adapted, or deliberately not reused.
4. **Controls:** exact player and test controls.
5. **Named-scenario results:** actions, runtime assertions, console evidence, screenshot/video paths, and verdict.
6. **Static verification:** exact commands and results.
7. **Production safety:** proof that `/castle` and production bundle remain unchanged.
8. **Human-review questions:** only observable visual/feel questions for Raheem and Codex.
9. **Known temporary art:** explicit list.
10. **No unrequested actions:** confirm no paid generation, push, deployment, or destructive cleanup occurred.

The most useful final sentence is not “done.” It is:

> “CastleFrontV4 is objectively playable and verified; composition, character scale, leap feel, and animation quality are ready for Raheem and Codex’s visual review.”
