---
name: sync-project-knowledge
description: After code changes land, update the canonical docs so they don't drift from reality. Runs targeted edits to CLAUDE.md and the topical spec files based on what the code actually does now. Use after merging a non-trivial feature or after Raheem says "the docs are out of date." Complements audit-project-knowledge (which finds the drift).
---

# Skill: sync-project-knowledge

## Inputs

- **What changed** — either a feature description, a commit range (`git log <a>..<b>`), or an audit report from `audit-project-knowledge`
- **Optional: specific docs to focus on**

## Workflow

### 1. Establish the delta
Read `git log --oneline <range>` and the diffs of the relevant commits. Understand what actually changed: file renames, new modules, deleted features, changed data shapes.

### 2. Map deltas to docs

| Change type | Doc to update |
|---|---|
| New service/component/module | [CLAUDE.md](../../../CLAUDE.md) — Project Structure section |
| Stat / rank / bias tier / rank-sum change | [card-engine-power-system-spec.md](../../../card-engine-power-system-spec.md) |
| Modifier pool entries added or reweighted | [card-engine-modifier-pools.md](../../../card-engine-modifier-pools.md) |
| Archetype DNA block revision | [card-engine-archetype-prompt-library.md](../../../card-engine-archetype-prompt-library.md) |
| Archetype emblem spec, prompt, status, or approved asset change | [card-engine-archetype-emblem-library.md](../../../card-engine-archetype-emblem-library.md) |
| Economy catalog / assumptions / rules | [card-engine-economy-currency-system-plan.md](../../../card-engine-economy-currency-system-plan.md) |
| Phase completed or new phase started | [CLAUDE.md](../../../CLAUDE.md) — Phase Status |
| Test suite added/expanded | [CLAUDE.md](../../../CLAUDE.md) — Conventions |
| Studio structure changed (new agent, new skill) | [CLAUDE.md](../../../CLAUDE.md) — Studio Structure, [STUDIO_CHARTER.md](../../../STUDIO_CHARTER.md) |

### 3. Make surgical edits
`Edit` tool, one changed line/block at a time. Never rewrite a whole doc unless it's genuinely wrong end-to-end (in which case escalate to Raheem first — that's a big deal).

Preserve the doc's voice and structure. Don't add new sections unless the change genuinely requires one.

### 4. Cross-link
If two docs now reference the same concept, link between them rather than duplicating content. Doc links use relative paths (`../../CLAUDE.md`).

### 5. Log the sync
Add a single-line commit: `docs: sync project knowledge after <feature>`. Don't bundle doc syncs with code changes — separate commits keep the history readable.

## Specialists consulted

None. This is a mechanical sync task — I own it entirely.

## Human approval gates

- If the sync reveals a contradiction I can't resolve from code alone ("does the current behavior match what Raheem intended, or is the code the bug?"), stop and ask.
- If I want to add or remove a canonical topical doc (e.g. splitting the economy plan in two), always ask first.

## Validation

- [ ] Every claim edited in a canonical doc is verifiable against current code.
- [ ] No content duplicated across docs — cross-links replace copies.
- [ ] Doc commits are separate from code commits.

## Expected outputs

- One or more surgical `Edit` calls to canonical docs.
- A single `docs:` commit.
- A brief report to Raheem: which docs were updated and what changed.

## When NOT to use

- Trivial changes (renames within a file) — CLAUDE.md doesn't need to know.
- Speculative or WIP code — sync docs when the feature ships, not while it's in flight.
