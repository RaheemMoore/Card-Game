import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Pixel menu button. Art: `public/assets/ui/kit/button.png` (PixelLab R3).
 *
 * Named PixelButton, not Button, because `components/economy` and the admin
 * surfaces already ship their own buttons — a bare `Button` here would read as
 * "the app's button" and get adopted by React surfaces that are still
 * painterly. This one is for the in-world pixel menus only.
 *
 * ONE ASSET, THREE STATES. Hover and press are CSS filters over the same art
 * rather than three generated files: the object endpoint that produced this
 * cannot be seeded, so a matching hover variant is literally unobtainable —
 * a re-roll returns different art. Deriving states in CSS is the only way they
 * stay a family.
 *
 * Disabled desaturates rather than fading alone, so the reason reads as
 * "inert", not "the whole panel dimmed".
 */

const BUTTON_SRC = '/assets/ui/kit/button.png';
const SLICE_PX = 28;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Rendered ring thickness. Larger reads heavier/more committal. */
  borderWidth?: number;
}

export function PixelButton({ children, borderWidth = 14, disabled, style, ...rest }: Props) {
  return (
    <button
      disabled={disabled}
      className="pixel-button"
      style={{
        position: 'relative',
        borderStyle: 'solid',
        borderWidth,
        borderImageSource: `url(${BUTTON_SRC})`,
        borderImageSlice: SLICE_PX,
        borderImageRepeat: 'repeat',
        imageRendering: 'pixelated',
        background: 'rgba(96,64,38,0.9)',
        color: '#f3e2c0',
        padding: '6px 18px',
        cursor: disabled ? 'default' : 'pointer',
        filter: disabled ? 'saturate(0.25) brightness(0.7)' : undefined,
        opacity: disabled ? 0.75 : 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
