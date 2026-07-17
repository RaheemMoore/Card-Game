import type { ArchetypeName } from '../types/card';

export interface ArchetypeDefinition {
  name: ArchetypeName;
  identity: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  motifs: string;
  rankProgression: {
    Foundation: string;
    Forged: string;
    Ascendant: string;
  };
}

export const ARCHETYPES: Record<ArchetypeName, ArchetypeDefinition> = {
  Barbarian: {
    name: 'Barbarian',
    identity: 'Raw physical power, primal warrior',
    palette: { primary: '#8B6914', secondary: '#4a4a4a', accent: '#b91c1c' },
    motifs: 'Fur/hide pieces, tribal scarification, war paint, crude iron weapons',
    rankProgression: {
      Foundation: 'Minimal furs and wraps, simple weapons',
      Forged: 'Partial hide-and-bone armor, battle scars',
      Ascendant: 'Full war-regalia with trophies and totems',
    },
  },
  Monk: {
    name: 'Monk',
    identity: 'Discipline, inner control, martial mastery',
    palette: { primary: '#92400e', secondary: '#78716c', accent: '#dc2626' },
    motifs: 'Simple robes, wrapped hands, prayer beads, subtle energy',
    rankProgression: {
      Foundation: 'Simple robe, bare feet',
      Forged: 'Reinforced wraps and sash, visible training marks',
      Ascendant: 'Ornate ceremonial robe with visible chi/energy manifestation',
    },
  },
  Beastmaster: {
    name: 'Beastmaster',
    identity: 'Wild, feral, bonded to nature and animal companionship',
    palette: { primary: '#166534', secondary: '#78350f', accent: '#a16207' },
    motifs: 'Animal pelts, claw markings, feather/fang jewelry, leather straps',
    rankProgression: {
      Foundation: 'Simple leathers, basic animal bond',
      Forged: 'Animal-hide armor with trophies',
      Ascendant: 'Full beast-totem regalia with spectral animal companion',
    },
  },
  Druid: {
    name: 'Druid',
    identity: 'Nature magic, balance, restoration',
    palette: { primary: '#14532d', secondary: '#78350f', accent: '#ca8a04' },
    motifs: 'Living vines, wooden staff, leaf/floral patterning, antlers',
    rankProgression: {
      Foundation: 'Simple robe with basic staff',
      Forged: 'Vine-wrapped armor, growing power',
      Ascendant: 'Living armor fused with bloom and antlers, glowing nature energy',
    },
  },
  Necromancer: {
    name: 'Necromancer',
    identity: 'Dark magic, death, forbidden knowledge',
    palette: { primary: '#1a1a1a', secondary: '#e5e5e5', accent: '#4ade80' },
    motifs: 'Skulls, tattered robes, dark runes, ghostly energy wisps',
    rankProgression: {
      Foundation: 'Tattered robe, first dark runes',
      Forged: 'Bone-adorned robe with dark energy aura',
      Ascendant: 'Full death-lord regalia with spectral effects',
    },
  },
  Vampire: {
    name: 'Vampire',
    identity: 'Dark charisma, aristocratic predator',
    palette: { primary: '#991b1b', secondary: '#171717', accent: '#d4d4d8' },
    motifs: 'Ornate gothic clothing, cape, fangs, pale skin, red eyes',
    rankProgression: {
      Foundation: 'Simple dark attire, subtle predator presence',
      Forged: 'Ornate gothic coat, growing dark power',
      Ascendant: 'Full regal vampiric regalia with blood-mist effects',
    },
  },
  Lycanthrope: {
    name: 'Lycanthrope',
    identity: 'Shape-shifting hunter blessed by the Moon Goddess — man and wolf are two forms of the same devotion. The transformation IS the character, becoming MORE lupine at higher ranks, never more human. Their lycan form is a gift, not a curse.',
    palette: { primary: '#6b7280', secondary: '#f5f5f4', accent: '#f59e0b' },
    motifs: 'Escalating wolf anatomy (mane and wolfish tells → full snout and fur → digitigrade lupine warrior), scarred human skin fading under fur, torn practical clothing that survives the shift, twin curved blades or extending claws, an identity token (dog-tags, cord pendant, scar pattern) preserved across every form, moon iconography that grows more prominent by rank (small pendant → visible sky moon → moonlight aura and moon-sigil in armor filigree)',
    rankProgression: {
      Foundation: 'Near-human primal warrior blessed by the Moon Goddess — shirtless muscular frame, long unkempt mane and beard in their fur color, only SUBTLE wolfish features (slightly elongated canines, faintly glowing eyes matching their moon phase, pointed ear tips), primitive leather kilt and armored bracers, twin curved blades. A small moon-shaped scar, tattoo, or pendant hints at the goddess\'s blessing. Setting: misty forest or moonlit clearing. The wolf is still mostly under the skin.',
      Forged: 'MID-SHIFT HYBRID (non-negotiable at this tier): fully anatomical wolf head (real snout, real fur in their fur color, real ears — never a mask). Fur spreading visibly down the shoulders, upper back, and forearms — no longer just hair. Fingers ending in visible dark CLAWS, not fingernails. The old six-pack human torso is broken up by patches of fur and stretched, changing skin — NOT a clean bodybuilder chest. Identity token rests on the bare chest between fur patches. Torn practical clothing hangs off, splitting at the seams. The moon of their phase visible in the sky behind them. The seam between human and wolf is NOT smoothed over.',
      Ascendant: 'FULLY ANTHROPOMORPHIC WOLF-LORD blessed by the Moon Goddess (non-negotiable at this tier): DIGITIGRADE legs (backward-bent knees, walks on toes) — mandatory. Visible WOLF TAIL emerging from the back of the armor. Full body covered in fur in their fur color — no exposed human abs, no gym-body definition; unarmored zones show fur and canine musculature. Hands are pawed with long TALONS. FUR PATTERN reads as a battle-record: silver moonlight veins through the fur, scarred patches where fur grows back lighter, silver streaks at the temples, matted ruff around the neck. Articulated dark plate armor with silver moon-sigil filigree. Silver moonlight AURA cascades from their form. Moon of their phase dominates the composition. Identity token from earlier ranks still hangs at belt or throat. This is a NOBLE PREDATOR chosen by a goddess — obviously not-human, but not a rampaging beast.',
    },
  },
  'Mech Pilot': {
    name: 'Mech Pilot',
    identity: 'Armored technology, heavy combat suit — the machine is the character',
    palette: { primary: '#6b7280', secondary: '#2563eb', accent: '#ea580c' },
    motifs: 'Exposed hydraulics, glowing tech panels, HUD visor, heavy plating, cabling, integrated weaponry',
    rankProgression: {
      Foundation: 'Partial exosuit frame, exposed cabling and hydraulics, tactical HUD visor, gauntlet-mounted controls, visibly a pilot inside light armor',
      Forged: 'Half-integrated with a heavier mech chassis, shoulder-mounted cannon, thicker armor plates, reinforced legs, cabling glowing along the arms, more machine than pilot',
      Ascendant: 'Fully piloting a MASSIVE mech-suit — towering armored frame dominates the composition, glowing power core visible in chest, multiple integrated weapon systems live (shoulder cannons, arm-mounted rail gun, missile pods), heat vapor vents from shoulders, HUD light projecting from visor, the pilot is nearly invisible inside the machine. This is a WAR MACHINE, not a person in armor.',
    },
  },
  Android: {
    name: 'Android',
    identity: 'Synthetic being, post-human precision — MORE machine at higher ranks, never more human',
    palette: { primary: '#e5e7eb', secondary: '#f8fafc', accent: '#06b6d4' },
    motifs: 'Visible mechanical joints and seams, glowing circuit lines under and through the skin, exposed chassis panels, energy core, gleaming metal frame, synthetic voice-modulator plating',
    rankProgression: {
      Foundation: 'Sleek humanoid chassis with some synthetic skin, glowing circuit lines visible beneath, mechanical joints exposed at neck and wrists, a single glowing eye or optic array',
      Forged: 'Half the skin panels retracted or removed — endoskeleton frame gleaming, multiple glowing circuit lines pulsing across the face and torso, mechanical joints obvious at every articulation, modular weapon-arm visible, more chassis than skin',
      Ascendant: 'Fully synthetic combat form — NO organic-looking skin remains, gleaming polished metal chassis, blazing energy core in chest visible through open panels, exposed circuitry across the face, kinetic shielding shimmering, holographic tactical display floating around the head, detached hovering weapon-limbs. Pure post-human machine. NOT humanoid, NOT soft, NOT organic-looking — an APEX SYNTHETIC.',
    },
  },
  Seraph: {
    name: 'Seraph',
    identity: 'Radiant holy power, righteous protector',
    palette: { primary: '#ca8a04', secondary: '#fefce8', accent: '#bfdbfe' },
    motifs: 'Feathered wings, halo, ornate golden armor, light rays',
    rankProgression: {
      Foundation: 'Simple white garb with small wings',
      Forged: 'Partial golden armor with larger wings',
      Ascendant: 'Full radiant regalia with complete wingspan and halo',
    },
  },
  Human: {
    name: 'Human',
    identity: 'Grounded, no fantasy embellishment — the realistic option',
    palette: { primary: '#78716c', secondary: '#a8a29e', accent: '#d6d3d1' },
    motifs: 'Realistic athletic wear, minimal accessories, no supernatural elements',
    rankProgression: {
      Foundation: 'Basic athletic wear',
      Forged: 'Performance gear, trained physique',
      Ascendant: 'Premium elite athletic gear — elite, not magical',
    },
  },
};

export function getArchetype(name: ArchetypeName): ArchetypeDefinition {
  return ARCHETYPES[name];
}
