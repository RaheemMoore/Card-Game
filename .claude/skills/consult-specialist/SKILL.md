---
name: consult-specialist
description: Build a bounded, evidence-backed prompt for any Card Engine specialist director. Use immediately before invoking a custom advisory agent. Reads the capability registry, enforces FAST/STANDARD/FULL specialist limits, carries settled decisions into the cold-context agent, and requires one ranked ruling rather than an option tree. Do NOT use for Explore, general-purpose, platform help, or a question whose answer is already exact in canonical code/docs.
---

# Consult Specialist

Specialists are cold-context, read-only advisors. The Studio Lead owns synthesis and implementation.

## 1. Confirm a consult is needed

Read `.claude/studio/STUDIO_CAPABILITY_REGISTRY.json` and choose the narrowest specialist whose trigger matches. Do not consult when:

- canonical code or documentation already gives the exact answer;
- the task is an isolated bug/copy/spacing correction;
- another specialist has already ruled on the same evidence this session;
- the question is really implementation, not judgment.

Limits: **FAST 0**, **STANDARD 1**, **FULL up to 2** specialists. More than two means the feature should be split or escalated to Raheem.

## 2. Use this prompt contract

```md
## DECISION
<One sentence: what exact decision must be made?>

## SETTLED THIS SESSION
- <Raheem's approvals, verbatim where material>
- <what is already ruled out and why>
- <existing convention that must remain>

## CONCRETE EVIDENCE
- Request/artifact: <exact quote, id, screenshot description, failing behavior, or proposal text>
- Current implementation: <exact paths and relevant symbols>
- Commit/worktree state: <range or "no code yet">

## SCOPE
- Work mode: FAST | STANDARD | FULL
- Primary domain: <registry domain>
- Files to read first: <small path list>
- Canonical documents: <small path list>

## DELIVERABLE
Return the specialist's required response contract. Give one ranked recommendation first. Stay under <400 narrow / 600 cross-domain / 800 exceptional> words. End with exact sources read.

## DO NOT
- edit, implement, run shell commands, spend credits, ship, or create canonical truth;
- reopen settled decisions;
- invent missing mechanics or project conventions;
- return an unranked option tree.
```

## 3. Validate before invoking

- The decision is binary or rankable, not “thoughts?”
- Evidence is concrete; greenfield is explicitly labeled.
- Paths exist.
- Settled decisions are included.
- The response budget is stated.
- The specialist is listed as active/proposed in the registry.

## Output

One well-formed specialist invocation. After it returns, the Studio Lead states whether the ruling was accepted, modified, or rejected and why. Do not delegate synthesis back to another agent.
