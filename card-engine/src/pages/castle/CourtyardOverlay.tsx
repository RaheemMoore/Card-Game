import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { COURTYARD_EVENTS } from './courtyard/events';
import { HERO_SPAWN, INTERACTABLES, nearestStall, type Stall } from './courtyard/stalls';
import { worldToScreen, type Viewport } from './courtyard/layout';

/**
 * The accessible layer over the Phaser canvas.
 *
 * Walking is how most players reach a stall — WASD/arrows on desktop,
 * tap-to-move on touch. But a canvas is invisible to assistive tech, so the
 * stalls also exist here as real focusable DOM buttons: Tab to one, press
 * Enter, and you get in without driving a character. That is an additional
 * route, not a replacement for walking.
 */

type InputMode = 'keyboard' | 'touch';

interface Props {
  game: Phaser.Game | null;
  viewport: Viewport;
  /** From useMotionLevel — 'off' suppresses ambient motion and fades. */
  motionOff: boolean;
  onOpenStall: (stall: Stall) => void;
}

const PARCHMENT = 'linear-gradient(180deg, #faeaca 0%, #efcfa4 100%)';

export function CourtyardOverlay({ game, viewport, motionOff, onOpenStall }: Props) {
  const [hero, setHero] = useState<{ x: number; y: number }>({ ...HERO_SPAWN });
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Focus tracking uses native focusin/focusout rather than React's onFocus:
  // this overlay lives inside a portal to document.body, where React's
  // synthetic focus delegation proved unreliable. focusin bubbles, so one
  // listener on the container covers every stall button.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onFocusIn = (e: FocusEvent) => {
      const id = (e.target as HTMLElement)?.dataset?.stallId ?? null;
      setFocusedId(id);
    };
    const onFocusOut = () => setFocusedId(null);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    return () => {
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Hero position streams from the scene rather than being polled, so the
  // ribbon can't lag a frame behind the character it points at.
  useEffect(() => {
    if (!game) return;
    const onMove = (pos: { x: number; y: number }) => setHero(pos);
    game.events.on(COURTYARD_EVENTS.heroMoved, onMove);
    return () => {
      game.events.off(COURTYARD_EVENTS.heroMoved, onMove);
    };
  }, [game]);

  // Last-input-wins. Never detect by viewport width: an iPad with a keyboard
  // and an iPad in hand are the same width, and hybrid laptops are both.
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') setInputMode('touch');
    };
    const onKey = () => setInputMode('keyboard');
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const proximate = nearestStall(hero, activeIdRef.current);
  activeIdRef.current = proximate?.id ?? null;

  // "E" interacts with whatever the hero is standing next to — the walking
  // player's equivalent of Tab+Enter. Held in a ref so the listener doesn't
  // rebind on every hero position update.
  const proximateRef = useRef<Stall | null>(null);
  proximateRef.current = proximate;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      const stall = proximateRef.current;
      if (stall) onOpenStall(stall);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenStall]);

  // A focused stall shows its ribbon even when the hero is nowhere near it —
  // that is what makes keyboard traversal work without walking.
  const focused = INTERACTABLES.find((s) => s.id === focusedId) ?? null;
  const ribbonStall = focused ?? proximate;

  return (
    <div ref={rootRef} className="absolute inset-0 pointer-events-none">
      {INTERACTABLES.map((stall) => {
        const pos = worldToScreen(stall, viewport);
        const isRibbon = ribbonStall?.id === stall.id;
        return (
          <div key={stall.id}>
            <button
              onClick={(e) => {
                // detail === 0 means the button was activated by keyboard
                // (Enter/Space). Keyboard users open the stall directly —
                // that is the whole point of the non-walking route. A real
                // click or tap instead walks the hero over, and the ribbon
                // greets them on arrival.
                if (e.detail === 0) {
                  onOpenStall(stall);
                } else {
                  game?.events.emit(COURTYARD_EVENTS.walkTo, {
                    x: stall.x,
                    y: stall.y + stall.height / 2 + 46,
                  });
                }
              }}
              data-stall-id={stall.id}
              aria-label={`${stall.label} — enter`}
              className="absolute pointer-events-auto rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/80"
              style={{
                left: pos.x,
                top: pos.y,
                width: Math.max(44, stall.width),
                height: Math.max(44, stall.height),
                transform: 'translate(-50%, -50%)',
                background: 'transparent',
              }}
            />

            {isRibbon && (
              <div
                role="status"
                className="absolute pointer-events-none px-3 py-1.5 rounded-md font-fantasy text-sm font-bold whitespace-nowrap shadow-lg"
                style={{
                  left: pos.x,
                  top: pos.y - Math.max(44, stall.height) / 2 - 14,
                  transform: 'translate(-50%, -100%)',
                  background: PARCHMENT,
                  color: '#3a2a18',
                  transition: motionOff ? 'none' : 'opacity 140ms ease-out',
                }}
              >
                {stall.label}
                <span className="ml-2 font-sans text-xs opacity-70">
                  {inputMode === 'touch' ? '▸ Tap' : '⌨ E'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
