import type { ArchetypeName } from '../../types/card';
import type { CharacterSheet } from '../../types/characterSheet';

/**
 * Per-archetype portrait "hooks" — the seam that lets a few archetypes inject
 * special-case prompt fragments into the otherwise archetype-agnostic Image
 * Engine, WITHOUT a pile of `if (archetype === …)` branches in the assembler.
 *
 * Each hook is a pure string-returner (a throw would fail the whole forge for
 * that archetype). The assembler calls them at fixed insertion points and
 * filters out empties. Registered per archetype in ARCHETYPE_PORTRAIT_HOOKS;
 * an archetype with no entry behaves generically.
 *
 * Populated in Step 3 of the image-engine migration (Vampire feral gate,
 * Lycanthrope rank-aware pose + Ascendant all-fours, Seraph three-path anchor,
 * Mech Pilot mandatory-mech, Android human touchpoints). Empty for now so the
 * assembler wiring lands first with zero behavior change.
 */
export interface ArchetypePortraitHooks {
  /** Overrides the generic pose prefix (e.g. Lycan rank-aware form, Vampire
   *  feral). Return a non-empty string to override; the assembler uses the
   *  generic pose prefix when this is absent or returns empty. */
  posePrefix?(sheet: CharacterSheet): string;
  /** A segment that MUST always render for this archetype (e.g. Mech Pilot's
   *  mandatory mech in frame at every rank). */
  mandatorySegment?(sheet: CharacterSheet): string;
  /** A narrative-axis anchor (e.g. Seraph's Good/Fallen/Balanced path from
   *  sheet.narrativeAxisPath). */
  narrativeAnchor?(sheet: CharacterSheet): string;
}

// Bible §Vampire §9 sanctioned exception — ~1/3 of FRESH Vampire Foundation
// forges manifest as the feral bat-beast the vampire grows out of. Foundation +
// fresh only (never tier-up); not persisted, so an impure roll here faithfully
// mirrors the retired legacy gate.
const VAMPIRE_FERAL_CHANCE = 1 / 3;
const VAMPIRE_FERAL_POSE =
  'REQUIRED POSE: crouched low on broken masonry in feral bat-beast form, membrane wings ' +
  'half-furled, clawed hands gripping the stone, fangs bared toward the viewer, hungry glowing ' +
  'eyes. No T-pose, no orb-per-fist, no symmetrical arms. ';

// Seraph three-path anchor (P6 corruption arc). The alignment axis is resolved
// upstream into sheet.narrativeAxisPath ('Good' | 'Fallen' | 'Balanced'); rank
// governs how much of the path is visible (Foundation austere → Ascendant full).
function seraphPathAnchor(path: string | undefined, rank: string): string {
  if (rank === 'Foundation') {
    return 'SERAPH: austerity — plain unbleached linen/monastic robe, NO armor/halo/wings/horns/aura yet; the divine spark has not declared.';
  }
  const declared =
    path === 'Fallen'
      ? 'the FALLEN path — a CORRUPTED, MAJESTIC ANGEL, still winged and haloed but RUINED: great wings of charred blackened feathers dissolving into ash and black glass, a shattered or inverted halo, molten-obsidian BLACK light bleeding through cracks in blackened tarnished-gold regalia, dark black-fire eyes — a beautiful, tragic ruin, VIVID darkness. NEVER a red horned devil or imp, NEVER a sexy demoness, NEVER fire-orange (Infernal = molten obsidian + black light)'
      : path === 'Balanced'
        ? 'the TWILIGHT path — the figure VIVIDLY SPLIT DOWN THE MIDDLE: one half brilliant radiant gold-and-white (a glowing white-feathered wing + a shining gold half-halo), the other half blackened obsidian shadow (a charred black wing + a broken dark half-halo). A STARK, BOLD, unmistakable light-versus-dark division across the whole body — the two halves must read at a glance'
        : 'the GOOD path — a radiant guardian in gilded gold-and-white regalia, great wings of brilliant white light, an intact burning gold halo, VIVID divine radiance';
  const scale = rank === 'Ascendant' ? 'full commitment to' : 'exactly ONE ceremonial piece marking';
  return `SERAPH THREE-PATH ANCHOR: ${scale} ${declared}. The six Orders are independent of this alignment axis.`;
}

const ARCHETYPE_PORTRAIT_HOOKS: Partial<Record<ArchetypeName, ArchetypePortraitHooks>> = {
  Vampire: {
    // Feral-Foundation gate — overrides the generic pose on a fresh Foundation
    // forge only. Returns '' (→ generic humanoid predator pose) otherwise.
    posePrefix(sheet) {
      if (sheet.rank === 'Foundation' && !sheet.isEvolution && Math.random() < VAMPIRE_FERAL_CHANCE) {
        return VAMPIRE_FERAL_POSE;
      }
      return '';
    },
  },
  Lycanthrope: {
    // Anatomy lock — the Ascendant wolf-form is where Leonardo drifts (extra
    // legs, horns, wings). Reinforce the hard rules; harmless at lower ranks.
    mandatorySegment(sheet) {
      if (sheet.rank !== 'Ascendant') return '';
      return 'LYCAN ANATOMY LOCK: a FULL Lycan Guardian in ONE of two forms — EITHER a standing bipedal werewolf on exactly two legs with exactly two arms, OR a great four-legged wolf on exactly four legs; NEVER a mix of the two. In EITHER form: no extra, missing, or fused limbs; a single head, one tail; fur color = the character\'s hair color. ABSOLUTELY NEVER horns, NEVER wings, NEVER antlers, NEVER angelic radiance. A noble controlled Guardian of the Moon Goddess, never a rabid brute.';
    },
  },
  Seraph: {
    narrativeAnchor(sheet) {
      return seraphPathAnchor(sheet.narrativeAxisPath, sheet.rank);
    },
  },
  'Mech Pilot': {
    // The mech is REQUIRED in frame at every rank, and the pilot stays fully
    // human (never fuses with the machine).
    mandatorySegment(sheet) {
      // Nanite exception (2026-07-22): the machine presence is a SWARM, not a
      // single big mech — no towering war-machine, just many small/medium robots.
      if (sheet.resolvedElement === 'Nanite') {
        return `NO single large mech or big robot — the pilot's machine force is a huge SWARM of MANY small and medium nanite-robots swirling around them and assembling in mid-air. The pilot is FLESH-AND-BLOOD HUMAN in a flight-suit, NEVER fused with the machines.`;
      }
      const scale =
        sheet.rank === 'Ascendant'
          ? 'a colossal titan-class mech, tower-tall, all weapon systems deployed'
          : sheet.rank === 'Forged'
            ? 'a heavy warframe mech with integrated weapons and cyber-lit plating'
            : 'a personal-scale mech beside or behind the pilot, cockpit lit';
      return `MECH REQUIRED IN FRAME: ${scale} — a gundam-class humanoid war-machine. The pilot is FLESH-AND-BLOOD HUMAN in a flight-suit/coat, NEVER cybernetic, NEVER fused with the mech.`;
    },
  },
  Android: {
    // Retained human touchpoints anchor identity across the human→transcendent
    // form escalation (Bible §Android identity locks).
    mandatorySegment(sheet) {
      const anchor =
        'ANDROID IDENTITY ANCHORS (kept across ranks): the chassis silhouette, plate pattern, optic color, and retained human touchpoints (a preserved human-like feature, a kept scar/mark) must read as the SAME machine-person.';
      return sheet.rank === 'Ascendant'
        ? `${anchor} Even fully transcended, these anchors are echoed.`
        : anchor;
    },
  },
};

export function getPortraitHooks(archetype: ArchetypeName): ArchetypePortraitHooks | undefined {
  return ARCHETYPE_PORTRAIT_HOOKS[archetype];
}

/** The archetype's pose-prefix override, or null to use the generic prefix. */
export function hookPosePrefix(sheet: CharacterSheet): string | null {
  const fn = getPortraitHooks(sheet.archetype)?.posePrefix;
  const out = fn ? fn(sheet) : '';
  return out && out.trim().length > 0 ? out : null;
}

/** The archetype's mandatory segment, or '' if none. */
export function hookMandatorySegment(sheet: CharacterSheet): string {
  const fn = getPortraitHooks(sheet.archetype)?.mandatorySegment;
  return fn ? fn(sheet) : '';
}

/** The archetype's narrative anchor, or '' if none. */
export function hookNarrativeAnchor(sheet: CharacterSheet): string {
  const fn = getPortraitHooks(sheet.archetype)?.narrativeAnchor;
  return fn ? fn(sheet) : '';
}
