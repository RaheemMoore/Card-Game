---
name: design-minigame
description: Interview Raheem for the specifics needed to build a new mini-game, then hand off to ship-minigame. Ask the questions inline (not a formal proposal document) — Raheem prefers a conversational intake like the Combat Overhaul session. Use whenever Raheem says "I want to make a mini-game" or names a specific one. Do NOT produce a written proposal doc; the answers ARE the design.
---

# Skill: design-minigame

Raheem prefers conversational intake over formal proposals. When he says "I want to make a mini-game" (or names a specific one, or references an archetype that needs a leveling loop), ask him for the specifics inline. His answers ARE the design — no separate proposal document, no separate approval gate.

## The intake

Ask these questions. Batch them via AskUserQuestion when the answer set is enumerable; fall back to a single inline question when it needs free text. Don't ask questions he's already answered in his opening message — infer, then confirm.

### 1. What's the game called + who's it for?
- Name / working title
- Which archetype(s) it earns stats for (one, several, or all)
- One-line goal ("Barbarian training that earns +1 Atk")

### 2. Genre + moment-to-moment loop
Ask him to describe it — or if he's vague, offer 3-4 genre options with 1-line descriptions. Genres worth having in the back pocket:
- Timing / rhythm ("tap when the ring lines up")
- Puzzle ("match 3 of the same rune")
- Resource / deckbuilder ("play cards to spend energy, best combo wins")
- Mini-combat ("short 1v1 with a single opponent")
- Roguelike-tile ("clear a small map before the timer")
- Reflex ("dodge/parry incoming icons")

### 3. Session length target
- Under 30s
- 30-90s
- 90-180s
- 3-5 min

### 4. Ability integration — the north star
For each of Core / Signature / Ultimate, ask how the card's ability affects the game. At least one must matter. Raheem's stated rule: *"Making sure the abilities play a part."*

If he says "figure it out," consult `minigame-designer` for a proposal, then confirm with him.

### 5. Reward math
- What stat does a win give? How much? (Usually +1 to +2)
- Does difficulty scale with rank (Foundation vs. Ascendant)?
- Entry cost in Gold (or none)?

Cite the rank-sum cap of 7 constraint if the answer could push cards past it — that's a governance concern per `card-engine-power-system-spec.md`.

### 6. Motion budget
Per [[feedback_motion_budget]] — always ask, never assume:
- None (static, only state changes)
- Hit-shake / feedback only
- Full pacing (idle motion + wind-up + impact)

Default is hit-shake-only if he doesn't want to think about it.

### 7. Anything else?
Any specific art references, existing games he wants it to feel like, mobile-first vs. desktop-first, seasonal theme, etc.

## Delegation to specialists (optional, only if a question is genuinely open)

If Raheem's answer on a specific question is "I don't know, you decide" or "propose something":
- Genre / loop / difficulty curve → `minigame-designer`
- Reward math against economy → `game-systems-designer`
- Layout / input mode / mobile ergonomics → `ui-ux-director`
- Reducer / snapshot / ability-hook shape → `technical-architect`
- Any art beyond CombatFrame + CardRenderer → `art-prompt-director`

Return the specialist's recommendation to Raheem in one line and confirm before locking it in. Don't stack multiple specialists without checking back.

## Once you have the answers

Write a short summary inline for Raheem to sanity-check — 5-8 bullets, not a document:

```
Locking in <name>:
- Genre: <genre>, ~<session length>
- Core: <ability hook>
- Signature: <ability hook>
- Ultimate: <ability hook>
- Reward: +N <stat> per win, entry <cost> Gold
- Motion: <tier>
- <anything else>

Handing off to ship-minigame. Say "go" or amend.
```

On "go" (or equivalent), invoke `ship-minigame` with these locked answers as the input.

## Human approval gates

- **Motion tier** must be explicitly answered (never inferred).
- **Reward math** must be Raheem-stated numbers when there's a stat gain or currency cost — governance rule from `card-engine-economy-currency-system-plan.md` §13.
- **"Go" to hand off** — never jump to `ship-minigame` without confirming the summary.

## Validation

Interview is complete when:
- [ ] Motion tier is answered.
- [ ] All three ability slots have an integration answer (or an explicit "no hook, by design because X").
- [ ] Reward math has Raheem-stated numbers.
- [ ] Rank-sum cap of 7 interaction is addressed if reward pushes near it.
- [ ] Locked-in summary was posted and Raheem said go (or amended).

## Expected outputs

- A brief locked-in summary in chat.
- Direct handoff to `ship-minigame` with the answers as input.
- No separate design document, no separate approval gate — the interview IS the design.

## When NOT to use this skill

- Raheem is already deep in a mini-game spec conversation — just start asking the gaps.
- The mini-game is a tweak to an existing one — direct edit.
- Raheem asked a general "how would we build mini-games" architecture question — that's inline conversation, not this skill.
