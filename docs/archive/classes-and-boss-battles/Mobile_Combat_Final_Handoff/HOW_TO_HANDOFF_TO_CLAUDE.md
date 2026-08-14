# How to Hand the Final Mobile Combat Assignment to Claude Code

## 1. Download and unzip the package

Use:

`Mobile_Combat_Final_Handoff.zip`

## 2. Copy it into the live repository

Recommended location:

```text
Card Game/
└── Classes and Boss Battles/
    └── Mobile Combat Final Handoff/
```

Keep the filenames intact.

## 3. Confirm the live workspace

Use the newest working repository.

Do not replace the live project with an older ZIP.

Recommended:

```bash
git status
git checkout -b feature/mobile-combat-ui
```

Preserve any current work.

## 4. Open Claude Code at the repository root

```bash
cd "/path/to/Card Game"
claude
```

## 5. Paste the final prompt

Open:

`CLAUDE_CODE_FINAL_MOBILE_COMBAT_PROMPT.md`

Copy the full file and paste it into Claude Code.

## 6. Let Claude complete the assignment

Claude is instructed to:

- Inspect current code
- Reuse shared logic
- Use Figma assets
- Build the complete mobile UI
- Test multiple phone sizes
- Preserve desktop and tablet
- Present screenshots at completion

Do not interrupt it merely because it reports the initial inspection.

It should continue automatically through implementation.

## 7. Only intervene for true blockers

Claude may stop if it finds:

- A product conflict
- Missing credentials
- A destructive migration
- A paid external operation

Otherwise it should continue.

## 8. Final approval standard

Do not approve based on code completion alone.

Require:

- Small-phone screenshot
- Standard-phone screenshot
- Large-phone screenshot
- Decision Mode
- Playback Mode
- Expanded Journal
- Comparison to approved reference
- Desktop regression
- Tablet regression
- Tests
- Build result

The mobile assignment is not finished until you can visually inspect it.
