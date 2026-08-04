# Card Engine — Production Guide

> **This is the brain and the map.** What the game is, what's in flight, what got started and
> abandoned, and why every decision was made. Read by Raheem and Tori.
>
> **It is not an ops tool.** The admin dashboard owns live numbers — spend, balances, card
> counts, moderation queues. This owns the record of the work: what we decided, why, and
> what's still open. That record used to evaporate when a chat session ended.

**Last updated:** 2026-08-04 · **Maintained by:** the primary Studio Lead, every session · **Source:** `PRODUCTION.md`

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

<!-- updated: 2026-08-04 -->
## 0. What I'd work on next

*My recommendations, refreshed every session. Yours to overrule — and when you do, I record
why in the decision log.*

### ▲ Highest value — build the Forge menu next

Four stalls in the courtyard say *"not yet connected."* The castle is the hub your entire
design rests on, and right now it's a beautiful room with four doors that go nowhere.

**The Collection is done** — it is a pixel case you reach from the pause menu today, with the
old page's filters, sorting, detail view and deletion carried across. That proved the shell.

**The Forge is the right next one**, and deliberately the hardest: it is a five-stage ritual
with dice, story pillars, element choice and a paid generation step. If the primitives cannot
carry a multi-stage flow, that is much cheaper to discover now than after two easy stalls are
built on the same assumptions.

Your own sequencing holds — build all four menus, then connect them to stalls once the four
quadrants are designed. Wiring now would mean wiring twice, since Courtyard V2 is still
moving.

*Where:* `card-engine/src/pages/CardForge.tsx` · *Kit:* `card-engine/src/components/ui/`

### ◆ Decide, don't build — how long is the tower?

The tower gates the whole game. It has no defined length. Two bosses exist.

Until there's a number, nobody — including you — can tell whether the tower is nearly done
or barely started, and I can't tell you how much work is left before the gate opens. This
costs nothing to decide and unblocks all planning behind it.

*Needs:* a ruling from you, ideally with `game-systems-designer` consulted on pacing.

### ○ Cheap win — delete 25 dead branches

All 25 are fully merged into `main`. Git keeps every commit; the branch labels carry no
information and actively mislead — your branch list suggests dozens of things in flight when
the real number is two.

*Five minutes. Safe. See [§4 stranded branches](#stranded-branches).*

### ⚠ Risk worth naming — the Still Season still exists in only one place

An entire boss and arena — sprites, clips, signature layers, arena plate, configs, two new
manifests — representing days of work and real generation spend, is not in the repository.
Only `debt-bearer` and `emberborn-wraith` are committed under
`card-engine/public/assets/combat/bosses/`.

This got sharper on 2026-08-04, not softer. You just pulled two checkpoints onto `main` so
you could work from any device — and the Still Season is the one thing that did **not** come
with them. Whichever machine holds it is now the only copy, and every other device you sit
down at will be missing it without saying so.

*Open the laptop that has it and push it.*

---

### Questions for you

*Things I'm blocked on or want a ruling about. These persist here until answered, instead of
being raised in a chat and lost.*

| # | Question | Why it matters |
|---|---|---|
| Q1 | How many floors does the tower have? | Gates all planning behind it. See above. |
| Q2 | Is `feat/warband-battle-mvp` worth reviving, or should the board game be rebuilt fresh? | A tested combat core is stranded 107 commits back. I can assess it if you want. |
| Q4 | Is `human.png` acceptable to ship, or does it block? | The shipped sprite violates all four of its own art rules and is knowingly a placeholder. |
| Q6 | Should an ability's `guard` EFFECT (e.g. Load-Bearing) count toward a `party_action: guard` charge break like First Notice, or only the literal Guard action? | The Decision Experience System now tells the player plainly that it does not — that's either correct design or a gap worth closing. |
| Q7 | Should damage-over-time count toward damage-based objectives (The Whole Ledger) and the single-round interrupt bar? | Currently it counts toward neither. Same situation as Q6 — worth a deliberate ruling either way. |
| Q12 | Now that Crystals are earned, should the mine yield Crystals as well as Gold? | The mine yields Gold *because* Crystals could not be earned. That reason is gone, so this is a live design question rather than a settled rule. |
| Q11 | With a shared pool, two players can hold the same character. Is that acceptable? | The game's stated premise is "characters you made yourself." Speed and cost are good reasons to trade some of that — recorded so it stays a choice rather than becoming an accident. |
| Q9 | Should the review-snapshot helper stop being callable from the public API? | `fill_card_review_snapshot()` is a trigger helper, but it is also exposed as a signed-out-callable endpoint. Calling it directly just errors, so nothing is exposed today — it is unintended surface, not a live hole. A one-line permission change closes it. |

---

<!-- updated: 2026-08-04 -->
## 1. What this game is

> **Card Engine is an adventure game with characters you made yourself.**

Yu-Gi-Oh, Pokémon, and fantasy adventure — built by someone who grew up on those and finally
gets to make his own.

**The card is the format a character comes in. It is not the point.** Everything about how
this is built follows from that sentence. It's why the forge is a ritual and not a slot
machine, and why identity fields are locked so advancement can never make someone younger,
thinner, or less disabled.

### It is a one-off indie game, sold on Steam — new, 2026-08-04

Raheem: *"I am no longer going to make this an ever-ending game where you play with your
friends. It's gonna be a one-off indie game that people buy on Steam. You purchase it, you
play the card game, you challenge the tower."*

You buy the game once. There is **no purchase system inside it** — Forge Crystals are earned
by mining, challenges and play rather than bought. Multiplayer and the live-service framing
are out.

**The two currencies are unchanged.** Forge Crystals and Gold both stay, and a third may be
added. What changed is where crystals come from, not what they are — see §7.

### It is a 2D pixel game — new, 2026-08-04

Raheem, this session: *"This is a 2D pixel game where you collect cards and you battle with
those cards. You're a fantasy character in a fantasy world… The actual visuals of the game
are 2D pixel art."*

This is a real change and it is worth reading twice. The project began as a painted fantasy
card game — effectively a card-collection website with a castle attached. It is now **a 2D
pixel world you walk around in, where cards are how you fight.** Everything that currently
looks like a web page — the Forge, the Collection — is meant to become a stall you walk up
to inside that world.

**The rule that makes it buildable: painted is what you look at, pixel is what you touch.**

| Painted (Leonardo) | Pixel (PixelLab) |
|---|---|
| Backdrops and environment plates | Characters, keepers, bosses |
| Scenery painted *into* the plate | Objects placed *on* the plate — lamps, bridges, crates |
| Card portrait art, and the card's painted frame | Moving effects — dust, sparks |
| | **Menus, buttons, panels — all interface** |

In Raheem's words: *"The water is Leonardo, but the bridge to go over the water is PixelLab."*

Two things this deliberately does **not** mean. It is not "painted = still" — painted water
and banners can move. And it does **not** mean the painted courtyard gets repainted: it is
correct exactly as it is, and the pixel layer is what gets added on top of it. The reference
here is Sea of Stars and Eastward, not Octopath's HD-2D — that one builds pixel sprites over
3D environments, which is a different and more expensive technique.

**The card stays painted.** It is the one exception, and it is a deliberate idea rather than
an inconsistency: a painted artifact you hold inside a pixel world.

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

**Courtyard V2 is a separate pending replacement, not the live courtyard.** Its forge quadrant
now has a development-only playable preview with a controllable chibi, soft white heel dust,
forge surge/smoke/heat effects, Figma-traced counter/bench/forge occlusion, and imported
ground-contact colliders. Both forge passages are walkable in named checks, including reduced
motion. The other quadrants, full-map collision/occlusion, baked-shadow cleanup, and production
route integration remain open. The checkpoint is merged to `main`; review it locally at
`/dev/courtyard-v2-preview`. The route and its assets are excluded from production builds —
`App.tsx` only constructs the lazy import under `import.meta.env.DEV`, so being on `main` does
not put it in front of a player.

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

<!-- updated: 2026-08-04 -->
## 3. Status board

**Vocabulary — one set of words, no exceptions:**
`SHIPPED` · `IN FLIGHT` · `PARKED` · `PLANNED` · `WON'T DO`

| State | Workstream | Where it stands |
|---|---|---|
| SHIPPED | The forge | Image-first pipeline, 11 archetypes, Bible-driven generation |
| SHIPPED | Collection + card detail | Grid, filters, tier-up, evolution history |
| SHIPPED | Ability system | Typed catalogs, power budget validator, discovery rewards, codex |
| SHIPPED | Persistence + auth + admin | Supabase, RLS, anonymous→email upgrade, admin RBAC |
| SHIPPED | Admin dashboard | 8 routes; all provider secrets server-side. The Studio Wiki branch now keeps the sidebar operational: Ability Review remains, Live Card Audit moves behind Overview, and duplicate reference browsing is removed. |
| SHIPPED | Economy (prototype) | Two currencies, catalog-driven, Supabase-backed |
| SHIPPED | Seraph corruption arc | Alignment axis, Infernal transmutation, Resist the Fall |
| SHIPPED | AI Studio V2 | Control plane, Codex adapters, shared fullscreen shell, and courtyard scenarios are on `main`; local secret files remain ignored and untracked. |
| IN FLIGHT | Studio Wiki | On `main` and deployed as its own Vercel project at `https://card-engine-studio-wiki.vercel.app`. It **replaced** the old Production Guide link in the admin sidebar — there is one door to the record now, not two. Cards uses one shared alpha pool with append-only Keep / X-out / Needs Review decisions; admin and lore-director partners share Ideas visibility while keeping author-only edits, and the database behind both is confirmed live. A deploy carries 22 MB instead of 93 MB and shows the commit it was built from. Its element and archetype pages can no longer drift from the game — the build fails if they do. **Open:** the first Raheem/Tori signed-in walkthrough, and the forward-looking "where this is going" surface Raheem is writing himself. |
| IN FLIGHT | Boss battles | 2 bosses. **Still Season is uncommitted** — see §0 |
| IN FLIGHT | Castle courtyard | The current courtyard remains live and **all 4 stalls are unwired**. Courtyard V2 is a pending replacement: its forge quadrant is playable and locally verified on `codex/courtyard-forge-vfx`, but the other quadrants and production integration are unfinished. |
| IN FLIGHT | Art harnesses + skills | `create-arena` / `create-boss` / `create-prop` written, uncommitted |
| IN FLIGHT | Pixel UI kit | Six primitives shipped in `src/components/ui/` — Panel, PixelButton, Bar, Slot, Scrim, ScrollArea — on four PixelLab pieces (Round 3, approved by Raheem 2026-08-04 after 60 generations across three rounds). Variants come from props, never new art. Gallery at `/dev/ui-kit`. Assembly rules that cost real review time are written down in `public/assets/ui/PROVENANCE.md`. **Open: the other three stall menus.** |
| SHIPPED | The Collection, as an in-world case | `/collection` renders the pixel case and the pause menu already pointed there, so a player reaches it today. Painted cards inside pixel chrome; filters are a rack of the eleven archetype crests rather than a dropdown, rank is three chips, sort is one cycling button, and Inspect/Release carry the old page's detail and deletion. Scroll edges fade and show a chevron only where content continues. Verified at 1280x620 and 375x812. Preview with a full case at `/dev/collection-stall`. **Not yet opened from a courtyard stall — that waits on the four-quadrant design.** |
| SHIPPED | Ability performances | The reviewed form × caster-element performances, 27 shipped element kits, and approved effect assets run in the authentic `/battle` event stream. Combat follows **select card → choose one action → collective charge → stagger three launches → shared impact → held boss reaction → silence → boss preparation and attack → every targeted card reacts → recovery → control return**. The full-motion exchange reaches the next intent in about 6.2 seconds; boss-bound volleys land in a readable triangle, and Motion Off preserves the order as still tableaux. Released through PR #34 at production commit `98f66e7`. |
| SHIPPED | Decision Experience System — Stage 1 | The selected card exposes its abilities immediately, shared Mana/Tech availability matches reducer truth, and Wait is an explicit zero-output command. Strike and Guard remain optional only while that hero has a visible usable ability; otherwise a large lockout panel names the reason and offers **Wait & Continue**. Wait completes that card, focus advances to the next unfinished card, and selecting the next ability cannot snap back. Projections, the Threat Translator, contextual explanations, shared confirmation policy, authoritative receipts, and `/dev/decision-lab` remain intact. **Encounter Briefing and dedicated Pilot A/B comprehension passes are still open Stage 2 work** — see Combat gaps below. |
| PARKED | Board game / warband | Draft doc with open questions; branch 107 commits stale |
| PARKED | Boss art polish | Deferred pending art-direction alignment — though Still Season is doing it anyway |
| PLANNED | The tower (as a structure) | Two bosses exist; **length undecided** |
| PLANNED | The mine | Gold only. Not designed |
| WON'T DO | Multiplayer courtyard | **Dropped 2026-08-04** with the live-service model. Raheem: "I am no longer going to make this an ever-ending game where you play with your friends." |
| PLANNED | Cosmetics | After multiplayer. Intersects the Fashion Bible |
| WON'T DO | Payments / real money | **Removed 2026-08-04.** The game is a one-off Steam purchase, so there are no bundles, no payment rails, no receipt verification, and the economy plan §9 security prerequisites are moot. Do not build toward them. |
| PLANNED | PvP battles + trading | Not started |

### Branches with live work

Three. The two `codex/*` branches merged into `main` on 2026-08-04 — the Studio Wiki and the
Courtyard V2 forge checkpoint both live on `main` now.

| Branch | Ahead | Behind | What's on it |
|---|---|---|---|
| `combat-cards-and-resource` | 3 | 71 | Boss readout + Debt-Bearer fix |
| `feat/warband-battle-mvp` | 1 | 186 | Tested warband combat core. **Local only — never pushed** |
| `claude/vigilant-kowalevski-e30267` | 1 | 205 | One Workshop fix. Will conflict if revived |

**`feat/warband-battle-mvp` has never been pushed.** Like the Still Season, it exists on one
machine and will be silently absent from every other device you open. If it is worth keeping
(Q2), push it; if it is not, say so and it becomes a `WON'T DO`.

---

<!-- updated: 2026-08-04 -->
## 4. Open threads

**69 things started and not finished.** This is the list that didn't exist before. It will
feel like a lot the first time. That's the point — and marking something `WON'T DO` is a
legitimate, encouraged way to close it.

### Studio Wiki release — 3 items

| What | Where |
|---|---|
| Raheem and Tori each complete one signed-in production walkthrough: shared Keep / X-out / undo, private portrait hydration, shared Ideas visibility, and owner-only Ideas editing | `https://card-engine-studio-wiki.vercel.app/characters/cards` and `/work/raheem` |
| Build the forward-looking "where this project is going" surface — the Wiki records the present and the past well, but has no roadmap view. Raheem is writing this himself | Wiki navigation, alongside `/production` |
| Decide whether the old Production Guide page retires now that the Wiki replaced its link (Q8) | `docs/production/production.html` + `.claude/skills/production-log/SKILL.md` step 7 |

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

### Courtyard V2 replacement — 5 items

The forge quadrant is a verified development checkpoint, not permission to replace production.

| What | Where |
|---|---|
| Finish collider and occluder traces for the remaining courtyard, including walls and fountain | `src/pages/castle/v2-preview/` + Figma Courtyard V2 file |
| ~~Design~~ and build the top-left, bottom-left Archivist, and bottom-right quadrants — **all three are now designed** in `card-engine-courtyard-v2-quadrants.md`; the tower's six objects are generated and awaiting Raheem's pick | Figma Courtyard V2 file |
| Decide the tower objects: keep, cut, or re-roll each of the seven `art-tower-*` layers now sitting in the plate frame | Figma Courtyard V2 file |
| Find or generate the forge apprentice and forge pet — neither exists in git, and neither is an `art-` layer in `MpUs9WJKMvwTtpH9Akz4Rm` | unknown; blocking |
| Remove the counter's baked shadow and reduce the bench shadow without damaging the rug | Courtyard V2 source art |
| Replace preview-only walk bounds with the complete imported map collision set | `v2-preview/CourtyardV2PreviewScene.ts` |
| Integrate V2 into the production castle only after full-map runtime and human visual approval | `src/pages/castle/` |

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

### Placeholder art — 8 items

| What | Where |
|---|---|
| Shipped `human.png` violates all four of its own art rules | `SHOPKEEPER_GUIDE.md:75` |
| Chibi hero is temporary, to be regenerated at final fidelity | `SHOPKEEPER_GUIDE.md:11` |
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

### Pixel UI kit — 4 items

*Opened 2026-08-04. The kit and the first surface are built; the remaining stalls
are not. Six primitives now exist in `src/components/ui/`: Panel, PixelButton,
Bar, Slot, Scrim and ScrollArea. The Collection is live at `/collection` and
reachable from the pause menu — see the status board.*

| What | Where |
|---|---|
| Forge, Battle Tower and Training Yard have no menu yet | `castle/courtyard/stalls.ts` |
| Stalls are not wired to the menus — deliberate, pending Raheem's four-quadrant design | `castle/CourtyardViewport.tsx` |
| `BossHUDOverlay` still positions children at literal pixel offsets; needs the percentage contract before any re-skin | `pages/battle/BossHUDOverlay.tsx:55` |
| `FantasyPanel.tsx` is dead code — zero callers. Safe to delete, awaiting Raheem's nod | `pages/battle/FantasyPanel.tsx` |
| Mobile combat is CSS-drawn (`CombatFrame`) with no painted or pixel art at all — and iPhone portrait is launch-blocking | `pages/battle/mobile/MobileBossHeader.tsx:36` |
| No return-to-courtyard affordance exists on Forge / Collection / Battle | — |

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
<!-- updated: 2026-08-04 -->
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
| `phaser-runtime-director` | Phaser lifecycle, camera, collisions, runtime evidence | Game behavior that compiles but fails in play; duplicate scene/canvas ownership |
| `minigame-designer` | Mini-game loops, session length, reward feel | — |

### Skills — repeatable workflows

**Art and assets:** `create-arena` · `create-boss` · `create-prop` ·
`create-character-sprite` · `place-character-in-scene` · `trace-environment` ·
`art-pipeline` · `design-archetype-emblem`

**Design and delivery:** `design-feature` · `ship-approved-plan` · `design-minigame` ·
`create-archetype` · `work-proposal` · `consult-specialist` · `build-phaser-feature` ·
`visual-playtest`

**Upkeep:** `production-log` · `sync-project-knowledge` · `audit-project-knowledge` ·
`studio-health` · `balance-playtest` *(scaffold)*

**Retired records:** `ship-minigame` (the minigame is no longer wanted) ·
`extract-fullscreen-shell` (migration completed and verified 2026-08-03)

### Tools and readouts

Every harness, library script, review sheet and registration point is catalogued in
**[HARNESS_INDEX.md](HARNESS_INDEX.md)**. Standing rule: I name the relevant tools before
starting any art, boss, arena, sprite or prop work — never wait to be asked.

The short version:

| Tool | What it does |
|---|---|
| `bg-harness` | Environments and plates via Leonardo. 7 configs |
| `sprite-lab` | Characters, bosses, props **and pixel UI chrome** via PixelLab. 9 configs |
| `sprite-lab.mjs sheet` | Review gallery. Now renders object configs too, with acceptance criteria and in-context composites |
| `ui_kit_review.py` | Puts UI chrome over the plate on light *and* dark ground, and 9-slices the frame at game scale |
| `knockout_interior.py` | Clears a painted frame interior so it can 9-slice — repair instead of re-roll |
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

### What changed on 2026-08-04 — how crystals are FUNDED, not what they are

> **The two currencies stay exactly as they are.** Forge Crystals and Gold both remain, and
> Raheem has floated possibly adding a third. Nothing about the currency model, the catalogs,
> or the prices is being redesigned here.
>
> Raheem, correcting an over-broad reading of this: *"Don't change any of the currency. The
> economy is still gonna be Forge Crystals and Gold, and maybe even something else. It's just
> not gonna be linked to API tokens and the person actually spending money. They will earn
> gold, they'll earn Forge Crystals. It's gonna be a normal indie game."*

**The one thing that changed:** crystals are no longer *bought with real money*. They are
earned — the mine, little challenges, play. There is no in-game purchase system, because the
game is bought once on Steam.

The old rationale is kept struck through because it explains why a lot of the existing code
looks the way it does — not because it still applies:

> ~~Each forge spends real money at Leonardo and Anthropic. Crystals are the player-facing
> representation of that cost. If they could be earned, the generation bill would be unbounded
> and land on you.~~ *(Decided 2026-07-31; the funding half was reversed 2026-08-04.)*

**What makes that affordable:** the pre-generated card pool takes the paid API call off the
per-player path, so earning a crystal no longer maps to spending money on a live generation.
The two decisions depend on each other — do not adopt one without the other.

**Consequently the mine yielding Gold rather than Crystals is now an open design question,**
not a settled rule. It was settled *by* the purchase-only rule that just changed.

**No prices, rewards, balances or catalogs have been touched.** Economy plan §13 governance
still stands: those need Raheem's explicit approval, and this was a funding-model ruling, not
a numbers one.

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

<!-- updated: 2026-08-04 -->
## 8. Decision log

*Why, not just what. Newest first. This section is append-only.*

### 2026-08-04 — Characters are 2D chibi, and a canonical doc was telling us otherwise

The forge apprentice came back semi-realistic — tall, detailed, adult-proportioned — standing
beside a game whose actual character is a big-headed chibi. Raheem, immediately: *"That's the
vibe of the game, 2D chibi... what you did makes absolutely no sense."*

**Two causes, and both are now fixed rather than noted.**

`SHOPKEEPER_GUIDE.md` opened with *"THE QUALITY BAR IS THE DWARF, NOT THE HERO... the chibi hero
is temporary... do NOT tone new characters down to match the hero."* That instruction was
followed, and it is what steered the generation wrong. It is now **reversed**: the chibi hero is
the anchor, and the dwarf is off-vibe too and queued for regeneration.

The mechanical cause is sharper and worth more. **`/create-character-v3` has no `proportions`
field.** "Chibi" can only be written in prose there, and prose lost — the model drew a detailed
adult. `/create-character-with-4-directions` has a *real* proportions preset, and that is the
route that made the hero in the game. Regenerating on the hero's exact style block produced the
right character first try, for 8 generations.

**The rule now: copy `hero-chibi.json`'s style block verbatim and change only the identity.**
Vary body type, age, sex, ancestry and silhouette freely; never vary the register.

The rejected apprentice is kept rather than deleted — Raheem likes the character and wants her
in another zone. She is not wrong, she is in the wrong game's art style.

*Why it matters:* a cast generated from different style blocks looks assembled from different
games, and this project has now proved that a canonical document can be the thing causing the
defect.


### 2026-08-04 — It is an indie game you buy once, and the purchase system is removed

Raheem: *"It's gonna be a one-off indie game that people buy on Steam… People will not be
purchasing crystals anymore. They're gonna buy the game, and mine for crystals, and do other
things to get crystals. We're removing the whole purchase system. We're just gonna sell the
game."*

*Why it matters:* it reverses the single load-bearing economy rule — that Forge Crystals are
purchase-only because every forge spends real money at Leonardo and Anthropic. Crystals are
now EARNED. Payments, bundles and the §9 production-security prerequisites move from PLANNED
to WON'T DO, and multiplayer goes with the live-service model.

*What it does NOT change, because I first wrote this too broadly and Raheem corrected it:*
the currencies themselves. Forge Crystals and Gold both stay, possibly joined by a third.
This is a ruling about how crystals are funded, not a redesign of the economy.

*What makes it affordable:* the pre-generated card pool, decided the same day, takes the paid
API call off the per-player path. The two decisions hold each other up — neither works alone.

*What it re-opens:* the mine yields Gold rather than Crystals **because** crystals could not
be earned. That reason is gone, so it is a live design question again rather than a rule.

### 2026-08-04 — The generated Production Guide is retired; the Wiki is the record

Raheem: *"The production guide that you linked is obsolete and has been retired… Don't update
it anymore. We are updating the wiki."*

`PRODUCTION.md` is still the written record and still gets updated every session. What is
dead is the generated HTML page at `docs/production/production.html` and its artifact link —
the Studio Wiki reads this same file and publishes itself. The `production-log` skill has had
its regenerate-and-republish step removed so no future session recreates the second copy.

*What it closed:* Q8, which had been sitting in §0 asking exactly this.

### 2026-08-04 — Cards will come from a pre-generated pool, not a live forge

Raheem: *"Right now people are using API calls to generate cards and it takes 20 to 60
seconds. The intention was for the cards to be original. But now we're just gonna generate a
number of cards for each archetype, so users will be able to just pull from an
already-generated pool. It'll be much faster. We're just keeping the web access while we
create these cards and improve the questionnaire process."*

**Nothing has been built yet, and nothing has been removed.** The live forge is still the
shipping path and stays until the pool exists.

*Why it matters:* it removes the 20–60 second wait and takes a paid Claude + Leonardo call
off the per-player path. It also changes what the Forge SURFACE is for — the rotating
"summoning your champion…" messages are scaffolding for a delay that is going away, and the
moment becomes a reveal rather than a progress bar. The questionnaire survives and is being
improved; its job shifts from feeding a generator to narrowing which card you pull.

*What it opens:* two things worth a deliberate ruling rather than a drift — see Q10 and Q11
in §0.

### 2026-08-04 — This is a 2D pixel game, and the rule is "painted is what you look at, pixel is what you touch"

Raheem restated what the project is: a 2D pixel world you walk around in, where cards are how
you fight — not a card-collection website with a castle attached. The menus become stalls you
approach inside the world.

He also settled how the two art styles divide, which is the part that makes it buildable:
painted backdrops and scenery, pixel characters, props, effects and interface. The card is
the single painted exception.

*Why it matters:* it reverses a ruling Raheem made **earlier the same day**. He first chose
painterly chrome; a few messages later he chose pixel. Both are recorded deliberately — the
second one wins, and the reversal is why the six-piece art order moved from Leonardo to
PixelLab.

*What it closed:* a worry I had raised that the hand-painted courtyard was now off-direction.
It is not. Under this rule the painted plate is exactly right and the pixel layer is added on
top of it. **The courtyard does not get repainted.**

### 2026-08-04 — The pixel-vs-painted courtyard question was already answered, and we nearly paid twice

Before generating anything, the playbook turned out to already contain the verdict: a full
pixel courtyard was built and compared against the painted plate in an earlier session — 68
generations — and **the painting won**. The recorded standing direction was "PixelLab for
characters and for new objects that don't already exist in the plate."

*Why it matters:* that is almost word-for-word the direction Raheem described this session.
He was not changing course; he was restating a conclusion the project had already paid to
learn. Reading the playbook first saved re-running the experiment.

### 2026-08-04 — Round 3 of the pixel UI kit is approved; the rejected rounds are kept on purpose

Three rounds, 60 generations. R1 (plain carved wood) was *"a bit too plain."* R2 (heavy gold
and crystal) was *"a bit too gaudy… too much gold."* R3 — wood body, slim gold trim, one small
turquoise crystal — is approved.

Raheem asked that the rejected art be kept rather than discarded: the alternate frames become
UI for *other* stalls, and two accidental pieces (a potion and a key) become item art.

*Why it matters:* nothing generated through this endpoint is reproducible — PixelLab's object
route rejects a seed, so a re-roll returns different art, never the same art. Every file in
`public/assets/ui/` is a one-of-one, and the provenance file says so in those words.

*What it closed:* the real unknown, which was whether PixelLab could hold a **9-slice frame**
at all — its advertised interface support is buttons and health bars, and frames are never
mentioned. It can: the frame's centre came back genuinely hollow and its edges tile at a 32px
corner slice, both measured rather than eyeballed.

### 2026-08-04 — A frame with a painted interior was repaired locally instead of re-rolled

R3's frame came back with a solid opaque centre, which makes a 9-slice impossible. Rather than
spend 20 generations on an unreproducible re-roll — and risk losing a frame Raheem liked — the
interior was cleared deterministically with a new flood-fill script.

*Why it matters:* this is the playbook's correction ladder working as designed. The cheapest
rung that solves the actual problem, no identity drift, no spend.

### 2026-08-04 — The review harness was blank for every object config, and nobody had noticed

Raheem, mid-session: *"The harness is blank. I don't see anything. I would like to actually be
able to review them in the harness."* He was right. `sprite-lab.mjs sheet` only ever read the
field that **character** configs write, so every object config — props, tiles, the UI kit —
rendered an empty page. The art was on disk and paid for; the review surface silently showed
nothing.

Fixed for all object configs, not just this one. The sheet now also renders the acceptance
criteria at the top, and promotes in-context composites (every piece over the light plate and
a dark ground, plus the frame 9-sliced at real game scale) to full width.

*Why it matters:* chrome approved on a checkerboard is how you ship chrome that vanishes
against the plate — which is exactly what Round 1 did. The in-context view is what caught it.

### 2026-08-04 — The forge crystals are a code problem, and the tower is picked in Figma

Two things settled today that had been treated as art questions.

**The counter crystals will never be animated art.** PixelLab has no object-animation endpoint
at all: the object route returns a still, and the animation route is skeleton-driven and needs
a character, so it animates a rigged humanoid rather than a gem. Faking it with independent
"frame 1/2/3" prompts is the drift trap that already cost 186 generations. So the gems stay
static paint and every bit of their life is synthesized in Phaser for free. One rule was bent
deliberately: the courtyard life plan mutes every emitter within 80px of the hero, but the gems
are the forge's attractor, so their glow **ramps up** on approach and only the drifting motes
mute. Muting the counter exactly when the player walks up to it is the opposite of the ask.

**The tower quadrant's objects are generated and chosen in Figma, not in code.** Six objects
plus two the API volunteered, 50 generations, anchored to the hero crop. Anchoring instead to a
crop of the shipped forge counter was considered and rejected: that art is small and dense with
one-off content, so any usable crop lands on a gem, a card or a leg finial, and rides it into
whatever is generated next — the Still Season failure in miniature. They now sit in the plate
frame at true game scale for Raheem to keep or cut, because he is picking, not cutting.

*Two things this cost us that are now written down.* `item_descriptions` does not cap how many
objects a call returns — the style image's size does — so a two-item request still returned
four and spent half its slots on inventions nobody briefed. And objects always arrive untrimmed
and floating above the canvas bottom, failing the anchor gate by construction; trimming to the
alpha box is a mandatory post-process, not a defect.

**Still open, and blocking:** the forge apprentice and forge pet do not exist in git and are not
`art-` layers in the Courtyard v2 file, contrary to what we believed when the session started.

*Why it matters:* the expensive half of this work was the half nobody spent money on.


### 2026-08-04 — Being on `main` is not the same as being in the game

Raheem pulled both August 3 checkpoints — the Courtyard V2 forge preview and the Studio Wiki
— onto `main` so he can continue from any device. He was explicit that this is about not
losing work, **not** about shipping: "just because they're in GitHub doesn't mean they're
done and ready to go to production."

Only the Wiki actually goes out to people. The Courtyard V2 preview is built so a player
cannot reach it — the code that creates its route only exists in development builds, so
merging it changed nothing a player sees. That was verified in the real production build,
not assumed.

*Why it matters:* it makes `main` safe to use as the place work is kept, rather than a place
only finished things are allowed to go. Work stops living on one laptop.

### 2026-08-04 — The Studio Wiki replaces the Production Guide, rather than joining it

Raheem and ChatGPT rebuilt the production record as the Studio Wiki, and he asked for the
old guide link to be removed from the admin sidebar rather than kept alongside it. The old
guide was a generated page living on a personal Claude link: only republishable by hand from
a chat, private to one account, and a wall of text.

The Wiki reads the same `PRODUCTION.md`, redeploys on its own, and surrounds the text with
the art, the animation, and the review rooms. Admin now has one door to the record.

*What it closed:* two versions of the truth. It also leaves an open question (Q8) — whether
the old page and the manual republish step retire completely.

### 2026-08-04 — The Wiki gets smaller by shipping less, never by looking worse

The Wiki was handing Vercel 93 MB per deploy because it served the game's entire public
folder. Raheem's constraint was exact: make it faster and cheaper, **but do not damage the
page** — the art is the reason the Wiki exists and it took a long time to make.

So nothing was compressed, resized, or deleted. The Wiki was simply measured: it displays
about 20 MB of that 77 MB, and the rest is card frames and forge plates no Wiki page renders.
It now serves everything while you are working on it and ships only what it shows. 93 MB → 22
MB, every displayed image byte-for-byte identical, confirmed by viewing the real build.

*Why it matters:* the honest version of "make it smaller" was an inventory problem, not an
image-quality problem. Re-encoding the art would have been the easy answer and the wrong one.

### 2026-08-04 — The Wiki must fail loudly rather than quietly fall behind

Raheem's goal for the Wiki is that it "stays updated as we complete things." Its element and
archetype pages were hand-maintained copies that happened to match the game with nothing
keeping them matched, and its tests checked those copies against numbers typed into the test
file — which pass forever while the page silently goes stale.

Both now come from the game's own definitions. Adding a new element to the game breaks the
Wiki build until someone writes how that element looks in combat. Printed counts are counted,
not typed; one of them was already wrong, claiming 29 element crystals when Time has none.

*Why it matters:* a wiki that is quietly out of date is worse than one that refuses to build,
because nobody can tell by looking. This also makes the page's own claims self-correcting
instead of a maintenance chore.

### 2026-08-04 — A deployed page says when it was built

The Wiki reads `PRODUCTION.md` when it is built, so what you see is a snapshot. A three-week-old
deploy looked identical to a fresh one. The sidebar now names the commit and date it was built
from, and turns amber once that is more than a week old.

*Why it matters:* people stop trusting a reference they cannot date. This is the cheapest way
to keep the Wiki credible as it becomes the home for the project.

### 2026-08-03 — Courtyard V2 is a verified preview, not the production courtyard

Raheem accepted the new forge quadrant as a strong stopping point and asked for it to be
preserved in GitHub without replacing the existing courtyard. The checkpoint includes the
new plate, a controllable chibi, softer white heel dust, forge atmosphere, layered counter and
bench occlusion, and Raheem-shaped Figma ground-contact colliders. Both named passages pass in
normal and reduced-motion runtime checks. TypeScript, focused lint, and the production build
pass, and the V2 route/assets do not appear in the production bundle.

The remaining quadrants, full-map collider/occluder coverage, counter/bench shadow cleanup,
and production integration remain pending. The existing `/castle` experience is unchanged.

*Why it matters:* the work is durable and reviewable on another device without presenting one
finished quadrant as a finished courtyard or risking the current production hub.

### 2026-08-03 — The combined boss-combat overhaul ships to production

Raheem approved the reviewed fight as a major improvement and authorized production release.
Ability Performance and Decision Experience Stage 1 shipped together through PR #34 at
production commit `98f66e7`: party planning, one-action-per-card lock-in, element-specific
charges and travel, synchronized triangular impacts, readable boss response pacing, explicit
Wait-only lockouts, projections, Threat Translator, confirmation policy, and receipts all run
in the authentic `/battle` experience.

GitHub's production build and Vercel deployment both passed. The production project retains
its existing Vercel access protection; opening the live game from a new browser requires the
owner's Vercel login and two-factor code. That security setting was preserved, not weakened
for testing.

*Why it matters:* the branch work is no longer a prototype or review lab. The approved combat
flow is now the version served from `main`, while Encounter Briefing and the two remaining
comprehension passes stay honestly scoped as later Stage 2 work.

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
### 2026-08-03 — Courtyard V2 is visible as pending work, not mistaken for production

Raheem accepted the forge quadrant as a strong stopping point and asked for the work to be
preserved across devices and shown in the Studio Wiki. The Wiki now distinguishes the current
production courtyard from its pending V2 replacement and records exactly what the checkpoint
proves: chibi movement and heel dust, forge atmosphere, Figma-derived colliders and
walk-behind depth, and two passable forge aisles in normal and reduced motion.

The remaining three quadrants, full-map collider/occluder coverage, baked-shadow cleanup, and
production integration remain visible as open work. The existing `/castle` is unchanged.

*Why it matters:* coworkers can see real progress without interpreting one finished quadrant
as a finished replacement or losing the next steps when the original chat is gone.

### 2026-08-03 — The Wiki is a shared partner studio with its own permanent link

The Studio Wiki is a separate Vercel project under the same Dream Project team as the game.
It has its own stable URL and deployment settings while sharing the team's Vercel plan. The
game's admin sidebar keeps the existing **Production Guide** link and adds **Studio Wiki**
directly beneath it; either partner can also bookmark the Wiki and open it without navigating
through the game.

Wiki Studio data requires a Card Engine login. The `admin` and `lore_director` roles can read
the same development card pool, review history, and Ideas notebook. Each notebook entry keeps
its author, and only that author may edit it. Ordinary player accounts do not gain Studio
access.

*Why it matters:* Raheem and Tori work from one shared production room without turning it into
a public player surface or losing who authored a decision or note.

### 2026-08-03 — Alpha cards share one reversible review room; Raheem's ideas remain notes

During alpha, every current and newly created Supabase card belongs in the Wiki's shared
Card Evaluation Room. The latest authorized verdict is the team's current state: **Needs
Review**, **Keep in alpha**, or **X'd out**. These verdicts are append-only and reversible.
X-out never deletes the character, and Keep never promotes it into the permanent game. The
five repository fixtures remain available only as secondary layout evidence, not the roster.

The Work Board also gains **Raheem's Desk**, containing one private, persistent Ideas Notepad.
Notes can be captured and edited across devices, but they carry no priority, status, deadline,
deletion action, or automatic conversion into work. Moving an idea into production remains a
deliberate future decision.

*Why it matters:* the whole alpha team can judge the same real cards without confusing review
with canon or destroying work, while Raheem can preserve a new thought without letting it
silently redirect the current goal.

### 2026-08-03 — Card evaluation is evidence-led; permanent promotion stays a future workflow

The Wiki's Cards destination is now the **Card Evaluation Room**, not a gallery. It inventories
four named development candidates and one unnamed Druid tier-art study, filters them by
archetype and evidence class, and opens a deep dossier for the selected record: uncropped art,
known rank progression, lore, stats, ability loadout, repository sources, readiness evidence,
and investigation notes. Art-only studies remain labeled **not a card**, missing ranks remain
visible as missing evidence, and no percentage or automatic approval score is calculated.

The page is read-only. It deliberately has no approve, promote, or production action; permanent
acceptance still requires a later human-governed workflow and an explicit recorded decision.

*Why it matters:* the studio can now understand what each development card does and why before
deciding whether it deserves permanent work, without turning asset presence or a successful
test into accidental canon.

### 2026-08-03 — Cards is a first-class destination, and a card is shown whole

Raheem reversed the earlier placement of Cards beneath Characters & Archetypes. **Cards**
now has its own Explore navigation entry between **Bosses & Arenas** and **Elements**. The
Cards page owns development artifacts and the future accepted roster. Characters &
Archetypes remains archetype-led: selecting an emblem shows only the permanent cards accepted
for that archetype, which is currently zero for all eleven.

The three development assets are complete card compositions, not portrait crops. The Wiki
now renders their native tall proportions with the full frame, name, artwork, and lower stats
visible. Gryndak and Ashvara's crossed source filenames are corrected in the Wiki mapping so
the visible card agrees with its explanation; the underlying game fixtures are unchanged.

*Why it matters:* The card work is no longer hidden or visually diminished, and nobody has
to choose between seeing the whole artifact and understanding that it is still development
evidence rather than accepted canon.

### 2026-08-03 — The Wiki owns reference; admin owns live operations

The admin sidebar no longer presents Cards and Abilities as general libraries. **Ability
Review** keeps the actions that change state: approve, reject, merge, generate candidate art,
and accept or reject those candidates. The private cross-user card table remains available
from the Overview metric as **Live Card Audit**, because owner identifiers and prompt
provenance are operational records, not public Wiki material. The obsolete Production Guide
link is removed; a Studio Wiki link returns only after the Wiki has an approved deployed URL.

The Wiki's Cards page lives beneath Characters & Archetypes because the card is the format a
character comes in. It records Gryndak, Seojin, and Ashvara as **TESTED · DEVELOPMENT
ARTIFACT** examples and keeps **Permanent Archetype Cards** at **0 ACCEPTED**. No asset,
database row, or successful test can promote a card. A permanent card requires Raheem's
explicit human acceptance.

*Why it matters:* The team can learn from every useful card test without accidentally turning
practice work into canon, while the admin remains a focused place for private data and actions.

### 2026-08-03 — Studio memory, current work, elements, and abilities keep separate jobs

The Production navigation keeps its decision page, renamed **Decision Log**, because it
answers a different question from the Work Board. The Decision Log is the append-only record
of why Raheem and the studio chose a direction. The Work Board remains the place for advice,
active execution, necessary debt, and assignments. The Wiki now links between them explicitly
instead of making two pages appear to be competing task lists.

The former Abilities & Elements page is also split. **Elements** owns crystals and the
PixelLab charge, travel, and impact library. **Abilities** keeps the stable `/abilities`
address and reads the game's current 41-ability seed roster and approved-art manifest directly.
Only Thornmantle and Bearing Witness currently have art approved for the live roster; retired
paintings remain on disk but are not presented as current ability art. A focused admin-dashboard
audit is the next separate review, not part of this navigation change.

*Why it matters:* Current work, historical reasoning, elemental language, and named powers can
each grow without obscuring one another or creating a second source of truth.

### 2026-08-03 — The Work Board is four views of one production ledger

The Studio Wiki now has a third first-class navigation group named Work Board. AI Advice
shows the Studio Lead's ranked recommendations and unresolved questions. Active Work shows
only `IN FLIGHT` workstreams plus the branches carrying live work. Required & Deferred keeps
the categorized unfinished obligations visible. Tori's Desk projects the existing Lore queue,
including provisional boss writing, telegraphs, move names, and the need for an archetype prose
voice.

All four pages read from `PRODUCTION.md`; they do not keep a second task database or private
browser state. A goal becomes locked only when Codex or Claude records its owner, state, next
checkpoint, and blocker in that ledger through the production-log workflow. During development,
the Wiki now reloads automatically when the ledger changes.

*Why it matters:* Anyone joining a session can find useful work at the right level—advice,
current execution, necessary debt, or a named collaborator's desk—while every assistant still
updates one durable source of truth.

### 2026-08-03 — Studio V2 is handed off as a workflow, not an agent collection

The Studio Wiki now gives AI Studio V2 its own coworker handbook under Production. It leads
with the repeatable path from idea through creation, implementation, evidence, and human-approved
release. The specialist-agent and skill roster remains visible, but it is supporting reference:
the valuable framework is the production process Raheem developed and proved while building the
game.

New collaborators create their own Figma and Leonardo accounts and personal spaces first. The
team can then connect shared workspaces through those services without transferring personal
credentials or provider keys. The handbook points every collaborator back to the repository's
current production record, architecture, charter, and capability registry instead of depending
on a past conversation.

*Why it matters:* Another developer can learn how the studio actually makes and integrates game
art, join the shared work safely, and preserve the reasoning behind each result without treating
the agents themselves as the product.

### 2026-08-03 — Element identity and battle expression are separate Wiki layers

The Studio Wiki's Element Codex keeps each approved crystal as the dominant identity artwork,
then presents a separate battle-expression theater for charge, delivery or manifestation, and
impact. It covers all 29 canonical elements: 27 use the committed PixelLab combat-effect library
from `ability-performance-system` at `c39304f`, Holy honestly uses the procedural ward renderer,
and Time remains deliberately unmapped because no current archetype can reach it. The theater is
keyboard-operable, responsive, playable on demand, and offers a motion-free three-beat tableau.

Only the committed art library entered the Wiki. No combat code or uncommitted work from the
Decision Experience worktree was copied, and every imported performance kit remains labeled
`IN FLIGHT` candidate art until the separate gameplay-integration task lands and is reviewed.
The full library remains discoverable through Art & Assets while representative playback lives
on Abilities & Elements.

*Why it matters:* Collaborators can now see what each element actually looks like in combat
without mistaking candidate effects for shipped gameplay or replacing the crystal identity art.

### 2026-08-03 — Battle Tower is the primary playable mode in the Studio Wiki

The Wiki now presents Battle Tower as the castle's first great door and the place to explain
party building, boss intent, action order, attacking, guarding, elements, damage, and the
shared Mana and Tech chambers. The existing `/minigames` address remains stable for now, but
its visible name is Battle Tower. Bosses & Arenas remains a separate production inspector for
the art, animation states, and arena assets used on Tower floors.

The Wiki does not invent a final floor count, rewards, or unverified elemental combat art. The
new PixelLab effect assets will be handled in a later asset-verification pass.

*Why it matters:* Players and collaborators can now understand the game's central play loop
without confusing the playable mode with the library of assets used to build it.

### 2026-08-03 — The Studio Wiki becomes a permanent repository-backed application

The Wiki lives in its own `studio-wiki/` React/Vite package inside the Card Game repository.
It shares canonical Markdown and optimized web assets with the game, but it will deploy as a
separate Vercel project and URL so Wiki changes cannot break the playable game. The local
implementation may continue without hosting cost; deployment and access protection remain a
separate human gate.

The active Wiki includes navigation, search, all eleven archetype emblems, the Debt-Bearer's
real seven-state animation inspector, full-art element galleries, production reading pages,
workshop documentation, responsive layouts, reduced-motion handling, and honest missing-media
states. Minigames remains intentionally held and Forge Strike is not presented as active work.

*Why it matters:* Claude and Codex can now improve one durable source with Git history instead
of rebuilding a temporary conversation link, while the game and the Wiki keep separate failure
and release boundaries.

### 2026-08-03 — Full assets will live in OpenNest; GitHub keeps the web catalog

The current repository keeps canonical documents, metadata, and web-sized previews. Raheem's
planned OpenNest storage at home will hold the full-resolution generated originals. The Wiki is
the visual catalog across both locations. No second GitHub repository will be created now; the
metadata boundary allows storage to split later without redesigning the Wiki.

*Why it matters:* The Wiki can grow into the studio's central information and asset-discovery
surface without bloating normal Git history or depending on home storage to render day to day.

### 2026-08-03 — The Lycanthrope emblem is integrated

The generated Lycanthrope emblem now lives with the other ten archetype emblems and is used by
the game and Studio Wiki. The old open question and missing-art entries are closed.

*Why it matters:* Characters & Archetypes can present the complete eleven-emblem collection
without a fabricated substitute or a pending tile.

### 2026-08-03 — Raheem accepts the private-device key exception

This supersedes the release requirement in the following earlier entry. Do not rotate,
inspect, or alter the current local provider credentials. Their files remain private to
Raheem's devices, covered by Git ignore rules, untracked, and protected from AI-tool reads
and edits. Studio health verifies only the filenames' Git protection, never secret contents.
Reopen the key-hygiene decision before the repository becomes shared or public, or when the
production security model changes.

*Why it matters:* Studio V2 can proceed to its human release gate without disrupting the
current private setup, while Git still has an objective guard against publishing the files.

### 2026-08-03 — Studio V2 is locally complete; release waits on key hygiene and human approval

The shared `.claude` control plane now has checked-in Codex adapters under `.agents` and
`.codex`, read-only specialist sandboxes, fail-closed hooks, a passing health/routing/
regression suite, a live-verified shared combat shell, and a development-only Phaser bridge.
All three real courtyard scenarios pass with screenshots and clean consoles. The bridge is
absent from production bundles. Nothing has been pushed or deployed yet.

The live check also found two legacy provider variables using the unsafe `VITE_` prefix in
the local `.env`. Current runtime code uses server-side proxies and does not depend on those
variables. Raheem must remove those two local entries and rotate the affected Anthropic and
Leonardo credentials before release; Studio hooks deliberately prevent an automated session
from editing secret files.

### 2026-08-03 — The minigame shipping workflow is retired

Raheem no longer wants that minigame. `ship-minigame` is hidden and non-invocable; it is not
unblocked merely because the shared fullscreen shell now exists. Existing code is preserved
until Raheem explicitly asks for removal. The one-time fullscreen extraction workflow is
also retired because its migration is complete.

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

<!-- updated: 2026-08-04 -->
## 9. Ideas raised, not committed

*Said out loud, captured so they aren't lost, explicitly **not** promises.*

- **Mine for secret lore** — the mine as a lore-discovery surface, not just a currency tap.
- **Things only obtainable from PvP** — rewards exclusive to player battles, which then
  unlock tower floors.
- **Visible cosmetic unlocks in the courtyard** — the social payoff of gathering.
- **More minigames as doors** — the shape accepts them; none are designed.
- **Extract the harnesses as a reusable toolkit for future games** — Raheem explicitly
  deferred this. Focus is this game.
- ~~**Explore a generated combat-UI art pass**~~ — **committed 2026-08-04.** PixelLab *is*
  the right UI tool, the art is generated and approved, and this is now a live workstream in
  §3 with its own thread list in §4. Left here struck through so the trail from idea to
  commitment is visible.
- **Promote evaluated cards into the permanent roster** — the Evaluation Room is read-only
  for now. Design the explicit acceptance record, provenance gates, and promotion action only
  after the team has used the dossiers enough to understand the real review process.

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

<!-- updated: 2026-08-03 -->
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
the project owns. **Not everything is at that standard yet** — some bosses and abilities still
run on placeholders, and the plan is custom art for abilities too.
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

<!-- updated: 2026-08-03 -->
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

### Characters — 2 items

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

