---
name: art-pipeline
description: End-to-end workflow for generating or regenerating card portrait art via Leonardo. Assembles the prompt (base + archetype DNA + rank modifier + modifier pool picks + specialization suffix), calls Leonardo with Character Reference for continuity, updates the card's evolution history, and stores the seed for future re-generation. Use when creating a new card's portrait or evolving art on tier-up.
---

# Skill: art-pipeline

## Inputs

- **Card ID** (existing) or **new-card context** (archetype, rank, dominant stat, stat values, modifier pool picks, whisper words)
- **Regeneration reason** — one of: `new_card`, `tier_up`, `player_regen`, `admin_regen`
- **Optional: Character Reference source** (defaults to card's current portrait if regenerating)

## Workflow

### 1. Pre-flight (governance + economy)
- Confirm the caller (the flow that invoked this skill) has already reserved the correct premium currency per [economy-plan §7](../../../card-engine-economy-currency-system-plan.md). This skill does NOT charge — it only generates. If no reservation exists for a paid regeneration, fail fast and tell the caller.
- Confirm Leonardo credentials are present (`.env` VITE_LEONARDO_API_KEY).

### 2. Assemble the prompt
Formula from [modifier-pools.md §Prompt Assembly](../../../card-engine-modifier-pools.md) + [power-system-spec §9](../../../card-engine-power-system-spec.md):

```
Base Visual Style
+ Archetype DNA block                          [from archetype-prompt-library.md]
+ Rank Modifier (Foundation / Forged / Ascendant)
+ Specialization Suffix                        [only if rank ≥ Forged; keyed by (dominantStat, dominantStatRank)]
+ Visual Motif Fragment                        [from spec §9 table]
+ Very Low Absence Motif                       [only if a Very Low stat is in the bottom half of its range]
+ Setting: <Pool 1 pick>
+ Demeanor: <Pool 2 pick>
+ Signature Detail: <Pool 3 pick>
+ Lighting: <Pool 4 pick>
+ Negative Prompt Rules
```

Code: `card-engine/src/services/promptAssembler.ts` already does this — call it, don't reimplement.

### 3. Call Leonardo
Code: `card-engine/src/services/leonardoApi.ts` for new generation, `regeneratePortrait.ts` for regen with Character Reference.

**Character Reference settings** (from spec §9 and project-knowledge Key Learnings):
- Strength: Mid (~60–70%)
- Source: card's previous portrait (or Character Reference from the same character on a different card if this is a first regeneration)
- Seed: reuse the card's stored seed for character-identity stability

Wait for completion. If Leonardo fails:
- Do NOT commit the transaction — the caller should refund per [economy-plan §7.2/§7.3](../../../card-engine-economy-currency-system-plan.md).
- Return failure with the reason.

### 4. Update evolution history
Per [power-system-spec §6](../../../card-engine-power-system-spec.md):

- **First promotion to a tier:** always save the new art as canonical for that (stat, tier) key.
- **Re-promotion to a tier with saved art:** the player was offered a choice upstream (keep vs. regenerate). This skill only runs when the choice was "regenerate" — permanently overwrite the saved art.
- **Demotion to a tier with saved art:** never call this skill — restore the saved version instead.

The `evolutionHistory` structure is card-bound and travels with the card on trade/gift.

### 5. Persist
- Update the card's `currentArt` fields (portraitUrl, cardName if renamed, lore if regenerated, leonardoSeed).
- Update `evolutionHistory[dominantStat][currentTier]` with the new art snapshot.
- Save via `storage.ts`.

### 6. Signal the caller
Return the updated Card object. The caller decides whether to commit the transaction and refresh the UI.

## Specialists consulted

- `art-prompt-director` — only if the generated art comes back consistently off for a specific archetype × rank combination and the fix isn't obvious. Don't consult for one-off bad rolls; consult when a *pattern* emerges.

## Human approval gates

- Player-triggered regenerations: the caller UI must have shown the cost and gotten player confirmation before invoking this skill. Trust the caller's contract.
- Admin regenerations (`admin_regen`): always ask Raheem before running — these bypass the normal economy and are only used for fixing broken cards.

## Validation

- [ ] Prompt assembly matches the formula (all pieces present).
- [ ] Character Reference used for regeneration (not for new-card creation).
- [ ] Seed reused for the same character across tiers.
- [ ] Evolution history updated per one-art-per-tier rule.
- [ ] Failure returns without persisting partial state.

## Expected outputs

- On success: updated Card with new portrait + updated evolution history.
- On failure: structured error the caller can act on (`{ status: 'failed', reason: string, refundable: true }`).

## When NOT to use

- Card text regeneration only (no new portrait) — that's a Claude API call, not Leonardo. Handle inline.
- Placeholder portrait generation — that's `portraitGenerator.ts` and doesn't need this skill.
- Batch regeneration across the whole collection — that would be an admin migration, gets its own plan.
