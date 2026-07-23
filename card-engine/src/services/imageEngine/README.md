# Image Engine

Turns a character's resolved identity into a Leonardo portrait prompt — **deterministically**. Given the same `CharacterSheet` it always produces the same `{portraitPrompt, negativePrompt}`. It never sees the lore text, so it cannot corrupt the character while staging the picture.

**Readable content wiki:** [`IMAGE_ENGINE_REFERENCE.md`](../../../../IMAGE_ENGINE_REFERENCE.md) at the repo root is generated from the canonical modules below. Regenerate with `npm run docs:engines`. **The code is the source of truth; that doc is a generated view — do not hand-edit it.**

## Pipeline

```
hiddenFate (+ storyMotifs)
  → resolveLockedSelections  (portrait/characterSheetFactory.ts)  — roll+lock weapon/companion/environment/bareChest
  → buildCharacterSheet      (portrait/characterSheetFactory.ts)  — assemble the sheet, roll the per-rank pose
  → assemblePortraitPrompt   (portraitAssembler.ts)               — compose the ordered prompt segments
  → generatePortraitStrict   (leonardoApi.ts)                     — Leonardo transport
```

## Modules

| File | Responsibility |
| --- | --- |
| `portraitAssembler.ts` | `assemblePortraitPrompt`, `buildNegativePrompt`, `COMPACT_STYLE_LEAD` (the live style lead), `buildImageEngineSnapshot`. The core composer. |
| `portrait/characterSheetFactory.ts` | `resolveLockedSelections`, `buildCharacterSheet` — the seam between lore output and the assembler. |
| `portrait/archetypeHooks.ts` | Per-archetype special cases (Vampire feral pose, Lycan anatomy lock, Seraph path anchor, Mech-required, Android touchpoints). |
| `imageEngine/imageConstants.ts` | Shared prompt constants: `BASE_NEGATIVE`, `PORTRAIT_PROMPT_MAX`, `ARCHETYPE_NON_HUMAN_FORMS`, `ELEMENT_DRIFT_BANS` + `buildElementDriftBans`, `truncateToLimit`. Relocated out of `claudeApi.ts` in the 2026-07-22 cleanup. |
| `leonardoApi.ts` | Leonardo transport (submit/poll/generate), per-archetype init-strength. Does NOT build prompts. |
| `portraitGenerator.ts` | Canvas gradient placeholder — Leonardo failure fallback. |

## Data modules consumed

`data/bodySkinBible.ts` (body + skin vocabulary, `ARCHETYPE_BODY_POOL`), `data/hairFashionBible.ts`, `data/elementVisualLanguage.ts` (per-element look), `data/archetypeWeapons.ts`, `data/archetypeCompanions.ts`, `data/archetypeEnvironments.ts`, `data/archetypePoses.ts`.

## Known Stage-3 debt

Some image-intent constants still live in the Lore Engine's `claudeApi.ts` (`ARCHETYPE_POSE_POOLS`, `ELEMENT_SPECTACLE_BY_RANK`) because they are woven into the live Claude prompt body. They are slated to move here during the Stage 3 image-first rewrite. `diversityAxis` is rolled in `claudeApi.ts` and passed into `buildCharacterSheet` — it feeds the image and must not be removed.
