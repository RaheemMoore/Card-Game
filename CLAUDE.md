# Card Engine — Fantasy TCG

A collectible fantasy card game where users forge unique character cards through an interactive ritual (archetype > dice roll > whisper words > AI-generated text). Built as a standalone web app — Phase 1 of a 4-phase project.

## Quick Start

```bash
cd card-engine
npm install
npm run dev        # Vite dev server on :5173
```

Requires a `.env` file in `card-engine/` with `VITE_ANTHROPIC_API_KEY=sk-ant-...` for card text generation (Claude claude-sonnet-4-6).

## Tech Stack

- **React 19** + **Vite 8** + **TypeScript 6**
- **Tailwind CSS v4** (uses `@theme` block in `index.css`, not `tailwind.config`)
- **react-router-dom v7** for routing
- **localStorage** for card persistence (no backend in Phase 1)
- **Anthropic API** (claude-sonnet-4-6) called client-side for card name/title/lore generation

## Project Structure

```
Card Game/                          # Git root
├── CLAUDE.md                       # This file
├── card-engine/                    # The app
│   ├── src/
│   │   ├── types/card.ts           # Card interface, archetypes, ranks, borders
│   │   ├── components/
│   │   │   ├── CardRenderer.tsx    # Card display with Figma-matched positioning
│   │   │   ├── DiceRoll.tsx        # 3D CSS cube dice roll animation
│   │   │   ├── ArchetypeSelector.tsx
│   │   │   ├── WhisperWheel.tsx
│   │   │   ├── NavBar.tsx
│   │   │   └── economy/           # CurrencyBalance, CurrencyCost, WalletPopover, etc.
│   │   ├── pages/
│   │   │   ├── CardForge.tsx       # 4-stage creation flow
│   │   │   ├── Collection.tsx      # Card grid with filters/sort
│   │   │   ├── CardDetail.tsx      # Full card view + stats panel
│   │   │   └── Home.tsx
│   │   ├── services/
│   │   │   ├── cardGenerator.ts    # Stat generation, border mapping, card shell builder
│   │   │   ├── claudeApi.ts        # Anthropic API call for card text
│   │   │   ├── promptAssembler.ts  # Base + DNA + rank + modifier pools → final prompt
│   │   │   ├── leonardoApi.ts      # Leonardo portrait generation
│   │   │   ├── regeneratePortrait.ts # Portrait regen with Character Reference
│   │   │   ├── tierUp.ts           # Foundation → Forged → Ascendant evolution flow
│   │   │   ├── ascendantPaths.ts   # Ascendant-tier specialization branching
│   │   │   ├── portraitGenerator.ts # Placeholder portrait (gradient + letter)
│   │   │   ├── storage.ts          # localStorage CRUD
│   │   │   └── economy/            # walletService, transactionLedger, pricingCalculator, validation, useWallet (+ tests)
│   │   ├── data/
│   │   │   ├── archetypes.ts       # 10 archetype definitions
│   │   │   ├── powerSystem.ts      # Class affinity matrix, bias ranges, rank derivation, prompt suffixes
│   │   │   ├── modifierPools.ts    # 4 pools × 25 entries (Setting, Demeanor, Signature Detail, Lighting)
│   │   │   ├── stats.ts            # Border color palette
│   │   │   └── economy/            # apiCostCatalog, premiumPriceCatalog, gameplayPriceCatalog, rewardCatalog, bundles, assumptions
│   │   ├── index.css               # Tailwind @theme, keyframes (dice, shimmer, fadeIn)
│   │   └── App.tsx                 # Router + fantasy background layout
│   └── public/
│       └── assets/                 # Figma-exported PNGs
│           ├── borders/            # 5 card frame overlays (926x1336 @2x)
│           ├── badges/             # Colored circle badges for stat display
│           ├── icons/              # Stat icons (fist, castle-turret, star, etc.)
│           └── backgrounds/        # Fantasy landscape background
├── Card Images/                    # Portrait source images (not used in app yet)
├── card-engine-development-plan.md # Original 4-phase plan (partially outdated)
├── card-engine-project-knowledge.md # Figma node IDs and design reference (partially outdated)
└── card-engine-archetype-prompt-library.md
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
  archetype: ArchetypeName;     // 10 options
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
  whisperWords: string[];
  evolutionHistory: EvolutionHistory; // keyed by StatName → Rank → ArtSnapshot
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

4 stages: `archetype` → `stats` → `whisper` → `forging/reveal`

1. **Archetype** — grid of 10 archetypes with affinity preview on hover. "Random" option. No rank selection (rank is derived from stats).
2. **Dice Roll** — 3D CSS cube animation. Three dice (ATK/DEF + MANA or TECH depending on archetype) tumble and land sequentially. Values roll within the archetype's Foundation bias range (1–100 scale). **3 rerolls max**, rerolls all stats fresh.
3. **Whisper Words** — 3 categories (Element, Physique, Lineage) with 6 preset options each + custom text. Optional (can skip).
4. **Forge** — Calls Claude API (with specialization suffix + visual motifs), builds card, saves to localStorage, reveals with fade-in animation.

## Figma Design Reference

- **File key:** `J8RTVE4x69tAiVU0DGv5zq`
- **Components page:** `1:2`
- **Card type (Dominance):** `1:182` — use this as the positioning reference
- **Icons section:** `1:72` — ATK uses HandFist (`1:94`), DEF uses CastleTurret (`1:120`)

## Phase Status

- **Phase 1: Card Engine** — CORE COMPLETE. Forge flow, collection, power system, Leonardo portraits, modifier pools, tier-up evolution + history viewer, whisper wheel, and two-currency economy (localStorage) are all working.
- **Phase 1.5: Economy hardening + polish** — IN PROGRESS. Governance rules for the economy live in [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md). Any change to prices, rewards, bundles, or exchange rules requires explicit Raheem approval — see charter.
- **Phase 2: Backend + Accounts** — NOT STARTED. Supabase migration, auth, server-authoritative wallet + ledger. This is a hard prerequisite for real-money bundle sales.
- **Phase 3: Leveling & Minigames** — NOT STARTED.
- **Phase 4: PvP Battles + Trading** — NOT STARTED.

Do NOT proceed to Phase 2 unless explicitly asked.

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
- Economy is localStorage-only — see [card-engine-economy-currency-system-plan.md](card-engine-economy-currency-system-plan.md) §9 for the production-security prerequisites before any real-money work.
- The legacy 6-stat docs (`card-engine-development-plan.md`, `card-engine-project-knowledge.md`) have been moved to [docs/archive/](docs/archive/) — do not consult them as source of truth.

## Studio Structure

This repo is set up as an AI Game Studio (see [STUDIO_CHARTER.md](STUDIO_CHARTER.md)). I am the Studio Lead — I do all implementation. Specialist subagents advise, skills define reusable workflows.

- `.claude/agents/` — 4 specialists: game-systems-designer, art-prompt-director, ui-ux-director, technical-architect. Invoke only for open-ended design questions.
- `.claude/skills/` — 6 workflows: design-feature, ship-approved-plan, sync-project-knowledge, audit-project-knowledge, art-pipeline, balance-playtest (scaffold-only).
- `.claude/verify/card-engine.sh` — project verify script the built-in `verify` skill bootstraps.
- `.claude/launch.json` — dev-server preview config (`card-engine-dev` on :5173).

## Conventions

- Tailwind v4 `@theme` block for design tokens — do not use `tailwind.config`
- Fantasy-themed UI: dark backgrounds, parchment/gold accents, `font-fantasy` (Cinzel) for headings
- Card rendering uses absolute positioning with percentage values overlaid on border frame PNGs
- Economy modules have vitest unit tests (`services/economy/*.test.ts`). Other code has no tests yet — verify UI/renderer changes visually using the dev server (see `.claude/verify/card-engine.sh`).
- Commit messages should be concise, describe the "why"
