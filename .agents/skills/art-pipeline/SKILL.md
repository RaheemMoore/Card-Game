---
name: art-pipeline
description: Generate or regenerate a Card Engine full-body card portrait through the current deterministic Image Engine and Leonardo provider path. Uses the locked CharacterSheet/hidden-fate inputs, generated IMAGE_ENGINE_REFERENCE, server-side paid-provider controls, provenance, continuity checks, and approval evidence. Use for card portrait production or tier evolution. Do NOT use for emblems, PixelLab sprites, environment plates, prompt-system redesign, or text-only lore generation.
---

# Card Portrait Art Pipeline

## Truth and ownership

The live Image Engine is deterministic TypeScript. Do not manually recreate the retired “base + DNA + modifier-pool document” formula. Read:

- `IMAGE_ENGINE_REFERENCE.md` (generated current-state reference);
- live `portraitAssembler.ts`, archetype hooks, CharacterSheet factory, visual-language/pool data, and Leonardo service involved;
- `Character_Generation_Bible_Canonical_v1.md` for identity and rank continuity;
- `.claude/studio/PAID_OPERATION_POLICY.md` and `EVIDENCE_VERDICT_CONTRACT.md`.

Consult `art-prompt-director` only when changing Image Engine behavior or art direction—not for a routine generation using approved rules.

## Inputs

- card/character id and rank;
- generation reason: new, tier-up, player regeneration, or approved admin repair;
- locked CharacterSheet / hidden-fate identity fields;
- current portrait reference for continuity when regenerating;
- approved spend/transaction context.

## Workflow

1. **Preflight identity.** Confirm the locked fields, body/skin presentation, rank, element/bond, prompt version, and prior portrait provenance exist. Never improve the body by making it younger, thinner, more muscular, healthier, or less disabled.
2. **Confirm paid approval.** No reservation/explicit admin batch approval means no call. State provider, operation, estimated count/cost, and stop limit.
3. **Assemble through live code.** Use the current deterministic Image Engine. Do not hand-edit the final prompt unless an approved system change is being implemented.
4. **Call through the approved server/provider boundary.** Never expose a provider key to client code or copy secrets into logs.
5. **Persist provenance.** Record generated asset id/url, provider/model, prompt version, seed when available, reference strength/input, cost source, reason, and evolution-history link.
6. **Review continuity.** Compare identity anchors, silhouette, body/skin continuity, archetype read, rank escalation, element visual language, modesty, and unintended embedded UI/text.
7. **Return evidence verdict.** `PASS`, `FAIL`, or `HUMAN REVIEW`; subjective approval remains Raheem's.
8. **Harvest only proven lessons.** Propose a pool, validator, prompt rule, or doc update only when the failure repeated or the evidence is strong. Never silently modify the engine from one attractive image.

## Verification

- generated engine reference still matches code when engine code changed (`npm run docs:engines`);
- provider call and cost recorded;
- locked identity fields unchanged;
- currentArt/evolution history consistent;
- reference/seed/provenance retained;
- visual evidence attached;
- no direct edit to generated `IMAGE_ENGINE_REFERENCE.md`.

## Outputs

A persisted candidate portrait with provenance and an evidence verdict. Promotion or admin repair remains behind the applicable human gate.
