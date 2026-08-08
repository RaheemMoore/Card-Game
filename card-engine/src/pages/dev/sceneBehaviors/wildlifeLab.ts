import type Phaser from 'phaser';
import {
  WILDLIFE_SPECIES,
  WildlifeAgent,
  WildlifeManager,
  type WildlifeBounds,
  type WildlifeFacing,
  type WildlifeSpeciesId,
} from '../../castle/wildlife';
import {
  ANIMATION_SETS,
  createWildlifeAnimations,
  watchReducedMotion,
} from './wildlifeShared';
import type { SceneBehavior } from './types';

/**
 * Wildlife Lab behaviour — /dev/scene?start=WildlifeLab
 *
 * The bench. One flat floor, no walls, three animals and a readout, so behaviour
 * can be judged on its own before it has to compete with scenery. The courtyard
 * runs the same brain through `courtyardV2.ts`; what differs there is only where
 * the animals may walk.
 *
 * Everything visual belongs to Phaser Editor: where each animal stands, how big
 * it is, and how large the green roaming rectangle is are all read from the scene
 * at run time, never written down here.
 */

/** The roaming box used only when `roamingAreaGuide` is not exposed to code. */
const FALLBACK_BOUNDS: WildlifeBounds = { x: 55, y: 165, width: 690, height: 330 };

const CAST: readonly {
  field: string;
  species: WildlifeSpeciesId;
  facing: WildlifeFacing;
}[] = [
  { field: 'foxSprite', species: 'red-fox', facing: 'right' },
  { field: 'rabbitSprite', species: 'forest-rabbit', facing: 'left' },
  { field: 'tortoiseSprite', species: 'glowcap-tortoise', facing: 'right' },
];

/**
 * Reads the roaming box off the green rectangle the Editor draws.
 *
 * Worth doing rather than writing the numbers down: the demonstration routine
 * this replaced wandered `x 105..695, y 205..350` while the rectangle on screen
 * spanned `x 55..745, y 165..495`, so the guide players could see was not the
 * guide the animals obeyed.
 */
function readRoamBounds(scene: Phaser.Scene): WildlifeBounds {
  const guide = (scene as unknown as Record<string, Phaser.GameObjects.Rectangle | undefined>)
    .roamingAreaGuide;

  if (!guide || typeof guide.width !== 'number') {
    console.info(
      '[wildlife-lab] roamingAreaGuide is not exposed to code (set its scope to CLASS in ' +
        'Phaser Editor to make the roaming area editable); using the default box.',
    );
    return FALLBACK_BOUNDS;
  }

  return {
    x: guide.x - guide.width * guide.originX,
    y: guide.y - guide.height * guide.originY,
    width: guide.width,
    height: guide.height,
  };
}

/**
 * A development readout, per the studio's harness rule: without it, "the brain is
 * working" is an assertion. With it you can watch energy drain as the fox roams
 * and recover while it rests, and see that two runs never line up.
 */
function createReadout(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(0, 0, '', {
      fontFamily: 'Consolas, monospace',
      fontSize: '13px',
      color: '#d8f3e0',
      backgroundColor: '#0b1414cc',
      padding: { x: 8, y: 6 },
    })
    .setDepth(200_000);
}

const bar = (value: number) => '█'.repeat(Math.round(value * 10)).padEnd(10, '·');

export function attachWildlifeLab(scene: Phaser.Scene): SceneBehavior {
  createWildlifeAnimations(scene);

  const roamBounds = readRoamBounds(scene);
  const manager = new WildlifeManager();
  const agents: { label: string; agent: WildlifeAgent }[] = [];

  for (const member of CAST) {
    const sprite = (scene as unknown as Record<string, Phaser.GameObjects.Sprite | undefined>)[
      member.field
    ];
    if (!sprite) {
      console.warn(`[wildlife-lab] no "${member.field}" in the scene; that animal stays absent.`);
      continue;
    }
    const profile = WILDLIFE_SPECIES[member.species];
    const agent = new WildlifeAgent(sprite, profile, {
      roamBounds,
      animations: ANIMATION_SETS[member.species],
      initialFacing: member.facing,
    });
    manager.add(agent);
    agents.push({ label: profile.label, agent });
  }

  const stopWatchingMotion = watchReducedMotion((off) => manager.setMotionOff(off));
  const readout = createReadout(scene);

  return {
    update(now, deltaMs, playerPosition) {
      manager.update(now, deltaMs, playerPosition);

      // Pin the readout to the top-left of whatever the camera is showing, at a
      // constant on-screen size regardless of the preview's zoom.
      const camera = scene.cameras.main;
      const inverseZoom = 1 / (camera.zoom || 1);
      readout.setScale(inverseZoom);
      readout.setPosition(
        camera.worldView.x + 8 * inverseZoom,
        camera.worldView.y + 8 * inverseZoom,
      );

      readout.setText(
        agents.map(({ label, agent }) => {
          const { current, needs } = agent.snapshot();
          const activity = current ? current.activity : 'starting';
          const because = current?.reason === 'player-nearby' ? ' (you)' : '';
          return (
            `${label.padEnd(17)}${(activity + because).padEnd(16)}` +
            `E ${bar(needs.energy)}  C ${bar(needs.curiosity)}  S ${bar(needs.signatureUrge)}`
          );
        }),
      );
    },

    destroy() {
      stopWatchingMotion();
      manager.destroy();
      readout.destroy();
    },
  };
}
