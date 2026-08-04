import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenGameShellProps {
  mainColumn: ReactNode;
  sideColumn?: ReactNode;
  overlay?: ReactNode;
  ariaLabel: string;
  desktopColumns?: string;
  desktopRows?: string;
  mobileColumns?: string;
  mobileRows?: string;
  backgroundColor?: string;
}

type ShellStyle = CSSProperties & {
  '--fullscreen-desktop-columns': string;
  '--fullscreen-desktop-rows': string;
  '--fullscreen-mobile-columns': string;
  '--fullscreen-mobile-rows': string;
};

/**
 * Shared full-screen game boundary: portal ownership, dynamic viewport height,
 * body scroll lock, and the min-size rules that keep nested game layouts from
 * overflowing their grid tracks. It owns layout only; React/Phaser runtimes
 * remain owned by their consumers.
 */
export function FullscreenGameShell({
  mainColumn,
  sideColumn,
  overlay,
  ariaLabel,
  desktopColumns = sideColumn ? 'minmax(0, 1fr) minmax(220px, 280px)' : 'minmax(0, 1fr)',
  desktopRows = 'minmax(0, 1fr)',
  mobileColumns = 'minmax(0, 1fr)',
  mobileRows = sideColumn ? 'minmax(60dvh, 1fr) minmax(0, 320px)' : 'minmax(0, 1fr)',
  backgroundColor = '#050308',
}: FullscreenGameShellProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const style: ShellStyle = {
    background: backgroundColor,
    '--fullscreen-desktop-columns': desktopColumns,
    '--fullscreen-desktop-rows': desktopRows,
    '--fullscreen-mobile-columns': mobileColumns,
    '--fullscreen-mobile-rows': mobileRows,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden text-bone"
      style={style}
      aria-label={ariaLabel}
      role="dialog"
      aria-modal="true"
    >
      <div className="fullscreen-game-grid grid h-full min-h-0">
        <div className="relative min-h-0 h-full overflow-hidden">{mainColumn}</div>
        {sideColumn ? <div className="relative min-h-0 overflow-hidden">{sideColumn}</div> : null}
      </div>
      {overlay}
    </div>,
    document.body,
  );
}
