# Archive — DO NOT USE AS SOURCE OF TRUTH

These documents are preserved for historical reference only. They describe the project as it was in an earlier phase and are known to contradict the current codebase in specific ways. Do not cite them when making design decisions.

## What lives here

### `card-engine-development-plan.md`
The original 4-phase build plan.

**Why archived:**
- Uses the retired 6-stat system (Power / Speed / Endurance / Stability / Support / Patience). Current system is 4-stat Atk / Def / Mana / Tech per [`card-engine-power-system-spec.md`](../../card-engine-power-system-spec.md).
- Prescribes "unlimited rerolls"; current spec caps rerolls at 3.
- Phase 1 build order is already complete.
- Phase 2 = "Supabase backend"; actual strategic direction shifted to economy-first per [`card-engine-economy-currency-system-plan.md`](../../card-engine-economy-currency-system-plan.md) §15.

**Still useful for:** UI layout sketches, the "ritual not a form" tone for the forge flow, and the general 4-phase shape (which the current phase list echoes).

### `card-engine-project-knowledge.md`
Origin document from when the card game was extracted from the AI Workout Generator's "Character Forge" system.

**Why archived:**
- Uses the retired 6-stat system.
- References Notion as an interim database; the card game never used Notion for its own data.
- Figma node IDs listed are for the older 6-frame layout, not the current Dominance frame at node `1:182` that [CLAUDE.md](../../CLAUDE.md) points to.
- "Immediate next steps" section describes work that is done.

**Still useful for:** the origin story (extraction from the fitness app), the border variant table, the "Key Learnings" section (character portrait framing, Figma template border assets, Leonardo Character Reference at Mid strength) — those insights still hold.

### `STUDIO_BOOTSTRAP_Execution_Charter.docx`
The original .docx that seeded the Studio Bootstrap. Preserved as-is.

**Superseded by** [`STUDIO_CHARTER.md`](../../STUDIO_CHARTER.md) at repo root, which folds in the seven adjustments agreed during charter review.

## Rule for me (Studio Lead)

When a specialist asks "what's the source of truth for X" and I'm tempted to point at anything in this directory, I don't. I point at the canonical docs at repo root:

| Topic | Canonical doc |
|---|---|
| Everything | [CLAUDE.md](../../CLAUDE.md) |
| Stat/rank system | [card-engine-power-system-spec.md](../../card-engine-power-system-spec.md) |
| Modifier pools | [card-engine-modifier-pools.md](../../card-engine-modifier-pools.md) |
| Art prompts | [card-engine-archetype-prompt-library.md](../../card-engine-archetype-prompt-library.md) |
| Economy | [card-engine-economy-currency-system-plan.md](../../card-engine-economy-currency-system-plan.md) |
| Studio process | [STUDIO_CHARTER.md](../../STUDIO_CHARTER.md) |
