---
name: create-archetype
description: Ship a fully-approved new archetype (name, class-affinity, DNA, optional per-archetype pipeline exception) into the code, docs, and verified UI without omitting the ~10 mandatory registrations that cause silent bugs. Use ONLY after design-feature has produced an approved archetype proposal and Raheem has said "add it." Do NOT use for tweaks to an existing archetype (that's an inline edit) or for design-time work (design-feature owns that).
---

# Skill: create-archetype

## Inputs

- **Approved archetype design** from `design-feature` or a direct Raheem approval. Must include:
  - Archetype name (single word or "Two Word" — case matters, `ArchetypeName` is a union of literals).
  - Class-affinity row (Atk/Def biases + one of Mana/Tech + tier).
  - Canonical Bible chapter and structured body/skin/identity rules.
  - Class-affinity row and class-signature modifier-pool entries.
  - Current Image Engine inputs: curated pools, generic escalation or approved archetype hook, locked CharacterSheet/hidden-fate fields, and element visual language.
  - Any genuine per-archetype implementation exception approved during design.

- **Optional branch name** (default: `feat/<archetype-lowercase>-archetype`).

## Workflow

### 1. Confirm approval is real

Do not proceed if approval is ambiguous. If Raheem said "let's design a X archetype" but never approved the specific class-affinity row, escalation content, or per-archetype exceptions, hand back to `design-feature`.

### 2. Preflight

```bash
git status                    # working tree must be clean
git fetch origin
git checkout main             # branch off fresh main
git checkout -b <branch>
```

Create the process log at `.claude/process-logs/<archetype>.md` using the established process-log section shape (legend, decisions, specialists, sources, files, verification, and harvest notes). If a historical Lycanthrope log is present, use it only as an example—not as a required dependency. Required sections: legend, decisions from Raheem, specialists consulted, canonical docs read, files touched table, verification checklist, notes for the Reuse Review).

### 3. Decompose into tasks

Use `TaskCreate` to break the plan into concrete steps mirroring §4 below. Mark the first `in_progress` before starting.

### 4. Implement — universal registrations (mandatory)

Do these in dependency order. The exact list may grow with live exhaustive Records; use compiler/search evidence rather than trusting the count in this document.

1. **`card-engine/src/types/card.ts`** — append `'<Archetype>'` to `ARCHETYPE_NAMES`. If a per-archetype identity struct is approved, add the interface here and add optional `<archetype>Identity?` field on `Card`.
2. **`card-engine/src/data/archetypes.ts`** — add `ArchetypeDefinition` entry with identity, palette, motifs, and long-form rank progression strings. Match position in the object literal to the ARCHETYPE_NAMES order.
3. **`card-engine/src/data/powerSystem.ts`** — add row to `CLASS_AFFINITY` at matching position.
4. **`card-engine/src/data/modifierPools.ts`** — add entry to `CLASS_SIGNATURE_POOLS` with ~8–12 signature entries. **Mandatory** — Mech Pilot's omission proved the silent-bug failure mode.
5. **`card-engine/src/data/archetypeBible/<slug>.ts` + `Character_Generation_Bible_Canonical_v1.md`** — add the approved canonical identity and narrative chapter without overlapping an existing archetype.
6. **Current Image Engine source** — add only the approved pools/hook/visual-language entries in the live source files. Do not edit archived prompt libraries. Regenerate `IMAGE_ENGINE_REFERENCE.md` via `npm run docs:engines`.
7. **`card-engine-power-system-spec.md`** — add matrix row in §1.
8. **`CLAUDE.md`** — update durable counts/conventions only after code is verified.
9. **`card-engine/src/data/archetypeEmblems.ts`** — add a `Record<ArchetypeName, EmblemMeta>` entry with `status: 'not_started'`, `assetPath: null`, and TBD `primarySymbol` / `palette`. The emblem itself is designed later in step 7 via `design-archetype-emblem`; this entry keeps the `Record` exhaustive so `ArchetypeSelector` compiles.

### 5. Implement — approved exceptions only

Prefer generic shared fields and current Image Engine hooks. Any exception must be named in the approved proposal, justified against `technical-architect` and/or `art-prompt-director`, and covered by a test. Never add a positional Claude API argument or archetype-only shared-schema field merely because an archived workflow used one. Preserve locked identity fields through generation, regeneration, tier-up, persistence, and migrations.

### 6. Verify before Foundation gate

- `./.claude/verify/card-engine.sh` — all 5 layers must be green. Never proceed with a failing verify.
- **Local UI smoke test** in the dev-server preview (`preview_start card-engine-dev`):
  - New archetype tile appears in the grid at the expected position.
  - Affinity preview on hover shows the correct biases.
  - Dice roll uses the correct stats (Atk/Def + Mana or Tech) and rolls within the Foundation range for each bias tier.
  - Class-signature modifier appears in the whisper wheel's Class Trait ring.
  - Save + reload a card, confirm persistence and border derivation.
- **Do not spend Leonardo credits at this point** — visual verification of the frame + wiring is enough to gate.

### 7. Emblem phase (invoke `design-archetype-emblem`)

Once step 6 verify passes and the new tile is visible, hand off to the [`design-archetype-emblem`](../design-archetype-emblem/SKILL.md) skill. That skill owns the entire emblem workflow — lore-first analysis, prompt authoring, Leonardo API call, draft storage, `archetypeEmblems.ts` metadata update, and [emblem library](../../../card-engine-archetype-emblem-library.md) sync.

**Paid approval still applies here.** The emblem skill prepares one strong prompt and bounded cost plan, then waits for Raheem before calling Leonardo. The returned candidate can wire into a draft/review path without replacing an approved public asset.

Do NOT duplicate emblem-workflow steps here. If the emblem skill is missing or errors, stop and report — do not fall back to hand-writing an emblem prompt in this skill.

### 8. Foundation Leonardo gate (explicitly approved bounded batch)

After presenting provider, operation, expected cost, and stop limit, forge exactly ONE Foundation card through the real deterministic Image Engine + Leonardo pipeline. Screenshot the reveal, share it with Raheem, and **halt**. Do NOT proceed to Forged/Ascendant regen tuning without explicit approval. Test-generation budget ceiling is 5 total unless Raheem extends it.

If the Foundation looks wrong (missing anchor, wrong palette, prompt not landing), iterate on the branch: revise the escalation block or lore instruction, re-verify, regen. If it looks right, wait for Raheem to clear the gate.

### 9. Optional Phase B tuning (only after Raheem clears Foundation gate)

Up to 4 more Leonardo generations (one Forged, up to two Ascendant candidates, one control). Iterate on the escalation prompt if the first Forged/Ascendant reveals a failure mode. **Common failure to watch for:** if the Foundation image is human-anchored and Character Reference at the default 0.45 is preserving human silhouette, drop `init_strength` further (Lycan went to 0.15) AND add negative-prompt terms for the observed failure (e.g. "clean six-pack abs, gym body") AND front-load the anti-failure mandate in the composed portraitPrompt. All three together, not just one.

### 10. Reuse Review (mandatory, per ship-approved-plan §6)

Before drafting the PR body, answer honestly (see `.claude/skills/ship-approved-plan/SKILL.md` for the 5 questions). Update the process log's "Notes for the Reuse Review" section with what worked, what surprised you, and any new automation-candidate steps. If the archetype exposed a new pattern this skill doesn't cover, raise an opportunity — do not silently extend this skill.

### 11. Draft PR body

Standard ship-approved-plan §7 template. Include:
- Summary of what the archetype adds.
- Any per-archetype pipeline deviation, with the reason.
- List of touched files.
- Verification results (verify layers + Foundation Leonardo screenshot reference).
- Governance section: N/A unless the archetype touched economy values (it shouldn't).
- Follow-ups discovered during implementation, as bullets.

**Do NOT push or open the PR without Raheem's authorization.**

## Specialists consulted

**Usually zero during execution** — `design-feature` already consulted `art-prompt-director` and `game-systems-designer` upstream. Consult them mid-execution ONLY when:
- A Foundation Leonardo generation fails visual review and prompt iteration is needed (→ `art-prompt-director`).
- The plan reveals a data-model conflict or unexpected type friction (→ `technical-architect`).

## Human approval gates

- Before creating the branch, if approval is ambiguous or the proposal is missing decisions (class-affinity, exceptions, lore instruction).
- **Foundation Leonardo gate** — always. Never proceed to Phase B tuning without Raheem's explicit yes.
- **Emblem approval** — the emblem skill fires its first Leonardo call automatically, but promoting the draft to `approved` and `integrated` always requires Raheem's visual sign-off.
- Before spending beyond the 5-generation Leonardo budget ceiling.
- Before pushing to remote or opening a PR.
- If the plan turns out to require economy changes — full stop, escalate (should never happen for an archetype).

## Failure modes to prevent

Documented from real incidents:

1. **Silent class-signature-pool omission.** Mech Pilot shipped without a `CLASS_SIGNATURE_POOLS` entry and its Forged/Ascendant portraits missed the "cool signature detail" layer that every other archetype gets. §4 step 4 is mandatory, not optional.
2. **Prompt-composition failure invisible to typecheck.** The Lycanthrope prompt claimed "NON-NEGOTIABLE" wolf anatomy at Forged and Leonardo produced clean human bodybuilder abs anyway. Real Leonardo generation is the only real test — verify script and typecheck cannot catch this.
3. **Character Reference silhouette-anchoring.** For morph archetypes (human → non-human at higher ranks), default 0.45 `init_strength` is too strong. Textual anchors alone don't save you — CR must drop significantly (Lycan uses 0.15).
4. **Front-loaded > mid-prompt.** Leonardo weights the first clauses heaviest. Escalation mandates buried after identity + modifiers get ignored. Put non-negotiable anatomy at the FIRST clause after the style anchor when a deviation is needed.
5. **Whisper-modifier stomping.** An archetype's default body language (e.g. "athletic-to-powerful") can override an explicit physique whisper ("skeletally thin"). If the archetype has a strong default silhouette, note the conflict and consider softening the default in the escalation block.
6. **Foundation gate skipped.** Cost overruns happen when Phase B tuning starts before the Foundation looks right. Always halt after 1 generation.

## Validation

- [ ] All ~10 universal file edits are present.
- [ ] `archetypeEmblems.ts` entry exists (even if `not_started`) — TypeScript will fail otherwise.
- [ ] Class-signature modifier pool entry exists (mandatory).
- [ ] Any per-archetype exception is intentional, documented in the process log, and has its own commit.
- [ ] `./.claude/verify/card-engine.sh` passes.
- [ ] Local UI smoke test done (tile visible, affinity correct, dice ranges match).
- [ ] `design-archetype-emblem` invoked; an explicitly approved generation batch returned a `draft_generated` candidate.
- [ ] Foundation Leonardo generation reviewed and cleared by Raheem.
- [ ] Process log updated with "Notes for the Reuse Review" section.
- [ ] Reuse Review answered (per ship-approved-plan §6).
- [ ] PR body drafted but not pushed without authorization.

## Expected outputs

- A `feat/<archetype>-archetype` branch with atomic commits (base implementation + emblem draft + one commit per significant per-archetype deviation + any post-gate tuning commits).
- A verified, working, forge-able archetype.
- One Foundation-tier real Leonardo generation reviewed by Raheem.
- One emblem draft wired into `ArchetypeSelector.tsx` (status `draft_generated`, promoted to `integrated` after Raheem approves).
- Updated process log preserved at `.claude/process-logs/<archetype>.md` (session-local scratch by default).
- A drafted PR body ready for Raheem's sign-off.

## When NOT to use

- The archetype design has not been approved by Raheem.
- The user asked for a tweak to an existing archetype — that's a direct edit, no skill needed.
- The user is still in the design phase — `design-feature` owns that; hand back.
- The user asked to fix a rendering bug or economy issue — different skills / direct implementation.
