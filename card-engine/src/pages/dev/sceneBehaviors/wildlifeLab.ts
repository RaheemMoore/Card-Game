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
import { readSceneWater } from '../sceneWildlife';
import { WILDLIFE_FEET } from './wildlifeShared';
import { createWaterRipples } from './waterRipples';
import type { SceneBehavior, SceneBehaviorContext } from './types';

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

/**
 * What an animal is doing, said in the one place you are already looking: over its
 * head.
 *
 * The corner readout is not enough and playtesting proved it — it asks you to watch
 * a text panel while the thing you care about happens somewhere else on screen, so
 * "did pressing T do anything?" stayed unanswerable. A label that follows the
 * animal answers it without moving your eyes.
 */
const ACTIVITY_LABEL: Record<string, { text: string; color: string }> = {
  idle: { text: 'resting', color: '#9fb0ae' },
  roam: { text: 'wandering', color: '#9fb0ae' },
  signature: { text: 'busy', color: '#9fb0ae' },
  observe: { text: 'watching you', color: '#ffd479' },
  flee: { text: 'fleeing!', color: '#ff9d7a' },
  // The two that matter for this feature, in the one colour nothing else uses.
  drink: { text: 'to the water', color: '#7fe3ff' },
  drinking: { text: 'drinking', color: '#7fe3ff' },
};

export function attachWildlifeLab(
  scene: Phaser.Scene,
  context?: SceneBehaviorContext,
): SceneBehavior {
  // Authoring aids stay OFF unless asked for. They shipped on by default for one
  // session and Raheem reasonably read the debug line as part of the artwork —
  // a white streak coming off the fox's mouth that nobody drew.
  const showAids = context?.showWildlife ?? false;
  createWildlifeAnimations(scene);

  const roamBounds = readRoamBounds(scene);
  // Found from the art, exactly as the courtyard does it — drag a pond into the
  // lab scene and the animals start using it, with nothing wired here.
  const waterSources = readSceneWater(scene);
  // Said out loud, because "why is nobody drinking?" has two very different
  // answers — no pond was found, or a pond was found and nobody is thirsty yet —
  // and from the outside they look identical.
  console.info(
    `[wildlife-lab] ${waterSources.length} water source(s): ` +
      (waterSources
        .map(({ bounds: w }) => `${Math.round(w.width)}x${Math.round(w.height)} at ${Math.round(w.x)},${Math.round(w.y)}`)
        .join('; ') || 'none — drop a pond in and refresh'),
  );
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
      waterSources,
      feet: WILDLIFE_FEET[member.species],
    });
    manager.add(agent);
    agents.push({ label: profile.label, agent });
  }

  // Rings under the muzzle. Unlike the debug overlays this is NOT gated behind
  // ?wildlife=show — it is part of the scene, not an authoring aid.
  const ripples = createWaterRipples(scene);
  // One ring per lap, not one per frame. Slower than the fox's 6fps clip so the
  // rings read as separate touches rather than a continuous boil.
  const LAP_MS = 520;
  const lapTimers = new Map<WildlifeAgent, number>();
  let lapCount = 0;

  const stopWatchingMotion = watchReducedMotion((off) => {
    manager.setMotionOff(off);
    ripples.setMotionOff(off);
  });
  const readout = createReadout(scene);

  // One label per animal, parented to nothing — moved to the sprite every frame so
  // it cannot drift out of step with what the animal is actually doing.
  const tags = agents.map(({ agent }) => ({
    agent,
    text: scene.add
      .text(0, 0, '', { fontFamily: 'Consolas, monospace', fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5, 1)
      .setDepth(180_000),
  }));

  // A banner, so forcing thirst is never silent. Two seconds is long enough to read
  // and short enough that it is gone before the animals arrive.
  const banner = scene.add
    .text(0, 0, '', {
      fontFamily: 'Consolas, monospace',
      fontSize: '15px',
      color: '#0b1414',
      backgroundColor: '#7fe3ff',
      padding: { x: 10, y: 6 },
    })
    .setOrigin(0.5, 0)
    .setDepth(200_001)
    .setVisible(false);
  let bannerLeft = 0;

  // WHAT THE WATER OVERLAY IS FOR
  //
  // Every patch the system actually found, outlined where it found it. If an
  // animal is ignoring a pond, the first question is whether the pond was seen at
  // all, and this answers it without reading a log — a pond with no outline is
  // not water as far as the animals are concerned.
  const waterOutlines = !showAids ? [] : waterSources.map(({ bounds: w }) =>
    scene.add
      .rectangle(w.x + w.width / 2, w.y + w.height / 2, w.width, w.height)
      .setStrokeStyle(2, 0x33ccff, 0.9)
      .setFillStyle(0x33ccff, 0.12)
      .setDepth(150_000),
  );

  // A line from an animal to the water it is going to, drawn ONLY while it is on
  // a drink. With stand-in artwork a drink is visually identical to the fox's
  // sniff, so this is currently the only way to see the difference at all.
  const drinkLines = showAids ? scene.add.graphics().setDepth(150_001) : null;

  const parched = () => {
    const thirsty = agents.filter(({ agent }) => agent.hasWater());
    for (const { agent } of thirsty) agent.makeThirsty();
    // Counts only the animals that CAN drink. Saying "3 are thirsty" when the
    // tortoise never drinks is the kind of readout that teaches the wrong thing.
    banner.setText(
      thirsty.length
        ? `${thirsty.length} thirsty — heading for the water`
        : 'nobody here can reach water',
    );
    banner.setVisible(true);
    bannerLeft = 2_000;
    console.info('[wildlife-lab] everyone is thirsty — watch them head for the water.');
  };

  // TWO WAYS IN, because one was not enough.
  //
  // `keydown-T` on the scene's keyboard rather than `addKey('T').on('down')`: the
  // second only fires while that Key object is the focused input's, which is why
  // T silently stopped working after an unrelated change. The URL flag exists
  // because a keypress that does nothing is indistinguishable from a feature that
  // does nothing — `?thirsty=1` needs no focus and no timing.
  scene.input.keyboard?.on('keydown-T', parched);

  const thirstyFlag =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('thirsty') !== null;
  let thirstTimer: ReturnType<typeof setInterval> | undefined;
  if (thirstyFlag) {
    parched();
    // Keeps them cycling so you can watch the approach more than once without
    // reloading. Test-only: nothing outside this lab reads the flag.
    thirstTimer = setInterval(parched, 12_000);
  }

  return {
    update(now, deltaMs, playerPosition) {
      manager.update(now, deltaMs, playerPosition);

      // Ripples first: they belong to the world, and run whether or not the
      // authoring overlays are on.
      for (const { agent } of agents) {
        const contact = agent.drinkContactPoint();
        if (!contact) {
          lapTimers.delete(agent);
          continue;
        }
        const due = (lapTimers.get(agent) ?? 0) - deltaMs;
        if (due <= 0) {
          // The tongue, out past the waterline.
          ripples.pulse(contact.x, contact.y);
          // And any paw that is genuinely in the water — normally none, since the
          // water is solid to a land animal. Heavier and on every other lap, so
          // when it does happen it reads as a different kind of disturbance.
          if (lapCount % 2 === 0) {
            for (const paw of agent.wetFeet()) ripples.pulse(paw.x, paw.y, 1.45);
          }
          lapCount += 1;
          lapTimers.set(agent, LAP_MS);
        } else {
          lapTimers.set(agent, due);
        }
      }
      ripples.update(deltaMs);

      // Labels follow their animal. `drinking` is distinguished from `to the
      // water` by whether it has ARRIVED, which is exactly what the ripple uses —
      // one source of truth for "it is at the water now".
      for (const tag of tags) {
        const { current } = tag.agent.snapshot();
        const activity = current?.activity ?? 'idle';
        const arrived = activity === 'drink' && tag.agent.drinkContactPoint() !== null;
        const look = ACTIVITY_LABEL[arrived ? 'drinking' : activity] ?? ACTIVITY_LABEL.idle;
        tag.text
          .setText(look.text)
          .setColor(look.color)
          .setPosition(tag.agent.sprite.x, tag.agent.sprite.y - tag.agent.sprite.displayHeight - 4);
      }

      if (bannerLeft > 0) {
        bannerLeft -= deltaMs;
        if (bannerLeft <= 0) banner.setVisible(false);
      }

      drinkLines?.clear();
      for (const { agent } of agents) {
        if (!drinkLines) break;
        const target = agent.drinkingFrom();
        if (!target) continue;
        const box = target.bounds;
        const toX = Math.min(box.x + box.width, Math.max(box.x, agent.sprite.x));
        const toY = Math.min(box.y + box.height, Math.max(box.y, agent.sprite.y));
        drinkLines.lineStyle(2, 0x7fe3ff, 0.85);
        drinkLines.lineBetween(agent.sprite.x, agent.sprite.y, toX, toY);
        drinkLines.fillStyle(0x7fe3ff, 0.85);
        drinkLines.fillCircle(toX, toY, 4);
      }

      // Pin the readout to the top-left of whatever the camera is showing, at a
      // constant on-screen size regardless of the preview's zoom.
      const camera = scene.cameras.main;
      const inverseZoom = 1 / (camera.zoom || 1);
      readout.setScale(inverseZoom);
      readout.setPosition(
        camera.worldView.x + 8 * inverseZoom,
        camera.worldView.y + 8 * inverseZoom,
      );
      banner.setScale(inverseZoom);
      banner.setPosition(
        camera.worldView.x + camera.worldView.width / 2,
        camera.worldView.y + 14 * inverseZoom,
      );

      readout.setText([
        // The affordance has to be on screen. A review key nobody knows about is
        // the same as no review key.
        waterSources.length
          ? `press T (or add ?thirsty=1) — everyone gets thirsty${thirstyFlag ? ' · AUTO every 12s' : ''}`
          : 'no water in this scene — drag a pond in, save, refresh',
        '',
        ...agents.map(({ label, agent }) => {
          const { current, needs } = agent.snapshot();
          const activity = current ? current.activity : 'starting';
          const because = current?.reason === 'player-nearby' ? ' (you)' : '';
          return (
            `${label.padEnd(17)}${(activity + because).padEnd(16)}` +
            `E ${bar(needs.energy)}  C ${bar(needs.curiosity)}  S ${bar(needs.signatureUrge)}` +
              // T for thirst, and only for a species that actually drinks — the
              // tortoise has no drink routine, so giving it a thirst bar would
              // teach the opposite of the truth. Shown even with no pond in the
              // scene, because a bar that climbs and never falls is the clearest
              // way to see that the want is real and the WATER is what is absent.
              (agent.profile.routines.some((r) => r.activity === 'drink')
                ? `  T ${bar(needs.thirst)}${agent.hasWater() ? '' : ' (no water)'}`
                : '')
          );
        }),
      ]);
    },

    destroy() {
      stopWatchingMotion();
      manager.destroy();
      readout.destroy();
      ripples.destroy();
      banner.destroy();
      for (const tag of tags) tag.text.destroy();
      scene.input.keyboard?.off('keydown-T', parched);
      if (thirstTimer) clearInterval(thirstTimer);
      drinkLines?.destroy();
      for (const outline of waterOutlines) outline.destroy();
    },
  };
}
