import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { fetchIsAdmin, getCurrentUser, signOut } from '../../services/persistence/supabaseClient';
import { AdminSidebar } from './AdminSidebar';
import { AdminWorkspaceHeader } from './AdminWorkspaceHeader';

// Full-viewport admin operations shell. Owns: the central admin guard, the
// grouped Figma sidebar (expanded 218px / compact 80px, persisted), the
// tablet overlay drawer, and the slim workspace header. Player chrome never
// renders here — /admin/* mounts this outside PlayerShell (see App.tsx).

type GuardState = 'checking' | 'allowed' | 'denied';

const COMPACT_KEY = 'admin-sidebar-compact';

const TITLE_BY_PATH: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/users': 'Users',
  '/admin/cards': 'Cards',
  '/admin/abilities': 'Abilities',
  '/admin/prompt-lab': 'Prompt Lab',
  '/admin/workshop': 'Archetype Workshop',
  '/admin/costs': 'Costs',
  '/admin/diagnostics': 'Diagnostics',
};

export function AdminShell() {
  const [guard, setGuard] = useState<GuardState>('checking');
  const [compact, setCompact] = useState<boolean>(() => {
    try { return localStorage.getItem(COMPACT_KEY) === '1'; } catch { return false; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('dev_admin') === '1') {
      setGuard('allowed');
      return;
    }
    void fetchIsAdmin().then((ok) => setGuard(ok ? 'allowed' : 'denied'));
  }, []);

  // Close the tablet drawer on route change.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const toggleCompact = () => {
    setCompact((c) => {
      const next = !c;
      try { localStorage.setItem(COMPACT_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  if (guard === 'checking') {
    return (
      <div className="admin-root min-h-dvh grid place-items-center" style={{ background: 'var(--admin-canvas)' }}>
        <span style={{ color: 'var(--admin-text-muted)' }}>Checking access…</span>
      </div>
    );
  }
  if (guard === 'denied') return <Navigate to="/" replace />;

  const title = TITLE_BY_PATH[location.pathname] ?? 'Admin';
  const userEmail = getCurrentUser()?.email ?? null;
  const handleSignOut = () => { void signOut().then(() => { window.location.href = '/'; }); };

  return (
    <div className="admin-root min-h-dvh flex" style={{ background: 'var(--admin-canvas)' }}>
      {/* Desktop / laptop: fixed sidebar */}
      <div className="hidden lg:block shrink-0">
        <div className="sticky top-0 h-dvh">
          <AdminSidebar compact={compact} onToggleCompact={toggleCompact} userEmail={userEmail} onSignOut={handleSignOut} />
        </div>
      </div>

      {/* Tablet / portrait: overlay drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setDrawerOpen(false)} />
          <div className="relative h-full">
            <AdminSidebar
              compact={false}
              onToggleCompact={toggleCompact}
              userEmail={userEmail}
              onSignOut={handleSignOut}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminWorkspaceHeader onOpenMenu={() => setDrawerOpen(true)} title={title} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
