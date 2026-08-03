---
name: build-phaser-feature
description: Implement an approved Phaser 3 runtime feature in Card Engine using the existing React/Phaser lifecycle, a named deterministic scenario, development-only observation state, objective checks, and visual-playtest evidence. Use for scene, camera, collision, animation, input, depth, runtime-component, or Phaser Editor pilot work. Do NOT use for Figma tracing, art generation, React-only UI, or unapproved runtime architecture.
---

# Build Phaser Feature

Read the approved plan, `PHASER_RUNTIME_BRIDGE_SPEC.md`, `SHIPPING_CONTRACT.md`, and the relevant Scene/createGame/usePhaserGame code.

## Preconditions

- STANDARD/FULL architecture is approved.
- Acceptance criteria and a named scenario are defined.
- Existing worktree changes are understood and preserved.
- `phaser-runtime-director` has ruled when lifecycle, camera, physics architecture, bridge shape, or Editor adoption changes.

## Workflow

1. **Map ownership.** Name the game instance, Scene, React viewport, data manifests, coordinate spaces, camera policy, and reduced-motion path.
2. **Define evidence first.** Add or update a bounded scenario before broad implementation. State start state, actions, runtime assertions, visible proof, and timeout.
3. **Reuse before adding.** Search current Scene helpers/components. Create a reusable runtime component only when two real consumers justify it.
4. **Implement safely.** Preserve dynamic Phaser import and StrictMode cleanup. Do not expose production internals or secrets through the development bridge.
5. **Expose observation, not private poking.** Register the Scene through the versioned dev-only bridge adapter; do not make tests reach arbitrary private fields.
6. **Verify statically.** Run relevant tests/lint/type/build using `.claude/verify/card-engine.sh` when dependencies exist.
7. **Verify in play.** Invoke `visual-playtest` for the named scenario. Capture runtime snapshots, console state, screenshot/video, and mobile/reduced-motion evidence where relevant.
8. **Return a verdict.** PASS, FAIL, or HUMAN REVIEW. Static checks cannot substitute for runtime evidence.
9. **Sync and harvest.** Update harness index/runtime docs after the feature lands. Propose—not automatically create—one reusable component/fixture/skill lesson if supported.

## Approval gates

Ask before adopting Phaser Editor as a canonical authoring source, adding a dependency, changing scene boundaries, creating a new global bridge surface, pushing, deploying, or accepting subjective visual quality.

## Outputs

- bounded source patch;
- named scenario and runtime adapter/update;
- evidence bundle with verdict;
- documentation/harvest note;
- draft PR body through `ship-approved-plan`/shipping contract.
