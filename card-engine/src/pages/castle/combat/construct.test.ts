import { describe, expect, it } from 'vitest';
import {
  CONSTRUCT_TUNING,
  defeatConstruct,
  forcePhase,
  initialConstruct,
  isHittable,
  resetConstruct,
  reviveConstruct,
  setAiEnabled,
  setStrongHits,
  stepConstruct,
  strikeHits,
  telegraphIsAvoidable,
  type ConstructInput,
  type ConstructState,
  type StrikeResolution,
} from './construct';

/** The courtyard's WALK_SPEED (courtyardRuntime.ts). */
const HERO_WALK_SPEED = 190;

const at = (x: number, y: number) => ({ x, y });

const input = (over: Partial<ConstructInput> = {}): ConstructInput => ({
  heroFeet: at(1000, 0),
  heroDownedOrGraced: false,
  hits: [],
  ...over,
});

/** Step until `predicate`, or throw. Returns the state and any strike seen. */
function runUntil(
  state: ConstructState,
  predicate: (s: ConstructState) => boolean,
  over: Partial<ConstructInput> = {},
  maxFrames = 400,
): { state: ConstructState; strikes: StrikeResolution[] } {
  let s = state;
  const strikes: StrikeResolution[] = [];
  for (let i = 0; i < maxFrames; i++) {
    const out = stepConstruct(s, input(over), 16);
    s = out.state;
    if (out.strike) strikes.push(out.strike);
    if (predicate(s)) return { state: s, strikes };
  }
  throw new Error(`never satisfied; ended in ${s.phase}`);
}

const awake = () => resetConstruct(initialConstruct(at(0, 0)), at(0, 0));

describe('training construct', () => {
  it('starts switched off and does nothing until reset', () => {
    // Disabled is the state it boots in: the courtyard is a place to walk
    // around long before it is a place to fight in.
    const off = initialConstruct(at(0, 0));
    expect(off.phase).toBe('disabled');
    const { state } = stepConstruct(off, input({ heroFeet: at(0, 0) }), 16);
    expect(state.phase).toBe('disabled');
  });

  it('wakes only when he comes close, and loses interest when he leaves', () => {
    const far = runUntil(awake(), (s) => s.phase === 'idle', { heroFeet: at(9999, 0) }, 5);
    expect(far.state.phase).toBe('idle');

    const near = runUntil(awake(), (s) => s.phase === 'alert', { heroFeet: at(100, 0) });
    expect(near.state.phase).toBe('alert');
  });

  // ---- The fairness guarantee -------------------------------------------

  it('telegraphs for long enough to walk out of, at the real walk speed', () => {
    // THE invariant. He has no dodge, no roll and no shield by design, so if
    // the tell is shorter than the walk out of the strike, the encounter is
    // unfair in a way no amount of player skill can fix.
    expect(telegraphIsAvoidable(HERO_WALK_SPEED)).toBe(true);
  });

  it('fails the avoidability check if the tell is shortened', () => {
    // The natural way to "tighten the fight" is to cut the telegraph, and this
    // is the test that has to make that fail loudly rather than silently.
    const tooShort = { ...CONSTRUCT_TUNING, telegraphMs: 120 };
    expect(telegraphIsAvoidable(HERO_WALK_SPEED, tooShort)).toBe(false);
  });

  it('lets a player who walks during the tell escape the strike', () => {
    // The invariant, played rather than computed: stand at strike range, start
    // walking when the telegraph begins, and be clear when it lands.
    let s = forcePhase(awake(), 'telegraph', at(CONSTRUCT_TUNING.preferredRangePx, 0));
    let heroX = CONSTRUCT_TUNING.preferredRangePx;
    let landed: StrikeResolution | null = null;

    for (let i = 0; i < 200 && !landed; i++) {
      // Straight away from the construct, ordinary walking, no dodge.
      heroX += (HERO_WALK_SPEED * 16) / 1000;
      const out = stepConstruct(s, input({ heroFeet: at(heroX, 0) }), 16);
      s = out.state;
      landed = out.strike;
    }

    expect(landed).not.toBeNull();
    expect(strikeHits(landed!, at(heroX, 0))).toBe(false);
  });

  it('hits a player who stands still through the whole tell', () => {
    // The other half: the telegraph has to MEAN something, or walking out of it
    // is not a skill.
    const spot = at(CONSTRUCT_TUNING.preferredRangePx, 0);
    let s = forcePhase(awake(), 'telegraph', spot);
    let landed: StrikeResolution | null = null;
    for (let i = 0; i < 200 && !landed; i++) {
      const out = stepConstruct(s, input({ heroFeet: spot }), 16);
      s = out.state;
      landed = out.strike;
    }
    expect(landed).not.toBeNull();
    expect(strikeHits(landed!, spot)).toBe(true);
  });

  it('does not follow him once the strike is committed', () => {
    // §9.4: a strike that tracks perfectly through its own tell communicates
    // nothing, and the tell is the only warning he gets.
    const committedAt = at(CONSTRUCT_TUNING.preferredRangePx, 0);
    let s = forcePhase(awake(), 'telegraph', committedAt);
    let landed: StrikeResolution | null = null;
    for (let i = 0; i < 200 && !landed; i++) {
      // He runs; the target must not come with him.
      const out = stepConstruct(s, input({ heroFeet: at(2000, 2000) }), 16);
      s = out.state;
      landed = out.strike;
    }
    expect(landed!.target).toEqual(committedAt);
  });

  it('strikes exactly once per commitment', () => {
    // A hitbox live for every frame of the attack would deal its damage twelve
    // times at 60fps.
    const spot = at(CONSTRUCT_TUNING.preferredRangePx, 0);
    let s = forcePhase(awake(), 'telegraph', spot);
    let strikes = 0;
    for (let i = 0; i < 200; i++) {
      const out = stepConstruct(s, input({ heroFeet: spot }), 16);
      s = out.state;
      if (out.strike) strikes++;
      if (s.phase === 'recovery') break;
    }
    expect(strikes).toBe(1);
  });

  it('opens a recovery window to punish', () => {
    // The reward for reading the tell. Without it, walking out of the strike
    // buys distance and nothing else, and the fight has no rhythm.
    const spot = at(CONSTRUCT_TUNING.preferredRangePx, 0);
    let s = forcePhase(awake(), 'telegraph', spot);
    const recovered = runUntil(s, (x) => x.phase === 'recovery', { heroFeet: spot });
    expect(recovered.state.phase).toBe('recovery');
    expect(CONSTRUCT_TUNING.recoveryMs).toBeGreaterThan(CONSTRUCT_TUNING.attackMs);
  });

  // ---- Not kicking a man while he is down --------------------------------

  it('refuses to wake for a hero who is on the floor', () => {
    // Otherwise the stand-up grace buys nothing and the knockdown chains, which
    // §11.3 says must not be possible.
    const { state } = runUntil(awake(), (s) => s.elapsedMs > 100, {
      heroFeet: at(40, 0),
      heroDownedOrGraced: true,
    });
    expect(state.phase).toBe('idle');
  });

  it('breaks off an approach when he goes down', () => {
    let s = forcePhase(awake(), 'approach');
    const out = stepConstruct(
      s,
      input({ heroFeet: at(200, 0), heroDownedOrGraced: true }),
      16,
    );
    expect(out.state.phase).toBe('face');
  });

  // ---- Damage ------------------------------------------------------------

  it('flinches on a tap and is shoved by a charged hit', () => {
    const tapped = stepConstruct(
      forcePhase(awake(), 'idle'),
      input({ hits: [{ amount: 3, knockback: at(1, 0), heavy: false }] }),
      16,
    );
    expect(tapped.state.phase).toBe('hitReact');
    expect(tapped.state.pos.x).toBe(0);

    const shoved = stepConstruct(
      forcePhase(awake(), 'idle'),
      input({ hits: [{ amount: 3, knockback: at(1, 0), heavy: true }] }),
      16,
    );
    expect(shoved.state.phase).toBe('knockbackReact');
    expect(shoved.state.pos.x).toBeCloseTo(CONSTRUCT_TUNING.knockbackPx);
  });

  it('lets a hit interrupt a telegraph, and abandons the strike with it', () => {
    // Shooting something that is winding up should feel like an answer. If the
    // strike survived the flinch it would land afterwards out of nowhere.
    const s = forcePhase(awake(), 'telegraph', at(96, 0));
    const out = stepConstruct(s, input({ hits: [{ amount: 3, knockback: at(1, 0), heavy: false }] }), 16);
    expect(out.state.phase).toBe('hitReact');
    expect(out.state.committedTarget).toBeNull();

    const after = runUntil(out.state, (x) => x.phase !== 'hitReact', { heroFeet: at(9999, 0) });
    expect(after.strikes).toHaveLength(0);
  });

  it('dies when the damage adds up, and stops being a target', () => {
    const out = stepConstruct(
      forcePhase(awake(), 'idle'),
      input({ hits: [{ amount: CONSTRUCT_TUNING.maxHp, knockback: at(1, 0), heavy: true }] }),
      16,
    );
    expect(out.state.phase).toBe('defeated');
    expect(out.state.hp).toBe(0);
    expect(isHittable(out.state.phase)).toBe(false);
  });

  it('cannot be hit while defeated, so a corpse does not soak shots', () => {
    const dead = defeatConstruct(awake());
    const out = stepConstruct(dead, input({ hits: [{ amount: 5, knockback: at(1, 0), heavy: false }] }), 16);
    expect(out.state.phase).toBe('defeated');
  });

  it('a shot that kills mid-telegraph cancels the strike', () => {
    const s = forcePhase(awake(), 'telegraph', at(96, 0));
    let out = stepConstruct(
      s,
      input({ hits: [{ amount: CONSTRUCT_TUNING.maxHp, knockback: at(1, 0), heavy: true }] }),
      16,
    );
    expect(out.state.phase).toBe('defeated');
    const after = runUntil(out.state, (x) => x.elapsedMs > 500, {}, 100);
    expect(after.strikes).toHaveLength(0);
  });

  // ---- Review commands ---------------------------------------------------

  it('revives back to full and fights again, with no reload', () => {
    // §16.4: the construct must be defeatable and resettable without reloading
    // the page, or every test costs a page load.
    const dead = defeatConstruct(awake());
    const reviving = reviveConstruct(dead);
    const back = runUntil(reviving, (s) => s.phase === 'idle', { heroFeet: at(9999, 0) });
    expect(back.state.hp).toBe(CONSTRUCT_TUNING.maxHp);
  });

  it('holds still with the AI off, but still takes damage', () => {
    // Frozen so a human can walk around it and look at every side. Freezing is
    // not invulnerability — the point is to stop it acting.
    const frozen = setAiEnabled(forcePhase(awake(), 'telegraph', at(96, 0)), false);
    const held = runUntil(frozen, (s) => s.elapsedMs >= 0, { heroFeet: at(96, 0) }, 200);
    expect(held.state.phase).toBe('telegraph');
    expect(held.strikes).toHaveLength(0);

    const hurt = stepConstruct(frozen, input({ hits: [{ amount: 5, knockback: at(1, 0), heavy: false }] }), 16);
    expect(hurt.state.hp).toBe(CONSTRUCT_TUNING.maxHp - 5);
  });

  it('can be put into any phase for review', () => {
    for (const phase of ['idle', 'alert', 'approach', 'telegraph', 'recovery'] as const) {
      expect(forcePhase(awake(), phase).phase).toBe(phase);
    }
  });

  it('keeps the test switches across a reset', () => {
    // Resetting to try the knockdown again should not silently turn the
    // knockdown off.
    const armed = setStrongHits(setAiEnabled(awake(), false), true);
    const again = resetConstruct(armed, at(0, 0));
    expect(again.strongHits).toBe(true);
    expect(again.aiEnabled).toBe(false);
    expect(again.phase).toBe('idle');
  });

  it('deals a knockdown only when the strong-hit switch is on', () => {
    const spot = at(CONSTRUCT_TUNING.preferredRangePx, 0);
    const light = runUntil(forcePhase(awake(), 'telegraph', spot), (s) => s.phase === 'recovery', {
      heroFeet: spot,
    });
    expect(light.strikes[0].kind).toBe('light');

    const strong = runUntil(
      forcePhase(setStrongHits(awake(), true), 'telegraph', spot),
      (s) => s.phase === 'recovery',
      { heroFeet: spot },
    );
    expect(strong.strikes[0].kind).toBe('strong');
  });

  // ---- Shape of the strike ------------------------------------------------

  it('misses a glancing angle rather than hitting everything in front', () => {
    const strike: StrikeResolution = {
      origin: at(0, 0),
      target: at(100, 0),
      reachPx: 100,
      radiusPx: 20,
      kind: 'light',
    };
    expect(strikeHits(strike, at(50, 0))).toBe(true);
    expect(strikeHits(strike, at(50, 60))).toBe(false);
    // Past the end of the lunge is a miss, not a hit at range.
    expect(strikeHits(strike, at(200, 0))).toBe(false);
  });

  it('never leaves a phase it cannot get out of', () => {
    // Every phase must terminate on elapsed time. A construct stuck in one is
    // indistinguishable from a hung game, exactly as for the player's own state.
    const phases = ['alert', 'face', 'telegraph', 'attack', 'recovery', 'hitReact',
      'knockbackReact', 'reviving'] as const;
    for (const phase of phases) {
      const s = forcePhase(awake(), phase, at(96, 0));
      const out = runUntil(s, (x) => x.phase !== phase, { heroFeet: at(96, 0) }, 300);
      expect(out.state.phase).not.toBe(phase);
    }
  });

  it('is slower than the hero, so he can always break away', () => {
    expect(CONSTRUCT_TUNING.approachSpeed).toBeLessThan(HERO_WALK_SPEED);
  });
});
