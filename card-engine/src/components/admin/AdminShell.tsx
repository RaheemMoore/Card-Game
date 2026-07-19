import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { fetchIsAdmin } from '../../services/persistence/supabaseClient';

// Phase 1 admin shell. Every /admin/* page renders inside this layout.
// Two responsibilities:
//   1. Central admin guard (once, not re-checked per page).
//   2. Admin sub-nav — compact rail on desktop, horizontally scrolling
//      tabs on mobile. Preserves the game's outer NavBar for exiting
//      admin, but puts an opaque content surface behind admin work so
//      dense operational text stays legible over the fantasy background.

type GuardState = 'checking' | 'allowed' | 'denied';

interface NavItem {
  label: string;
  to: string;
  end?: boolean;
}

const NAV: readonly NavItem[] = [
  { label: 'Overview',    to: '/admin',              end: true },
  { label: 'Users',       to: '/admin/users' },
  { label: 'Cards',       to: '/admin/cards' },
  { label: 'Abilities',   to: '/admin/abilities' },
  { label: 'Prompt Lab',  to: '/admin/prompt-lab' },
  { label: 'Costs',       to: '/admin/costs' },
  { label: 'Diagnostics', to: '/admin/diagnostics' },
];

export function AdminShell() {
  const [guard, setGuard] = useState<GuardState>('checking');

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('dev_admin') === '1') {
      setGuard('allowed');
      return;
    }
    void fetchIsAdmin().then((ok) => setGuard(ok ? 'allowed' : 'denied'));
  }, []);

  if (guard === 'checking') return <div className="p-8 text-center text-bone/70">Checking access…</div>;
  if (guard === 'denied') return <Navigate to="/" replace />;

  return (
    <div className="min-h-full">
      {/* Opaque work surface so operational text stays legible over the
          fantasy background. */}
      <div className="bg-void/85 border-b border-bone/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
          <h1 className="font-fantasy text-xl sm:text-2xl font-bold text-bone">Admin</h1>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <ul className="flex gap-1 sm:gap-2 whitespace-nowrap pb-2">
            {NAV.map((item) => (
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
