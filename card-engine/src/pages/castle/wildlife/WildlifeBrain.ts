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

    const available = this.profile.routines.filter((routine) => {
      const coolingDown = (this.cooldownUntil.get(routine.activity) ?? 0) > stimulus.now;
      return !coolingDown && routine.activity !== previous;
    });
    const fallback = this.profile.routines.filter(
      (routine) => (this.cooldownUntil.get(routine.activity) ?? 0) <= stimulus.now,
    );
    const candidates =
      available.length > 0 ? available : fallback.length > 0 ? fallback : this.profile.routines;
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

    this.needs.energy = clamp01(this.needs.energy + energyDelta * seconds);
    this.needs.curiosity = clamp01(this.needs.curiosity + curiosityDelta * seconds);
    this.needs.signatureUrge = clamp01(this.needs.signatureUrge + 0.014 * seconds);
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
