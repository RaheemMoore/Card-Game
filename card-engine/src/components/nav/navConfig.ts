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

// Lore directors are Workshop-only. This points straight at /admin/workshop
// (the only admin surface they're allowed) so they have a visible way in.
export const workshopNav: NavItem = { to: '/admin/workshop', label: 'Workshop', icon: '📜' };
