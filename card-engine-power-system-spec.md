# Card Engine — Power System Spec (v1)

**Purpose:** replace the current randomized-stat system with a class-affinity-based power system that produces balanced, specialized, and visually distinct cards. This spec is the source of truth for engineering.

**Stat set:** Atk / Def / Mana / Tech (Tech replaces Mana for Mech Pilot and Android; see class matrix).

---

## 1. Class Affinity Matrix

Each archetype has a bias tier per stat that determines both roll ranges at generation and hard ceilings across all ranks.

| Archetype | Atk | Def | Mana | Tech | Notes |
|---|---|---|---|---|---|
| Barbarian | High | Mid | Very Low | — | Rage-driven, mana-illiterate |
| Monk | Mid-High | Mid | Mid-High | — | Disciplined, balanced striker |
| Beastmaster | Mid-High | Mid | Mid | — | Well-rounded feral fighter |
| Druid | Low-Mid | Mid | High | — | Nature-caster with survivability |
| Necromancer | Low | Low | Very High | — | Glass cannon mage |
| Vampire | High | Low-Mid | High | — | Dual threat, fragile in daylight |
| Mech Pilot | High | Very High | — | Very High | Trades organic mana for machine power |
| Android | Mid | High | — | Very High | Synthetic precision, no mana access |
| Seraph | Mid | High | High | — | Premium all-rounder |
| Human | Mid | Mid | Mid | — | True baseline |

**Rule:** an archetype has either Mana OR Tech, never both (v1). Mech Pilot and Android are the only Tech classes.

---

## 2. Stat Scale & Rank Caps

Stat values range **1–100**. Each stat has an independent rank (Foundation → Forged → Ascendant). Rank is **derived from the current value**, not stored:

| Bias tier | Foundation range | Forged floor | Ascendant floor | Hard ceiling |
|---|---|---|---|---|
| Very Low | 5–25 | 26 | 41 | 55 |
| Low | 15–35 | 36 | 56 | 70 |
| Mid | 30–50 | 51 | 71 | 85 |
| Mid-High | 40–60 | 61 | 76 | 90 |
| High | 50–65 | 66 | 81 | 100 |
| Very High | 60–75 | 76 | 86 | 100 |

**Reading the table:** if a Barbarian's Mana (Very Low) sits at 27, it's Forged. If it drops to 25, it demotes to Foundation. If a Necromancer's Mana (Very High) hits 86, it's Ascendant. Hard ceiling is the absolute max — no stat exceeds it regardless of wins.

---

## 3. Initial Card Generation

At Foundation creation:

1. Roll each stat within its Foundation range for that class (see table above).
2. Show the rolled card to the user.
3. **User gets up to 3 re-rolls** before locking. Each re-roll rerolls all stats fresh — no cherry-picking individual stats.
4. On lock, the card is minted and art is generated.

---

## 4. Rank-Sum Cap (Specialization Rule)

Each stat rank has a point value: Foundation = 1, Forged = 2, Ascendant = 3.

**A card's total rank-sum cannot exceed 7.**

Example legal configurations for a 3-stat card:
- 3 + 3 + 1 (two specialties + one weakness)
- 3 + 2 + 2 (one specialty + two moderates)
- 2 + 2 + 2 (balanced Forged) — sums to 6, room for one more promotion
- 3 + 3 + 3 = 9 — **blocked**

**Enforcement — trade system:** to promote a stat that would push the card over 7, the player must simultaneously **demote another stat by one rank**. UI presents this as an explicit choice at the promotion moment. If the player refuses to trade, the promotion doesn't happen and the minigame win is voided (do not consume the win as a demotion).

---

## 5. Minigame Outcomes

**Win:** +1 to the stat the player chose to train (subject to rank-sum cap, see §4).

**Loss:** −1 to the stat the player was training.

**Off-affinity difficulty modifier:** for **Very Low bias stats only**, promotions require multiple wins to advance one point. Suggested: 3 wins = +1 point on a Very Low stat. All other bias tiers use 1 win = +1 point. This keeps a Barbarian's mana climb meaningfully harder without making every off-class stat a grind.

**Loss on Very Low stats:** losses still deduct only 1 point (the extra wins buy progress, they don't buffer losses). This is the risk-reward tension.

---

## 6. Rank Demotion & Art History

Rank is always derived from current value, so demotion is automatic when a stat value falls below its current tier's floor.

**Evolution history rule:** a card can only ever have **one saved art version per tier**. No card has two Forged variants.

**On first promotion to any tier:** always save the newly generated art. This becomes the canonical art for that tier.

**On demotion to a tier that has saved art:** restore the previously-saved art. No new generation, no API cost.

**On re-promotion to a tier the card has visited before:** player is offered a choice:
- **Keep the saved art** — no regeneration, restore the canonical version
- **Regenerate fresh** — new art is generated and *permanently overwrites* the old saved version. The old art is gone.

**Never overwrite silently.** Overwriting the canonical tier art is always an explicit player choice.

**Evolution history travels with the card.** If the card is traded, gifted, or otherwise transferred, all saved tier art transfers with it. History is card-bound, not player-bound. Inspecting a card fully reveals its evolution history.

---

## 7. Border ↔ Dominant Stat Mapping

The card's border reflects its dominant stat (highest current value):

| Dominant stat | Border variant | Color |
|---|---|---|
| Atk | Dominance | Red |
| Def | Steadiness | Green |
| Mana | Conscientiousness | Blue |
| Tech | Influencing | Yellow |
| No clear leader (tie) | Default | Untinted |

**MultiColor (rainbow) border is reserved and unreachable through normal play** — the rank-sum cap of 7 makes it mathematically impossible to reach Ascendant on all stats simultaneously. Held for future special-event mechanics.

Border updates dynamically when the dominant stat changes.

---

## 8. Tech vs Mana in Battle (Combat Preview)

*Full combat system is out of scope for v1, but the stat interaction shape needs to be baked in now so promotion incentives make sense.*

- **Tech is strong vs organic classes** (Barbarian, Monk, Beastmaster, Druid, Necromancer, Vampire, Seraph, Human): apply a damage multiplier (suggested +25%) when a Tech attack hits an organic-class card.
- **Tech is weak vs Tech and heavily-armored classes** (Mech Pilot, Android): apply a damage reduction (suggested −25%) when Tech hits Tech.
- **Mana has no such modifier** — flat scaling against all classes.

This makes Tech a specialist stat (excellent vs the majority, punished in the mirror match) and gives Mech/Android players a reason to keep Def high as a hedge.

---

## 9. Prompt Feedback Loop (Art Regeneration)

When art regenerates (first promotion, or player-chosen re-promotion regen), the prompt is assembled as:

```
Base Visual Style + Archetype DNA + Rank Modifier + Specialization Suffix + Negative Prompt Rules
```

**Specialization Suffix** is new. Built from a lookup table keyed by `(dominant_stat, dominant_stat_rank)`:

| Stat | Foundation | Forged | Ascendant |
|---|---|---|---|
| Atk | (none) | "Reforged [Archetype] of Greater Might" | "Ascended [Archetype] War-Lord" |
| Def | (none) | "Reforged Sentinel [Archetype]" | "Ascended Bulwark [Archetype]" |
| Mana | (none) | "Reforged Mana-Touched [Archetype]" | "Ascended Mana [Archetype]" |
| Tech | (none) | "Reforged Tech-Bound [Archetype]" | "Ascended Tech-Sovereign [Archetype]" |

Each row also carries a **visual motif fragment** injected into the DNA block:

- Atk Ascendant → "battle scars, oversized weapons, aggressive stance"
- Def Ascendant → "layered plating, tower shield, unmoving posture"
- Mana Ascendant → "arcane sigils orbiting body, glowing eyes, floating slightly"
- Tech Ascendant → "integrated cybernetics, HUD glow, mechanical augmentations visible"

**Very Low absence motifs** — if a stat sits at Very Low bias AND its current value is in the bottom half of that range, inject an absence motif:
- Low Mana Barbarian → "no arcane elements, cracked or absent mystical implements"
- Low Atk Necromancer → "gaunt frame, no weapons, hands trembling with fatigue rather than power"

**Leonardo Character Reference:** every regeneration after the initial mint uses the previous card's portrait as Character Reference input at Mid strength (~60–70%) with the original seed. This keeps character identity stable across evolutions.

---

## 10. Data Structure

```json
{
  "cardId": "uuid",
  "ownerId": "user-uuid",
  "archetype": "Vampire",
  "stats": {
    "Atk":  { "value": 78, "bias": "High", "hardCap": 100 },
    "Def":  { "value": 42, "bias": "Low-Mid", "hardCap": 78 },
    "Mana": { "value": 91, "bias": "High", "hardCap": 100 }
  },
  "rankSum": 6,
  "dominantStat": "Mana",
  "border": "Conscientiousness",
  "currentArt": {
    "portraitUrl": "...",
    "cardName": "Ascended Mana Vampire",
    "lore": "...",
    "leonardoSeed": 123456
  },
  "evolutionHistory": {
    "Atk": {
      "Foundation": { "portraitUrl": "...", "cardName": "...", "lore": "..." },
      "Forged": { "portraitUrl": "...", "cardName": "...", "lore": "..." },
      "Ascendant": null
    },
    "Def": { "Foundation": {...}, "Forged": null, "Ascendant": null },
    "Mana": { "Foundation": {...}, "Forged": {...}, "Ascendant": {...} }
  },
  "createdAt": "timestamp"
}
```

**Rank is derived, not stored** — compute from value + bias table at read time. `rankSum` and `dominantStat` are also derived but cached for query performance.

**Evolution history is keyed by (stat, tier)** to enforce the one-art-per-tier rule structurally.

---

## 11. Implementation Order

1. **Stat generator** — class matrix + Foundation roll ranges. Testable in isolation.
2. **Rank derivation function** — value + bias → rank label. Pure function.
3. **Rank-sum cap logic** — including the trade-demotion flow.
4. **Prompt assembly with specialization suffix** — extends existing prompt system.
5. **Evolution history storage** — the one-art-per-tier structure.
6. **Promotion / demotion flow** — win/loss handling, Very Low grind modifier, art regen decision UI.
7. **Border dynamic update** — recompute on any stat change.
8. **Tech vs organic combat modifier** — stub in the data model, wire into combat later.

Steps 1–4 unblock immediate art-generation testing. 5–7 gate the minigame system. 8 is a placeholder for future combat work.

---

## 12. Open Items (Not Blocking v1)

- Exact +25% / −25% Tech modifiers need combat playtesting to tune
- "3 wins = +1 for Very Low stats" number is a guess — instrument and adjust
- Rank-sum cap of 7 is a guess — instrument and adjust
- Foundation re-roll count of 3 is a guess — track re-roll usage in analytics
- Whether a 4th non-Tech class ever gets Tech (currently locked to Mech Pilot + Android)
- Trade / gift mechanics for cards (spec says history travels — the transfer mechanism itself is TBD)
