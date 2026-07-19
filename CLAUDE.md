# Card Engine — Fantasy TCG

A collectible fantasy card game where users forge unique character cards through an interactive ritual (archetype > dice roll > Story Pillars > element + bond > AI-generated text). Built as a standalone web app — Phase 1 of a 4-phase project.

**Canonical creative source:** [Character_Generation_Bible_Canonical_v1.md](Character_Generation_Bible_Canonical_v1.md) governs every aspect of character generation, archetype identity, story pillars, element compatibility, hidden fate, prestige inference, and future narrative content. When the Bible conflicts with implementation, the Bible wins. The [Lore & Fantasy Director](.claude/agents/lore-fantasy-director.md) agent is the standing authority for interpretive questions.

## Quick Start

```bash
cd card-engine
npm install
npm run dev        # Vite dev server on :5173
```

Requires a `.env` file in `card-engine/` with the client keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and, for `vercel dev` or preview deploys, the server keys (`ANTHROPIC_API_KEY`, `LEONARDO_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Card text generation runs on Claude Haiku 4.5 via the server-side `/api/anthropic-messages` endpoint. Portrait art runs on Leonardo Phoenix via `/api/leonardo` (server-side key too).

## Tech Stack

- **React 19** + **Vite 8** + **TypeScript 6**
- **Tailwind CSS v4** (uses `@theme` block in `index.css`, not `tailwind.config`)
- **react-router-dom v7** for routing
- **Supabase** for cards, ledger, abilities, bosses, admin RBAC, and `api_usage_events` telemetry (localStorage is retained as a legacy fallback only)
- **Server-side Vercel Functions** under `card-engine/api/` proxy every paid provider call — no provider secret ships to the browser. Every call writes an `api_usage_events` row.
- **Anthropic Claude Haiku 4.5** for card name/title/lore/portrait-prompt generation via `/api/anthropic-messages`
- **Leonardo Phoenix** for portrait + emblem art via `/api/leonardo` (allowlisted sub-paths, Supabase-JWT gated)

## Project Structure

```
Card Game/                          # Git root
├── CLAUDE.md                       # This file
├── card-engine/                    # The app
│   ├── src/
│   │   ├── types/
│   │   │   ├── card.ts             # Card interface, archetypes, ranks, borders
│   │   │   └── bible.ts            # Bible entities: StoryPillarAnswers, ElementSelection, ElementBond, HiddenFate, PrestigeRole, ArchetypeBibleChapter
│   │   ├── components/
│   │   │   ├── CardRenderer.tsx    # Card display with Figma-matched positioning
│   │   │   ├── DiceRoll.tsx        # 3D CSS cube dice roll animation
│   │   │   ├── ArchetypeSelector.tsx     # Bible §Step 1 lore on hover
│   │   │   ├── StoryPillarWizard.tsx     # Bible §Guided Narrative Chains — 5 options per question, lock + refresh, no free-form input
│   │   │   ├── ElementBondPicker.tsx     # Bible §Global Element Pillar — element (bucketed) → bond (10 approved)
│   │   │   ├── NavBar.tsx
│   │   │   └── economy/           # CurrencyBalance, CurrencyCost, WalletPopover, etc.
│   │   ├── pages/
│   │   │   ├── CardForge.tsx       # 5-stage flow: archetype → stats → pillars → element+bond → forge → reveal
│   │   │   ├── Collection.tsx      # Card grid with filters/sort
│   │   │   ├── CardDetail.tsx      # Full card view — Story Pillar Q&A, elemental bond, prestige (when earned)
│   │   │   └── Home.tsx
│   │   ├── services/
│   │   │   ├── cardGenerator.ts    # Stat generation, border mapping, card shell builder
│   │   │   ├── claudeApi.ts        # Bible-driven prompt (Bible §Claude Generation Pipeline 14 steps)
│   │   │   ├── promptAssembler.ts  # Local Leonardo prompt fallback, Bible-compliant
│   │   │   ├── hiddenFate.ts       # Bible §Hidden Fate helpers — preserveIdentityAcrossRanks, LOCKED_HIDDEN_FATE_FIELDS
│   │   │   ├── prestigeInference.ts # Bible §Prestige — narrative-earned only, Ascendant only, never player-selected
│   │   │   ├── leonardoApi.ts      # Leonardo portrait generation
│   │   │   ├── leonardoEmblemApi.ts # Leonardo emblem generation (1024² square, no CR)
│   │   │   ├── regeneratePortrait.ts # Same story pillars + locked hidden fate, re-run
│   │   │   ├── tierUp.ts           # Foundation → Forged → Ascendant — Bible §Rank continuity preserves identity
│   │   │   ├── ascendantPaths.ts   # Ascendant-tier specialization branching
│   │   │   ├── portraitGenerator.ts # Placeholder portrait (gradient + letter)
│   │   │   ├── storage.ts          # Sync facade delegating to the active CardStore
│   │   │   ├── persistence/        # supabaseClient, SyncQueue, CardStore/SupabaseCardStore, SupabaseLedgerStore, AbilityStore/SupabaseAbilityStore, BossStore/SupabaseBossStore, migration
│   │   │   ├── abilities/          # registry, seed, proposalService, duplicateDetector, validator, discoveryLedger, moderation, canonicalArtPipeline, legacyBackfill (+ tests)
│   │   │   ├── bosses/             # registry, seed
│   │   │   ├── combat/             # RandomStream, formulas, reducer, harness, useBattle, battleRewardService, balancePass tests
│   │   │   └── economy/            # walletService, transactionLedger, pricingCalculator, validation, useWallet (+ tests)
│   │   ├── data/
│   │   │   ├── archetypeBible/     # 11 Bible chapters, all 14 sections each (Bible §1-§14)
│   │   │   ├── storyPillars.ts     # Bible §Step 10 questions per archetype + ~350 seed answers, tagged for element eligibility
│   │   │   ├── elements.ts         # 26 elements, 10 bonds, per-archetype compatibility buckets, Rare narrative-eligibility gate
│   │   │   ├── archetypes.ts       # Legacy — palette + emblem plumbing only; identity + lore live in archetypeBible/
│   │   │   ├── archetypeEmblems.ts # Selection-tile emblem metadata (status, palette, asset path)
│   │   │   ├── powerSystem.ts      # Class affinity matrix, bias ranges, rank derivation
│   │   │   ├── stats.ts            # Border color palette
│   │   │   └── economy/            # apiCostCatalog, premiumPriceCatalog, gameplayPriceCatalog, rewardCatalog, bundles, assumptions
│   │   ├── index.css               # Tailwind @theme, keyframes (dice, shimmer, fadeIn)
│   │   └── App.tsx                 # Router + fantasy background layout
│   └── public/
│       └── assets/                 # Figma-exported PNGs
│           ├── borders/            # 5 card frame overlays (926x1336 @2x)
│           ├── badges/             # Colored circle badges for stat display
│           ├── icons/              # Stat icons (fist, castle-turret, star, etc.)
│           ├── archetype-emblems/  # 10 approved 1:1 selection emblems (Lycanthrope pending)
│           └── backgrounds/        # Fantasy landscape background
├── Card Images/                    # Portrait sources + approved emblems (Archetype Emblems/Approved)
├── STUDIO_CHARTER.md               # Studio structure, roles, approval rules
├── WORKFLOW.md                     # How to work with this repo (day-to-day)
├── card-engine-power-system-spec.md         # Stats, bias tiers, rank derivation, rank-sum cap
├── Character_Generation_Bible_Canonical_v1.md # Canonical creative source of truth (Bible)
├── card-engine-character-generation-bible-integration.md # How Bible maps to code
├── card-engine-archetype-emblem-library.md  # Selection-emblem spec, palettes, prompts, status
├── card-engine-economy-currency-system-plan.md # Economy governance + catalog rules (binding)
├── card-engine-ability-system-spec.md          # Ability data model, primitives, validation, art pipeline, moderation
├── card-engine-boss-battle-spec.md             # Combat contract, turn structure, formulas, bosses, rewards
└── docs/archive/                   # Retired 6-stat design docs — do not consult
```

## Current Data Model — Power System

Stats use a **class-affinity-based** system. Each archetype has bias tiers per stat that determine roll ranges and hard ceilings. Stats scale **1–100**. Rank is **derived** from stat values (not stored). Mech Pilot/Android use **Tech** instead of Mana.

```typescript
interface StatEntry {
  value: number;       // 1-100
  bias: BiasTier;      // 'Very Low' | 'Low' | 'Mid' | 'Mid-High' | 'High' | 'Very High'
  hardCap: number;
}

interface Card {
  cardId: string;
  archetype: ArchetypeName;     // 11 options
  cardName: string;             // AI-generated
  nameAndTitle: string;         // AI-generated
  portraitAsset: string;        // Placeholder gradient for now
  stats: {
    Atk: StatEntry;
    Def: StatEntry;
    Mana?: StatEntry;           // undefined for Tech classes
    Tech?: StatEntry;           // undefined for Mana classes
  };
  dominantStat: StatName | null; // highest value stat, null on tie
  border: { baseVariant: BorderVariant; baseSource: string };
  lore: string;
  // Bible-era fields (see types/bible.ts):
  storyPillars?: StoryPillarAnswers;    // Bible §Guided Narrative Chains — immutable
  elementSelection?: ElementSelection;   // element + bond + compatibility bucket
  hiddenFate?: HiddenFate;               // Claude-inferred; locked identity fields preserved across ranks
  prestige?: PrestigeRole;               // Narrative-earned only; set at Ascendant via prestigeInference
  whisperWords: string[];               // @deprecated legacy
  modifiers?: ModifierStack;            // @deprecated legacy
  evolutionHistory: EvolutionHistory;   // keyed by StatName → Rank → ArtSnapshot
  createdAt: string;
}
```

**Bias tier ranges (Foundation roll → Forged floor → Ascendant floor → Hard cap):**
- Very Low: 5-25 → 26 → 41 → 55
- Low: 15-35 → 36 → 56 → 70
- Mid: 30-50 → 51 → 71 → 85
- Mid-High: 40-60 → 61 → 76 → 90
- High: 50-65 → 66 → 81 → 100
- Very High: 60-75 → 76 → 86 → 100

**Border variant is determined by dominant stat** (highest value):
- ATK dominant → Dominance (red)
- DEF dominant → Steadiness (green)
- Mana dominant → Conscientiousness (blue)
- Tech dominant → Influencing (yellow)
- Tied → Default

## Card Renderer Positioning (from Figma)

Card dimensions: 463x668 (Figma), rendered at 326x470 (full) or 42% scale (thumbnail).
All positions are percentage-based, derived from the Figma template (`J8RTVE4x69tAiVU0DGv5zq`, node `1:182`):

| Element | Position | Notes |
|---------|----------|-------|
| Card Name | top: 5.5% | Centered, ~29% side padding |
| Resource (Mana/Tech) | top: 2%, right: 7.5% | Top-right crystal shield, 22px white text |
| Portrait | top: 8%, sides: 8%, bottom: 38% | Image or gradient placeholder |
| Name & Title | top: 69% | Centered in parchment banner, dark text |
| ATK/DEF perks | top: 75.5%, left: 25.5% | Vertical list with badge+icon, full size only |
| Power/Toughness | top: 87.5%, left: 79% | Bottom-right, white text with glow |

## Card Creation Flow (CardForge.tsx)

5 stages: `archetype` → `stats` → `pillars` → `element` → `forging/reveal`

1. **Archetype** — grid of 11 archetypes. Hover previews the Bible §Step 1 tagline, body prose, and pull quote from [ARCHETYPE_BIBLE](card-engine/src/data/archetypeBible/). Random option available.
2. **Dice Roll** — 3D CSS cube animation. Values roll within the archetype's Foundation bias range (1–100 scale). **3 rerolls max**, rerolls all stats fresh.
3. **Story Pillars** — Bible §Guided Narrative Chains. Per-archetype question sequence (3-4 pillars, some with follow-ups). Each question shows ~5 seed answers with lock + unlimited refresh. No free-form input. Answers are IMMUTABLE generation facts.
4. **Element + Bond** — Bible §Global Element Pillar. Elements bucketed per archetype (Naturally Compatible / Compatible Through Reinterpretation / Rare), Rare gated by narrative eligibility from Story Pillar answers. Ten approved bonds shown after element pick.
5. **Forge** — Calls Claude API following Bible §Claude Generation Pipeline (14 steps): archetype chapter → answers → element+bond → classify tensions → Hidden Fate → visual summary → Leonardo prompt ≤1300 chars. Portrait via Leonardo. Reveals with fade-in.

## Figma Design Reference

- **File key:** `J8RTVE4x69tAiVU0DGv5zq`
- **Components page:** `1:2`
- **Card type (Dominance):** `1:182` — use this as the positioning reference
- **Icons section:** `1:72` — ATK uses HandFist (`1:94`), DEF uses CastleTurret (`1:120`)

## Phase Status

- **Phase 1: Card Engine** — CORE COMPLETE. Forge flow, collection, power system, Leonardo portraits, tier-up evolution + history viewer, and two-currency economy are all working. Character generation runs the Bible-driven pipeline (Story Pillars + element bond → Bible §Claude Generation Pipeline 14 steps → HiddenFate → Leonardo). The retired whisper-wheel + modifier-pool system was replaced 2026-07-19; see [card-engine-character-generation-bible-integration.md](card-engine-character-generation-bible-integration.md).
- **Phase 1.5: Economy hardening + polish** — IN PROGRESS. Governance rules for the economy live in [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md). Any change to prices, rewards, bundles, or exchange rules requires explicit Raheem approval — see charter.
- **Phase 2: Backend + Accounts** — PERSISTENCE + AUTH + ADMIN LANDED. Supabase project (Card-Game, `ofrcpmiytqgziozsourn`) holds `profiles` (with `role`), `cards`, `economy_transactions` with RLS keyed on `auth.uid() OR is_admin()`, and a private `portraits` storage bucket with per-user-path RLS. Email+password sign-up via `<AuthModal>` uses `auth.updateUser` on anonymous sessions to preserve the uid (existing cards + ledger carry over). Admin role gates a `/admin` route with user list, per-user drawer (currency grants w/ required reason → `admin_adjustment` in the ledger, readonly cards + ledger). Server-side RPCs (`list_users_for_admin`, `get_system_stats`, `grant_admin_adjustment`) run SECURITY DEFINER with is_admin() guard. Server-authoritative wallet + real-money bundle sales are still out of scope — the client JWT is still trusted, and the payment rails from §9 of the economy plan still need to land before real money is safe. See [card-engine/supabase/README.md](card-engine/supabase/README.md) for the schema + the one dashboard step needed (Anonymous Sign-Ins toggle).
- **Phase 3: Ability System + Boss Battles** — COMPLETE (Stage A + Stage B shipped 2026-07-18).
  - **Ability System (A0–A9):** typed effect/target/trigger/condition/status catalogs; power-budget validator; 5 seed abilities; Supabase `ability_*` tables with library-read/admin-write RLS; forge + tier-up ability proposals with duplicate detection (exact-match auto-attach, fuzzy queues); discovery rewards (Gold + Forge Crystals per rarity, idempotent via ledger); Codex home + family + ability pages; canonical art pipeline with placeholders + Leonardo (3 seed abilities generated); admin moderation queue with approve/reject/merge/deprecate. Spec: [card-engine-ability-system-spec.md](card-engine-ability-system-spec.md).
  - **Boss Battles (B0–B7):** turn-based combat contract; pure deterministic reducer with seeded RNG + snapshot-immutable ability resolution; headless 5000-run simulator; Supabase `boss_*` tables; Emberborn Wraith (fire elemental, 2 phases) as first boss; playable `/battle` route with hero picker + encounter screen + intent banner + event log; idempotent battle rewards (first-clear 500g/100c, repeat 100g/15c) via ledger `battleId` scan; data-driven damage numbers; hit-shake + reduced-motion; mobile responsive. Spec: [card-engine-boss-battle-spec.md](card-engine-boss-battle-spec.md).
- **Phase 3.5: Boss art polish** — DEFERRED pending art-direction alignment. Placeholder card renders in-app; final Leonardo boss art will follow the same 2D fantasy pipeline as ability art. See boss battle spec §18.
- **Admin Operations Dashboard** — Phases 0–7 COMPLETE on `bible-integration` (2026-07-19). Provider secrets fully server-side: `/api/anthropic-messages`, `/api/leonardo` (method+path allowlist, cost logged), `/api/s3-upload` (AWS host allowlist, 5 MB cap), all JWT-gated. Every paid call writes `api_usage_events` (admin-only RLS). Admin shell with nested routes: Overview (Leonardo live balance + Anthropic "unavailable" + primary tiles + pending banner), Users, Cards (`list_cards_for_admin` RPC + gallery + prompt provenance drawer), Abilities (tabbed workspace + candidate art lifecycle + detail preview panel), Prompt Lab (F→Fg→A tier chains with player-parity inputs, session grid with right-side preview panel, propose-from-tier), Proposals (draft/state-machine/Raheem-only global gate/audit trail), Costs (per-provider spend + per-action rollup + catalog compare), Diagnostics (probes + ability art migration). Ability art lifecycle fixed: candidates land as `candidate`, prior approved stays live until promoted. Prompt Lab retention sweep runs daily via Vercel Cron. Shared `AdminPreviewPanel` component pattern for right-side drawers. See [Claude_Code_Admin_Operations_Dashboard_Plan.md](Claude_Code_Admin_Operations_Dashboard_Plan.md).
- **Phase 4: PvP Battles + Trading** — NOT STARTED.

Do NOT proceed to real-money bundle sales without landing the rest of Phase 2 (§9 production security prerequisites in the economy plan).

## Economy System

Two-currency model implemented on localStorage (prototype only — not production-safe for real money):

- **Premium currency** (`premium`, working name "Forge Crystals") — pays for AI-generated actions (forge card, evolve art, regenerate portrait).
- **Gameplay currency** (`gameplay`, working name "Gold") — earned through play; supports non-API progression.

Architecture is catalog-driven: `data/economy/` holds the source-of-truth catalogs (API cost estimates, premium prices, gameplay prices, rewards, bundles, tunable assumptions). No component may hardcode prices. `services/economy/walletService.ts` handles reserve → commit → refund transactions via `transactionLedger.ts`.

**Governance:** [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) §13 is binding. I never change player prices, reward values, bundle values, starting balances, or exchange rules without explicit Raheem approval and a documented reason.

## Known Limitations / Next Steps

- `Card Images/` folder holds portrait sources but they're not integrated into the app pipeline yet — Leonardo is the live path.
- Dice animation uses CSS 3D cubes — functional but could be polished.
- Rank-sum cap of 7 is enforced in the data model but the trade-demotion UI is deferred (needs minigames to drive it).
- Promotion/demotion flow, Very Low difficulty modifier, and Tech vs organic combat modifier are deferred to Phase 3/4.
- Economy now persists to Supabase (Card-Game project) under an anonymous session — real-money bundle sales still need §9 production-security prerequisites (server-side generation calls, receipt verification, idempotency keys) in [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md).
- The legacy 6-stat docs (`card-engine-development-plan.md`, `card-engine-project-knowledge.md`) have been moved to [docs/archive/](docs/archive/) — do not consult them as source of truth.

## Studio Structure

This repo is set up as an AI Game Studio (see [STUDIO_CHARTER.md](STUDIO_CHARTER.md)). I am the Studio Lead — I do all implementation. Specialist subagents advise, skills define reusable workflows.

- `.claude/agents/` — 5 specialists: game-systems-designer, art-prompt-director, ui-ux-director, technical-architect, **lore-fantasy-director** (Bible authority — consulted for any new narrative content, archetype identity questions, prestige eligibility, element compatibility). Invoke only for open-ended design questions.
- `.claude/skills/` — 8 workflows: design-feature, ship-approved-plan, create-archetype, design-archetype-emblem, sync-project-knowledge, audit-project-knowledge, art-pipeline, balance-playtest (scaffold-only).
- `.claude/verify/card-engine.sh` — project verify script the built-in `verify` skill bootstraps.
- `.claude/launch.json` — dev-server preview config (`card-engine-dev` on :5173).
- **Skill/agent opportunities:** I raise credible candidates proactively (Reuse Forecast in `design-feature`, Reuse Review in `ship-approved-plan`); Raheem approves before I create anything. See [STUDIO_CHARTER.md](STUDIO_CHARTER.md) — *Proactive Workflow Discovery*.

## Conventions

- Tailwind v4 `@theme` block for design tokens — do not use `tailwind.config`
- Fantasy-themed UI: dark backgrounds, parchment/gold accents, `font-fantasy` (Cinzel) for headings
- Card rendering uses absolute positioning with percentage values overlaid on border frame PNGs
- Economy modules have vitest unit tests (`services/economy/*.test.ts`). Other code has no tests yet — verify UI/renderer changes visually using the dev server (see `.claude/verify/card-engine.sh`).
- **Bible §Rank continuity is inviolable:** rank progression preserves sex, age, body type, ancestry, disability, physical condition, defining scars, and core identity. Advancement must NOT automatically make a character younger, thinner, more muscular, healthier, less disabled, or more conventionally attractive. Locked HiddenFate fields carry across ranks verbatim (see `services/hiddenFate.ts` LOCKED_HIDDEN_FATE_FIELDS).
- **Lycanthrope pipeline deviation (retired):** the pre-Bible Lycanthrope had a forced "MORE wolf each rank" mandate with `init_strength = 0.15/0.30`. The Bible reframes Lycans as Guardians of the Moon Goddess whose rank progression deepens pack trust and lunar responsibility, NOT bestial morphology. `init_strength` may still drop for Lycan to allow the subtle wolfish tells to shift, but the mandated escalation prompt is gone. See Bible §Lycanthrope §9.
- **Portrait modesty (M5.7):** Portraits are modest — armor, robes, coats, capes, regalia. NEVER bras, panties, lingerie, chainmail bikinis, cleavage cutouts, hip cutouts, bare-midriff battlefield gear, or exposed nipples. The strong don't reveal themselves that way. Enforced via `BASE_NEGATIVE` in `services/claudeApi.ts` + `HAIR_FASHION_NEGATIVES` + Fashion Bible §22 modesty clause + `STYLE_ANCHOR`.
- Commit messages should be concise, describe the "why"
