export type AtlasStatus = 'CURRENT' | 'IN FLIGHT' | 'STUDIO' | 'DEV TOOL' | 'LEGACY' | 'UNDER REVIEW';

export interface AtlasDestination {
  goal: string;
  path: string;
  purpose: string;
  status?: AtlasStatus;
}

export interface AtlasFeature {
  id: string;
  title: string;
  route: string;
  summary: string;
  startHere: AtlasDestination;
  destinations: readonly AtlasDestination[];
  caution?: string;
  keywords: readonly string[];
}

/**
 * The living, beginner-facing map of the game.
 *
 * Keep this practical: each entry answers "where do I go to change that?" rather
 * than attempting to list every file. Paths are checked by codeAtlas.test.ts.
 */
export const codeAtlasFeatures: readonly AtlasFeature[] = [
  {
    id: 'castle',
    title: 'Castle & Courtyard',
    route: '/castle',
    summary: 'The explorable top-down castle: movement, rooms, stalls, wildlife, presentation, and castle combat.',
    startHere: {
      goal: 'Understand the current castle screen',
      path: 'card-engine/src/pages/castle/v2/CastleV2.tsx',
      purpose: 'The current castle page and the best first file for seeing how the castle experience is assembled.',
      status: 'CURRENT',
    },
    destinations: [
      { goal: 'Change runtime movement or scene behavior', path: 'card-engine/src/pages/castle/v2/courtyardRuntime.ts', purpose: 'Connects the React page to the playable courtyard runtime.' },
      { goal: 'Change castle combat', path: 'card-engine/src/pages/castle/combat', purpose: 'Castle-specific combat behavior and presentation.' },
      { goal: 'Change shops or interactive stalls', path: 'card-engine/src/pages/castle/stalls', purpose: 'Stall interactions and their UI.' },
      { goal: 'Change animals or ambient life', path: 'card-engine/src/pages/castle/wildlife', purpose: 'Wildlife behavior and visual helpers.' },
      { goal: 'Change the pause menu', path: 'card-engine/src/pages/castle/PauseMenu.tsx', purpose: 'The castle pause-menu interface.' },
      { goal: 'Study the older castle', path: 'card-engine/src/pages/castle/index.tsx', purpose: 'The classic castle route kept for comparison; do not treat it as the current implementation.', status: 'LEGACY' },
      { goal: 'Try the side-view perspective proof', path: 'card-engine/src/pages/castle/front-v4', purpose: 'The same combat slice seen from the side rather than top-down, at /dev/castle-front-v4. A proof under evaluation, not a replacement: the rules live in pure modules (playerController, jellyLeap, jellyController, sideViewScatter) and the scene is only a seam.' },
    ],
    caution: 'The live /castle route uses CastleV2. The older castle still exists at /castle/classic, so check the route before editing. A side-view experiment lives at /dev/castle-front-v4 and deliberately shares no runtime code with either.',
    keywords: ['castle', 'courtyard', 'movement', 'phaser', 'stalls', 'shops', 'wildlife', 'animals', 'pause', 'rooms', 'side-view', 'side-scroller', 'perspective'],
  },
  {
    id: 'battle',
    title: 'Battle & Combat Feel',
    route: '/battle',
    summary: 'The main battle screen: controls, combat presentation, effects, party HUD, boss HUD, results, and combat rules.',
    startHere: {
      goal: 'Understand how battle is assembled',
      path: 'card-engine/src/pages/battle/index.tsx',
      purpose: 'The battle page entry point. Start here, then follow the components it renders.',
      status: 'CURRENT',
    },
    destinations: [
      { goal: 'Change player controls', path: 'card-engine/src/pages/battle/BattleControls.tsx', purpose: 'Buttons and actions the player uses during battle.' },
      { goal: 'Change the main battle presentation', path: 'card-engine/src/pages/battle/CombatScene.tsx', purpose: 'Composes the visible combatants, arena, effects, and battle layout.' },
      { goal: 'Change attack animations or impact effects', path: 'card-engine/src/pages/battle/AttackVFX.tsx', purpose: 'Visual attack effects and their presentation timing.' },
      { goal: 'Change floating damage numbers', path: 'card-engine/src/pages/battle/FloatingDamage.tsx', purpose: 'Damage and healing numbers shown over combat.' },
      { goal: 'Change the boss interface', path: 'card-engine/src/pages/battle/BossHUDOverlay.tsx', purpose: 'Boss health, status, and battle information.' },
      { goal: 'Change the party interface', path: 'card-engine/src/pages/battle/PartyDock.tsx', purpose: 'The player party display and battle controls area.' },
      { goal: 'Change target or action selection', path: 'card-engine/src/pages/battle/Picker.tsx', purpose: 'The selection interface used during combat decisions.' },
      { goal: 'Change victory or defeat results', path: 'card-engine/src/pages/battle/ResultModal.tsx', purpose: 'The result screen shown when battle ends.' },
      { goal: 'Change damage and combat math', path: 'card-engine/src/services/combat/formulas.ts', purpose: 'Pure combat formulas. Changes here affect the rules, not just the appearance.' },
      { goal: 'Change battle state transitions', path: 'card-engine/src/services/combat/reducer.ts', purpose: 'Applies combat actions to battle state.' },
      { goal: 'Understand how the page uses the combat engine', path: 'card-engine/src/services/combat/useBattle.ts', purpose: 'The React hook joining combat rules to the battle page.' },
    ],
    caution: 'Presentation files change what combat feels like; service files change what combat means. Test both when a change crosses that boundary.',
    keywords: ['battle', 'combat', 'attack', 'damage', 'boss', 'party', 'controls', 'vfx', 'victory', 'defeat', 'feel', 'formula'],
  },
  {
    id: 'collection',
    title: 'Cards & Collection',
    route: '/collection',
    summary: 'Browsing cards, opening one card, and rendering the shared visual card component.',
    startHere: {
      goal: 'Understand the collection screen',
      path: 'card-engine/src/pages/CollectionRoute.tsx',
      purpose: 'The routed collection page and the best starting point for collection behavior.',
      status: 'CURRENT',
    },
    destinations: [
      { goal: 'Change the full card-detail screen', path: 'card-engine/src/pages/CardDetail.tsx', purpose: 'The page shown after opening a specific card.' },
      { goal: 'Change how a card itself looks', path: 'card-engine/src/components/CardRenderer.tsx', purpose: 'The reusable visual renderer shared by card-facing screens.' },
    ],
    caution: 'A shared CardRenderer change can affect several screens at once. Check collection, detail, and any preview that uses it.',
    keywords: ['card', 'cards', 'collection', 'gallery', 'detail', 'renderer', 'frame', 'portrait'],
  },
  {
    id: 'forge',
    title: 'Card Forge',
    route: '/forge',
    summary: 'The player keeps the forge ritual and choices, but receives a deterministic match from a human-curated character roster instead of generating a random character at runtime.',
    startHere: {
      goal: 'Understand the forge screen',
      path: 'card-engine/src/pages/CardForge.tsx',
      purpose: 'The player-facing forge flow and its stages.',
      status: 'IN FLIGHT',
    },
    destinations: [
      { goal: 'Change how a forge job is coordinated', path: 'card-engine/src/services/forge/forgeController.ts', purpose: 'Orchestrates the work behind the forge interface.' },
      { goal: 'Understand a curated character and its variants', path: 'card-engine/src/types/curatedCard.ts', purpose: 'The canonical data shape for human-authored characters, answer bindings, and element variants.' },
      { goal: 'Understand where the curated roster comes from', path: 'card-engine/src/services/persistence/CuratedRosterStore.ts', purpose: 'Loads and exposes the curated character roster used by the forge and studio tools.' },
    ],
    caution: 'The direction is decided and committed on claude/curated-matcher, but is not merged into development yet. That branch adds services/forge/curatedMatcher.ts and removes the old gender weights, archetype layers, image-question scaffold, and M5.5 image harness. Do not rebuild those retired systems. Add the matcher as a direct Atlas destination after the branch merges.',
    keywords: ['forge', 'create card', 'curated', 'matcher', 'roster', 'story pillars', 'deterministic', 'retired generation', 'wizard', 'portrait', 'job'],
  },
  {
    id: 'codex',
    title: 'Codex & Reference Screens',
    route: '/codex',
    summary: 'Player-facing reference pages for the game, including abilities, elements, and families.',
    startHere: {
      goal: 'Understand the Codex home',
      path: 'card-engine/src/pages/Codex.tsx',
      purpose: 'The main Codex page and navigation into its reference sections.',
      status: 'CURRENT',
    },
    destinations: [
      { goal: 'Change an ability reference page', path: 'card-engine/src/pages/CodexAbility.tsx', purpose: 'Displays the details for one ability.' },
      { goal: 'Change the elements reference', path: 'card-engine/src/pages/CodexElements.tsx', purpose: 'Displays the game element reference.' },
      { goal: 'Change an ability-family reference', path: 'card-engine/src/pages/CodexFamily.tsx', purpose: 'Displays one family of related abilities.' },
    ],
    keywords: ['codex', 'reference', 'ability', 'abilities', 'elements', 'family', 'encyclopedia'],
  },
  {
    id: 'minigames',
    title: 'Minigames',
    route: '/minigames',
    summary: 'The minigame hub and individual experiments such as Forge Strike.',
    startHere: {
      goal: 'Understand the minigame hub',
      path: 'card-engine/src/pages/minigames/MiniGamesHub.tsx',
      purpose: 'Lists and launches the available minigame experiences.',
      status: 'CURRENT',
    },
    destinations: [
      { goal: 'Work on Forge Strike', path: 'card-engine/src/pages/minigames/forge-strike', purpose: 'The files belonging to the Forge Strike minigame.' },
    ],
    keywords: ['minigames', 'minigame', 'forge strike', 'hub', 'game mode'],
  },
  {
    id: 'studio',
    title: 'Admin & Studio Tools',
    route: '/admin',
    summary: 'Internal screens used to review, manage, diagnose, and operate the game—not normal player gameplay.',
    startHere: {
      goal: 'Find an internal admin screen',
      path: 'card-engine/src/pages/admin',
      purpose: 'The home for admin routes, review tools, diagnostics, and studio workflows.',
      status: 'STUDIO',
    },
    destinations: [],
    caution: 'Admin pages support the team. Treat them separately from the player experience unless a feature deliberately connects both.',
    keywords: ['admin', 'studio', 'review', 'diagnostics', 'lore desk', 'workshop', 'users'],
  },
  {
    id: 'dev',
    title: 'Developer Labs',
    route: '/dev',
    summary: 'Isolated previews, experiments, and learning harnesses used to inspect one system without playing through the whole game.',
    startHere: {
      goal: 'Find a development-only preview or lab',
      path: 'card-engine/src/pages/dev',
      purpose: 'The collection of developer-only pages and visual test harnesses.',
      status: 'DEV TOOL',
    },
    destinations: [],
    caution: 'These screens help prove work, but they are not automatically part of the player-facing game.',
    keywords: ['dev', 'developer', 'lab', 'preview', 'harness', 'test', 'experiment', 'phaser school'],
  },
];

export const atlasPaths = codeAtlasFeatures.flatMap((feature) => [
  feature.startHere.path,
  ...feature.destinations.map((destination) => destination.path),
]);
