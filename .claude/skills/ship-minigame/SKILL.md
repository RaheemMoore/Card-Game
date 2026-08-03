---
name: ship-minigame
description: Deliver an approved Card Engine mini-game while enforcing all 13 current registrations, shared fullscreen-shell migration, deterministic reducer/reward behavior, ability/economy hooks, runtime evidence, mobile/reduced-motion review, and documentation sync. Use only after design-minigame is approved. Do NOT use for open design, an existing mini-game bug, or when the shared shell prerequisite is unresolved.
---

# Ship Minigame

Read `.claude/studio/SHIPPING_CONTRACT.md`, `EVIDENCE_VERDICT_CONTRACT.md`, and the approved design.

## Preflight

- Approval includes loop, motion tier, ability hooks, reward math/rank-sum impact, entry cost, and file scope.
- `card-engine/src/pages/games/FullscreenGameShell.tsx` exists. If absent, stop and ask Raheem to authorize the manual `extract-fullscreen-shell` migration; never hand-roll another shell.
- Working tree/worktree state is understood and unrelated work will not be overwritten.

## Mandatory registrations

Every item is implemented or recorded `N/A — <reason>`:

1. types;
2. pure deterministic reducer;
3. seeded harness/snapshot builder;
4. presentation adapter and approved motion tier;
5. run hook/controller;
6. typed art/data manifests;
7. page using `FullscreenGameShell`;
8. route;
9. idempotent `/dev` seed/reference route;
10. governed wallet entry transaction when applicable;
11. idempotent reward service keyed by run id;
12. ability integration from the combatant snapshot, not the live registry;
13. tests for determinism, meaningful ability paths, and reward idempotency.

## Workflow

1. Follow the shared shipping contract and decompose by the 13 registrations.
2. Consult during execution only when new evidence invalidates the approved design: technical architecture, UI semantics/mobile, minigame feel, or governed balance.
3. Implement in dependency order with bounded commits; no out-of-scope cleanup.
4. Add a named scenario that exercises a complete round/run, each ability slot, victory/defeat boundary, wallet lifecycle, and reward idempotency as applicable.
5. Run `.claude/verify/card-engine.sh` when dependencies are installed.
6. Run `visual-playtest` at desktop and 375×812, including reduced-motion mode when animation exists.
7. Return PASS/FAIL/HUMAN REVIEW, sync docs/production status, complete harvest review, and draft the PR body.

## Non-negotiable failure guards

- `npm run build`, not `tsc --noEmit` alone.
- Shared shell; no repeated portal/grid/min-height implementation.
- Clear commit/turn button semantics reviewed when changed.
- Dev seed route lands with the game.
- Snapshot-owned ability data.
- Reward idempotency under refresh/retry.
- No motion beyond the approved tier.
- Economy values require Raheem approval.

Ask before push, PR creation, deployment, new paid generation, or any economy change outside the approved design.
