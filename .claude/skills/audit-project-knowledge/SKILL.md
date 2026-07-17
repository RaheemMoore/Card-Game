---
name: audit-project-knowledge
description: Detect drift between canonical docs and actual code — file names, data shapes, tech-stack claims, phase status. Produces a fix list (like Phase 0's Contradictions section). Use periodically (monthly, after a big feature, when Raheem asks "are the docs current"). Complements sync-project-knowledge (which applies the fixes).
---

# Skill: audit-project-knowledge

## Inputs

- **Optional scope** — a specific doc or code area to focus on. Default: full canonical doc set.

## Workflow

### 1. Enumerate canonical docs
- [CLAUDE.md](../../../CLAUDE.md)
- [card-engine-power-system-spec.md](../../../card-engine-power-system-spec.md)
- [card-engine-modifier-pools.md](../../../card-engine-modifier-pools.md)
- [card-engine-archetype-prompt-library.md](../../../card-engine-archetype-prompt-library.md)
- [card-engine-economy-currency-system-plan.md](../../../card-engine-economy-currency-system-plan.md)
- [STUDIO_CHARTER.md](../../../STUDIO_CHARTER.md)

Explicitly ignore anything in [docs/archive/](../../../docs/archive/).

### 2. Enumerate the code surface
```bash
find card-engine/src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort
ls card-engine/src/components card-engine/src/pages card-engine/src/services card-engine/src/data card-engine/src/types
ls card-engine/src/components/economy card-engine/src/services/economy card-engine/src/data/economy 2>/dev/null
```
Also: `git log --oneline -20` for recent trajectory.

### 3. Check for these specific drift patterns

| Drift pattern | How to detect |
|---|---|
| File named in a doc doesn't exist | Grep doc for `\.tsx\?` filenames, verify each with `ls` |
| File exists in code but not mentioned in CLAUDE.md's file tree | Diff `find` output vs CLAUDE.md structure block |
| Data-shape claim in a doc doesn't match code | Read the `interface` / `type` in code, compare to doc's data-structure section |
| Phase Status says X is next but X is done | Cross-check with recent git log and file existence |
| Doc claims a limitation that's been fixed | Search doc for "not yet", "TODO", "placeholder", "coming soon" — verify each |
| Two docs disagree | Cross-read any topic covered in >1 doc |

### 4. Produce the fix list
Output shape (mirrors Phase 0's Contradictions section):

```
## Audit Report — <date>

### Contradictions
1. <doc>:<location> claims "<X>". Reality: <Y>. Source: <code path / commit>.
2. ...

### Missing content
- <doc> should mention <feature/file> — currently doesn't.

### Stale content
- <doc>:<location> talks about <deprecated thing>.

### Doc-vs-doc conflicts
- <doc A> says <X>; <doc B> says <Y>. Which is truth?

### Recommended actions
- <doc>: <specific edit>
- ...
```

### 5. Hand off
This skill produces the *diagnosis*. Fixes are `sync-project-knowledge`'s job — but the two can run back-to-back. Ask Raheem before beginning the sync unless the audit was triggered specifically to sync.

## Specialists consulted

None. Audit is mechanical.

## Human approval gates

- Before starting any *fix* work (audit itself is safe — it only reads).
- If the audit reveals a design contradiction (not just doc drift), escalate to Raheem — that's a game-design question, not a doc question.

## Validation

- [ ] Every contradiction cites a specific location in the doc AND the code/commit that contradicts it.
- [ ] No false positives (I verified each claim before flagging it).
- [ ] Recommended actions are concrete edits, not vague suggestions.

## Expected outputs

A single audit report, inline in chat or written to `.claude/audits/<date>.md` if Raheem wants a paper trail. Never edit canonical docs from this skill — that's `sync-project-knowledge`.

## When NOT to use

- Right after `sync-project-knowledge` ran — nothing will have drifted yet.
- To settle a design debate — audit is about facts, not opinions.
