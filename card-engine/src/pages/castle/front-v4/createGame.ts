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
    /**
     * FIT AT THE FRAME'S OWN SIZE, not RESIZE at 100%.
     *
     * RESIZE hands the scene whatever pixel size the container happens to be and
     * leaves it to derive a zoom, which worked only for as long as the container
     * and the world were the same shape. The moment the frame went from 720 to 960
     * for the taller sky, three separate things had to agree — the CSS aspect
     * ratio, the camera's viewport, and the zoom — and they did not: the canvas
     * grew, the camera kept its old viewport, and the extra height rendered nothing.
     * It presented as a black band across the sky, which is indistinguishable from
     * a backdrop that failed to load, and cost most of an evening.
     *
     * FIT makes the frame the single authority. The game is exactly
     * `FRONT_V4_VIEW` units, the camera is exactly that many units, the zoom is 1,
     * and the browser scales the finished canvas to whatever box it is given —
     * letterboxing if the shapes disagree, which is honest and visible rather than
     * silently cropping the world.
     */
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: FRONT_V4_VIEW.width,
      height: FRONT_V4_VIEW.height,
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
