# How to Present the Combat Overhaul to Claude Code

## 1. Start from the latest live repository

The supplied ZIP was reviewed to create this handoff, but Claude should work in the current live workspace.

Before starting:

```bash
git status
git pull
git checkout -b feature/combat-overhaul
```

Preserve any uncommitted work.

---

## 2. Copy the package into the repository

Place the full folder at:

```text
Card Game/
└── Classes and Boss Battles/
    └── Combat Overhaul Current Handoff/
```

Do not rename individual files until Claude has indexed them.

---

## 3. Open Claude Code at the repository root

```bash
cd "/path/to/Card Game"
claude
```

---

## 4. Paste Prompt 1

Open:

`03_Claude_Prompts/01_CLAUDE_REBASELINE_PROMPT.md`

Paste the entire file into Claude Code.

Claude should:

- Inspect the current workspace
- Compare it with the supplied audit
- Rebaseline the project
- Propose C1–C9
- Explain art calls
- Stop

Do not let Claude begin a giant uncontrolled implementation before you see this report.

---

## 5. Review the important decisions

You must explicitly approve:

### Three-hero turn model

Recommended:

- One command per living hero
- Commands editable before End Turn
- End Turn resolves all heroes in stable lane order
- Boss acts afterward

### Rage conflict

Choose how the current 50% mechanical phase relates to the proposed 25% visual Rage.

### Run cost

Choose the exact Gold cost.

### Leonardo calls

Approve:

- Arena batch
- Boss-card batch
- Boss-sprite batch

---

## 6. Paste Prompt 2

After C0 is approved, open:

`03_Claude_Prompts/02_CLAUDE_BUILD_BASE_SLICE_PROMPT.md`

Paste it into Claude.

Claude should implement in checkpoints.

---

## 7. How the art enters the project

### Before art

Claude builds:

- Runtime
- Presentation queue
- Layout
- Manifests
- Placeholder hooks

### Art prompt review

Claude displays the final prompts and settings.

### Generation

After your approval, Claude uses the existing Leonardo proxy.

### Figma review

Candidates are placed beside the approved combat layout.

You select the final asset.

### Repository integration

Claude:

1. Optimizes the approved file.
2. Saves it in the planned combat asset path.
3. Adds a manifest entry.
4. Replaces the placeholder by asset ID.
5. Does not rewrite the UI.

---

## 8. What you should see first

The first meaningful visual milestone should show:

- Dark forbidden mountain passage
- Emberborn Wraith
- Your actual cards
- Three lanes
- Journal column
- Ability Bar
- End Turn
- Readable action pacing

That milestone is C6.

---

## 9. Stop conditions

Stop Claude and request correction if it:

- Starts A0–A9 from scratch
- Rebuilds CardRenderer
- Uses hardcoded sample cards
- Puts timers in the reducer
- Calls Leonardo without approval
- Imports the complete sprite SVG pack
- Claims a gradient placeholder is final boss art
- Changes boss balance without simulations
- Invents Gold cost
- Ignores mobile
