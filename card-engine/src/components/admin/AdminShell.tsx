import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { fetchMyRole, type SessionRole } from '../../services/persistence/supabaseClient';

// Phase 1 admin shell. Every /admin/* page renders inside this layout.
// Two responsibilities:
//   1. Central admin guard (once, not re-checked per page).
//   2. Admin sub-nav — compact rail on desktop, horizontally scrolling
//      tabs on mobile. Preserves the game's outer NavBar for exiting
//      admin, but puts an opaque content surface behind admin work so
//      dense operational text stays legible over the fantasy background.

type GuardState = 'checking' | 'admin' | 'lore_director' | 'denied';

interface NavItem {
  label: string;
  to: string;
  end?: boolean;
  // Lore directors only reach the Workshop; every other tab is admin-only.
  directorOk?: boolean;
}

const NAV: readonly NavItem[] = [
  { label: 'Overview',    to: '/admin',              end: true },
  { label: 'Users',       to: '/admin/users' },
  { label: 'Cards',       to: '/admin/cards' },
  { label: 'Abilities',   to: '/admin/abilities' },
  { label: 'Prompt Lab',  to: '/admin/prompt-lab' },
  { label: 'Workshop',    to: '/admin/workshop', directorOk: true },
  { label: 'Costs',       to: '/admin/costs' },
  { label: 'Diagnostics', to: '/admin/diagnostics' },
];

export function AdminShell() {
  const [guard, setGuard] = useState<GuardState>('checking');
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('dev_admin') === '1') {
      setGuard('admin');
      return;
    }
    void fetchMyRole().then((role: SessionRole) => {
      setGuard(role === 'admin' ? 'admin' : role === 'lore_director' ? 'lore_director' : 'denied');
    });
  }, []);

  const isAdmin = guard === 'admin';
  const nav = isAdmin ? NAV : NAV.filter((n) => n.directorOk);

  if (guard === 'checking') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#222131', color: '#abadbf' }}>
        Checking access…
      </div>
    );
  }
  if (guard === 'denied') return <Navigate to="/" replace />;
  // Lore directors are Workshop-only; any other admin path bounces there.
  if (!isAdmin && location.pathname !== '/admin/workshop') {
    return <Navigate to="/admin/workshop" replace />;
  }

  return (
    // Full-viewport admin canvas. M1 gives it an opaque background so no
    // player/fantasy chrome shows; M3 replaces this body with the Figma
    // sidebar + workspace-header shell.
    <div className="min-h-dvh" style={{ background: '#222131' }}>
      {/* Opaque work surface. */}
      <div className="bg-void/85 border-b border-bone/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
          <h1 className="font-fantasy text-xl sm:text-2xl font-bold text-bone">Admin</h1>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <ul className="flex gap-1 sm:gap-2 whitespace-nowrap pb-2">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'inline-block px-3 py-1.5 rounded text-xs sm:text-sm font-fantasy',
                      isActive
                        ? 'bg-gold/20 text-gold border border-gold/40'
                        : 'text-bone/70 hover:text-bone border border-transparent hover:border-bone/20',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="bg-void/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
