---
name: balance-playtest
description: SCAFFOLD ONLY — do not run in Phase 1. Workflow for tuning bias tier ranges, modifier pool weights, minigame reward rates, and economy prices against real playtest telemetry. Becomes runnable once Phase 3 minigames produce data. Documented now so game-systems-designer has a workflow to point at.
---

# Skill: balance-playtest

> **Status: SCAFFOLD.** This skill cannot run in Phase 1 — the game has no minigames, no PvP, and no telemetry pipeline yet. Balancing without data is guesswork. This file documents the workflow so it exists when the data does.

## Activation criteria (all must be true)

- [ ] At least one minigame is shipped and being played
- [ ] Card generation and evolution actions emit analytics events per [economy-plan §16](../../../card-engine-economy-currency-system-plan.md)
- [ ] Rank distribution across the collection is measurable
- [ ] Win/loss data for minigames is measurable
- [ ] Economy spend and earn rates are measurable

Until all five, this skill returns: "Not enough data. Blocked on <missing item>."

## Inputs (once activated)

- **What to tune** — one of: bias tier ranges, modifier pool weights, minigame reward table, premium prices, gameplay currency earn rates, Very Low grind modifier
- **Timeframe of data** — e.g. last 30 days, last 100 forges
- **Hypothesis** — what Raheem or the specialist thinks is wrong ("Ascendant is too easy to reach for Necromancer") — optional but strongly preferred

## Workflow (once activated)

### 1. Pull the data
- Query the analytics store (Phase 3+ — likely Supabase by then).
- Baseline: what does the *current* distribution look like?
- Anomaly: where does the distribution deviate from the design intent?

### 2. Consult game-systems-designer
Give the specialist:
- The distribution numbers
- The current tuning values (bias tier ranges, weights, prices)
- The hypothesis
Ask for: proposed new values + expected effect on distribution + risk of overshoot.

### 3. Propose to Raheem
Governance is binding: no economy value changes without Raheem approval and a documented reason. Same rule for stat/rank tuning even though those aren't strictly "economy" — they affect gameplay balance and require his call.

Proposal shape:

```
## Balance change: <what>

**Observation:** <what the data shows>
**Hypothesis:** <why it's happening>
**Proposed change:** <specific value: old → new>
**Expected effect:** <what the distribution should shift to>
**Rollback plan:** <how we revert if it overshoots>
**Reason:** <one sentence>
```

### 4. Ship and instrument
Once approved:
- Change the values in the appropriate catalog / data file.
- Deploy behind a flag if possible — balance changes should be reversible.
- Set a monitoring window (typically 2 weeks of data) before declaring the change good.

### 5. Post-change review
After the monitoring window:
- Did the distribution shift as expected?
- Any second-order effects (e.g. players stopped forging altogether)?
- Report back to Raheem: kept / adjusted / rolled back.

## Specialists consulted

- `game-systems-designer` — always.
- `technical-architect` — only if the change requires migration (e.g. re-computing derived fields on existing cards).

## Human approval gates

Always. This skill never ships a change without Raheem sign-off.

## Validation

- [ ] Change is one variable at a time (never bundle two tuning changes — you can't tell which one caused the effect).
- [ ] Rollback plan is real.
- [ ] Monitoring window is set before shipping, not decided after.

## Expected outputs

A proposal document, then (if approved) a data-file edit and a monitoring plan.

## When NOT to use (even when activated)

- Feature launches — the first week of data is contaminated with novelty; wait for a stable baseline.
- Emergency fixes — if something is actively broken (e.g. players are getting negative currency), fix directly, don't run a balance workflow.
