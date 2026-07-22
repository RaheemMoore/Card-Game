---
name: consult-specialist
description: Structure every specialist-agent consultation with a mandatory six-field prompt. Use when invoking game-systems-designer, art-prompt-director, ui-ux-director, technical-architect, or lore-fantasy-director via the Agent tool. A loose prompt to a specialist wastes a cold-context subagent call, produces an option-tree instead of a ranked recommendation, and forces a second round-trip. Use ALWAYS when the target is a specialist advisor. Do NOT use for Explore, Plan, general-purpose, or claude-code-guide invocations — those are non-advisory.
---

# Skill: consult-specialist

Every specialist call is a cold-context subagent. It has no memory of this session, so the prompt must carry the context. This skill enforces the six fields that separate a useful consult from a re-litigation.

## When to use

Before invoking `game-systems-designer`, `art-prompt-director`, `ui-ux-director`, `technical-architect`, or `lore-fantasy-director` via the `Agent` tool.

## The mandatory template

```
## Decision statement
Should we do <A> or <B> for <Z>? (one sentence, no ambiguity)

## Prior decisions already settled this session
- <bulleted list, one line each, so the specialist does not re-litigate>
- <name Raheem's explicit approvals verbatim>
- <name what has been ruled out, and why in one clause>

## Failure evidence (or the concrete artifact this concerns)
- Card ID / Ability ID / Boss ID: <exact id>
- Proposal text I am reviewing: <quote verbatim, or "N/A — greenfield">
- Bug output / log line / screenshot: <quote or "N/A">
Never abstract ("we've noticed drift"). Always concrete.

## Scope
- Archetype: <name or "cross-cutting">
- Archetype Workshop engine + area: Image (Look & escalation / Props / Element visuals / Global image rules) / Lore (Canon / Story Pillars & Elements / Lore writing) / N/A
- Commit range: <sha..sha or "no code yet">
- Files the specialist should read first: <paths>

## Deliverable
- Return the specialist's standard output shape (see agent charter).
- Ranked recommendation FIRST — no option trees.
- Under <N> words.
- End with a bulleted "Files reviewed" list.

## What NOT to do
- Do not edit files.
- Do not implement.
- Do not propose new archetypes (that goes through Raheem + create-archetype).
- Advise only.
```

## Rules

1. If you cannot fill "Failure evidence" with a concrete artifact, ask yourself whether the consult is premature. Consults on abstract worries usually get abstract answers.
2. If "Prior decisions already settled this session" is empty, the specialist will spend budget re-deriving what you already know. Populate it.
3. If "Scope" is missing the Archetype Workshop engine + area, add it — the tuned agents rank recommendations differently by engine (Image → art-prompt-director; Lore → lore-fantasy-director).
4. Word budget: 400 for narrow questions, 600 for cross-domain rulings (lore-fantasy-director), 800 max for a full new archetype draft. Never leave the budget unspecified.
5. Do not delegate synthesis. The specialist gives advice; you decide. Never write "based on the specialist's response, implement the change" — that is your job.

## Worked example (from 2026-07-20 Seraph corruption arc consult)

### GOOD prompt (the one that worked, rated 8/10)

```
## Decision statement
Should the Seraph corruption arc introduce a Fallen path via a generic
`narrativeAxis` field, or via a Seraph-specific `alignment` field?

## Prior decisions already settled this session
- Raheem approved the Fallen concept in principle this session.
- We already ruled out modeling Fallen as a separate archetype.
- Shadow element was proposed and I already rejected it — collides with
  Necromancer + Vampire territory. Considering Void as replacement.

## Failure evidence (or the concrete artifact this concerns)
- Archetype: Seraph
- Proposal text I am reviewing: "Fallen Seraphs branch on an
  `alignment: 'Radiant' | 'Fallen'` field set at Ascendant."
- Bug output: N/A — this is greenfield design.

## Scope
- Archetype: Seraph
- Archetype Workshop engine + area: Lore (Canon) — amends Bible §Seraph identityThrough
- Commit range: no code yet
- Files the specialist should read first:
  - Character_Generation_Bible_Canonical_v1.md §Seraph
  - card-engine/src/data/archetypeBible/seraph.ts
  - card-engine/src/data/storyPillars.ts (ser_p1_q1, ser_p2_q1, ser_p3_q1)
  - card-engine/src/data/elements.ts (Shadow, Void, Radiant)

## Deliverable
- Standard lore-fantasy-director ruling shape.
- Ranked recommendation first.
- Under 600 words.
- Include a cross-domain flags section — I need to know what economy and
  data-model implications this triggers.
- End with a "Files reviewed" list.

## What NOT to do
- Do not edit files.
- Do not propose Fallen as a new archetype — Raheem already ruled that out.
- Advise only.
```

### BAD prompt (what a loose version looks like — do not do this)

```
Hey, thinking about a Fallen path for Seraph. Any thoughts on how it
should work? Consider the lore implications.
```

Why this is bad:
- No decision statement — the specialist will hedge and enumerate options.
- No prior context — the specialist will re-suggest "Fallen as a separate archetype" that Raheem already rejected.
- No concrete artifact — the specialist will speculate.
- No scope — the specialist won't know which layer this belongs to, so cross-domain flags won't fire.
- No word budget — you'll get an essay you have to skim.
- No "what NOT to do" — the specialist may draft prompt strings you didn't ask for.

## Inputs

- The decision you are about to make.
- Which specialist owns the primary call (see the specialist description lines).
- The concrete artifact (card id, proposal quote, bug output).
- The Archetype Workshop engine + area, if relevant.

## Expected output

A single Agent tool call with a well-structured prompt. No file created. No documentation output — this skill's job is to fix the *shape* of the specialist prompt in the same turn.

## When NOT to use this skill

- Invoking Explore / Plan / general-purpose / claude-code-guide (those are non-advisory).
- Follow-up messages via SendMessage to a specialist that is already running — the six fields were established on the opening prompt; a follow-up can be terse.
- Re-invoking a specialist within the same session on the exact same question with no new evidence — that's a signal to escalate to Raheem, not to re-ask.
