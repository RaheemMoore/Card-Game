# WORKFLOW.md — How to Work in the AI Game Studio

**Audience:** Raheem.
**Purpose:** What your day-to-day working pattern looks like now that the studio bootstrap is done.

This is short by design. If it grows past two pages, I've made it too clerical.

---

## The one-line version

**You make the creative and business decisions. I do the implementation. Specialist subagents advise on hard questions. Skills handle repeat workflows.**

---

## What you do

You do exactly two things in this repo:

1. **Ask for things** — features, tweaks, fixes, questions. In your own words, at whatever level of detail feels right. "Make the wallet popover feel less intrusive on mobile" is enough; "add a fourth modifier pool" is enough.
2. **Approve or redirect** — when I come back with a proposal, a plan, or "about to do X, ok?" — you say yes, no, or "actually do Y instead."

You do NOT need to:
- Organize files or folders
- Move docs around
- Copy boilerplate
- Remember which spec doc covers what
- Decide when to use a skill or which agent to consult
- Format commits or write PR descriptions
- Track phase status

Those are my jobs. If you catch yourself doing any of them, tell me and I'll fix the flow.

## What I do

- **Everything above** that you don't do.
- **Read the canonical docs before making claims.** If I'm asked about how something works, I check the code or the spec first, I don't recall from memory.
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

**I do:** Look at the code, fix it, verify visually, commit. No skill, no specialist, no ceremony.

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

**I do:** Reproduce it in the browser preview, read the console + network requests, trace to the source, fix, verify, commit. No skill invocation — this is what I'm for.

If the fix requires an economy change (refund logic, price change, reward tweak) I stop and escalate before touching those values.

### Pattern 6: "Just do a feature I approved last week"

**You:** "Go ahead with the dual-wield thing we designed."

**I do:** `ship-approved-plan` from the approved proposal. Branch, tasks, implement, verify, PR body drafted, wait for your push authorization.

## Where things live

| Thing | Location |
|---|---|
| The full project context | [CLAUDE.md](CLAUDE.md) |
| How the studio works | [STUDIO_CHARTER.md](STUDIO_CHARTER.md) |
| Stat / rank system spec | [card-engine-power-system-spec.md](card-engine-power-system-spec.md) |
| Modifier pool spec | [card-engine-modifier-pools.md](card-engine-modifier-pools.md) |
| Archetype prompt library | [card-engine-archetype-prompt-library.md](card-engine-archetype-prompt-library.md) |
| Economy plan + governance | [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) |
| Specialist agent definitions | `.claude/agents/` |
| Skill (workflow) definitions | `.claude/skills/` |
| Verify script | `.claude/verify/card-engine.sh` |
| The app | `card-engine/` |
| Deprecated docs (do not use) | [docs/archive/](docs/archive/) |

You don't need to memorize this table. If you're not sure where something is, ask me.

## What's staged for immediate work

Based on the Phase 0 audit, here are the near-term candidates. Not a plan — just what's ready to pick up when you want to.

1. **Leonardo Character Reference tuning** — commit `e105036` integrated Leonardo but the character-continuity behavior across tier-ups hasn't been visually reviewed against a real playthrough.
2. **Portrait art positioning polish** — the CLAUDE.md renderer table is exact but the Ascendant bloom effect washes out the stat number (my hypothesis; needs your visual judgment).
3. **Economy UX pass** — wallet popover, cost badges, insufficient-funds modal are implemented but Figma frames haven't been reviewed against the fantasy aesthetic per economy-plan §12.
4. **Sync canonical docs after any Phase 1.5 work** — `sync-project-knowledge` skill.

*(The TypeScript build baseline was cleaned up as the first real task using the new studio structure — all 5 verify checks now pass.)*

## First test drive

Try one of these to see the flow in action:

- **Simple:** "Fix the pre-existing TypeScript errors so verify passes." (No skill needed. I'll just do it.)
- **Medium:** "Design a way to display the modifier stack on the card detail page." (Triggers `design-feature`, consults ui-ux-director, comes back with a proposal.)
- **Bigger:** "How should we design the first boss minigame?" (Triggers `design-feature`, consults game-systems-designer + ui-ux-director + technical-architect.)

## If the flow ever feels wrong

Tell me. This whole structure is optimized for me and for you specifically — nobody else. If a skill takes longer than the direct implementation would have, I'll skip the skill next time. If a specialist consultation slowed us down instead of helping, I'll consult less. This is a living workflow; adjust it whenever it stops fitting.
