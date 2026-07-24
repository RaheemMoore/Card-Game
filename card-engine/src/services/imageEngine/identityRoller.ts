/**
 * Identity roller — image-first character generation (Stage 3, 2026-07-22).
 *
 * Deterministically decides a character's presentation from the controlled pools
 * (identityPools.ts) + the player's authored choice pins, seeded from `cardId` so
 * a resumed forge reproduces the SAME person. This is the layer that replaces
 * Claude's free identity inference (the root of the female-skew).
 *
 * Precedence per dimension: existing (locked / legacy) → player pin → roll.
 *   - existing wins so tier-up preserves identity and legacy cards pass through.
 *   - pins are the player's authored `ImageDirective` values (merged from locked choices).
 *   - rolls follow the presentation distribution.
 *
 * Presentation distribution (Raheem 2026-07-22): 60% humanoid / 40% non-human for
 * archetypes with a bespoke form; humanoids split 50/50 male/female. Rooted-mortal
 * archetypes are always humanoid. Sex is NEVER tied to stats.
 *
 * WIRED 2026-07-24 into claudeApi.generateCardText (image-first flip): a FRESH
 * forge rolls sex/build/age/mark here (seeded from cardId), pins them into the
 * Claude prompt AND overrides hiddenFate post-parse. The live forge pins
 * species:'humanoid' — the per-archetype form-families own the non-human /
 * transformation space now, so the 40% bespoke-body path is not used from the forge
 * (it remains available for callers that pass a non-humanoid pin). Tier-up/regen
 * skip the roll (existingHiddenFate) and preserve locked identity.
 */
import type { ArchetypeName } from '../../types/card';
import type { ImageDirective } from '../../types/bible';
import {
  BODY_CLASSES,
  BODY_ALLOWLIST,
  AGE_BANDS,
  BESPOKE_BODIES,
  FANTASY_MARKS,
  archetypeSupportsNonHuman,
  bespokeFormsFor,
  marksForArchetype,
  type BodyClassId,
  type AgeBandId,
} from './identityPools';

const NON_HUMAN_CHANCE = 0.4;
const MARK_CHANCE = 0.2;

export type RolledSex = 'male' | 'female' | 'entity';

export interface RolledIdentity {
  /** 'male' | 'female' for humanoids; 'entity' for non-human forms (unless pinned). */
  sex: RolledSex;
  /** 'humanoid' or a BESPOKE_BODIES form id. */
  species: string;
  /** Full Leonardo form descriptor when species is non-human. */
  speciesForm?: string;
  build: BodyClassId;
  age: AgeBandId;
  /** FANTASY_MARKS id, or undefined for no mark. */
  mark?: string;
  markDescription?: string;
}

export interface RollIdentityInput {
  archetype: ArchetypeName;
  /** Seed source — same cardId ⇒ same person. */
  cardId: string;
  /** Player's authored pins, merged from the locked story choices. */
  pins?: ImageDirective;
  /** Locked/legacy values to preserve (tier-up, existing cards). */
  existing?: Partial<RolledIdentity>;
}

// ---------- Seeded PRNG (self-contained; no combat coupling) ----------

function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

// ---------- Roll helpers ----------

const AGE_WEIGHTS: Record<AgeBandId, number> = {
  youth: 6,
  young: 20,
  prime: 30,
  mature: 30,
  ancient: 18,
  mummified: 2,
};

function rollAge(archetype: ArchetypeName, rng: () => number): AgeBandId {
  const eligible = (Object.keys(AGE_WEIGHTS) as AgeBandId[]).filter((id) => {
    const band = AGE_BANDS[id];
    return !band.restrictTo || band.restrictTo.includes(archetype);
  });
  const total = eligible.reduce((sum, id) => sum + AGE_WEIGHTS[id], 0);
  let roll = rng() * total;
  for (const id of eligible) {
    roll -= AGE_WEIGHTS[id];
    if (roll <= 0) return id;
  }
  return 'prime';
}

function isBodyClassId(v: string | undefined): v is BodyClassId {
  return !!v && Object.prototype.hasOwnProperty.call(BODY_CLASSES, v);
}
function isAgeBandId(v: string | undefined): v is AgeBandId {
  return !!v && Object.prototype.hasOwnProperty.call(AGE_BANDS, v);
}

/**
 * Roll the full presentation for a fresh forge, honoring locked/legacy values
 * and player pins. Deterministic given the same cardId + inputs.
 */
export function rollIdentity(input: RollIdentityInput): RolledIdentity {
  const { archetype, cardId, pins = {}, existing = {} } = input;
  const rng = mulberry32(hashString(cardId));

  // --- species (humanoid vs bespoke non-human) ---
  const bespoke = bespokeFormsFor(archetype);
  const speciesRoll = (() => {
    if (existing.species) return existing.species;
    if (pins.species) return pins.species;
    if (!archetypeSupportsNonHuman(archetype)) return 'humanoid';
    return rng() < NON_HUMAN_CHANCE ? pick(bespoke, rng).id : 'humanoid';
  })();
  const isHumanoid = speciesRoll === 'humanoid';
  const speciesForm =
    existing.speciesForm ?? (isHumanoid ? undefined : bespoke.find((b) => b.id === speciesRoll)?.form);

  // --- sex: humanoids 50/50 M/F; non-human forms read as 'entity' unless pinned ---
  const sex: RolledSex =
    (existing.sex as RolledSex | undefined) ??
    (pins.sex === 'male' || pins.sex === 'female' ? pins.sex : undefined) ??
    (isHumanoid ? (rng() < 0.5 ? 'male' : 'female') : 'entity');

  // --- build (mass/frame) from the archetype allowlist ---
  const build: BodyClassId =
    (isBodyClassId(existing.build) ? existing.build : undefined) ??
    (isBodyClassId(pins.build) ? pins.build : undefined) ??
    pick(BODY_ALLOWLIST[archetype], rng);

  // --- age band ---
  const age: AgeBandId =
    (isAgeBandId(existing.age) ? existing.age : undefined) ??
    (isAgeBandId(pins.age) ? pins.age : undefined) ??
    rollAge(archetype, rng);

  // --- fantasy mark (most characters have none) ---
  const mark = (() => {
    if (existing.mark !== undefined) return existing.mark || undefined;
    if (pins.mark) return pins.mark;
    const eligible = marksForArchetype(archetype);
    if (eligible.length === 0) return undefined;
    return rng() < MARK_CHANCE ? pick(eligible, rng).id : undefined;
  })();
  const markDescription = mark ? FANTASY_MARKS.find((m) => m.id === mark)?.description : undefined;

  return { sex, species: speciesRoll, speciesForm, build, age, mark, markDescription };
}

/** Debug/telemetry helper — not used in the hot path. */
export function summarizeIdentity(id: RolledIdentity): string {
  return [
    id.sex,
    id.species === 'humanoid' ? BODY_CLASSES[id.build].label.toLowerCase() : id.species,
    AGE_BANDS[id.age].label.toLowerCase(),
    id.mark ?? 'unmarked',
  ].join(' / ');
}

export { BESPOKE_BODIES };
