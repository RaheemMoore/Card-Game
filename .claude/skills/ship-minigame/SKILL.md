---
name: ship-minigame
description: Post-approval delivery for a mini-game. Creates a branch, enforces the ~8 mandatory registrations that will otherwise be forgotten one at a time (route, /dev seed page, manifests, wallet hook, reward hook, ability hook, FullscreenGameShell wire-up, mobile audit), verifies with `npm run build`, and drafts the PR body. Use ONLY after `design-minigame` has produced an approved proposal and Raheem has said "add it." Does NOT replace plan mode — design owns the design; this owns the delivery.
---

# Skill: ship-minigame

## Inputs

- **Approved mini-game design** from `design-minigame` or a direct Raheem approval. Must include: game name, genre, rules, motion tier, ability integration per slot, reward math with rank-sum-cap analysis, entry cost (if any), file list.
- **Optional branch name** (default: `feat/minigame-<slug>`).

## Preconditions

1. `<FullscreenGameShell>` primitive exists at `card-engine/src/pages/games/FullscreenGameShell.tsx` (or under whatever path was landed by `extract-fullscreen-shell`). If it doesn't, HALT and hand off to `extract-fullscreen-shell` first — do NOT rebuild the shell inline per [[feedback_fullscreen_layout]].
2. Approval is unambiguous. If Raheem said "let's design a Barbarian training game" but never approved the specific reward math or motion tier, hand back to `design-minigame`.
3. Working tree is clean; on `main`, current with `origin/main`.

## Workflow

### 1. Preflight

```bash
git status                    # working tree must be clean
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b <branch>
```

### 2. Decompose into tasks

Use `TaskCreate` to break the plan into concrete steps mirroring §3 below. Mark the first `in_progress` before starting. Update as you go — never batch.

### 3. Mandatory registrations (the checklist)

Every mini-game needs ALL of these. Missing one is a silent bug — the game will "work" locally but leak in prod. Do them in dependency order:

1. **Types** — declare game state, event kinds, and reducer step types in `card-engine/src/types/games/<slug>.ts`. Follow the shape of `types/combat.ts`.
2. **Reducer** — `card-engine/src/services/games/<slug>/reducer.ts`. Pure, deterministic, snapshot-immutable (spec pattern from `services/combat/reducer.ts`). Include `initializeRun`, `advance`, and `submitPlayerAction` (or genre-appropriate action verbs).
3. **Harness** — `card-engine/src/services/games/<slug>/harness.ts` with `RandomStream` and `buildRunSnapshot`. Copy from `services/combat/harness.ts`.
4. **Presentation adapter** — `card-engine/src/services/games/<slug>/presentation/adapter.ts`. Map reducer events → animation beats per approved motion tier. If motion tier is "none," beats are all `narration` at REDUCED_MOTION_MS.
5. **useGame hook** — `card-engine/src/services/games/<slug>/useRun.ts`. Wraps reducer, exposes state + events + submit. Reuses `runToNextPause` bounded-loop pattern from `useBattle.ts`.
6. **Manifests** — `card-engine/src/data/games/<slug>/*.ts` with typed art rows (schema like `data/combat/types.ts`). Even code-first games need a manifest for the arena/backdrop asset if any.
7. **Fullscreen page** — `card-engine/src/pages/games/<slug>/index.tsx` and any sub-components. Wraps content in `<FullscreenGameShell>` (never rebuild the portal / grid / min-h-0 dance).
8. **Route** — add to `App.tsx` under `/games/<slug>` (or the routing convention that lands).
9. **/dev seed page** — `card-engine/src/pages/DevSeed<GameName>.tsx` routed at `/dev/seed-<slug>`. Uses `ensureReference` idempotency pattern from `DevSeedBattle.tsx`. NEVER omit this — QA can't test paid Forge cards.
10. **Wallet entry cost (if approved)** — add `GameplayPriceEntry` to `data/economy/gameplayPriceCatalog.ts` with `actionId: '<slug>_run_entry'`, Raheem-approved cost, approvedAt date, version 1. Reserve on Start, commit on init success, refund on init failure, forfeit on defeat/abandon. Guard commit/refund with `lastResolvedTxnId`.
11. **Reward hook** — `card-engine/src/services/games/<slug>/rewardService.ts` following `battleRewardService.ts` shape. Idempotent via ledger scan on `runId`. Threads `entryTxnId` into reward metadata.
12. **Ability integration** — the specific hook per Core / Signature / Ultimate that the design specified. Resolve abilities off `HeroCombatant.abilityLoadout[i].snapshot`, never the live registry (ESLint-guarded per ability spec §12).
13. **Tests** — at minimum: reducer determinism test at seed 1, ability-hook path test per slot with meaningful effect, reward idempotency test.

Any step that's genuinely N/A for this genre must be explicitly noted in the process log with a reason — silent omission = future silent bug.

### 4. Implement

Standard rules apply:
- Small, meaningful commits at natural stopping points.
- Commit messages describe the *why*.
- No hooks skipped, no signing bypassed.
- Do not touch files outside the approved plan's scope; flag with `spawn_task`.

### 5. Verify — mandatory sequence

Per [[feedback_verify_command]]:

```bash
cd card-engine
npm run build           # tsc -b && vite build — MUST pass, this is what Vercel runs
npx vitest run          # all tests + baseline the 3 pre-existing failures
```

Then live smoke via `preview_start card-engine-dev`:
- `/dev/seed-<slug>` renders without console errors
- Enter Battle → game loop plays a full round → win state reached
- Ability slot triggers observed for each of Core / Signature / Ultimate
- Wallet reserve/commit fires (if entry cost); ledger row created
- Reward grant fires exactly once on victory (idempotent under refresh)

Mobile audit at 375×812 — layout doesn't crop, controls remain tappable.

Never claim "verified" on `tsc --noEmit` alone. That was the 2026-07-20 Vercel-break failure mode; [[feedback_verify_command]] captures the lesson.

### 6. Reuse Review (mandatory)

Before drafting the PR body, answer honestly (see `ship-approved-plan` §6 for the 5 questions):
- Did implementation reveal a repeatable pattern that mini-game #N+1 should inherit?
- If yes, propose the skill/agent update — do NOT create it. Wait for Raheem's approval per charter.

### 7. Draft PR body

```
## Summary
- <2–3 bullets: what game, what motion tier, ability hooks in one line>

## Changes
- <files touched, grouped by mandatory-registration number from §3>

## Verification
- npm run build ✓
- vitest ✓ (N passing, 3 pre-existing failures unchanged)
- Live: <what was observed on /dev/seed-<slug>>
- Mobile: <what was observed at 375×812>

## Governance
- <if new economy entry: catalog line + Raheem-approval date>
- <otherwise "N/A">

## Follow-ups discovered
- <bullet list>
```

Ask Raheem before pushing to remote or opening the PR.

## Specialists consulted

Usually none during execution — `design-minigame` already consulted `minigame-designer` upstream. Consult mid-execution ONLY when:
- The plan reveals a data-model conflict → `technical-architect`.
- A visual asset fails Raheem's review → `art-prompt-director`.
- Difficulty tuning surprises the harness → `minigame-designer`.

## Human approval gates

- Before creating the branch, if approval is ambiguous.
- Before wallet reserve numbers are entered (must be Raheem-approved).
- Before any Leonardo generation (per-batch approval).
- Before pushing to remote or opening a PR.
- If the plan turns out to require economy changes beyond what was pre-approved — full stop, escalate.

## Failure modes to prevent

Documented from real incidents:

1. **`tsc --noEmit` clean but `tsc -b` broken.** [[feedback_verify_command]] — always run `npm run build`.
2. **CSS Grid row inflated to 3× viewport.** [[feedback_fullscreen_layout]] — always use `<FullscreenGameShell>`, never hand-roll the portal.
3. **End-turn / commit-input semantic mismatch.** Users misread the button. Always ask `ui-ux-director` about button labels for turn/round semantics before shipping.
4. **Missing dev seed route.** QA can't test without paid Forge — always land `/dev/seed-<slug>` in the same PR.
5. **Ability hook that resolves off live registry instead of snapshot.** Non-deterministic — ESLint-guarded per ability spec §12; do not disable.
6. **Reward grant not idempotent.** Refresh mid-victory grants reward twice. Always scan the ledger by `runId` before crediting.
7. **Motion tier drift.** Raheem asked for hit-shake-only; someone added an idle bob. [[feedback_motion_budget]] — never exceed the approved tier.

## Validation

- [ ] All 13 mandatory registrations in §3 done OR explicitly N/A-with-reason in the process log.
- [ ] `<FullscreenGameShell>` used (never rebuilt inline).
- [ ] `npm run build` passes.
- [ ] `npx vitest run` — new tests pass; pre-existing failure count unchanged.
- [ ] Live smoke exercised the full loop + all ability slots + wallet lifecycle.
- [ ] Mobile audit done.
- [ ] Reuse Review answered.
- [ ] PR body drafted but not pushed without authorization.

## Expected outputs

- A `feat/minigame-<slug>` branch with atomic commits.
- A verified, working, playable mini-game reachable at `/games/<slug>` and `/dev/seed-<slug>`.
- A drafted PR body ready for Raheem's sign-off.

## When NOT to use this skill

- The mini-game design has not been approved.
- Raheem is asking a design question (that's `design-minigame`).
- The change is a bug fix on an existing mini-game — direct edit, no skill needed.
- `<FullscreenGameShell>` doesn't exist yet — invoke `extract-fullscreen-shell` first.
