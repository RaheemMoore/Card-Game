import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Sparkles, FlaskConical, Hammer,
  Receipt, Activity, PanelLeftClose, PanelLeftOpen, LogOut, ArrowLeft,
  LibraryBig, ExternalLink,
  type LucideIcon,
} from 'lucide-react';

// `directorOk` marks the surfaces a lore_director may reach. Everything
// else is admin-only; a director sees a Proposals-only sidebar.
// `href` marks an item that leaves the app — rendered as an anchor, not a
// NavLink, since react-router cannot route to another origin.
// A plain union of two full shapes, not an intersection with a union — the
// latter does not narrow on a truthiness check, so `item.to` stayed
// `string | undefined` after the external-link branch returned.
interface NavBase { label: string; icon: LucideIcon; directorOk?: boolean }
interface NavRoute extends NavBase { to: string; end?: boolean; href?: undefined }
interface NavExternal extends NavBase { href: string; to?: undefined; end?: undefined }
type NavItem = NavRoute | NavExternal;
interface NavGroup { label: string; items: NavItem[] }

// The Studio Wiki replaced the old Production Guide artifact link. The guide was a
// generated single-page export hosted on a personal Claude artifact URL — it could
// only be republished from a chat, it was private to one account, and it presented
// PRODUCTION.md as a wall of text. The Wiki reads the same PRODUCTION.md at build
// time and surrounds it with the art, animation, and review surfaces, so there is
// no reason to keep two doors to the same source.
const STUDIO_WIKI_URL = 'https://card-engine-studio-wiki.vercel.app';

const GROUPS: readonly NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Users', to: '/admin/users', icon: Users },
      { label: 'Ability Review', to: '/admin/abilities', icon: Sparkles },
    ],
  },
  {
    label: 'AI Studio',
    items: [
      { label: 'Prompt Lab', to: '/admin/prompt-lab', icon: FlaskConical },
      { label: 'Proposals', to: '/admin/proposals', icon: Hammer, directorOk: true },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Costs', to: '/admin/costs', icon: Receipt },
      { label: 'Diagnostics', to: '/admin/diagnostics', icon: Activity },
    ],
  },
  {
    label: 'Studio',
    items: [
      { label: 'Studio Wiki', href: STUDIO_WIKI_URL, icon: LibraryBig, directorOk: true },
    ],
  },
];

export interface AdminSidebarProps {
  compact: boolean;
  onToggleCompact: () => void;
  userEmail: string | null;
  onSignOut: () => void;
  /** Called after navigating on the mobile overlay so the drawer can close. */
  onNavigate?: () => void;
  /** Lore directors get a Workshop-only sidebar; admins see everything. */
  isAdmin?: boolean;
}

export function AdminSidebar({ compact, onToggleCompact, userEmail, onSignOut, onNavigate, isAdmin = true }: AdminSidebarProps) {
  const groups = isAdmin
    ? GROUPS
    : GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.directorOk) })).filter((g) => g.items.length > 0);
  return (
    <nav
      aria-label="Admin"
      className="flex flex-col h-full"
      style={{
        width: compact ? 'var(--admin-sidebar-compact)' : 'var(--admin-sidebar-expanded)',
        background: 'var(--admin-sidebar-glass)',
        borderRight: '1px solid var(--admin-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Brand + collapse toggle */}
      <div className={`flex items-center gap-2 px-3 h-14 shrink-0 ${compact ? 'justify-center' : 'justify-between'}`}>
        {!compact && (
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--admin-text)' }}>
            Card Engine <span style={{ color: 'var(--admin-text-muted)' }}>Admin</span>
          </span>
        )}
        <button
          onClick={onToggleCompact}
          aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          title={compact ? 'Expand' : 'Collapse'}
          className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-[10px] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            {!compact && (
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                // Leaves the app — a plain anchor, opened in a new tab so the
                // admin session is never navigated away from.
                //
                // `!== undefined`, not a truthiness check: `href` is `string`,
                // which includes `''`, so `if (item.href)` cannot exclude the
                // external variant from the else branch and `item.to` stays
                // possibly-undefined there.
                if (item.href !== undefined) {
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onNavigate}
                        title={compact ? `${item.label} (opens in a new tab)` : undefined}
                        aria-label={`${item.label} (opens in a new tab)`}
                        className={`group flex items-center gap-3 rounded-[10px] min-h-[44px] px-2.5 text-sm transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${compact ? 'justify-center' : ''}`}
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        <Icon size={18} className="shrink-0" />
                        {!compact && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            <ExternalLink size={13} className="shrink-0 opacity-60" aria-hidden="true" />
                          </>
                        )}
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      title={compact ? item.label : undefined}
                      aria-label={item.label}
                      className={`group flex items-center gap-3 rounded-[10px] min-h-[44px] px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${compact ? 'justify-center' : ''}`}
                      style={({ isActive }) => ({
                        background: isActive ? 'var(--admin-active-wash)' : 'transparent',
                        color: isActive ? '#c3bfff' : 'var(--admin-text-muted)',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={18} className="shrink-0" style={{ color: isActive ? 'var(--admin-accent)' : 'currentColor' }} />
                          {!compact && <span className="truncate">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Account + exit */}
      <div className="shrink-0 border-t px-2 py-2 space-y-1" style={{ borderColor: 'var(--admin-border)' }}>
        <NavLink
          to="/"
          onClick={onNavigate}
          title={compact ? 'Back to game' : undefined}
          className={`flex items-center gap-3 rounded-[10px] min-h-[44px] px-2.5 text-sm hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${compact ? 'justify-center' : ''}`}
          style={{ color: 'var(--admin-text-muted)' }}
        >
          <ArrowLeft size={18} className="shrink-0" />
          {!compact && <span>Back to game</span>}
        </NavLink>
        <div className={`flex items-center gap-2 px-1.5 py-1.5 ${compact ? 'justify-center' : ''}`}>
          <div
            className="shrink-0 grid place-items-center w-8 h-8 rounded-full text-xs font-semibold"
            style={{ background: 'var(--admin-active-wash)', color: '#c3bfff', borderRadius: 'var(--admin-radius-avatar)' }}
            title={userEmail ?? 'Admin'}
          >
            {(userEmail ?? 'A').slice(0, 1).toUpperCase()}
          </div>
          {!compact && (
            <>
              <span className="flex-1 min-w-0 text-xs truncate" style={{ color: 'var(--admin-text)' }}>
                {userEmail ?? 'Admin'}
              </span>
              <button
                onClick={onSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
