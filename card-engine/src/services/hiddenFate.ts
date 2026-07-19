import type { HiddenFate } from '../types/bible';

/**
 * Hidden Fate helpers — Bible §Hidden Fate.
 *
 * Claude fills the fourteen HiddenFate fields based on the player's Story
 * Pillar answers and element selection. Hidden Fate must REINFORCE the
 * player's story, not compete with it.
 *
 * These helpers exist so callers (claudeApi, tierUp, regeneratePortrait)
 * can construct, validate, and preserve Hidden Fate consistently.
 */

/**
 * Empty Hidden Fate scaffold. Used as the initial shape when Claude has
 * not yet filled fields, and as the shape check for parsed API responses.
 */
export function emptyHiddenFate(): HiddenFate {
  return {
    age: '',
    sex: '',
    bodyType: '',
    skinTone: '',
    facialStructure: '',
    hair: '',
    disabilityOrCondition: '',
    posture: '',
    scars: '',
    weather: '',
    lighting: '',
    clothingConstruction: '',
    minorAccessories: '',
    environmentDetails: '',
  };
}

/**
 * True when a HiddenFate object has ANY populated field. Used to detect
 * cards that have Bible-era Hidden Fate vs. legacy cards that predate it.
 */
export function hasHiddenFate(fate: HiddenFate | undefined): fate is HiddenFate {
  if (!fate) return false;
  return Object.values(fate).some((v) => typeof v === 'string' && v.length > 0);
}

/**
 * Bible §Rank continuity — locked fields must survive a tier-up untouched.
 * age is age at Foundation; the character reads older at higher ranks via
 * language cues, not by changing this string.
 *
 * Body type, sex, disability/condition, scars, and skin tone NEVER change.
 * Weather/lighting/environment MAY change per rank (the character may
 * literally be in a different place). Clothing construction MAY change
 * as they age/travel. Posture MAY deepen but not reverse (a hunched
 * Foundation does not straighten at Ascendant).
 */
export const LOCKED_HIDDEN_FATE_FIELDS: readonly (keyof HiddenFate)[] = [
  'age',
  'sex',
  'bodyType',
  'skinTone',
  'facialStructure',
  'hair',
  'disabilityOrCondition',
  'scars',
] as const;

/**
 * Preserve the identity anchors from an existing HiddenFate when Claude
 * returns a new one at tier-up. Only the mutable fields (weather,
 * lighting, clothingConstruction, minorAccessories, environmentDetails,
 * posture) can shift; the rest carry forward verbatim.
 */
export function preserveIdentityAcrossRanks(
  previous: HiddenFate,
  incoming: HiddenFate,
): HiddenFate {
  const merged: HiddenFate = { ...incoming };
  for (const field of LOCKED_HIDDEN_FATE_FIELDS) {
    if (previous[field]) merged[field] = previous[field];
  }
  return merged;
}

/**
 * Best-effort parse of a HiddenFate blob returned from Claude. Missing
 * fields default to empty strings; non-string fields are dropped.
 */
export function parseHiddenFate(raw: unknown): HiddenFate {
  const base = emptyHiddenFate();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof HiddenFate)[]) {
    const value = obj[key];
    if (typeof value === 'string') base[key] = value;
  }
  return base;
}
