---
name: design-feature
description: Turn a raw Card Engine feature idea into the smallest approval-ready design. Classifies FAST/STANDARD/FULL work, reads implementation and canonical constraints, consults zero to two registry-selected specialists only when judgment is needed, and defines acceptance evidence before implementation. Use for new behavior, systems, flows, runtime architecture, or cross-discipline changes. Do NOT use for isolated bugs, exact canonical changes, or already-approved plans.
---

# Design Feature

## Inputs

- Raheem's feature idea, preserved verbatim.
- Constraints, must-not-break rules, and any prior approvals.
- Current implementation evidence.

## 1. Choose the work mode

- **FAST** — isolated, low-risk, exact convention, no cross-system decision. No specialist and usually no formal proposal.
- **STANDARD** — normal feature with one clear domain. At most one specialist.
- **FULL** — new system, schema/economy change, major UX, paid campaign, runtime architecture, or cross-discipline feature. Written proposal, explicit approval, at most two specialists.

If the idea contains more than two independent design decisions, split it.

## 2. Refresh only relevant truth

Read:

1. `PRODUCTION.md` for current status;
2. live code for the affected surface;
3. generated references before historical design docs;
4. the smallest topical canonical documents;
5. Figma when interface design is involved.

Do not read the whole project.

## 3. Route through the registry

Use `.claude/studio/STUDIO_CAPABILITY_REGISTRY.json` and `consult-specialist`.

| Signal | Specialist |
|---|---|
| balance, economy, numerical mechanics | `game-systems-designer` |
| lore, archetype identity, narrative territory | `lore-fantasy-director` |
| minigame loop and feel | `minigame-designer` |
| UI flow, mobile, accessibility | `ui-ux-director` |
| schema, persistence, API, provider boundary | `technical-architect` |
| Phaser lifecycle, camera, physics, runtime evidence | `phaser-runtime-director` |
| portrait/Image Engine/emblem direction | `art-prompt-director` |
| environment plate/prop composition | `environment-art-director` |
| PixelLab character/animation integrity | `pixel-sprite-director` |

Art, environment, sprite, runtime, and lore are separate domains. Do not send all visual work to one agent.

## 4. Return this proposal

```md
# Feature: <name>

**Work mode:** FAST | STANDARD | FULL
**Problem:** <one sentence>
**Recommendation:** <one ranked approach>
**Why now:** <player/project value>

## Design contract
- <observable behavior and boundaries>
- <what is explicitly out of scope>

## Existing systems reused
- <components, services, manifests, skills, harnesses>

## Implementation surface
- `<path>` — <change>

## Acceptance evidence
- Deterministic: <tests/lint/build/schema>
- Runtime: <named scenario/state assertions, or N/A>
- Visual: <screenshot/video/human review, or N/A>
- Mobile/reduced motion: <required behavior, or N/A>

## Risks and rollback
- <risk → detection → rollback boundary>

## Human decisions
1. <only unresolved choice; omit section if none>

## Reuse forecast
<No opportunity, or one evidence-backed component/skill/doc recommendation. Do not implement it automatically.>
```

## Approval gate

FAST exact work may proceed when Raheem already supplied the exact desired result. STANDARD and FULL designs stop for explicit approval before `ship-approved-plan`, `build-phaser-feature`, or a production-generation skill runs.

## Done when

The proposal is bounded, reuses existing systems, names evidence before code, records specialist rulings or reason for no consult, and contains no invented project truth.
