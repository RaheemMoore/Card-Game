# Evidence Verdict Contract

Game work ends with one verdict:

- **PASS** — all objective acceptance criteria pass and no unresolved human gate remains.
- **FAIL** — at least one objective criterion fails. Report the exact assertion, state, frame, route, file, or console error and the next corrective action.
- **HUMAN REVIEW** — objective checks pass or are inconclusive, and the remaining question is subjective, creative, product-level, or about play feel.

Evidence may include:

- typecheck, lint, unit tests, build;
- schema/manifest/asset validators;
- Phaser runtime snapshot;
- browser console and network errors;
- screenshot at actual gameplay scale;
- short video for movement, camera, animation, timing, or transitions;
- desktop and mobile scenarios;
- before/after comparison.

Compilation alone is not a PASS for a visual or interactive feature.
