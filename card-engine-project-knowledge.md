# Project Knowledge: Card Engine

> **Origin:** this project was extracted from the "AI Workout Generator" fitness app's Character Forge visual identity system. The card design, Figma work, archetype system, stat framework, evolution ranks, prompt library, and border-color mapping all carry over. What changed: stats are now random (not fitness-derived), the database will be Supabase (not Notion), and the card system is the product itself (not a visual layer on top of a fitness app).

---

## What We're Building

A card-based game engine that generates collectible fantasy character cards. Users create cards through a questionnaire/prompt process, receive unique AI-generated characters with randomized stats, and collect them. Future phases include leveling cards via minigames and PvP battling — but the immediate goal is **proving the Card Engine works by generating real, good-looking cards**.

---

## Current State — What Already Exists

### Figma Card Design (fully built, ready to use)
- **File:** `https://www.figma.com/design/J8RTVE4x69tAiVU0DGv5zq/Fantasy-Trading-Card-Template--Community-`
- **fileKey:** `J8RTVE4x69tAiVU0DGv5zq`
- **Account:** Figma Professional plan (Full seat), team `1658384986940394577`
- **6 stat-variant frames** under "Card Types - Stats" on the Components page, each with:
  - A portrait image-fill node (upload via `Figma:upload_assets` → curl POST)
  - A 2×3 stat grid (icon-in-tinted-circle + 3-letter abbreviation + value)
  - A glowing gradient stat-number in the bottom-right corner
  - A real border art variant from the template's pre-built set (not a programmatic tint)

### Frame Node IDs (confirmed working)
| Stat | Frame node | Fill node | Border source |
|---|---|---|---|
| Power | 2007:36 | 2007:37 | Dominance (red) |
| Speed | 2007:50 | 2007:51 | Conscientiousness (blue) |
| Endurance | 2007:64 | 2007:65 | Influencing (yellow) |
| Stability | 2007:78 | 2007:79 | Steadiness (green) |
| Support | 2007:92 | 2007:93 | Default (untinted) |
| Patience | 2007:106 | 2007:107 | Conscientiousness (blue) |

### Border Art Variants (5 real assets from the template)
| Name | Node ID | Color |
|---|---|---|
| Dominance | 1:184 | Red |
| Influencing | 1:170 | Yellow/gold |
| Steadiness | 1:156 | Green |
| Conscientiousness | 1:142 | Blue/purple |
| MultiColor | 13:346 | Rainbow/gem (reserved for special use) |

### Icon Components (for stat-grid circles)
| Icon | Node ID | Mapped to stat |
|---|---|---|
| Lightning | 1:80 | Power |
| Wind | 1:88 | Speed |
| DropSimple | 1:86 | Endurance |
| CastleTurret | 1:120 | Stability |
| Cheers | 1:112 | Support |
| Heart | 1:76 | Patience |

---

## The 6 Stats

These carry over from the original system. **Stats are now randomized** when a card is generated, not derived from fitness data. The stat names, icons, colors, and border mappings stay exactly the same.

| Stat | Accent color | Icon | Border variant |
|---|---|---|---|
| Power | Deep red / ember | Lightning | Dominance (red) |
| Speed | Bright cyan | Wind | Conscientiousness (blue) |
| Endurance | Amber / bronze | DropSimple | Influencing (yellow) |
| Stability | Slate gray | CastleTurret | Steadiness (green) |
| Support | Bright pink / magenta | Cheers | Default (none) |
| Patience | Deep violet | Heart | Conscientiousness (blue) |

**Border selection rule:** the card's border uses the variant mapped to whichever stat is highest. Speed and Patience share the same border (only 5 real variants exist for 6 stats — accepted tradeoff).

**Stat number display:** the bottom-right corner of the card shows the highest stat's value with a glowing gradient effect in that stat's accent color.

---

## Evolution Ranks

3 tiers per character. In the fitness app these were earned through training; in the card game they'll be earned through leveling (minigames/battles — future work, not now).

| Rank | Meaning | Visual modifier |
|---|---|---|
| Foundation | Beginning | Minimal/plain version of the archetype's look, subtle effects, simple materials |
| Forged | Transformation | Partial equipment/armor, moderate effect intensity, more detail |
| Ascendant | Mastery | Full regalia, maximum effect intensity, legendary/elite presence |

---

## Card Blueprint (data structure per card)

```json
{
  "cardId": "uuid",
  "archetype": "Barbarian",
  "rank": "Foundation",
  "cardName": "Claude-generated",
  "nameAndTitle": "Claude-generated",
  "portraitAsset": "url-or-path-to-image",
  "stats": {
    "Power": 72,
    "Speed": 58,
    "Endurance": 64,
    "Stability": 61,
    "Support": 55,
    "Patience": 49
  },
  "border": {
    "baseVariant": "Dominance",
    "baseSource": "Highest stat = Power",
    "powerup": {
      "active": false,
      "badges": [],
      "effect": "Layers on top of base border as glow/frame effect"
    }
  },
  "lore": "Claude-generated flavor text",
  "createdAt": "timestamp"
}
```

**Card name, title, and lore are Claude-generated** per card — not hand-written. Claude acts as creative director, taking the archetype + rank + stats and producing unique flavor text.

**Stats are randomized** at generation time. Range TBD (likely 1–100 per stat).

---

## Badge / Powerup System

Three badge chains (names carried over, meanings will be redefined for the card game context — original fitness meanings no longer apply):
- **Iron Discipline**
- **Titan's Ledger**
- **Plate Club**

**Powerup behavior:** if multiple badges are unlocked at once, all active powerup effects **stack** (render together) — no priority logic, no user selection needed. Risk to watch: visual clutter if 3 stack simultaneously.

**Powerup visual effect:** trigger (badge unlock) and layering rule (adds to top-stat border color, doesn't replace it) are decided. Actual visual design of the glow/effect is not yet done.

---

## 10 Confirmed Archetypes

All approved for now — to be refined only if actual generated art comes out boring/off.

1. **Barbarian** — raw physical power, primal warrior, earthy browns/iron gray/red war-paint
2. **Monk** — discipline, inner control, martial mastery, muted earth tones/saffron accent
3. **Beastmaster** — wild, feral, animal companionship, forest green/brown/tawny
4. **Druid** — nature magic, balance, restoration, deep green/brown/warm gold
5. **Necromancer** — dark magic, death, forbidden knowledge, black/bone white/sickly green
6. **Vampire** — dark charisma, aristocratic predator, deep red/black/silver
7. **Mech Pilot** — armored tech, heavy combat suit, metallic gray/blue/warning-orange
8. **Android** — synthetic being, post-human precision, white/chrome/cyan
9. **Seraph** — radiant holy power, righteous protector, gold/white/blue-white glow
10. **Human** — grounded, no-fantasy baseline, realistic athletic tones

Full prompt DNA blocks for all 10 are in `archetype-prompt-library.md` (separate file, also extracted).

---

## Prompt Generation System

**Architecture** (from the roadmap, still valid):

`Base Visual Style + Archetype DNA + Rank Evolution + Negative Prompt Rules → final prompt`

- **Base Visual Style:** full-body front-facing portrait, "character portrait" not "trading card illustration," atmospheric background
- **Negative Prompt Rules:** no baked-in borders, no text/logos, explicit bias corrections (skin tone, non-sexualized armor)
- **Consistency technique:** Leonardo AI Character Reference at Mid strength (~60–70%), fixed seed for same-character multi-rank generation

Full prompt library in `archetype-prompt-library.md`.

---

## Tech Stack

### Current (what exists now)
- **Design:** Figma (Professional plan, Full seat) with Figma MCP connector
- **Image generation:** Leonardo AI (primary, Character Reference feature), Gemini (secondary)
- **Image processing:** Python + Pillow (cropping, margin detection)
- **AI for card text:** Claude API (Haiku-class for cost efficiency)

### Planned (not built yet)
- **Database:** Supabase (replacing Notion — migration is a later step)
- **Frontend:** TBD — likely a web app, but no decisions made yet
- **Hosting/backend:** TBD

---

## Key Learnings (carry over from fitness app work)

1. **"Character portrait," not "trading card illustration"** — prompting the latter causes generators to bake ornate borders into the artwork, which fights the separate Figma frame
2. **Figma template border assets > programmatic tinting** — a color-blend overlay on the border bleeds through onto the portrait; always use the template's pre-built real border art variants
3. **Figma free Starter plan has a strict MCP rate limit (6 calls/month)** — upgraded to Professional to unblock work; conserve calls by batching uploads and validating crops locally before spending a call
4. **Leonardo AI Character Reference at Mid (~60–70%) + fixed seed** is more reliable for character consistency across ranks than re-prompting
5. **Gemini outputs square 1024×1024** regardless of prompt wording — fix via aspect ratio setting in the tool interface, not the prompt
6. **Pre-crop images locally** (Pillow, top-anchored trim from bottom) before uploading to Figma to prevent FILL mode from cutting off the character's head

---

## Immediate Next Steps

1. **Generate test art** — pick 2–3 archetypes, run the prompt library through Leonardo/Gemini, see if the formula produces good results
2. **Prove the full pipeline** — generated art → Figma frame upload → assembled card with randomized stats + Claude-generated name/lore
3. **Build card generation flow** — a questionnaire or process where a user picks/randomizes archetype + gets a complete card
4. **Card collection** — store and delete cards (Supabase, but can prototype with simpler storage first)

---

## Explicitly Out of Scope (Future Phases)

- Minigames for leveling cards
- PvP battling system
- Supabase database migration (use simpler storage for prototyping)
- Badge/powerup visual effect design
- Redefining badge chain meanings for the card game context (currently still fitness-app names)

---

*This project was extracted from the AI Workout Generator's Character Forge system. The fitness app continues separately — the card system is now its own product.*
