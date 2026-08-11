import type {
  WildlifeActivity,
  WildlifeBrainSnapshot,
  WildlifeDecision,
  WildlifeNeeds,
  WildlifeRandom,
  WildlifeRoutine,
  WildlifeSpeciesProfile,
  WildlifeStimulus,
} from './types';

const REACTION_DURATION_MS: Record<'flee' | 'observe', readonly [number, number]> = {
  flee: [900, 1_700],
  observe: [1_000, 2_200],
};

function between(range: readonly [number, number], random: WildlifeRandom): number {
  const [minimum, maximum] = range;
  return minimum + (maximum - minimum) * random();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The brain only answers one question: "what should this animal do next?"
 * It deliberately knows nothing about sprites, physics, or animation frames.
 * That separation is what lets all three species share it.
 */
export class WildlifeBrain {
  private current: WildlifeDecision | null = null;
  private readonly cooldownUntil = new Map<WildlifeActivity, number>();
  private readonly recent: WildlifeActivity[] = [];
  private readonly profile: WildlifeSpeciesProfile;
  private readonly random: WildlifeRandom;
  private readonly needs: WildlifeNeeds;
  private lastUpdateAt: number | null = null;

  constructor(
    profile: WildlifeSpeciesProfile,
    random: WildlifeRandom = Math.random,
  ) {
    this.profile = profile;
    this.random = random;
    this.needs = {
      energy: 0.55 + random() * 0.25,
      curiosity: 0.35 + random() * 0.35,
      signatureUrge: 0.2 + random() * 0.35,
      // Staggered on purpose. Animals created in the same frame with identical
      // thirst all walk to the pond together, which reads as a scripted parade
      // rather than as three creatures that happened to get thirsty.
      thirst: 0.1 + random() * 0.5,
    };
  }

  decide(stimulus: WildlifeStimulus): WildlifeDecision {
    this.updateNeeds(stimulus.now);
    const reaction = this.playerReaction(stimulus);
    if (reaction) {
      if (this.current?.activity === reaction && stimulus.now < this.current.endsAt) {
        return this.current;
      }
      this.current = this.makeReaction(reaction, stimulus.now);
      return this.current;
    }

    if (this.current && stimulus.now < this.current.endsAt) return this.current;

    const previous = this.current?.activity;
    if (this.current) this.remember(this.current.activity);

    // No water in reach means the drink routine is not a candidate at all — the
    // animal does not stand around wanting something it cannot have, it simply
    // behaves exactly as it did before there were ponds. This one filter is the
    // whole of "put a pond down and they know what to do".
    const possible = this.profile.routines.filter(
      (routine) => routine.activity !== 'drink' || stimulus.waterAvailable === true,
    );

    const available = possible.filter((routine) => {
      const coolingDown = (this.cooldownUntil.get(routine.activity) ?? 0) > stimulus.now;
      return !coolingDown && routine.activity !== previous;
    });
    const fallback = possible.filter(
      (routine) => (this.cooldownUntil.get(routine.activity) ?? 0) <= stimulus.now,
    );
    const candidates =
      available.length > 0 ? available : fallback.length > 0 ? fallback : possible;
    if (candidates.length === 0) {
      this.current = {
        activity: 'idle',
        startedAt: stimulus.now,
        endsAt: stimulus.now + 1_000,
        reason: 'routine',
      };
      return this.current;
    }
    let routine = candidates[0];
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      const score = this.score(candidate);
      if (score > bestScore) {
        routine = candidate;
        bestScore = score;
      }
    }
    const duration = between(routine.durationMs, this.random);
    this.current = {
      activity: routine.activity,
      startedAt: stimulus.now,
      endsAt: stimulus.now + duration,
      reason: 'routine',
    };
    if (routine.activity === 'signature') this.needs.signatureUrge = 0;
    // Slaked, but not to bone dry — a small residue means the next drink is not
    // a fixed interval away, so a watched animal never looks metronomic.
    if (routine.activity === 'drink') this.needs.thirst = this.random() * 0.12;
    this.cooldownUntil.set(routine.activity, this.current.endsAt + routine.cooldownMs);
    return this.current;
  }

  snapshot(): WildlifeBrainSnapshot {
    return {
      current: this.current ? { ...this.current } : null,
      needs: { ...this.needs },
      recent: [...this.recent],
    };
  }

  /**
   * Make this animal thirsty right now, and let it reconsider immediately.
   *
   * A review affordance, not a game mechanic. Thirst takes tens of seconds to
   * build, and with stand-in artwork a drink looks exactly like the fox's sniff —
   * so without a way to force it, "do they actually drink?" is a question you
   * answer by staring at a field hoping to catch one. Clearing the current
   * decision is the important half: raising the need alone would change nothing
   * until whatever it was already doing ran out of time.
   */
  makeThirsty(): void {
    this.needs.thirst = 1;
    this.current = null;
    this.cooldownUntil.delete('drink');
  }

  /**
   * Force one activity for a while. A review affordance, like `makeThirsty`.
   *
   * Needed because the brain re-decides every frame and would immediately
   * overwrite anything the agent set by hand — so "make the tortoise go for a
   * swim" has to be expressed as a decision, not as a position.
   */
  hold(activity: WildlifeActivity, now: number, durationMs: number): WildlifeDecision {
    this.current = { activity, startedAt: now, endsAt: now + durationMs, reason: 'routine' };
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.cooldownUntil.clear();
    this.recent.length = 0;
    this.lastUpdateAt = null;
  }

  private score(routine: WildlifeRoutine): number {
    let needMultiplier = 1;
    if (routine.activity === 'idle') needMultiplier = 0.45 + (1 - this.needs.energy) * 2.2;
    if (routine.activity === 'roam') needMultiplier = 0.45 + this.needs.curiosity * 1.9;
    if (routine.activity === 'signature') {
      needMultiplier = 0.35 + this.needs.signatureUrge * 2.4;
    }
    if (routine.activity === 'observe') needMultiplier = 0.35 + this.needs.curiosity;
    // Steeper than the others, and squared. A slightly thirsty animal should stay
    // slightly more likely to wander than to drink; a very thirsty one should go
    // to the water and mean it. A linear term gives neither — it makes drinking a
    // constant low-grade nag, and the animal drifts pondward all day.
    if (routine.activity === 'drink') {
      needMultiplier = 0.15 + this.needs.thirst * this.needs.thirst * 4.2;
    }

    const memoryPenalty = this.recent.includes(routine.activity) ? 0.35 : 1;
    const naturalVariation = 0.9 + this.random() * 0.2;
    return routine.weight * needMultiplier * memoryPenalty * naturalVariation;
  }

  private updateNeeds(now: number): void {
    if (this.lastUpdateAt == null) {
      this.lastUpdateAt = now;
      return;
    }
    const seconds = Math.min(5, Math.max(0, now - this.lastUpdateAt) / 1_000);
    this.lastUpdateAt = now;
    const activity = this.current?.activity ?? 'idle';

    const energyDelta =
      activity === 'flee' ? -0.055 : activity === 'roam' ? -0.016 : activity === 'idle' ? 0.026 : 0.006;
    const curiosityDelta =
      activity === 'roam' || activity === 'observe' ? -0.025 : activity === 'idle' ? 0.02 : 0.008;

    // Exertion is thirsty work; drinking is the only thing that reverses it, and
    // that happens on the decision itself rather than here.
    //
    // These were a third higher until they were MEASURED: a fox drank every 20
    // seconds and a rabbit every 16, which is not an animal that gets thirsty, it
    // is an animal that lives at the pond. Drinking is meant to be a thing you
    // occasionally notice, so the rates are set from the cadence we want out the
    // far end rather than from what felt right written down. See drinkCadence.test.ts.
    const thirstDelta =
      activity === 'flee' ? 0.006 : activity === 'roam' ? 0.003 : activity === 'drink' ? 0 : 0.0015;

    this.needs.energy = clamp01(this.needs.energy + energyDelta * seconds);
    this.needs.curiosity = clamp01(this.needs.curiosity + curiosityDelta * seconds);
    this.needs.signatureUrge = clamp01(this.needs.signatureUrge + 0.014 * seconds);
    this.needs.thirst = clamp01(this.needs.thirst + thirstDelta * seconds);
  }

  private playerReaction(stimulus: WildlifeStimulus): 'flee' | 'observe' | null {
    if (stimulus.playerDistance == null) return null;
    if (stimulus.playerDistance <= this.profile.fleeRadius) {
      return this.profile.closePlayerResponse;
    }
    if (stimulus.playerDistance <= this.profile.noticeRadius) return 'observe';
    return null;
  }

  private makeReaction(activity: 'flee' | 'observe', now: number): WildlifeDecision {
    return {
      activity,
      startedAt: now,
      endsAt: now + between(REACTION_DURATION_MS[activity], this.random),
      reason: 'player-nearby',
    };
  }

  private remember(activity: WildlifeActivity): void {
    this.recent.unshift(activity);
    this.recent.length = Math.min(this.recent.length, 2);
  }
}
