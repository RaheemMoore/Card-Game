---
name: design-archetype-emblem
description: Design and produce a lore-consistent archetype selection emblem candidate through the approved Leonardo integration, with prompt validation, distinctness review, provenance, and draft-to-approved status flow. Use for a new or revised emblem. Every paid generation requires explicit batch approval; do NOT auto-fire, overwrite approved assets, or confuse emblems with full-body portraits.
---

# Skill: design-archetype-emblem

Read [PAID_OPERATION_POLICY.md](../../../.claude/studio/PAID_OPERATION_POLICY.md) before any provider call and [EVIDENCE_VERDICT_CONTRACT.md](../../../.claude/studio/EVIDENCE_VERDICT_CONTRACT.md) before declaring a candidate complete.

## Purpose

Design and generate an **archetype selection emblem** — the 1:1 square asset shown in `ArchetypeSelector.tsx` during stage 1 of card forging.

Emblems are lore identity symbols, not gameplay explainers, and are a **separate system** from full-body character portraits.

## Reading list (canonical)

- [card-engine-archetype-emblem-library.md](../../../card-engine-archetype-emblem-library.md) — the source of truth for emblem rules, benchmarks, palettes, prompts, and status
- [IMAGE_ENGINE_REFERENCE.md](../../../IMAGE_ENGINE_REFERENCE.md) — generated current portrait-system reference (do NOT confuse portraits with emblems)
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

## First-pass recommendation rule

Produce one strong recommendation, one paste-ready Leonardo prompt, a measured character count, an expected-cost estimate, and a bounded call plan. Do not return a vague option tree.

**Stop before every paid generation or edit.** Present the provider operation, expected call count/cost, stop limit, and what will be reviewed. Continue only after Raheem explicitly approves that batch. New-archetype creation is not an exception.

Stop earlier for clarification when the lore is materially incomplete, approved rules conflict, the request risks copying protected imagery, or the proposed symbol has real-world religious/political/military significance that needs a human decision.

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

### 6. Run the approved generation batch

**For every invocation:** produce the prompt, expected-cost estimate, call count, and stop limit; wait for Raheem's explicit approval before calling `generateEmblem`.

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

- **Before every paid generation or edit batch**, including new-archetype creation.
- **Before a substantial redesign** that changes an approved direction.
- **Before promoting a draft to approved/integrated.**

## Failure modes to prevent

1. **Portrait/emblem confusion.** Don't pull DNA blocks from `IMAGE_ENGINE_REFERENCE.md` verbatim into an emblem prompt. Portrait DNA describes a person; emblem prompts describe a relic. Palettes overlap but are not identical (library §9).
2. **Default-shield syndrome.** If a new archetype's first draft is a shield or medallion and 3+ approved emblems already are, break the silhouette (library §7 do-not list).
3. **Silent status drift.** If the approved image and the recorded prompt diverge and you don't mark it, future edits will target the wrong baseline. Always keep §10 and §11 in sync with reality.
4. **Cost creep.** No path auto-fires. Every paid batch requires explicit approval, a call ceiling, and recorded actual cost.
5. **Overwriting an approved asset.** Never overwrite `Approved/<archetype>.<ext>` or the `public/assets/` copy with a draft. Drafts get their own timestamped filename.

## Validation checklist

- [ ] Mode explicitly stated.
- [ ] Prompt < 1500 chars (measured, not estimated).
- [ ] Exclusions at the end of prompt.
- [ ] Distinctness check against library §12 passed.
- [ ] Draft saved to `Drafts/<archetype>/gen-<timestamp>.<ext>`.
- [ ] `archetypeEmblems.ts` status updated.
- [ ] Library §10 / §11 / §16 updated (or scheduled to be updated on approval).
- [ ] No paid Leonardo call in any path without Raheem's explicit batch authorization.
- [ ] Existing approved assets not overwritten.

## Expected outputs

- One paste-ready Leonardo prompt (measured).
- One draft image from an explicitly approved generation batch.
- Updated `archetypeEmblems.ts` metadata.
- Updated `card-engine-archetype-emblem-library.md` entry.
- Draft path + public asset path.
- Recorded status transition.

## When NOT to use

- Full-body character portrait work → use `art-pipeline` and the current deterministic Image Engine.
- Cosmetic UI icons (stat icons, badges, currency icons) → those are static assets, not emblems.
- The archetype's design has not been approved by Raheem → hand back to `design-feature`.
- Purely a filename or asset-path rename → direct edit, no skill needed.
