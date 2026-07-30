import Phaser from 'phaser';
import { PixelSampleScene } from './PixelSampleScene';

/**
 * The only module that constructs Phaser for the pixel sample, reached solely
 * through a dynamic import so the ~1.2MB engine stays out of the main bundle.
 * Nothing in the synchronous graph may import this file.
 */
export function createSampleGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    backgroundColor: '#0e0d12',
    scene: [PixelSampleScene],
  });

  if (import.meta.env.DEV) {
    (window as unknown as { __pixelSampleGame?: Phaser.Game }).__pixelSampleGame = game;
  }

  return game;
}
