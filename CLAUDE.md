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
│   │   │   ├── WhisperWords.tsx
│   │   │   └── NavBar.tsx
│   │   ├── pages/
│   │   │   ├── CardForge.tsx       # 4-stage creation flow
│   │   │   ├── Collection.tsx      # Card grid with filters/sort
│   │   │   ├── CardDetail.tsx      # Full card view + stats panel
│   │   │   └── Home.tsx
│   │   ├── services/
│   │   │   ├── cardGenerator.ts    # Stat generation, border mapping, card shell builder
│   │   │   ├── claudeApi.ts        # Anthropic API call for card text
│   │   │   ├── storage.ts          # localStorage CRUD
│   │   │   └── portraitGenerator.ts # Placeholder portrait (gradient + letter)
│   │   ├── data/
│   │   │   ├── archetypes.ts       # 10 archetype definitions
│   │   │   └── stats.ts            # Border color palette
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

## Current Data Model

The stat system was refactored from 6 fitness stats to a standard TCG model:

```typescript
interface Card {
  cardId: string;
  archetype: ArchetypeName;     // 10 options: Barbarian, Monk, Beastmaster, Druid, Necromancer, Vampire, Mech Pilot, Android, Seraph, Human
  rank: Rank;                   // Foundation | Forged | Ascendant
  cardName: string;             // AI-generated
  nameAndTitle: string;         // AI-generated (e.g. "Kael, the Unbroken")
  portraitAsset: string;        // Placeholder gradient for now
  stats: { atk: number; def: number };
  manaCost: number;
  border: { baseVariant: BorderVariant; baseSource: string };
  lore: string;                 // AI-generated
  whisperWords: string[];
  createdAt: string;
}
```

**Stat ranges by rank:**
- Foundation: ATK/DEF 1-4, Mana 1-3
- Forged: ATK/DEF 3-7, Mana 2-5
- Ascendant: ATK/DEF 5-10, Mana 4-8

**Border variant is determined by archetype** (not highest stat):
- Barbarian/Vampire → Dominance (red)
- Monk/Mech Pilot/Android → Conscientiousness (blue)
- Beastmaster/Druid → Steadiness (green)
- Necromancer/Seraph → Influencing (gold)
- Human → Default

## Card Renderer Positioning (from Figma)

Card dimensions: 463x668 (Figma), rendered at 326x470 (full) or 42% scale (thumbnail).
All positions are percentage-based, derived from the Figma template (`J8RTVE4x69tAiVU0DGv5zq`, node `1:182`):

| Element | Position | Notes |
|---------|----------|-------|
| Card Name | top: 5.5% | Centered, ~29% side padding |
| Mana Cost | top: 2%, right: 7.5% | Top-right crystal shield, 22px white text |
| Portrait | top: 8%, sides: 8%, bottom: 38% | Image or gradient placeholder |
| Name & Title | top: 69% | Centered in parchment banner, dark text |
| ATK/DEF perks | top: 75.5%, left: 25.5% | Vertical list with badge+icon, full size only |
| Power/Toughness | top: 87.5%, left: 79% | Bottom-right, white text with glow |

## Card Creation Flow (CardForge.tsx)

4 stages: `archetype` → `stats` → `whisper` → `forging/reveal`

1. **Archetype + Rank** — grid of 10 archetypes, then 3 rank tiers. Both have "Random" options.
2. **Dice Roll** — 3D CSS cube animation. Three dice (red ATK, blue DEF, purple MANA) tumble and land sequentially. Numbers cycle during roll. Reroll is unlimited.
3. **Whisper Words** — 3 categories (Element, Physique, Lineage) with 6 preset options each + custom text. Optional (can skip).
4. **Forge** — Calls Claude API, builds card, saves to localStorage, reveals with fade-in animation.

## Figma Design Reference

- **File key:** `J8RTVE4x69tAiVU0DGv5zq`
- **Components page:** `1:2`
- **Card type (Dominance):** `1:182` — use this as the positioning reference
- **Icons section:** `1:72` — ATK uses HandFist (`1:94`), DEF uses CastleTurret (`1:120`)

## Phase Status

- **Phase 1: Card Engine** — IN PROGRESS (core forge + collection working, dice animation added)
- **Phase 2: Backend + Accounts** — NOT STARTED (Supabase, user profiles, cloud save)
- **Phase 3: Leveling & Minigames** — NOT STARTED
- **Phase 4: PvP Battles** — NOT STARTED

Do NOT proceed to Phase 2 unless explicitly asked.

## Known Limitations / Next Steps (Phase 1)

- Portraits are placeholder gradients — no real AI image generation yet
- No `.env.example` file (add one with `VITE_ANTHROPIC_API_KEY=your-key-here`)
- The existing `card-engine-development-plan.md` and `card-engine-project-knowledge.md` reference the old 6-stat system — they are partially outdated. This CLAUDE.md is the source of truth.
- Dice animation uses CSS 3D cubes — functional but could be polished further
- Card images in `Card Images/` folder exist but aren't integrated into the app yet

## Conventions

- Tailwind v4 `@theme` block for design tokens — do not use `tailwind.config`
- Fantasy-themed UI: dark backgrounds, parchment/gold accents, `font-fantasy` (Cinzel) for headings
- Card rendering uses absolute positioning with percentage values overlaid on border frame PNGs
- No test suite yet — verify changes visually using the dev server
- Commit messages should be concise, describe the "why"
