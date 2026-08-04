# Card Engine Studio V2 — Saved Prompt Library

Use the universal prompt for most work. The remaining prompts are available when you want
more specific control without rewriting instructions.

## Universal prompt

```text
Use Card Engine Studio V2 for this session.

Studio V2 is completed and deployed from main at commit
32daf3f2531d59b4f46a0adac45e18eff700b4e6.

Refresh your understanding from the current repository. Read CLAUDE.md, PRODUCTION.md,
AI_STUDIO_ARCHITECTURE.md, and .claude/studio/STUDIO_CAPABILITY_REGISTRY.json. Inspect the
current Git branch, worktrees, and uncommitted changes. Do not restart existing work from
scratch or modify unrelated workstreams.

Act as the primary Studio Lead:
- Understand my request and choose FAST, STANDARD, or FULL mode.
- Use the appropriate existing skill.
- Consult only the necessary read-only specialist.
- Protect active branches, worktrees, secrets, and unrelated changes.
- Use existing harnesses and tools before creating new ones.
- Stop for approval before paid operations, economy changes, destructive actions, pushing,
  deployment, or subjective visual acceptance.
- For gameplay or visual work, require real runtime evidence, not only a successful build.
- Finish with PASS, FAIL, or HUMAN REVIEW.

Start with a short Studio check-in containing:
1. What you understand I want
2. The selected mode
3. The skill and specialist you will use, or why none is needed
4. What existing work you will protect
5. How you will prove the result
6. Any decision or approval you need from me

Then continue efficiently with my request:

[PASTE MY REQUEST HERE]
```

## Start a new Claude Code session

```text
Use Card Engine Studio V2 for this session.

Start by reading CLAUDE.md, PRODUCTION.md, AI_STUDIO_ARCHITECTURE.md, and the Studio capability
registry. Inspect the current Git branch, worktrees, and uncommitted changes before modifying
anything.

Give me a short Studio check-in with the goal, FAST/STANDARD/FULL mode, selected skill,
specialist needed or none, protected work, evidence plan, and human approval gates. Do not
begin implementation until unresolved FULL-mode decisions are settled.

My request:
[PASTE MY REQUEST HERE]
```

## Refresh an older Claude conversation

```text
Card Engine Studio V2 is now completed and deployed from main at commit
32daf3f2531d59b4f46a0adac45e18eff700b4e6.

Before continuing, refresh your understanding from the current repository. Read CLAUDE.md,
PRODUCTION.md, AI_STUDIO_ARCHITECTURE.md, and .claude/studio/STUDIO_CAPABILITY_REGISTRY.json.

Use the Studio V2 model: one primary Studio Lead, FAST/STANDARD/FULL routing, read-only
specialists, repeatable skills, runtime evidence, PASS/FAIL/HUMAN REVIEW verdicts, and human
approval for paid operations, economy, destructive actions, pushing, deployment, and
subjective review.

Do not rely on pre-Studio assumptions. Reinspect Git and protect unrelated branches and
worktrees before continuing with the existing task.
```

## Resume an existing workstream safely

```text
Use Card Engine Studio V2 to resume this existing workstream:

[WORKSTREAM NAME]

Inspect its branch, worktree, Git state, files, evidence, and recorded decisions. Do not merge,
overwrite, or modify another active workstream. Do not restart from scratch.

Tell me what is complete, what is in progress, what remains unresolved, which assumptions are
outdated, the correct Studio mode and workflow, and how the next step will be proven. Then
continue only within the approved scope.
```

## Discuss an idea without building it

```text
Use Card Engine Studio V2 to discuss this idea without implementing it:

[DESCRIBE THE IDEA]

Explain the player-facing goal, expected benefit, affected systems and tools, Studio mode,
needed specialist advice, smallest useful version, risks, costs, human decisions, and how we
would prove it works. Do not change files or run paid operations until I approve a plan.
```

## Build an approved feature

```text
Use Card Engine Studio V2 to implement this approved feature:

[DESCRIBE THE APPROVED FEATURE]

Confirm the scope, mode, branch/worktree, protected workstreams, selected skill, specialist
routing, evidence plan, and human gates. Implement only the approved scope and reuse existing
systems and harnesses first.

For runtime or visual work, collect real gameplay evidence. End with what changed, what was
not changed, verification results, PASS/FAIL/HUMAN REVIEW, remaining decisions, and Git status.
```

## Phaser gameplay work

```text
Use Card Engine Studio V2 for this Phaser task:

[DESCRIBE THE GAMEPLAY CHANGE]

Use the Phaser runtime workflow. Consult the Phaser Runtime Director before changing scene
lifecycle, camera behavior, physics, collisions, animation integration, or observation
scenarios.

Define a named scenario and acceptance criteria before implementation. Verify with runtime
state, console evidence, screenshots or video, and desktop/mobile or reduced-motion coverage
when relevant. A successful build alone is not sufficient. Return PASS, FAIL, or HUMAN REVIEW.
```

## PixelLab sprite work

```text
Use Card Engine Studio V2 for this PixelLab sprite task:

[DESCRIBE THE CHARACTER, BOSS, NPC, OR PROP]

Read HARNESS_INDEX.md and PIXELLAB_PLAYBOOK.md. Use the appropriate sprite-production skill
and consult the Pixel Sprite Director before paid generation or generation-parameter changes.

Before spending credits, show me the brief, workflow, estimated calls and stop limit, identity
and modesty requirements, direction and animation requirements, and validation/gameplay-review
plan. Do not generate paid assets until I approve the batch.
```

## Leonardo art work

```text
Use Card Engine Studio V2 for this Leonardo task:

[DESCRIBE THE PORTRAIT, EMBLEM, ENVIRONMENT, OR OTHER ART]

Read HARNESS_INDEX.md and LEONARDO_PLAYBOOK.md. Select the correct production skill and consult
the appropriate art specialist before generation.

Before spending credits, show me the brief, model and workflow, prompt direction, reference
strategy, estimated generations and stop limit, objective validation criteria, and what still
needs my subjective approval. Do not run paid generation until I approve it.
```

## Verify whether work is actually finished

```text
Use Card Engine Studio V2 to verify this work without assuming it is complete:

[DESCRIBE THE FEATURE OR WORKSTREAM]

Inspect the implementation, documentation, Git state, tests, and runtime evidence. Report what
is implemented, proposed, partial, blocked, or retired; deterministic checks; runtime and visual
evidence; known unrelated failures; PASS/FAIL/HUMAN REVIEW; and the exact remaining work.

Do not fix anything unless I separately authorize implementation.
```

## Run a Studio health check

```text
Run the Card Engine Studio V2 health check.

Confirm Studio lint, routing fixtures, regression checks, branch and Git status, whether local
secret files are ignored and untracked without reading their contents, whether Claude and
Codex adapters are present, and whether documentation or registry status is stale.

Do not modify anything. Return a short PASS, FAIL, or HUMAN REVIEW report.
```

## End a session with a handoff

```text
Before ending this Card Engine Studio V2 session, create a concise handoff.

Include the goal, completed work, remaining work, decisions and reasons, branch, commit, Git
status, verification evidence, protected workstreams, paid operations, human decisions still
needed, and the exact first step for the next session.

Update PRODUCTION.md through the production-log workflow only when work landed, a decision was
made, or project status genuinely changed. Do not push or deploy without my explicit approval.
```
