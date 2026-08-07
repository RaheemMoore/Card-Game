import type Phaser from 'phaser';
import {
  WILDLIFE_SPECIES,
  WildlifeAgent,
  WildlifeManager,
  type WildlifeAnimationSet,
  type WildlifeBounds,
  type WildlifeFacing,
  type WildlifeSpeciesId,
} from '../../castle/wildlife';
import type { SceneBehavior } from './types';

/**
 * Wildlife Lab behaviour — /dev/scene?start=WildlifeLab
 *
 * Gives the three Editor-placed animals their life. Everything visual belongs to
 * Phaser Editor: WHERE each animal stands, how big it is, and how large the green
 * roaming rectangle is are all read from the scene at run time, never hardcoded
 * here. Everything behavioural belongs to `castle/wildlife`, unchanged and shared
 * with the courtyard later.
 *
 * This replaced a hand-written demonstration routine inside WildlifeLab.js that
 * ran fixed activity arrays on a modulo counter — it proved the six sheets play,
 * but it had no needs, no memory, and no idea a player existed.
 */

/** Rows in every wildlife sheet, in file order. Confirmed against all six *.meta.json. */
const ROWS: readonly WildlifeFacing[] = ['down', 'up', 'left', 'right'];

/**
 * One entry per generated sheet.
 *
 * `columns` is the row stride, and it is NOT the same as the loop length: every
 * sheet's meta file marks column 0 of each row as the idle pose and columns
 * 1..columns-1 as the animation. The demonstration routine looped all of them,
 * which folded the idle pose into the walk cycle as a hitch once per lap.
 */
const SHEETS = {
  foxTrot: { texture: 'wildlife-fox-trot', columns: 7, fps: 9 },
  foxSniff: { texture: 'wildlife-fox-sniff', columns: 7, fps: 7 },
  foxSitAlert: { texture: 'wildlife-fox-sit-alert', columns: 9, fps: 7 },
  rabbitHop: { texture: 'wildlife-rabbit-hop', columns: 7, fps: 9 },
  rabbitNibble: { texture: 'wildlife-rabbit-nibble-groom', columns: 7, fps: 7 },
  tortoiseToddle: { texture: 'wildlife-tortoise-toddle', columns: 7, fps: 5 },
} as const;

type SheetName = keyof typeof SHEETS;

/** Namespaced so they cannot collide with any key a scene file defines itself. */
const loopKey = (sheet: SheetName, facing: WildlifeFacing) =>
  `wl-${SHEETS[sheet].texture}-${facing}`;
const stillKey = (sheet: SheetName, facing: WildlifeFacing) =>
  `wl-${SHEETS[sheet].texture}-${facing}-still`;

/** The roaming box used only when `roamingAreaGuide` is not exposed to code. */
const FALLBACK_BOUNDS: WildlifeBounds = { x: 55, y: 165, width: 690, height: 330 };

function createAnimations(scene: Phaser.Scene): void {
  for (const name of Object.keys(SHEETS) as SheetName[]) {
    const sheet = SHEETS[name];
    if (!scene.textures.exists(sheet.texture)) {
      console.warn(`[wildlife-lab] texture "${sheet.texture}" is not loaded; skipping its clips.`);
      continue;
    }

    ROWS.forEach((facing, row) => {
      const first = row * sheet.columns;

      if (!scene.anims.exists(loopKey(name, facing))) {
        scene.anims.create({
          key: loopKey(name, facing),
          frames: scene.anims.generateFrameNumbers(sheet.texture, {
            start: first + 1,
            end: first + sheet.columns - 1,
          }),
          frameRate: sheet.fps,
          repeat: -1,
        });
      }

      // A one-frame looping animation, so a held pose and a moving clip are the
      // same kind of thing to WildlifeAgent and it never needs a special case.
      if (!scene.anims.exists(stillKey(name, facing))) {
        scene.anims.create({
          key: stillKey(name, facing),
          frames: scene.anims.generateFrameNumbers(sheet.texture, { start: first, end: first }),
          frameRate: 1,
          repeat: -1,
        });
      }
    });
  }
}

const loopSet = (sheet: SheetName): Record<WildlifeFacing, string> =>
  Object.fromEntries(ROWS.map((f) => [f, loopKey(sheet, f)])) as Record<WildlifeFacing, string>;

const stillSet = (sheet: SheetName): Record<WildlifeFacing, string> =>
  Object.fromEntries(ROWS.map((f) => [f, stillKey(sheet, f)])) as Record<WildlifeFacing, string>;

/**
 * Which clip each decision looks like.
 *
 * The tortoise is deliberately restrained: it has one generated sheet, so its
 * "tuck in and softly glow" reads as stopping and holding still rather than as an
 * invented animation. That is honest with the art we have, and it is still more
 * life than the demonstration gave it — that routine was literally `["move"]`.
 */
const ANIMATIONS: Record<WildlifeSpeciesId, WildlifeAnimationSet> = {
  'red-fox': {
    move: loopSet('foxTrot'),
    signature: loopSet('foxSniff'),
    observe: loopSet('foxSitAlert'),
    idle: stillSet('foxSitAlert'),
  },
  'forest-rabbit': {
    move: loopSet('rabbitHop'),
    signature: loopSet('rabbitNibble'),
    observe: stillSet('rabbitHop'),
    idle: stillSet('rabbitHop'),
  },
  'glowcap-tortoise': {
    move: loopSet('tortoiseToddle'),
    signature: stillSet('tortoiseToddle'),
    observe: stillSet('tortoiseToddle'),
    idle: stillSet('tortoiseToddle'),
  },
};

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
 * wandered `x 105..695, y 205..350` while the rectangle on screen spans
 * `x 55..745, y 165..495`, so the guide players could see was not the guide the
 * animals obeyed. Reading the real object makes moving that rectangle in the
 * Editor actually change where animals go.
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
  createAnimations(scene);

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
      animations: ANIMATIONS[member.species],
      initialFacing: member.facing,
    });
    manager.add(agent);
    agents.push({ label: profile.label, agent });
  }

  // The manager already knows how to stand every animal still; this is only the
  // three lines that let the operating system ask it to.
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  if (reduceMotion?.matches) manager.setMotionOff(true);
  const onMotionPreference = (event: MediaQueryListEvent) => manager.setMotionOff(event.matches);
  reduceMotion?.addEventListener('change', onMotionPreference);

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
      reduceMotion?.removeEventListener('change', onMotionPreference);
      manager.destroy();
      readout.destroy();
    },
  };
}
