export type NavItem = {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

export const primaryNav: NavItem[] = [
  { to: '/forge', label: 'Forge', icon: '⚒' },
  { to: '/collection', label: 'Collection', icon: '🂠' },
  { to: '/codex', label: 'Codex', icon: '📖' },
  { to: '/minigames', label: 'Mini Games', icon: '⚔' },
];

export const adminNav: NavItem = { to: '/admin', label: 'Admin', icon: '🛡', adminOnly: true };

/**
 * The castle courtyard prototype.
 *
 * Deliberately NOT in `primaryNav`. Every stall behind it still opens a
 * placeholder panel, so a player reaching it from the main nav would find four
 * dead ends. Move it into `primaryNav` when the stalls open real features.
 *
 * WHO SEES IT — `showCastleNav` below, and both halves are load-bearing:
 *
 *   dev        always. A local session is anonymous, so a role-only gate hid the
 *              link on the dev server — which was the one place it was asked for.
 *   deployed   admins and lore directors only. Preview deploys are PRODUCTION
 *              builds, so an `import.meta.env.DEV` gate alone would hide it in
 *              preview, which is where testing actually happens.
 */
export const castleNav: NavItem = {
  to: '/castle',
  label: 'Castle',
  icon: '🏰',
  adminOnly: true,
};

export const showCastleNav = (isAdmin: boolean, isLoreDirector: boolean): boolean =>
  import.meta.env.DEV || isAdmin || isLoreDirector;
