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
    title: 'Castle Front (side-view)',
    route: '/castle',
    summary: 'The 2D side-scrolling castle exterior: walking, the four-card hand, firing, the Ember Jelly and its leap, knockdown and card scatter.',
    startHere: {
      goal: 'Understand the current castle screen',
      path: 'card-engine/src/pages/castle/front-v4/CastleFront.tsx',
      purpose: 'The production shell around the game — pause menu, indicators, hand readout. The world itself is CastleFrontV4Scene.',
      status: 'CURRENT',
    },
    destinations: [
      { goal: 'Change how the scene is wired together', path: 'card-engine/src/pages/castle/front-v4/CastleFrontV4Scene.ts', purpose: 'The Phaser seam: samples input, calls the pure rules in order, draws the answer. Deliberately holds no rules of its own.' },
      { goal: 'Change how he walks', path: 'card-engine/src/pages/castle/front-v4/playerController.ts', purpose: 'Pure 1D movement, facing, knockback and bounds. He cannot jump, and the type has no field that would let him.' },
      { goal: 'Change the enemy leap or its fairness', path: 'card-engine/src/pages/castle/front-v4/jellyLeap.ts', purpose: 'The committed arc, the overlap-based hit, and the simulated proof that a man with no dodge can walk out of it.' },
      { goal: 'Change where the world is placed', path: 'card-engine/src/pages/castle/front-v4/worldLoader.ts', purpose: 'Loads the scene Raheem authors in Phaser Editor. Placement is visual, not code.' },
      { goal: 'Change the placeholder art or drop in real plates', path: 'card-engine/src/pages/castle/front-v4/backdrop.ts', purpose: 'The code-drawn dusk and castle silhouette, plus the slots real background PNGs land in.' },
      { goal: 'Change castle combat rules', path: 'card-engine/src/pages/castle/combat', purpose: 'Perspective-free combat: the hand, action state, blast, construct, hit feel.' },
      { goal: 'Change shops or interactive stalls', path: 'card-engine/src/pages/castle/stalls', purpose: 'Stall panels and their UI. Not yet wired to the side-view world.' },
      { goal: 'Change the pause menu', path: 'card-engine/src/pages/castle/PauseMenu.tsx', purpose: 'The castle pause-menu interface.' },
    ],
    caution: 'The game became a 2D side-scroller on 2026-08-16 and the top-down courtyards were DELETED, not parked — there is no /castle/classic and no CourtyardV2/V3. Before adding or placing any art, read SIDE_VIEW_ANGLE_SPEC.md: if you can see the top of a thing, it is the wrong angle, and a config claiming view:"side" is not evidence.',
    keywords: ['castle', 'side-view', 'side-scroller', 'perspective', 'movement', 'phaser', 'stalls', 'shops', 'pause', 'combat', 'jelly', 'leap'],
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
