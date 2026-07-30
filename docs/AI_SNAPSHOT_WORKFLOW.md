# AI Snapshot Workflow

Generates a sanitized, compact copy of this repository for handing to an external
AI tool (e.g. ChatGPT) for architecture/UX/planning review — without secrets,
generated art, build output, or dependency trees.

## Running it

```bash
# from card-engine/
npm run snapshot:ai

# or from the repo root
node scripts/create-ai-snapshot.mjs
```

The script resolves the repo root via `git rev-parse --show-toplevel`, so it
works from either location. No new npm dependency was added — it shells out to
the system `git` and `zip`/`unzip` binaries already required for day-to-day
development on macOS.

## What it does

1. Walks the whole repo, skipping `node_modules`, `.git`, `dist`, `.vercel`,
   coverage/cache dirs, stale `.claude/worktrees/`, and the exporter's own
   output directory.
2. Excludes all `.env*` files (except `.env.example`), credential/certificate
   files, archives, office binaries, videos/audio/fonts, and anything matching
   a likely-secret pattern found during a text-content scan.
3. Applies a 500KB-per-file cap to binary assets, with explicit category rules
   for `card-engine/public/assets/**` and the root reference-art folders
   (`Card Images/`, etc.) — generated card/boss/portrait/background art is
   always excluded and recorded in the asset manifest instead of copied.
4. Stages everything that survives into `ai-snapshot-output/staging/`,
   generates `ai-project-manifest/` (PROJECT_INDEX, FILE_TREE, FILES.json,
   ROUTES.md, COMPONENTS.md, GAME_SYSTEMS.md, DATA_MODEL.md, DEPENDENCIES.md,
   RECENT_CHANGES.md, EXCLUSIONS.md, SECURITY_VERIFICATION.md, assets.json),
   zips the staging dir, then extracts the zip to a temp dir to re-verify
   hashes and re-run the secret scan before declaring success.

## Output

- `ai-snapshot-output/card-game-ai-snapshot-YYYY-MM-DD-HHMM.zip` — the
  deliverable. Do not upload it if the script exited non-zero.
- `ai-snapshot-output/SNAPSHOT_REPORT.md` — same report that's folded into
  the zip's `ai-project-manifest/`, kept alongside for quick review.
- `ai-snapshot-output/staging/` — the uncompressed staged tree (left in place
  for inspection; safe to delete, it's regenerated on the next run).

`ai-snapshot-output/` is not itself part of any git commit's tracked content
by convention — treat it as scratch output, not a deliverable to check in.

## Reading the report

Check `SNAPSHOT_REPORT.md`'s "Verification results" and final "Suitable for
upload to ChatGPT" line first. `SECURITY_VERIFICATION.md` lists any file the
scanner removed for matching a likely-secret pattern (path + pattern name
only — never a value). `EXCLUSIONS.md` explains every exclusion rule and
lists the largest files that got cut for size.

## If the zip is ever near 100MB

It shouldn't be, in this repo's current shape — the included set is almost
entirely text/code/docs/schema plus a small allow-listed set of UI icon/badge
assets under 500KB each. If a future addition pushes it over the limit,
prefer trimming further binary categories in `ASSET_PREFIX_RULES` /
`MAX_BINARY_BYTES` in `scripts/create-ai-snapshot.mjs` before removing any
source, doc, schema, or config file. Only split into
`core`/`admin`/`gameplay`/`docs-tests` parts (per the exporter's original
spec) if trimming assets alone can't get under the cap.

## Re-running after repo changes

The script is deterministic given the current tree — just re-run it. It
always regenerates `staging/` from scratch and never appends to a previous
run's output.
