# Card Engine — Production Guide

> **This is the brain and the map.** What the game is, what's in flight, what got started and
> abandoned, and why every decision was made. Read by Raheem and Tori.
>
> **It is not an ops tool.** The admin dashboard owns live numbers — spend, balances, card
> counts, moderation queues. This owns the record of the work: what we decided, why, and
> what's still open. That record used to evaporate when a chat session ended.

**Last updated:** 2026-07-31 · **Maintained by:** Claude, every session · **Source:** `PRODUCTION.md`

---

## Contents

The guide is in two parts. **Infrastructure** is how the project is built and run.
**Game Mechanics** is how the game itself works.

**Infrastructure**

| | Section | What it answers |
|---|---|---|
| 0 | [What I'd work on next](#0-what-id-work-on-next) | What should I do today? |
| 1 | [What this game is](#1-what-this-game-is) | What are we actually making? |
| 2 | [The map](#2-the-map) | How is it built? |
| 3 | [Status board](#3-status-board) | What state is everything in? |
| 4 | [Open threads](#4-open-threads) | What did we start and not finish? |
| 5 | [How work travels](#5-how-work-travels) | Why is Claude doing that? |
| 6 | [The workshops](#6-the-workshops) | What can we step aside and work on? |
| 7 | [Money and rules](#7-money-and-rules) | What can't be changed without approval? |
| 8 | [Decision log](#8-decision-log) | Why did we do it that way? |
| 9 | [Ideas raised, not committed](#9-ideas-raised-not-committed) | What did we say out loud but not promise? |

**Game Mechanics** — how the game itself works.

| | Section | What it answers |
|---|---|---|
| 1 | [How the game works](#1-how-the-game-works) | Archetypes, elements, mana vs tech |
| 2 | [What we still need to decide](#2-what-we-still-need-to-decide) | What is the game waiting on us for? |

---

# Infrastructure

<!-- updated: 2026-07-31 -->
## 0. What I'd work on next

*My recommendations, refreshed every session. Yours to overrule — and when you do, I record
why in the decision log.*

### ▲ Highest value — open one castle stall

Four stalls in the courtyard say *"not yet connected."* The castle is the hub your entire
design rests on, and right now it's a beautiful room with four doors that go nowhere.

Wiring **the tower gate to the real boss battle** is the smallest change with the biggest
felt difference: it turns the castle from a demo into the thing you described — a place you
hang out before you go somewhere. Everything else in the hub-and-doors model follows the
same pattern, so the first one establishes it.

*Where:* `card-engine/src/pages/castle/courtyard/stalls.ts:60`

### ◆ Decide, don't build — how long is the tower?

The tower gates the whole game. It has no defined length. Two bosses exist.

Until there's a number, nobody — including you — can tell whether the tower is nearly done
or barely started, and I can't tell you how much work is left before the gate opens. This
costs nothing to decide and unblocks all planning behind it.

*Needs:* a ruling from you, ideally with `game-systems-designer` consulted on pacing.

### ○ Cheap win — delete 17 dead branches

All 17 are fully merged into `main`. Git keeps every commit; the branch labels carry no
information and actively mislead — your branch list currently suggests 20 things in flight
when the real number is 3.

*Five minutes. Safe. See [§4 stranded branches](#stranded-branches).*

### ⚠ Risk worth naming — the Still Season is uncommitted

An entire boss and arena — sprites, clips, signature layers, arena plate, configs, two new
manifests — is sitting on the working tree, unstaged. It represents days of work and real
generation spend, and it exists in exactly one place: your laptop.

*Commit it.*

---

### Questions for you

*Things I'm blocked on or want a ruling about. These persist here until answered, instead of
being raised in a chat and lost.*

| # | Question | Why it matters |
|---|---|---|
| Q1 | How many floors does the tower have? | Gates all planning behind it. See above. |
| Q2 | Is `feat/warband-battle-mvp` worth reviving, or should the board game be rebuilt fresh? | A tested combat core is stranded 107 commits back. I can assess it if you want. |
| Q3 | Does the Lycanthrope emblem ever get made? | It's the only one of 11 missing, and it's been pending since 2026-07-17. |
| Q4 | Is `human.png` acceptable to ship, or does it block? | The shipped sprite violates all four of its own art rules and is knowingly a placeholder. |
| Q5 | Should `.claude/hooks/` be tracked in git? | `.gitignore` excludes them, so the build check and the freshness warning live only on your laptop. Nobody else gets either. |

---

<!-- updated: 2026-07-31 -->
## 1. What this game is

> **Card Engine is an adventure game with characters you made yourself.**

Yu-Gi-Oh, Pokémon, and fantasy adventure — built by someone who grew up on those and finally
gets to make his own.

**The card is the format a character comes in. It is not the point.** Everything about how
this is built follows from that sentence. It's why the forge is a ritual and not a slot
machine, and why identity fields are locked so advancement can never make someone younger,
thinner, or less disabled.

### The shape: a hub with doors

The courtyard isn't a menu. It's where you hang out before you go somewhere. **Every game
mode is a door off it.**

- **The tower** — boss battles. The main feature.
- **The board game** — a TCG-style match you take leveled characters into.
- **The mine** — dig for Gold and secret lore.
- **More later** — the point of the shape is that it accepts new doors.

The four placeholder stalls are unbuilt doors, not bugs.

### The tower is the gate

Beating the tower unlocks the rest of the game. Players stay in the castle with their
characters until they do.

**This is a production decision, not a fiction one — it buys time to build what comes after.**
Recorded here explicitly so that in six months nobody mistakes it for lore and designs around
a constraint that only ever existed to protect a schedule.

### The modes unlock each other

This is what makes it one game instead of a menu of minigames:

```
        THE TOWER  ──────────►  levels your cards
            ▲                        │
            │                        ▼
   opens more floors  ◄────  BATTLE REAL PLAYERS
            ▲                        │
            │                        ▼
            └──── secret lore ◄── THE MINE
```

Things you can only get from bosses. Things you can only get from PvP. Things you can only
find in the mine. Each mode is the key to another.

### Priorities, in order

1. **Make it fun as a single-player game.** Everything else waits on this.
2. Then the shared courtyard (3–5 people, presence not co-op).
3. Then cosmetics — the visible payoff of gathering somewhere.

---

<!-- updated: 2026-07-31 -->
## 2. The map

*How the game is actually built. Aimed at making you fluent in your own codebase.*

### The forge — where characters come from

```
archetype  →  dice roll  →  story pillars  →  element + bond
                                    │
                                    ▼
                        identityRoller  (code rolls the person:
                                         body, age, sex, ancestry)
                                    │
                                    ▼
                         Leonardo  →  the portrait
                                    │
                                    ▼
                          Claude  →  lore written to match the image
```

**Image-first, since 2026-07-24.** Code rolls who the person is, the portrait is assembled
from that, and the writing is made to fit the picture. Before this, Claude wrote first and
the art followed — which produced a heavy skew toward young slim women. Rolling identity in
code killed it.

Story Pillar answers are **immutable generation facts**. They never change, at any rank.

*Lives in:* `src/pages/CardForge.tsx` · `src/services/imageEngine/identityRoller.ts` ·
`src/services/portraitAssembler.ts` · `src/services/claudeApi.ts` · `src/services/leonardoApi.ts`

### Combat — the tower

```
boss declares intent  →  you see a telegraph  →  party acts  →  boss acts
        │                       │
        │                       └── windup clip + signature layer
        │                           (different colour per attack)
        ▼
  pure reducer, seeded RNG, snapshot-immutable ability resolution
```

The reducer is **pure and deterministic** — same seed, same fight, every time. That's what
lets a 5000-run headless simulator check balance without playing anything.

**Cards are the characters on the field.** Hero cards replaced floor sprites.

*Lives in:* `src/services/combat/reducer.ts` · `src/pages/battle/` ·
`src/data/combat/*Manifest.ts`

### The castle — the hub

A painted, non-scrolling top-down courtyard in Phaser 3. Fixed cover-scaled camera, WASD
walking, feet-anchored colliders traced onto the plate. Four stalls, all placeholders.

Deliberately kept out of the main nav — a player reaching it today would find four dead ends.

*Lives in:* `src/pages/castle/` — `courtyard/layout.ts` derives the canvas size and is
load-bearing, not arbitrary.

### The economy — two currencies

| | Forge Crystals (premium) | Gold (gameplay) |
|---|---|---|
| How you get it | **Purchase only** | Earned by playing |
| What it pays for | AI generation — forging, art regeneration | Progression, sinks, upgrades |
| Why | Each generation costs real money | Costs nothing to mint |

**This split is load-bearing.** Crystals map to actual Leonardo and Claude spend. If they
could be earned, players would generate art for free and the bill would land on you.

*Lives in:* `src/data/economy/` (catalogs — no component hardcodes a price) ·
`src/services/economy/walletService.ts`

### Where the money goes

Every paid provider call routes through a server-side Vercel function under
`card-engine/api/`. **No provider key ever reaches the browser.** Every call writes an
`api_usage_events` row, which is what `/admin/costs` reads.

---

<!-- updated: 2026-07-31 -->
## 3. Status board

**Vocabulary — one set of words, no exceptions:**
`SHIPPED` · `IN FLIGHT` · `PARKED` · `PLANNED` · `WON'T DO`

| State | Workstream | Where it stands |
|---|---|---|
| SHIPPED | The forge | Image-first pipeline, 11 archetypes, Bible-driven generation |
| SHIPPED | Collection + card detail | Grid, filters, tier-up, evolution history |
| SHIPPED | Ability system | Typed catalogs, power budget validator, discovery rewards, codex |
| SHIPPED | Persistence + auth + admin | Supabase, RLS, anonymous→email upgrade, admin RBAC |
| SHIPPED | Admin dashboard | 8 routes; all provider secrets server-side |
| SHIPPED | Economy (prototype) | Two currencies, catalog-driven, Supabase-backed |
| SHIPPED | Seraph corruption arc | Alignment axis, Infernal transmutation, Resist the Fall |
| IN FLIGHT | Boss battles | 2 bosses. **Still Season is uncommitted** — see §0 |
| IN FLIGHT | Castle courtyard | Walkable and lovely. **All 4 stalls unwired** |
| IN FLIGHT | Art harnesses + skills | `create-arena` / `create-boss` / `create-prop` written, uncommitted |
| PARKED | Board game / warband | Draft doc with open questions; branch 107 commits stale |
| PARKED | Boss art polish | Deferred pending art-direction alignment — though Still Season is doing it anyway |
| PLANNED | The tower (as a structure) | Two bosses exist; **length undecided** |
| PLANNED | The mine | Gold only. Not designed |
| PLANNED | Multiplayer courtyard | After the tower. Needs Supabase Realtime |
| PLANNED | Cosmetics | After multiplayer. Intersects the Fashion Bible |
| PLANNED | Payments / real money | Blocked on economy plan §9 security prerequisites |
| PLANNED | PvP battles + trading | Not started |

### Branches with live work

Only three. Everything else is merged.

| Branch | Ahead | Behind | What's on it |
|---|---|---|---|
| `combat-cards-and-resource` | 2 | 2 | Current. Boss readout + Debt-Bearer fix |
| `feat/warband-battle-mvp` | 1 | 107 | Tested warband combat core. Stranded |
| `claude/vigilant-kowalevski-e30267` | 1 | 126 | One Workshop fix. Will conflict if revived |

---

<!-- updated: 2026-07-31 -->
## 4. Open threads

**49 things started and not finished.** This is the list that didn't exist before. It will
feel like a lot the first time. That's the point — and marking something `WON'T DO` is a
legitimate, encouraged way to close it.

### Castle wiring — 4 items

The hub exists; nothing behind it does.

| What | Where |
|---|---|
| Tower gate opens a placeholder, not boss battles | `courtyard/stalls.ts:60` |
| Forge stall opens a placeholder, not the Forge | `courtyard/stalls.ts:69` |
| Collection stall opens a placeholder | `courtyard/stalls.ts:78` |
| Minigames stall opens a placeholder | `courtyard/stalls.ts:95` |

*Also:* castle is held out of the main nav until these open (`components/nav/navConfig.ts:20`);
phone-portrait support is deferred pending its own crop of the art
(`courtyard/layout.ts`); two keeper/stall entries have empty placeholder copy.

### Combat gaps — 7 items

| What | Where |
|---|---|
| Auto-battle is a disabled stub the UI still shows | `battle/mobile/MobileActionControls.tsx:14` |
| Multi-enemy combat deliberately out of scope | `services/combat/reducer.ts:59` |
| `summon_exists` condition can never evaluate true | `services/combat/reducer.ts:1938` |
| Twilight dual-cast typed but never read by the reducer | `types/abilities.ts:501` |
| Attack VFX needs its own follow-up pass | `battle/AttackVFX.tsx:49` |
| Crit / dodge / miss deferred beyond B7 | boss battle spec §15 |
| Server-authoritative combat validation deferred | boss battle spec §15 |

### Placeholder art — 9 items

| What | Where |
|---|---|
| Shipped `human.png` violates all four of its own art rules | `SHOPKEEPER_GUIDE.md:75` |
| Chibi hero is temporary, to be regenerated at final fidelity | `SHOPKEEPER_GUIDE.md:11` |
| Lycanthrope emblem still pending — 10 of 11 approved | emblem library |
| Ability art falls back to a family-tinted placeholder tile | `data/abilities/visualManifest.ts:23` |
| Effect manifest still `approvalStatus: 'placeholder'` | `data/combat/effectManifest.ts:16` |
| Forge Strike has no real audio | `minigames/forge-strike/ForgeStrikeViewport.tsx:313` |
| Pre-Gate-7A accounts carry stale placeholder art rows | `components/PersistenceGate.tsx:81` |
| Emberborn Wraith clips are all 1-frame stills | `data/combat/bossSpriteManifest.ts` |
| Retired C5 placeholder boss still in seed data | `data/bosses/seedBosses.ts:31` |

### Deferred systems — 12 items

| What | Where |
|---|---|
| Rare elements locked behind an unbuilt narrative-eligibility gate | `data/elements.ts:60` |
| Craft slot ritual — a deferred systems item | `data/elements.ts:120` |
| Forge Strike temper reward decision unmade | `minigames/forge-strike/temper.ts:12` |
| Rank-sum-cap trade-demotion UI (needs minigames to drive it) | CLAUDE.md |
| Promotion / demotion flow | deferred to Phase 3/4 |
| Very Low difficulty modifier | deferred to Phase 3/4 |
| Tech vs organic combat modifier | deferred to Phase 3/4 |
| Card deletion in admin | `pages/AdminCards.tsx:23` |
| Wallet "buy more" is a placeholder for the purchase flow | `components/economy/WalletPopover.tsx:15` |
| `Card Images/` sources never wired into the pipeline | CLAUDE.md |
| `balance-playtest` skill is a scaffold that can't run | `.claude/skills/balance-playtest/` |
| Dice roll animation is CSS 3D cubes — works, never polished | `components/DiceRoll.tsx` |

### Art prompting debt — 3 items

| What | Where |
|---|---|
| Weapon prompts aren't calling-aware — the Infiltrator kept getting a mace | `LEONARDO_PLAYBOOK.md:131` |
| Infiltrator camo needs an assembler hook for the real environment surface | `LEONARDO_PLAYBOOK.md:141` |
| 21 of 26 elements never rewritten from the visual matrix | `LEONARDO_PLAYBOOK.md:236` |

### Workshop tooling — 7 items

Found while writing §6. Every one of these is a tool that exists and doesn't fully work.

| What | Where |
|---|---|
| Boss frame box is `179.2857…×189` — non-integer, so the boss resizes when clips switch | `data/combat/bossSpriteManifest.ts` (debt-bearer) |
| `sprite-lab.mjs sheet` crashes on **every** subject — reads `f.trail` and no manifest in the repo has it | `scripts/sprite-lab/sprite-lab.mjs:794` |
| Arena gallery renders mojibake — the generated HTML declares no charset | `scripts/bg-harness/harness.mjs` (`cmdSheet`, no `<meta charset>`) |
| Arena gallery prints `style-ref · undefined` — reads `st.strength`, which arena configs never set | `scripts/bg-harness/harness.mjs:242` |
| Arena gallery lede is hardcoded Druid forge copy ("one grove, remembered and corrupted") — wrong for every arena | `scripts/bg-harness/harness.mjs` (`cmdSheet`) |
| No ability, lore or balance readout — three engines with no window | see §6 |
| Prompt Lab has no screenshot in the guide (admin-gated, uncapturable) | §6 Card image workshop |

### Doc drift — 5 items

| What | Where |
|---|---|
| `arenaManifest` header says "placeholder rows only"; every row is approved | `data/combat/arenaManifest.ts:7` |
| `combat/types.ts` carries the same stale C5 claim | `data/combat/types.ts:4` |
| Dangling `dressing.throne` reference to a dropped asset | `ARENA_HANDOFF_still-season.md` |
| Proposals page still carries the retired A/B/C/D layer tags in its DB column and payload | `data/archetypeLayers.ts` — UI cleaned 2026-07-31, migration pending |
| Admin plan claims Phases 0–7 complete but lists unshipped items | admin plan §§496, 572, 759 |

### Stranded branches — 3 items {#stranded-branches}

| What | State |
|---|---|
| `feat/warband-battle-mvp` — tested combat core | 1 ahead, 107 behind |
| `claude/vigilant-kowalevski-e30267` — Workshop fix | 1 ahead, 126 behind |
| 17 fully-merged branches never deleted | Safe to delete; git retains every commit |

---

<!-- updated: 2026-07-31 -->
## 5. How work travels

*This section exists to answer "why is Claude doing that."*

```
  YOU HAVE AN IDEA
        │
        ▼
  design-feature ─────► consults a specialist
        │               (lore / art / systems / architecture)
        ▼
  ╔═══════════════╗
  ║ YOUR APPROVAL ║  ◄── gate 1: is this the right thing?
  ╚═══════════════╝
        │
        ▼
  ship-approved-plan ──► branch, build, commit
        │
        ▼
  verify ─────────────► drive the real thing, screenshot it
        │
        ▼
  ╔═══════════════╗
  ║ YOUR APPROVAL ║  ◄── gate 2: is it actually good?
  ╚═══════════════╝
        │
        ▼
  push ───────────────► hook runs npm run build
                        + warns if this guide is stale
```

### When I interrupt you

Five categories, and only these:

1. **Gameplay or product decisions** — what the game should be
2. **Destructive actions** — deleting, overwriting, force-pushing
3. **Credentials and paid services** — anything that spends money
4. **Visual and playtest judgment** — does this look right, does it feel right
5. **Economy** — any price, reward, bundle, or exchange rule

### When I don't

Renames, bug fixes, refactors, doc updates, test writing, file organization. If it's
reversible and inside an approved direction, I just do it.

---

<!-- updated: 2026-07-31 -->
## 6. The workshops

**A workshop is a day you can step into.** Not a tool — a *way of working*. Pick one, say
the starting line, and we spend the session on that one thing with the right tools already
loaded.

These exist and get forgotten. That's the whole reason this section is here.

Every workshop needs three legs: something to **make** with, a **window** to see the result,
and a **skill** that runs the day. Where a leg is missing, it says so.

| Workshop | State |
|---|---|
| [Boss](#boss-workshop) | Equipped — the best-tooled surface in the project |
| [Arena](#arena-workshop) | Equipped |
| [Sprite & prop](#sprite--prop-workshop) | Partial — the contact sheet is broken |
| [Card image](#card-image-workshop) | Partial — the only window costs money every look |
| [Ability](#ability-workshop) | Not built |
| [Card lore](#card-lore-workshop) | Not built |
| [Balance](#balance-workshop) | Not built |

> **The pattern worth seeing:** the art workshops are fully equipped. The systems
> workshops — abilities, lore, balance — all have working engines with **no window in front
> of them**. `runBatch()` can fight 5,000 deterministic battles and its only consumers are
> test files. `powerBudget.ts` scores every ability and no page displays the score. That's
> why boss work feels good and ability work doesn't. It isn't discipline. It's windows.

### Boss workshop {#boss-workshop}

**A day here:** generate a boss's clips, watch them play at real speed, then measure whether
his signature move actually matters in a fight.

`EQUIPPED` — make: `sprite-lab` · see: clip sheet + `/dev/boss-readout` · run: `create-boss`

![The Debt-Bearer's seven packed clips — idle, wind-up, smash, hit, ablaze, ultimate, defeat. The clip sheet plays these at their real cadence rather than showing stills, because every animation defect this project has shipped was found by watching motion.](screenshots/workshop-boss.png)

The **clip sheet** (`boss-sheet.mjs`) plays the packed strips at their real fps — 3fps idle,
11fps attack — because stills can't catch a hero who shrinks or faces the wrong way. It also
checks frame geometry, and **it is failing right now**: the Debt-Bearer's shared frame box is
`179.2857…×189`, not a whole number, so he changes size when clips switch. See §4.

The **readout** (`/dev/boss-readout`) fights the boss 300 times through the real reducer and
reports which moves actually did damage, who he hits, and how each combat line fares. It's
how we found that the Debt-Bearer's ultimate was dealing 1.1% of his damage and killing nobody.

> **Start:** Let's run the Boss workshop on the Still Season

### Arena workshop {#arena-workshop}

**A day here:** paint a place, compare candidates side by side, and finish the winner without
re-rolling the look.

`EQUIPPED` — make: `bg-harness` · see: `harness.mjs sheet` gallery · run: `create-arena`

![Three candidate plates for the Debt-Bearer's moot-ground, compared as the gallery shows them. The anchor is marked BASE; siblings are style-referenced to it so the set stays one painting while each state still changes.](screenshots/workshop-arena.png)

The gallery groups candidates by tonal family and labels each as anchor or style-referenced,
so you can see what a plate was generated *against*. Finishing is deterministic and free —
`finish_arena.py` crops, grades and pixelizes without spending another generation.

Two defects in the gallery today: the page has no charset declaration so em-dashes render as
mojibake, and the style-ref strength prints as `undefined`. Both in §4.

> **Start:** Let's run the Arena workshop on tower floor 3

### Sprite & prop workshop {#sprite--prop-workshop}

**A day here:** generate a character or object, prove the walk cycle is right, and mount it
in a real scene.

`PARTIAL` — make: `sprite-lab` ✅ · see: `/dev/sprite-preview` ✅, **contact sheet broken** ·
run: `create-character-sprite`, `create-prop`, `place-character-in-scene`

![Four walk frames of the dwarf keeper, the kind of sequence a contact sheet exists to show. The sprite-lab sheet command that should render this crashes on every subject in the repo.](screenshots/workshop-sprite.png)

`/dev/sprite-preview` mounts a sprite in the **real** `BossStage` with the real VFX, so what
you judge is what ships. That part works well.

**`sprite-lab.mjs sheet` is broken for every subject** — it reads a `trail` field that no
manifest in the repo has. It was believed to fail only on boss manifests; it fails on all of
them. Newly found, logged in §4.

> **Start:** Let's run the Sprite workshop on the shopkeeper

### Card image workshop {#card-image-workshop}

**A day here:** change how portraits get assembled, then look at the same character across
Foundation, Forged and Ascendant to see whether they're still the same person.

`PARTIAL` — make: `imageEngine` + `portraitAssembler` · see: `/admin/prompt-lab` (**paid**) ·
run: `art-pipeline`

Prompt Lab is genuinely good — real Story Pillar questions, real element gating, three tiers
side by side. But **every comparison spends real money**, and there's no free replay of past
runs the way the arena gallery re-reads a manifest for nothing. That's the gap.

*No screenshot: the page is behind admin auth and I can't capture it. Adding one is a §4 thread.*

> **Start:** Let's run the Card image workshop on the Vampire

### Ability workshop {#ability-workshop}

**A day here would be:** look at every ability's power score against its band, see which ones
actually get used in simulated fights, and tune the outliers.

`NOT BUILT` — make: in-app only, no harness · see: **nothing** · run: **no skill**

`/dev/abilities` exists but shows UI *states* — what a tile looks like when selected or on
cooldown. It says nothing about whether an ability is good.

**What's already there and unused:** `powerBudget.ts` computes a real score for every
ability and calls itself "provisional pending playtest data" — data the simulator can
already produce. Nothing displays it.

**To build it:** a readout modeled on `/dev/boss-readout`, reusing `runBatch()` and the
power-budget scores. The boss version is ~500 lines and already proves the pattern.

### Card lore workshop {#card-lore-workshop}

**A day here would be:** run one prompt change across ten archetypes and read the names and
lore side by side to see whether the writing got better.

`NOT BUILT` — make: `claudeApi.ts` ✅ · see: **nothing** · run: **no skill**

Generated lore is only ever seen incidentally, one card at a time, on a card face. There is
no way to compare twenty names, diff a prompt edit before and after, or browse past output.
Lore is the least inspectable engine in the project.

**To build it:** a sheet in the `harness.mjs sheet` mould — generate across archetypes, write
an HTML page, read it. Cheaper than the ability readout since text needs no packing or art.

### Balance workshop {#balance-workshop}

**A day here would be:** run five thousand fights and look at the distribution — win rates by
combat line, which party compositions are dead ends, where the difficulty actually sits.

`NOT BUILT` — make: `runBatch()` ✅ · see: **nothing** · run: `balance-playtest` is an inert scaffold

`runBatch()` is real, seeded and deterministic. Its only consumers are test files, so all
that simulation collapses into a green checkmark nobody reads. `/dev/boss-readout` already
proves it can be surfaced beautifully — but only for one boss at a time.

The `balance-playtest` skill is gated behind five unmet telemetry conditions and **never
mentions the simulator it could be using today**.

---

## The studio

### Specialists — consulted before work, never editing files

| Agent | Owns | Exists to prevent |
|---|---|---|
| `lore-fantasy-director` | Bible canon, archetype identity, elements, prestige | Two archetypes colliding; identity changed without its Bible chapter |
| `art-prompt-director` | Card portraits, emblems, the image engine, modesty rules | Character drift across ranks; emblem palettes that collide |
| `environment-art-director` | Arenas, plates, props, scene layers | Paid rounds spent fighting a sky that was a framing problem |
| `pixel-sprite-director` | Sprite generation, direction mapping, packing, the gate | Heroes who shrink, walk backwards, or change costume mid-stride |
| `game-systems-designer` | Stats, ranks, balance, prices, power budgets | Numbers set from vibes that violate economy §13 |
| `ui-ux-director` | New pages, flows, mobile behavior | Surfaces that ship without a mobile story |
| `technical-architect` | Schemas, tables, RLS, API routes, integrations | Archetype-specific fields in shared schemas; leaked provider keys |
| `minigame-designer` | Mini-game loops, session length, reward feel | — |

### Skills — repeatable workflows

**Art and assets:** `create-arena` · `create-boss` · `create-prop` ·
`create-character-sprite` · `place-character-in-scene` · `trace-environment` ·
`art-pipeline` · `design-archetype-emblem`

**Design and delivery:** `design-feature` · `ship-approved-plan` · `design-minigame` ·
`ship-minigame` · `create-archetype` · `work-proposal` · `consult-specialist`

**Upkeep:** `production-log` · `sync-project-knowledge` · `audit-project-knowledge` ·
`extract-fullscreen-shell` · `balance-playtest` *(scaffold)*

### Tools and readouts

Every harness, library script, review sheet and registration point is catalogued in
**[HARNESS_INDEX.md](HARNESS_INDEX.md)**. Standing rule: I name the relevant tools before
starting any art, boss, arena, sprite or prop work — never wait to be asked.

The short version:

| Tool | What it does |
|---|---|
| `bg-harness` | Environments and plates via Leonardo. 7 configs |
| `sprite-lab` | Characters, bosses, props via PixelLab. 8 configs |
| `boss-sheet.mjs` | Plays packed boss clips at real fps — motion review |
| `/dev/boss-readout` | Measures the fight: beats, damage, telegraph timing |
| `finish_arena.py` | Deterministic arena finishing — crop, grade, pixelize |

---

<!-- updated: 2026-07-31 -->
## 7. Money and rules

*Rules and constraints only. For live spend and balances, use `/admin/costs` — it's the
system of record and this guide doesn't duplicate it.*

### Governance — needs Raheem's explicit approval to change

From [economy plan §13](card-engine-economy-currency-system-plan.md), which is binding:

- Player-facing prices
- Reward values
- Bundle contents and values
- Starting balances
- Exchange rules, caps, refunds
- What consumes currency

No component hardcodes a price. Everything reads from `src/data/economy/` catalogs.

### Why Forge Crystals are purchase-only

Each forge spends real money at Leonardo and Anthropic. Crystals are the player-facing
representation of that cost. If they could be earned, the generation bill would be unbounded
and land on you.

**This is why the mine yields Gold, not Crystals.** *(Decided 2026-07-31 — see §8.)*

### What blocks real money

Real-money bundle sales are **not safe to ship** until economy plan §9 lands:

- Server-authoritative wallet — the client JWT is currently trusted
- Receipt verification
- Idempotency keys

Do not proceed without these.

### Security posture

Every paid provider call goes through a server-side function under `card-engine/api/`, JWT-
gated, with method and path allowlists. `PIXELLAB_API_KEY` is **build-time only** and no
runtime code reads it. Every call writes an `api_usage_events` row.

---

<!-- updated: 2026-07-31 -->
## 8. Decision log

*Why, not just what. Newest first. This section is append-only.*

### 2026-07-31 — This guide is linked from the admin sidebar

A **Studio → Production Guide** item now sits in the admin nav for **both admins and lore
directors**, opening this page in a new tab. Nobody has to remember or bookmark the URL.

*Why a link and not a page:* one source, one page, two doors. Rebuilding this inside the app
would mean two things to keep in sync, and the admin dashboard already owns live data — this
owns the record of the work.

### 2026-07-31 — Workshops are a thing, and they get a section

The harnesses were beautiful and forgotten. §6 now names seven of them as *days you can step
into*, with a copyable starting line each.

*What it revealed:* the art workshops are fully equipped and the systems workshops —
abilities, lore, balance — are engines with no windows. `runBatch()` fights 5,000
deterministic battles and only ever produces a green checkmark in a test file.
`powerBudget.ts` scores every ability and nothing displays it. **No new harnesses were built
in this pass** (Raheem's call) — the gaps are now visible and choosable instead.

### 2026-07-31 — The Archetype Workshop is now Proposals

`/admin/workshop` → `/admin/proposals`, with the old path redirecting *and preserving its
query string* so Tori's bookmarks to a specific proposal still land on it.

*Why:* the page is a proposal desk, and "Workshop" now means something else. Two similar
words for different things was itself the confusion.

### 2026-07-31 — The A/B/C/D layers are retired from the UI

The Proposals page spoke three vocabularies at once — engines, areas, and legacy layers — and
the layers had rotted: **B was unreachable** (orphaned by the 2026-07-21 decoupling, yet
rendered as a permanent empty "no change" row), **D was overloaded** across both engines, and
**D's description was factually false** — it claimed Claude composes the image prompt when
assembly is deterministic and never sees the lore.

*What it closed:* the page now shows only what actually changed. The database column and
payload keys are untouched — that migration touches live rows and is its own pass, logged
in §4.

### 2026-07-31 — This game is not a card game

Established in conversation: **an adventure game with characters you made yourself**, in the
lineage of Yu-Gi-Oh, Pokémon and fantasy adventure. The card is the format, not the purpose.

Every doc previously opened with "a collectible fantasy card game," which described the
format as if it were the point. Corrected in `CLAUDE.md`.

*Why it matters:* it changes what "done" means for every system. A card that's a good stat
block but a forgettable person is a failure, not a success.

### 2026-07-31 — The tower gates the game, for production reasons

Players stay in the castle until the tower is beaten. The gate exists to **buy time to build
the adventures that come after it**.

*Why it's recorded:* it's a schedule decision wearing fiction's clothes. Without this note,
someone later treats it as canon and designs around a constraint that was only ever a
runway.

### 2026-07-31 — Mining yields Gold, never Forge Crystals

Crystals fund real API spend. Mineable Crystals means free art generation and an unbounded
bill.

*What it closed:* protects economy plan §13 with no amendment needed. The mine can still be
built; it just pays in Gold.

### 2026-07-31 — Multiplayer and cosmetics wait for fun

Single-player has to be good first. The shared courtyard (3–5 people, presence not co-op) and
cosmetic unlocks are both real intentions, both later.

*What it closed:* logged so architecture never forecloses them — particularly how player
state is stored, which gets expensive to reverse.

### 2026-07-31 — The board game is the warband design

`card-engine-warband-battle-design.md` describes the same thing as "a TCG-style board game
you take leveled characters into." Revive rather than rewrite: reconcile the draft, resolve
its open questions, assess the stranded branch.

### 2026-07-31 — This guide warns, it doesn't block

The push hook prints a loud warning when code changed and this file didn't, but never blocks.

*Raheem's call.* My reservation is on record: `WORKFLOW.md`'s status section died to exactly
this mechanism. If a warning gets pushed past twice, we upgrade to blocking. **Count so far: 0.**

### 2026-07-31 — Harnesses are catalogued, and offered without being asked

Raheem believed the art harnesses were one-off. They never were — both are generic and
config-driven. What was missing was an index. `HARNESS_INDEX.md` now catalogues every tool,
and the standing rule is that I name the relevant ones before starting relevant work.

*Why it matters:* the harnesses exist so Raheem and the team can *see* what's happening. A
run that doesn't surface them defeats their purpose.

### 2026-07-31 — Split art agents by subject, not by tool

Rejected a "Leonardo agent." Added `environment-art-director` for places and things instead,
alongside `art-prompt-director` for characters.

*Why:* tool-shaped agents accumulate everything and specialize in nothing. A character
failure (identity drift) and a place failure (perspective, seams, HUD collision) have nothing
in common, and both tools get used across both subjects.

---

<!-- updated: 2026-07-31 -->
## 9. Ideas raised, not committed

*Said out loud, captured so they aren't lost, explicitly **not** promises.*

- **Mine for secret lore** — the mine as a lore-discovery surface, not just a currency tap.
- **Things only obtainable from PvP** — rewards exclusive to player battles, which then
  unlock tower floors.
- **Visible cosmetic unlocks in the courtyard** — the social payoff of gathering.
- **More minigames as doors** — the shape accepts them; none are designed.
- **Extract the harnesses as a reusable toolkit for future games** — Raheem explicitly
  deferred this. Focus is this game.

---

## How to keep this alive

**For Raheem:** open it, read §0, pick something, tell me. That's the whole ritual.

**For me:** invoke the `production-log` skill at the end of any session that shipped work,
made a decision, or raised a question. It updates the right sections, appends to the decision
log, and redeploys the page to the same URL.

**A caveat about the push warning:** `.gitignore` blanket-ignores `.claude/*`, and hooks were
never un-ignored — so the freshness warning (and the older build check it runs after) exist
**only on Raheem's machine**. They are not in the repo and no teammate has them. Whether to
start tracking hooks is an open question in §0.

**The rule that keeps it honest:** if I'm not sure something is true, this guide says so
rather than guessing. A backlog that lies is worse than no backlog — the moment you catch it
being wrong, you stop reading it, and then it's dead.


---

# Game Mechanics

<!-- updated: 2026-07-31 -->
## 1. How the game works

*Everything in Infrastructure describes how the project is built. This part describes the
**game** — the abilities, the elements, the bosses, and how a character actually gets stronger.*

**This part is young.** It was started 2026-07-31 and most of it is still being designed, so it
opens with what we haven't decided rather than pretending to be finished.

### The eleven archetypes

Every character is one of these. The emblems below are the real selection art — ten approved,
with the Lycanthrope still on a placeholder.

<!-- gallery: emblems -->

### The twenty-nine elements

Each character carries one. The element decides how the character looks, what their damage
resolves as in a fight, and — for the fifteen elements only a single archetype can reach — what
they can do that nobody else can. Every crystal below was made for this game.

<!-- gallery: elements -->

**Twenty-eight crystals for twenty-nine elements** — Time has no art, because no archetype can
reach it yet. Storm was in the same position until 2026-07-31, when it became the Barbarian's.

**Nine of these are exclusive to one archetype and mechanically identical to a shared one right
now.** Nature is the Druid's alone, Nocturne and Sanguine are the Vampire's, Nanite is the
Android's — and none of them do anything a shared element doesn't. That's the largest open
question in this part.

### Mana and Tech — the same damage, opposite riders

Every card runs on Mana or on Tech, never both, and that choice decides three things: what your
damage leaves behind, what kind of creature you are, and which fights you are the wrong answer
for.

**Mana lingers.** Statuses stick, stack and outlast. It is slow, it compounds, and it wins long
fights. Eight archetypes run on it.

**Tech pierces.** It ignores a share of shields and armour — enchantment does not stop a piston.
It is immediate and flat, and it wins against defence. Only Human, Android and Mech Pilot run on
it, and **only they can deal tech damage** — which is what lets a boss be built that simply
cannot be beaten without a machine in the party.

**Your resource also decides your body.** A tech card has no body: it cannot be frozen,
poisoned, bled or frightened. It pays for that by breaking under tech damage — machines break
machines — and by being unhealable. The only thing that restores a machine is a Human.

### Why there are no dwarves

The Human is the answer to "why is a human useful in a fantasy world." They have no powers and
no elements — only Metal — and what they have instead is *building*. They are the machine
faction's builder, its only revive, and the reason an Android or Mech Pilot can fire the full
version of an ultimate. Weak alone by design; their stat line is the flattest in the game and
stays that way. They are never indispensable because of a number.

### A note on the art

The emblems and element crystals above were made for this game and are the best-looking thing
the project owns. **Not everything is at that standard yet** — bosses and abilities still run on
placeholders, the Lycanthrope emblem is unfinished, and the plan is custom art for abilities too.
Every one of those is a chance to make the game more beautiful, and the pipelines to do it
already exist: see the workshops in Infrastructure §6.

---

<!-- updated: 2026-07-31 -->
## 2. What we still need to decide

**Read this first, not last.** A question buried at the bottom of a design doc is a question
nobody answers. These are the ones where the game is waiting on a ruling — and the ones where
there's room to invent something.

### Blocking — 4 items

*The game is not functional until these are answered.*

- **What does each of the 15 exclusive elements actually do?** Every archetype now owns at
  least one element nobody else can reach — Nature is the Druid's, Nocturne and Sanguine are
  the Vampire's, Nanite is the Android's. Mechanically they do nothing special yet, so an
  exclusive element is currently identical to a shared one. *Unblocked by:* the element deep
  dive, deliberately deferred to its own project.
- **What does Void do, and is it `true` damage?** Void is the one element that is rare for
  everyone who can reach it, priced for an effect that doesn't exist yet — "cuts through the
  other elements." That maps almost exactly onto the existing `true` damage type, which
  bypasses both resistance *and* armour. That may be right, or far too much. *Unblocked by:*
  Raheem ruling on how far it cuts.
- **Does an all-machine party get any sustain?** Tech cards can't be healed, only repaired by a
  Human. A party of Android and Mech Pilot with no Human currently has no healing at all.
  Either that's the lesson, or machines get a weak self-repair. *Unblocked by:* a ruling.
- **What is the magic-warded boss, concretely?** The fight that proves the tech gate — a
  creature every element slides off, where ten archetypes are useless and a hammer is not. It's
  the floor that sends someone back to level a Human. Nothing is designed. *Unblocked by:* a
  boss design pass.

### Improving — 6 items

*It works. These would make it better.*

- **The Mana stat is worth about a quarter of what Def is worth.** Measured: Def 100 vs 20 is
  roughly 430 effective HP; Mana 100 vs 20 is 30–60 damage. Roughly 8:1. The riders should
  bring it to about 2:1. *Unblocked by:* one line decoupling mitigation from Def's raw value,
  then the balance sim. Target is under 3:1.
- **Rider magnitudes are starting numbers, not playtested ones.** `floor(mana/34)` bonus rounds
  and `tech/167` pierce came from the systems designer's first pass.
- **Druid and Human have no rare element at all.** Both are narrow by design, so this may be
  correct — but nobody has said so on purpose.
- **Time is held by nobody.** It has a name, art and a damage type, and no archetype can reach
  it. Seed material for a future archetype, or cut? Storm was in the same position until it
  became the Barbarian's.
- **`umbral` carries nine elements; `searing` carries one.** Lopsided, and it will look strange
  the moment the eight damage types are printed side by side.
- **What does each stat mean per game mode?** Def buying HP in a boss fight is not the same as
  Def in a zone-control board game, and the design has never said what it is instead.

### Open ground — 4 items

*Nobody has committed to these. This is where the exciting ideas go.*

- **Mode-exclusive prizes.** Power up in the tower, take those cards to the board game, and
  each mode holds rewards the other cannot give. Needs a rule for *what class of thing* is
  exclusive — cosmetics? abilities? element access? *Note:* reward changes need Raheem's
  explicit approval under the economy plan §13.
- **Do elements combine, and only in the board game?** The Genshin-style reaction system from
  the warband draft may be the honest answer to "why is the card game a different game" — the
  tower is about reading one enemy and bringing the right answer; the board game is chemistry.
- **Special forms for rare elements.** Raheem's note that rare elements will later get forms
  that do special things. Its own project, deliberately.
- **Mana flows, tech banks.** Mana draws from the world and regenerates; tech runs on what you
  built before the fight. Held back because the mana/tech split works without it, but it's a
  real difference in how the two feel to play.

### The rule for this section

A question that gets answered **moves to the decision log in §8 with its ruling** — it is never
just deleted. The answer is the valuable part, and the reason behind it is what stops the same
question being re-asked in three months.

---
