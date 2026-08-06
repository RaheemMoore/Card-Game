import { useState } from 'react';
import { PauseMenu } from '../castle/PauseMenu';
import { PixelButton } from '../../components/ui/PixelButton';

/**
 * `/dev/pause-menu` — the castle's pause menu over the courtyard, no account.
 *
 * The real one only appears inside the castle, which is behind sign-in, so
 * without this route the most-used surface in the game is also the one nobody
 * can review. It renders the REAL component — same nav items, same Directory
 * hand-off, same sign-out button — so what you see here is what Escape gives
 * you in play.
 *
 * `isPrivileged` is toggleable because the admin entry only exists for some
 * accounts, and a menu that gains a row for certain players needs checking at
 * both lengths.
 */
export function PauseMenuPreview() {
  const [open, setOpen] = useState(true);
  const [privileged, setPrivileged] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: 'url(/assets/castle/courtyard.png) center/cover fixed',
      }}
    >
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 10, zIndex: 90 }}>
        <PixelButton scale={1.1} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Open'} menu
        </PixelButton>
        <PixelButton scale={1.1} onClick={() => setPrivileged((p) => !p)}>
          {privileged ? 'As admin' : 'As player'}
        </PixelButton>
      </div>

      <PauseMenu
        open={open}
        onClose={() => setOpen(false)}
        onOpenDirectory={() => setOpen(false)}
        isPrivileged={privileged}
      />
    </div>
  );
}
