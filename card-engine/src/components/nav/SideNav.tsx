import { NavLink } from 'react-router-dom';
import { primaryNav, adminNav } from './navConfig';

export function SideNav({ isAdmin, isLoreDirector }: { isAdmin: boolean; isLoreDirector: boolean }) {
  // Admins and lore directors both reach the full admin dashboard.
  const items = isAdmin || isLoreDirector ? [...primaryNav, adminNav] : primaryNav;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-fantasy font-medium tracking-wide transition-all ${
      isActive ? 'text-[#d6f2ec] shadow-md' : 'text-[#a9895d] hover:text-[#4a3211] hover:bg-[#4a3211]/5'
    }`;
  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    isActive ? { background: 'linear-gradient(to bottom, #9bb6b3, #5f888a)' } : {};

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-16 bottom-0 w-56 z-40 flex-col pt-4 px-3"
      aria-label="Primary"
    >
      <div
        className="flex-1 flex flex-col gap-1 rounded-2xl p-2 shadow-lg"
        style={{
          background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {items.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={linkClass} style={linkStyle} end={to === '/forge'}>
            <span className="text-xl leading-none w-6 text-center">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
