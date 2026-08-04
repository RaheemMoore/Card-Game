---
name: visual-playtest
description: Verify a Card Engine Phaser or game-surface change through a named scenario, structured runtime snapshots, console evidence, screenshots/video, and bounded acceptance criteria. Returns PASS, FAIL, or HUMAN REVIEW. Use after runtime/UI implementation or when static analysis cannot prove direction, movement, camera, layering, collision, motion, or responsive behavior. Do NOT use as an art director or to replace unit/build tests.
---

# Visual Playtest

Read `.claude/studio/EVIDENCE_VERDICT_CONTRACT.md` and `PHASER_RUNTIME_BRIDGE_SPEC.md`.

## Inputs

- named scenario;
- route/viewport and deterministic start state;
- bounded actions;
- objective runtime assertions;
- visible acceptance criteria;
- mobile/reduced-motion variants when required.

## Preflight

1. Development server starts without a new build error.
2. The requested scenario exists in `window.__CARD_ENGINE_STUDIO__` (or the approved current bridge name).
3. Bridge version is supported and reports a ready Scene adapter.
4. Console capture and screenshot/video capability are available.

If any preflight item is missing, return **FAIL — verification infrastructure unavailable** with the exact missing item. Never improvise a PASS from screenshots alone.

## Workflow

1. Reset to the scenario's known state.
2. Capture `before` runtime snapshot and console baseline.
3. Run bounded scenario actions—prefer deterministic bridge commands; use input automation only when input itself is under test.
4. Capture intermediate/final runtime snapshots.
5. Capture screenshot or short video at the key visual moment.
6. Check console errors, route stability, Scene identity, player/camera/object state, animation/direction, collision/depth, and scenario-specific assertions.
7. Repeat required mobile/reduced-motion variant.
8. Return:
   - **PASS** only when all objective criteria pass and no human gate remains;
   - **FAIL** with exact failing state/evidence;
   - **HUMAN REVIEW** when objective behavior passes but art direction, feel, composition, or preference remains subjective.

## Evidence package

```md
# Visual Playtest — <scenario>
- Route / viewport / motion mode:
- Build or commit:
- Bridge version:
- Actions:
- Runtime assertions:
- Console:
- Screenshot/video paths:
- Verdict: PASS | FAIL | HUMAN REVIEW
- Human question, if any:
```

Do not mutate gameplay to make a test pass, approve subjective visuals, or treat a throttled/aliased animation sample as proof that motion is frozen.
