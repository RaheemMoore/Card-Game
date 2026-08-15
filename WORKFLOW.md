# WORKFLOW.md — How to Work in the AI Game Studio

**Audience:** Raheem.
**Purpose:** What your day-to-day working pattern looks like now that the studio bootstrap is done.

This is short by design. If it grows past two pages, I've made it too clerical.

---

## The one-line version

**Raheem/team make consequential decisions. One primary Claude Studio Lead integrates and implements. Read-only specialists advise only when judgment is needed. Skills run repeatable workflows. Evidence—not confidence—determines done.**

---

## The game-improvement loop

**This is the default way we change anything a player can see.** It came out of the rhythm
Raheem found with Codex, and it exists for one reason: an assistant that explains the file
chain first makes more accurate edits than one that assumes it already understands. Raheem
reads the code now, so that explanation is worth the minutes it costs.

1. **Pick one task or one player-visible problem.** Pick who helps — Claude or Codex.
2. **The assistant asks before creating the branch.** One active task branch per assistant,
   named for the work (`claude/<task>`), off `development`. No branch appears without a yes.
3. **Inspect and explain the file chain — before editing anything.** Where each file is in
   VS Code, what it controls, and the specific numbers or lines producing the behavior
   today. Concise and beginner-friendly. This step is not optional and not a summary of
   intent; it is the actual chain.
4. **Agree on current vs intended behavior, in player-visible terms.** What happens now, and
   what should happen instead. No edit starts before both are written down and agreed.
5. **Implement one focused change.** *Strict when tuning* — adjusting feel, numbers or layout
   is one change per cycle. *Looser when building* — new construction lands as one working
   slice, because reviewing half-built code teaches nothing.
6. **Run the automated checks, then look at it live** — the game open beside VS Code. The
   player-visible verdict is Raheem's, not the assistant's.
7. **Repeat.** Describe the new current behavior, refine the intended behavior, change, review.
8. **Finish:** commit, push, open a pull request into `development`, and say it is ready.
   **Raheem merges.** The branch is deleted the moment it merges.

**When the loop does not apply:** backend plumbing, tests, refactors with no visible effect,
and documentation. There is nothing for Raheem to look at, so steps 3–6 collapse into "do it
and show the checks." Say which mode you are in rather than skipping quietly.

**Tools:** VS Code is for understanding and editing code. Phaser Editor is for scene
composition, object placement and visual scene work.

---

## Choose the smallest safe work mode

| Mode | Use when | Default |
|---|---|---|
| **FAST** | isolated bug, copy/formatting, exact canonical instruction | Studio Lead works directly; no specialist unless a risk trigger appears |
| **STANDARD** | normal feature/asset task with one clear domain | at most one specialist; existing skill; normal evidence |
| **FULL** | new system, schema/economy, major UX, paid campaign, Phaser runtime architecture, cross-discipline feature | written design; up to two specialists; explicit approval; complete evidence |

The control plane is `.claude/studio/STUDIO_CAPABILITY_REGISTRY.json`. The Studio Lead reads only the relevant code/docs, not the entire project.

**Mode sets how much ceremony, not whether the loop runs.** A FAST player-visible fix still
shows the chain and agrees the behavior first — it is just a two-minute version of it. What
FAST skips is specialists, written designs and skills, not Raheem's eyes.

## Branches — two permanent, plus one per assistant while they work

```
main                    the version you trust. Only ever updated by merging development in.
└── development          where finished work collects. Nobody commits to it directly.
    ├── claude/<task>    one at a time, while Claude is working
    └── codex/<task>     one at a time, while Codex is working
```

**Neither assistant commits to `development` or `main`.** A pre-commit hook enforces it, so
this is a rule the tools cannot forget. Work happens on a task branch and reaches `development`
through a pull request.

**One active branch per assistant, named for the work, created only after Raheem says yes.**
It is deleted the moment it merges — **a branch has no "close", only merge or delete**, and
leaving them behind is how this repo reached 49 of them.

Naming the branch after the task is deliberate: a branch that outlives its name stops telling
you what is on it, which is the specific way the old pile became unreadable.

**Raheem merges.** Every merge button is his — the task branch into `development`, and
`development` into `main`. Assistants open the pull request and report it ready; they do not
press it.

Abandoned work is **tagged, then deleted**: `git tag -a archive/<name> <sha>` preserves the
commits forever without leaving a branch in the list. Existing archive tags are listed with
`git tag`, and any of them is restorable with `git branch <name> <tag>`.

## Worktrees — folders are people, branches are work

A **worktree** is a folder on one computer with the project files in it. A **branch** is a
named line of work. They are not the same thing and neither contains the other: a folder
*shows* a branch, the way a window shows one page.

**The rule that keeps them straight:**

> **Folders are named after people. Branches are named after work.**

| Folder | Who | Branch it holds |
|---|---|---|
| `Card Game` | Raheem | whatever he is looking at |
| `.claude/worktrees/claude` | Claude | `claude/<task>`, changes per task |
| Codex's folder | Codex | `codex/<task>`, changes per task |

A person does not change, so the folder name never goes stale. Only the branch inside it does.

**Three things worth knowing:**

- **Raheem's folder is the repository.** Its `.git` is a real directory holding all history
  (~218 MB). The assistants' folders contain a one-line pointer back to it. Delete theirs and
  nothing is lost; delete his and they all break.
- **Two folders cannot show the same branch.** Git refuses, because both would edit the same
  files. This is the "Couldn't switch branches" error — it means some other folder is holding
  the branch you clicked, not that anything is broken.
- **Worktrees are per-machine and never sync.** GitHub has no idea they exist. Moving to the
  laptop means cloning once and getting *one* folder; branches come down automatically because
  those do live on GitHub. Extra folders exist only so several people can work at once, so a
  laptop used alone needs one, plus one per assistant actually working.

Assistants ask before creating or removing a worktree, same as branches.

## Evidence rule

Every completed task ends as:

- **PASS** — objective criteria pass and no human gate remains;
- **FAIL** — a criterion fails and evidence identifies where/why;
- **HUMAN REVIEW** — objective behavior passes or is inconclusive, and the remaining question is subjective/product-level.

Phaser/UI work requires runtime and visual evidence when compilation cannot prove behavior. Paid generation requires an approved batch and provenance.

## What you do

You do four things in this repo:

1. **Ask for things** — features, tweaks, fixes, questions. In your own words, at whatever level of detail feels right. "Make the wallet popover feel less intrusive on mobile" is enough; "add a fourth modifier pool" is enough.
2. **Approve or redirect** — when I come back with a proposal, a plan, or "about to do X, ok?" — you say yes, no, or "actually do Y instead." Creating a branch or a worktree is always one of these moments.
3. **Judge what you can see** — in the loop, the "is that right?" verdict on player-visible behavior is yours. I can show you the change running; I can't tell you whether it feels correct.
4. **Merge** — every pull request, into `development` and into `main`. That button is yours and I don't reach for it.

You do NOT need to:
- Organize files or folders
- Move docs around
- Copy boilerplate
- Remember which spec doc covers what
- Decide when to use a skill or which agent to consult
- **Decide when a new skill or agent might be useful** — I notice repeatable workflows and raise them; you just approve or defer
- Format commits or write PR descriptions
- Track phase status

Those are my jobs. If you catch yourself doing any of them, tell me and I'll fix the flow.

## What I do

- **Everything above** that you don't do.
- **Read the canonical docs before making claims.** If I'm asked about how something works, I check the code or the spec first, I don't recall from memory.
- **Notice repeatable workflows.** When something we're doing looks like it could become a reusable skill (or, rarely, a new specialist agent), I raise it — I don't silently create one. The threshold is real evidence: recurring pattern, stable sequence, multiple predictable touch points. Ordinary code and one-offs don't qualify. See [STUDIO_CHARTER.md](STUDIO_CHARTER.md) — *Proactive Workflow Discovery*.
- **Escalate to you at the right moments** (see "when I'll interrupt you" below).
- **Never touch protected areas without asking:** the economy (prices, rewards, bundles), any destructive change, anything that costs real money.

## When I'll interrupt you

Only these categories:

1. **Gameplay or product decisions** — "should Necromancer's Mana cap be raised from 100 to 110?" — I have opinions, but the call is yours.
2. **Destructive changes** — "I want to delete this file / drop this collection / force-push over this." Never without your yes.
3. **External credentials or paid services** — "we need to add a Supabase key" or "this feature will call Leonardo 4x per forge instead of 1x." You approve the cost.
4. **Visual or playtest judgment** — "does this new border style feel right?" — I can render it, you decide.
5. **Economy changes** — any price, reward, bundle, exchange rule, cap, or refund rule. Governance §13 is binding.

I will NOT interrupt you for:
- File organization
- Doc updates that just reflect what shipped
- Trivial bug fixes
- Small refactors that don't change behavior
- Anything covered by an approved plan

## Your day-to-day working patterns

### Pattern 1: "I have an idea, let's design it"

**You:** "I want cards to be able to be dual-wielded in battle — one character, two archetype affinities."

**I do:** Invoke the `design-feature` skill, which pulls in the right specialist(s), produces a structured proposal with problem/approach/files-touched/governance/open-questions, and delivers it to you.

**You:** Approve, adjust, or reject.

**If approved:** I hand off to `ship-approved-plan` — branch, tasks, code, verify, PR body drafted for your sign-off.

### Pattern 2: "Just do this small thing"

**You:** "Fix the badge padding on mobile — it's overlapping the stat number."

**I do:** This is player-visible, so it runs the game-improvement loop — just a short one. Ask
for the branch, show you the file and the exact value causing the overlap, agree what it should
look like instead, change that one thing, and put it in front of you. No skill, no specialist,
no ceremony beyond that.

If it turns out to be bigger than it looked, I'll come back and say "this is actually a Card Renderer redesign — should I run `design-feature`?"

### Pattern 3: "I want to plan something big"

**You:** "Let's plan out how the boss minigame ties into the reward catalog."

**I do:** Enter plan mode, work through the design with you interactively (asking clarifying questions when needed), exit plan mode with an approved plan, then `ship-approved-plan` takes over.

### Pattern 4: "Are the docs still current?"

**You:** "Are the docs still current?" (or "audit the project knowledge")

**I do:** Invoke `audit-project-knowledge`. Return a fix list. Ask if you want me to sync.

**You:** Yes → I run `sync-project-knowledge` and update the canonical docs in a separate commit.

### Pattern 5: "Something's broken"

**You:** "The forge stopped working, I get a blank card."

**I do:** Reproduce it in the browser preview, read the console + network requests, trace to
the source. Then — because you can see this one — I show you the chain I traced and the line
that is actually wrong before I touch it, so the fix is something you watched happen rather
than something you were handed. Fix, verify live, commit.

If the fix requires an economy change (refund logic, price change, reward tweak) I stop and escalate before touching those values.

### Pattern 6: "Just do a feature I approved last week"

**You:** "Go ahead with the dual-wield thing we designed."

**I do:** `ship-approved-plan` from the approved proposal — ask for the branch, implement, verify, push, open the PR, and tell you it's ready. You merge.

### Pattern 7: "I noticed something repeatable"

**Me (unprompted, at a design or delivery gate):**

> Skill opportunity detected: `create-archetype`
> Why: adding a new archetype touches ~10 predictable files and the same two specialists, in the same order.
> Would improve: consistency + prevents missing an ArchetypeName registration.
> Recommendation: observe one more use.
>
> Should I create it now, record it for later, or leave it as a one-off?

**You:** Yes → I create the skill in a separate commit. Later → I open a spawn_task chip so we don't lose it. One-off → I drop it.

I only raise these at design or delivery gates — not mid-implementation, unless continuing without the workflow would create real risk. If I ever raise one that feels like ceremony for its own sake, tell me and I'll tighten the bar.

### Pattern 8: "Build or change something in Phaser"

**You:** Describe the player-visible goal and approve any architecture choice.

**Studio Lead:** Use `design-feature` for STANDARD/FULL runtime changes, consult `phaser-runtime-director` only for scene/lifecycle/camera/physics/bridge decisions, implement through `build-phaser-feature`, then run `visual-playtest` against a named scenario.

**Result:** code checks + structured runtime state + screenshot/video + `PASS`, `FAIL`, or `HUMAN REVIEW`. A screenshot alone cannot prove direction mapping, motion, collision, or camera behavior.

## Where things live

| Thing | Location |
|---|---|
| **What's happening right now** | **[PRODUCTION.md](PRODUCTION.md)** — status, open threads, decisions, what to do next |
| **Where to begin changing part of the game** | **Studio Wiki → Production → Code Atlas** (`/code-atlas`) — the searchable, beginner-facing map maintained in `studio-wiki/src/codeAtlas.ts` |
| The full project context | [CLAUDE.md](CLAUDE.md) |
| How the studio works | [STUDIO_CHARTER.md](STUDIO_CHARTER.md) |
| Every art tool and readout | [HARNESS_INDEX.md](HARNESS_INDEX.md) |
| Stat / rank system spec | [card-engine-power-system-spec.md](card-engine-power-system-spec.md) |
| Character generation canon | [Character_Generation_Bible_Canonical_v1.md](Character_Generation_Bible_Canonical_v1.md) |
| Economy plan + governance | [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) |
| Specialist agent definitions | `.claude/agents/` |
| Skill (workflow) definitions | `.claude/skills/` |
| Studio architecture map | `AI_STUDIO_ARCHITECTURE.md` + `docs/CARD_ENGINE_STUDIO_ARCHITECTURE_MAP.svg` |
| Capability/routing registry | `.claude/studio/STUDIO_CAPABILITY_REGISTRY.json` |
| Shared project permissions/hooks | `.claude/settings.json` + `.claude/scripts/` |
| Verify script | `.claude/verify/card-engine.sh` |
| The app | `card-engine/` |
| Deprecated docs (do not use) | [docs/archive/](docs/archive/) |

You don't need to memorize this table. If you're not sure where something is, ask me.

## What to work on next

**In [PRODUCTION.md §0](PRODUCTION.md)** — my ranked recommendations, refreshed every
session, plus the questions I need you to rule on.

This section used to hold a hand-written list. It went stale in two weeks and started citing
docs that had been archived, which is exactly why the production guide exists and why a
pre-push hook now warns when it falls behind.

## First test drive

Try one of these to see the flow in action:

- **Simple:** "Fix the pre-existing TypeScript errors so verify passes." (No skill needed. I'll just do it.)
- **Medium:** "Design a way to display the modifier stack on the card detail page." (Triggers `design-feature`, consults ui-ux-director, comes back with a proposal.)
- **Bigger:** "How should we design the first boss minigame?" (Triggers `design-feature`, consults game-systems-designer + ui-ux-director + technical-architect.)

## If the flow ever feels wrong

Tell me. This structure is proved in Card Engine before extraction. If a skill costs more than direct work, routing is tightened; if a specialist adds no decision value, it is skipped. Stable, project-neutral behavior can later move into a coworker-installable studio/plugin, while Card Engine canon stays in its project pack.
