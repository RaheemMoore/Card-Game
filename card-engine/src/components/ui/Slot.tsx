import type { CSSProperties, ReactNode } from 'react';

/**
 * A card slot. Art: `public/assets/ui/kit/slot.png` (PixelLab R3).
 *
 * This is where the game's two art languages meet on purpose: a PIXEL frame
 * holding a PAINTED card. Per the direction rule — painted is what you look at,
 * pixel is what you touch — the slot is chrome you click and the card inside is
 * an artifact you look at. Do not "fix" that contrast by pixelating the card.
 *
 * Empty slots render the same frame with nothing in it, so a collection that is
 * half-full reads as a case with room left rather than a short list.
 */

const SLOT_SRC = '/assets/ui/kit/slot.png';
const SLICE_PX = 20;

interface Props {
  children?: ReactNode;
  onClick?: () => void;
  label?: string;
  selected?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Slot({
  children,
  onClick,
  label,
  selected = false,
  size,
  className = '',
  style,
}: Props) {
  const interactive = Boolean(onClick);
  const Tag = (interactive ? 'button' : 'div') as 'button';
  return (
    <Tag
      className={`pixel-slot ${className}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={interactive && selected ? true : undefined}
      style={{
        position: 'relative',
        width: size,
        height: size,
        padding: 8,
        borderStyle: 'solid',
        borderWidth: 10,
        borderImageSource: `url(${SLOT_SRC})`,
        borderImageSlice: SLICE_PX,
        borderImageRepeat: 'repeat',
        imageRendering: 'pixelated',
        background: 'rgba(28,20,15,0.9)',
        cursor: interactive ? 'pointer' : undefined,
        // Selection is a glow rather than a swapped asset — see PixelButton on
        // why a matching "selected" art file cannot be generated.
        boxShadow: selected ? '0 0 0 2px #63d7e8, 0 0 14px rgba(99,215,232,0.55)' : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
