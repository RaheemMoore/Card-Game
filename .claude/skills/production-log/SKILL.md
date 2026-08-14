---
name: production-log
description: Update PRODUCTION.md when work lands, a decision gets made, or a question needs Raheem's ruling. Moves status entries, opens or closes threads, appends a dated decision-log entry, refreshes the recommendations. The edit rides inside the same commit and PR as the work it describes — it is never its own push or its own merge. Use when something material actually changed; skip a session that changed nothing. Do NOT use for routine doc edits that carry no decision (that's sync-project-knowledge), or to record work that is not actually finished.
---

# Skill: production-log

`PRODUCTION.md` is the brain and the map — the durable record of what Raheem and I decided,
why, and what is still open. Before it existed, that record evaporated when a chat session
ended. This skill is how it stays true.

**Its only real enemy is inaccuracy.** If the guide claims something shipped that didn't,
Raheem stops trusting it and it dies exactly the way `WORKFLOW.md`'s status section died.
Every rule below serves that one goal.

---

## Rule zero — the update is never its own commit

**Stage the `PRODUCTION.md` edit into the same commit and pull request as the work it
describes.** Not a follow-up commit, not a second PR, not a separate merge.

This is not a style preference. `main` is protected, so every separate doc update costs an
extra push, an extra pull request and an extra merge — and Raheem named that directly on
2026-08-14 as the thing making this file feel like a hassle: *"It feels like something that's
a hassle to update every single time. It's an extra push, an extra merge every single time."*
He is right, and the cost is entirely self-inflicted.

So the order is: do the work → update `PRODUCTION.md` → `git add` both → one commit → one PR.
The record and the change it describes land together, which is also the only way they cannot
disagree.

**The one exception** is a session whose *entire* product is a decision or a ruling, with no
code. Then the doc edit is the work, and it is the PR.

---

## Step 1 — Decide what actually changed

Not everything deserves an entry. Ask, in this order:

| Did this session… | Then update |
|---|---|
| Ship something a player or admin can see? | §3 Status board |
| Finish, abandon, or discover an unfinished thread? | §4 Open threads |
| Settle a question — including one Raheem overruled me on? | §8 Decision log |
| Raise something Raheem needs to rule on? | §0 Questions for you |
| Change what should be worked on next? | §0 Recommendations |
| Add or change an agent, skill, or harness? | §6 The studio |
| Touch an economy rule or a governance constraint? | §7 Money and rules |
| Change what the game *is*? | §1 What this game is — and tell Raheem plainly |

If none apply, **stop, and do not open the file.** A no-op update that bumps the date is worse
than no update: it teaches the reader that the date means nothing.

**Most sessions should stop here, and that is the intended outcome.** A bug fix, a refactor, a
test repair, a styling pass, an art regeneration, a dependency bump — none of these change what
the project *is*, what was decided, or what is still open. They are recorded in the commit
history, which is where that kind of detail belongs. This file is for the things a future
session would get wrong without it.

**Touch only the sections the table above names.** Updating four sections because it feels
thorough is how a fifteen-minute task becomes an hour, and every section touched is another
place that can drift out of date.

---

## Step 2 — Refresh the recommendations (§0)

This is the section Raheem opens the file for. It has to be worth opening.

- **Rank by value to him, not by ease for me.** The top item should be the thing that most
  changes the game, even if it's the hardest.
- **Tag each by kind:** *highest value · decide don't build · cheap win · risk*. The
  "decide, don't build" tag matters most — Raheem's scarcest resource is his rulings, and
  separating decisions from work makes them actionable in five minutes on a phone.
- **Say why in one short paragraph.** A recommendation without reasoning is an order.
- **Give a `Where:` pointer** (`file:line`) when one exists.
- **Three to five items.** More is a backlog, not a recommendation.
- **Drop what's done.** A stale recommendation is the fastest way to lose trust.

### Questions for you

Anything I'm blocked on, or where I'd be guessing at Raheem's intent. These persist in the
table until answered, which is the entire point — in chat they get raised once and lost.
Remove a row only when it is genuinely answered, and when you remove it, the answer becomes
a §8 entry.

---

## Step 3 — Move status honestly (§3)

Vocabulary is fixed: `SHIPPED` · `IN FLIGHT` · `PARKED` · `PLANNED` · `WON'T DO`.
Do not invent new tokens — the whole reason this vocabulary exists is that CLAUDE.md had
accumulated `CORE COMPLETE`, `PERSISTENCE + AUTH + ADMIN LANDED` and `LANDED` for what were
basically three shades of the same state.

**`SHIPPED` means a player or admin can use it now.** Not "the code is written." Not
"it's on a branch." If it's built but unreachable — like the castle stalls — it is
`IN FLIGHT` and §4 says what's missing.

Keep the live-branches table current. **Merged branches are never listed**: git retains
every commit, so the branch label carries no information and only inflates the apparent
amount of work in flight.

---

## Step 4 — Keep §4 Open Threads true

- **Adding:** state what it is, where (`file:line`), why it stopped, and what would unblock
  it. A thread without a location can't be acted on.
- **Closing:** delete the row. Say so in §8 if the reason is interesting.
- **`WON'T DO` is a real outcome and should be encouraged.** Raheem starts many things; the
  guide's job is to let him close them deliberately rather than leave them as invisible debt.
- **Update the counts** in the section header and in each category heading.

**Verify before you write.** If you're citing `file:line`, open it and confirm it still says
what you claim. A backlog that lies is worse than no backlog.

---

## Step 5 — Append to the decision log (§8)

Newest first. Append-only — **never rewrite or delete a past entry**, even a wrong one. If a
decision reverses, that's a new entry that references the old one. The value of this section
is that it accumulates Raheem's actual reasoning over time.

Each entry:

```markdown
### YYYY-MM-DD — <the decision, as a short sentence>

<What was decided, in plain language.>

*Why it matters:* / *What it closed:* <the consequence — what this makes possible,
prevents, or unblocks.>
```

**Six to ten lines. Hard ceiling.** Measured on 2026-08-14, §8 held 80 entries written over
14 days at an average of 18 lines each — 1,429 lines, 43% of the whole file, for a fortnight of
work. Nothing was archived to fix that because nothing was old enough to archive; the log was
simply too verbose and too eager.

An entry earns its length by recording **a decision and the reasoning behind it.** It does not
need the narrative of how the session arrived there, what was tried first, or how the code
works — the commit history has all three. If an entry is running long, the excess is almost
always retelling rather than reasoning.

**One entry per decision, not one per session.** A session that settles three things writes
three short entries; a session that settles nothing writes none.

**Record disagreements, including mine.** The warn-vs-block entry names Raheem's ruling and
my reservation and the condition that would reopen it. That honesty is what makes the log
worth reading later — and it fits comfortably in ten lines.

**When Raheem overrules a recommendation, that is always an entry.** His reasoning is the
most valuable thing this file collects.

---

## Step 6 — Ideas vs. commitments (§9)

Raheem thinks out loud, and sorting that is a stated need. Something goes in §9 — *Ideas
raised, not committed* — when it was said but not promised. It moves out of §9 only when he
commits to it, and then it becomes a §3 row or a §4 thread.

**Never silently promote an idea to a plan.** Ask.

---

## Step 7 — Stamp it

Update the `<!-- updated: YYYY-MM-DD -->` marker on every section you touched, and the
`**Last updated:**` line at the top. That is all.

**Do not regenerate or republish the standalone Production Guide.** Raheem retired it on
2026-08-07: the Studio Wiki reads `PRODUCTION.md` directly and redeploys on its own, so
`PRODUCTION.md` is the single source and the Wiki is the single door.

The reason is worth keeping, because it is the failure this whole file exists to avoid: two
published artifacts were both named "Card Engine — Production Guide" and nobody could say
which one was the bookmarked copy. A republish had a real chance of updating the one nobody
read, leaving the record quietly disagreeing with itself.

`scripts/production-page/build.mjs` and the last `docs/production/production.html` still
exist and are unused — tracked in §4 Doc drift until Raheem decides whether to delete them.

---

## Step 8 — Tell Raheem what moved

One short message, not a changelog. What changed in §0, what got decided, what's now waiting
on him. He should be able to skip opening the page and still know.

---

## Writing rules

**The audience is the next session, and Raheem if he chooses to look.** Tori was named as a
second reader until 2026-08-14; she is not one now, and nothing should be written to suit her.
Raheem's own words: *"No one is actually reading it… that should be useful to you, the game,
and functioning."*

Write for a cold start, then. Assume the reader knows the codebase but remembers nothing about
this project's history — because that is literally true of the next session. Concretely: name
the file path, give the exact value, say what was ruled out and why. Persuasive framing aimed
at a human is wasted; **§0 is the one section still written for Raheem**, since it is the only
one he is asked to act on.

**Plain language, active voice, no hedging.** "The tower gates the game" beats "the tower is
intended to function as a gating mechanism."

**Never claim certainty you don't have.** If you're unsure whether something works, the
guide says so. Saying "unverified" costs nothing; being caught wrong costs the whole file.
