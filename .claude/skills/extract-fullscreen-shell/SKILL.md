---
name: extract-fullscreen-shell
description: One-time refactor to promote the CombatViewport portal + grid pattern into a reusable `<FullscreenGameShell>` primitive at `card-engine/src/pages/games/FullscreenGameShell.tsx` so every future mini-game inherits the correct layout invariants (portal to body, 100dvh, overflow-hidden, `min-h-0` on every grid child) instead of rediscovering the CSS Grid `min-height: auto` trap. Invoke ONCE before mini-game #1. Do NOT re-invoke — after extraction, `ship-minigame` requires the shell to exist.
---

# Skill: extract-fullscreen-shell

## Inputs

- No inputs. This is a self-contained refactor.

## Preconditions

- `CombatViewport.tsx` at `card-engine/src/pages/battle/CombatViewport.tsx` is the reference implementation. If its shape has drifted from the 2026-07-20 P1 landing, read the file first and update this skill's target API to match.
- Raheem has approved the extraction (2026-07-20).

## Workflow

### 1. Create the branch

```bash
git status
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b feat/fullscreen-game-shell
```

### 2. Task-list the refactor

Use `TaskCreate` for the steps in §3. Mark the first `in_progress` before starting.

### 3. Build the primitive

Create `card-engine/src/pages/games/FullscreenGameShell.tsx` with this shape:

```tsx
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Left / primary column — the game scene. */
  mainColumn: ReactNode;
  /** Right / secondary column — journal, minimap, log, etc. Optional. */
  sideColumn?: ReactNode;
  /** Modal that takes over when the run ends (victory / defeat). Optional. */
  overlay?: ReactNode;
  /** Aria label for the outer dialog. */
  ariaLabel: string;
  /**
   * Grid geometry. Defaults to a 2-column desktop / stacked mobile layout
   * matching CombatViewport. Pass a fully custom `gridTemplate*` string
   * if a game needs a different arrangement (e.g. no side column).
   */
  desktopColumns?: string; // default: 'minmax(0, 1fr) minmax(220px, 280px)'
  desktopRows?: string;    // default: 'minmax(0, 1fr)'
  mobileColumns?: string;  // default: '1fr'
  mobileRows?: string;     // default: 'minmax(60dvh, 1fr) minmax(0, 320px)'
  /** Background color of the shell behind the columns. */
  backgroundColor?: string; // default: '#050308'
}

export function FullscreenGameShell({ ... }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const body = (
    <div
      className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden text-bone"
      style={{ background: backgroundColor }}
      aria-label={ariaLabel}
      role="dialog"
      aria-modal="true"
    >
      <div className="grid h-full fullscreen-game-grid">
        <div className="relative overflow-hidden min-h-0 h-full">{mainColumn}</div>
        {sideColumn}
      </div>
      {overlay}
      <style>{`
        .fullscreen-game-grid {
          grid-template-columns: ${desktopColumns};
          grid-template-rows: ${desktopRows};
        }
        .fullscreen-game-grid > * { min-height: 0; }
        @media (max-width: 900px) {
          .fullscreen-game-grid {
            grid-template-columns: ${mobileColumns};
            grid-template-rows: ${mobileRows};
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(body, document.body);
}
```

**Layout invariants** (do NOT change without checking [[feedback_fullscreen_layout]]):
- Portal target is `document.body` — never a nested container.
- `100dvh` on the shell (not 100vh) so mobile browsers with dynamic toolbars don't clip.
- `overflow: hidden` locked on body via useEffect (with restore on unmount).
- `min-h-0` on every grid child AND `minmax(0, 1fr)` on grid tracks — both are required.
- Primary column gets explicit `h-full` in addition to the grid stretch.

### 4. Refactor CombatViewport to consume the shell

Replace `CombatViewport.tsx`'s inline portal + grid + style block with:

```tsx
return (
  <FullscreenGameShell
    ariaLabel="Active combat"
    mainColumn={<CombatScene ... />}
    sideColumn={<CombatJournalRail ... />}
    overlay={state?.phase === 'battle_over' && state.result && <ResultModal ... />}
  />
);
```

Delete the inline `<style>` block and the `combat-grid` CSS class from CombatViewport — they now live in the shell.

### 5. Verify

Per [[feedback_verify_command]]:

```bash
cd card-engine
npm run build
npx vitest run
```

Live smoke via `preview_start card-engine-dev`:
- `/dev/seed-battle → Enter Battle` renders identically to before the refactor.
- Hero cards visible in lanes on desktop (1280×800).
- Turn 1 → END PARTY TURN → Turn 2 cycles cleanly, cards remain visible.
- Mobile at 375×812 stacks Arena above Journal with Arena getting ≥60dvh.

Compare a screenshot of Turn 2 to the pre-refactor state — should be pixel-identical.

### 6. Update docs

- Update `CLAUDE.md`'s project structure section — add `pages/games/FullscreenGameShell.tsx` under `pages/`.
- Update `.claude/skills/ship-minigame/SKILL.md` §Preconditions to remove the "if the shell doesn't exist" branch, or leave it as-is (it's already correct after this ships).
- No spec doc changes needed — this is code-only.

### 7. Reuse Review

- The extraction itself is not a repeatable workflow. Answer the 5 questions honestly; most likely the honest answer is "No new workflow — this is a one-off extraction that unblocks the ship-minigame skill."

### 8. Draft PR body

```
## Summary
- Promotes CombatViewport's portal + grid + min-h-0 dance into a reusable `<FullscreenGameShell>` so mini-games inherit the correct layout invariants instead of rediscovering the P1.11 CSS Grid trap.

## Changes
- NEW `card-engine/src/pages/games/FullscreenGameShell.tsx`
- `card-engine/src/pages/battle/CombatViewport.tsx` — consumes the shell, inline portal/grid deleted
- `CLAUDE.md` — project-structure section updated

## Verification
- npm run build ✓
- vitest ✓ (187 passing, 3 pre-existing failures unchanged)
- Live: battle cycles Turn 1 → 2 → 3 identically to pre-refactor; hero cards visible on desktop; mobile stacks correctly

## Governance
- N/A — pure refactor, no economy or spec change.

## Follow-ups
- `ship-minigame` §Preconditions no longer needs the "shell missing" branch.
```

Ask Raheem before pushing.

## Human approval gates

- Before pushing to remote or opening a PR.
- If the refactor reveals a subtle behavior difference from CombatViewport (any pixel drift) — flag it, do NOT silently "fix" the shell.

## Validation

- [ ] `<FullscreenGameShell>` component exists with the API in §3.
- [ ] `min-h-0`, `100dvh`, portal-to-body, and `minmax(0, 1fr)` invariants are ALL present in the shell.
- [ ] `CombatViewport` uses the shell; its inline portal + style block are deleted.
- [ ] `npm run build` passes.
- [ ] Battle smoke test unchanged from pre-refactor.
- [ ] Mobile smoke test unchanged.

## Expected outputs

- A `feat/fullscreen-game-shell` branch with two atomic commits (add shell + refactor CombatViewport).
- A verified refactor that changes zero behavior for combat and unblocks all future mini-games.
- A drafted PR body ready for Raheem's sign-off.

## When NOT to use this skill

- `FullscreenGameShell` already exists. Do NOT re-extract.
- CombatViewport is being redesigned in the same session (finish that first, then extract from the settled shape).
- The change under consideration is a mini-game itself — that's `ship-minigame`; this is a prerequisite.
