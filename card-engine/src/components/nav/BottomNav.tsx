import { NavLink } from 'react-router-dom';
import { primaryNav, adminNav } from './navConfig';

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const items = isAdmin ? [...primaryNav, adminNav] : primaryNav;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-fantasy tracking-wide transition-colors ${
      isActive ? 'text-[#d6f2ec]' : 'text-[#a9895d] hover:text-[#4a3211]'
    }`;
  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? { background: 'linear-gradient(to bottom, #9bb6b3, #5f888a)', borderRadius: 12 }
      : {};

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div
        className="mx-2 mb-2 flex items-stretch gap-1 rounded-2xl px-1 py-1 shadow-lg"
        style={{
          background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {items.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={linkClass} style={linkStyle} end={to === '/forge'}>
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
