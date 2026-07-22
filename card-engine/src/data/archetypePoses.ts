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

// Weapon-NEUTRAL, and deliberately HUMANOID at every rank (Raheem 2026-07-21:
// Druids are close to ALL of nature — fungi, moss, flowers, vines, ferns — NOT
// literal tree-monsters; the human form is preserved, the nature-bond layers on
// top, and the face is NEVER grown over). Nature-affinity is present from
// Foundation (the picture must start correct). "Wood" is intentionally avoided —
// broad living growth so Leonardo picks the plant/fungal form.
const DRUID_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'striding through dappled forest light, one hand raised trailing soft green-gold nature-light, moss and small blossoms caught in the hair, layered earthy leather-and-cloak garb',
    'kneeling to press one palm to the forest floor, a ring of ferns moss and tiny mushrooms blooming outward from the touch, deep-green (moss-and-canopy) eye-glow',
    'mid-incantation with both hands cupped around a slow swirl of drifting spores and seeds, hood fallen back, earthy robes lifting on a gentle nature-wind',
    'half-turned calling to the grove, one arm outstretched as leaves and petals gather on the air toward the open hand, grounded and unhurried stance',
  ],
  Forged: [
    'sweeping one arm wide as thick vines and creeping roots erupt from the GROUND in an arc before them (growth rises from the earth, never from the body), flowering growth curling up the forearm, deep-green nature-glow',
    'both palms driven downward summoning a widening ring of ferns saplings and glowing mushrooms bursting from the earth, spores and petals spiralling upward around them',
    'mid-channel pressing a palm to a wounded trunk, green-gold light flowing into the bark as fresh moss and blossoms spread from the touch, vines climbing the forearm',
    'commanding stance with both arms raised, a nature-wind carrying leaves pollen and seeds spiralling around them, moss and small fungi spreading across one shoulder',
  ],
  Ascendant: [
    'towering at the peak of their power, crowned with antler-branches heavy with leaves and blossom, colossal roots and giant glowing fungi rising from the earth around them, face fully visible and unmistakably the same person',
    'arms flung wide as a whole ring of ancient growth erupts from the ground — massive ferns, flowering vines, shelf-fungi — a storm of spores and petals filling the air, moss and bloom mantling the frame, face preserved',
    'mid-ultimate with both hands upraised, the entire grove surging up around them in bloom, heavy vines and mushrooms over the shoulders, a corona of drifting seeds and green-gold light, humanoid silhouette and face intact',
  ],
};

// Barbarian — ROOTED MORTAL, human at every rank. Endurance, legacy, protector.
const BARBARIAN_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'planted in a wide braced stance mid-roar, one arm sweeping back as if guarding those behind them, breath visible in cold air',
    'mid-charge through wind, shoulders low and driving forward, cloak and hair streaming',
    'standing over a fallen threat, chest heaving, one fist raised in a defiant clan-cry',
    'braced against an unseen impact, feet dug in, teeth bared with sheer endurance',
  ],
  Forged: [
    'mid-strike at legendary scale, the whole body torqued into the blow, dust and debris kicked up in reaction',
    'roaring a rally to unseen kin, one arm thrown wide, storm-wind whipping around a braced stance',
    'shrugging off a blow that would fell others and driving a step forward through it, aura of raw endurance',
    'standing firm on high ground, cloak snapping, an immovable bulwark against the storm',
  ],
  Ascendant: [
    'at the peak of legend, feet cracking the ground beneath a mythic braced stance, ancestral spirits half-seen in the storm around them, still fully human',
    'mid-ultimate roar, the whole battlefield bending back from the force, arms flung wide, a legend at full power',
    'standing unbroken at the eye of a cataclysm they refuse to yield to, cloak and hair whipping, sheer will made visible',
  ],
};

// Monk — ROOTED MORTAL. Discipline, breath, precise motion.
const MONK_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'mid-form balanced on one foot, hands flowing through a disciplined stance, calm focused expression',
    'stepping through a strike with economical precision, breath visible on the air, robes settling with the motion',
    'rising fluidly from low to standing mid-technique, weight perfectly centered, gaze steady',
    'redirecting an unseen blow with a turning pivot, one palm out, perfectly composed',
  ],
  Forged: [
    'mid-flurry of perfected strikes, faint concentric rings of breath-force rippling outward, robes snapping with speed',
    'balanced impossibly on a narrow point mid-technique, a corona of disciplined motion around the hands',
    'exhaling a focused strike that visibly parts the air, the body a study in mastered control',
    'holding absolute stillness at the center of their own swirling motion, power gathered and contained',
  ],
  Ascendant: [
    'at transcendent mastery, motion-trails of a hundred perfected forms haloing a serene centered figure, the air itself moving with them',
    'mid-ultimate strike, a shockwave of pure disciplined force radiating outward from a calm unshaken stance',
    'suspended at the still point of a storm of their own motion, decades of practice manifest as light around them',
  ],
};

// Beastmaster — the bonded beast is a separate companion; poses COORDINATE with it.
const BEASTMASTER_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'leaning forward in matched motion with a bonded beast at their side, both poised mid-hunt',
    'one palm raised guiding the companion, the other braced, reading the field together',
    'kneeling forehead-to-forehead with the bonded beast in a moment of trust, power quiet between them',
    'shielding the companion\'s flank with one arm, the other outstretched at an unseen threat',
  ],
  Forged: [
    'charging in perfect concert with the bonded beast, both figures driving forward as one, dust kicked up',
    'commanding the companion with a sweep of the arm, bond-light passing between them at legendary scale',
    'back-to-back with the bonded beast against surrounding threats, both mid-motion, aura of partnership',
    'loosing a coordinated strike as the beast lunges, hunter and animal moving as one predator',
  ],
  Ascendant: [
    'at the peak of the bond, hunter and mythic beast moving as a single overwhelming force, the wild answering around them',
    'mid-ultimate with the bonded beast at full power beside them, a convergence of wildlife rallying in the background',
    'standing in total communion with the companion at mythic scale, the whole wilderness bending to the pair',
  ],
};

// Vampire — elegant humanoid predator. Feral-Foundation gate + gothic night come
// from the Vampire portrait hook; these are the sovereign/predator poses.
const VAMPIRE_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'mid-lunge with fangs bared, one hand reaching, cloak flaring behind, predatory grace',
    'floating a half-step off the ground, cloak hanging still, cold composed aristocratic bearing',
    'clawed hand raised drawing blood-mist toward the palm, elegant and controlled',
    'turning with a slow predatory smile, cloak sweeping, one hand extended in dark invitation',
  ],
  Forged: [
    'cloak unfurling into a swirl of bats mid-motion, fangs bared, blood-light gathering at the fingertips',
    'mid-blur of predatory speed, body half-erased into the motion-trail, one foot planting with authority',
    'commanding rising blood-mist with both hands, cloak flaring, sovereign bearing at legendary scale',
    'suspended in air with cloak spread like wings-of-cloth, aura of aristocratic dominance',
  ],
  Ascendant: [
    'a composed blood-sovereign in absolute command, blood-mist and bats swirling around a still figure, cloak vast behind them',
    'mid-ultimate as a storm of blood-light and mist erupts around a serene sovereign, fangs bared, total authority',
    'floating at the height of dark majesty, cloak become a cathedral of shadow, the night itself bending to them',
  ],
};

// Lycanthrope — RANK TRANSFORMATION human → wolf. The Lycan hook enforces the
// Ascendant four-legged anatomy (never horns/wings/antlers); these poses stage it.
const LYCANTHROPE_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'mostly human, tensed mid-motion with only subtle wolfish tells — yellow-gold eyes, faint elongated canines, prominent jaw — in a feral-ready crouch',
    'head lifted mid-snarl catching a scent, human still but for the gold eyes and pointed ear-tips, pack-ready stance',
    'braced low and protective, human form with the first hints of the beast in the eyes and knuckles',
    'turning sharply with a low growl, human silhouette, gold eyes flashing, hair hinting at the fur to come',
  ],
  Forged: [
    'mid-shift with fur spreading along the forearms and jaw, elongated clawed hands, digitigrade legs beginning, feral wilder posture',
    'hunched forward mid-transformation, spine arching, snout lengthening, claws out, half-human half-wolf',
    'lunging on the edge of the change, fur and claws erupting, a savage half-shifted silhouette',
    'throwing back a howl mid-shift, throat and jaw already lupine, the moon acknowledged in the sky',
  ],
  Ascendant: [
    'a giant savage wolf standing squarely on exactly four legs, horse-sized, thick fur, elongated fanged snout, tail lashing — the human silhouette barely present',
    'the full lunar-avatar wolf mid-pounce on four powerful legs, fangs bared, the moon blazing behind, colossal and savage',
    'the giant wolf-form braced on all four paws over the ground, hackles raised, a mythic beast at the peak of the moon\'s power',
  ],
};

// Mech Pilot — the pilot stays FULLY HUMAN; the Mech hook guarantees the mech is
// in frame. These stage the human pilot's action with the machine.
const MECHPILOT_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'the human pilot in a flight-suit standing beside their personal-scale mech, one hand on its plating, cockpit lit',
    'the pilot mid-vault into the cockpit, the mech looming, hands finding the controls, fully human',
    'the pilot braced in the open cockpit directing the mech\'s arm, HUD-light on their face',
    'the pilot signaling from the mech\'s shoulder, the machine\'s bulk framing them, coat snapping',
  ],
  Forged: [
    'the human pilot in the cockpit of a heavy warframe mech mid-maneuver, integrated weapons powering up, cyber-light on the plating',
    'the pilot leaning into a hard control input as the bigger mech fires, muzzle-flash and HUD glow, still fully human',
    'the pilot standing on the mech\'s forearm directing fire, the war-machine huge around them',
    'the pilot mid-command as drones and the heavier mech respond, tactical light across their human face',
  ],
  Ascendant: [
    'the still-human pilot in the cockpit of a colossal titan-class mech, all weapon systems deployed and firing, the machine tower-tall around them',
    'the pilot standing on the shoulder of a cataclysmic titan-mech mid-ultimate, energy-weapons blazing, human against a giant of steel',
    'the pilot inside a blazing overclocked titan-mech at peak power, HUD across the visor, the war-machine a mountain of force',
  ],
};

// Android — synthetic, with RETAINED HUMAN TOUCHPOINTS; the Android hook carries
// the identity-anchor mandate. Form escalates human-read → transcendent.
const ANDROID_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'a clearly synthetic humanoid mid-motion, retained human touchpoints visible — a human-like face, a preserved feature — reading more human than machine',
    'mid-precise-action with arm-tech partly deployed, a kept human expression, more person than machine',
    'turning with calculated grace, synthetic frame with intact human-like features, composed',
    'reaching out as an integrated tool deploys from the arm, human-like eyes steady, machine-body clean',
  ],
  Forged: [
    'mid-combat-action with more integrated weaponry deployed and glowing, plate patterns lit, still carrying its human touchpoints',
    'a fluid inhuman-precise strike, chassis alight with circuitry, one preserved human feature anchoring the identity',
    'projecting hard-light and directing autonomous units, synthetic body escalating, human-like face intact',
    'mid-reconfiguration of its own weaponry, machine-precise, the kept human touchpoints still visible',
  ],
  Ascendant: [
    'transcended into a chrome post-human form — multi-cored, alien geometry, distributed light — yet its identity anchors (a preserved feature, plate pattern, optic color) unmistakably the same',
    'mid-ultimate as a self-authored machine-form at full power, geometry and light unfolding, the retained human touchpoints echoed within',
    'a post-human machine-being at mythic scale, chassis silhouette and optic color preserving the same identity beneath the transcendence',
  ],
};

// Seraph — the three-path alignment anchor + rank austerity come from the Seraph
// hook; these poses are path-neutral bearing that the hook specializes.
const SERAPH_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'a composed figure in plain unbleached robes mid-step, hands open in disciplined readiness, no halo or wings yet, quiet conviction',
    'kneeling in prayer-ready stillness, plain-robed, a single lantern-light nearby, the divine spark undeclared',
    'standing guard over unseen survivors, plain robes, arms slightly spread in protection, austere',
    'lifting one hand in a warding gesture, plain-robed and disciplined, first light behind them',
  ],
  Forged: [
    'mid-motion with a single ceremonial piece over the robes and one wing or partial halo beginning to show, sacred light gathering',
    'raising a protective gesture as radiance spreads, one ceremonial piece marking the declared path',
    'shielding allies with an outspread arm, a single wing half-unfurled, light answering the chosen path',
    'stepping forward with growing authority, one ceremonial piece and a strengthening aura of the declared path',
  ],
  Ascendant: [
    'at full celestial power with wings fully spread and a burning halo, robes become living light, blazing at mythic scale',
    'mid-ultimate as full regalia and multiple wings unfurl, sacred power erupting around a commanding figure',
    'ascended to the peak of the declared path, full wings and radiant regalia, a legend of divine power',
  ],
};

// Human — ROOTED MORTAL. Ingenuity, training, decision — never a supernatural gimmick.
const HUMAN_POSES: Record<Rank, readonly string[]> = {
  Foundation: [
    'mid-motion in a decisive, grounded fighting stance, sharp determined expression, cloak or coat in motion',
    'stepping forward into a confident guard, weapon ready, reading the situation with clear eyes',
    'braced and adaptable, one hand out in a calming or commanding gesture, quick-thinking bearing',
    'mid-improvised maneuver using the terrain, resourceful and composed under pressure',
  ],
  Forged: [
    'mid-decisive-strike at the height of trained skill, coat and hair snapping with the motion, the moment seized',
    'rallying unseen allies with one arm raised, a leader\'s bearing, dust and wind kicked up',
    'turning the tide with a clever maneuver, weapon mid-motion, sharp confident focus',
    'holding the line against long odds, feet set, expression of pure resolve',
  ],
  Ascendant: [
    'at the peak of legend, a masterful decisive pose that reshapes the moment, coat billowing, no supernatural gimmick — just extraordinary human will',
    'mid-ultimate feat of skill and nerve, the whole scene turning on their single choice, commanding presence',
    'standing at the pivot of history, weapon or standard raised, an ordinary human become a legend by decision',
  ],
};

const POSE_POOLS: Partial<Record<ArchetypeName, Record<Rank, readonly string[]>>> = {
  Necromancer: NECROMANCER_POSES,
  Druid: DRUID_POSES,
  Barbarian: BARBARIAN_POSES,
  Monk: MONK_POSES,
  Beastmaster: BEASTMASTER_POSES,
  Vampire: VAMPIRE_POSES,
  Lycanthrope: LYCANTHROPE_POSES,
  'Mech Pilot': MECHPILOT_POSES,
  Android: ANDROID_POSES,
  Seraph: SERAPH_POSES,
  Human: HUMAN_POSES,
};

export function getPosePool(archetype: ArchetypeName, rank: Rank): readonly string[] {
  return POSE_POOLS[archetype]?.[rank] ?? [];
}
