import Phaser from 'phaser';
import { CourtyardScene } from './CourtyardScene';

/**
 * The only module that constructs Phaser. Everything Phaser-valued is reached
 * through here via dynamic import, which keeps the ~1MB engine out of the main
 * bundle — nothing in the synchronous graph may import this file eagerly.
 */
export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    // RESIZE lets Phaser own the resize listener, so there is no hand-rolled
    // window listener to leak on unmount.
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    // Transparent, not a background colour. The plate is rendered scale-to-FIT,
    // so on a wide window there is margin either side of it — and that margin
    // has to let the blurred backdrop in CourtyardViewport show through rather
    // than being painted over with a flat colour.
    transparent: true,
    scene: [CourtyardScene],
  });

  // Dev-only handle so movement and collision can be asserted on real
  // coordinates during verification instead of eyeballed from screenshots.
  if (import.meta.env.DEV) {
    (window as unknown as { __courtyardGame?: Phaser.Game }).__courtyardGame = game;
  }

  return game;
}
