---
name: create-archetype
description: Ship a fully-approved new archetype (name, class-affinity, DNA, optional per-archetype pipeline exception) into the code, docs, and verified UI without omitting the ~10 mandatory registrations that cause silent bugs. Use ONLY after design-feature has produced an approved archetype proposal and Raheem has said "add it." Do NOT use for tweaks to an existing archetype (that's an inline edit) or for design-time work (design-feature owns that).
---

# Skill: create-archetype

## Inputs

- **Approved archetype design** from `design-feature` or a direct Raheem approval. Must include:
  - Archetype name (single word or "Two Word" — case matters, `ArchetypeName` is a union of literals).
  - Class-affinity row (Atk/Def biases + one of Mana/Tech + tier).
  - DNA block: identity string, palette (primary/secondary/accent), motifs, three long-form rank progression strings.
  - Any per-archetype pipeline exception (rolled identity struct, init_strength override, negative-prompt additions, front-loaded prompt-structure override).
  - Any lore-instruction block (e.g. Moon Goddess for Lycanthrope, Tech-Class Escalation for Android/Mech Pilot).
  - Class-signature modifier-pool entries (~8-12, same rarity shape as existing pools).

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

Create the process log at `.claude/process-logs/<archetype>.md` using the Lycanthrope template ([reference](../../process-logs/lycanthrope.md) if it still exists — otherwise recreate a fresh log with the same section shape: legend, decisions from Raheem, specialists consulted, canonical docs read, files touched table, verification checklist, notes for the Reuse Review).

### 3. Decompose into tasks

Use `TaskCreate` to break the plan into concrete steps mirroring §4 below. Mark the first `in_progress` before starting.

### 4. Implement — universal 10 file edits (mandatory)

Do these in dependency order. Each is small (~1–15 lines).

1. **`card-engine/src/types/card.ts`** — append `'<Archetype>'` to `ARCHETYPE_NAMES`. If a per-archetype identity struct is approved, add the interface here and add optional `<archetype>Identity?` field on `Card`.
2. **`card-engine/src/data/archetypes.ts`** — add `ArchetypeDefinition` entry with identity, palette, motifs, and long-form rank progression strings. Match position in the object literal to the ARCHETYPE_NAMES order.
3. **`card-engine/src/data/powerSystem.ts`** — add row to `CLASS_AFFINITY` at matching position.
4. **`card-engine/src/data/modifierPools.ts`** — add entry to `CLASS_SIGNATURE_POOLS` with ~8–12 signature entries. **Mandatory** — Mech Pilot's omission proved the silent-bug failure mode.
5. **`card-engine-archetype-prompt-library.md`** — add DNA block section (title, identity, palette, motifs, body/posture, Foundation → Ascendant progression). Bump the "N Archetype DNA Blocks" heading counter.
6. **`card-engine-power-system-spec.md`** — add matrix row in §1.
7. **`CLAUDE.md`** — bump "N options" and "grid of N archetypes" counters (usually 2 occurrences). If a per-archetype pipeline deviation shipped, add a Conventions bullet describing it.

### 5. Implement — per-archetype exceptions (optional, only when approved)

Only touch these files when the approved proposal calls for the corresponding exception. Skip otherwise.

- **Rolled identity struct** (e.g. Lycan's furColor+moonPhase) — `card-engine/src/services/cardGenerator.ts` roll + attach to shell; then thread the field through the three callers: `services/regeneratePortrait.ts`, `services/tierUp.ts`, `pages/CardForge.tsx`. All three must pass the field to `generateCardText` as the 9th positional arg (or the corresponding named param slot).
- **Per-archetype `init_strength`** — extend `getInitStrengthForArchetype` in `services/leonardoApi.ts`. Add the archetype to the branch, keep others at the 0.45 default.
- **Escalation-rule block + lore instruction** — extend the archetype-branch chain in `services/claudeApi.ts` (around the existing `archetype === 'Android' || archetype === 'Mech Pilot'` block). Add whatever combination of `LYCANTHROPE-STYLE ESCALATION RULE`, `MOON GODDESS LORE INSTRUCTION`, `PROMPT-STRUCTURE OVERRIDE`, and `NEGATIVE-PROMPT ADDITIONS` the design called for. Keep each block wrapped in an `${archetype === '<Name>' ? ...  : ''}` conditional so other archetypes are unaffected.
- **Additional Card field** (e.g. Lycan's `lycanIdentity?`) — declare on `Card` in `types/card.ts` and thread through `cardGenerator.buildCardShell` return spread. All three callers already spread the shell, so it flows automatically.

Commit strategy: land the universal 10 as one atomic commit. Land each significant per-archetype exception as its own subsequent commit on the same branch — makes the base easy to review and the deviations easy to attribute in the log.

### 6. Verify before Foundation gate

- `./.claude/verify/card-engine.sh` — all 5 layers must be green. Never proceed with a failing verify.
- **Local UI smoke test** in the dev-server preview (`preview_start card-engine-dev`):
  - New archetype tile appears in the grid at the expected position.
  - Affinity preview on hover shows the correct biases.
  - Dice roll uses the correct stats (Atk/Def + Mana or Tech) and rolls within the Foundation range for each bias tier.
  - Class-signature modifier appears in the whisper wheel's Class Trait ring.
  - Save + reload a card, confirm persistence and border derivation.
- **Do not spend Leonardo credits at this point** — visual verification of the frame + wiring is enough to gate.

### 7. Foundation Leonardo gate (Raheem-approved 1 generation)

Forge exactly ONE Foundation card of the new archetype via the real Leonardo pipeline. Screenshot the reveal, share it with Raheem, and **halt**. Do NOT proceed to Forged/Ascendant regen tuning without explicit approval. Test-generation budget ceiling is 5 total unless Raheem extends it.

If the Foundation looks wrong (missing anchor, wrong palette, prompt not landing), iterate on the branch: revise the escalation block or lore instruction, re-verify, regen. If it looks right, wait for Raheem to clear the gate.

### 8. Optional Phase B tuning (only after Raheem clears Foundation gate)

Up to 4 more Leonardo generations (one Forged, up to two Ascendant candidates, one control). Iterate on the escalation prompt if the first Forged/Ascendant reveals a failure mode. **Common failure to watch for:** if the Foundation image is human-anchored and Character Reference at the default 0.45 is preserving human silhouette, drop `init_strength` further (Lycan went to 0.15) AND add negative-prompt terms for the observed failure (e.g. "clean six-pack abs, gym body") AND front-load the anti-failure mandate in the composed portraitPrompt. All three together, not just one.

### 9. Reuse Review (mandatory, per ship-approved-plan §6)

Before drafting the PR body, answer honestly (see `.claude/skills/ship-approved-plan/SKILL.md` for the 5 questions). Update the process log's "Notes for the Reuse Review" section with what worked, what surprised you, and any new automation-candidate steps. If the archetype exposed a new pattern this skill doesn't cover, raise an opportunity — do not silently extend this skill.

### 10. Draft PR body

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
- [ ] Class-signature modifier pool entry exists (mandatory).
- [ ] Any per-archetype exception is intentional, documented in the process log, and has its own commit.
- [ ] `./.claude/verify/card-engine.sh` passes.
- [ ] Local UI smoke test done (tile visible, affinity correct, dice ranges match).
- [ ] Foundation Leonardo generation reviewed and cleared by Raheem.
- [ ] Process log updated with "Notes for the Reuse Review" section.
- [ ] Reuse Review answered (per ship-approved-plan §6).
- [ ] PR body drafted but not pushed without authorization.

## Expected outputs

- A `feat/<archetype>-archetype` branch with atomic commits (base implementation + one commit per significant per-archetype deviation + any post-gate tuning commits).
- A verified, working, forge-able archetype.
- One Foundation-tier real Leonardo generation reviewed by Raheem.
- Updated process log preserved at `.claude/process-logs/<archetype>.md` (session-local scratch by default).
- A drafted PR body ready for Raheem's sign-off.

## When NOT to use

- The archetype design has not been approved by Raheem.
- The user asked for a tweak to an existing archetype — that's a direct edit, no skill needed.
- The user is still in the design phase — `design-feature` owns that; hand back.
- The user asked to fix a rendering bug or economy issue — different skills / direct implementation.
