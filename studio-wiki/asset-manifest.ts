/**
 * What the Studio Wiki actually puts on screen.
 *
 * The Wiki serves `card-engine/public` as its publicDir so it can show the game's
 * real art without duplicating a single file. That is the right call for authoring
 * and it is why the Wiki is never showing a stale copy of an emblem. It is the
 * wrong call for deployment: the game's public folder is 77 MB, the Wiki displays
 * about 20 MB of it, and Vercel was being handed `backgrounds/` (28 MB) and
 * `borders/` (13 MB) — card frames and forge plates that no Wiki page renders.
 *
 * So: dev serves everything, the build ships this list. Nothing is deleted, nothing
 * is recompressed, and every image the Wiki displays is the same bytes it always
 * was. If a page starts showing new art, add its directory here — `npm test` fails
 * when a path referenced in `src/` is not covered, so this cannot silently rot.
 *
 * Entries are path prefixes relative to `card-engine/public`. A directory entry
 * carries the whole subtree.
 */
export const WIKI_ASSET_PATHS: readonly string[] = [
  // The eleven selection emblems — Characters & Archetypes, and the per-card
  // archetype chip on the Cards dossiers.
  'assets/archetype-emblems',

  // The 29 element crystals behind the Element Codex grid.
  'assets/elements',

  // Elements: the combat performance player. `lash` carries the per-element
  // charge/stream/impact frames, `growth` carries Nature's bloom.
  'assets/combat/effects/lash',
  'assets/combat/effects/growth/nature',

  // Bosses & Arenas: the Debt-Bearer's seven animation states and the one
  // approved arena plate the page previews.
  'assets/combat/bosses/debt-bearer',
  'assets/combat/arenas/barbarian-moot-ground/base.png',

  // Battle Tower: the per-archetype hero art used by the party illustration.
  'assets/combat/heroes/archetypes',

  // Game World: the live production courtyard hero image.
  'assets/castle/courtyard.png',

  // Cards: the development-record portraits and the two three-rank sequences.
  'assets/dev-portraits',
  'assets/portraits/druid_foundation_1.jpg',
  'assets/portraits/druid_forged_1.jpg',
  'assets/portraits/druid_ascendant_1.jpg',
  'portraits/sample',
];
