import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CurrencyBalance } from './economy/CurrencyBalance';
import { WalletDevPanel } from './economy/WalletDevPanel';
import { SyncStatusPill } from './SyncStatusPill';
import { AuthModal } from './AuthModal';
import {
  getCurrentUser,
  isCurrentUserAnonymous,
  signOut,
  subscribeToAuth,
  fetchIsAdmin,
} from '../services/persistence/supabaseClient';

const links = [
  { to: '/forge', label: 'Card Forge' },
  { to: '/collection', label: 'Collection' },
  { to: '/codex', label: 'Codex' },
  { to: '/battle', label: 'Battle' },
] as const;

type AuthModalMode = 'sign_up' | 'change_password' | null;

export function NavBar() {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [authModal, setAuthModal] = useState<AuthModalMode>(null);
  const [, setAuthTick] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDev = import.meta.env.DEV;

  // Every auth change (sign-in, sign-up, sign-out, password change)
  // triggers a re-render AND a fresh isAdmin fetch so the Admin link
  // shows/hides correctly for the new identity.
  useEffect(() => {
    void fetchIsAdmin().then(setIsAdmin);
    return subscribeToAuth(() => {
      setAuthTick((n) => n + 1);
      void fetchIsAdmin().then(setIsAdmin);
    });
  }, []);

  const user = getCurrentUser();
  const isAnon = isCurrentUserAnonymous();
  const authLabel = !user ? null : isAnon ? 'Guest' : user.email ?? 'Signed in';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-1.5 rounded-full text-sm font-medium font-fantasy transition-all ${
      isActive ? 'text-[#d6f2ec] shadow-md' : 'text-[#a9895d] hover:text-[#4a3211]'
    }`;
  const navLinkStyle = ({ isActive }: { isActive: boolean }) =>
    isActive ? { background: 'linear-gradient(to bottom, #9bb6b3, #5f888a)' } : {};

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block w-full text-left px-3 py-2 rounded-lg text-sm font-medium font-fantasy transition-all ${
      isActive ? 'text-[#d6f2ec] shadow-md' : 'text-[#4a3211] hover:bg-[#4a3211]/10'
    }`;

  return (
    <nav className="sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2">
        <div
          className="flex items-center h-12 px-3 sm:px-5 rounded-full shadow-lg gap-2"
          style={{
            background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <NavLink
            to="/"
            className="font-fantasy text-base sm:text-lg font-bold tracking-wider whitespace-nowrap"
            style={{ color: '#4a3211' }}
          >
            Card Engine
          </NavLink>

          <span
            className="hidden sm:inline-block ml-1 px-2 py-0.5 rounded text-[9px] font-fantasy font-bold tracking-wider uppercase"
            style={{ background: 'rgba(220,38,38,0.15)', color: '#8a1c1c', border: '1px solid rgba(220,38,38,0.3)' }}
            title="Balances persist to Supabase under an anonymous session; still not authorized for real-money exchange."
          >
            Demo Economy
          </span>

          <span className="hidden sm:inline-block ml-1">
            <SyncStatusPill />
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <CurrencyBalance currency="premium" />
            <CurrencyBalance currency="gameplay" />

            {isDev && (
              <button
                onClick={() => setShowDevPanel(true)}
                className="hidden sm:inline-block px-2 py-1 rounded-full text-[10px] font-fantasy font-bold border border-dashed"
                style={{ color: '#8a1c1c', borderColor: 'rgba(138,28,28,0.4)' }}
                aria-label="Open wallet dev panel"
                title="Dev: wallet controls"
              >
                DEV
              </button>
            )}

            <div className="hidden sm:block w-px h-6 mx-1" style={{ background: 'rgba(74,50,17,0.2)' }} />

            <div className="hidden sm:flex items-center gap-1">
              {links.map(({ to, label }) => (
                <NavLink key={to} to={to} className={navLinkClass} style={navLinkStyle}>
                  {label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass} style={navLinkStyle}>
                  Admin
                </NavLink>
              )}
            </div>

            <div className="hidden sm:block w-px h-6 mx-1" style={{ background: 'rgba(74,50,17,0.2)' }} />

            {authLabel && isAnon && (
              <button
                onClick={() => setAuthModal('sign_up')}
                className="hidden sm:inline-block px-3 py-1 rounded-full text-[11px] font-fantasy font-bold"
                style={{
                  background: 'rgba(74,50,17,0.12)',
                  color: '#4a3211',
                  border: '1px solid rgba(74,50,17,0.3)',
                }}
                title="Guest account — sign up to save your progress across devices"
              >
                Sign in / Save
              </button>
            )}
            {authLabel && !isAnon && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => setAuthModal('change_password')}
                  className="px-2 py-1 rounded-full text-[11px] font-fantasy hover:underline"
                  style={{ color: '#4a3211' }}
                  title={`Signed in as ${user?.email ?? ''} — click to change password`}
                >
                  {authLabel.length > 20 ? authLabel.slice(0, 18) + '…' : authLabel}
                </button>
                <button
                  onClick={() => void signOut().then(() => window.location.reload())}
                  className="px-2 py-1 rounded-full text-[10px] font-fantasy"
                  style={{ color: '#8a1c1c' }}
                  title="Sign out"
                >
                  ↩
                </button>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="sm:hidden ml-1 flex flex-col items-center justify-center w-9 h-9 rounded-full"
              style={{ background: 'rgba(74,50,17,0.12)', border: '1px solid rgba(74,50,17,0.3)' }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <span className="block w-4 h-0.5 mb-1" style={{ background: '#4a3211' }} />
              <span className="block w-4 h-0.5 mb-1" style={{ background: '#4a3211' }} />
              <span className="block w-4 h-0.5" style={{ background: '#4a3211' }} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="sm:hidden mt-2 rounded-2xl shadow-lg p-3 space-y-2"
            style={{
              background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center gap-2 flex-wrap px-1">
              <span
                className="px-2 py-0.5 rounded text-[9px] font-fantasy font-bold tracking-wider uppercase"
                style={{ background: 'rgba(220,38,38,0.15)', color: '#8a1c1c', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                Demo Economy
              </span>
              <SyncStatusPill />
            </div>

            <div className="border-t" style={{ borderColor: 'rgba(74,50,17,0.15)' }} />

            <div className="space-y-1">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                  style={navLinkStyle}
                >
                  {label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                  style={navLinkStyle}
                >
                  Admin
                </NavLink>
              )}
            </div>

            <div className="border-t" style={{ borderColor: 'rgba(74,50,17,0.15)' }} />

            <div className="space-y-1">
              {authLabel && isAnon && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModal('sign_up');
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm font-fantasy font-bold"
                  style={{ color: '#4a3211' }}
                >
                  Sign in / Save
                </button>
              )}
              {authLabel && !isAnon && (
                <>
                  <div className="px-3 pt-1 text-[10px] font-fantasy uppercase tracking-wider" style={{ color: 'rgba(74,50,17,0.6)' }}>
                    Signed in as
                  </div>
                  <div className="px-3 pb-1 text-xs font-fantasy truncate" style={{ color: '#4a3211' }}>
                    {user?.email ?? authLabel}
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModal('change_password');
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm font-fantasy"
                    style={{ color: '#4a3211' }}
                  >
                    Change password
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void signOut().then(() => window.location.reload());
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm font-fantasy"
                    style={{ color: '#8a1c1c' }}
                  >
                    Sign out
                  </button>
                </>
              )}
              {isDev && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowDevPanel(true);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm font-fantasy border border-dashed"
                  style={{ color: '#8a1c1c', borderColor: 'rgba(138,28,28,0.4)' }}
                >
                  Dev: wallet controls
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showDevPanel && <WalletDevPanel onClose={() => setShowDevPanel(false)} />}
      {authModal && (
        <AuthModal
          defaultMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </nav>
  );
}
