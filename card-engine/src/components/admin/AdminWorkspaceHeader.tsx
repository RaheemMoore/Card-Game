import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';

export interface AdminWorkspaceHeaderProps {
  /** Shown on tablet/portrait to open the sidebar overlay drawer. */
  onOpenMenu: () => void;
  title: string;
  right?: ReactNode;
}

// Slim workspace header pinned to the top of the admin content area. Holds
// the mobile menu trigger, the current section title, and optional status/
// account utilities on the right.
export function AdminWorkspaceHeader({ onOpenMenu, title, right }: AdminWorkspaceHeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 h-14 px-4"
      style={{ background: 'rgba(34,33,49,0.85)', borderBottom: '1px solid var(--admin-border)', backdropFilter: 'blur(8px)' }}
    >
      <button
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[10px] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
        style={{ color: 'var(--admin-text)' }}
      >
        <Menu size={20} />
      </button>
      <h1 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h1>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </header>
  );
}
