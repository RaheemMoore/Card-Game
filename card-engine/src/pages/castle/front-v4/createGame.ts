import Phaser from 'phaser';
import { CastleFrontV4Scene } from './CastleFrontV4Scene';
import { FRONT_V4_VIEW } from './layout';

/**
 * The only place a CastleFrontV4 game is constructed.
 *
 * NOTHING IN THE SYNCHRONOUS GRAPH MAY IMPORT THIS FILE. It pulls in Phaser as a
 * value — about a megabyte of engine — and the host reaches it through a dynamic
 * `import()` precisely so that weight lands in its own chunk and never in the
 * player's download.
 *
 * NO `physics` BLOCK, and that is a decision rather than an omission. See the
 * scene header: every position here belongs to a pure module, and an Arcade body
 * would be a second authority on the same numbers.
 */
export function createCastleFrontV4Game(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#120c18',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: '100%',
      height: '100%',
    },
    // Stops the wheel scrolling the page out from under the canvas while the
    // player is cycling their hand.
    input: { mouse: { preventDefaultWheel: true } },
    // Filtering is applied per texture in the scene instead: the sky and hills are
    // smooth gradients, and nearest-filtering the whole game would band the dusk.
    pixelArt: false,
    scene: [CastleFrontV4Scene],
  });
}

export { FRONT_V4_VIEW };
