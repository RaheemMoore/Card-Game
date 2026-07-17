import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CurrencyBalance } from './economy/CurrencyBalance';
import { WalletDevPanel } from './economy/WalletDevPanel';
import { SyncStatusPill } from './SyncStatusPill';

const links = [
  { to: '/forge', label: 'Card Forge' },
  { to: '/collection', label: 'Collection' },
] as const;

export function NavBar() {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const isDev = import.meta.env.DEV;

  return (
    <nav className="sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-2">
        <div
          className="flex items-center h-12 px-5 rounded-full shadow-lg"
          style={{
            background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <NavLink
            to="/"
            className="font-fantasy text-lg font-bold tracking-wider"
            style={{ color: '#4a3211' }}
          >
            Card Engine
          </NavLink>

          <span
            className="ml-3 px-2 py-0.5 rounded text-[9px] font-fantasy font-bold tracking-wider uppercase"
            style={{ background: 'rgba(220,38,38,0.15)', color: '#8a1c1c', border: '1px solid rgba(220,38,38,0.3)' }}
            title="Balances persist to Supabase under an anonymous session; still not authorized for real-money exchange."
          >
            Demo Economy
          </span>

          <span className="ml-2">
            <SyncStatusPill />
          </span>

          <div className="ml-auto flex items-center gap-2">
            <CurrencyBalance currency="premium" />
            <CurrencyBalance currency="gameplay" />

            {isDev && (
              <button
                onClick={() => setShowDevPanel(true)}
                className="px-2 py-1 rounded-full text-[10px] font-fantasy font-bold border border-dashed"
                style={{ color: '#8a1c1c', borderColor: 'rgba(138,28,28,0.4)' }}
                aria-label="Open wallet dev panel"
                title="Dev: wallet controls"
              >
                DEV
              </button>
            )}

            <div className="w-px h-6 mx-1" style={{ background: 'rgba(74,50,17,0.2)' }} />

            <div className="flex items-center gap-1">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-4 py-1.5 rounded-full text-sm font-medium font-fantasy transition-all ${
                      isActive
                        ? 'text-[#d6f2ec] shadow-md'
                        : 'text-[#a9895d] hover:text-[#4a3211]'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: 'linear-gradient(to bottom, #9bb6b3, #5f888a)' }
                      : {}
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showDevPanel && <WalletDevPanel onClose={() => setShowDevPanel(false)} />}
    </nav>
  );
}
