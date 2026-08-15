# Map of the game

The repository contains several products and many production records. The game
you play and study is under `card-engine`.

```text
card-engine/
├── src/                 The game logic and screens
│   ├── App.tsx          The route map: which URL opens which screen
│   ├── pages/           Full screens and game experiences
│   │   ├── battle/      Card battle screen and presentation
│   │   ├── castle/      Courtyard, overworld combat, and wildlife
│   │   ├── admin/       Content-making studio screens
│   │   └── minigames/   Smaller game modes
│   ├── components/      Reusable visual pieces
│   ├── services/        Rules, calculations, storage, and outside services
│   ├── data/            Game definitions and content catalogs
│   └── types/           The shapes of cards, abilities, bosses, and combat
├── public/assets/       Art and other files shipped to the browser
├── api/                 Server functions used by the content studio
├── scripts/             Asset and production tools
└── supabase/            Database migrations
```

## Two kinds of combat

This project currently has two related combat surfaces:

1. `src/pages/battle/` is the dedicated card-battle presentation.
2. `src/pages/castle/combat/` and `src/pages/castle/v2/` power combat inside
   the castle courtyard.

Claude's active **Combat Satisfaction and Gameplay Feel** session is changing
the second kind. We will produce a dedicated combat learning tour after that
work is committed and merged, so your guide describes the finished system
rather than an outdated middle state.

## A useful mental model

```text
Player input
    ↓
Game rules decide what happens
    ↓
Presentation turns the result into movement, art, sound, and feedback
    ↓
State records the new situation
```

When we study combat, we will repeatedly ask: “Is this file deciding the rule,
showing the result, or storing the state?” That question makes large systems
much easier to understand.
