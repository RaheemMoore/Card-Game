# How this becomes the main workspace

## Repository versus workspace

The **repository** is the Card Game's real collection of files plus its Git
history. The **workspace** is VS Code's saved way of displaying, searching,
running, and explaining those files.

`MY Card Game Workspace.code-workspace` uses the real repository. It is not a practice copy
and it will not be thrown away when you stop being a beginner.

## How it grows

### Stage 1 — A calm entrance

The workspace shows the game and current guides first. Advanced systems remain
in the repository but are hidden from the normal Explorer view.

### Stage 2 — Clear documentation

We classify current design truth, production records, handoffs, and archives.
The Explorer begins matching the way the documents are actually used.

### Stage 3 — Clear asset ownership

We distinguish art that ships with the game from source art, review material,
generated output, and historical assets. We move one safe asset group at a time.

### Stage 4 — Features that live together

As you learn a feature, we bring its screen, rules, data, tests, and explanation
closer together. Combat is handled only after Claude's active work is finished
and its final structure is understood.

### Stage 5 — The everyday main workspace

The same workspace becomes the normal place to develop the entire Card Game.
`START HERE` stays useful for future contributors, while the game, studio,
assets, documentation, and tools have clear permanent homes.

## What “moving things over” means

We are not copying files from an old repository into a new repository. We are
gradually reorganizing the existing repository and teaching the workspace about
each approved change.

```text
Same repository
    + clearer real folders
    + permanent VS Code workspace
    + learning maps and tours
    + automated safety checks
```

That keeps Git history, Claude's work, deployments, tests, and your growing
understanding connected to the same project.
