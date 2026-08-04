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
}

export function Scrim({ children, onClose, label, bottomSheet = false }: Props) {
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
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(6,4,10,0.72)',
        display: 'flex',
        alignItems: bottomSheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: bottomSheet ? 0 : 24,
      }}
    >
      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: bottomSheet ? '100%' : undefined,
          maxWidth: bottomSheet ? undefined : 'min(960px, 100%)',
          maxHeight: bottomSheet ? '85dvh' : '90dvh',
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
