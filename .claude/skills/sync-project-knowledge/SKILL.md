---
name: sync-project-knowledge
description: Apply approved, targeted documentation updates after implementation or a knowledge audit establishes the new truth. Updates canonical docs, production status, studio registry, playbooks, and generated references through their generators. Use after non-trivial work lands or when Raheem approves a drift-fix list. Do NOT rewrite history, directly edit generated references, or change docs before code is verified.
---

# Sync Project Knowledge

## Preconditions

- Implementation or decision is approved and stable.
- Objective verification is recorded.
- The authoritative source for every changed claim is known.

## Workflow

1. Read the exact code/diff and approved decision.
2. Map each change to the smallest owning document.
3. Update current-state docs in this order:
   - generated references **through their generator** (`npm run docs:engines` for Image Engine changes);
   - topical canonical spec/playbook;
   - `CLAUDE.md` only for durable startup-critical facts;
   - `PRODUCTION.md` through `production-log` for current status/decisions;
   - `.claude/studio/STUDIO_CAPABILITY_REGISTRY.json` for agent/skill/routing changes;
   - `AI_STUDIO_ARCHITECTURE.md` and the one-page map only when architecture changed.
4. Preserve history in decision logs/archive; do not silently rewrite old rationale as though it was always true.
5. Check links, counts, route names, schema names, generated status labels, and commands.
6. Run `node .claude/scripts/studio-lint.mjs` plus the relevant docs generator/check.
7. Report every updated file and the implementation evidence supporting it.

## Rules

- `IMAGE_ENGINE_REFERENCE.md` is generated—never edit it directly.
- `docs/archive/**` is historical context, not a current dependency.
- Do not copy transient session details into `CLAUDE.md`.
- Do not change gameplay values while “syncing” prose.
- If code and approved design still conflict, stop and escalate; documentation cannot resolve an implementation dispute.

## Output

A minimal, reviewable documentation patch and a table of `claim → authority → updated path → verification`.
