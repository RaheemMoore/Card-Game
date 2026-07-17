---
name: design-archetype-emblem
description: Produce a strong, lore-consistent first emblem concept and Leonardo prompt for an archetype selection tile, auto-fire the Leonardo generation, and manage the draft → revision → approved status flow. Callable independently to revise an existing emblem OR from create-archetype during new-archetype creation. Do NOT use for full-body character portraits — that pipeline lives in services/leonardoApi.ts + card-engine-archetype-prompt-library.md. Do NOT use for cosmetic UI icons.
---

# Skill: design-archetype-emblem

## Purpose

Design and generate an **archetype selection emblem** — the 1:1 square asset shown in `ArchetypeSelector.tsx` during stage 1 of card forging.

Emblems are lore identity symbols, not gameplay explainers, and are a **separate system** from full-body character portraits.

## Reading list (canonical)

- [card-engine-archetype-emblem-library.md](../../../card-engine-archetype-emblem-library.md) — the source of truth for emblem rules, benchmarks, palettes, prompts, and status
- [card-engine-archetype-prompt-library.md](../../../card-engine-archetype-prompt-library.md) — sibling portrait system (do NOT confuse the two)
- `card-engine/src/data/archetypeEmblems.ts` — runtime metadata + status per archetype
- `card-engine/src/services/leonardoEmblemApi.ts` — the emblem-specific Leonardo integration
- `card-engine/src/components/ArchetypeSelector.tsx` — the render target

## Inputs

The skill accepts or derives:

- **Archetype name** (required)
- **Mode** — `new_generation` | `full_regeneration` | `targeted_edit` (default: `new_generation` if `assetPath === null`, else `targeted_edit`)
- **Lore identity** — from the archetype's `identity` string in `data/archetypes.ts` plus any conversation context
- **Cultural origin / values** — from lore instruction blocks and portrait DNA
- **Portrait palette** — from `data/archetypes.ts` (reference only; emblem palette is derived separately, see library §9)
- **Reference images** — approved-set entries in library §10 for distinctness comparison
- **Must-keep / must-avoid elements** — Raheem-supplied
- **Existing draft or approved emblem** — from `ARCHETYPE_EMBLEMS[archetype]`
- **Current asset status** — same source
- **Leonardo character limit** — default 1500 (`EMBLEM_PROMPT_HARD_LIMIT` in `leonardoEmblemApi.ts`)

Most inputs derive from repo context. Do NOT ask Raheem to repeat data already recorded in `archetypeEmblems.ts` or the library.

## First-pass autonomy rule (critical)

Produce **one strong recommendation and one paste-ready Leonardo prompt without a pre-generation approval gate.**

Fire the Leonardo API call immediately after prompt validation, then let Raheem review the returned image live in the UI.

### Only stop for approval when
- The lore is materially incomplete or contradictory.
- The requested imagery risks copying a real franchise or protected logo.
- The design would rely on a real-world religious, political, military, or occult symbol that needs clarification.
- Two approved project rules directly conflict.
- Raheem explicitly asks to review concepts before a prompt is written.

Otherwise: recommend, prompt, fire, review live.

## Workflow

### 1. Determine mode

- If `ARCHETYPE_EMBLEMS[archetype].assetPath === null` → **`new_generation`**.
- If Raheem said "start over" or the current asset is fundamentally wrong (silhouette, palette, primary symbol) → **`full_regeneration`**.
- Otherwise → **`targeted_edit`**.

### 2. Lore-first analysis (internal)

Work through library §3 silently. Do NOT expose the full worksheet unless asked.

Decide:
- Primary symbol
- Silhouette / shape language
- 2–5 supporting motifs
- Material language
- Emblem palette (recorded, not portrait-derived)
- Background gradient
- What distinguishes this emblem from every entry in library §10

### 3. Distinctness check

Cross-reference library §12. New emblem must break new ground on at least **two** of: outer silhouette · primary symbol · dominant palette · background · shape language.

If two dimensions overlap heavily with an approved emblem, iterate on the analysis before writing a prompt.

### 4. Draft the prompt

Follow library §5 structure and rules:

1. `Premium [style] [Archetype] emblem for a card-forging selection screen.`
2. `One unified [relic/symbol/form], front-facing and centered.`
3. Lore identity sentence.
4. Primary symbol + hierarchy.
5. Supporting motifs + arrangement.
6. Materials, engraving, wear, construction.
7. Archetype-specific palette (verbatim, from step 2).
8. Gradient background + lighting.
9. Square format, coverage, readability, quality.
10. Exclusions (embedded at the end — some Leonardo modes have no negative-prompt field).

### 5. Measure and validate

- Count characters with `.length`. Present count verbatim.
- If > 1450, trim repetition before removing important visual direction.
- If > 1500, hard-fail — the `generateEmblem` service will reject.

### 6. Fire the generation

**When invoked from `create-archetype`:** fire automatically via `generateEmblem(prompt)`.

**When invoked standalone (revision of an existing archetype):** produce the prompt and expected-cost estimate, then wait for Raheem's "go" before calling `generateEmblem`. Standalone revision cost accountability is stricter than new-archetype creation.

### 7. Save the draft

On success, save the returned data URL to:

```
Card Images/Archetype Emblems/Drafts/<archetype>/gen-<ISO-timestamp>.<ext>
```

Do NOT overwrite existing drafts — each generation is a separate file. Extension follows the data URL's MIME type (`.jpg` for `image/jpeg`, `.png` for `image/png`).

### 8. Update runtime metadata

Edit `card-engine/src/data/archetypeEmblems.ts` for the target archetype:

- Set `status: 'draft_generated'`.
- Set `assetPath` to the draft path (temporarily) OR keep the approved path if a prior approval exists and only a targeted edit is being tested.
- Update `primarySymbol` and `palette` to match the current design.

### 9. Wire draft into UI (only for standalone new-archetype flow)

If this is the archetype's very first emblem draft:
- Copy the draft image to `card-engine/public/assets/archetype-emblems/<archetype>.<ext>`.
- Update `ARCHETYPE_EMBLEMS[archetype].assetPath` to the public path.
- The tile will render the draft immediately — that is the review surface.

If this is a revision to an already-approved emblem:
- Do NOT overwrite the public asset until Raheem approves the revision.
- Show the draft to Raheem via the Drafts path (screenshot or open image).

### 10. Update the library

Edit `card-engine-archetype-emblem-library.md`:

- Add or update the archetype's entry in §10.
- Add the final prompt to §16.
- Update the §11 manifest row.
- If the archetype is new, add a row to §12 distinctness matrix.

### 11. Report back

Present:
- Recommended emblem direction (1 sentence).
- Lore-to-symbol justification (2 sentences).
- The paste-ready prompt.
- Measured character count.
- Cost incurred (from `EmblemGenerationResult.cost`).
- Draft path and public asset path.
- Result-review checklist (library §15).
- Current status (`draft_generated`).

### 12. Revision loop

When Raheem requests a change:

- **Small tweak** (color, motif, one element) → `targeted_edit` workflow (library §8). Preserve everything approved; describe only the delta.
- **Fundamental issue** (silhouette wrong, palette wrong, symbol wrong) → `full_regeneration` workflow (library §7). State what remains from prior direction and why targeted editing would produce a Frankenstein.
- **Approved** → move draft file from `Drafts/<archetype>/gen-*.jpg` to `Approved/<archetype>.<ext>`, copy to `public/assets/archetype-emblems/`, set status to `approved` then `integrated`, update library §10 and §11.

## Prompt-authoring rules (quick reference)

Full rules in library §5. Highlights:

- Under 1500 chars hard, target 1250–1450.
- Direct hierarchy language: "Make X the clear main object. Keep Y secondary."
- One unified relic, not multiple separate icons.
- Recognizable at 64–128 px.
- No text/banners/UI/frames/watermarks — always exclude.
- No real-world religious or occult symbols.
- Targeted-edit prompts start with "Preserve the existing image exactly…"

## Specialists consulted

**Usually zero** during execution. Escalate to `art-prompt-director` when:

- Two attempts have both failed to produce a distinct emblem — DNA analysis needed.
- The new archetype's identity is genuinely ambiguous.
- A cross-set palette or shape-language conflict emerges.

## Human approval gates

- **First image generated** — always.
- **Substantial redesign** — always.
- **Promote draft → approved** — always.
- **Standalone revision on an already-approved emblem** — before firing the Leonardo call (cost accountability).

## Failure modes to prevent

1. **Portrait/emblem confusion.** Don't pull DNA blocks from `card-engine-archetype-prompt-library.md` verbatim into an emblem prompt. Portrait DNA describes a person; emblem prompts describe a relic. Palettes overlap but are not identical (library §9).
2. **Default-shield syndrome.** If a new archetype's first draft is a shield or medallion and 3+ approved emblems already are, break the silhouette (library §7 do-not list).
3. **Silent status drift.** If the approved image and the recorded prompt diverge and you don't mark it, future edits will target the wrong baseline. Always keep §10 and §11 in sync with reality.
4. **Cost creep.** The auto-fire rule applies to `create-archetype`-invoked new-generations only. Standalone revisions still require a go-ahead. One un-authorized Leonardo call per archetype during revisions is the ceiling.
5. **Overwriting an approved asset.** Never overwrite `Approved/<archetype>.<ext>` or the `public/assets/` copy with a draft. Drafts get their own timestamped filename.

## Validation checklist

- [ ] Mode explicitly stated.
- [ ] Prompt < 1500 chars (measured, not estimated).
- [ ] Exclusions at the end of prompt.
- [ ] Distinctness check against library §12 passed.
- [ ] Draft saved to `Drafts/<archetype>/gen-<timestamp>.<ext>`.
- [ ] `archetypeEmblems.ts` status updated.
- [ ] Library §10 / §11 / §16 updated (or scheduled to be updated on approval).
- [ ] No paid Leonardo call for standalone revision without Raheem's authorization.
- [ ] Existing approved assets not overwritten.

## Expected outputs

- One paste-ready Leonardo prompt (measured).
- One draft image (auto-fired for `create-archetype` invocations; on-approval for standalone).
- Updated `archetypeEmblems.ts` metadata.
- Updated `card-engine-archetype-emblem-library.md` entry.
- Draft path + public asset path.
- Recorded status transition.

## When NOT to use

- Full-body character portrait work → use `art-pipeline` skill + character-portrait prompt library.
- Cosmetic UI icons (stat icons, badges, currency icons) → those are static assets, not emblems.
- The archetype's design has not been approved by Raheem → hand back to `design-feature`.
- Purely a filename or asset-path rename → direct edit, no skill needed.
