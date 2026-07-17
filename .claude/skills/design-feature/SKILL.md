---
name: design-feature
description: Turn a raw feature idea into a structured design proposal ready for Raheem's approval. Consults the relevant specialist agent(s), pulls constraints from canonical docs, and returns a proposal Raheem can approve, adjust, or reject in one pass. Use when Raheem says "let's design X" or "how should we do Y." Do NOT use for bug fixes or fully-specified work — go straight to implementation for those.
---

# Skill: design-feature

## Inputs

- **Feature idea** (from Raheem, may be one sentence or several)
- **Optional constraints** (deadline, must-not-break, must-integrate-with)

## Workflow

### 1. Classify the feature
Which specialist domain does this hit? Pick one primary and up to one secondary:

| Domain signal | Primary specialist |
|---|---|
| Stats, ranks, minigame math, economy balance | `game-systems-designer` |
| Portrait art, prompts, modifier pools, Leonardo pipeline | `art-prompt-director` |
| Card renderer, forge flow, wallet UI, mobile | `ui-ux-director` |
| Data model, storage, tests, module boundaries | `technical-architect` |

If it hits two domains, that's fine — invoke both. If it hits three or more, the feature is too big; break it up before designing.

### 2. Read the relevant canonical docs myself
Never delegate reading — I need the context to synthesize. At minimum:
- [CLAUDE.md](../../../CLAUDE.md)
- Whichever topical doc(s) the specialist's reading list names

### 3. Consult specialist(s)
Invoke via `Agent` tool with the specialist's `subagent_type`. Prompt must include:
- The feature idea verbatim
- The specific question I want answered (not "what do you think" — a decision or a design)
- What I've already ruled out
- The constraint on response length ("under 500 words")

### 4. Synthesize the proposal
Combine specialist recommendations with what I already know. The proposal I return to Raheem has this exact shape:

```
## Feature: <name>

**Problem it solves:** <one sentence>
**Approach:** <2–3 sentences>

### Design
- <bullet list of concrete design points>

### Files touched
- <path> — <what changes>

### Governance
- Requires Raheem approval: <yes/no>
- If economy: <old value → new value, reason, player impact>

### Verification plan
- <how I'll confirm this works when built>

### Reuse Forecast
- <does this look repeatable? does an existing skill already cover it? should I capture special process evidence during implementation? is a new/updated skill worth proposing afterward? — OR the single line "No reusable workflow opportunity identified.">

### Open questions for Raheem
- <numbered list — one decision per item>
```

**Rule of thumb for the Reuse Forecast:** most small features get one line — "No reusable workflow opportunity identified." Only expand when the feature has real repetition signals (see [STUDIO_CHARTER.md](../../../STUDIO_CHARTER.md) — *Proactive Workflow Discovery*). This is a forecast, not permission to create the skill.

## Human approval gates

Always. This skill never leads directly into implementation. Raheem must approve the proposal (or ask for revisions) before I open a plan or write code.

## Validation

Proposal is complete when:
- [ ] All specialist recommendations are reflected or explicitly overruled with reason.
- [ ] File paths are real (verified with Read/Glob).
- [ ] Governance impact is stated (economy? destructive? external?).
- [ ] Reuse Forecast is present (even if it's the single-line "No reusable workflow opportunity identified.").
- [ ] Open questions are enumerated — I did not silently guess.

## Expected outputs

A single markdown proposal, delivered inline in chat. No file created — this is a proposal, not canonical truth. If approved, `ship-approved-plan` takes over.

## When NOT to use this skill

- Bug fixes.
- Renames, type tweaks, small refactors.
- Features Raheem has already fully specified in the request.
- Anything urgent where the ceremony would waste time.
