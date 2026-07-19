# Character Generation Bible — Code Integration

**Status:** Live (shipped 2026-07-19)
**Canonical source:** [Character_Generation_Bible_Canonical_v1.md](Character_Generation_Bible_Canonical_v1.md)
**Standing authority:** [Lore & Fantasy Director](.claude/agents/lore-fantasy-director.md) agent

This document is the map between the Bible and the code. If the Bible is unclear, consult the Lore Director. If the Bible changes, update the Bible first, then propagate here.

## Bible → Code map

| Bible concept | Runtime home |
|---|---|
| Global Character Generation Rules | Enforced in `services/claudeApi.ts` prompt preamble |
| Archetype Identity Matrix + §1–§14 chapters | `data/archetypeBible/<archetype>.ts` (11 files) + `data/archetypeBible/index.ts` |
| Guided Narrative Chains (§Step 10) | `data/storyPillars.ts` + `components/StoryPillarWizard.tsx` |
| Global Element Pillar (§Step 12) | `data/elements.ts` + `components/ElementBondPicker.tsx` |
| Approved bond pool | `types/bible.ts` `ELEMENT_BONDS` (frozen) |
| Element rarity / discovery gates | `data/elements.ts` `BUCKET_WEIGHTS` + `elementIsNarrativelyEligible` |
| Hidden Fate | `services/hiddenFate.ts` + Claude output field |
| Prestige roles | `services/prestigeInference.ts` (narrative-earned, Ascendant only) |
| Rank continuity | `services/hiddenFate.ts` `LOCKED_HIDDEN_FATE_FIELDS` + `preserveIdentityAcrossRanks` |
| Claude Generation Pipeline (14 steps) | `services/claudeApi.ts` prompt body |
| Ascendant §Rank Evolution guidance | `services/ascendantPaths.ts` (grounded per-archetype) |

## What's forbidden in code

The Bible has hard "MUST NOT" rules. These are enforced in the prompt AND belong on the reviewer's checklist:

- **No automatic rank escalation of the body.** No "MORE machine each rank", "MORE wolf each rank", "younger/thinner/more muscular at higher rank", "healthier at higher rank", "beauty tier".
- **No forced apotheosis.** Ascendant is a "living reference point," not a mythic dissolution.
- **No free-form Story Pillar input.** Refresh is the only way to see different options. `StoryPillarAnswer.optionId` is required.
- **No player-selected prestige.** Prestige is inferred from narrative in `prestigeInference.ts`.
- **No treating Rare elements as stronger.** Rarity affects discovery frequency (see `BUCKET_WEIGHTS`), never power.

## Data flow — Foundation forge

```
CardForge stage transitions
  ↓ archetype selected
  ↓ dice → CardStats
  ↓ StoryPillarWizard → StoryPillarAnswers (immutable)
  ↓ ElementBondPicker → ElementSelection (with compatibility bucket)
  ↓ generateCardText({ archetype, stats, answers, element, abilitySlotToFill: 'core' })
    ↓ buildPrompt: Bible §Claude Generation Pipeline steps 1-14
    ↓ Claude JSON response: cardName, nameAndTitle, lore, portraitPrompt, negativePrompt, hiddenFate, abilityCandidate
    ↓ parseHiddenFate + preserveIdentityAcrossRanks
  ↓ generatePortraitStrict(portraitPrompt) → Leonardo → base64 dataURL
  ↓ Card saved with { storyPillars, elementSelection, hiddenFate, abilityHistory[Foundation] }
```

## Data flow — Tier-up

```
tierUpCard(card)
  ↓ bump stats to next rank floor
  ↓ existingHiddenFate = card.hiddenFate (locked anchors carry forward)
  ↓ generateCardText({ archetype, newStats, answers: card.storyPillars, element: card.elementSelection, existingName, existingHiddenFate, abilitySlotToFill })
    ↓ Claude sees "LOCKED HIDDEN FATE" block — must preserve age/sex/bodyType/skinTone/facialStructure/hair/disability/scars verbatim
    ↓ preserveIdentityAcrossRanks(previous, incoming) — locked fields overwritten from previous if Claude drifted
  ↓ prestigeInference(archetype, card.storyPillars, newRank) at Ascendant only
  ↓ Leonardo re-run with previous portrait as init image
  ↓ Card saved with new rank + preserved identity
```

## Adding a new archetype

Requires Raheem approval + Lore Director draft first. Then in code:

1. Author `data/archetypeBible/<new>.ts` — all 14 Bible sections.
2. Add to `ARCHETYPE_BIBLE` in `data/archetypeBible/index.ts`.
3. Add to `ARCHETYPE_NAMES` in `types/card.ts`.
4. Add class affinity row to `data/powerSystem.ts` `CLASS_AFFINITY`.
5. Add element compatibility buckets to `data/elements.ts` `ELEMENT_COMPATIBILITY`.
6. Add `data/storyPillars.ts` entry: `<NEW>_QUESTIONS`, `<NEW>_OPTIONS`, register in `STORY_PILLAR_CHAINS`. Draft ~10 answers per question minimum.
7. Add ability family affinity to `data/abilities/families.ts` `ARCHETYPE_PREFERRED_FAMILIES`.
8. Add emblem metadata to `data/archetypeEmblems.ts` (design via `/design-archetype-emblem` skill).
9. Update this file's archetype count.
10. Verify with a smoke forge before merging.

## Adding a new element

Requires Raheem approval + Lore Director review. Steps:

1. Add to `ELEMENT_NAMES` in `types/bible.ts`.
2. Add to every archetype's bucket in `data/elements.ts` `ELEMENT_COMPATIBILITY` (Naturally Compatible / Compatible Through Reinterpretation / Rare / Not Available).
3. If Rare-gated in any archetype, add semantic tag hints to `RARE_ELEMENT_TAG_HINTS`.

## Extending Story Pillar answers

Editing an existing answer post-launch means existing cards keep their old text (answers are snapshotted into `StoryPillarAnswer.answer` at selection time). Adding new answers to a pool is safe. Removing an answer is safe for future forges but breaks lookup for cards that already picked it — prefer marking `openEnded=false` alternatives.

## Retired documents

Both moved to `docs/archive/` and are non-canonical:

- `docs/archive/card-engine-modifier-pools.md` — the pre-Bible 4-pool modifier system, replaced by Story Pillars + Hidden Fate.
- `docs/archive/card-engine-archetype-prompt-library.md` — the pre-Bible archetype DNA prompt library, replaced by `data/archetypeBible/`.

## What Bible integration did NOT change

- Power system (`data/powerSystem.ts`, bias tiers, rank derivation, rank-sum cap) — untouched.
- Economy and wallet — untouched.
- Ability catalog, families, seed abilities — mechanics untouched; ability flavor now consults Bible archetype identity + element bond in `promptFragment.ts`.
- Boss system — untouched pending Phase 3.5 art alignment.
- Emblems — 11 approved emblems shipped unchanged; Bible identities remain visually compatible.
- Card renderer, Figma positioning — untouched.

## Migration record

- 2026-07-19: Bible integration merged. Supabase `cards`, `card_ability_references`, `player_ability_discoveries` wiped after JSON backup to preserve fresh-start invariant. `profiles`, `economy_transactions`, ability library, boss library preserved. Backup archived under scratchpad `supabase-backup-20260719-001346/`.
