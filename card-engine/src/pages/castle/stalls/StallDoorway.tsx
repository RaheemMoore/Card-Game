import { useEffect, useState } from 'react';
import type { Stall } from './types';
import { Panel } from '../../../components/ui/Panel';
import { PixelButton } from '../../../components/ui/PixelButton';
import { Scrim } from '../../../components/ui/Scrim';

/**
 * The beat between walking up to a stall and being inside it.
 *
 * Design-locked with Raheem 2026-08-04: a stall does not host its feature, it
 * opens a doorway that hands off to one. The reason is concrete â€” the Forge is a
 * five-stage ritual and the Collection is a full case, and running either
 * *inside* the courtyard's own modal means two chrome systems fighting for the
 * same screen. The doorway is the seam where the courtyard stops and the
 * destination starts.
 *
 * It also does something a straight hand-off cannot: it lets you walk away. You
 * brush a stall while crossing the courtyard constantly, and a stall that
 * teleports you somewhere the instant you touch it makes walking feel dangerous.
 * "Not now" is the whole reason this is a question rather than a door.
 *
 * PHONE GETS A BOTTOM SHEET, not a centred dialog â€” a centred one covers the
 * character you are standing next to, which is the thing that tells you where
 * you are.
 */

/**
 * What each door promises. Deliberately separate from `stall.placeholder`, which
 * is the "not yet connected" apology â€” this is the invitation, and it should
 * survive the placeholder being deleted.
 */
const INVITATION: Record<string, string> = {
  collection: 'Your gathered characters, in their case.',
  forge: 'Where new characters are made.',
  battles: 'The tower. Climb it, and the rest of the castle opens.',
  minigames: 'Training grounds. Sharpen what you already have.',
};

interface Props {
  stall: Stall;
  onEnter: () => void;
  onClose: () => void;
  /** Shown instead of Enter when the destination is not built yet. */
  unbuilt?: boolean;
}

export function StallDoorway({ stall, onEnter, onClose, unbuilt = false }: Props) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 720);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <Scrim onClose={onClose} label={stall.label} bottomSheet={narrow} compact>
      <Panel variant="hud" style={{ padding: 16 }}>
        <h2
          className="font-fantasy"
          style={{ fontSize: 20, color: '#f3d99b', letterSpacing: '0.04em', margin: '0 0 6px' }}
        >
          {stall.label}
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#cbb9a0', lineHeight: 1.6 }}>
          {INVITATION[stall.id] ?? stall.placeholder}
        </p>

        {unbuilt && (
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#9b8f7e', fontStyle: 'italic' }}>
            This door isn't open yet.
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <PixelButton scale={1.2} onClick={onClose}>
            Not now
          </PixelButton>
          {!unbuilt && <PixelButton onClick={onEnter}>Enter</PixelButton>}
        </div>
      </Panel>
    </Scrim>
  );
}
