---
name: studio-health
description: Run deterministic health checks on Card Engine's Claude agents, skills, registry, settings, hooks, local links, line endings, and stale references. Use after changing studio infrastructure, before a handoff, or when routing/components seem missing. Reports errors and warnings; never repairs or rewrites automatically.
allowed-tools: Bash Read Grep Glob
---

# Studio Health

## Workflow

1. Run from repository root:
   ```bash
   node .claude/scripts/studio-lint.mjs
   ```
2. If JSON is needed:
   ```bash
   node .claude/scripts/studio-lint.mjs --json
   ```
3. Report each error with exact path and rule.
4. Do not auto-fix, install dependencies, alter permissions, or regenerate docs.
5. After an approved fix, rerun until errors are zero; warnings must be acknowledged or resolved.

## Checks

- frontmatter and unique names;
- registry/source consistency;
- advisory-agent tool restrictions;
- local links and missing mandatory files;
- stale archive/current-state references;
- settings and hook target validity;
- LF line endings for executable studio scripts;
- Git tracking rules for shareable studio files;
- inactive/migration skill visibility.

## Output

`PASS` only when error count is zero. Warnings are listed separately and never silently treated as failures or success.
