# Warband Battle Mode — Design Draft

> **Status: WORKING DRAFT (discussion synthesis, not an approved spec).**
> Captured from a design conversation on 2026-07-23. Nothing here is balanced, priced, or
> code-ready yet. Numbers require game-systems-designer review; lore/element content requires
> lore-fantasy-director review; any price/reward touches economy-plan §13 (Raheem approval + a
> documented reason). Open questions are listed at the bottom — several core mechanics are still
> undecided (resources, movement cost, board shape).

## 1. Vision & Genre Position

A fast, **small-warband** card battler where near-infinite *unique* cards are the identity, and the
depth comes from **elemental positioning and reactions**, not raw stat trading. Built to **gauge
player interest cheaply** — short matches, low commitment, phone-friendly.

- **Chaos-first (Path B), balance-later (Path A).** Launch leans into wild variety and fun; a
  competitive/ranked layer using stable "battle profiles" is a *future* option, deliberately not
  walled off, not built now.
- **Reference points:** Marvel Snap (small board, short matches, zones), roguelike runs
  (Slay the Spire-style meta-progression), elemental reactions (Genshin-style contact effects).
- **Why small warband:** low barrier to entry for validation; fits iPhone-portrait + desktop launch
  targets; keeps the ritual/art the star instead of a sprawling board.

## 2. The Core Loop

```
VAULT (permanent, safe collection)
   │  assemble a small squad
   ▼
WARBAND  ──►  RUN / MATCH  ──►  fight on elemental terrain
   ▲              │
   │              ├─ cards can FALL (never permanently lost)
   │              ├─ win → Gold + small capped stat gains
   │              ▼
   │        REVIVE fallen cards (free+slow, or paid+instant)
   │              │
   │        stats cross a THRESHOLD → tier-up UNLOCKS (earned, not bought)
   │              │
   └───  pay Forge Crystals → TIER-UP CEREMONY (Claude + Leonardo regen) ──┘
```

## 3. Combat Model (DECIDED in principle)

- **Small warband.** A handful of cards per side (exact count OPEN). Fast matches (~few minutes).
- **Themed interactive arena (map), chosen at match start.** Instead of per-tile elemental terrain, the
  *whole board* is one coherent, **destructible** environment that players **pick or vote on** before
  deploying — e.g. a forest that can be set ablaze, a castle whose walls can be knocked down, a canyon
  with a fall that claims non-flying units. Each map has: a theme, one or two **signature interactive
  mechanics** (spreading fire, breakable walls, a lethal chasm), a **traversal rule** (who can cross the
  gap), and an **elemental leaning** that rewards bringing the right warband (fire shines in the dry
  forest; flyers own the canyon; defensive units hold the castle).
- **Elements act ON the environment.** With tiles no longer elemental, element identity lives on **cards**
  and expresses through **card↔card reactions** and dramatic **card↔environment interactions**: a fire
  card ignites the forest and the blaze spreads; a water card douses it into steam; an earth card bridges
  the canyon or topples a wall. **Terraforming is now the headline** — the map is a living object every
  match reshapes. Expressed via the existing ability system with a **map/feature target type**.
- **Elemental reactions are the skill layer.** When two elements come into contact (card↔card or
  card↔crystal), a reaction fires (e.g. Fire+Ice = Melt burst; Storm+Water = Conduct chain-stun;
  Earth+Fire = hazard terrain). The interesting decision is *which elements you bring into contact,
  and in what order* — not "who has the bigger number." Reuses the existing 26-element system.
- **Trade vs. go face.** Each attack chooses between hitting enemy **cards** or the enemy **crystal**.
  This is the proven core tension of the genre.

### Turn & Resource Economy (DECIDED — "Snap-simple")

- **Ramping energy:** turn N grants N energy. **Deploying** a card costs its energy value. This is the
  *only* resource math — kept deliberately light for fast, phone-friendly matches.
- **Movement is free but limited:** each card may move a fixed amount (≈1 tile) per turn. No pool tracked.
- **Attacking is free but limited:** each card may attack once per turn.
- **Hard terrain crossings cost something.** Crossing gated terrain (chasm via flight, river via aquatic)
  costs energy or a full turn's movement — so traversal stays a meaningful choice even in the simple
  model, preserving the "flying across the map matters" tension.
- Depth comes from **elements, terrain, and reactions**, not from resource bookkeeping. (Can graduate to
  a full action-point economy later if players want more tactical chew.)

### The Crystal (your avatar)

Your defended object is a customizable **elemental crystal** — your persistent identity across every
run, lives in the Vault, shareable.

- **Facets = your shields.** Several facets, each tied to an element you chose. Breaking facets is how
  the opponent wins. *Which* facet is exposed and *what element* attacks it triggers reactions
  (Fire→Ice facet shatters fast; Fire→Water facet fizzles).
- **Crystal Power = your signature ability** (e.g. Decoy, Split-into-three, Trap). Each gains a second
  layer of meaning per element (a Shadow decoy punishes, a Storm split chains, a Fire trap burns).
- **Cosmetics = pure "look cool"**, zero power. This is the clean monetization surface.

### Combat Resolution (DECIDED — shape; exact numbers pending game-systems-designer)

- **`Def` = health/toughness** (the unit's HP pool); **`Atk` = damage**. No separate HP stat — a unit
  **Falls** when its `Def`-pool is depleted.
- **Simultaneous trade:** when two units clash, each deals its `Atk` to the other's `Def`-pool at once, so
  attacking is *risky* (you can lose your unit in the trade) — reinforcing the Fall/revive stakes.
  Attacking a **crystal facet** is one-way damage but leaves the attacker exposed. (Trade vs. go face.)
- **`Mana` / `Tech` = ability power, NOT a combat stat.** It powers abilities — the vehicle for elements.
  `Mana` = arcane elemental spells; `Tech` = gadgets/drones/traps. Same slot, different flavor,
  balance-parity. Ability + reaction magnitude scales with this stat.
- **Elements via states + a small reaction table (NOT 26×26).** The 26 elements collapse into ~5 **states**;
  a **reaction** fires when an opposing element hits a unit/tile already in a state; size scales with the
  caster's `Mana`/`Tech`. Starter set: **Burning**→Steam (blind, −Atk), **Soaked**→Conduct (chain),
  **Frozen**→Melt (burst + skip), **Charged**→Overload (knockback — can shove a unit into the canyon),
  **Rooted**→Wildfire (spreads to adjacent).
- **Damage formula (game-systems-designer recommendation, adopted pending playtest):**
  `damage = Def_target × Atk_attacker / (Atk_attacker + Def_target)` — a diminishing-returns curve that is
  *mathematically incapable of a one-shot* (damage is always strictly less than the target's pool) and
  self-normalizes to ~2–3 clashes at every rank with **no** interaction with bias tiers, hard caps, or the
  rank-sum cap. Clash count reduces to `C = 1 + Def_target / Atk_attacker`.
- **Reaction magnitude:** `burst = min(ability_stat × 0.4, Def_target × 0.5)`, where `ability_stat` is the
  caster's `Mana` or `Tech`. A caster's burst ≈ one full clash of damage, capped so a reaction alone also
  can't one-shot. Frozen→Melt adds a skip-turn (tempo). **Overload knockback = 1 space** — only claims a
  unit already at the canyon edge (the one intended instant-Fall, gated by positioning).
- **§13 note (from the designer):** tier-up Crystal price, stat-gain-per-win, and revive costs are economy
  §13 items — they need Raheem's explicit approval + a documented reason when we set them. Combat math is not.

## 4. Stakes: Cards Fall, Never Die (DECIDED)

- Cards that die in battle enter a **Fallen** state — benched, not lost. No permadeath by default.
- **Revive, two lanes:**
  - *Free/slow:* rest timer, or a modest **Gold** cost.
  - *Paid/instant:* **Forge Crystals** to revive immediately / mid-run / for precious Ascendant cards.
- **Run-level stakes, collection-level safety:** a Fallen card is out for the rest of the current run
  unless you pay to revive now; between runs it recovers. Real in-the-moment risk, no collection trauma.
- **Optional hardcore mode (future):** an opt-in mode where death *is* permanent, for thrill-seekers.
  Never the default.

## 5. Progression & Tier-Up (DECIDED — key structure)

**Cards NEVER auto-tier-up.** Two independent gates, both required:

1. **Earn eligibility (cannot be bought).** Play (PvE runs + PvP wins) grants small, **capped,
   affinity-weighted** stat gains. When stats cross a rank threshold, tier-up **unlocks**.
2. **Pay to perform it (cannot be skipped).** The player chooses to spend **Forge Crystals** to run
   the **tier-up ceremony**, which fires the real API calls (Claude lore regen + Leonardo art regen),
   evolving the card while preserving locked identity fields.

- **Stat growth ≠ tier-up.** Winning fuels stats for free; tier-up is a separate, paid, deliberate ritual.
- **Anti-pay-to-win:** money can't buy the threshold; grinding can't skip the cost. Same work for everyone.
- **Lore-true:** evolution is earned through the character's journey, then sealed by a chosen ritual —
  matches the Bible's "ascension is narrative-earned, never purchased."

## 6. Economy & Monetization (DECIDED — principles only, no numbers)

- **Two currencies (existing):** **Gold** (earned in play) and **Forge Crystals** (premium; earnable
  *and* purchasable).
- **Cosmetics for cash; power always earned.** Skins, shatter FX, crystal looks — sell freely.
- **PvP wagering: GOLD ONLY, never Forge Crystals.** Wagering purchased premium currency on match
  outcomes = real-money gambling (legal/app-store/ethical exposure). Forge Crystals may be a **prize**
  from a fixed pool, never a **stake** players bet.
- **Retention engine:** tier-ups and revives are natural, lore-justified Forge-Crystal sinks that fund
  the API costs they incur.
- **Never pay-to-stay:** a free player must always be able to *earn* their way back (revive via
  Gold/timer, forge replacements via Gold) — paying is an accelerator, not a toll.

## 7. Guardrail Stack

- Tier-up double-gated (earn threshold **and** pay Crystals).
- Stat gains bounded by **hard caps**, the **rank-sum cap of 7**, and **affinity weighting**.
- Tier-up Crystal price must at least **cover API cost**; subject to economy-plan §13 governance.
- Wagering is **Gold only**.
- PvP **matchmaking by tier/power** + wager floors/caps (anti-snowball).
- **PvE = reliable ladder; PvP = optional accelerator** (anti-death-spiral).
- Revive keeps the collection permanently safe.
- Monetization is cosmetic-first.

## 8. Reuse of the Existing Engine

The design deliberately turns *existing* card fields into battle mechanics (little new card data needed):

| Existing field | Becomes in battle |
| --- | --- |
| **Element** (26) | Card identity, reaction trigger, crystal facet, environment interaction (ignite/douse/bridge) |
| **Traversal keyword** (flight/aquatic) | Which map hazard a card can cross (canyon fall, moat, blaze) |
| **Dominant stat / border** | Attack-role vs defense-role sorting (raider vs wall) |
| **Atk / Def / Mana / Tech** | Combat values (exact mapping OPEN) |
| **Rank** (Foundation→Forged→Ascendant) | Power tier + the paid evolution ceremony |
| **Ability system** (typed effects/triggers) | Expresses decoy/split/trap, heals, redirects, reactions |

## 9. Reconciliation Needed in Code

- **Rank is currently *derived* from stat values (not stored).** The new model requires rank to be an
  **explicit, stored, paid state** gated by a stat threshold — crossing the floor must *unlock*, not
  *auto-apply*, the tier. `tierUp.ts` + rank logic need rework.

## 10. Open Questions (STILL TO DECIDE)

**Map / arena system (NEW — decided in principle, details open):**
- **Board structure (DECIDED):** 2–3 **open lanes**, not a fine grid. *Canyon example:* players start at
  **top and bottom**; a **horizontal canyon** splits the field. Three vertical lanes span it — a central
  the entire **central lane is a bridge** spanning the canyon end-to-end (the one safe ground corridor to
  the enemy crystal); the rift only gaps the two **outer lanes**, which are **fly routes** (air only;
  grounded units can't cross and risk the fall).
- **Map timing (DECIDED):** the map is **chosen first**; players then build/commit their warband to fit it
  (rewards specialists, matches the "both came prepared" fantasy). *(Pick-vs-vote UI still open.)*
- **How elements favor a map:** per-map elemental *leaning* vs purely card/environment interactions — or both.
- **Map roster:** the starting set of maps and each one's signature interactive mechanic + traversal rule.

**Core combat:**
- **Lane depth & warband size (leaning):** ~3 lanes × 3–4 spaces per side; warband ~6–8, a few deployed at
  once. Needs tuning — not locked.
- **Turn structure:** simultaneous (Snap) vs alternating (Hearthstone).
- **Win condition specifics:** break all facets (decided); turn limit / sudden-death still open.
- **Damage formula (RESOLVED — designer recommendation):** ratio-compression `damage = Def·Atk/(Atk+Def)`;
  reaction `burst = min(ability×0.4, Def×0.5)`; knockback 1 space. Now a **playtest-tuning** item — watch the
  clash-count distribution (target median 2–3, ~0% at 1) and high-`Mana`/`Tech` warband win-rate (<~55%).

**Deeper / later:**
- **State/reaction tuning:** which of the 26 elements map to which of the ~5 states; per-reaction effects.
- Crystal **facet count** and starting **Crystal Power** roster.
- Actual **numbers:** stat-gain-per-win, revive timers/costs, tier-up Crystal price (systems-designer + §13).
- **Matchmaking** brackets.
- **PvE run** structure (length, map, bosses).
