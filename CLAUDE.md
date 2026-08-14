# Card Engine — an adventure game with characters you made yourself

Yu-Gi-Oh, Pokémon, and fantasy adventure. Players forge characters through an interactive ritual (archetype > dice roll > Story Pillars > element + bond > image-first generation), then grow them across game modes. **The card is the FORMAT a character comes in — it is not the point.** This distinction is load-bearing: it is why the forge is a ritual rather than a slot machine, and why identity fields are locked so advancement can never make someone younger, thinner, or less disabled.

The shape is a **hub with doors** — the castle courtyard is where you hang out before you go somewhere, and every game mode (the tower, the board game, the mine) is a door off it. **The tower is the main feature and the gate:** beating it unlocks the rest of the game.

> **Read [PRODUCTION.md](PRODUCTION.md) at the start of every session.** It is the living record of what the game is, what's in flight, what got started and abandoned, and why every decision was made — the things this file cannot carry because they change weekly. Update it via the `production-log` skill whenever work lands, a decision is made, or a question needs Raheem's ruling.

> **Studio control plane:** Read [AI_STUDIO_ARCHITECTURE.md](AI_STUDIO_ARCHITECTURE.md) for the simple operating model and `.claude/studio/STUDIO_CAPABILITY_REGISTRY.json` for routing/status. Choose FAST, STANDARD, or FULL mode. Agents advise; skills execute; the primary Claude integrates. Runtime/visual work returns PASS, FAIL, or HUMAN REVIEW. Project permissions and hooks live in `.claude/settings.json`.

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
- **Leonardo Lucid Origin** for flat top-down environment plates (Phoenix pulls hard toward perspective matte painting and cannot hold a 2D game-map read). Offline via `card-engine/scripts/bg-harness`.
- **Phaser 3** for the castle's 2D top-down scene, lazy-loaded via dynamic `import()` into its own async chunk so the ~1.2 MB engine never enters the main bundle.
- **PixelLab** for character sprites **and animated objects** — directional, animated, identity-consistent. **Objects animate too** (`/objects/{object_id}/animations`, `mode='v3'`): banners ripple, crystals pulse, pages flutter. A playbook claim that they could not was corrected 2026-08-04 — we use ~6 of 79 endpoints, so **read [PIXELLAB_PLAYBOOK.md](PIXELLAB_PLAYBOOK.md) §"What PixelLab can actually do" before concluding anything is impossible.** PixelLab animates what belongs to the *object*; Phaser layers the world's motion — sparkle, dust, bloom, player proximity — on top, for free. They are partners, not alternatives. The reproducible production harness remains `card-engine/scripts/sprite-lab`; the official PixelLab MCP and Pixelorama web editor support targeted generation/editing and manual correction. `PIXELLAB_API_KEY` is build-time/local only (never `VITE_`-prefixed or shipped to the browser). Workflows: [create-character-sprite](.claude/skills/create-character-sprite/SKILL.md), [place-character-in-scene](.claude/skills/place-character-in-scene/SKILL.md). Aseprite is optional/deferred until deterministic precision editing is a repeated measured need.

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
│   │   │   ├── games/FullscreenGameShell.tsx # Shared portal, 100dvh, scroll lock, and min-size layout boundary
│   │   │   ├── castle/courtyard/studioBridge.ts # DEV-only snapshots and three named Phaser scenarios
│   │   │   ├── CardForge.tsx       # 5-stage flow: archetype → stats → pillars → element+bond → forge → reveal
│   │   │   ├── Collection.tsx      # Card grid with filters/sort
│   │   │   ├── CardDetail.tsx      # Full card view — Story Pillar Q&A, elemental bond, prestige (when earned)
│   │   │   └── Home.tsx
│   │   ├── services/
│   │   │   ├── cardGenerator.ts    # Stat generation, border mapping, card shell builder
│   │   │   ├── claudeApi.ts        # Bible-driven prompt (Bible §Claude Generation Pipeline 14 steps)
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
├── Card Images/                    # Two hand-made source files: the ability-art bundle + emblem prompts
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

## World authoring — Phaser Editor, not Figma (Raheem, 2026-08-05)

**Phaser Editor is the world-authoring surface. Figma is no longer a primary editing tool.**
Raheem places pieces, sets layering and draws colliders in the Editor; Claude owns the code
beneath it. The decision was driven by the vision changing — a *dynamic* world where the wall
cracks and trees part cannot be built from one painted plate with holes traced out of it.

| Tool | Role |
|---|---|
| **Phaser Editor** | Raheem's surface — placement, layering, depth, colliders, animation preview. |
| **PixelLab** | Every actor and kit piece. **Kits are the cheapest thing it makes** — a 56-piece wall kit is 20 generations, the same as one large object. |
| **Leonardo** | Skies, distant backdrops, card portraits. Static things with no life. |
| **Figma (free tier)** | Card frames only, in personal drafts. **Not an authoring surface.** |
| **Pixelorama** | Hand trimming. Aseprite only if Pixelorama actually frustrates. |

**Nothing was migrated** — `/castle` already ran Phaser 3.90. The bridge is one file:
`public/asset-pack.json`, a native Phaser Asset Pack that is *also* what the Editor's Asset Pack
Editor reads. See [HARNESS_INDEX.md](HARNESS_INDEX.md) §6. Never hand-edit it; run
`npm run assets:pack`.

**The angle is locked; the camera is not.** Every character is `low top-down` (*"face visible —
what Pokémon does"*). Do not change it — it is paid for, and three-quarter is what lets a hero on
a wall, an ogre below it, and a fireball between them all read. The **camera** (scale, framing,
scrolling) is free to change at zero asset cost. Note the `view` enum **differs per endpoint**:
character routes take `low top-down | high top-down | side`, object and tile routes take only
`top-down | sidescroller`. On kit calls the angle is held by the **style reference image**, not
the `view` parameter — a tower batch already came back part-isometric for want of this.

### Figma Design Reference (card frames only)

- **File key:** `J8RTVE4x69tAiVU0DGv5zq`
- **Components page:** `1:2`
- **Card type (Dominance):** `1:182` — the positioning reference
- **Icons section:** `1:72` — ATK uses HandFist (`1:94`), DEF uses CastleTurret (`1:120`)

Card frames stay as they are. **PNG is what gives us liberties, not what limits them** —
`scripts/sprite-lab/lib/recolor.py` produces orange/purple/verdigris variants for zero
generations and zero Figma. Rainbow and crystal are *not* recolours (gradient and specular
structure); those need generation or hand work.

### Leonardo art NEVER goes straight into the game — it goes through PixelLab first (Raheem, 2026-08-07)

**Standing rule.** Leonardo (and Gemini-via-Leonardo) is where a building or object is *designed*.
It is **not** where the shipped asset comes from. Matting a Leonardo image and dropping it into the
editor produces something visibly worse than the rest of the game, and the reason is measurable, not
aesthetic:

| Asset | Flatness | Colours |
|---|---|---|
| Forge, Gemini matted + downsampled | **0.6%** | 26,393 |
| Forge, after PixelLab redraw + quantize | **42.9%** | 64 |
| Archivist, after PixelLab redraw + quantize | **64.7%** | 48 |
| `castle-wall-straight-v2` (native kit art) | 59.4% | 48 |

*Flatness* = share of neighbouring pixels that are **exactly** equal. Real pixel art is flat; a
downsampled painting is not. At 0.6% almost every pixel differed from its neighbour — it was a
photograph shrunk down, wearing pixel art's clothes. No amount of colour-matching fixes that,
because the defect is structural.

**The pipeline, in order:**

1. **Design in Leonardo** — Raheem generates. `gemini-2.5-flash-image` is web-UI only and returns
   "Unsupported model" on the REST API, so this step cannot be scripted; pull the master back with
   the generations API (the CDN file *is* the master — it is a JPEG, there is no cleaner PNG).
2. **Crop to the building, above the foundation.** Feed the ORIGINAL ~940px art, not a downsample —
   the redraw uses everything it is given.
3. **`POST /image-to-pixelart`** (`image:{base64}`, `image_size`, `output_size`; input ≤1280²,
   output ≤320²). PixelLab **redraws** it as pixel art. ~$0.01, 1 generation. First used 2026-08-07.
4. **Key the white surround** by flooding from the border only — never a global threshold, or
   enclosed light pixels (mortar highlights, fire) get punched out.
5. **Cut the ground skirt** at the foundation row, found by where the dirt/grass share of the row
   jumps (forge 16%→60% at row 187; archivist 42%→64% at row 264). The redraw invents ground even
   when the input had none.
6. **Quantize to ~48 colours** — this is what lands on the kit's flatness. Check saturation cost.
7. **`lib/dehalo.py --min-value 185`** for the matting rim.
8. Register in `castle-kit-manifest.json` → `npm run assets:pack` → place.

**Protect a glow region only when the art is mostly desaturated.** The forge's rainbow portal got its
own 24-colour ramp because a flat quantize starved it to mud. The archivist got no protected region —
46.5% of it sits above saturation 60 because the blue stone and teal dome *are* the building, so a
saturation split would have bucketed half the facade as "glow." A straight quantize measured better
there anyway (−7% saturation). Decide from the measurement, not the assumption.

**What you give up:** the redraw simplifies fine props it judges unimportant (the forge's potion
shelf lost detail). That is the price of a real game asset, and it is worth it.

## Subsystem Reference

> **[PRODUCTION.md](PRODUCTION.md) §3 owns current status. When it disagrees with the status words below, PRODUCTION.md wins** — it is updated every session and this section is not. What follows is kept for the durable architecture it records (table names, RPC names, project ids, which decision retired what), not for its phase labels. Open work lives in [PRODUCTION.md §4](PRODUCTION.md), not here.

- **Phase 1: Card Engine** — CORE COMPLETE. Forge flow, collection, power system, Leonardo portraits, tier-up evolution + history viewer, and two-currency economy are all working. Character generation runs the Bible-driven pipeline (Story Pillars + element bond → Bible §Claude Generation Pipeline 14 steps → HiddenFate → Leonardo). The retired whisper-wheel + modifier-pool system was replaced 2026-07-19; see [card-engine-character-generation-bible-integration.md](card-engine-character-generation-bible-integration.md).
- **Phase 1.5: Economy hardening + polish** — IN PROGRESS. Governance rules for the economy live in [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md). Any change to prices, rewards, bundles, or exchange rules requires explicit Raheem approval — see charter.
- **Phase 2: Backend + Accounts** — PERSISTENCE + AUTH + ADMIN LANDED. Supabase project (Card-Game, `ofrcpmiytqgziozsourn`) holds `profiles` (with `role`), `cards`, `economy_transactions` with RLS keyed on `auth.uid() OR is_admin()`, and a private `portraits` storage bucket with per-user-path RLS. Email+password sign-up via `<AuthModal>` uses `auth.updateUser` on anonymous sessions to preserve the uid (existing cards + ledger carry over). Admin role gates a `/admin` route with user list, per-user drawer (currency grants w/ required reason → `admin_adjustment` in the ledger, readonly cards + ledger). Server-side RPCs (`list_users_for_admin`, `get_system_stats`, `grant_admin_adjustment`) run SECURITY DEFINER with is_admin() guard. Server-authoritative wallet + real-money bundle sales are still out of scope — the client JWT is still trusted, and the payment rails from §9 of the economy plan still need to land before real money is safe. See [card-engine/supabase/README.md](card-engine/supabase/README.md) for the schema + the one dashboard step needed (Anonymous Sign-Ins toggle).
- **Phase 3: Ability System + Boss Battles** — COMPLETE (Stage A + Stage B shipped 2026-07-18).
  - **Ability System (A0–A9):** typed effect/target/trigger/condition/status catalogs; power-budget validator; 5 seed abilities; Supabase `ability_*` tables with library-read/admin-write RLS; forge + tier-up ability proposals with duplicate detection (exact-match auto-attach, fuzzy queues); discovery rewards (Gold + Forge Crystals per rarity, idempotent via ledger); Codex home + family + ability pages; canonical art pipeline with placeholders + Leonardo (3 seed abilities generated); admin moderation queue with approve/reject/merge/deprecate. Spec: [card-engine-ability-system-spec.md](card-engine-ability-system-spec.md).
  - **Boss Battles (B0–B7):** turn-based combat contract; pure deterministic reducer with seeded RNG + snapshot-immutable ability resolution; headless 5000-run simulator; Supabase `boss_*` tables; Emberborn Wraith (fire elemental, 2 phases) as first boss; playable `/battle` route with hero picker + encounter screen + intent banner + event log; idempotent battle rewards (first-clear 500g/100c, repeat 100g/15c) via ledger `battleId` scan; data-driven damage numbers; hit-shake + reduced-motion; mobile responsive. Spec: [card-engine-boss-battle-spec.md](card-engine-boss-battle-spec.md).
- **Phase 3.5: Boss art polish** — DEFERRED pending art-direction alignment. Placeholder card renders in-app; final Leonardo boss art will follow the same 2D fantasy pipeline as ability art. See boss battle spec §18.
- **Admin Operations Dashboard** — Phases 0–7 COMPLETE on `bible-integration` (2026-07-19). Provider secrets fully server-side: `/api/anthropic-messages`, `/api/leonardo` (method+path allowlist, cost logged), `/api/s3-upload` (AWS host allowlist, 5 MB cap), all JWT-gated. Every paid call writes `api_usage_events` (admin-only RLS). Admin shell with nested routes: Overview (Leonardo live balance + Anthropic "unavailable" + primary tiles + pending banner), Users, Cards (`list_cards_for_admin` RPC + gallery + prompt provenance drawer), Abilities (tabbed workspace + candidate art lifecycle + detail preview panel), Archetype Workshop (see Phase 3c below — replaces the retired Proposals page), Costs (per-provider spend + per-action rollup + catalog compare), Diagnostics (probes + ability art migration). **The Prompt Lab was retired 2026-08-12** — it chained F→Fg→A in-app, and rank art is now made outside the app from one good Foundation seed which `ReadTheArt` reads back. Its plumbing all stays and the Workshop bench writes through it: `prompt_test_batches`/`prompt_test_runs`, the `prompt-test-artifacts` bucket, `/api/prompt-lab-record`, `/api/prompt-lab-signed-url`, and the daily retention sweep via Vercel Cron. `/admin/prompt-lab` redirects to the bench. The Overview Inbox, whose only feed was Lab judgments, now shows the curated roster's pending work. Ability art lifecycle fixed: candidates land as `candidate`, prior approved stays live until promoted. Shared `AdminPreviewPanel` component pattern for right-side drawers. See [Claude_Code_Admin_Operations_Dashboard_Plan.md](docs/archive/handoffs/Claude_Code_Admin_Operations_Dashboard_Plan.md) (archived — the work it plans is shipped).
- **Phase 3c: Archetype Workshop** — IN PROGRESS (shell shipped 2026-07-20). Admin route `/admin/workshop` gives lore directors a structured way to file lore/art change proposals against a specific archetype and card, mapped to one of the four layers where change actually happens (A Canon / B Rank & Stat Visuals / C Modifier Pools / D Meta-Prompt & Escalation). Proposals persist to Supabase `archetype_proposals` (admin-only RLS); each row captures a layer snapshot at submission time so review weeks later can compare against the canon that was true when it was filed. Replaces the retired phase6b `prompt_change_proposals` + `admin_audit_log` + `AdminChangeProposals` workflow — that system was Raheem's first attempt at an archetype review process and had too much friction. Step (b) — walking every archetype and adding Lycanthrope-style Layer-D escalation blocks — starts from here. **The Lab→Workshop→verify loop was deleted 2026-08-12, never having run.** This file previously described it as shipped; in fact `services/regenVerify.ts` had no caller from the day it was written, and it went with the Prompt Lab. Recorded rather than quietly dropped, because a doc asserting a capability that does not exist is worse than a missing feature.
- **Seraph corruption arc (P4–P8)** — LANDED 2026-07-20 on `seraph-corruption-arc`. Seraphs carry a contested divine spark resolved to a narrative axis (Good / Fallen / Balanced) from `alignmentWeight`-tagged Story Pillar answers (`data/narrativeAxes/seraphAlignment.ts`, `services/narrativeAxisService.ts`), recomputed at tier-up. A Fallen Seraph whose element is Light transmutes it to the Fallen-exclusive **Infernal** element (molten obsidian + black light, never fire-orange) via `applySeraphTransmutation` in `services/tierUp.ts`; leaving the Fallen path reverts it. The Seraph Bible chapter, three-path rank evolution, and a Layer-D `META_PROMPT_BLOCKS` entry drive the art prompt. **Resist the Fall** is a Gold-only, grindable sink (200 Gold at Forged, 400 at Ascendant — approved by Raheem 2026-07-20) that nudges alignment one step toward center at tier-up; UI lives in the Card Detail Seraph alignment panel. `AbilityVersion.hasTwilightMode` is reserved for Balanced-Seraph dual-cast (combat resolution is a follow-up; not yet consumed by the reducer).
- **Castle courtyard (2D hub)** — IN PROGRESS on `combat-vfx-overhaul`. `/castle` renders a painted, non-scrolling top-down courtyard in Phaser 3 (`src/pages/castle/`): fixed cover-scaled camera, WASD/arrow + tap-to-move walking, feet-anchored colliders traced onto the plate, proximity ribbons, keyboard stall traversal with a Directory fallback, and reduced-motion support. The long-term intent is for the castle to become the post-login home surface and for stalls to open the existing React features (Forge, Collection, Minigames, Boss Battles) — **that wiring is deliberately NOT built yet**; stalls open placeholders. Art targets PC + tablet landscape; phone portrait is deferred. See `src/pages/castle/courtyard/layout.ts` for the cover-scale/safe-box derivation — the canvas size is load-bearing, not arbitrary.

  **`/castle` is now CourtyardV3 (`src/pages/castle/v2/`), and the description above is the LEGACY plate courtyard at `/castle/classic`.** They differ in ways that catch people: V3 scrolls, has no tap-to-move, and has no reduced-motion path; the three named studio scenarios and `COURTYARD_EVENTS.motionOff` belong to the classic one only. Overworld combat lives in `castle/combat/` as pure, unit-tested modules (`actionState`, `hand`, `blast`, `aim`, `scatter`, `cardActions`, `construct`) with a thin Phaser seam in `v2/courtyardRuntime.ts`. **Add new behaviour as a new pure module plus a presenter, not as more inline runtime code** — that file is already ~2000 lines and carries walk, jump, doors, depth, wildlife and combat together.

  Two combat rules that are not tuning knobs. **The Card-wright has no dodge, roll or shield, ever** — so any enemy's ordinary attack must be avoidable by *walking*, which `construct.ts`'s `telegraphIsAvoidable()` states as arithmetic and two tests hold it to. And **only a telegraphed strong hit scatters the hand**; ordinary damage must not, or losing the cards stops meaning anything. Verification runs through `__cardEngineDev.combat.*` (DEV **and** `?combatDev=1`) rather than synthesised input — the preview pane holds the mouse button down and cannot play the game.
- **Phase 4: PvP Battles + Trading** — NOT STARTED.

Do NOT proceed to real-money bundle sales without landing the rest of Phase 2 (§9 production security prerequisites in the economy plan).

## Economy System

Two-currency model implemented on localStorage (prototype only — not production-safe for real money):

- **Premium currency** (`premium`, working name "Forge Crystals") — pays for AI-generated actions (forge card, evolve art, regenerate portrait).
- **Gameplay currency** (`gameplay`, working name "Gold") — earned through play; supports non-API progression.

Architecture is catalog-driven: `data/economy/` holds the source-of-truth catalogs (API cost estimates, premium prices, gameplay prices, rewards, bundles, tunable assumptions). No component may hardcode prices. `services/economy/walletService.ts` handles reserve → commit → refund transactions via `transactionLedger.ts`.

**Governance:** [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) §13 is binding. I never change player prices, reward values, bundle values, starting balances, or exchange rules without explicit Raheem approval and a documented reason.

## Known Limitations / Next Steps

**Moved to [PRODUCTION.md §4 Open Threads](PRODUCTION.md).** Every unfinished thread in the
project — 42 of them, categorized, each with a `file:line` and what would unblock it — is
tracked there and updated every session. Keeping a second list here is how the first one
went stale.

Two standing rules that are not "limitations" and stay in this file:

- The legacy 6-stat docs (`card-engine-development-plan.md`, `card-engine-project-knowledge.md`) live in [docs/archive/](docs/archive/) — do not consult them as source of truth.
- Real-money bundle sales require the §9 production-security prerequisites in [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) — server-authoritative wallet, receipt verification, idempotency keys. Not negotiable.

## Studio Structure

This repo is set up as an AI Game Studio (see [STUDIO_CHARTER.md](STUDIO_CHARTER.md)). I am the Studio Lead — I do all implementation. Specialist subagents advise, skills define reusable workflows.

- `.claude/agents/` — read-only specialist directors: game-systems, lore/fantasy, minigame, UI/UX, technical architecture, **Phaser runtime**, art/prompt, environment art, and pixel sprites. Invoke only when the registry trigger matches an open decision; FAST work normally uses none. Their tool surface is enforced as Read/Grep/Glob only.
- `.claude/skills/` — repeatable workflows, including design/ship/sync, art and PixelLab production, environment/boss/prop workflows, `studio-health`, `build-phaser-feature`, and `visual-playtest`. `balance-playtest` remains hidden/inactive; `ship-minigame` and the completed `extract-fullscreen-shell` migration are retired and hidden.
- **Twelve serverless functions, total. Every file in `card-engine/api/` is one.** Vercel's Hobby plan caps a deployment at 12, and going over fails the DEPLOY *after* a completely successful build — so it reads as an infrastructure fault rather than a quota, and cost an afternoon on 2026-08-10 before anyone recognised it. Count with `ls card-engine/api/*.ts | wc -l` before adding an endpoint. Helpers under `api/_lib/` do NOT count (Vercel skips `_`-prefixed directories), so related reports belong behind one route with a `?probe=` parameter — see `api/admin-metrics.ts`, which merged four. **The released game needs zero functions**: it ships the curated roster and nothing that spends money, so every endpoint here is operator tooling and the admin surface should eventually deploy separately from the game (Raheem, 2026-08-11).
- **Look at the live surface before redesigning it. Production exists: https://card-engine-sigma.vercel.app** Standing rule (Raheem, 2026-08-10). When asked to update or redesign an existing page, the FIRST action is to open that page running — production if it is deployed, dev server otherwise — screenshot it, and confirm the target look before writing a line of styling. Reading the code is not looking at the page. This rule cost a full day: the admin Workshop was rebuilt in the studio wiki's palette on the strength of a code read, while the real admin sat deployed with a design Raheem liked and wanted kept; 536 lines of CSS and a whole primitives layer were thrown away. Two corollaries. **An accessibility-tree read is a check, not evidence — never report a UI as working without a screenshot Raheem can see.** And **work that lives only on an uncommitted branch is invisible to him**: say so early and loudly, or he will reasonably conclude the tool is broken rather than undeployed.
- **Colour is a post-process — offer it, never re-roll for it.** Standing rule (Raheem, 2026-08-04): when an asset's only problem is hue, saturation or value, proactively offer a recolour via `scripts/sprite-lab/lib/recolor.py` — free, exact, and applied identically across every frame, which an AI inpaint cannot manage. Regenerate for composition, pose, silhouette or content; **never for colour alone.** Three regenerations were spent on colour before this was written down. Ramps are shared, so region-constrain the swap. See [PIXELLAB_PLAYBOOK.md](PIXELLAB_PLAYBOOK.md).
- **Characters are 2D chibi, always — copy `hero-chibi.json`'s style block verbatim.** Vary body type, age, sex and ancestry freely; never vary the art register. `/create-character-v3` has **no `proportions` field** so "chibi" written in prose does not hold — use `/create-character-with-4-directions` with `proportions: {type: preset, name: chibi}`, which is what made the hero actually in the game. `SHOPKEEPER_GUIDE.md`'s old "match the dwarf, not the hero" instruction is **reversed** as of 2026-08-04 and the dwarf is queued for regeneration.
- **Always confirm the angle before animating.** Animation is per-direction, so a clip only exists on the faces you paid for — animating `south` for an object destined for the left wall (`south-east`) buys a loop nobody sees. Generate angles → Raheem picks and places → confirm that face → animate. An `animation_group_id` lets the same clip be extended to more directions later, charging only for the new ones, so starting with one costs nothing. ~2 generations per direction. See [PIXELLAB_PLAYBOOK.md](PIXELLAB_PLAYBOOK.md).
- **Present art as a sprite sheet.** Standing rule (Raheem, 2026-08-04): rows are the object or its animation, columns are frames, **one uniform cell throughout**, row label left, frames bottom-centred on a shared floor line, and the sheet lives beside the thing it belongs to. Animations extend it downward as further rows. It is how game developers actually read art, and it makes the available angles and clips legible at a glance. See [HARNESS_INDEX.md](HARNESS_INDEX.md) §Rule Zero (b).
- **Never show work in chat — show it in a harness.** Standing rule (Raheem, 2026-08-04): *"Harness every time. We always use a harness. Make another harness if you need one."* A pasted screenshot is not a deliverable; a page he can open, scroll and come back to is. Use the harness that fits, build one if none does, register assets in it **before** showing them, and give him a real way in (an Artifact URL or a dev-server route, not a file path to hunt for). See [HARNESS_INDEX.md](HARNESS_INDEX.md) §Rule Zero.
- **[HARNESS_INDEX.md](HARNESS_INDEX.md) — the catalogue of every reusable harness, readout, library script, review sheet and registration point.** Read it BEFORE any art, boss, arena, sprite or prop work, and **name the relevant tools to Raheem before starting** — the harnesses are how he and the team see what is happening, and a run that does not offer them is a miss. Every new harness or readout is added here in the same commit that builds it.
- **Art playbooks** — [LEONARDO_PLAYBOOK.md](LEONARDO_PLAYBOOK.md) (portraits, environment plates) and [PIXELLAB_PLAYBOOK.md](PIXELLAB_PLAYBOOK.md) (character sprites). Both are running records of what actually worked and what it cost; append after every run. `card-engine/scripts/sprite-lab/test-validator.sh` guards the sprite quality gate against regression.
- `.claude/settings.json` + `.claude/scripts/` — shareable permission, human-gate, secret-protection, and studio-lint enforcement.
- `.claude/verify/card-engine.sh` — objective project checks. It never installs dependencies automatically or claims visual acceptance.
- `.claude/launch.json` — dev-server preview config (`card-engine-dev` on :5173).
- **Skill/agent opportunities:** I raise credible candidates proactively (Reuse Forecast in `design-feature`, Reuse Review in `ship-approved-plan`); Raheem approves before I create anything. See [STUDIO_CHARTER.md](STUDIO_CHARTER.md) — *Proactive Workflow Discovery*.

## Conventions

- Tailwind v4 `@theme` block for design tokens — do not use `tailwind.config`
- Fantasy-themed UI: dark backgrounds, parchment/gold accents, `font-fantasy` (Cinzel) for headings
- Card rendering uses absolute positioning with percentage values overlaid on border frame PNGs
- Economy and several engine modules have deterministic tests. UI/Phaser changes must use relevant static checks plus a named runtime/visual scenario; do not treat a build or casual eyeballing as complete evidence. See `visual-playtest` and `.claude/studio/PHASER_RUNTIME_BRIDGE_SPEC.md`.
- **Bible §Rank continuity is inviolable:** rank progression preserves sex, age, body type, ancestry, disability, physical condition, defining scars, and core identity. Advancement must NOT automatically make a character younger, thinner, more muscular, healthier, less disabled, or more conventionally attractive. Locked HiddenFate fields carry across ranks verbatim (see `services/hiddenFate.ts` LOCKED_HIDDEN_FATE_FIELDS).
- **Lycanthrope pipeline deviation (retired):** the pre-Bible Lycanthrope had a forced "MORE wolf each rank" mandate with `init_strength = 0.15/0.30`. The Bible reframes Lycans as Guardians of the Moon Goddess whose rank progression deepens pack trust and lunar responsibility, NOT bestial morphology. `init_strength` may still drop for Lycan to allow the subtle wolfish tells to shift, but the mandated escalation prompt is gone. See Bible §Lycanthrope §9.
- **Figure modesty (M5.7) — applies to EVERY generated figure, no exceptions:** heroes, card portraits, NPCs, **bosses, monsters and non-human creatures alike**. Every figure is clothed, armoured or otherwise covered from neck to feet. NEVER bras, panties, lingerie, chainmail bikinis, cleavage cutouts, hip cutouts, bare-midriff gear, loincloths, **bare chests, bare torsos, shirtless figures, visible nipples of any sex, or nude/near-nude anatomy**. The strong don't reveal themselves that way, and **this game is for everyone**.
  - **The rule is sex-neutral and species-neutral.** It was written female-specific once ("cleavage", "bra", "exposed breasts") and that hole cost a run: boss concepts came back as bare-chested nude-muscular monsters, because "monster" and "male" were never covered. A negative list that names only one sex's anatomy does not implement this rule.
  - **"It's a monster" is not an exemption.** Bark, hide, fur, carapace or moss count as covering only when they fully sheath the torso and hips; a creature textured *like* skin is still nude. Say so in the positive prompt, don't hope.
  - Enforced via `BASE_NEGATIVE` in `services/claudeApi.ts` + `HAIR_FASHION_NEGATIVES` + Fashion Bible §22 + `STYLE_ANCHOR` for card art, and via the shared negative in each `scripts/bg-harness/configs/*.json` for offline plates and concepts. Both paths must carry it.
- Commit messages should be concise, describe the "why"
- **Work on `development`, never directly on `main`.** The repo runs a two-branch workflow:
  `development` is the active branch every session commits and pushes to; `main` is the stable
  version and is only ever updated by opening a pull request from `development`. Short-lived
  branches off `development` are fine, but they get deleted when they merge — **a branch has no
  "close", only merge or delete.** Abandoned work is preserved with an annotated tag
  (`git tag -a archive/<name> <sha>`, pushed) and the branch is then deleted, so the branch list
  stays at two. This replaced a 49-branch pile on 2026-08-14; see [WORKFLOW.md](WORKFLOW.md).
