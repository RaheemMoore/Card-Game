import type { ArchetypeName, Rank } from '../types/card';

/**
 * Per-archetype, PER-RANK pose pools. Raheem 2026-07-21: a tier-up must NEVER
 * reuse the previous tier's pose — a changed pose sells that something critical
 * happened. Because each rank draws from its OWN pool, consecutive tiers are
 * always different, and the pools escalate (Necromancer: human casting →
 * spectral surge → bone-form command). Poses are element-neutral where possible
 * (the assembler adds the element); "soul/spirit" reads are on-archetype.
 */
// Weapon-NEUTRAL: the pose describes the body + soul action so it works for any
// weapon in the pool (scythe, bell, lantern, book…); the assembler's weapon
// clause supplies the actual implement. Avoid blade-specific verbs like "cleave".
const NECROMANCER_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'lunging forward mid-invocation, weapon gripped in one hand, the other thrust out summoning, wisps of soul-light trailing',
    'mid-cast with a glowing crack down the sternum leaking soul-light, one hand raised summoning a spectral figure',
    'kneeling to press one palm to the grave-earth, thin spectral hands rising from the soil around them, weapon planted',
    'striding forward, weapon raised in one hand, the other drawing a single wraith out of the mist',
  ],
  Forged: [
    'spinning mid-attack, weapon whipping through the motion, a wraith torn screaming free from the arc',
    'arms spread commanding a rising tide of spirits, weapon held out, robes flaring outward',
    'half-turned mid-drain, life-force streaming from an unseen target into a glowing wound on their own body',
    'raising both hands, skeletal hands breaking the ground around them, weapon lifted high calling the dead up',
  ],
  Ascendant: [
    'standing in absolute command, weapon raised overhead, half-skeletal with bone showing through the flesh, a spiralling chorus of bound souls circling them',
    'seated on a throne of bone commanding a legion of the dead, torso partly skeletal, soul-light streaming through exposed ribs, weapon in hand',
    'arms flung wide unleashing a torrent of spirits, the ground splitting with reaching skeletal hands, a bone-crown silhouette',
  ],
};

const POSE_POOLS: Partial<Record<ArchetypeName, Record<Rank, readonly string[]>>> = {
  Necromancer: NECROMANCER_POSES,
};

export function getPosePool(archetype: ArchetypeName, rank: Rank): readonly string[] {
  return POSE_POOLS[archetype]?.[rank] ?? [];
}
