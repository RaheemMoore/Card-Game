---
name: audit-project-knowledge
description: Read-only drift audit between Card Engine implementation, generated references, Figma, canonical docs, the studio registry, and current production status. Use after a major feature, before a handoff, periodically, or when Raheem asks whether documentation is current. Produces a prioritized fix list; never edits files. Do NOT treat archive documents or timestamps as current truth.
---

# Audit Project Knowledge

## Truth order

1. latest live implementation/snapshot;
2. Figma for interface design;
3. generated code references such as `IMAGE_ENGINE_REFERENCE.md`;
4. canonical project documents;
5. approved plans/decision records;
6. archive/history only when explaining intent.

## Audit targets

- `CLAUDE.md`, `PRODUCTION.md`, `STUDIO_CHARTER.md`, `WORKFLOW.md`, `HARNESS_INDEX.md`;
- topical specs/playbooks relevant to the changed code;
- generated references and their generators;
- `.claude/studio/STUDIO_CAPABILITY_REGISTRY.json` versus actual agents/skills;
- agent/skill links, triggers, gates, permissions, and status;
- routes, schemas, manifests, scripts, and named verification commands claimed by docs.

## Workflow

1. Define a bounded audit scope and implementation baseline.
2. Collect claims from docs/registry.
3. verify each material claim against code/Figma/generated output.
4. Classify findings:
   - **P0 unsafe** — secrets, permissions, paid/destructive gate mismatch;
   - **P1 broken** — missing path, invalid config, false mandatory dependency;
   - **P2 stale** — implementation and documentation disagree;
   - **P3 clarity** — ambiguous ownership, duplicate prose, context waste.
5. Identify the authoritative source and exact fix location.
6. Run `node .claude/scripts/studio-lint.mjs` for the studio layer.
7. Return findings only; `sync-project-knowledge` applies approved corrections.

## Output

```md
# Knowledge Audit
**Scope:** ...
**Implementation baseline:** ...

## Findings
| Severity | Claim/location | Evidence | Authority | Recommended fix |

## Confirmed current
- ...

## Could not verify
- <what evidence is missing; never guess>

## Suggested sync order
1. ...
```

Do not modify implementation or docs. Do not “correct” code solely because an older document says something different.
