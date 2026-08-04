import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Pixel menu button. Art: `public/assets/ui/kit/button.png` (PixelLab R3).
 *
 * TWO BUGS LIVED HERE, BOTH FIXED — do not reintroduce either.
 *
 * 1. `border-image` WITHOUT `fill` paints only the ring and discards the middle
 *    of the source. That is right for the Panel, whose centre is genuinely
 *    hollow, and completely wrong here: this button's art IS its face. Without
 *    `fill` the generated wood grain and gold rim were thrown away and replaced
 *    by a flat CSS rectangle. Raheem: "the buttons are absolutely terrible."
 * 2. The source shipped as 112x34 of art inside a 128x128 canvas — 77% empty.
 *    A slice measured from the canvas edge therefore sampled mostly
 *    transparency. The asset is now trimmed to its content box
 *    (`scripts/sprite-lab/lib/trim_ui_piece.py`); run that on every new piece.
 *
 * Slices are ASYMMETRIC because the art is: 31px horizontal captures the rounded
 * gold end caps, 10px vertical captures the bevel. A single number would either
 * clip the caps or eat the whole 34px height.
 *
 * There is no `background` — the art is opaque and covers the element. Adding
 * one puts a visible slab behind the button, which is what the "giant dark
 * boxes" were.
 */

const BUTTON_SRC = '/assets/ui/kit/button.png';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Scales the whole control. 1 renders the art near its native 112x34. */
  scale?: number;
}

export function PixelButton({ children, scale = 2, disabled, style, ...rest }: Props) {
  // MEASURED FROM THE ART, not guessed. The crystal cap sits at x 4-16 on the
  // LEFT ONLY; the right edge is a plain 6px rim; the bevel is 10px top and
  // bottom. An earlier symmetric 31px slice put a phantom cap on the right and
  // shoved every label onto the real one — which is what "the ends of the boxes
  // aren't fitting on the end" was describing.
  const top = Math.round(10 * scale);
  const left = Math.round(16 * scale);
  const right = Math.round(6 * scale);
  return (
    <button
      disabled={disabled}
      className="pixel-button"
      style={{
        position: 'relative',
        borderStyle: 'solid',
        borderWidth: `${top}px ${right}px ${top}px ${left}px`,
        borderImageSource: `url(${BUTTON_SRC})`,
        // `fill` is load-bearing — see the note above. Order is top/right/bottom/left.
        borderImageSlice: '10 6 10 16 fill',
        borderImageRepeat: 'repeat',
        imageRendering: 'pixelated',
        background: 'transparent',
        color: '#fdf0d5',
        textShadow: '0 2px 0 rgba(0,0,0,0.7)',
        fontSize: Math.round(8 * scale),
        letterSpacing: '0.04em',
        lineHeight: 1.1,
        // The content box already sits BETWEEN the caps, because that is what a
        // border box is. No negative margin — that is what drove the label onto
        // the crystal. Padding here just gives the text room inside the face.
        padding: `${Math.round(2 * scale)}px ${Math.round(8 * scale)}px`,
        cursor: disabled ? 'default' : 'pointer',
        filter: disabled ? 'saturate(0.2) brightness(0.65)' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
