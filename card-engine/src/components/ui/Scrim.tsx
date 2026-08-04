import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The one dismiss + focus-trap behaviour for every in-world menu.
 *
 * Before this, the courtyard had its own scrim and combat handled modals
 * separately, so Escape and click-outside behaved differently depending on
 * which surface you were standing in. One implementation means one behaviour.
 *
 * MOBILE IS A BOTTOM SHEET, NOT A CENTRED DIALOG. iPhone portrait is a
 * launch-blocking platform, and a centred dialog there covers the character
 * you are standing next to — you lose your place in the world. Anchoring to the
 * bottom keeps the courtyard visible above it.
 *
 * Focus is trapped and restored: opening a stall moves focus in, closing it
 * puts focus back on the stall you came from, so keyboard players don't get
 * dumped at the top of the document.
 */

interface Props {
  children: ReactNode;
  onClose: () => void;
  label: string;
  /** Bottom-sheet layout. Callers pass their own breakpoint result. */
  bottomSheet?: boolean;
  /**
   * Edge-to-edge: the case fills the viewport instead of floating in it.
   *
   * For the Forge, where the archetype's commissioned background is the point.
   * Raheem: "I want the UI to go to the full screen, like edge to edge, and the
   * centre to fill in with that art we generated." A boxed panel with a scrim
   * around it shows that painting through a letterbox, which is the opposite of
   * immersion.
   */
  fullBleed?: boolean;
}

export function Scrim({
  children,
  onClose,
  label,
  bottomSheet = false,
  fullBleed = false,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;
    const box = boxRef.current;
    box?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const focusable = box.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restoreTo.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // No click-outside on a full-bleed surface: there is no outside, and a
      // stray click on the backdrop art must not throw away a half-answered forge.
      onClick={fullBleed ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        // 45, deliberately. `CardSheet` portals to <body> at z-50, so it
        // escapes this element entirely and only z-order decides which wins —
        // at 60 the detail sheet opened silently BEHIND the case. 45 keeps this
        // above the courtyard's proximity ribbons (30) while letting the sheet
        // it opens sit on top, and stays below the pause menu (70), which
        // should still cover everything.
        zIndex: 45,
        // Full-bleed needs no dimming — there is nothing behind it to see.
        background: fullBleed ? '#07050b' : 'rgba(6,4,10,0.72)',
        display: 'flex',
        alignItems: bottomSheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: fullBleed ? 0 : bottomSheet ? 0 : 24,
      }}
    >
      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          // WIDTH, not just max-width. With only a max-width the box shrinks to
          // its content, so a menu that should span 960px rendered as a narrow
          // two-column column on desktop.
          width: fullBleed ? '100%' : bottomSheet ? '100%' : 'min(960px, 100%)',
          // A DEFINITE height, not just a max. A flex child with `flex-basis: 0`
          // contributes nothing to a content-sized parent, so a scroller inside
          // a max-height-only box collapsed to 8px and the box shrank around it.
          // Giving the box a real height breaks that circularity.
          //
          // It is also the better game surface: the case stays the same size
          // while you filter, instead of the panel jumping every time the result
          // count changes.
          height: fullBleed ? '100dvh' : bottomSheet ? '85dvh' : 'min(90dvh, 780px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
