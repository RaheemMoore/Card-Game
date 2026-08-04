---
name: ship-approved-plan
description: Deliver an explicitly approved Card Engine feature or fix. Enforces scope, branch/worktree safety, small implementation steps, objective and runtime evidence, human gates, documentation sync, and a draft PR. Use after an approved design/plan. Do NOT use for open design, unapproved work, paid generation owned by another production skill, or a Phaser architecture change better handled by build-phaser-feature.
---

# Ship Approved Plan

Read `.claude/studio/SHIPPING_CONTRACT.md`, `EVIDENCE_VERDICT_CONTRACT.md`, and the capability registry. Those contracts are authoritative for shared delivery behavior; this skill adds Card Engine-specific execution.

## Inputs

- approved plan and approval evidence;
- work mode and acceptance criteria;
- bounded file/surface scope;
- branch/worktree context.

## Workflow

1. Confirm no unresolved approval question remains.
2. Inspect working tree; never discard or overwrite unrelated work. Branch only when appropriate for the current worktree.
3. Decompose the approved plan into small ordered tasks.
4. Implement only in scope. Raise discovered work separately.
5. Run the cheapest relevant checks first, then `.claude/verify/card-engine.sh` when dependencies are installed.
6. For runtime/UI changes, use the named scenario and `visual-playtest`; a compile-only result is not complete.
7. Return `PASS`, `FAIL`, or `HUMAN REVIEW` with evidence. Never call subjective visual quality PASS on your own.
8. Run `sync-project-knowledge` and `production-log` when the change lands.
9. Complete the harvest review: propose at most one proven reusable improvement; do not install it automatically.
10. Draft the PR body. Ask before `git push`, opening a PR, deploying, merging, or changing economy values.

## Required PR body

```md
## Summary
- <why this matters>

## Scope
- <implemented>
- <explicitly not implemented>

## Changes
- `<path>` — <reason>

## Evidence
- Deterministic: ...
- Runtime: ...
- Visual/mobile/reduced motion: ...
- Verdict: PASS | FAIL | HUMAN REVIEW

## Governance
- <approvals, paid operations, economy, migrations, or N/A>

## Harvest
- <none, or one proposed reusable improvement>
```

## Done when

Scope is preserved, checks and runtime evidence match the approved acceptance criteria, unresolved subjective judgment is labeled HUMAN REVIEW, docs are synchronized, and no remote/deploy action occurred without authorization.
