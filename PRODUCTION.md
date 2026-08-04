# Card Engine — Production Guide

> **This is the brain and the map.** What the game is, what's in flight, what got started and
> abandoned, and why every decision was made. Read by Raheem and Tori.
>
> **It is not an ops tool.** The admin dashboard owns live numbers — spend, balances, card
> counts, moderation queues. This owns the record of the work: what we decided, why, and
> what's still open. That record used to evaporate when a chat session ended.

**Last updated:** 2026-08-03 · **Maintained by:** Claude, every session · **Source:** `PRODUCTION.md`

---

## Contents

The guide is in four parts. **Infrastructure** is how the project is built and run.
**Game Mechanics** is how the game itself works. **Making Things** is how to make art
yourself. **Lore** is Tori's.

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
| 3 | [The two engines](#3-the-two-engines--how-a-character-gets-a-face-and-a-story) | How does a character get a face and a story? |

**Making Things** — how to make art yourself, with PixelLab and Leonardo.

| | Section | What it answers |
|---|---|---|
| 1 | [PixelLab — people and monsters](#1-pixellab--people-and-monsters) | Characters, bosses, animation, what it costs |
| 2 | [Leonardo — places](#2-leonardo--places) | Backdrops, arenas and maps |
| 3 | [Ideas worth making](#3-ideas-worth-making) | What should we make next? |

**Lore** — Tori's part. What is written, what is invented, what needs her.

| | Section | What it answers |
|---|---|---|
| 1 | [Tori's desk](#1-toris-desk) | What is waiting for me, and in what order? |

---

# Infrastructure

<!-- updated: 2026-08-01 -->
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
| Q6 | Should an ability's `guard` EFFECT (e.g. Load-Bearing) count toward a `party_action: guard` charge break like First Notice, or only the literal Guard action? | The Decision Experience System now tells the player plainly that it does not — that's either correct design or a gap worth closing. |
| Q7 | Should damage-over-time count toward damage-based objectives (The Whole Ledger) and the single-round interrupt bar? | Currently it counts toward neither. Same situation as Q6 — worth a deliberate ruling either way. |

---

<!-- updated: 2026-08-03 -->
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

<!-- updated: 2026-08-03 -->
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

**A combat round is planned as a party.** You choose one action for each living card; every
attack leaves a large elemental charge above its card, while Wait leaves a neutral hold mark. Nothing resolves
until all cards are ready and you press **Release Party**. The party holds a visible charge,
the cards launch left to right in a tight *boom, boom, boom* rhythm, then their three impacts
arrive together at distinct upper-left, upper-right, and lower-center points on the boss. The
boss gets a held hit reaction and a short silence before visibly preparing its answer. Every
targeted hero card reacts before the battlefield settles and control returns.

Selecting a card now exposes that character's three ability rows immediately above the
shared Mana/Tech controls. Ordinary legal abilities lock from that choice and move focus to
the next unfinished card; only genuinely risky choices keep a confirmation. **Strike** is a
voluntary resource-building attack, while **Wait** spends that character's command slot with
no damage, resource, charge, or status effect. A card opens its full sheet only through the
separate expand control. Strike and Guard are tactical alternatives only while that card has
at least one visible ability it could activate now. If cooldown, charge, status, resource, or
targeting leaves it with no legal ability, **Wait is the only planning command**.
That lockout now appears as a full plain-language state rather than a tiny resource symbol:
the ability rows name cooldown, charge, and resource reasons; **Wait & Continue** records the
card as complete, advances to the next unfinished card, and never pulls focus backward when
the next hero chooses an ability.

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

<!-- updated: 2026-08-03 -->
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
| IN FLIGHT | Ability performances | The reviewed form × caster-element performances, 27 shipped element kits, and approved effect assets now run in the authentic `/battle` event stream. Combat has been restructured around **select card → choose one action → collective charge → stagger three launches → shared impact → held boss reaction → silence → boss preparation and attack → every targeted card reacts → recovery → control return**. The live full-motion exchange reaches the next intent in about 6.2 seconds instead of racing through the reducer log. Boss-bound volleys land in a readable triangle instead of stacking three effect pieces on one point. Motion Off keeps the same readable order as still tableaux. The combined branch is not merged, pushed, or deployed. |
| IN FLIGHT | Decision Experience System | Stage 1 now runs in `/battle` alongside Ability Performance: the selected card exposes its abilities immediately, shared Mana/Tech availability matches reducer truth, and Wait is an explicit zero-output command. Strike and Guard remain optional only while that hero has a visible ability it could activate; otherwise a large lockout panel names the reason and offers **Wait & Continue**. Wait completes that card, focus advances to the next unfinished card, and selecting the next ability cannot snap back to the waited hero. Projections, the Threat Translator, contextual explanations, shared confirmation policy, and authoritative receipts remain intact. `/dev/decision-lab` still owns the three frozen comprehension pilots. **No Encounter Briefing yet, and Pilots A/B still need their own dedicated comprehension pass** — see Combat gaps below. |
| PARKED | Board game / warband | Draft doc with open questions; branch 107 commits stale |
| PARKED | Boss art polish | Deferred pending art-direction alignment — though Still Season is doing it anyway |
| PLANNED | The tower (as a structure) | Two bosses exist; **length undecided** |
| PLANNED | The mine | Gold only. Not designed |
| PLANNED | Multiplayer courtyard | After the tower. Needs Supabase Realtime |
| PLANNED | Cosmetics | After multiplayer. Intersects the Fashion Bible |
| PLANNED | Payments / real money | Blocked on economy plan §9 security prerequisites |
| PLANNED | PvP battles + trading | Not started |

### Branches with live work

Five. Everything else is merged.

| Branch | Ahead | Behind | What's on it |
|---|---|---|---|
| `combat-cards-and-resource` | 2 | 2 | Current. Boss readout + Debt-Bearer fix |
| `feat/warband-battle-mvp` | 1 | 107 | Tested warband combat core. Stranded |
| `claude/vigilant-kowalevski-e30267` | 1 | 126 | One Workshop fix. Will conflict if revived |
| `ability-performance-system` | 3 | — | Clean source branch at `c39304f`: Ability Performance spine, reviewed assets, element kits, and Ability Theater. Its work is contained by the combined branch below. |
| `decision-experience` | 8 | — | Combined local release candidate with the party plan, stable selected-card focus, explicit Wait/lockout guidance, triangular volley impacts, staged six-second party/boss cadence, and the Wait-only action rule. Branched from `ability-performance-system`; now carries both tracks in the authentic battle. Nothing has been pushed or deployed. Worktree: `.claude/worktrees/decision-experience`. |

---

<!-- updated: 2026-08-03 -->
## 4. Open threads

**54 things started and not finished.** This is the list that didn't exist before. It will
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

### Combat gaps — 15 items

| What | Where |
|---|---|
| Auto-battle is a disabled stub the UI still shows | `battle/mobile/MobileActionControls.tsx:14` |
| Multi-enemy combat deliberately out of scope | `services/combat/reducer.ts:59` |
| `summon_exists` condition can never evaluate true | `services/combat/reducer.ts:1938` |
| Twilight dual-cast typed but never read by the reducer | `types/abilities.ts:501` |
| Only `damage_dealt` carries `sourceActionId`; the other effect events carry none, so grouping is positional | `types/combat.ts:446` |
| Nine family-default material kits remain as explicit fallbacks for elements/forms outside the 27 reviewed shipped element set | `data/combat/performance/materialKits.ts` |
| Attack VFX needs its own follow-up pass | `battle/AttackVFX.tsx:49` |
| Crit / dodge / miss deferred beyond B7 | boss battle spec §15 |
| Server-authoritative combat validation deferred | boss battle spec §15 |
| A `guard` ability EFFECT (e.g. Load-Bearing) does NOT count toward a `party_action: guard` charge break (First Notice) — only the literal Guard action does. Discovered building the Decision Experience System, which now states this plainly instead of implying it counts. Needs a ruling: is this the intended reading of "coordinated behaviour", or should an ability that grants guarding also count? | `services/combat/reducer.ts` `evaluateChargeProgress` |
| Damage-over-time advances NEITHER a damage charge break (The Whole Ledger) nor the single-round interrupt bar — both only count `damage_dealt`, and DoT emits `dot_ticked`. Same discovery, same open question: intended, or should sustained damage count toward these objectives? | `services/combat/reducer.ts` `evaluateChargeProgress`, `damageToBossSinceIntent` |
| `PendingCharge.progress` is a dead field — written `0` when a charge starts, never read or updated again. Harmless today (everything now reads the shared `evaluateChargeProgress` evaluator instead) but worth deleting in a future replay-format change rather than carrying a field that lies if anyone reads it directly | `types/combat.ts` |
| Decision Experience System has no Encounter Briefing (party coverage vs. boss pressures) — Stage 2 of the reviewed plan, not started | `services/combat/decision/` |
| Decision Experience Pilots A (`Interest Accrues`) and B (`First Notice`) have fixtures and pass their contextual-note tests, but no dedicated end-to-end playtest pass the way `The Whole Ledger` got — Stage 2 | `pages/dev/decisionLabFixtures.ts` |
| `ThreatTranslator.tsx`'s panel has no Figma reference — built to match the existing painted-panel family on judgment, not a spec. Needs a design pass before another boss's UI copies its geometry | `pages/battle/ThreatTranslator.tsx` |

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

<!-- updated: 2026-08-03 -->
## 8. Decision log

*Why, not just what. Newest first. This section is append-only.*

### 2026-08-03 — Combat now moves in readable human beats

Raheem compared the authentic fight with a commercial card battler and rejected the speed
of the released party turn. The reducer was correct, but the whole exchange read like a log
being drained: attacks, damage, boss answer, and control return arrived too close together to
watch. The real battle now presents one deliberate sentence: a 0.7-second collective charge;
three launches 0.18 seconds apart that converge on one contact moment; a held boss reaction;
a 0.55-second silence; a 0.9-second boss preparation; the attack; every targeted card's hit
reaction; recovery; then player control.

The first live review caught a second bug: an area attack returned control after its first
target, then played the other two damage receipts afterward. The presentation queue now gates
recovery and control return on the final boss-damage target. The reducer, event log, damage,
resources, cooldowns, and boss rules did not change.

The authentic `/battle` route was exercised through the real party picker and four consecutive
rounds. Full motion at desktop and 1024×768 tablet showed boss preparation, attack, three card
hit beats, recovery, and return with input locked throughout; the measured exchange reached
the next intent at about 6.2 seconds. Motion Off preserved the same phase order and holds as
still tableaux. The browser console was clean. Build and lint pass; focused presentation tests
pass; the named `battle-party-volley-impact` scenario passed with three simultaneous real
performances, three casters, three boss targets, and three distinct contact points. 625 of 626
full-suite tests pass, with the sole failure still the unrelated pre-existing
ability-art `cobalt` expectation. The final feel remains **HUMAN REVIEW**. Nothing was pushed
or deployed.

*Why it matters:* combat now gives the eye one subject at a time — party intent, shared hit,
boss thought, retaliation, consequence, recovery — while keeping deterministic combat truth
unchanged.

### 2026-08-03 — Wait completes the card and focus only moves forward

Raheem found that a locked hero still behaved like unfinished work: the tiny resource mark
did not explain why the card could not act, and after choosing Wait the next hero's ability
could pull selection back to the first card. Combat focus is now separate from the reducer's
pending resolution order. **Wait & Continue** records a zero-output command, advances to the
next unfinished card in lane order, and remains complete while later abilities are chosen.

The selected-card ability panel now states **No abilities this turn**, keeps each row's exact
cooldown/charge/resource reason visible, and says plainly that the card cannot attack. If the
player revisits it, the panel reads **Wait locked · choice complete**, names the next unfinished
hero, and does not ask for another click. The same guidance exists in the compact layout.

The authentic `/battle` route passed the reported sequence: Gryndak entered a cooldown-only
round, Wait advanced to Seojin, Seojin's ready ability advanced to Ashvara, and focus never
returned to Gryndak. The completed Wait state remained readable at desktop and 1024×768
tablet sizes. Build, lint, focused regression tests, and the post-reload console check pass;
623 of 624 full-suite tests pass. The sole failure remains the unrelated pre-existing
ability-art `cobalt` expectation. Nothing was pushed or deployed.

*Why it matters:* a player can now tell which card is blocked, why it is blocked, and that
they are finished with it this round. UI focus no longer mutates combat engine order.

### 2026-08-03 — Locked heroes wait, and party impacts spread across the boss

Raheem ruled that a character with no ability it can activate does not get to manufacture
another action. Strike and Guard now lock together when every visible ability is blocked by
cooldown, shared Mana/Tech, Ultimate charge, stun, silence, or targeting. Wait remains active
and spends that card's one command slot without producing an effect. The reducer, desktop,
mobile, and headless simulator all read one rule; passive round regeneration remains the
recovery path, and no combat values changed.

The party's shared impact also stopped stacking three element pieces on the boss's center.
The first release lands upper-left, the second upper-right, and the third lower-center. In
the authentic fight, the live performance outputs reported all three simultaneously at
`(41,28)`, `(59,28)`, and `(50,41)` while the reviewed element assets remained distinct.

The real `/battle` route was manually exercised through party selection, three Strikes, a
three-ability volley, boss response, cooldown lockout, and the next planning round. Build,
lint, the focused combat and balance tests, and 620 of 621 full-suite tests pass;
the sole failure remains the unrelated pre-existing ability-art `cobalt` expectation.

The authentic React battle bridge now owns two named scenarios instead of the old generic
observation label. `battle-party-volley-impact` passed with three simultaneous real
performances, three casters, three distinct contact points, input locked, and no runtime
errors. `battle-wait-only-lockout` passed with the player able to act, no usable ability,
Strike and Guard disabled, Wait enabled, Release disabled, and the same result with Motion
Off. The production bundle contains none of the bridge names or transport. The visual
result remains **HUMAN REVIEW** for Raheem's feel/composition approval. Nothing has been
pushed or deployed.

*Why it matters:* characters can no longer escape cooldown/resource lockout through a free
fallback, and three simultaneous hits finally read as three physical contacts. The release
record also replaces a generic observation label with repeatable assertions.

### 2026-08-03 — Selecting a card is the combat command, not a route to another menu

Raheem approved removing the permanent Abilities disclosure. A single card selection now
changes the visible ability rows immediately; choosing an ordinary legal ability locks that
one action and moves to the next unfinished card. The full card sheet stays behind its own
expand control instead of opening when the already-selected card is clicked.

The same decision added **Wait** as a real combat command. It consumes one character's slot
without damage, resource, ultimate charge, guard, taunt, or status. Strike remains available
as the intentional light attack that builds the shared chamber, never as a forced way to
finish planning. Desktop and 1024×768 tablet were exercised through the authentic
party-picker and battle route with an ability, Wait, and Strike in the same released plan;
the boss responded and the next round opened with no console errors.

Build and targeted combat tests pass. The complete suite is 613 of 614 passing; the only
failure is the unrelated pre-existing ability-art `cobalt` wording expectation. This is a
local **HUMAN REVIEW** candidate. Nothing has been pushed or deployed.

*Why it matters:* the card is finally the character and the command anchor. Planning no
longer asks the player to select a card, open a menu, select again, or attack merely to make
the turn continue.

### 2026-08-03 — Party attacks release as a volley and land as one payoff

Raheem approved the plan-all-three structure, then rejected the long presentation rhythm
where each hero finished a private attack sequence before the next one began. Release Party
now launches the three prepared actions 150 milliseconds apart, keeps their real element
deliveries alive together, and retimes contact into one shared impact-and-aftermath window
before the boss responds. The reducer still resolves the same addressed commands in card
order; only their human-time presentation is composed as a volley.

The persistent charge tells also moved into the open strip directly above the card fan. They
are now 2.75 times the original tell rather than 4.5 times, with a tighter halo and smaller
labels so the three elements remain distinct at 1024×768 instead of merging into one cloud.

This remains a **local human-review candidate**. The focused volley contract, all combat tests,
the production build, and lint pass. The complete suite remains 612 of 613 passing because of
the unrelated pre-existing ability-art `cobalt` wording expectation. Nothing has been pushed
or deployed.

*Why it matters:* one click now produces the intended *boom, boom, boom → one heavy hit*
rhythm. The party feels coordinated, while the boss still owns the response after the whole
party payoff rather than interrupting between heroes.

### 2026-08-03 — Boss combat is a party plan, not three interrupted mini-turns

Raheem rejected the immediate one-card-at-a-time decision loop after playing it. A round now
stays in planning while every living card chooses an action. Each confirmed choice creates a
large, element-specific charge directly above that card. **Release Party** becomes available
only when the party is complete; it resolves the three commands in visible card order and
holds the boss until the last action, impact, aftermath, and receipt have played.

The same pass removed the old generic travel beam from element-backed direct attacks. Those
attacks now use the reviewed element stream and impact files already approved in Ability
Theater. The authentic battle was exercised at desktop and 1024×768 tablet sizes: all three
charges stayed visible, the active one changed to *Releasing*, the other two stayed *Armed*,
input remained locked for the sequence, and the boss/next-round boundary followed it.

This is still a **local release candidate**. Build and lint pass; 608 of 609 tests pass, with
the one failure still the pre-existing ability-art `cobalt` wording expectation. Nothing has
been pushed or deployed.

*Why it matters:* the player now makes one legible party decision and watches one causal
sequence, instead of being bounced between a card, the boss, and another card before the
party's intent ever becomes clear.

### 2026-08-03 — Ability Performance and Decision Experience release as one combat track

The two branches were built to meet at the real fight, and they now do. The authentic
`/battle` surface reads one reducer event stream for both: a card's ability performs from
its real caster anchor while the Threat Translator and contextual ability explanation tell
the player why the choice matters; the performance completes before the next card or boss
responds; authoritative receipts then remain in the combat journal. The Ability Theater and
Decision Lab remain focused review tools, not substitute implementations.

The combined work is a local release candidate on `decision-experience`. Desktop and tablet
were exercised through the real seed → picker → wallet → battle path with the named
`battle-ability-decision-sequence` observation scenario. It is not merged, pushed, or
deployed, and one pre-existing ability-art prompt test still fails on its old `cobalt`
expectation.

*Why it matters:* presentation time now matches reducer truth without letting synchronous
combat resolution pile several characters and the boss onto the same visual moment. The
review labs prove their own questions; the real battle proves the combined experience.

### 2026-08-01 — The Decision Experience handoff got a corrected plan, not a blind build

Raheem and ChatGPT produced a full handoff for a Decision Experience System (boss combat
explaining itself before, during, and after a decision). Claude read it against the live repo
before writing any code, rather than executing it as given, and found the architecture sound
but three mechanical claims wrong, and the scope too large for one reviewable drop.

Corrected before building: (1) an ability's `guard` EFFECT does not satisfy a coordinated-Guard
charge break the way the handoff assumed — only the literal Guard action does; (2) the handoff
implied damage-over-time would count toward damage objectives — it counts toward neither the
Ledger's charge break nor the single-round interrupt; (3) the Ability Performance System the
handoff assumed was already integrated is in fact still on its own unmerged branch, not wired
into `/battle`. Stage 1 was re-scoped from "all three pilots + Encounter Briefing in one pass"
to "engine truth + a real Decision Lab + one full pilot (`The Whole Ledger`) end to end" so the
first review is of a working thing, not a six-system wall.

*Why it matters:* the three mechanical corrections are now stated PLAINLY in the game's own UI
(`decision/relationships.ts`) rather than quietly implying something the reducer doesn't do —
which was the entire failure mode this system exists to prevent. Filed as open Combat-gaps
threads for Raheem's ruling: should an ability-granted guard or sustained damage count toward
these objectives, or is the current reducer behaviour correct as designed?

### 2026-08-01 — An ability's look comes from the caster's element, not from its damage type

Every attack in the game drew the same coloured bar, tinted by one of eight "damage types".
Damage type is a rules concept — it decides who resists what — and it was quietly doing a
second job it was never suited for: deciding what things look like. Blood, Void and Bone all
count as the same damage type, so all three came out as the identical purple streak.

From now on an ability's *shape* comes from what it does (a lash, a growth, a barrier, a
drain) and its *substance* comes from the element of the character casting it. The same
ability cast by a blood vampire and by a water druid runs the same code and looks like two
different things.

*Why it matters:* it makes element choice visible. Picking Blood over Water was previously a
number on a card; now it changes what your character does on screen. It also means new
abilities inherit a decent look for free instead of each needing bespoke effects.

### 2026-08-01 — Build the whole performance system before generating any art

Delivery 1 is deliberately code-only. Everything is drawn with shapes the code makes itself;
not one image has been generated, and the art manifest is a list of specifications rather
than files.

*Why it matters:* art is the expensive, irreversible part. Reviewing motion and legibility
first means the generation round is aimed at a known-good target instead of paying to
discover the timing is wrong. There is a review page — `/dev/ability-theater` — built for
exactly that judgement, including a control that hides all colour so the claim "you can tell
these apart without colour" can be tested rather than asserted.

### 2026-08-01 — Group an ability's effects by position, not by changing the rules engine

A single ability like Sanguine Tithe produces three separate results (damage, healing, a
debuff) and nothing in the data said they belonged together. The clean fix would be to tag
every result with the ability that caused it — but that means editing the rules engine,
whose output is the save-and-replay record for every battle.

Chose instead to work it out from the order events arrive in, plus who caused each one. No
change to the rules engine at all.

*Why it matters:* combat maths and replay are untouched, so this cannot break a fight. The
tidier fix stays available later as its own deliberate change rather than being smuggled in
alongside a visual feature.

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

<!-- updated: 2026-08-03 -->
## 9. Ideas raised, not committed

*Said out loud, captured so they aren't lost, explicitly **not** promises.*

- **Mine for secret lore** — the mine as a lore-discovery surface, not just a currency tap.
- **Things only obtainable from PvP** — rewards exclusive to player battles, which then
  unlock tower floors.
- **Visible cosmetic unlocks in the courtyard** — the social payoff of gathering.
- **More minigames as doors** — the shape accepts them; none are designed.
- **Extract the harnesses as a reusable toolkit for future games** — Raheem explicitly
  deferred this. Focus is this game.
- **Explore a generated combat-UI art pass** — Raheem raised PixelLab as a possible way to
  improve the boss-battle chrome after the interaction restructure is proven. This is not an
  approved generation run or a decision that PixelLab is the right UI tool.

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

### Blocking — 5 items

*The game is not functional until these are answered.*

- **The lore engine has never been specified.** Every card's story is written from 42 words of
  instruction, with no voice, no examples, no banned tropes and no check afterward — while names
  and images each have a whole apparatus. The lore on the cards is bad and this is why. *Unblocked
  by:* §3's six-step route, starting with a voice per archetype authored with the Lore Director.

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

### Improving — 7 items

*It works. These would make it better.*

- **The player's answers usually don't reach their picture.** `storyMotifs` is the only channel
  carrying Story Pillar choices into the portrait, and it sits third from last in a prompt capped
  at 1450 characters — so it is normally truncated away. See §3. Small fix, likely large effect.

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

<!-- updated: 2026-07-31 -->
## 3. The two engines — how a character gets a face and a story

*Every card is made by two systems. One writes who the character is; the other paints them. They
were deliberately split apart, one of them has been rebuilt, and the other has never been touched.*

### The split, and why it exists

Card generation used to be **one** Claude call that returned the name, the title, the lore *and*
the Leonardo prompt in a single JSON blob, assembled from a ~1200-line braided prompt. Neither half
could be improved without risking the other — every image fix threatened the name and the story,
and every lore fix threatened the picture.

They are now two engines with a typed contract between them:

- **The Lore Engine** — one Claude call. Writes *who this character is*: name, title, lore, and the
  structured `hiddenFate` (fashion, hair, skin, weather).
- **The Image Engine** — pure, deterministic TypeScript. Reads that description and produces the
  Leonardo prompt. It invents no identity.

**The seam is one deliberate omission.** The object passed between them carries no `cardName`, no
`nameAndTitle`, and no `lore`. From `types/characterSheet.ts:21`:

> The Image Engine physically never receives them, so it cannot corrupt the character's name or
> story by trying to stage a better picture. That omission is the guarantee.

This is not a convention anyone has to remember. It is enforced by the type system — the prose
*cannot* reach Leonardo.

### Which way the influence runs

**The image decides, and the lore follows.** This is the part worth internalising, because it is
the opposite of how it worked before.

Before Claude is called at all, code rolls the actual person — sex, build, age, distinguishing mark
— deterministically, seeded on the card's id (`services/imageEngine/identityRoller.ts:134`). That
roll is then handed to Claude as a locked constraint:

> ROLLED IDENTITY (LOCKED — the name + lore MUST match this EXACT person, do not drift, do not
> soften)

and again, in the diversity block: *"cardName + lore MUST fit a person with this attribute. Do not
soften it. Do not skip it."* After Claude replies, those values are **overwritten with the rolled
ones anyway** (`claudeApi.ts:1186-1211`), so drift is impossible.

That inversion is what killed the old problem where every generated character drifted toward the
same young, conventionally attractive body. The code picks the person; the writing has to fit them.

**One detail tells you where the attention went:** the body and age descriptions handed to the lore
writer are the `leoDescription` fields — strings written for Leonardo, an image API. The lore is
being conditioned on phrasing authored for a picture.

### The image engine — rebuilt

It has a real home at `services/imageEngine/` and a deterministic assembler at
`services/portraitAssembler.ts`. What exists today:

- **Complete per-archetype pools, 11 of 11** — weapons, poses, and environments, all rank-scaled so
  a Foundation card and an Ascendant card of the same archetype don't share a background.
- **Companions for 5 of 11, by design** — Necromancer, Beastmaster, Vampire, Mech Pilot, Android.
  The other six have none deliberately: their allies are people, not equipment.
- **Bespoke scene builders** for ten archetypes and the three Seraph paths.
- **Ordered assembly.** Segments are emitted in priority order because Leonardo weights early
  tokens and truncation drops from the end, with a reserved closer that can never be truncated.
- **Three-layer modesty enforcement**, naming the actual closed garment as a noun rather than
  hoping a negative prompt holds.

### The lore engine — never started

`services/imageEngine/` contains five modules. **`services/loreEngine/` contains a README and no
code.** The directory layout is an honest map of where the effort went.

Here is the entire specification for a card's lore, in full, from `claudeApi.ts:954`:

```
"lore": "2-3 sentences of flavor text. Weave the Story Pillar answers into the
mood WITHOUT quoting them literally. Reflect the emotional throughline you
identified."
```

Forty-two words. No system prompt at all. Temperature 1. Running on Haiku — chosen, per the comment
above the call, because it reliably emits *short image prompts*; lore quality was never a criterion.
Roughly 300 of that prompt's 355 lines are about bodies, skin, hair, fashion, pose and element
visuals.

**Compare what the three outputs actually get:**

| | Names | Images | Lore |
|---|---|---|---|
| Specification | a naming bible per archetype | a 5-module engine | **42 words** |
| Banned material | 25 banned tropes, injected | 265 negative terms | none |
| Per-archetype voice | yes | yes | **none — all 11 identical** |
| Anti-repetition | rotation, history, collision detection | seeded rolls | none |
| Checked afterward | hard lock + collision warning | pure, truncation-ordered | **presence check only** |
| Milestone markers | M4.5 | M4.6, M4.7, M4.0, image-first | **never had one** |

A Necromancer and a Mech Pilot receive **identical** instructions for how to write their story. The
Bible chapters carry no voice, tone, or prose-guidance field of any kind. And nothing inspects the
lore after it comes back — no length check, no trope filter, no repetition tracking — even though
that exact machinery already exists and runs for names.

That is why the lore is bad. Not because the model is weak: because nobody has ever told it what
good looks like.

### The one leak worth knowing about

Lore prose never reaches the image. But lore-*derived* data does, through `storyMotifs` — 4 to 8
concrete objects and symbols Claude infers from the player's Story Pillar answers. It is the only
channel carrying the player's choices into their picture.

**It sits third from last in the prompt**, inside a block whose own comment reads *"lower-priority
tail — truncates harmlessly."* The prompt is capped at 1450 characters, with the element palette,
identity, pose, weapon, companion, wardrobe and background all ahead of it.

**So the thing the player actually chose is usually cut before it reaches Leonardo.** If the cards
have ever felt disconnected from the answers that made them, this is the most likely reason, and
it is a small fix rather than a rewrite.

### How we fix the lore

The route is not "write a better sentence." Names already solved this problem, and lore was simply
never given the same apparatus. Give it that apparatus.

1. **A voice per archetype.** Tense, register, and what this archetype's prose is *about* —
   Necromancers speak in elegy, Androids in clipped declaratives. Added as a field on the Bible
   chapter, which today has no such field. The Seraph path anchors already prove per-archetype
   narrative anchoring works; it was never generalised to the other ten. **Authored with the Lore
   Director**, not invented in code.
2. **Banned tropes and worked examples.** Names get 25 banned tropes and a four-point self-check.
   Two good and two bad examples per archetype will do more than any amount of adjective.
3. **Get lore out of the image prompt.** Its own call with a real system prompt, or at minimum a
   system prompt and a lower temperature. One line riding inside a 355-line prompt about faces, at
   temperature 1, is the current arrangement.
4. **Reconsider the model for this call.** Haiku was picked to keep image prompts short. That
   reason does not apply to prose.
5. **Check the lore after it is written** — length, tropes, and repetition across cards, reusing
   the tracking that already runs for names.
6. **Give `services/loreEngine/` some code.**

### Where this is going — questions that build the character

Right now the forge asks two visibly different kinds of question. Story Pillars — 45 hand-authored
questions about who you are — come at one stage. The visual questions, generated from the weapon
and companion pools, come at another. **You can feel the seam**, and the seam is what makes it feel
like filling in a form rather than making someone.

**The direction: one flow, where you cannot tell which is which.** Every question reads as story.
Some quietly pin the picture, some feed the writing, and many do both. The player is answering
questions about a person, and a character is assembling itself behind the answers.

**The prototype already exists.** `data/imageQuestionScaffold.ts` holds 30 questions and 100 options
across all 11 archetypes, and every option carries a hidden image directive — the text reads as
story, the directive silently pins the portrait. Nothing imports it except its own test. It was
built as an idea-starter and it proves the shape works.

**What it would actually take**, honestly: merging 30 scaffold questions against 45 live Story
Pillars plus the generated visual set. The Story Pillar answers also feed the rare-element
eligibility gate, so they cannot simply be replaced. It is a real design pass, not a wiring job.

---

# Making Things

<!-- updated: 2026-07-31 -->
## 1. PixelLab — people and monsters

*The tool for anything that moves. This is the one worth getting genuinely good at,
and the skill that carries into every game after this one.*

**The point is to get good at this, not to follow a checklist.** Everything below was
learned by spending generations and getting it wrong. The failures are the valuable part
— each one is a rule that will still be true in the next project.

### What a finished boss actually is

A boss is not one picture. It is a handful of short animations — **clips** — that the game
plays at different moments in a fight. Each clip is a strip of frames sharing one crop box,
so he never changes size mid-fight.

<!-- sprite: combat/bosses/debt-bearer/sprite-windup.png | The Debt-Bearer's **wind-up** — 7 frames. This one loops, because he can be charging for several of your turns and a clip that plays once would freeze on raised fists. -->

That is the whole idea. The rest is choosing which clips to make.

### The seven states, and which ones you actually need

| State | When it plays | Skip it? |
|---|---|---|
| `idle` | Between moves | **Never.** Everything falls back to it |
| `windup` | The telegraph, a round before the blow | Worth having — it's how the fight reads |
| `attack` | The blow landing | Yes |
| `defeat` | He loses | Yes |
| `hit` | He takes damage | **Cut this first.** A CSS flash covers it |
| `rage` | Phase two | Reuse something |
| `ultimate` | The big one | Reuse something |

**The Still Season only has four generated clips.** Its `rage` is the first three frames of
its ultimate on a loop. Its `ultimate` is a *rejected* hit animation — the scream was wrong
for taking damage and perfect for a boss losing its temper. Two states, zero extra
generations.

<!-- sprite: combat/bosses/still-season/sprite-ultimate.png | The Still Season's **ultimate** — which began life as a rejected `hit`. Before you throw a generation away, check whether it is right for a different state. -->

**So: should we make more animations for the other bosses?** The Emberborn Wraith has one
static frame and nothing else — it is the oldest boss and it shows. Adding `idle` and
`windup` alone (~10 generations) would bring it up to the standard of the other two. That's
the cheapest visible improvement available in the whole project.

### The size you ask for is not the size you get

**PixelLab overrides your canvas size every time.** This surprises everyone.

| We asked for | We got |
|---|---|
| 128 × 128 | 180 × 180 |
| 168 × 168 (the documented maximum) | 256 × 256 |

Treat size as a hint, then read back what arrived. It matters because of the one rule you
cannot break: **never shrink pixel art to fit.** Both castle characters shipped at 46% of
the size they were drawn at, and the reaction was *"he doesn't feel like he's from the same
game"* — which was exactly right. Resize once, before it reaches the game, then display at
full size or larger. Pixel art tolerates being scaled up. It does not survive scaling down.

### Which way is which

Get this backwards and your character moonwalks. It shipped backwards once.

**`south`** = facing you · **`north`** = their back · **`east`** = screen **right** ·
**`west`** = screen **left**

**The only way to confirm facing is to walk them around in the game and look.** We
"verified" it twice with clever pixel analysis; both methods were confident, wrong, and
disagreed with each other. Raheem spotted the real problem in two seconds of play.

### How many directions, and the three modes

| Who | Directions |
|---|---|
| Someone the player steers | **4** |
| A shopkeeper, an NPC, a boss | **1** — `south` |

Eight is a mistake we made once, on a stationary dwarf who will never show six of them. The
real cost isn't the rotations — **an animation costs one generation per direction**, so an
idle across eight directions costs eight instead of one.

| Mode | Verdict |
|---|---|
| **`v3` with pinning** | **The default for everything.** ~25 generations for a full walking character, passed the quality check first try |
| `template` | Only a gentle idle for someone who stands still. It redraws each direction from scratch and a costume visibly changed halfway through a walk |
| `pro` | **Never.** ~186 generations for one character — a tenth of the monthly allowance — and the result was unusable |

**"Pinning" is the whole trick.** You hand each animation a starting frame — the character's
own rotation for that direction — so every clip begins from the same person. Without it the
model reinvents them slightly each time. That is what costume drift is.

### Making them move

- **`frame_count` must be even and at least 4.** Asking for 3 or 7 is simply rejected, for free.
- **You get back one more frame than you asked for.** Ask 6, receive 7. Frame 0 is your pinned pose.
- **Speed is chosen against the fight.** An ordinary attack is 650ms from wind-up to impact
  (250 + 400). Time clips to *that*, not to the big attack, or every normal hit gets cut off.

### Four things the model will do to you

**One action per clip.** *"Raising both arms overhead and smashing them down, then
recovering"* returned no arm movement at all, plus a large brown wing belonging to nothing.
Split into "wind up" and "smash" and it worked immediately. **If your description contains
"and then", it is two clips.**

**Name every part of the costume, every time, and say it does not change.** Anything you
leave out is optional to the model. A glowing ribcage went from 225 lit pixels to 7 across
five frames because the clip description didn't mention it.

**Never ask a clip to animate a glow.** We asked for one that brightened and dimmed. It
dimmed and never came back. **A glow is a code layer** — free, and impossible to lose.

**Keep motion small.** *"Recoiling sharply, head snapping back"* came back wearing an
invented cyan crown. *"Tipping back a little and settling"* worked.

### Making a boss — the actual steps

*~20–31 generations, and an evening.*

Decide first: whose fight it is, what it looks like standing still (bosses never turn
around), **what colour its attacks are** — that colour must be quiet in the backdrop or the
attack stops reading as an event — and whether you have a picture already. Both our bosses
came from concept art, and it shows.

1. Copy `configs/boss-still-season.json` — the most recent and most correct.
2. Set every clip except `idle` to `"skip": true`. **One clip, then look.**
3. `node scripts/sprite-lab/create-boss-pro.mjs configs/boss-<name>.json`
4. If the idle is right, unskip the rest.
5. Pack the clips into one shared crop box.
6. **Watch it play**: `node scripts/sprite-lab/boss-sheet.mjs <folder>`. Watching *is* the
   review — numbers cannot tell you a boss looks wrong.
7. Register it in `bossSpriteManifest.ts`, or it will not appear at all.

**Two mistakes both bosses made.** His feet ended up 33 pixels above his own platform,
because his attack throws flame below his soles and the crop box included it — **the bottom
of the box is the ground line, taken from his resting pose alone.** And the attack should
start from the last frame of the wind-up so his fists are already raised — worth doing, and
**only ever one hop**, because chaining a chain compounds drift.

### Making a character — the actual steps

*A walking character is ~25 generations. A shopkeeper is ~10–15.*

**First, the honest question: does anyone steer them?** If not, **do not generate a walk
cycle.** That is two thirds of the cost and nearly every defect.

<!-- sprite: castle/hero/chibi.png | A finished walking character: four rows, one per direction, each starting with the standing frame. That standing frame is frame 0 of the walk itself — take it from anywhere else and he changes size when he stops. -->

**Standing still:** make them on the PixelLab website, one direction, add a `breathing-idle`
(one generation), **write down the seed**, and hand over the character link — it drops
straight in.

**Walking:** copy `configs/hero-chibi.json`, four directions, one walk clip per direction
each pinned to its own rotation. **No colour reference** — we fed the courtyard in once for
"harmony" and the character sank into the background. A character the player controls must be
readable first and harmonious second.

### What you can do entirely in the browser

Quite a lot, and this is the part that matters for working alone: create a character start to
finish (every setting is a form field), add template animations, make props and tiles,
download frames, and **judge whether it looks good — the only test that has ever really
mattered.**

**A character you make on the website drops straight into the game.** The
`/create-character/<id>` link is all that's needed. No exporting.

What still needs the scripts: pinning, packing, the quality checks, and resizing for display.

### Costs, so "a few generations" stops being the unit

The plan gives **2,000 generations a month.**

| What | Generations |
|---|---|
| A character the player walks around | **~25** |
| A boss with a full clip set | **~20–31** |
| A shopkeeper who stands still | **~10–15** |
| A dialogue portrait | **25** |
| One animation clip | roughly 1 per frame |

**And a lot is free:** a rejected request, a stalled job, re-running a generate command
(it skips finished work), and `sprite-lab.mjs recover`, which rebuilds from jobs you already
paid for. **Write down the seed every time** — we lost a character permanently because
nobody recorded hers.

---

<!-- updated: 2026-07-31 -->
## 2. Leonardo — places

*Backdrops, arenas and maps. Slower to get right than characters, and far more of it is
fixable afterwards for free.*

### What an arena has to do

<!-- plate: combat/arenas/still-season-grove/base.png | A shipped arena. Note what the composition is doing: dark uneventful top corners where the health panels sit, an open middle for the boss, and a flat low-contrast lower third so your party reads against it. -->

An arena is a stage with furniture on it, and the furniture is not optional:

- **Top corners dark and uneventful** — the health panels go there
- **Middle open** — the boss stands there
- **Lower third flat and low-contrast** — your party stands there and must stay readable
- **Bottom of frame gets cut** — the command bar covers it
- **Nobody in the picture.** Ever. Describing a space by who stands in it once painted three
  tiny fighters into the floor.

**And check it on a phone.** Portrait crops away everything but the middle quarter, where
the carefully darkened corners contribute nothing at all.

**Sizes:** arenas are **1360 × 768**. Tower and courtyard plates are **1536 × 1152**.

### Two models, and they are not interchangeable

- **Phoenix** — anything seen head-on. Arenas, battle backdrops, forge scenes.
- **Lucid Origin** — anything seen from above. The courtyard, tower floors, maps.

Phoenix pulls hard toward being a dramatic painting and cannot hold a flat map look. Lucid
Origin can. **Do not switch models partway through a set** — the texture is the most visible
sign that two places belong to the same world.

### Four lessons that each cost real money

**Name the thing you want. Never ask for an absence.** *"No sky"* asks the model to render
nothing in the most important part of the frame, and it will not. Ten images across four
rounds failed this way. What worked was making the top of the frame *a thing* — tiers of
stone rising to the top edge.

**A style reference brings the content with it, not just the style.** We pointed a green
forest brief at a shipped stone arena for consistency and got that arena's lava floor,
recoloured, every single time — even at the weakest setting. **Consistency comes from the
same model, the same size, and the same opening description.**

**A colour grade cannot add a subject.** Raheem, exactly right: *"Making the stone the
colour of moss doesn't make the environment more nature-like. That would be including more
plants."*

**Fix framing in code, not by regenerating.** The sky got cropped. The platform the boss
stands on is drawn by the game. Suspended leaves are code sprites — they failed six times
out of six in generation, and look better as sprites anyway, because everything else on
screen moves and they conspicuously don't.

### The one-image rule

**Generate one plate, look at it, then generate the rest.**

```bash
node scripts/bg-harness/harness.mjs gen arena-<name> <state-id>
```

If the first is wrong the prompt is wrong, and eight more will be wrong the same way. That
is exactly how ten images disappeared into an arena that never shipped.

**And read your prompt back as one sentence, hunting for the part that cancels.** One brief
asked for a centre that was both "densest and most rotten" and "flat, unbroken and
uncluttered." The model split the difference by moving the rot to the edges — the exact
opposite of the brief.

### You can just make it yourself

**This is a real path, not a fallback.** The Still Season arena above was generated by hand
after Leonardo failed ten times, then run through one command:

```bash
python3 lib/finish_arena.py <your-image.png> \
  ../../public/assets/combat/arenas/<name>/base.png
```

That script crops the sky, warms the colour, darkens the corners for the HUD, flattens the
lower third and pixelises it. Free, and re-runnable as many times as you like.

**If you make a plate anywhere — Leonardo, Gemini, by hand — and it roughly fits the layout
above, it can be in the game in about a minute.**

---

<!-- updated: 2026-07-31 -->
## 3. Ideas worth making

*Somewhere to put ideas so they stop evaporating. Add freely — an idea costs nothing, and
this is the page that decides where the generations go.*

**These are not invented from nothing.** Each is something the game has already told us it
needs, which is the difference between a generation worth spending and a wasted one.

### Bosses the game is asking for — 4 items

**The thing magic doesn't work on.** Game Mechanics says we need a boss every element slides
off. Ten of the eleven archetypes are useless against it; a Human with a hammer is not. This
is the fight that makes people go and level a Human, and it's the most valuable boss we could
build. *~25 generations. Needs a look first: what does "magic doesn't apply here" look like?*

**The thing you cannot hit.** The mirror — something with no body, where machines swing
straight through. Stops the tech faction being simply better. *~25 generations.*

**Finish the Emberborn Wraith.** It has one static frame while the other two bosses have full
clip sets. `idle` + `windup` would bring it level. *~10 generations — the cheapest visible
improvement in the project.*

**A boss for an element with no fight.** Fifteen elements belong to exactly one archetype and
most have never been the subject of anything — Lunar is the Lycanthrope's alone, Sanguine and
Nocturne the Vampire's. *~20–31 each.*

### Characters — 3 items

**The Lycanthrope emblem.** Ten of eleven archetypes have their selection art. This is the
missing one, pending since 2026-07-17. *Leonardo, one square image.*

**Replace the placeholder hero.** `human.png` breaks all four of its own art rules and we
know it. *~25 generations.*

**Fill the courtyard.** Stationary NPCs cost about a third of walkers. A blacksmith, a
herbalist, someone sitting on the fountain. **The cheapest way to make the game feel
inhabited**, and the best place to practise. *~10–15 each.*

### Places — 2 items

**Tower floors.** Every floor needs a backdrop, and the tower's length is still undecided —
that ruling blocks the whole queue. *The hand-made path works fine here.*

**The four unopened stalls.** The courtyard has four doors that go nowhere. *A backdrop each,
plus whoever stands in it.*

### How to add an idea

Four things: what it is, why it would be good, roughly what it costs, and what it's waiting
on. **When one gets built it moves out of this list**, leaving a line saying what it became.


---

# Lore

<!-- updated: 2026-07-31 -->
## 1. Tori's desk

*This part belongs to Tori. It is the record of what is written, what is invented and
waiting on her, and what order it is worth doing in.*

**The short version: the bosses have no real story.** Everything currently written about
them was invented by Claude to fill the field, has never been reviewed, and is not canon.
It reads like lore, which is precisely the problem — nobody looking at the game can tell
the difference between what was decided and what was improvised.

**The art and the animation stay.** The bosses look how they look. What changes is who they
are, why they are in the tower, and what they say.

### What is actually made up

All of it, in `data/bosses/seedBosses.ts`:

| What | How much | Status |
|---|---|---|
| Boss names | **4** | Invented |
| Lore paragraphs | **4** | Invented |
| Named moves | **39** | Invented |
| Telegraph lines — what the boss "says" before a move | **39** | Invented |
| Passive descriptions | **14** | Invented |

The four are the **Emberborn Wraith**, **The Debt-Bearer**, **The Still Season** and **The
Unclosed Summons**. Some of it may be worth keeping — that is Tori's call, not a default.

**There are also no story pillar questions for bosses.** Characters get a guided set of
questions that make them specific. Bosses got nothing equivalent, so there is no structure
behind any of it.

### Where to put your energy first

1. **The two bosses that are actually in the game** — the Debt-Bearer and the Still Season.
   They are what a player meets. The other two are further off.
2. **The telegraph lines**, because they are the only boss writing a player reads *during* a
   fight, once per move, every fight. They do more work than the lore paragraph nobody opens.
3. **The two unbuilt bosses** in Making Things §3 — the one magic doesn't work on, and the
   one you cannot hit. **These have no story at all yet, which makes them the easiest to get
   right**: nothing has to be undone.
4. **The move names.** 39 of them. Lower priority than the above, but they are the flavour
   that carries a fight.

### What is already canon, and what isn't

**Canon — do not treat as provisional:**

- The Character Generation Bible. It governs archetype identity, story pillars, element
  compatibility and prestige. Where the Bible and the code disagree, the Bible wins.
- The eleven archetypes and their chapters.
- The twenty-nine elements and what each one means.

**Not canon, invented to fill a gap:**

- Everything about the bosses, as above.
- The card lore the game writes at the forge. See Game Mechanics §3 — the entire instruction
  for it is 42 words, with no voice, no examples and no guidance per archetype. **That is the
  other place a Lore Director changes everything**, and it affects every card a player ever
  makes rather than four bosses.

### The thing that would help most

Game Mechanics §3 lists what it would take to make the card lore good, and the first item
needs Tori specifically: **a voice per archetype.** Right now a Necromancer and a Mech Pilot
receive *identical* instructions for how their story is written. There is no field anywhere
for tone, register, or what a given archetype's prose is even about.

One or two sentences per archetype — *Necromancers speak in elegy; Androids in clipped
declaratives* — plus a good and a bad example each, would do more for how the game reads than
anything else on this page.

