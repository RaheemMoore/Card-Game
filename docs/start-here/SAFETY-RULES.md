# How we will change the repository safely

This organization project follows six rules.

1. **One branch for our work.** Our changes live on an isolated Codex workspace
   branch until they are reviewed and intentionally merged.
2. **Check active work first.** Before moving a folder, compare it with every
   active Claude or Codex worktree that could touch the same area.
3. **Learn before moving.** First document what a folder does; then decide
   whether its current home is actually wrong.
4. **One subject per change.** Documentation, assets, Phaser scenes, and combat
   code move in separate changes.
5. **Run the protections.** Build, tests, lint, and asset checks must pass before
   and after a structural change.
6. **No silent deletion.** Historical material is classified or archived before
   deletion is considered. Important art receives a backup plan first.

## Current protected area

Claude's **Combat Satisfaction and Gameplay Feel** worktree is active. Until it
is finished and merged, we will not edit or move:

- `card-engine/src/pages/castle/combat/`
- `card-engine/src/pages/castle/v2/`
- `PRODUCTION.md`

The Card Game workspace and these guides are additive and do not modify those
paths.

## Our rhythm

```text
Explore → Explain → Propose → Double-check → Change → Test → Review
```

At the **Propose** step, you will see the intended change in plain language. At
the **Double-check** step, we verify that another session has not started work
in the same place.
