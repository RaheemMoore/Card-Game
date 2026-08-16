import { describe, it, expect } from 'vitest';
import { CONSTRUCT_TUNING, setAiEnabled, setStrongHits } from '../combat/construct';
import {
  forceJellyPhase,
  initialJelly,
  jellyIsTargetable,
  resetJelly,
  stepJelly,
  type JellyState,
} from './jellyController';
import { ARENA, GROUND_Y, JELLY_SPAWN_X } from './layout';
import { LEAP_TUNING } from './jellyLeap';

const STEP = 1000 / 60;

const advance = (
  state: JellyState,
  ms: number,
  heroX: number,
  opts: { hits?: Parameters<typeof stepJelly>[1]['hits']; downed?: boolean } = {},
) => {
  let s = state;
  const events: string[] = [];
  let heroHits = 0;
  for (let t = 0; t < ms; t += STEP) {
    const out = stepJelly(
      s,
      { heroX, heroDownedOrGraced: opts.downed ?? false, hits: t === 0 ? (opts.hits ?? []) : [] },
      STEP,
    );
    s = out.state;
    events.push(...out.events);
    if (out.heroHit) heroHits++;
  }
  return { state: s, events, heroHits };
};

/** Walk it all the way from idle to the moment it commits. */
const toTelegraph = (heroX: number) => {
  let s = initialJelly(JELLY_SPAWN_X);
  for (let i = 0; i < 2000; i++) {
    const out = stepJelly(s, { heroX, heroDownedOrGraced: false, hits: [] }, STEP);
    s = out.state;
    if (s.construct.phase === 'telegraph') return s;
  }
  throw new Error('never reached telegraph');
};

describe('ground mode', () => {
  it('wakes at the spawn separation the layout ships', () => {
    // The courtyard shipped a construct three units outside its own wake radius
    // and it read as furniture. layout.ts holds the separation; this proves it.
    expect(Math.abs(JELLY_SPAWN_X - 380)).toBeLessThan(CONSTRUCT_TUNING.alertRadiusPx);
    const { state } = advance(initialJelly(JELLY_SPAWN_X), 100, 380);
    expect(state.construct.phase).toBe('alert');
  });

  it('closes horizontally and stays on the ground line', () => {
    const { state } = advance(initialJelly(JELLY_SPAWN_X), 1200, 380);
    expect(state.construct.pos.y).toBe(GROUND_Y);
    expect(state.construct.pos.x).toBeLessThan(JELLY_SPAWN_X);
  });

  it('pins Y and clamps X after a heavy knockback at the edge', () => {
    // construct.ts displaces on a heavy hit and never clamps; nothing else would
    // stop a charged shot putting it outside the arena.
    const at = forceJellyPhase(initialJelly(ARENA.maxX - 10), 'idle');
    const { state } = advance(at, STEP * 2, ARENA.maxX - 200, {
      hits: [{ amount: 1, knockback: { x: 1, y: 0 }, heavy: true }],
    });
    expect(state.construct.pos.x).toBeLessThanOrEqual(ARENA.maxX);
    expect(state.construct.pos.y).toBe(GROUND_Y);
  });
});

describe('the handoff from tell to arc', () => {
  it('leaps instead of striking, and swallows the melee resolution', () => {
    // The construct emits its capsule strike on the first step of `attack`. If it
    // ever reached the hero he would be hit at the instant of takeoff, by nothing
    // he could see.
    const heroX = 380;
    const telegraphing = toTelegraph(heroX);
    const { state, events } = advance(telegraphing, CONSTRUCT_TUNING.telegraphMs + 50, heroX);
    expect(events).toContain('leapStart');
    expect(state.mode).toBe('leaping');
    expect(state.leap).not.toBeNull();
  });

  it('aims at the ground he held when the tell began, not where he ends up', () => {
    const heroX = 380;
    const telegraphing = toTelegraph(heroX);
    const captured = telegraphing.construct.committedTarget?.x;
    expect(captured).toBeDefined();

    // He runs during the tell. The landing must not follow him.
    let s = telegraphing;
    let hero = heroX;
    for (let t = 0; t < CONSTRUCT_TUNING.telegraphMs + 50; t += STEP) {
      hero += 3;
      s = stepJelly(s, { heroX: hero, heroDownedOrGraced: false, hits: [] }, STEP).state;
      if (s.mode === 'leaping') break;
    }
    expect(s.mode).toBe('leaping');
    expect(s.leap!.landingX).toBeCloseTo(captured!, 5);
    expect(hero).toBeGreaterThan(captured! + 50);
  });
});

describe('airborne', () => {
  const airborne = (heroX: number) => {
    const telegraphing = toTelegraph(heroX);
    const { state } = advance(telegraphing, CONSTRUCT_TUNING.telegraphMs + STEP, heroX);
    expect(state.mode).toBe('leaping');
    return state;
  };

  it('cannot be shot out of the air', () => {
    // The commitment cuts both ways. Damage while airborne would flinch it out of
    // its own arc — `applyHits` runs before the aiEnabled check, so freezing the
    // AI would not have protected it either.
    const s = airborne(380);
    expect(jellyIsTargetable(s)).toBe(false);
    const hpBefore = s.construct.hp;
    const { state } = advance(s, 100, 380, {
      hits: [{ amount: 25, knockback: { x: -1, y: 0 }, heavy: true }],
    });
    expect(state.construct.hp).toBe(hpBefore);
    expect(state.mode).toBe('leaping');
  });

  it('holds mid-arc when the AI is frozen, so it can be looked at', () => {
    // The construct's contract is that a frozen AI holds whatever state it is in.
    // The apex is the state most worth stopping on — it is where "does it really
    // clear his head" is answered — and before this it was the one state that
    // could not be held.
    let s = airborne(380);
    s = advance(s, 200, 380).state;
    const held = { ...s, construct: setAiEnabled(s.construct, false) };
    const heightAtFreeze = held.heightPx;
    const later = advance(held, 400, 380);
    expect(later.state.heightPx).toBe(heightAtFreeze);
    expect(later.state.mode).toBe('leaping');
    expect(later.heroHits).toBe(0);

    // And it resumes rather than being stuck.
    const resumed = advance(
      { ...later.state, construct: setAiEnabled(later.state.construct, true) },
      LEAP_TUNING.durationMs,
      380,
    );
    expect(resumed.state.mode).toBe('ground');
  });

  it('rises off the ground and comes back down', () => {
    const s = airborne(380);
    const mid = advance(s, LEAP_TUNING.durationMs / 2, 380).state;
    expect(mid.heightPx).toBeGreaterThan(100);
    const landed = advance(s, LEAP_TUNING.durationMs + 50, 380);
    expect(landed.state.heightPx).toBe(0);
    expect(landed.events).toContain('leapLand');
  });

  it('lands in the punish window at the ground it committed to', () => {
    const s = airborne(380);
    const landingX = s.leap!.landingX;
    const { state } = advance(s, LEAP_TUNING.durationMs + 50, 380);
    expect(state.mode).toBe('ground');
    expect(state.construct.phase).toBe('recovery');
    expect(state.construct.pos.x).toBeCloseTo(landingX, 5);
    expect(state.construct.pos.y).toBe(GROUND_Y);
  });

  it('hits a hero who stands in it exactly once', () => {
    const heroX = 380;
    const s = airborne(heroX);
    const { heroHits } = advance(s, LEAP_TUNING.durationMs + 50, heroX);
    expect(heroHits).toBe(1);
  });

  it('misses a hero who walked clear, and a miss stays a miss', () => {
    const heroX = 380;
    const s = airborne(heroX);
    const { heroHits } = advance(s, LEAP_TUNING.durationMs + 50, heroX - 300);
    expect(heroHits).toBe(0);
  });

  it('reports a strong hit only when strong hits are on', () => {
    const heroX = 380;
    let s = airborne(heroX);
    let kinds: string[] = [];
    for (let t = 0; t < LEAP_TUNING.durationMs + 50; t += STEP) {
      const out = stepJelly(s, { heroX, heroDownedOrGraced: false, hits: [] }, STEP);
      s = out.state;
      if (out.heroHit) kinds.push(out.heroHit.kind);
    }
    expect(kinds).toEqual(['light']);

    let strong = airborne(heroX);
    strong = { ...strong, construct: setStrongHits(strong.construct, true) };
    kinds = [];
    for (let t = 0; t < LEAP_TUNING.durationMs + 50; t += STEP) {
      const out = stepJelly(strong, { heroX, heroDownedOrGraced: false, hits: [] }, STEP);
      strong = out.state;
      if (out.heroHit) kinds.push(out.heroHit.kind);
    }
    expect(kinds).toEqual(['strong']);
  });

  it('does not land on a man already on the floor', () => {
    // Otherwise the stand-up grace buys nothing and the knockdown chains.
    const heroX = 380;
    const s = airborne(heroX);
    const { heroHits } = advance(s, LEAP_TUNING.durationMs + 50, heroX, { downed: true });
    expect(heroHits).toBe(0);
  });
});

describe('interruption and commands', () => {
  it('a hit during the tell cancels the leap outright', () => {
    // Stock construct behaviour: applyHits abandons committedTarget. Shooting a
    // creature that is winding up has to be an answer, not a race.
    const heroX = 380;
    const telegraphing = toTelegraph(heroX);
    // Under hitReactMs (180), or it has already flinched and moved on to `face`.
    const { state, events } = advance(telegraphing, 100, heroX, {
      hits: [{ amount: 2, knockback: { x: -1, y: 0 }, heavy: false }],
    });
    expect(state.construct.phase).toBe('hitReact');
    // The abandoned strike must not be remembered and resumed after the flinch.
    expect(state.construct.committedTarget).toBeNull();
    expect(state.mode).toBe('ground');
    expect(events).not.toContain('leapStart');
  });

  it('forcing a phase lands it first', () => {
    const s = forceJellyPhase(
      { ...initialJelly(600), mode: 'leaping', heightPx: 180 },
      'telegraph',
      400,
    );
    expect(s.mode).toBe('ground');
    expect(s.heightPx).toBe(0);
    expect(s.leap).toBeNull();
    expect(s.construct.committedTarget?.x).toBe(400);
  });

  it('resets to a deterministic idle at the spawn anchor', () => {
    const s = resetJelly({ ...initialJelly(900), mode: 'leaping', heightPx: 200 }, JELLY_SPAWN_X);
    expect(s.mode).toBe('ground');
    expect(s.construct.phase).toBe('idle');
    expect(s.construct.hp).toBe(CONSTRUCT_TUNING.maxHp);
    expect(s.construct.pos).toEqual({ x: JELLY_SPAWN_X, y: GROUND_Y });
  });

  it('can be killed, and reports it once', () => {
    const { state, events } = advance(initialJelly(JELLY_SPAWN_X), 100, 380, {
      hits: [{ amount: CONSTRUCT_TUNING.maxHp, knockback: { x: 1, y: 0 }, heavy: true }],
    });
    expect(state.construct.phase).toBe('defeated');
    expect(events.filter((e) => e === 'defeated')).toHaveLength(1);
    expect(jellyIsTargetable(state)).toBe(false);
  });
});
