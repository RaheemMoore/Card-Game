import Phaser from 'phaser';
import { TowerFloorScene } from './TowerFloorScene';

/**
 * Constructs the tower's Phaser game. Mirrors courtyard/createGame.ts — the
 * engine is only ever reached through a module like this one, dynamically
 * imported, so it stays out of the main bundle.
 *
 * The tower gets its own game rather than a second scene inside the courtyard's
 * because the two use different camera policies: the courtyard fit-scales one
 * fixed plate, the tower follows the player across four screens. Sharing an
 * instance would mean one of them constantly undoing the other's camera setup.
 */
export function createGame(parent: HTMLElement, floor = 1): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    transparent: true,
    scene: [TowerFloorScene],
  });

  game.scene.start('tower-floor', { floor });

  if (import.meta.env.DEV) {
    (window as unknown as { __towerGame?: Phaser.Game }).__towerGame = game;
  }
  return game;
}
