---
name: production-log
description: Update PRODUCTION.md and republish the production guide after work lands, a decision gets made, or a question needs Raheem's ruling. Refreshes the recommendations, moves status entries, opens or closes threads, appends a dated decision-log entry, regenerates the HTML page and redeploys it to the same URL. Use at the end of any session that shipped something, decided something, or raised something — and whenever the pre-push freshness warning fires. Do NOT use for routine doc edits that carry no decision (that's sync-project-knowledge), or to record work that is not actually finished.
---

# Skill: production-log

`PRODUCTION.md` is the brain and the map — the durable record of what Raheem and I decided,
why, and what is still open. Before it existed, that record evaporated when a chat session
ended. This skill is how it stays true.

**Its only real enemy is inaccuracy.** If the guide claims something shipped that didn't,
Raheem stops trusting it and it dies exactly the way `WORKFLOW.md`'s status section died.
Every rule below serves that one goal.

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

If none apply, **stop.** A no-op update that bumps the date is worse than no update: it
teaches the reader that the date means nothing.

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

**Record disagreements, including mine.** The warn-vs-block entry names Raheem's ruling and
my reservation and the condition that would reopen it. That honesty is what makes the log
worth reading later.

**When Raheem overrules a recommendation, that is always an entry.** His reasoning is the
most valuable thing this file collects.

---

## Step 6 — Ideas vs. commitments (§9)

Raheem thinks out loud, and sorting that is a stated need. Something goes in §9 — *Ideas
raised, not committed* — when it was said but not promised. It moves out of §9 only when he
commits to it, and then it becomes a §3 row or a §4 thread.

**Never silently promote an idea to a plan.** Ask.

---

## Step 7 — Stamp only

1. Update the `<!-- updated: YYYY-MM-DD -->` marker on every section you touched, and the
   `**Last updated:**` line at the top.
2. **Stop there.**

> ### The generated page is RETIRED — do not publish it
>
> Raheem, 2026-08-04: *"The production guide that you linked is obsolete and has been
> retired. You should retire that link. Don't update it anymore. We are updating the wiki.
> There's a wiki for this entire game. That is what we update when we make changes."*
>
> So this skill no longer runs `npm run production:page`, no longer publishes
> `docs/production/production.html`, and never links the old artifact. **The Studio Wiki
> reads `PRODUCTION.md` directly and redeploys itself** — keeping a second generated copy
> meant two versions of the truth and a manual step that would be skipped, which is exactly
> what Q8 in §0 had been asking about for weeks.
>
> `PRODUCTION.md` itself is still the record and still gets updated. Only the generated HTML
> and its artifact link are dead.

---

## Step 8 — Tell Raheem what moved

One short message, not a changelog. What changed in §0, what got decided, what's now waiting
on him. He should be able to skip opening the page and still know.

---

## Writing rules

**Audience is Raheem and Tori.** Tori is a lore director who did not write the code and does
not read markdown. In the reading sections (§0, §1, §5, §8, §9) explain any file path or
piece of jargon in plain language, or leave it out. The reference sections (§2, §3, §4, §6,
§7) may be denser — they're consulted, not read.

**Plain language, active voice, no hedging.** "The tower gates the game" beats "the tower is
intended to function as a gating mechanism."

**Never claim certainty you don't have.** If you're unsure whether something works, the
guide says so. Saying "unverified" costs nothing; being caught wrong costs the whole file.
