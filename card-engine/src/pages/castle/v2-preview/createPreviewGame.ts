import Phaser from 'phaser';
import { CourtyardV2PreviewScene } from './CourtyardV2PreviewScene';

export function createCourtyardV2PreviewGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    transparent: true,
    scene: [CourtyardV2PreviewScene],
  });
}
