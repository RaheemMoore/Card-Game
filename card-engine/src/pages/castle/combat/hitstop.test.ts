import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { HITSTOP_CAP_MS, getHitFeel } from './feel';
import { createHitstop } from './hitstop';

/**
 * A scene stand-in.
 *
 * Hitstop only ever touches two numbers on the scene, which is the whole reason
 * it can be tested at all â€” a real Phaser.Scene would drag in device detection
 * and a canvas that does not exist here.
 */
function fakeScene() {
  const scene = {
    tweens: { timeScale: 1 },
    anims: { globalTimeScale: 1 },
  };
  return scene as unknown as Phaser.Scene & {
    tweens: { timeScale: number };
    anims: { globalTimeScale: number };
  };
}

describe('hitstop', () => {
  it('passes real time through when nothing has landed', () => {
    const scene = fakeScene();
    const h = createHitstop(scene);
    expect(h.step(16)).toBe(16);
    expect(h.active()).toBe(false);
    expect(scene.tweens.timeScale).toBe(1);
  });

  it('freezes the picture and hands presenters zero dt', () => {
    const scene = fakeScene();
    const h = createHitstop(scene);
    h.trigger(50);

    expect(h.active()).toBe(true);
    expect(scene.tweens.timeScale).toBe(0);
    expect(scene.anims.globalTimeScale).toBe(0);
    expect(h.step(16)).toBe(0);
  });

  it('thaws exactly once the time is spent, and does not eat that frame', () => {
    const scene = fakeScene();
    const h = createHitstop(scene);
    h.trigger(32);

    expect(h.step(16)).toBe(0);
    // The frame that ends the freeze runs at full dt. Swallowing it would cost
    // an extra frame of motion per hit, which stutters visibly under fire.
    expect(h.step(16)).toBe(16);
    expect(h.active()).toBe(false);
    expect(scene.tweens.timeScale).toBe(1);
    expect(scene.anims.globalTimeScale).toBe(1);
  });

  it('takes the longest pending freeze, never the sum', () => {
    // THE concurrency rule. Two shots landing in one frame must not add up to
    // a longer pause than either of them asked for â€” that is how an idle game
    // with several attackers freezes solid at the exact moment it is busiest.
    const h = createHitstop(fakeScene());
    h.trigger(40);
    h.trigger(30);
    expect(h.remainingMs()).toBe(40);

    h.trigger(60);
    expect(h.remainingMs()).toBe(60);
  });

  it('never exceeds the cap however hard it is hit', () => {
    const h = createHitstop(fakeScene());
    for (let i = 0; i < 20; i++) h.trigger(500);
    expect(h.remainingMs()).toBe(HITSTOP_CAP_MS);
  });

  it('ignores a zero or negative request rather than freezing forever', () => {
    const h = createHitstop(fakeScene());
    h.trigger(0);
    expect(h.active()).toBe(false);
    h.trigger(-10);
    expect(h.active()).toBe(false);
  });

  it('never freezes at all when motion is off', () => {
    // Motion off resolves to zero hitstop, and zero must be a no-op rather
    // than a freeze of unspecified length.
    const h = createHitstop(fakeScene());
    h.trigger(getHitFeel('heavy', 'off').hitstopMs);
    expect(h.active()).toBe(false);
  });

  it('restores the global time scale when the scene goes away mid-freeze', () => {
    // The animation manager outlives the scene. A teardown during a freeze
    // would otherwise leave the NEXT scene rendering nothing moving, with no
    // visible cause.
    const scene = fakeScene();
    const h = createHitstop(scene);
    h.trigger(80);
    expect(scene.anims.globalTimeScale).toBe(0);

    h.destroy();
    expect(scene.anims.globalTimeScale).toBe(1);
    expect(scene.tweens.timeScale).toBe(1);
  });
});
