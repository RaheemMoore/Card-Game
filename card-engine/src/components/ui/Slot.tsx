import type { CSSProperties, ReactNode } from 'react';

/**
 * A slot in the case — where one character sits.
 *
 * A FILLED SLOT HAS NO FRAME. This is the rule, from Raheem 2026-08-04: "I
 * don't want the gaudy frame around the card. It's gonna pull away from the
 * design of the actual cards. The cards are the key of the game, so they should
 * be the star, not those gem frames."
 *
 * So the generated gem-beaded art is used ONLY for empty slots, where it marks
 * a place a character can go. The moment a card occupies the slot, the chrome
 * gets out of its way entirely and the painted card is the whole cell. Do not
 * "unify" these two states by framing both — the asymmetry is the point.
 *
 * Selection is a thin outline rather than a heavier frame, for the same reason.
 *
 * The card inside stays PAINTED while this frame is PIXEL — the direction rule
 * (painted is what you look at, pixel is what you touch) made literal. Do not
 * pixelate the card to "match"; the contrast is the idea.
 */

const SLOT_SRC = '/assets/ui/kit/slot.png';

interface Props {
  children?: ReactNode;
  onClick?: () => void;
  label?: string;
  selected?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Slot({
  children,
  onClick,
  label,
  selected = false,
  className = '',
  style,
}: Props) {
  const interactive = Boolean(onClick);
  const Tag = (interactive ? 'button' : 'div') as 'button';
  const filled = Boolean(children);

  // Empty: the generated gem frame marks the space. Filled: no frame at all.
  const frame = filled
    ? { background: 'transparent', border: 'none', padding: 0 }
    : {
        borderStyle: 'solid' as const,
        borderWidth: 13,
        borderImageSource: `url(${SLOT_SRC})`,
        borderImageSlice: '13 fill',
        // STRETCH, not repeat. The slot art is near-square (45x47) and a card
        // cell is tall (326:470), so repeating the middle band tiled the gold
        // beading down the sides and the empty slot read as wooden slats.
        borderImageRepeat: 'stretch' as const,
        background: 'transparent',
        padding: 0,
      };

  return (
    <Tag
      className={`pixel-slot ${className}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={interactive && selected ? true : undefined}
      style={{
        position: 'relative',
        imageRendering: 'pixelated',
        cursor: interactive ? 'pointer' : 'default',
        // A thin ring, never a heavier frame — see the note above.
        outline: selected ? '2px solid #63d7e8' : undefined,
        outlineOffset: filled ? 2 : -2,
        ...frame,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
