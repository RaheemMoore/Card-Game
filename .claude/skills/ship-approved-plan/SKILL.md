---
name: ship-approved-plan
description: Post-approval handoff for an approved feature or fix. Creates a branch, decomposes work into tasks, implements, commits with clean messages, runs verification, and drafts the PR body. Use ONLY after a plan or design-feature proposal has been explicitly approved by Raheem. Does NOT replace plan mode — plan mode owns the design; this owns the delivery.
---

# Skill: ship-approved-plan

## Inputs

- **Approved plan or design proposal** (from plan mode, `design-feature`, or a direct Raheem approval)
- **Optional branch name** (default: derive from the proposal title, kebab-case)

## Workflow

### 1. Confirm approval is real
Do not proceed if approval is ambiguous. If the last Raheem message is "sure, sounds good" but the proposal has open questions, ask for the specific decisions before touching code.

### 2. Create the branch
```bash
git checkout -b <derived-name>
```
Only if not already on a feature branch. If on `main` and about to make changes, always branch first.

### 3. Decompose into tasks
Use `TaskCreate` to break the plan into concrete implementation steps. Mark the first `in_progress` before starting. Update as I go — never batch.

### 4. Implement
Standard rules apply. In particular:
- Small, meaningful commits at natural stopping points — never one giant end-of-work commit.
- Commit messages describe the *why*, per repo convention.
- No hooks skipped, no signing bypassed.
- Do not touch files outside the approved plan's scope. If I find something worth fixing, flag it with `spawn_task` for later.

### 5. Verify before declaring done
Invoke the built-in `verify` skill — it bootstraps `.claude/verify/card-engine.sh` which runs typecheck, tests, and a boot check. Never claim done based on typecheck alone.

For UI changes, exercise the feature in the browser preview (`preview_start` with `card-engine-dev`) and share proof.

### 6. Draft the PR body
When work is complete and verified, draft (do not push without asking):

```
## Summary
- <2–3 bullet points, why matters>

## Changes
- <files touched, one line each>

## Verification
- <what was tested, what was observed>

## Governance
- <if economy touched: what old value → new value, why, Raheem-approval reference>
- <otherwise: "N/A">
```

Ask Raheem before pushing to remote or opening the PR.

## Specialists consulted

Usually none — design is done, execution is the Studio Lead's job. Consult `technical-architect` mid-execution *only* if I discover the plan is broken (e.g. a data-model conflict the design missed) and I need a course correction.

## Human approval gates

- Before creating the branch (if unclear whether approval is real).
- Before pushing to remote or opening a PR.
- If the plan turns out to require changes to approved economy values — full stop, escalate.

## Validation

- [ ] All tasks in TaskList are completed.
- [ ] `.claude/verify/card-engine.sh` passes.
- [ ] For UI changes: browser proof shared.
- [ ] Commits are atomic and messages explain the why.
- [ ] Nothing outside the plan's scope was changed.

## Expected outputs

- A feature branch with clean commits.
- A verified working feature.
- A drafted PR body ready for Raheem's sign-off.

## When NOT to use

- The proposal wasn't approved.
- Raheem just asked a question — don't ship anything.
- Plan mode is still active — finish that first.
