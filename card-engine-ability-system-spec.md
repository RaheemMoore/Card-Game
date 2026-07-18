# Card Engine — Ability System Spec (v1)

**Status:** A1 (contract) — draft awaiting Gate 2 approval.
**Purpose:** define what an ability *is*, how it becomes permanent, how it evolves with a card, how it's discovered, and how it plugs into the existing power system, tier-up flow, economy, and Supabase persistence — before any runtime code is written.
**Companion source of truth for gameplay:** [Card_Game_Ability_First_Boss_Battle_Master_Plan.md](Classes%20and%20Boss%20Battles/Card_Game_Ability_First_Boss_Battle_Master_Plan.md).
**Companion source of truth for visuals:** the approved Figma Ability System (`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5`) and [Ability_Tile_Art_Direction_Spec(3).md](Classes%20and%20Boss%20Battles/Ability_Tile_Art_Direction_Spec(3).md).

---

## 1. Non-negotiable principles

Direct restatement of the Master Plan §4 for on-repo reference. If any implementation drifts from this list, revert first, redesign second.

1. **Abilities are permanent entities.** They exist as their own rows independent of any single card. A card *references* an ability.
2. **Generated creativity compiles into structured mechanics.** Claude may propose names/lore/effects; the runtime only accepts validated structured data. Generated prose is never executable combat logic.
3. **One permanent identity → multiple balance versions.** Rebalances create a new `AbilityVersion` row; the `AbilityDefinition` identity, discovery history, art, and Codex presence do not change.
4. **Canonical art is reusable.** Leonardo generates artwork once per genuinely-new approved ability. Every card that references the ability shows the same art.
5. **UI frames are deterministic.** Tiles, borders, cost bubbles, cooldown indicators, lock states, rank labels, and responsive layouts are Figma + game UI. Leonardo never generates finished UI.
6. **Normal battles call neither Claude nor Leonardo.** Combat is deterministic, seeded, and cheap.
7. **The client is not trusted with production rewards.** Prototype battles run locally; production reward-bearing battles need server-authoritative validation. Discovery rewards inherit this rule.
8. **No silent economy changes.** All price, reward, bundle, and starting-balance changes route through [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) §13.

---

## 2. Slot progression per rank

| Rank | Slots unlocked | Notes |
|---|---|---|
| Foundation | 1 × Core | Low complexity, low or zero resource cost, clearly connected to archetype identity. |
| Forged | Core evolves + 1 × Signature unlocks | Signature carries the card's stronger tactical identity. |
| Ascendant | Core evolves again + Signature evolves + 1 × Ultimate unlocks | Ultimate may follow the selected Ascendant lore path — see §3.3. |

Slot ownership per card is stored as `CardAbilityReference` rows, one per `(cardId, slotType, localTier)`. Read the current tier's row at battle time.

---

## 3. Ability evolution

### 3.1 Lore-directed evolution
An ability may follow the character's story. Example: Druid Foundation "Minor Thorns" → Forged "Retaliating Thorns" → Ascendant "Erupting Thornfield". Same permanent identity, `localTier` climbs.

### 3.2 Lore-defying evolution
An ability may represent overcoming the character's past. Example: fire-scarred Druid Foundation "Ember Shield" → Ascendant "Ash Restoration" (fire→healing). This is a *separate* permanent identity linked through the same card — not the same identity climbing tiers.

### 3.3 Ascendant lore paths
The existing [ascendantPaths.ts](card-engine/src/services/ascendantPaths.ts) service already offers a two-choice narrative fork at Forged → Ascendant. The ability system reuses that hook — the selected path steers Ultimate generation. No parallel Ascendant-narrative system is introduced.

### 3.4 Identity decision rule
Use the same permanent identity when the recognizable mechanical concept remains the same. Use a separate permanent identity when the evolved form changes the core role or mechanic enough to be meaningfully distinct. Duplicate detection (§6) enforces this.

---

## 4. Ability families (launch taxonomy)

Eight families cover every current archetype with room to grow. Family expansion is one row per addition; the taxonomy is `openEnded: true` — the Codex never claims completeness.

| ID | Name | Fingerprint |
|---|---|---|
| `martial` | Martial | Weapon strikes, combo chains, counters. Default combat vocabulary. |
| `fire` | Fire | Burn DoT, area damage, escalating aggression. |
| `nature` | Nature | Growth, thorns, restoration, terrain, transformation. |
| `holy` | Holy | Radiance, ward, cleanse, revive, radiant punish on cursed. |
| `necromancy` | Necromancy | Sacrifice, decay, blood cost, summons. Absorbs Blood mechanics until a split is justified. |
| `tech` | Tech | Overclock, targeting, energy systems. Only family that consumes Tech resource. |
| `defense` | Defense | Guard, taunt, barrier, damage reduction. Resource-agnostic. |
| `beast` | Beast | Mark prey, pack bonus, companion summons, bleed. |

Source of truth: [card-engine/src/data/abilities/families.ts](card-engine/src/data/abilities/families.ts).

---

## 5. Archetype → family affinity

| Archetype | Preferred | Secondary | Restricted |
|---|---|---|---|
| Barbarian | martial, beast | fire, defense | holy, necromancy, tech |
| Monk | martial, defense | holy, nature | necromancy, tech |
| Beastmaster | beast, nature | martial | tech |
| Druid | nature | holy, beast | tech, necromancy |
| Necromancer | necromancy | nature | holy, tech |
| Vampire | necromancy, martial | beast | holy, tech |
| Lycanthrope | beast, martial | nature | tech |
| Mech Pilot | tech, defense | martial | nature, necromancy, holy |
| Android | tech | defense, martial | nature, necromancy |
| Seraph | holy, defense | martial, nature | necromancy |
| Human | martial, defense | holy, nature, fire, beast | — |

Restricted families are never generated by the candidate pass. Secondary families are eligible but underweighted. See [card-engine/src/data/abilities/families.ts](card-engine/src/data/abilities/families.ts) for the machine-readable form.

---

## 6. What counts as a new ability

Cosmetic naming changes never create new permanent abilities. **Flame Slash**, **Fiery Slash**, **Burning Slash**, **Blazing Slash** — all one identity.

A candidate is genuinely new if it differs meaningfully in one or more of: core mechanic, effect category, targeting, scaling stat, resource behavior, trigger, timing, status interaction, conditional behavior, secondary effect, action-economy role, team synergy, or boss interaction.

### 6.1 Duplicate detection (A4)

Layered check, first hit wins:

1. **Exact normalized identity match** — auto-attach to the existing identity. Discovery credit fires on the caller's first attach; subsequent attaches bump `timesSeen` without re-crediting.
2. **Structured mechanic + tag overlap ≥ 60%** — admin queue with `similarityNote` pointing at the nearest existing identity + weighted overlap score. `status: proposed`. No auto-attach.
3. **Below 60% overlap** — admin queue as a candidate for a new permanent identity. `status: proposed`.
4. **Unsupported primitive** — `status: experimental`, quarantined, unusable on cards, admin queue.

The normalized signature = canonical JSON of `(slot, resource, target.type, sorted effect types, sorted trigger types, sorted condition types, sorted familyIds, role)`. Names / descriptions / tags do **not** participate in the exact-match check — a cosmetic rename of "Flame Slash" → "Fiery Slash" is a duplicate.

Overlap score (for admin context only) is a weighted Jaccard on (effect types, trigger types, condition types, tags, familyIds) with effect-type overlap weighted highest.

A new display name alone is never sufficient to create a rewardable discovery.

---

## 7. Versioning

Permanent identity is stable. Balance may change.

- `AbilityVersion.versionNumber` is monotonic per `abilityId`.
- Publishing a new approved version updates `AbilityDefinition.currentVersionId` and sets `publishedAt`. It does **not** modify the identity row's `firstDiscovered*` fields.
- Card references outside active battles resolve to the current approved version at read time. Active battles snapshot the exact `abilityVersionId` at snapshot creation and honor it for the whole session, regardless of intervening rebalances.
- A major mechanical replacement (role change, resource change, target-rule change) may warrant a new permanent identity instead of a new version. Duplicate detection is the arbiter.
- Discovery credit is never lost across rebalance. Canonical art remains unless identity changes materially.

---

## 8. Data model

Types live in [card-engine/src/types/abilities.ts](card-engine/src/types/abilities.ts). Summary shape:

- `AbilityDefinition` — permanent identity + status + provenance.
- `AbilityVersion` — approved mechanical version + power budget.
- `AbilityFamily` — taxonomy entry (see §4).
- `CardAbilityReference` — a card's binding to an ability, per slot per local tier.
- `PlayerAbilityDiscovery` — per-player discovery record + reward provenance.
- `CanonicalArtAsset` — canonical Leonardo (or placeholder / manual) art.

Runtime primitives (`AbilityEffect`, `TargetRule`, `AbilityTrigger`, `AbilityCondition`, `ScalingRule`) are declared as opaque records at A1; the concrete effect / target / trigger / condition catalogs land at A2.

`AbilityEvolutionLink` is declared but not persisted at A3. If lore-branching evolution surfaces in real cards at A5, the table gets added then.

### 8.1 Resource-type invariant

Every ability declares `resourceType: 'mana' | 'tech' | 'none'`. A `CardAbilityReference` may only be inserted when the archetype's resource matches the version's `resourceType` (or the version is `none`). Enforced in the service layer, not in SQL. Rationale: keeps the constraint colocated with the archetype affinity checks that already exist for stats.

**Identity commitment.** Resource is a property of the permanent identity, not a per-version toggle. All `AbilityVersion` rows for a given `AbilityDefinition` share the same `resourceType`. If two archetypes with different resources need the "same" tactical concept, they get two separate `AbilityDefinition` rows that share family + tags + (optionally) canonical art. Example: "Ember Cleave" (Mana) and "Plasma Cleave" (Tech) are two identities, not two versions of one identity. This keeps the Codex unambiguously partitioned by resource and prevents `currentVersionId` from ever pointing at a version the current player can't use.

### 8.2 Persistence (A3)

Seven new Supabase tables mirror the Phase 2 pattern:

- `ability_definitions`, `ability_versions`, `ability_families` — globally readable to authenticated users (Codex needs it), admin-write-only via `is_admin()`.
- `card_ability_references`, `player_ability_discoveries` — owner-or-admin, same RLS shape as `cards` and `economy_transactions`.
- `canonical_art_assets` — globally readable, admin-write-only.
- (Deferred) `ability_evolution_links` — added later only if §3.2 shows up in practice.

Undiscovered ability details are filtered in the query, not by RLS.

---

## 9. Integration into the current system

The Ability System hooks into what already exists rather than parallelling it.

- **Claude call budget stays 1 per forge.** [claudeApi.ts](card-engine/src/services/claudeApi.ts) will be extended (at A4) so the existing JSON reply carries an ability candidate alongside `lore` / `identity`. No new API round-trip.
- **Discovery rewards ride the existing wallet.** [discoveryLedger.ts](card-engine/src/services/abilities/discoveryLedger.ts) (A6) calls `walletService.grantReward` — one committed reward transaction per currency, idempotent via `PlayerAbilityDiscovery.rewardGranted`. Reward IDs live in [rewardCatalog.ts](card-engine/src/data/economy/rewardCatalog.ts). **Approved values (Raheem, 2026-07-18)** override Stage 0 decision #5 and grant both currencies per first-time player+ability discovery: common 50g + 20 Crystals, uncommon 100g + 30c, rare 150g + 50c, legendary 300g + 80c, mythic 600g + 150c.
- **Tier-up already handles snapshots.** [tierUp.ts](card-engine/src/services/tierUp.ts) snapshots ability state per rank at A5. Because ability slots (`core` / `signature` / `ultimate`) are orthogonal to stats (ATK / DEF / Mana / Tech), `abilityHistory` is keyed by `Rank → CardAbilityReference[]` — one entry per rank, listing every slot filled at that rank. Different shape from `evolutionHistory` (which is per-stat per-rank), but additive to the `Card` blob and no schema change to the `cards` table beyond widening the `data` jsonb.
- **Ascendant lore paths reuse [ascendantPaths.ts](card-engine/src/services/ascendantPaths.ts).** Ultimate generation reads the same `ascendantNarrative` string that already flows through the tier-up call.
- **`AbilityStore` mirrors `CardStore`.** Same sync-facade pattern already in [services/persistence/](card-engine/src/services/persistence/).
- **Codex UI reuses the approved Figma components** — `Ability Detail Card` (node `44-59`), `Ability Command Strip` (`11-143`), `Relic Presentation` (`48-46`). No parallel layout system.

Legacy cards get an auto-assigned seed ability set at A3 with a `legacyAbilities: true` marker so we can offer a one-time free "reforge abilities" later. That reforge is a §13 approval item when it lands.

---

## 10. Runtime & battle boundary

A2 populates the effect / target / trigger / condition catalogs and the power-budget calculator. Combat runtime (`services/combat/*`) is intentionally scoped out of the Ability System phase — it lives in Stage B and never mutates ability records.

Battle sessions snapshot the exact `abilityVersionId`, `bossVersionId`, seed, and reward-table version at start. Post-battle validation compares the executed log against the snapshot before any reward fires.

---

## 11. Art pipeline boundary

- **Leonardo generates canonical ability art only when a genuinely-new ability enters the permanent library.** Per-family, per-Raheem-approval batches. Not per-card. Not per-tier.
- **Figma owns tiles, frames, states, cost badges, cooldown markers, and resource badges.** See §29 of [Ability_Tile_Art_Direction_Spec(3).md](Classes%20and%20Boss%20Battles/Ability_Tile_Art_Direction_Spec(3).md).
- **Game UI renders live state** — cooldowns, charges, insufficient-resource, targeting, focus.
- **Placeholder art is allowed** during pre-A8 development and must never accidentally ship as canonical. `CanonicalArtAsset.provider = 'placeholder'` marks the row.

Ember Cleave (Benchmark 01) and Aegis Ward (Benchmark 02) are the approved visual reference points and will land as seed art at A8.

---

## 12. Governance

Binding, mirroring the shape of [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) §13.

I never do the following without explicit Raheem approval and a documented reason:

- Add or remove ability families.
- Change archetype family affinity (preferred / secondary / restricted lists).
- Expand the effect / target / trigger / condition catalogs (Master Plan §12.5 escape hatch — quarantined `experimental` only).
- Promote an `experimental` ability to `approved`.
- Publish a new `AbilityVersion` that changes resource type, slot type, or role.
- Fire Leonardo for canonical ability art.
- Set discovery reward values (this is also §13-binding for economy).
- Change duplicate-detection thresholds.
- Retire a family or mark an ability `deprecated`.

Every ability proposal names old and new state, the reason, and the player impact — same shape as economy §13 change requests.

---

## 13. Open items for A2 (Gate 3)

To be answered by the game-systems-designer specialist consultation at Gate 3, not by A1:

- Effect primitive catalog: initial ~20 effect types + parameters.
- Target rule catalog: initial ~10 target rules.
- Trigger catalog: initial ~10 triggers.
- Condition catalog: initial ~10 conditions.
- Status catalog: ~15 statuses (Burn, Bleed, Poison, Mark, etc.) with stack / duration / dispel behavior.
- Power budget formula: how effects/targets/triggers/conditions combine into `powerBudgetScore`.
- Resource-cost bands per rarity + slot type.
- Cooldown / charge bounds.
- Scaling rule vocabulary — how ATK/DEF/Mana/Tech get referenced.

A2 delivers these as typed catalogs, a validator that accepts/rejects candidate JSON, and 3–5 hand-authored example abilities that pass validation. No runtime execution yet.

---

## 14. Open items for A5, A7, A8

Recorded here so they don't become surprises later. Not blocking A1 or A2 approval.

- A5: does `Card.abilities: CardAbilityReference[]` get promoted from the jsonb `data` column to its own Supabase table? Recommend yes; decision at A5 planning.
- A7: undiscovered ability Codex tile — family + rarity teaser only, no silhouette, no name (see §7 of the decision table).
- A8: per-family Leonardo prompt template — art-prompt-director owns the design; each family requires per-approval before batch fires.

---

## 15. Non-goals of A1

- No runtime code.
- No Supabase migrations.
- No Claude prompt changes.
- No Leonardo calls.
- No economy value changes.
- No changes to CLAUDE.md phase status yet — that lands after A1 approval via `sync-project-knowledge`.
- No modifications to the archetype list or power system.
- No modifications to the card renderer.
