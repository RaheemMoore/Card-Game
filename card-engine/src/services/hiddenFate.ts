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
  // Image-Engine locked selections — the weapon/companion/environment identity
  // is rolled at Foundation and must survive tier-up verbatim, same as the
  // body/skin anchors. These are string ids; companionPresent (boolean) is
  // carried explicitly below because the truthy loop would drop a locked-false.
  'weaponId',
  'companionId',
  'environmentId',
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
    const value = previous[field];
    if (value) (merged as unknown as Record<string, unknown>)[field] = value;
  }
  // M4.6 — preserve the structured body + skin decomposition across ranks.
  // If the previous card has these objects, they win verbatim — same rule
  // as the legacy freeform bodyType/skinTone.
  if (previous.bodyDimensions) merged.bodyDimensions = previous.bodyDimensions;
  if (previous.skinPresentation) merged.skinPresentation = previous.skinPresentation;
  // M4.7 — preserve hair + fashion structured objects. Per Bible §Preservation
  // Rules: "Rank evolution may improve, damage, transform, or ceremonialize
  // these features, but should not randomly replace them." We lock them
  // verbatim here; downstream tier-up logic MAY layer ceremonial/wear
  // updates on top, but the anchors survive.
  if (previous.hairDetail) merged.hairDetail = previous.hairDetail;
  if (previous.fashion) merged.fashion = previous.fashion;
  // Image-Engine companion roll — a boolean, so it can be a locked `false`
  // (this character has no retinue). The string-id loop above skips falsy
  // values, so carry the boolean (and its paired id) explicitly.
  if (previous.companionPresent !== undefined) merged.companionPresent = previous.companionPresent;
  // Locked ~20% bare-chest roll — a boolean, preserved explicitly so the
  // Ascendant look is stable across a tier-up / regen.
  if (previous.bareChestRoll !== undefined) merged.bareChestRoll = previous.bareChestRoll;
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
    if (typeof value === 'string') (base as unknown as Record<string, unknown>)[key] = value;
  }
  // M4.6 — parse the nested structured objects if present. Skip if any
  // required subfield is missing or non-string; freeform bodyType/skinTone
  // remain the fallback.
  const bd = obj.bodyDimensions as Record<string, unknown> | undefined;
  if (bd && typeof bd === 'object' &&
      typeof bd.height === 'string' && typeof bd.frame === 'string' &&
      typeof bd.mass === 'string' && typeof bd.muscleVisibility === 'string' &&
      typeof bd.posture === 'string') {
    base.bodyDimensions = {
      height: bd.height,
      frame: bd.frame,
      mass: bd.mass,
      muscleVisibility: bd.muscleVisibility,
      posture: bd.posture,
    };
  }
  const sp = obj.skinPresentation as Record<string, unknown> | undefined;
  if (sp && typeof sp === 'object' &&
      typeof sp.depth === 'string' && typeof sp.undertone === 'string' &&
      typeof sp.texture === 'string' && typeof sp.lightingResponse === 'string') {
    base.skinPresentation = {
      depth: sp.depth,
      undertone: sp.undertone,
      texture: sp.texture,
      lightingResponse: sp.lightingResponse,
    };
  }
  // M4.7 — parse hairDetail (all 8 required fields).
  const hd = obj.hairDetail as Record<string, unknown> | undefined;
  if (hd && typeof hd === 'object' &&
      typeof hd.texture === 'string' && typeof hd.length === 'string' &&
      typeof hd.style === 'string' && typeof hd.color === 'string' &&
      typeof hd.condition === 'string' && typeof hd.adornment === 'string' &&
      typeof hd.facialHair === 'string' && typeof hd.headwearInteraction === 'string') {
    base.hairDetail = {
      texture: hd.texture, length: hd.length, style: hd.style,
      color: hd.color, condition: hd.condition, adornment: hd.adornment,
      facialHair: hd.facialHair, headwearInteraction: hd.headwearInteraction,
    };
  }
  // M4.7 — parse fashion (required fields + optional rank-scaled fields).
  const fa = obj.fashion as Record<string, unknown> | undefined;
  if (fa && typeof fa === 'object' &&
      typeof fa.role === 'string' && typeof fa.primaryGarment === 'string' &&
      typeof fa.waist === 'string' && typeof fa.footwear === 'string' &&
      typeof fa.wear === 'string' && typeof fa.signatureAccessory === 'string' &&
      Array.isArray(fa.materials)) {
    const materials = (fa.materials as unknown[]).filter((m): m is string => typeof m === 'string');
    base.fashion = {
      role: fa.role,
      primaryGarment: fa.primaryGarment,
      waist: fa.waist,
      footwear: fa.footwear,
      materials,
      wear: fa.wear,
      signatureAccessory: fa.signatureAccessory,
      ...(typeof fa.baseLayer === 'string' ? { baseLayer: fa.baseLayer } : {}),
      ...(typeof fa.structuralLayer === 'string' ? { structuralLayer: fa.structuralLayer } : {}),
      ...(typeof fa.armor === 'string' ? { armor: fa.armor } : {}),
      ...(typeof fa.outerLayer === 'string' ? { outerLayer: fa.outerLayer } : {}),
      ...(typeof fa.armAndHandTreatment === 'string' ? { armAndHandTreatment: fa.armAndHandTreatment } : {}),
      ...(typeof fa.rankSignal === 'string' ? { rankSignal: fa.rankSignal } : {}),
      ...(typeof fa.magicalOrTechnologicalIntegration === 'string' ? { magicalOrTechnologicalIntegration: fa.magicalOrTechnologicalIntegration } : {}),
    };
  }
  return base;
}
