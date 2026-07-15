# Card Engine — Development Plan

**Purpose:** a step-by-step build plan for Claude Code. Complete each phase fully before starting the next. Each phase ends with a working, testable product.

---

## Phase 1: Card Engine (the core product)

**Goal:** a standalone web app where users create, view, and manage collectible fantasy character cards. No backend, no accounts — everything runs client-side with localStorage. When this phase is done, a user can sit down, make a card, see it rendered beautifully, save it to their collection, and come back later to find it still there.

### Tech Stack (Phase 1)

- **Framework:** React (Vite + TypeScript)
- **Styling:** Tailwind CSS
- **Storage:** localStorage (JSON) — the card data structure is already defined (see Card Blueprint below), so the Supabase migration in Phase 2 is a swap, not a rewrite
- **AI text generation:** Anthropic API (claude-sonnet-4-6) for card names, titles, and lore — called from within the app using the in-artifact API pattern
- **Card art:** placeholder system for Phase 1 (see 1C below) — real AI image generation is a follow-up enhancement once the engine is proven

### 1A — Data Layer & Card Model

Build the card data structure and localStorage CRUD first, before any UI. Everything else depends on this being solid.

**Card Blueprint (the canonical shape):**

```typescript
interface Card {
  cardId: string;              // uuid
  archetype: Archetype;        // one of the 10 archetypes
  rank: "Foundation" | "Forged" | "Ascendant";
  cardName: string;            // Claude-generated
  nameAndTitle: string;        // Claude-generated (e.g. "Kael, the Unbroken")
  portraitAsset: string;       // URL or data-URI for the card art
  stats: {
    Power: number;
    Speed: number;
    Endurance: number;
    Stability: number;
    Support: number;
    Patience: number;
  };
  highestStat: StatName;       // derived — determines border color and accent
  border: {
    baseVariant: "Dominance" | "Influencing" | "Steadiness" | "Conscientiousness" | "Default";
    baseSource: string;        // e.g. "Highest stat = Power"
  };
  lore: string;                // Claude-generated flavor text
  whisperWords: string[];      // the keywords the user typed during creation
  createdAt: string;           // ISO timestamp
}
```

**Stat randomization rules:**
- Range: 1–100 per stat
- Distribution: weighted random — one stat should tend to be noticeably higher to create a clear "identity" for each card. Suggested approach: pick one stat to be the "dominant" (roll 60–100), roll the rest 20–80, then shuffle slightly so it's not perfectly predictable.
- The highest stat determines: border variant, accent color, stat-number glow color, and the icon that gets visual emphasis.

**Border selection mapping (from project knowledge):**

| Highest Stat | Border Variant | Accent Color |
|---|---|---|
| Power | Dominance (red) | Deep red / ember |
| Speed | Conscientiousness (blue) | Bright cyan |
| Endurance | Influencing (yellow) | Amber / bronze |
| Stability | Steadiness (green) | Slate gray |
| Support | Default (untinted) | Bright pink / magenta |
| Patience | Conscientiousness (blue) | Deep violet |

**localStorage functions to build:**
- `saveCard(card: Card): void`
- `getCard(cardId: string): Card | null`
- `getAllCards(): Card[]`
- `deleteCard(cardId: string): void`
- `getCollectionStats(): { total: number, byArchetype: Record<string, number>, byRank: Record<string, number> }`

### 1B — Card Creation Flow (the main UX)

This is the heart of the app. The creation flow has three stages that should feel like a ritual, not a form.

**Stage 1 — Choose Your Path (archetype + rank selection)**

Show all 10 archetypes as selectable cards/tiles with their name, a one-line identity description, and a color accent matching their palette. Include a "Random" option (animated dice roll that lands on an archetype).

After selecting an archetype, choose a rank. Display all 3 ranks as a visual progression:
- **Foundation** — "The beginning. Raw potential, unrefined." (minimal/plain visual treatment)
- **Forged** — "Shaped by trial. Gaining power." (partial armor/gear, moderate effects)
- **Ascendant** — "Mastery achieved. Legendary presence." (full regalia, maximum intensity)

Each rank option should preview the visual difference: border glow intensity, card background richness, and the portrait placeholder all scale with rank. Include a "Random" option for rank as well. Rank affects the Claude API text generation (lore should reflect the character's stage) AND the card renderer's visual treatment (border thickness/glow, background complexity, stat number glow intensity).

The 10 archetypes and their visual identities:

1. **Barbarian** — earthy browns, iron gray, deep red war-paint
2. **Monk** — muted earth tones, saffron accent, stone gray
3. **Beastmaster** — forest green, brown, tawny fur tones
4. **Druid** — deep green, brown, warm gold accents
5. **Necromancer** — black, bone white, sickly green/purple
6. **Vampire** — deep red, black, silver accents
7. **Mech Pilot** — metallic gray, blue, warning-orange
8. **Android** — white/chrome, cyan accents
9. **Seraph** — gold, white, blue-white glow
10. **Human** — natural, realistic tones

**Stage 2 — Roll the Bones (stat generation)**

Animated dice roll sequence. Show all 6 stats rolling simultaneously with their icons, then landing one by one. The dominant stat lands last and lands bigger. Stats use these icons (map to emoji or simple SVG for now):

| Stat | Icon concept | Color |
|---|---|---|
| Power | Lightning bolt | Deep red |
| Speed | Wind/swoosh | Bright cyan |
| Endurance | Water drop | Amber |
| Stability | Castle turret | Slate gray |
| Support | Cheers/toast | Bright pink |
| Patience | Heart | Deep violet |

After rolling, highlight the dominant stat and show which border color it triggers. Give users a "Reroll" button (unlimited rerolls — this is about fun, not scarcity, at least for Phase 1).

**Stage 3 — Whisper Words (user flavor input)**

This is where the user makes the card *theirs*. Present 3 keyword input slots labeled something like "Whisper three words to shape your champion's destiny." Examples shown as placeholder text: "scarred," "ancient," "exiled," "laughing," "cursed," "towering."

These words get passed to the Claude API call that generates the card name, title, and lore. They don't change stats or archetype — they flavor the creative text. This is the lightweight alternative to a full questionnaire: minimal friction, maximum personality.

A "Skip" option should exist for users who just want to generate quickly.

**Stage 4 — Card Forge (generation + reveal)**

Call the Claude API to generate:
- `cardName` — a fantasy name (1–3 words)
- `nameAndTitle` — the name plus a title/epithet (e.g. "Kael, the Unbroken" or "Sera Vex — Duskblade of the Ninth Circuit")
- `lore` — 2–3 sentences of flavor text

**Claude API prompt structure for card text generation:**

```
You are a fantasy card game creative director. Generate a unique character card.

Archetype: {archetype}
Rank: {rank}
Rank meaning: {Foundation: "The beginning — raw, unproven, rough around the edges" | Forged: "Transformed through trial — gaining real power and presence" | Ascendant: "Mastery — legendary, fully realized, elite"}
Dominant stat: {highestStat} ({value})
Whisper words: {whisperWords.join(", ") || "none provided"}

Archetype identity: {one-line identity from the archetype list}

Generate ONLY a JSON object with these fields:
- cardName: a fantasy name (1-3 words, no title)
- nameAndTitle: the full name with an epithet or title
- lore: 2-3 sentences of evocative flavor text for the card

The rank should heavily influence the tone: Foundation characters are
newcomers or raw talents, Forged characters have been tested and changed,
Ascendant characters command awe and legend. The title/epithet should
reflect the rank's weight (e.g. Foundation: "the Unproven" vs Ascendant:
"Worldbreaker"). The whisper words should subtly influence the character's
personality, backstory, or appearance. Don't force them in literally —
let them guide the mood.

Respond with ONLY valid JSON, no markdown, no explanation.
```

After generation, reveal the completed card with an animation (fade-in, glow effect, or card-flip).

### 1C — Card Renderer (the visual output)

This is what makes or breaks the experience. The card needs to look like a real collectible, not a styled div.

**Card layout (based on the Figma template structure):**

```
┌──────────────────────────┐
│  ╔══════════════════╗    │  ← Border (colored by highest stat)
│  ║                  ║    │
│  ║   PORTRAIT ART   ║    │  ← Character portrait area
│  ║                  ║    │
│  ║                  ║    │
│  ╠══════════════════╣    │
│  ║  Name & Title    ║    │
│  ╠══════════════════╣    │
│  ║ ⚡72  💨58  💧64 ║    │  ← 2×3 stat grid
│  ║ 🏰61  🥂55  ❤49 ║    │     (icon + 3-letter abbrev + value)
│  ╠══════════════════╣    │
│  ║ Lore text here   ║    │
│  ║                  ║ 72 │  ← Glowing stat number (bottom-right)
│  ╚══════════════════╝    │
└──────────────────────────┘
```

**Design direction:**
- Dark, rich card background — not white/light
- Border should use a gradient or layered glow matching the stat accent color
- Stat grid: each stat has a small colored circle with its icon, the 3-letter abbreviation (POW, SPD, END, STB, SUP, PAT), and the numeric value
- The dominant stat's row should glow or be visually emphasized
- The bottom-right stat number should have a glowing gradient effect in the accent color
- Card aspect ratio: approximately 2.5:3.5 (standard trading card proportions)

**Rank-based visual scaling (all 3 ranks must look distinct):**

| Visual property | Foundation | Forged | Ascendant |
|---|---|---|---|
| Border | Thin, subtle glow | Medium, visible glow + inner gradient | Thick, intense glow + animated shimmer |
| Card background | Simple dark texture | Richer texture, faint archetype-themed pattern | Deep layered background, particle/energy effects |
| Portrait placeholder | Basic silhouette on flat gradient | Silhouette with secondary color accents | Detailed silhouette with glow/energy aura |
| Stat number glow | Faint | Medium intensity | Full bloom with outer glow |
| Rank badge | Small plain text "Foundation" | Styled text "Forged" with accent | Ornate "Ascendant" with glow effect |
| Overall feel | Clean, understated | Confident, battle-tested | Commanding, legendary |

This visual scaling is critical — a user should be able to tell a card's rank at a glance from across the room. The difference between Foundation and Ascendant should be dramatic.

**Portrait art for Phase 1:**
Since real AI image generation (Leonardo/Gemini) requires external API integration and careful prompt engineering, Phase 1 uses a placeholder system:
- Generate a thematic gradient/pattern background unique to each archetype's color palette
- Overlay a silhouette or icon representing the archetype
- This is explicitly temporary — the Figma pipeline for real art is documented in the project knowledge and is a Phase 1 enhancement once the engine works

**Render the card as a React component** that can be displayed at different sizes (full detail view, collection thumbnail, battle size for Phase 4).

### 1D — Collection View

Where users see all their saved cards.

- Grid layout showing card thumbnails
- Filter by archetype (dropdown or toggles) and by rank (Foundation / Forged / Ascendant)
- Sort by: newest, oldest, highest total stats, by dominant stat, by rank
- Click a card to see full detail view
- Delete button on each card (with confirmation)
- Show collection summary: total cards, breakdown by archetype
- Empty state: compelling call-to-action to create first card

### 1E — App Shell & Navigation

- **Home/Landing:** brief intro + big "Forge a Card" CTA
- **Card Forge:** the creation flow (1B)
- **Collection:** the card grid (1D)
- **Card Detail:** full card view with lore, all stats, delete option
- Dark theme throughout (this is a fantasy card game, not a productivity app)
- Mobile-responsive — card creation should work well on phones

### Phase 1 Definition of Done

All of these must be true before moving to Phase 2:
- [ ] User can select or randomize an archetype and rank (Foundation / Forged / Ascendant)
- [ ] All 3 ranks produce visually distinct cards (border, glow, background, rank badge)
- [ ] Stats generate with weighted randomization and animated dice roll
- [ ] Whisper words input works and influences generated text
- [ ] Claude API generates unique card name, title, and lore per card
- [ ] Card renders with correct border color, stat grid, accent glow based on highest stat
- [ ] Cards save to localStorage and persist across browser sessions
- [ ] Collection view shows all cards with filtering and sorting
- [ ] Cards can be deleted from the collection
- [ ] Works on both desktop and mobile
- [ ] Creating 10+ cards in a row produces visibly different results each time

---

## Phase 2: Supabase Backend & Authentication

**Goal:** migrate from localStorage to Supabase so cards persist server-side, add user accounts, and prepare for multiplayer features in Phases 3–4.

### 2A — Supabase Setup

- Create Supabase project
- Design the database schema:

```sql
-- Users (handled by Supabase Auth, but extended with a profile)
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  created_at timestamptz default now()
);

-- Cards
create table cards (
  card_id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  archetype text not null,
  rank text not null default 'Foundation',
  card_name text not null,
  name_and_title text not null,
  portrait_asset text,
  stats jsonb not null,
  highest_stat text not null,
  border_variant text not null,
  lore text,
  whisper_words text[],
  created_at timestamptz default now()
);

-- Row Level Security: users can only see/edit their own cards
alter table cards enable row level security;
create policy "Users manage own cards"
  on cards for all
  using (auth.uid() = user_id);
```

### 2B — Authentication

- Supabase Auth with email/password (simplest to start)
- Optional: add Google OAuth as a second provider
- Login / signup screens
- Protected routes — collection and card forge require auth
- Guest mode consideration: let users try card creation without an account, prompt to sign up to save

### 2C — Migration Layer

- Build a Supabase service layer that mirrors the localStorage API from Phase 1 (`saveCard`, `getCard`, `getAllCards`, `deleteCard`)
- Swap the storage provider — the rest of the app shouldn't need to change
- One-time migration utility: import any cards from localStorage into the user's Supabase account on first login
- Handle offline gracefully (queue saves, sync when connection returns)

### 2D — Public Collection / Sharing

- Optional but valuable: let users share a link to view a specific card or their collection (read-only, no auth required for viewing)
- This sets up the social foundation for Phase 4 (trading)

### Phase 2 Definition of Done

- [ ] Users can sign up and log in
- [ ] All card CRUD operations hit Supabase, not localStorage
- [ ] Row-level security prevents users from seeing others' cards
- [ ] Existing localStorage cards migrate to the user's account on first login
- [ ] App works identically to Phase 1 from the user's perspective, but data is persistent and server-side

---

## Phase 3: Minigame Leveling System

**Goal:** give users a way to level up their cards through skill-based minigames. Cards have three ranks (Foundation → Forged → Ascendant) and minigames are how you earn the upgrade.

### 3A — Leveling Framework

Since cards are created at any rank (Foundation, Forged, or Ascendant), leveling works within each rank rather than promoting between them. A card's rank is set at creation and defines its visual tier; minigames level up a card's *stats* within that tier.

- **XP system:** each minigame session earns XP for the card used
- **Stat leveling:** accumulated XP unlocks stat boosts. Every N XP, the card's lowest stat gets +1 (or the user picks which stat to boost). This makes leveled cards meaningfully stronger for Phase 4 battling without changing their rank or visual identity.
- **Level cap per rank:** Foundation cards cap at +10 total stat points, Forged at +20, Ascendant at +30. Higher-rank cards have more room to grow, making rank choice at creation a strategic decision.
- **Card selection:** user picks which card to "train" before starting a minigame
- **Level indicator:** add a level badge or XP bar to the card renderer (subtle — don't compete with the rank visual)
- **Database:** add `xp`, `level`, and `stat_boosts` fields to the cards table

### 3B — Minigame 1: Stat Crush (match-3 using stat icons)

A candy-crush-style match-3 game using the 6 stat icons as the game pieces.

**Core mechanic:**
- 8×8 grid filled with the 6 stat icons (Lightning, Wind, Drop, Castle, Cheers, Heart)
- Match 3+ of the same icon to clear them
- Matching an icon that corresponds to the selected card's highest stat scores bonus points
- Time-limited rounds (60–90 seconds)
- Score converts to XP for the selected card

**Scoring:**
- Match 3: 10 points
- Match 4: 25 points
- Match 5: 50 points
- Matching your card's dominant stat icon: 1.5× multiplier
- Cascade bonus: each subsequent cascade adds +5 base points

**Visual design:**
- The stat icons should use the same colors defined in the stat system
- The game board border/theme should match the selected card's aesthetic
- Show the selected card alongside the game board so you're "training" it

**Implementation:**
- Build as a React component with canvas or DOM-based grid
- Touch/swipe support for mobile
- Sound effects (optional but impactful: match sounds, cascade sounds, rank-up fanfare)

### 3C — Future Minigames (design only, build later)

Document these for future implementation but don't build them in Phase 3:
- **Stat Sprint:** endless runner where obstacles correspond to stats (duck under Power barriers, jump Speed gaps) — the card's high stats make those obstacles easier
- **Memory Forge:** memory/matching game where you flip cards to find stat icon pairs — trains Patience and Support
- **Rune Trace:** trace a pattern on screen accurately and quickly — trains Speed and Stability

### Phase 3 Definition of Done

- [ ] XP and stat leveling system works (XP → stat boosts within rank caps)
- [ ] User can select a card to "train" in a minigame
- [ ] Stat Crush minigame is playable and fun
- [ ] Scores convert to XP and accumulate on the selected card
- [ ] Stat boosts apply correctly and the card's updated stats display in the collection
- [ ] Level indicator visible on leveled cards
- [ ] Leveled cards are meaningfully stronger than fresh cards of the same rank

---

## Phase 4: Battling & Trading

**Goal:** multiplayer card interactions. Start with the simplest possible battle format and expand from there.

### 4A — Battle System v1: War

The card game War, adapted for this system. Simplest possible PvP to prove that two players can connect and compete.

**Rules:**
- Each player selects 1 card from their collection
- Both cards are revealed simultaneously
- Compare a single stat (randomly chosen each round, or rotate through all 6)
- Higher stat wins the round
- Best of 5 rounds wins the match
- Twist: each card's dominant stat gets a +10 bonus when that stat is the comparison stat (rewards having a strong identity, not just high total stats)

**Implementation options (choose based on Supabase capabilities at this point):**
- **Realtime:** Supabase Realtime channels for live PvP
- **Async:** player 1 submits their card, player 2 responds later, results computed server-side
- Start with async — it's much simpler and still proves the concept

### 4B — Battle System v2: Draft War (enhancement)

Once basic War works, add a draft layer:
- Each player picks 3 cards from their collection
- Alternate choosing which card to play each round (like poker — do you lead with your best or hold it?)
- Rock-paper-scissors element: if you guess your opponent will play a Speed-dominant card, maybe you play a Power-dominant one (Power beats Speed? Define a stat advantage wheel)

**Stat advantage wheel (suggestion):**
- Power > Speed > Support > Stability > Endurance > Patience > Power
- Advantage = +15 bonus to the compared stat
- This creates strategic depth without complex rules

### 4C — Trading

- Player-to-player card trades
- Trade offer system: Player A offers Card X, requests Card Y (or any card matching criteria)
- Both players must accept
- Trade history log
- Consider: should traded cards keep their XP/rank? (Suggestion: yes — it makes high-rank cards valuable trade targets)

### 4D — Leaderboard & Social

- Win/loss record per player
- Card showcase: display your best card publicly
- Battle history
- Collection completion tracking (how many archetypes, how many Ascendant cards)

### Phase 4 Definition of Done

- [ ] Two players can battle using the War format
- [ ] Battle results are recorded and affect win/loss records
- [ ] Card trading works between two players
- [ ] Basic leaderboard exists

---

## File Structure (Phase 1 starting point)

```
card-engine/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── card.ts              # Card, Archetype, Stat types
│   ├── data/
│   │   ├── archetypes.ts        # 10 archetype definitions + palettes
│   │   └── stats.ts             # stat names, colors, icons, border mappings
│   ├── services/
│   │   ├── storage.ts           # localStorage CRUD (swapped for Supabase in Phase 2)
│   │   ├── cardGenerator.ts     # stat randomization + Claude API for text
│   │   └── portraitGenerator.ts # placeholder art generation (upgraded later)
│   ├── components/
│   │   ├── CardRenderer.tsx     # the main card visual component
│   │   ├── StatGrid.tsx         # 2×3 stat display with icons
│   │   ├── CardBorder.tsx       # border with stat-based coloring
│   │   ├── DiceRoll.tsx         # animated stat rolling
│   │   └── ArchetypeSelector.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── CardForge.tsx        # the multi-stage creation flow
│   │   ├── Collection.tsx       # card grid with filters
│   │   └── CardDetail.tsx       # full card view
│   ├── hooks/
│   │   ├── useCardCollection.ts
│   │   └── useCardGenerator.ts
│   └── styles/
│       └── globals.css
```

---

## Build Order for Claude Code (Phase 1)

Work through these in sequence. Each step should produce something testable.

1. **Types & data** — `card.ts`, `archetypes.ts`, `stats.ts`. Get the type system and reference data locked in first.
2. **Storage service** — `storage.ts` with all CRUD functions. Write quick console tests to verify.
3. **Stat generator** — the weighted randomization logic in `cardGenerator.ts`. No API call yet, just stats.
4. **Card renderer** — `CardRenderer.tsx` with hardcoded test data. This is the most important visual component. Get the border colors, stat grid, accent glow, and layout right before anything else.
5. **App shell** — routing, navigation, dark theme, responsive layout.
6. **Archetype selector** — the Stage 1 UI with all 10 options + random.
7. **Dice roll animation** — Stage 2 stat reveal.
8. **Whisper words input** — Stage 3.
9. **Claude API integration** — card text generation (name, title, lore).
10. **Card reveal animation** — Stage 4, the payoff moment.
11. **Collection view** — grid, filters, sorting, delete.
12. **Card detail view** — full-size card + lore.
13. **Polish pass** — transitions, loading states, error handling, mobile testing.

---

*This plan references the Card Engine Project Knowledge and Archetype Prompt Library. Both should be provided to Claude Code alongside this document as context for implementation.*
