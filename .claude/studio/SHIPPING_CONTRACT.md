# Shipping Contract

Shared delivery rules for `ship-approved-plan`, `ship-minigame`, and other approved implementation workflows.

1. Approval must be explicit and any open design decision must be resolved before code changes.
2. Inspect git status and protect unrelated work. Create or use an appropriate feature branch.
3. Break the approved plan into concrete tasks and keep progress current.
4. Reuse existing components, manifests, scripts, and patterns before adding new ones.
5. Implement the approved scope; do not redesign it silently.
6. Run the project verification appropriate to the affected surface.
7. For game/runtime work, collect the evidence required by `EVIDENCE_VERDICT_CONTRACT.md`.
8. Ask before `git push`, PR creation, deployment, production database mutation, or any paid operation not already approved.
9. Synchronize canonical docs from the implementation that actually landed.
10. Perform a harvest review and recommend, but do not automatically create, any new reusable studio asset.
11. Draft the delivery summary and PR body with verified claims only.
