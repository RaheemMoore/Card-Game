import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CurrencyBalance } from './economy/CurrencyBalance';
import { WalletDevPanel } from './economy/WalletDevPanel';
import { SyncStatusPill } from './SyncStatusPill';
import { AuthModal } from './AuthModal';
import { BottomNav } from './nav/BottomNav';
import { SideNav } from './nav/SideNav';
import {
  getCurrentUser,
  isCurrentUserAnonymous,
  signOut,
  subscribeToAuth,
  fetchIsAdmin,
} from '../services/persistence/supabaseClient';

type AuthModalMode = 'sign_up' | 'change_password' | null;

export function NavBar() {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [authModal, setAuthModal] = useState<AuthModalMode>(null);
  const [, setAuthTick] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const isDev = import.meta.env.DEV;

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

  return (
    <>
      <nav className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
          <div
            className="grid items-center h-12 px-3 sm:px-5 rounded-full shadow-lg gap-3"
            style={{
              background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
            }}
          >
            {/* LEFT: brand + status */}
            <div className="flex items-center gap-2 min-w-0">
              <NavLink
                to="/"
                className="font-fantasy text-base sm:text-lg font-bold tracking-wider whitespace-nowrap"
                style={{ color: '#4a3211' }}
              >
                Card Engine
              </NavLink>
              <span
                className="hidden sm:inline-block px-2 py-0.5 rounded text-[9px] font-fantasy font-bold tracking-wider uppercase"
                style={{
                  background: 'rgba(220,38,38,0.15)',
                  color: '#8a1c1c',
                  border: '1px solid rgba(220,38,38,0.3)',
                }}
                title="Balances persist to Supabase under an anonymous session; still not authorized for real-money exchange."
              >
                Demo
              </span>
              <span className="hidden md:inline-block">
                <SyncStatusPill />
              </span>
            </div>

            {/* CENTER: reserved — nav lives in SideNav (lg+) or BottomNav (<lg). Keeps grid balanced so brand + wallet stay anchored. */}
            <div />

            {/* RIGHT: currencies + auth */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0">
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

              <div
                className="hidden sm:block w-px h-6 mx-1"
                style={{ background: 'rgba(74,50,17,0.2)' }}
              />

              {authLabel && isAnon && (
                <button
                  onClick={() => setAuthModal('sign_up')}
                  className="px-3 py-1 rounded-full text-[11px] font-fantasy font-bold whitespace-nowrap"
                  style={{
                    background: 'rgba(74,50,17,0.12)',
                    color: '#4a3211',
                    border: '1px solid rgba(74,50,17,0.3)',
                  }}
                  title="Guest — sign up to save progress"
                >
                  <span className="hidden sm:inline">Sign in / Save</span>
                  <span className="sm:hidden">Sign in</span>
                </button>
              )}
              {authLabel && !isAnon && (
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    onClick={() => setAuthModal('change_password')}
                    className="hidden sm:inline-block px-2 py-1 rounded-full text-[11px] font-fantasy hover:underline truncate max-w-[10rem]"
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
                    aria-label="Sign out"
                  >
                    ↩
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <SideNav isAdmin={isAdmin} />
      <BottomNav isAdmin={isAdmin} />

      {showDevPanel && <WalletDevPanel onClose={() => setShowDevPanel(false)} />}
      {authModal && (
        <AuthModal defaultMode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </>
  );
}
