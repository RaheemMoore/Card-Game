# Card Engine Studio Control Plane

This directory contains the machine-readable registry and shared contracts used by the Card Engine AI Studio.

- `STUDIO_CAPABILITY_REGISTRY.json` — agents, skills, ownership, routing, status, gates, and evidence.
- `SPECIALIST_OUTPUT_CONTRACT.md` — required advisory response shape.
- `SKILL_LIFECYCLE_CONTRACT.md` — required workflow sections.
- `PAID_OPERATION_POLICY.md` — batch approval and provenance for paid providers.
- `EVIDENCE_VERDICT_CONTRACT.md` — PASS / FAIL / HUMAN REVIEW rules.
- `SHIPPING_CONTRACT.md` — branch, scope, verification, PR, and harvest rules.
- `PHASER_RUNTIME_BRIDGE_SPEC.md` — development-only runtime observation contract.
- `ROUTING_EVALS.json` — deterministic architecture fixtures used before live Claude routing tests.

The registry is the routing index, not a replacement for implementation truth or canonical project documents. When it disagrees with live code, fix the registry; never bend the code to make an inventory look correct.
