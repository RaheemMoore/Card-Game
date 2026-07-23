# Lore Engine

Writes the character's **words** — `cardName`, `nameAndTitle`, `lore`, plus the inferred `hiddenFate` and `storyMotifs`. One Claude (Haiku) call. It does **not** author a portrait prompt; image assembly is deterministic in the [Image Engine](../imageEngine/README.md).

**Readable content wiki:** [`LORE_ENGINE_REFERENCE.md`](../../../../LORE_ENGINE_REFERENCE.md) at the repo root is generated from the canonical modules below. Regenerate with `npm run docs:engines`. **The code is the source of truth; that doc is a generated view — do not hand-edit it.**

> This directory is a documentation anchor for the lore engine — the code still lives at the paths below (no files were moved in the 2026-07-22 cleanup).

## Inputs → outputs

```
archetype Bible chapter + immutable Story Pillar answers + element/bond (+ locked identity on tier-up)
  → buildPrompt / generateCardText / generateCardTextWithRetry  (claudeApi.ts)
  → Claude Haiku
  → { cardName, nameAndTitle, lore, hiddenFate, storyMotifs }
```

## Modules

| File | Responsibility |
| --- | --- |
| `claudeApi.ts` | The Claude call: prompt build (`buildPrompt`), `generateCardText`, retry ladder (`generateCardTextWithRetry`), JSON parse, rank-continuity enforcement, diversity-axis roll. |
| `hiddenFate.ts` | Identity locks — `LOCKED_HIDDEN_FATE_FIELDS`, `preserveIdentityAcrossRanks`, `parseHiddenFate`. The "same person across ranks" contract. |
| `prestigeInference.ts` | `inferPrestige` — Ascendant-only earned titles from Story Pillar answers. |
| `narrativeAxisService.ts` | `computeAlignment` / `resistFall` — Seraph corruption-arc scoring from `alignmentWeight` tags. |

## Data modules consumed

`data/archetypeBible/` (11 chapters — identity, origins, beliefs, rank evolution, prestige roles), `data/storyPillars.ts` (player choices, immutable), `data/namingBible.ts`, `data/narrativeAxes/` (Seraph alignment).

## Boundary note

Image-generation constants that used to live here were relocated to `imageEngine/imageConstants.ts` in the 2026-07-22 cleanup. `claudeApi.ts` imports back only the two it references internally: `PORTRAIT_PROMPT_MAX` and `ARCHETYPE_NON_HUMAN_FORMS`. See the Stage 3 plan for the image-first inversion that will move `hiddenFate` identity inference out of this engine entirely.
