# Boss Battle System — Combat Contract

Companion spec to [card-engine-ability-system-spec.md](card-engine-ability-system-spec.md). Governs the runtime that resolves boss encounters. Written at Phase B1 of Stage B — before any runtime code lands — so the contract can be reviewed and gated (Master Plan §50 Gate 5) before B2 headless simulator work begins.

**Machine-checkable projection:** [card-engine/src/types/combat.ts](card-engine/src/types/combat.ts).

**Status:** Draft, awaiting Gate 5 approval.

---

## 1. Non-negotiables

1. **Deterministic**: `(BattleSnapshot + seed + ordered PlayerAction[])` → identical `BattleEvent[]`. No wall-clock reads, no `Math.random()`, no `Date.now()` inside the runtime.
2. **Snapshot-immutable**: mid-battle re-publish of an ability version does not affect an in-flight battle. Runtime reads `HeroCombatant.snapshot.abilities[i].version`, never `AbilityStore.getCurrentVersion()`.
3. **Pure reducer**: `reduce(state, event) → state`. Side effects (persistence, animations, sound) live outside.
4. **Solo-first, party-ready**: schema supports 1–4 heroes; UI ships one.
5. **No AI calls at play time** (Master Plan §25). All ability text, boss text, and reward IDs are pre-baked.

---

## 2. Turn structure

Each round runs the phases below in strict order. `awaiting_player_action` and `awaiting_target` are the only pauseable states; every other phase resolves synchronously.

```
start_of_round
  → boss_intent_reveal
    → awaiting_player_action  ← UI pauses here
      → awaiting_target       ← UI pauses here (if action needs target)
        → resolving_player
          → resolving_reactions
            → resolving_boss
              → end_of_round
                → checking_phase_transition
                  → checking_victory
                    → (loop) OR → battle_over
```

**Order-sensitive rules:**
- Start-of-round triggers fire before boss intent is telegraphed.
- Boss intent is chosen and locked *before* the player selects their action, so the player has full information.
- Reactions (counterattack, on_damage_received) fire immediately after the triggering event, before the next scheduled phase.
- Statuses tick, then cooldowns tick, then resources regen. All at end_of_round.
- Phase transition is checked before victory — a boss entering phase 2 doesn't die on the same round.

---

## 3. HP derivation

The card model has Atk / Def / Mana|Tech, no HP stat. HP is derived at battle start:

```
maxHp = 100
      + Def.value * 3
      + rankBonus[rank]

rankBonus = { Foundation: 0, Forged: 50, Ascendant: 120 }
```

Rationale: Def already drives incoming-damage mitigation, so tying it to HP too gives Def cards a clean tanky feel without adding a stat. Rank bonus makes tier-up feel materially stronger. Numbers are provisional and will be retuned in B6 using B2 simulator data.

**No card model change required** — HP is a computed field on `HeroSnapshot.maxHp` and `HeroCombatant.hp`, not a persistent stat.

---

## 4. Resource regeneration

Both Mana and Tech use the same mechanics; identity is purely cosmetic + prompt-flavor.

```
maxResource = 3
            + floor(primaryResourceStat.value / 20)
            + rankBonus[rank]

rankBonus = { Foundation: 0, Forged: 1, Ascendant: 2 }
regenPerRound = 1                     // flat, every end_of_round
startingResource = maxResource        // full at battle start
```

At Foundation with a 50-value Mana, maxResource = 3 + 2 + 0 = 5. Core abilities cost 0–1, Signatures 2–3. That's 2–3 Signatures per battle before running dry — pressures the resource axis without starving the player.

**Overcharge**: not in the first slice. Reserved for later.

---

## 5. Damage formula

For each `direct_damage`, `damage_over_time` tick, or `multi_hit` sub-hit:

```
raw = effect.amount
    + scalingBonus(effect.scaling, hero.stats)

scalingBonus(rule, stats):
  if rule.stat == 'Atk': rule.perPoint * stats.Atk.value
  if rule.stat == 'Mana': rule.perPoint * (stats.Mana?.value ?? 0)
  if rule.stat == 'Tech': rule.perPoint * (stats.Tech?.value ?? 0)
  else: 0

postResistance = raw * resistanceMultiplier(target, damageType)
                     // 0.5 if resistant, 1.5 if weak, 1.0 otherwise

postDefense = max(1, postResistance - defenseMitigation(target))
            // heroes have defenseMitigation = floor(Def.value / 5); bosses = phase-defined flat number
            // floor of 1 damage prevents "immune to chip"

postShield = subtract from matching shield pool first; overflow goes to HP

finalHp = target.hp - postShield
```

**Critical hits**: deferred beyond B7. Numbers assume no crit multiplier.

**Execute effects**: skip the formula entirely — an `execute` effect deals `target.hp` (i.e. instant kill) IFF `target.hp / target.maxHp <= effect.threshold`, else nothing.

---

## 6. Cooldown ticker

Cooldown decrements at end-of-round for the actor who owns it, regardless of whether they acted this round. An ability newly put on cooldown this round does NOT tick this round — the tick only applies to cooldowns present at end-of-round START minus the newly-added one.

```
onAbilityUsed(actor, ability):
  actor.cooldowns.push({ abilityDefinitionId, remainingRounds: ability.cooldownRounds + 1 })
  // +1 because the end-of-round tick this round would otherwise waste a round
```

Equivalently: cooldownRounds = N means "unavailable for N rounds after this one." A cooldown of 0 means "usable every round."

---

## 7. Status tick order

At end_of_round:
1. Fire `end_of_round` triggers (may add/remove statuses).
2. Apply DoT / HoT / poison ticks from active statuses.
3. Decrement `remainingRounds` on each status; remove those hitting 0 with `reason: 'expired'`.
4. Decrement cooldowns.
5. Regenerate resource.
6. Fire `on_status_removed` triggers for anything expired.

Statuses newly applied THIS round do not tick down this round — the round they were applied counts as round 0 of their duration.

---

## 8. Ultimate charge

Separate scalar 0–100 per hero. Not persisted between battles.

**Earning (per event):**
- Damage dealt: +1 per 20 damage
- Damage received: +1 per 10 damage
- Guard used: +5
- Focus used: +3
- Status applied to boss: +5
- Boss phase transition: +10 (all heroes)

**Spending:**
- Ultimate abilities have `resourceCost: 0` and `cooldownRounds: 0`, gated purely by `ultimateCharge >= 100`. Using consumes 100.

**Rationale:** Master Plan §32 mandates separation so damage dealers don't monopolize Ultimates. Blocking, healing, and status routes all charge meaningfully.

## 8b. Boss action damage (data-driven since B6)

Boss action damage is no longer hardcoded in the reducer. Each `BossActionSnapshot` carries `baseDamage` and `scalingPerRound`; the reducer computes `baseDamage + floor(scalingPerRound × round)`. All numeric tuning is data-only via BossVersion rows — no code change needed for a rebalance.

Emberborn Wraith v2 (shipped) numbers:

| Phase | Action | Base damage | Scaling / round |
|---|---|---|---|
| Teach | Ember Slash | 40 | +0.2 |
| Teach | Flame Burst | 27 | +0.2 |
| Enrage | Infernal Lance | 54 | +0.2 |
| Enrage | Execution Pyre | 72 | 0 |

---

## 9. Boss intent & telegraph

At `boss_intent_reveal`, the runtime deterministically picks the boss's next action:

1. Filter to actions valid for `boss.currentPhaseId` and not on cooldown.
2. Filter by `conditions` (e.g. "boss HP below 50%").
3. Sort by `priority` desc, then `id` asc for tiebreak.
4. Take the highest-priority action.
5. Determine targets via `targetRule` (using seeded RNG for random targets).
6. Emit `boss_intent_declared` with the resolved intent.

The player sees `intent.telegraphText`, the target(s), and the intent icon. **The boss cannot change intent between reveal and resolution** — this is the whole point.

---

## 10. Universal actions

Guard, Focus, and Inspect are runtime primitives — not library abilities. They cannot be discovered, moderated, or evolved. They are always available.

**Guard**: adds `ShieldPool { amount: floor(Def.value/2) + 5, remainingRounds: 1, types: [] (all) }` to self and +5 ultimate charge. No resource cost.

**Focus**: `+2 resource` (capped at maxResource) and +3 ultimate charge. No resource cost.

**Inspect**: reveals boss's next 2 intents instead of 1 for this round. Cannot be used two rounds in a row. No resource cost.

---

## 11. Victory & defeat

- **Victory**: `boss.hp <= 0` at `checking_victory`. Emit `battle_ended` with outcome `victory`.
- **Defeat (party wipe)**: every hero has `defeated: true`.
- **Defeat (timeout)**: `state.round > 30`. Prevents infinite loops from stun-lock or self-heal builds.
- **Abandon**: player explicitly quits; runtime records `abandoned`, no reward.

---

## 12. Snapshot rule (repeated for emphasis)

The runtime **must** access ability data via `HeroCombatant.snapshot.abilities[i].version`. Any code path that calls `AbilityStore.getCurrentVersion(...)` inside a battle is a bug. This will be enforced by an ESLint restriction in B2, plus test coverage that mutates the live store mid-battle and asserts no state change.

---

## 13. Seeded RNG contract

- Every battle carries a 32-bit unsigned integer `seed`.
- All rolls go through a single `RandomStream` implementation (Xorshift or Mulberry32) initialized once per battle.
- `state.rngCursor` monotonically advances; every reducer step that consumes a roll increments it, so a battle's roll history is fully reconstructable from the event log.

**Not seeded**: the boss's *first* intent choice at battle start is fully deterministic (highest priority action valid for phase 1). Randomness only kicks in for `random_enemy` targets, resistance rolls (if adopted later), and boss-action ties within priority levels.

---

## 14. Battle result & rewards (B5 — landed 2026-07-18)

Rewards are granted in [services/combat/battleRewardService.ts](card-engine/src/services/combat/battleRewardService.ts). Idempotency lives in the existing economy ledger — every grant carries `metadata.battleId`, and the service scans for any prior transaction with the same battleId before firing new ones. Defeat and abandoned grant nothing.

**Approved amounts (Emberborn Wraith, first boss):**

| Tier | Gold | Forge Crystals |
|---|---|---|
| First clear (once per boss) | 500 | 100 |
| Repeat clear (every subsequent victory) | 100 | 15 |

Tier is resolved by scanning the ledger for any prior `boss_${bossId}_first_clear` reward — if present, this attempt is a repeat.

Client-only, non-real-money, non-competitive. Server-authoritative validation deferred to a post-B7 gate.

---

## 15. What's out of scope for B1–B7

Explicitly deferred to keep the vertical slice landable:

- Break/stagger meter (Master Plan §36) — evaluate after B4 balance
- Two-hero party (§B5-original / §28 later) — after B7
- Server-authoritative combat (§43) — required before leaderboards or monetization
- Analytics events (§48) — layer in during B5/B6
- Crit / dodge / miss — deferred beyond B7
- Boss break-vulnerability windows (§35 climax) — first boss uses phases + intent only
- Overcharge, resource banking — none
- Retreat / partial-clear rewards — none; battles are all-or-nothing

---

## 16. Recommendations on the 7 open questions (Gate 5)

Answering the questions raised at end of B0.

**Q1. HP source.** *Derive from Def + rank* (§3 formula above). No new stat. Rationale: keeps the card model stable, still gives Def dual purpose (mitigation + HP), rank matters.

**Q2. Mana/Tech regen.** *Flat +1 per round with resource-stat-derived maxResource* (§4). Rationale: flat regen is easier to communicate to players and simpler to balance in B2 sims. Scaling the max means high-Mana casters still feel stronger.

**Q3. First boss identity.** *Original fire-elemental*, rendered as a **hand-illustrated 2D fantasy boss** in a head-on encounter view (see §18). Name TBD but archetype-agnostic. Rationale: leverages the 3 Leonardo-generated seed abilities (Ember Cleave, Radiant Ward, Soul Drain) as natural counters; gives us a fire-weak / holy-weak profile that Radiant Ward stat-checks nicely. Not tied to opposing a specific archetype (avoids implying that archetype is the "correct" pick). Approved 2026-07-18.

**Q4. Cooldowns.** *Tick at end-of-round for the actor who owns them*, not the actor who acted (§6). Rationale: matches player intuition ("this ability recharges over time"), works when boss uses same ability multiple actors across a phase.

**Q5. Ultimate Charge.** *Single scalar 0–100* (§8), earned from damage dealt/received/blocking/status. Rationale: simpler UI (one bar), easier to balance, matches Master Plan §32 examples.

**Q6. Guard/Focus.** *Runtime primitives, not library abilities* (§10). Rationale: they must always be available (§29 "prevent dead turns"), can't be dispelled or missing, and shouldn't clutter the Codex.

**Q7. Difficulty.** *Ship Normal only for B4 vertical slice*; wire the `BattleDifficulty` type ('normal' | 'hard') so Hard is a config knob added in B7. Rationale: don't split balance effort until Normal is tuned.

---

## 18. Visual direction (revised 2026-07-18)

**Reference:** **2D arcade fantasy** — head-on encounter view, hand-illustrated 2D fantasy boss art (Leonardo-generated, matching the ability + character portrait pipeline), centered/upper-middle of the arena. Hero represented by their existing card panel to the side. No 3D, no camera moves, no pixel-art rasterization. Turn-based clarity beats spectacle.

**Not** Slay-the-Spire pixel — an earlier draft of this section proposed that direction and it was rejected on 2026-07-18. Boss art follows the same painted 2D fantasy style already established by Leonardo ability art (e.g. Ember Cleave) and archetype portraits.

**Layout (mobile-first, scales to desktop):**

```
┌──────────────────────────────────────────────┐
│  ┌────────────────┐    ┌──────────────────┐  │
│  │  Boss intent   │    │  Boss HP  ▓▓▓░░  │  │
│  │  ⚔ Heavy Atk   │    │  Statuses: ☠ 🔥  │  │
│  └────────────────┘    └──────────────────┘  │
│                                              │
│              ╔═══════════════╗               │
│              ║               ║               │
│              ║   BOSS ART    ║   ← 2D pixel  │
│              ║  (pixel PNG)  ║     ~256²     │
│              ║               ║               │
│              ╚═══════════════╝               │
│         ↑ subtle idle bob (2px, 2fps)        │
│         ↑ shake on hit (reduced-motion off)  │
│                                              │
│  ┌──────────┐         ┌────────────────────┐ │
│  │ Hero     │         │ HP  ▓▓▓▓▓▓░░       │ │
│  │ card     │         │ Mana ●●●○○         │ │
│  │ (326×470)│         │ Ult   ▓▓▓░░░       │ │
│  └──────────┘         │ Statuses:          │ │
│                       └────────────────────┘ │
│  ┌──────────────────────────────────────────┐│
│  │  [Ember Cleave] [Radiant Ward] [Ult]     ││
│  │  [Guard]        [Focus]        [Inspect] ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Boss art pipeline (revised):**
- Source assets: Leonardo Phoenix 1.0 output, portrait/tall aspect, painted 2D fantasy style matching character portraits.
- One base pose per phase (2 for the first boss). Optional overlay for `heavy_attack` telegraph glow and `on_damage_received` hit-flash — no sprite frames.
- Rendered smooth (no `image-rendering: pixelated`).
- Idle bob and hit-shake are CSS-only, respect `prefers-reduced-motion`.
- Generation route: same pipeline the ability art uses (Leonardo Phoenix 1.0, catalog + moderation flow). Not a B1–B6 blocker; the vertical slice ships with a placeholder card until the real asset is approved.

**What this changes upstream:**
- `BossSnapshot` gets an `artAssetIds` string list (already in Master Plan §33); B3 wires storage.
- No runtime-code change needed for B2 — the simulator is headless.
- Reduced-motion path lives in the encounter screen component, not in `combat.ts`.

---

## 19. Change log

- **B1 draft** (2026-07-18): initial contract.
- **Gate 5 approval** (2026-07-18): Raheem approved Q1, Q2, Q4, Q5, Q6, Q7 as recommended; Q3 identity approved with visual-direction addition (§18): 2D pixel-art, Slay-the-Spire-style encounter view.
- **B5 landing** (2026-07-18): battle rewards live — Emberborn Wraith first clear = 500 Gold + 100 Crystals, repeat = 100 Gold + 15 Crystals. Idempotent via ledger battleId scan. Values approved by Raheem.
- **B6 balance pass** (2026-07-18): Emberborn Wraith **v2** published. Damage roughly ×1.8 the v1 baseline; maxHp 320→340. v1 kept in `boss_versions` with `status: 'deprecated'` so any battle snapshotted against it still resolves off the frozen numbers. Sim behaviour: baseline-policy Forged Mid Barbarian LOSES (correct — teaches the player to use Radiant Ward / Guard), Ascendant elite WINS reliably. Real player win-rate retune waits on Phase 4 play data. Balance-lock tests in `services/combat/balancePass.test.ts` guard the shipped numbers.
