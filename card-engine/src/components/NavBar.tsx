import { NavLink } from 'react-router-dom';

const links = [
  { to: '/forge', label: 'Card Forge' },
  { to: '/collection', label: 'Collection' },
] as const;

export function NavBar() {
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
            className="font-fantasy text-lg font-bold tracking-wider mr-auto"
            style={{ color: '#4a3211' }}
          >
            Card Engine
          </NavLink>
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
    </nav>
  );
}
