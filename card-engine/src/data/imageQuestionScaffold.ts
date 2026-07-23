/**
 * ⚠️ TEMPORARY — IMAGE-QUESTION SCAFFOLD (Raheem 2026-07-22). ⚠️
 *
 * RECOMMENDED, THROWAWAY idea-starter questions for the image-first ritual —
 * NOT final content and NOT wired into the live forge flow. Raheem is writing
 * brand-new questions for every archetype; this scaffold exists to (1) show the
 * dual-channel idea (each option reads as story but secretly pins an image
 * `ImageDirective`), and (2) reveal which visual dimensions each archetype needs
 * a question for. The team reviews and REPLACES these. Nothing imports this
 * module — reference artifact only. Ids reference identityPools.ts,
 * archetypeWeapons.ts (weapon), and archetypeCompanions.ts (companion).
 *
 * Dimensions covered per archetype (a question may target more than one):
 *   BODY    → build / age / mark            (all 11)
 *   WEAPON  → weapon                          (all 11)
 *   POWER   → elementExpression / bearing     (all 11; element itself is still the
 *                                              separate element+bond pick — see note)
 *   FORM    → species (human vs non-human)    (7 archetypes with a bespoke form)
 *   COMPANY → solitary vs leads a retinue      (5 archetypes with a companion pool)
 */
import type { ArchetypeName } from '../types/card';
import type { ImageDirective } from '../types/bible';

export interface ScaffoldOption {
  /** Reads as story to the player. */
  text: string;
  /** What it secretly pins for the portrait. */
  image: ImageDirective;
}

export type ScaffoldDimension = 'body' | 'weapon' | 'power' | 'form' | 'company';

export interface ScaffoldQuestion {
  dimension: ScaffoldDimension;
  prompt: string;
  /** For the team: notes / what's still missing. */
  note: string;
  options: readonly ScaffoldOption[];
}

export const IMAGE_QUESTION_SCAFFOLD: Record<ArchetypeName, readonly ScaffoldQuestion[]> = {
  Barbarian: [
    { dimension: 'body', prompt: "The clans read a warrior's story in their body. What does yours tell?", note: 'build + mark + age. Rooted-mortal.', options: [
      { text: 'I am the avalanche — vast, slow, unstoppable.', image: { build: 'towering' } },
      { text: 'Short, wide, rooted; no charge has ever moved me.', image: { build: 'stout' } },
      { text: 'My weight is my wall — I outlast what I cannot outrun.', image: { build: 'chubby' } },
      { text: 'Iron rebuilt my jaw after the wound that should have ended me.', image: { mark: 'iron_jaw_plate', age: 'mature' } },
    ] },
    { dimension: 'weapon', prompt: 'What do you carry when the clan calls you to stand?', note: 'weapon.', options: [
      { text: 'The blade my ancestors carried before me.', image: { weapon: 'ancestor_blade' } },
      { text: 'A great two-handed oath-axe.', image: { weapon: 'oath_axe' } },
      { text: 'A hearth-hammer that has broken shields and doors alike.', image: { weapon: 'hearth_hammer' } },
    ] },
    { dimension: 'power', prompt: 'When your fury breaks loose, how does it show?', note: 'elementExpression (intensity/placement — element chosen separately).', options: [
      { text: 'It erupts from my chest and fists in a shockwave.', image: { elementExpression: 'erupting outward from the chest and fists', bearing: 'roaring, mid-charge' } },
      { text: 'It smolders close, a held storm behind the eyes.', image: { elementExpression: 'a tight, restrained aura held close to the body' } },
      { text: 'It runs down the weapon and into the ground.', image: { elementExpression: 'channeled down the weapon into cracking earth' } },
    ] },
  ],
  Monk: [
    { dimension: 'body', prompt: 'The discipline shapes the body over decades. How has it shaped yours?', note: 'build + mark + age. Rooted-mortal.', options: [
      { text: 'Spare and hollowed by long fasting, sharp as a blade.', image: { build: 'hollowed' } },
      { text: 'Soft-bodied but perfectly balanced — stillness is my strength.', image: { build: 'chubby' } },
      { text: 'My eyes clouded years ago; I walk the path without them.', image: { mark: 'clouded_seer_eyes', age: 'ancient' } },
    ] },
    { dimension: 'weapon', prompt: 'What does your training place in your hands?', note: 'weapon.', options: [
      { text: 'A worn practice staff, nothing more, nothing less.', image: { weapon: 'practice_staff' } },
      { text: 'A folding iron fan, deceptive and precise.', image: { weapon: 'iron_fan' } },
      { text: 'Only my open hands and wrapped gauntlets.', image: { weapon: 'open_hand_gauntlets' } },
    ] },
    { dimension: 'power', prompt: 'When your center opens, how does the power move?', note: 'elementExpression.', options: [
      { text: 'It ripples out in calm concentric rings.', image: { elementExpression: 'calm concentric rings rippling outward', bearing: 'serene, mid-form' } },
      { text: 'It gathers to a single point in the palm.', image: { elementExpression: 'gathered to a single focused point in one palm' } },
    ] },
  ],
  Beastmaster: [
    { dimension: 'body', prompt: 'A life in the wild marks the body. How does yours read?', note: 'build + mark.', options: [
      { text: 'Broad and weather-worn, built to match my pack.', image: { build: 'broad' } },
      { text: 'Lean and sun-browned from the long trails.', image: { build: 'lean' } },
      { text: 'One hand was maimed to a claw by the beast I love most.', image: { mark: 'beast_maimed_claw_hand' } },
    ] },
    { dimension: 'form', prompt: 'How much of the beast has entered you?', note: 'species (human vs beast-touched).', options: [
      { text: 'None — I am fully human, the bond is in my heart.', image: { species: 'humanoid' } },
      { text: 'It is beginning to show — fur, fangs, animal eyes.', image: { species: 'beast_touched' } },
    ] },
    { dimension: 'weapon', prompt: 'What do you carry alongside your bond?', note: 'weapon.', options: [
      { text: 'A long pack-spear.', image: { weapon: 'pack_spear' } },
      { text: 'A trail-bow for the far shot.', image: { weapon: 'trail_bow' } },
      { text: 'A totem-staff hung with the tokens of my beasts.', image: { weapon: 'totem_staff' } },
    ] },
    { dimension: 'company', prompt: 'Do you walk alone, or move with your bonded beasts?', note: 'solitary vs leads.', options: [
      { text: 'Alone — the bond does not need to be seen.', image: { companionPresence: 'solitary' } },
      { text: 'A powerful war-beast moves in step with me.', image: { companion: 'war_beast' } },
      { text: 'A great beast wheels in the sky above me.', image: { companion: 'flying_beast' } },
    ] },
  ],
  Druid: [
    { dimension: 'body', prompt: 'The forest works on you slowly. What does it show?', note: 'build + mark.', options: [
      { text: 'Broad and rooted, gnarled like old oak.', image: { build: 'broad' } },
      { text: 'Willow-thin and eerie, swaying with unfelt wind.', image: { build: 'willowy' } },
      { text: 'One arm has regrown as living bark and green wood.', image: { mark: 'bark_grown_limb' } },
    ] },
    { dimension: 'form', prompt: 'How far into the forest have you gone?', note: 'species (human vs tree-melded).', options: [
      { text: 'I still wear a human shape and speak for the wood.', image: { species: 'humanoid' } },
      { text: 'I am half-tree now — bark, roots, and canopy for hair.', image: { species: 'tree_melded' } },
    ] },
    { dimension: 'weapon', prompt: 'What does the grove place in your hand?', note: 'weapon.', options: [
      { text: 'A living staff still budding with green.', image: { weapon: 'living_staff' } },
      { text: 'A curved thorn-sickle.', image: { weapon: 'thorn_sickle' } },
      { text: 'A censer trailing spores and pollen.', image: { weapon: 'spore_censer' } },
    ] },
    { dimension: 'power', prompt: 'When nature answers you, how does it arrive?', note: 'elementExpression.', options: [
      { text: 'On a spiraling wind of leaves and petals around me.', image: { elementExpression: 'a spiraling wind of leaves and petals circling the body' } },
      { text: 'Rising up out of the ground at my feet.', image: { elementExpression: 'surging up from the ground around the feet' } },
    ] },
  ],
  Necromancer: [
    { dimension: 'body', prompt: 'Crossing the boundary costs the body. What did it take?', note: 'build + mark + age.', options: [
      { text: 'Hollow-eyed and parchment-thin from sleepless study.', image: { build: 'hollowed' } },
      { text: 'A steady soul-light shines through a gap in my ribs.', image: { mark: 'soul_light_rib_gap' } },
      { text: 'I have not aged since the day I died; I am preserved.', image: { age: 'mummified' } },
    ] },
    { dimension: 'form', prompt: 'How much flesh have you traded away?', note: 'species (human vs flesh-traded-bone).', options: [
      { text: 'I keep my flesh; the dead answer me anyway.', image: { species: 'humanoid' } },
      { text: 'I traded flesh for bone — I am half-skeleton now.', image: { species: 'flesh_traded_bone' } },
    ] },
    { dimension: 'weapon', prompt: 'What focuses your work with the dead?', note: 'weapon.', options: [
      { text: 'A grave-scythe.', image: { weapon: 'grave_scythe' } },
      { text: 'A reliquary staff heavy with bound souls.', image: { weapon: 'reliquary_staff' } },
      { text: 'A soul-lantern holding a captured light.', image: { weapon: 'soul_lantern' } },
    ] },
    { dimension: 'company', prompt: 'Do you stand alone, or attended by the dead?', note: 'solitary vs leads.', options: [
      { text: 'Alone — the dead wait unseen until I call.', image: { companionPresence: 'solitary' } },
      { text: 'Armored skeleton warriors stand at my command.', image: { companion: 'skeleton_warriors' } },
      { text: 'Drifting wraiths trail soul-mist around me.', image: { companion: 'drifting_wraiths' } },
    ] },
  ],
  Vampire: [
    { dimension: 'body', prompt: 'Centuries leave their mark on the undying. What is yours?', note: 'build + age + mark.', options: [
      { text: 'Elegant and slim, ageless and smooth.', image: { build: 'lean', age: 'mummified' } },
      { text: 'Broad and aristocratic — a predator in fine dress.', image: { build: 'broad' } },
      { text: 'Where my wings were torn away, only stumps remain.', image: { mark: 'severed_wing_stumps' } },
    ] },
    { dimension: 'form', prompt: 'What has the blood made of you?', note: 'species (human-passing vs blood-sovereign).', options: [
      { text: 'I still pass for the living, when I choose to.', image: { species: 'humanoid' } },
      { text: 'I have risen fully — a humanoid blood-sovereign in command.', image: { species: 'blood_sovereign' } },
    ] },
    { dimension: 'weapon', prompt: 'What do you carry at court and in the hunt?', note: 'weapon.', options: [
      { text: 'A bloodline rapier.', image: { weapon: 'bloodline_rapier' } },
      { text: 'A court cane that hides a blade.', image: { weapon: 'court_cane_blade' } },
      { text: 'A sanguine chalice, never empty.', image: { weapon: 'sanguine_chalice' } },
    ] },
    { dimension: 'company', prompt: 'Do you hunt alone, or hold a court?', note: 'solitary vs leads.', options: [
      { text: 'Alone — I need no witnesses.', image: { companionPresence: 'solitary' } },
      { text: 'Pale thralls kneel in attendance around me.', image: { companion: 'bloodbound_thralls' } },
      { text: 'Winged crimson familiars circle overhead.', image: { companion: 'winged_familiars' } },
    ] },
  ],
  Lycanthrope: [
    { dimension: 'body', prompt: 'The moon works on your body over time. How has it taken you?', note: 'build + mark.', options: [
      { text: 'Dense and animal-powerful even in human skin.', image: { build: 'dense' } },
      { text: 'Lean and rangy, always half-ready to run.', image: { build: 'lean' } },
      { text: 'A hunt left one hand a permanent claw.', image: { mark: 'beast_maimed_claw_hand' } },
    ] },
    { dimension: 'form', prompt: 'How far has the moon pulled you from human?', note: 'species (human vs wolf-form).', options: [
      { text: 'Mostly human, with only subtle wolfish tells.', image: { species: 'humanoid' } },
      { text: 'At the peak I am the great wolf itself, on four legs.', image: { species: 'wolf_form' } },
    ] },
    { dimension: 'weapon', prompt: 'What do you carry before the change takes you?', note: 'weapon.', options: [
      { text: 'A moonfang glaive.', image: { weapon: 'moonfang_glaive' } },
      { text: "A hunter's spear.", image: { weapon: 'hunters_spear' } },
      { text: 'A heavy pack-axe.', image: { weapon: 'pack_axe' } },
    ] },
  ],
  'Mech Pilot': [
    { dimension: 'body', prompt: "A pilot's body wears the cockpit's toll. What does yours carry?", note: 'build + marks. Rooted-mortal (pilot stays HUMAN; marks are tech, not android).', options: [
      { text: 'Compact and practical, made for a tight cockpit.', image: { build: 'stout' } },
      { text: 'A rune-and-brass arm replaced the one the mech took.', image: { mark: 'arcane_prosthetic_forearm' } },
      { text: 'One eye is a faceted crystal optic now.', image: { mark: 'crystal_optic_eye' } },
    ] },
    { dimension: 'weapon', prompt: 'What does your mech bring to the field?', note: 'weapon.', options: [
      { text: 'An arc-blade for close work.', image: { weapon: 'arc_blade' } },
      { text: 'A rotary autocannon.', image: { weapon: 'rotary_autocannon' } },
      { text: 'A barrier projector to shield the line.', image: { weapon: 'barrier_projector' } },
    ] },
    { dimension: 'company', prompt: 'Do you fight from one cockpit, or command a flight?', note: 'solitary vs leads.', options: [
      { text: 'Just me and my mech.', image: { companionPresence: 'solitary' } },
      { text: 'A flight of assault drones moves on my signal.', image: { companion: 'assault_drones' } },
      { text: 'Shield-drones hover and project a barrier.', image: { companion: 'shield_drones' } },
    ] },
  ],
  Android: [
    { dimension: 'body', prompt: 'You are a machine that remembers being more. What shows?', note: 'build + mark.', options: [
      { text: 'Sleek and humanoid, almost passing for flesh.', image: { build: 'lean' } },
      { text: 'Large-bodied and heavy-framed, industrial.', image: { build: 'dense' } },
      { text: 'Deliberately soft-bodied, built to be approachable.', image: { build: 'chubby' } },
    ] },
    { dimension: 'form', prompt: 'How much of the human shell remains?', note: 'species (humanoid vs transcendent-chassis).', options: [
      { text: 'I keep the human silhouette and my kept touchpoints.', image: { species: 'humanoid' } },
      { text: 'At my peak the shell is gone — I have transcended.', image: { species: 'transcendent_chassis' } },
    ] },
    { dimension: 'weapon', prompt: 'What is integrated into your frame?', note: 'weapon.', options: [
      { text: 'An integrated pulse-blade.', image: { weapon: 'integrated_pulse_blade' } },
      { text: 'An adaptive rifle.', image: { weapon: 'adaptive_rifle' } },
      { text: 'A hard-light shield.', image: { weapon: 'hard_light_shield' } },
    ] },
    { dimension: 'company', prompt: 'Do you operate alone, or coordinate a unit?', note: 'solitary vs leads.', options: [
      { text: 'Alone — I am enough.', image: { companionPresence: 'solitary' } },
      { text: 'Autonomous combat-robots act on my initiative.', image: { companion: 'combat_robots' } },
      { text: 'Guardian-drones hold a protective perimeter.', image: { companion: 'guardian_drones' } },
    ] },
  ],
  Seraph: [
    { dimension: 'body', prompt: 'The divine spark reshapes its vessel. How does yours read?', note: 'build + mark.', options: [
      { text: "Monumental and broad, a guardian's frame.", image: { build: 'broad' } },
      { text: 'Thin and ascetic, worn to translucence by devotion.', image: { build: 'hollowed' } },
      { text: 'Where a wing was severed, a scarred stump remains.', image: { mark: 'severed_wing_stumps' } },
    ] },
    { dimension: 'form', prompt: 'How fully has the celestial form emerged?', note: 'species (humanoid vs celestial-form). Still needs: Good/Fallen/Balanced alignment tie-in.', options: [
      { text: 'I wear a human shape and hide the light.', image: { species: 'humanoid' } },
      { text: 'I have unfurled fully — wings, halo, living light.', image: { species: 'celestial_form' } },
    ] },
    { dimension: 'weapon', prompt: 'What do you bear as the spark demands?', note: 'weapon.', options: [
      { text: 'A dawn-spear.', image: { weapon: 'dawn_spear' } },
      { text: 'A halo-blade.', image: { weapon: 'halo_blade' } },
      { text: 'A mercy-mace, meant to spare as much as strike.', image: { weapon: 'mercy_mace' } },
    ] },
  ],
  Human: [
    { dimension: 'body', prompt: 'Ordinary people carry extraordinary histories. What is written on you?', note: 'build + mark + age. Rooted-mortal, widest build range. Still needs: culture/region cues.', options: [
      { text: "Fat and visibly worked, hands like a laborer's.", image: { build: 'chubby' } },
      { text: 'Frail-looking but sharp — underestimated always.', image: { build: 'hollowed' } },
      { text: 'Tall, narrow, and a little awkward.', image: { build: 'willowy' } },
      { text: 'A stone-fused leg from an accident I walked away from.', image: { mark: 'stone_fused_leg', age: 'mature' } },
    ] },
    { dimension: 'weapon', prompt: 'What did you take up when it was time to stand?', note: 'weapon.', options: [
      { text: 'A versatile longsword.', image: { weapon: 'versatile_longsword' } },
      { text: "A soldier's spear.", image: { weapon: 'soldiers_spear' } },
      { text: 'A recurve bow.', image: { weapon: 'recurve_bow' } },
      { text: 'A tower shield to hold the line.', image: { weapon: 'tower_shield' } },
    ] },
  ],
};
