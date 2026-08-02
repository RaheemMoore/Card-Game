/**
 * Generated art candidates, with provenance and my read on each.
 *
 * This is the review queue the Ability Theater renders. Every row carries what
 * it cost, what tool made it, the seed, and a plain-language verdict — because
 * the acquisition contract requires provenance on anything that reaches
 * `candidate`, and because a contact sheet with no reasoning under it asks
 * Raheem to guess what he is looking at.
 *
 * `verdict` is MY assessment, written before he looks. It is there to be
 * argued with — if I say a piece works and it plainly does not, that is the
 * useful outcome, and it is cheaper to find here than after a batch of forty.
 *
 * ## Shipped vs. pending review
 *
 * Through Batch H this file only ever held ONE list, because review happened
 * one element at a time: generate, write it up, Raheem looks, it ships or it
 * doesn't, move to the next element. `KEPT_BY_ELEMENT` is that list, and the
 * gallery badges everything in it "✓ in the game".
 *
 * A batch that generates many elements before anyone looks needs a second
 * list — `PENDING_REVIEW`, same `KeptElement` shape, badged "pending review"
 * instead. Nothing moves into `KEPT_BY_ELEMENT` on my own say-so; an element's
 * entry is cut from `PENDING_REVIEW` and pasted into `KEPT_BY_ELEMENT` only
 * after Raheem has actually looked at it, the same promotion this file always
 * did, just batched instead of one at a time.
 */

import type { ElementName } from '../../types/bible';

export type CandidateVerdict = 'recommend' | 'reject' | 'undecided';

export interface ArtCandidate {
  id: string;
  file: string;
  /** Native pixel size. */
  size: number;
  label: string;
  /** What this piece is FOR, in plain language. */
  what: string;
  /** Why it was generated — the variable it was testing. */
  testing: string;
  verdict: CandidateVerdict;
  /** My reasoning, shown under the image. */
  why: string;
  provenance: {
    tool: string;
    jobId: string;
    seed: number;
    generationCost: number;
  };
  /** True for pieces meant to repeat along a path. Drives the tiling test. */
  tileable: boolean;
}

const ROOT = '/assets/combat/effects/_candidates/batch-a';

export const BATCH_A: readonly ArtCandidate[] = [
  {
    id: 'blood_segment_pixen32',
    file: `${ROOT}/1-pixen32-blood-segment.png`,
    size: 32,
    label: 'Blood lash segment — Pixen, 32px',
    what: 'One repeating chunk of the blood whip’s body. Nine of these laid along a curve would BE the lash.',
    testing: 'Baseline: can the model make a piece rather than a thing?',
    verdict: 'reject',
    why:
      'It came back as a finished object — a curved claw or horn with both ends closed off and resolved. ' +
      'That is exactly the failure the sprite director predicted before we spent anything. It looks decent ' +
      'on its own, which is the trap: tile it and the closed ends collide into a row of separate hooks ' +
      'instead of one continuous whip.',
    provenance: { tool: 'create_image_pixen', jobId: '7cb613b7', seed: 7331, generationCost: 1 },
    tileable: true,
  },
  {
    id: 'blood_segment_pixflux32',
    file: `${ROOT}/2-pixflux32-blood-segment.png`,
    size: 32,
    label: 'Blood lash segment — Pixflux, 32px',
    what: 'The same piece, from the other cheap model. Identical prompt and seed.',
    testing: 'Model A/B — which engine suits small effect pieces?',
    verdict: 'reject',
    why:
      'Better MATERIAL than Pixen — it reads as a wet ribbon rather than a horn, which is the right ' +
      'language for blood. But it is still a complete object with two finished tapered ends, so it tiles ' +
      'no better. Worth knowing: for this kind of piece Pixflux gives the truer substance, and that is a ' +
      'permanent finding for one generation.',
    provenance: { tool: 'create_image_pixflux', jobId: '5f995715', seed: 7331, generationCost: 1 },
    tileable: true,
  },
  {
    id: 'blood_segment_pixen64',
    file: `${ROOT}/3-pixen64-blood-segment.png`,
    size: 64,
    label: 'Blood lash segment — Pixen, 64px',
    what: 'The same piece at double resolution, to be shrunk back down in game.',
    testing: 'Does a bigger canvas buy detail, or just a different mistake?',
    verdict: 'reject',
    why:
      'The extra room made it MORE solid, not more useful — it reads as a leather cuff or a bracelet. ' +
      'The wetness that makes blood blood is gone entirely. Useful negative result: for pieces this small, ' +
      'a larger canvas does not help; the model just fills the space with mass.',
    provenance: { tool: 'create_image_pixen', jobId: '6a3e3075', seed: 7331, generationCost: 1 },
    tileable: true,
  },
  {
    id: 'blood_impact_pixen64',
    file: `${ROOT}/4-pixen64-blood-impact.png`,
    size: 64,
    label: 'Blood impact burst — Pixen, 64px',
    what: 'The splash at the moment the lash lands on the boss. Drawn once, at the point of contact.',
    testing: 'Does a self-contained piece succeed where a repeating one fails?',
    verdict: 'recommend',
    why:
      'This is the one that works, and it works well. Radial splatter, heavy rounded droplets flung ' +
      'outward, dark crimson with a wet highlight — it is specifically BLOOD rather than a generic red ' +
      'burst, and it would read as blood with the colour turned off. The reason it succeeded is the ' +
      'reason the others failed: an impact IS a complete object, so asking the model for a complete ' +
      'object was the right question.',
    provenance: { tool: 'create_image_pixen', jobId: '439190a0', seed: 7331, generationCost: 1 },
    tileable: false,
  },
  {
    id: 'blood_tip_pixen32',
    file: `${ROOT}/5-pixen32-blood-tip.png`,
    size: 32,
    label: 'Blood lash tip — Pixen, 32px',
    what: 'The leading end of the whip — the part that arrives first and strikes.',
    testing: 'Can a piece be made that orients correctly along the curve?',
    verdict: 'undecided',
    why:
      'Reads more as a claw than as the end of a whip, and it points hard in one direction, which fights ' +
      'the code rotating it to follow the curve. Not obviously wrong though — as the head of a lash that ' +
      'is meant to hook and bite, a claw shape may be right. This is the one I would genuinely like your ' +
      'call on rather than mine.',
    provenance: { tool: 'create_image_pixen', jobId: 'c746d368', seed: 7331, generationCost: 1 },
    tileable: false,
  },
  {
    id: 'fire_segment_pixen32',
    file: `${ROOT}/6-pixen32-fire-segment.png`,
    size: 32,
    label: 'Fire lash segment — Pixen, 32px',
    what: 'The same body piece, but Fire instead of Blood.',
    testing: 'Does the style hold when the material changes — or is every element bespoke work?',
    verdict: 'reject',
    why:
      'Same structural failure — it is a whole flame icon, not a fragment. But the transfer test PASSED ' +
      'on its own terms: bright core, dark ember edge, jagged forks, and unmistakably fire next to the ' +
      'blood pieces. So the material language does carry across elements with only the words changed. ' +
      'That matters: it means the remaining elements are cheap once the piece SHAPE is solved.',
    provenance: { tool: 'create_image_pixen', jobId: 'b2acd255', seed: 7331, generationCost: 1 },
    tileable: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Batch B — the gushing stream                                       */
/* ------------------------------------------------------------------ */

const ROOT_B = '/assets/combat/effects/_candidates/batch-b';

export const BATCH_B: readonly ArtCandidate[] = [
  {
    id: 'blood_stream_strip',
    file: `${ROOT_B}/1-blood-stream-strip.png`,
    size: 128,
    label: 'Blood stream tile — Pixen, 128×32',
    what:
      'One tile of the jet. The stream is built from however many of these fit between the ' +
      'card and the boss, scrolling toward the target — which is why it works at any distance.',
    testing:
      'The whole Batch A failure: can the model return a TEXTURE rather than a finished object?',
    verdict: 'recommend',
    why:
      'It came back as an actual band — continuous from edge to edge, no resolved tip, no ' +
      'tapering. That is the thing four probes in Batch A could not do, and the difference was ' +
      'the prompt: "no ends, no tip, no tapering". The scalloped lower edge and the wet ' +
      'highlights along its length give it real material identity at the size it renders. ' +
      'Even if its two ends did not match perfectly, mirror-tiling makes the seam impossible ' +
      'to see, so this cannot fail the way the segments did.',
    provenance: { tool: 'create_image_pixen', jobId: 'a3feb0b1', seed: 7331, generationCost: 1 },
    tileable: true,
  },
  {
    id: 'blood_stream_churn',
    file: `${ROOT_B}/stream-f3.png`,
    size: 128,
    label: 'Blood stream churn — animate_image, 9 frames',
    what:
      'The same tile animated so the blood moves WITHIN the band. Scrolling alone slides a ' +
      'texture along; this makes it boil as it travels.',
    testing: 'Does animate_image hold a texture together, or does it drift into a new shape?',
    verdict: 'recommend',
    why:
      'Approved on sight (Raheem, 2026-08-01). The highlights travel and the scallops shift, ' +
      'giving the internal life that scrolling alone cannot supply. The band does thin around ' +
      'the middle frames — I flagged that as a possible pulse — and in motion it reads as a ' +
      'pumping artery rather than a glitch, which for Blood is better than the even flow I was ' +
      'aiming for. Frame 3 shown; all nine are on disk and swap on the tiles as they scroll.',
    provenance: { tool: 'animate_image', jobId: '288ba71c', seed: 7331, generationCost: 1 },
    tileable: true,
  },
];

export const BATCH_B_COST = BATCH_B.reduce((n, c) => n + c.provenance.generationCost, 0);

/* ------------------------------------------------------------------ */
/*  Batch C — Water, on the proven recipe                              */
/* ------------------------------------------------------------------ */

const ROOT_C = '/assets/combat/effects/_candidates/batch-c';

export const BATCH_C: readonly ArtCandidate[] = [
  {
    id: 'water_stream_strip',
    file: `${ROOT_C}/water-stream.png`,
    size: 128,
    label: 'Water stream tile — Pixen, 128×32',
    what: 'The same piece as the Blood tile, in water. Tiled and scrolled along the beam.',
    testing: 'Does the recipe transfer to a second element, or was Blood a lucky roll?',
    verdict: 'recommend',
    why:
      'Transferred first try with only the material words changed. And it is the right kind ' +
      'of different: rolling foam crests along the top edge where Blood is a smooth beaded ' +
      'band. That is a SILHOUETTE difference, so the two are distinguishable with the colour ' +
      'turned off — which is the Bible rule this whole system exists to satisfy. Scrolls ' +
      'faster than Blood too, because water is thin and blood is not.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '4e8d8d15 / fae1eb10', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'water_impact',
    file: `${ROOT_C}/water-impact.png`,
    size: 64,
    label: 'Water splash — Pixen, 64×64',
    what: 'The splash where the jet lands, animated over 9 frames as a one-shot.',
    testing: 'Can the impact read as water rather than as blue blood?',
    verdict: 'recommend',
    why:
      'An upward crown with foam and flung droplets, where Blood is a flat radial splatter — ' +
      'water throws itself UP off a surface and blood does not. Again a shape difference ' +
      'rather than a colour one. It does not loop, because a splash resolves once; it parks ' +
      'on its final frame and sits on the boss for the whole aftermath.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '61a3ca07 / e5053dab', seed: 7331, generationCost: 2 },
    tileable: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Batch D — became Infernal (generated as Fire, rehomed)             */
/* ------------------------------------------------------------------ */

const ROOT_D = '/assets/combat/effects/_candidates/batch-d';

export const BATCH_D: readonly ArtCandidate[] = [
  {
    id: 'infernal_stream_strip',
    file: `${ROOT_D}/infernal-stream.png`,
    size: 128,
    label: 'Infernal stream tile — Pixen, 128×32',
    what: 'The third stream tile. Same code, same tiling, same scroll — different substance.',
    testing: 'Third element on the same recipe: is this now a reliable process rather than luck?',
    verdict: 'recommend',
    why:
      'Jagged tongues licking upward along the top edge, against Water rounded foam crests ' +
      'and Blood smooth beads — three elements, three distinct top edges. Fire is also the ' +
      'only one of the three whose CORE is brighter than its EDGE; everything else is darker ' +
      'in the middle. That inversion is most of why it reads as fire with the colour off, and ' +
      'it is the strongest no-colour cue we have got so far.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '3eaf75f7 / ff35770c', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'infernal_impact',
    file: `${ROOT_D}/infernal-impact.png`,
    size: 64,
    label: 'Infernal burst — Pixen, 64×64',
    what: 'The burst where the jet lands, animated over 9 frames as a one-shot.',
    testing: 'Three impacts on one page — do they survive being seen together?',
    verdict: 'recommend',
    why:
      'A spiked starburst, against Water upward crown and Blood flat radial splatter. Put ' +
      'the three side by side with the colour hidden and they are still three different ' +
      'events, which is the whole claim the material axis was built to make. Nothing here is ' +
      'carried by hue.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'b8626cb3 / e0b8333f', seed: 7331, generationCost: 2 },
    tileable: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Batch E — Fire, re-briefed as something that is not a liquid       */
/* ------------------------------------------------------------------ */

const ROOT_E = '/assets/combat/effects/_candidates/batch-e';

export const BATCH_E: readonly ArtCandidate[] = [
  {
    id: 'fire_stream_wispy',
    file: `${ROOT_E}/fire-stream.png`,
    size: 128,
    label: '2 · Stream — the blast',
    what: 'Fire’s beam: thin feathery streamers blown sideways, not a pressurised jet.',
    testing: 'Can a stream read as AIRY when the technique was built for liquids?',
    verdict: 'recommend',
    why:
      'The fix turned out to be one parameter. Every previous tile was generated with a ' +
      'selective outline, which is what made them solid and hose-like; asking for lineless ' +
      'gave translucent feathery streamers instead. Paired with the new wisp flow — reduced ' +
      'opacity, a glow, and a per-tile vertical wobble so the band undulates rather than ' +
      'running dead flat — it reads as blown flame rather than orange water.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '98af3835 / ef54825c', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'fire_impact_spread',
    file: `${ROOT_E}/fire-impact.png`,
    size: 64,
    label: '3 · Impact — the spread',
    what: 'A low wide sheet of flame with tongues licking up, spreading along the surface.',
    testing: 'Getting away from the firecracker read.',
    verdict: 'recommend',
    why:
      'Took two attempts, and the first is worth recording: asking for "a burst of flame ' +
      'spreading outward" produced another radial starburst, because burst and outward both ' +
      'point the model at a firework. The reroll only worked with explicit negations — NOT a ' +
      'star, NOT radial, NOT symmetrical, wider than it is tall. Fire spreads ALONG a surface ' +
      'rather than detonating off it, which is now what separates it from Infernal.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'de0b4445 / 8c09a86e', seed: 4412, generationCost: 3 },
    tileable: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Batch F — Nature, the element that does not travel                 */
/* ------------------------------------------------------------------ */

const ROOT_F = '/assets/combat/effects/_candidates/batch-f';

export const BATCH_F: readonly ArtCandidate[] = [
  {
    id: 'nature_wrap',
    file: `${ROOT_F}/nature-wrap.png`,
    size: 128,
    label: '2 · Wrap — roots binding the target',
    what:
      'A tileable band of roots, laid ACROSS the boss rather than along a path — the same ' +
      'tile technique, turned ninety degrees.',
    testing: 'Does the tiling trick work for wrapping a target, not just crossing a gap?',
    verdict: 'recommend',
    why:
      'Wrapping turned out to be the same problem as streaming — a texture repeated over an ' +
      'arbitrary span — so it needed no new contract, just the existing band tiled ' +
      'horizontally over the target with the same mirror-flip. Slowest fps in the set on ' +
      'purpose: vines writhe, they do not churn.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '5cbe54bc / 5f6125dc', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'nature_bloom',
    file: `${ROOT_F}/nature-bloom.png`,
    size: 64,
    label: '3 · Bloom — a plant forms on the boss',
    what: 'A tangle of vines splaying outward with a flower opening at its centre.',
    testing: 'Can an impact read as something GROWING rather than something detonating?',
    verdict: 'recommend',
    why:
      'This is the beat that makes Nature different from everything else: the ability does ' +
      'not merely hurt the target, it colonises it. Every other impact in the set is an event ' +
      'that happens and fades — this one leaves a living thing behind, which is exactly what ' +
      '"weakened" should look like.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '8e0fe3c1 / b5dfd8a8', seed: 4412, generationCost: 2 },
    tileable: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Batch G — Shadow, the hardest no-colour test                       */
/* ------------------------------------------------------------------ */

const ROOT_G = '/assets/combat/effects/_candidates/batch-g';

export const BATCH_G: readonly ArtCandidate[] = [
  {
    id: 'shadow_stream',
    file: `${ROOT_G}/shadow-stream.png`,
    size: 128,
    label: '2 · Stream — the pull',
    what: 'A band of smoke with an edge that frays into nothing rather than terminating.',
    testing:
      'Blood and Shadow share the `umbral` damage type. Can they be told apart with the ' +
      'colour off?',
    verdict: 'recommend',
    why:
      'Nine elements resolve as umbral — Blood, Shadow, Void, Bone, Nocturne, Sanguine, ' +
      'Dream, Psychic, Infernal — so if any two are separable only by hue the whole material ' +
      'axis is decoration. This is authored as Blood\'s structural opposite: Blood has a ' +
      'defined glossy edge with heavy beads and bright specular; this has no edge at all and ' +
      'almost no highlight. The cue is VALUE and EDGE, both of which survive greyscale.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '929a61ee / 2794ecc6', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'shadow_impact',
    file: `${ROOT_G}/shadow-impact-v3.png`,
    size: 64,
    label: '3 · Impact — the dispersal',
    what: 'Curling tendrils radiating outward from a dark centre, like ink in water.',
    testing: 'Three attempts. Can shadow disperse without reading as WEATHER?',
    verdict: 'undecided',
    why:
      'Two rejects first, both the same failure: a cloud with a tail hanging off it. "It’s ' +
      'okay for it to look like a cloud or a haze, but not that little tail. Shadow is not ' +
      'weather." The word `cloud` in a prompt reliably returns a cloud WITH A BASE, and adding ' +
      '"no rain, no tail" did not shift it — dropping the word entirely and asking for ink ' +
      'dispersing in water did. This one is definitely not weather. My honest worry is the ' +
      'opposite failure: the even radial symmetry may read as TENTACLES rather than wisps. ' +
      'Held as a still rather than animated until you call the shape — animating an unapproved ' +
      'silhouette is how you pay twice.',
    provenance: { tool: 'create_image_pixen', jobId: 'ae983f8a (v3 of 3)', seed: 5150, generationCost: 3 },
    tileable: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Batch H — Sanguine, the first solid                                */
/* ------------------------------------------------------------------ */

const ROOT_H = '/assets/combat/effects/_candidates/batch-h';

export const BATCH_H: readonly ArtCandidate[] = [
  {
    id: 'sanguine_shard',
    file: `${ROOT_H}/sanguine-shard.png`,
    size: 32,
    label: '2 · Volley — thrown crystal',
    what:
      'One shard, thrown five times with a stagger and a tumble. Not a beam: separate solid ' +
      'objects with air between them.',
    testing: 'Can a delivery be made of DISCRETE objects rather than a continuous body?',
    verdict: 'recommend',
    why:
      'This is the batch that pays back the Batch A failure. PixelLab insists on returning ' +
      'finished objects with resolved edges, which is exactly why lash segments could not be ' +
      'made — but a crystal shard SHOULD be a finished object, so the failure mode becomes ' +
      'the feature. It is also a still rather than a flipbook on purpose: crystal has no ' +
      'internal motion, and animating it would contradict the material.',
    provenance: { tool: 'create_image_pixen', jobId: 'fe32b415', seed: 7331, generationCost: 1 },
    tileable: false,
  },
  {
    id: 'sanguine_impact',
    file: `${ROOT_H}/sanguine-impact.png`,
    size: 64,
    label: '3 · Impact — the shatter',
    what: 'Angular fragments bursting outward where the shard lands.',
    testing: 'Does crystal read as HARD next to five soft materials?',
    verdict: 'recommend',
    why:
      'Geometric facets and hard glints, against wet splatter, foam crown, flame sheet and ' +
      'smoke bloom — it is unmistakably a different substance. My one reservation, stated ' +
      'plainly: it is radial like Infernal’s starburst, so those two are separated by faceted ' +
      'vs rayed rather than by overall shape. That is a real difference but a narrower one ' +
      'than the rest of the set enjoys, and worth a look when you compare them.',
    provenance: { tool: 'create_image_pixen', jobId: 'f9cd9cf2', seed: 4412, generationCost: 1 },
    tileable: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Batch I — the half-batch: ten elements, one review sitting          */
/* ------------------------------------------------------------------ */

/**
 * Ten elements generated in one pass (2026-08-01), against a 50-generation
 * budget Raheem approved for "the half batch" of the 20 elements authored
 * that same day in `materialKits.ts`: Earth, Storm, Void, Ice, Metal, Cosmic,
 * Plasma, Light, Nanite, Bone. 44 generations spent — confirmed against the
 * PixelLab balance (596 → 640), not hand-counted.
 *
 * This is the first batch built for the NEW review flow — nothing here has
 * been looked at yet, which is the whole point of `PENDING_REVIEW`. Every
 * `verdict` below is my own read, offered to be argued with, same as every
 * batch before it — the difference is there are ten of them to look at in one
 * sitting instead of one.
 *
 * Three findings that cut across more than one element, worth stating once
 * instead of six times below:
 *
 * 1. **PixelLab defaults hard to a spiky radial burst for "fragments bursting
 *    outward."** Earth, Metal and Bone's impacts all came back as some
 *    variant of a spiked urchin shape, differentiated mainly by palette
 *    rather than silhouette — Storm, Ice, Void, Cosmic, Light and Plasma's
 *    impacts escaped it (asking for a bloom, a flare, a crystal spike or a
 *    starburst by name steers away from it; asking for generic "fragments" or
 *    "shrapnel" does not). Flagged per-candidate below rather than silently
 *    accepted.
 * 2. **The Cosmic stream animation reports `transparent: False — auto (input
 *    is opaque)`** — the still frame it was built from is fine, but the
 *    animated result may composite as an opaque box rather than blending
 *    over the arena. Needs a check in the theater before this one ships.
 * 3. **Three stream tiles needed a reroll** (Light came back as a golden vine
 *    with thorns; Cosmic's first pass put a bright cluster at one end,
 *    fighting the "no ends" rule; Plasma's first pass was jagged lightning
 *    rather than a coherent tube) — all fixed by naming the wrong shape and
 *    explicitly forbidding it, the same technique that fixed Shadow's
 *    "cloud with a tail" in Batch G. Restated here because it is now three
 *    for three: naming the failure mode beats describing the target harder.
 */

const ROOT_I = '/assets/combat/effects/_candidates/batch-i';

export const BATCH_I: readonly ArtCandidate[] = [
  {
    id: 'earth_stream',
    file: `${ROOT_I}/earth-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the hurl',
    what: 'A band of jagged rock plates, continuous left to right, animated grinding against each other.',
    testing: 'Does the tiled-stream recipe transfer to a heavy, blocky material?',
    verdict: 'recommend',
    why:
      'Came back as an actual chain of overlapping stone chunks — chunky, grey-brown, no ' +
      'obvious ends, and no lava glow (the thing that would make it read as Infernal instead). ' +
      'Animates as plates shifting against each other, which is the right amount of motion for ' +
      'something heavy: it grinds, it does not flow.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'e305592a / 5d477528', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'earth_impact',
    file: `${ROOT_I}/earth-impact.png`,
    size: 64,
    label: '3 · Impact — the shatter',
    what: 'Rock fragments bursting outward where the hit lands.',
    testing: 'Can splintering rock avoid the generic radial-burst default?',
    verdict: 'undecided',
    why:
      'Grey-brown and unmistakably mineral, but it came back as an even, spiky urchin — the ' +
      'default shape PixelLab reaches for on "fragments bursting outward" regardless of ' +
      'material, and Metal fell into the same default (see the batch-level note above). Bible ' +
      'EARTH wants "blocky-heavy," not a starburst of thin spikes. Kept as a still rather than ' +
      'animated pending your call on whether it needs a reroll first.',
    provenance: { tool: 'create_image_pixen', jobId: '854d651a', seed: 7331, generationCost: 1 },
    tileable: false,
  },
  {
    id: 'storm_stream',
    file: `${ROOT_I}/storm-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the arc',
    what: 'A band of forked blue-white lightning, animated crackling.',
    testing: 'Does the new branching_bolt silhouette actually read as lightning rather than a generic wave?',
    verdict: 'recommend',
    why:
      'A genuine jagged zigzag chain rather than a smooth ribbon — the first real test of ' +
      '`branching_bolt`, the silhouette added specifically so Storm would not share Fire’s ' +
      'tapering-tongue shape, and it delivered. The animation shifts the zigzag rather than ' +
      'just brightening it, which reads as current moving through the bolt.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '945541bc / 65bc8fb2', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'storm_impact',
    file: `${ROOT_I}/storm-impact-anim.png`,
    size: 64,
    label: '3 · Impact — the strike',
    what: 'A burst of forked electric arcs where the bolt lands.',
    testing: 'Does the impact stay electric rather than sliding into the same default as Earth/Metal?',
    verdict: 'recommend',
    why:
      'Escaped the spiky-urchin default — the rays are softer and more irregular than Earth’s ' +
      'or Metal’s, and the saturated blue-white against a bright core reads as electricity ' +
      'rather than shrapnel. Animates crackling outward then fading to a soft glow, which is a ' +
      'believable arc-then-dissipate rather than a hard punch.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'f28eb5a1 / 8f2ea0f0', seed: 7331, generationCost: 2 },
    tileable: false,
  },
  {
    id: 'void_stream',
    file: `${ROOT_I}/void-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the pull',
    what: 'A band of dark smoke fraying at both edges, animated curling and drifting.',
    testing: 'Shadow already owns fraying_smoke — can Void share the silhouette and still be told apart?',
    verdict: 'recommend',
    why:
      'A continuous asymmetric tendril, closer to black than Shadow’s charcoal-purple, with a ' +
      'faint violet undertone rather than Shadow’s pale lavender highlight. The two are close ' +
      'enough that this is a genuine judgment call rather than an obvious win — worth comparing ' +
      'directly against Shadow’s Batch G stream with colour hidden before calling it settled.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'e2944f9b / b13a128a', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'void_impact',
    file: `${ROOT_I}/void-impact-anim.png`,
    size: 64,
    label: '3 · Impact — the unmaking',
    what: 'A dark bloom of absence expanding where the hit lands, wisps curling in and out.',
    testing: 'Can Void’s impact read as absence rather than as a dark version of an ordinary burst?',
    verdict: 'recommend',
    why:
      'The strongest impact in this batch. Wispy violet-black tendrils radiating from total ' +
      'darkness, and the animation genuinely pulses and dissipates rather than punching once — ' +
      'it looks like something swallowing light rather than something exploding, which is ' +
      'exactly the Bible VOID brief.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'ab17a348 / e987392f', seed: 7331, generationCost: 2 },
    tileable: false,
  },
  {
    id: 'ice_stream',
    file: `${ROOT_I}/ice-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the freeze',
    what: 'A band of packed faceted ice crystals, animated shimmering.',
    testing: 'Does faceted_shard read as a coherent jet rather than loose gravel?',
    verdict: 'recommend',
    why:
      'A tight chain of angular pale-blue gems, clearly crystalline and clearly cold. Shares its ' +
      'silhouette with Sanguine on purpose (both are crystal) and is told apart by being a ' +
      'continuous jet rather than discrete thrown shards — the animation’s shimmer sells the ' +
      '"packed together, moving as one body" read Sanguine’s still shard does not need.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'fe3bbb84 / d921cbcb', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'ice_impact',
    file: `${ROOT_I}/ice-impact-anim.png`,
    size: 64,
    label: '3 · Impact — the shatter',
    what: 'Sharp crystal spikes bursting outward where the jet lands.',
    testing: 'Can a crystalline impact avoid the generic-burst default the way Storm and Void did?',
    verdict: 'recommend',
    why:
      'A bright white-blue faceted starburst — sharper and more angular than Storm’s electric ' +
      'burst or Sanguine’s garnet shatter, and the coldest-reading piece in the whole set. ' +
      'Animates bursting outward and settling, with the spikes visibly catching light frame to ' +
      'frame rather than just fading.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '1520e5e1 / 20933bf9', seed: 7331, generationCost: 2 },
    tileable: false,
  },
  {
    id: 'metal_stream',
    file: `${ROOT_I}/metal-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the bolt',
    what: 'A band of polished grey-silver metal with segmented rivets, animated glinting.',
    testing: 'Does smooth_bolt read as a rigid machined jet rather than an organic ribbon?',
    verdict: 'undecided',
    why:
      'Reads as metal — rigid, geometric, rivets rather than facets — but it came back closer to ' +
      'a segmented ROD or pipe than a repeating band: two bulbous ball-joint ends are visible, ' +
      'which is the exact "resolved object, not a texture" failure the whole Batch A/B ' +
      'technique exists to avoid. Mirror-tiling should hide it, but this is the one candidate in ' +
      'the batch I would specifically ask you to check at the tiling-test zoom before trusting it.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '6e2918bb / c8010c5a', seed: 7331, generationCost: 2 },
    tileable: true,
  },
  {
    id: 'metal_impact',
    file: `${ROOT_I}/metal-impact.png`,
    size: 64,
    label: '3 · Impact — the shrapnel',
    what: 'Metal fragments and sparks bursting outward where the hit lands.',
    testing: 'Second attempt at escaping the spiky-urchin default this batch fell into twice.',
    verdict: 'undecided',
    why:
      'Grey-silver with gold sparks, which does the job on palette — but the silhouette is the ' +
      'same spiky-urchin default Earth’s impact fell into, and the two sit close enough together ' +
      'that colour is doing more of the separating work than shape is. Kept as a still pending a ' +
      'decision on whether Earth, Metal or both get a reroll.',
    provenance: { tool: 'create_image_pixen', jobId: 'b5c8ae8d', seed: 7331, generationCost: 1 },
    tileable: false,
  },
  {
    id: 'cosmic_stream',
    file: `${ROOT_I}/cosmic-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the drift',
    what: 'A band of indigo starfield with scattered gold stars, animated twinkling.',
    testing: 'Can a nebula read as continuous rather than as a comet with a bright head?',
    verdict: 'undecided',
    why:
      'The first attempt put a bright starburst cluster at the right edge — a resolved "head," ' +
      'which is an end by another name — and asking explicitly for even density with no cluster ' +
      'fixed it on the reroll shown here. The remaining problem is technical, not visual: this ' +
      'animation reports `transparent: False — auto (input is opaque)`, which likely means it ' +
      'composites as an opaque box rather than blending over the arena. Needs a check in the ' +
      'theater before it ships regardless of how the art itself reads.',
    provenance: {
      tool: 'create_image_pixen + animate_image',
      jobId: '7ba2f0c1 (reroll of 6ae5c874) / 5e8e797d',
      seed: 4412,
      generationCost: 3,
    },
    tileable: true,
  },
  {
    id: 'cosmic_impact',
    file: `${ROOT_I}/cosmic-impact-anim.png`,
    size: 64,
    label: '3 · Impact — the bloom',
    what: 'A nebula bloom expanding outward, calm rather than explosive.',
    testing: 'Bible COSMIC is explicit this must NOT read as a violent burst — can it still read as an impact at all?',
    verdict: 'recommend',
    why:
      'The best single piece in the batch. A jewel-toned flower opening outward rather than ' +
      'detonating — it is calm, vast and unmistakably cosmic, and the animation genuinely ' +
      'blooms rather than punching and fading. This is what "gentle radiant expansion, NOT ' +
      'violent" asked for and every other impact in the game so far has been some kind of burst.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'f9cfa704 / b12afba8', seed: 7331, generationCost: 2 },
    tileable: false,
  },
  {
    id: 'plasma_stream',
    file: `${ROOT_I}/plasma-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the beam',
    what: 'A smooth tube of cyan-white plasma energy with a violet core, animated pulsing.',
    testing: 'Can a coherent energy beam avoid reading as Storm’s lightning?',
    verdict: 'undecided',
    why:
      'The first attempt came back jagged — reads as Storm, not Plasma, which would have ' +
      'defeated the entire point of authoring `contained` as its own charge form. Explicitly ' +
      'forbidding "zigzag" and "lightning" on the reroll fixed the coherence completely: this is ' +
      'a genuinely smooth glowing tube now, with the wave inside pulsing in the animation rather ' +
      'than static. The open issue is a violet orb visible at the left end — reads as a resolved ' +
      'end-cap rather than a repeating texture, which mirror-tiling usually saves but is worth ' +
      'your eye at the tiling-test zoom.',
    provenance: {
      tool: 'create_image_pixen + animate_image',
      jobId: 'd6d1c1e1 (reroll of 347733d4) / 8507214e',
      seed: 4412,
      generationCost: 3,
    },
    tileable: true,
  },
  {
    id: 'plasma_impact',
    file: `${ROOT_I}/plasma-impact-anim.png`,
    size: 64,
    label: '3 · Impact — the flare',
    what: 'A bright cyan-magenta plasma flare bursting outward, refracting at the edges.',
    testing: 'Does refracting_flare give Plasma a distinct payoff from Ice’s and Holy’s uses of the same impact type?',
    verdict: 'recommend',
    why:
      'Energetic and clearly synthetic — the cyan-to-magenta mix and the thin numerous rays ' +
      'separate it from Ice’s cooler white-blue burst and Holy’s softer stained-glass flare. ' +
      'Animates pulsing outward with real energy rather than a single static flash.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: '4cefa930 / 3875c0d7', seed: 7331, generationCost: 2 },
    tileable: false,
  },
  {
    id: 'light_stream',
    file: `${ROOT_I}/light-stream-anim.png`,
    size: 128,
    label: '2 · Stream — the ray',
    what: 'A band of golden-white radiant beads, animated shimmering.',
    testing: 'Can radiant energy be generated without the model reaching for a plant?',
    verdict: 'undecided',
    why:
      'The first attempt came back as a golden vine with thorns and leaves — completely wrong ' +
      'material, fixed only once the reroll explicitly forbade "vine," "plant," "thorns" and ' +
      '"leaves" by name. What it produced instead is a string of golden diamond beads: warm, ' +
      'radiant, and genuinely distinct from every other stream in the game, but a beaded chain ' +
      'rather than the smooth continuous beam the brief asked for. Worth your call on whether ' +
      'that reads as Light or needs a third attempt.',
    provenance: {
      tool: 'create_image_pixen + animate_image',
      jobId: 'f47a4d1f (reroll of 72dc9241) / 30982ccd',
      seed: 4412,
      generationCost: 3,
    },
    tileable: true,
  },
  {
    id: 'light_impact',
    file: `${ROOT_I}/light-impact-anim.png`,
    size: 64,
    label: '3 · Impact — the sunburst',
    what: 'A sharp many-pointed starburst of golden-white light.',
    testing: 'Does `sunburst` read as sharper than Holy’s `refracting_flare`, the way it was designed to?',
    verdict: 'recommend',
    why:
      'Thin, numerous, piercing rays — visibly sharper and more pointed than Holy’s softer ' +
      'stained-glass flare, which was the entire reason `sunburst` was authored as its own ' +
      'impact type rather than reusing Holy’s. Animates flashing outward and settling into a ' +
      'scatter of sparkles, which reads as the light dispersing rather than just fading.',
    provenance: { tool: 'create_image_pixen + animate_image', jobId: 'e0913fd5 / 7436c1a9', seed: 7331, generationCost: 2 },
    tileable: false,
  },
  {
    id: 'nanite_shard',
    file: `${ROOT_I}/nanite-shard.png`,
    size: 32,
    label: '2 · Volley — thrown fragment',
    what: 'One small robotic fragment, thrown in a swarm with a stagger and a tumble.',
    testing: 'Can a mechanical fragment be generated without the model defaulting to crystal?',
    verdict: 'recommend',
    why:
      'The first attempt came back as an ice-blue gem — the model reached for Ice or Sanguine’s ' +
      'crystal language despite an explicit "mechanical nanobot" description, which is worth ' +
      'remembering: a material request alone was not enough, and it took an explicit "NOT a ' +
      'crystal, NOT a gem" to break the pull. The reroll shown here is a proper grey metal chip ' +
      'with rivets and a cyan light — reads mechanical, not crystalline.',
    provenance: { tool: 'create_image_pixen', jobId: '53d7fa25 (reroll of e2ebb188)', seed: 4412, generationCost: 2 },
    tileable: false,
  },
  {
    id: 'nanite_impact',
    file: `${ROOT_I}/nanite-impact.png`,
    size: 64,
    label: '3 · Impact — the scatter',
    what: 'A ring of tiny mechanical fragments bursting outward where the swarm lands.',
    testing: 'Can Nanite’s impact read as a SWARM rather than a single explosion — Bible’s "never one big machine" applied to the impact, not just the delivery?',
    verdict: 'recommend',
    why:
      'The most distinct silhouette in the whole set: a ring of small discrete particle-dots ' +
      'around a dark core, rather than any variety of burst or flare. Reads as a scatter of many ' +
      'small things rather than one large detonation, which is exactly the "swarm, never one big ' +
      'machine" instruction Bible NANITE repeats for every other part of this element.',
    provenance: { tool: 'create_image_pixen', jobId: '3b400e88', seed: 7331, generationCost: 1 },
    tileable: false,
  },
  {
    id: 'bone_shard',
    file: `${ROOT_I}/bone-shard.png`,
    size: 32,
    label: '2 · Volley — thrown fragment',
    what: 'One bone fragment, thrown in a volley with a stagger and a tumble.',
    testing: 'Does a bone shard read as its own material rather than a recolour of Sanguine’s crystal or Nanite’s metal?',
    verdict: 'recommend',
    why:
      'A curved, pale ivory claw-or-tooth shape — organic rather than faceted or machined, which ' +
      'is the right call: Bone should not share Sanguine’s hard-crystal geometry even though both ' +
      'are `volley` deliveries of a solid fragment. Reads recognizably as bone at a glance.',
    provenance: { tool: 'create_image_pixen', jobId: '642e5e13', seed: 7331, generationCost: 1 },
    tileable: false,
  },
  {
    id: 'bone_impact',
    file: `${ROOT_I}/bone-impact.png`,
    size: 64,
    label: '3 · Impact — the splinter',
    what: 'Bone fragments splintering outward where the shard lands.',
    testing: 'Third and last test of whether "fragments bursting outward" can escape the spiky-urchin default.',
    verdict: 'undecided',
    why:
      'Pale ivory against Earth’s grey-brown and Metal’s grey-gold, which does separate it by ' +
      'palette — but this is the third impact this batch to come back as the same spiky-urchin ' +
      'silhouette (see the batch-level note above), and three from ten is a real pattern, not ' +
      'noise. If Earth or Metal get a reroll to break the default, worth trying the same fix here.',
    provenance: { tool: 'create_image_pixen', jobId: '572eda6b', seed: 7331, generationCost: 1 },
    tileable: false,
  },
];

export const BATCH_I_COST = BATCH_I.reduce((n, c) => n + c.provenance.generationCost, 0);

/* ------------------------------------------------------------------ */
/*  What actually shipped                                              */
/* ------------------------------------------------------------------ */

/**
 * The kept pieces, in the order the player sees them.
 *
 * The gallery renders this and nothing else. Rejected candidates stay in the
 * batch arrays above with their provenance — that record is what stops a
 * failed experiment being re-run — but they are not shown, because scrolling
 * past four versions of the same failure is clutter, not review.
 *
 * The charge tell is the missing first part and is deliberately absent here:
 * it has no image at all, being drawn in code from the material kit, so the
 * gallery renders it as its own card.
 */
export interface KeptElement {
  element: ElementName;
  /** One line on what this element brought that the others did not. */
  note: string;
  generations: number;
  candidates: readonly ArtCandidate[];
}

/**
 * Every finished element, in the order they were built.
 *
 * Element-driven rather than a hardcoded section per material, so the next one
 * is a row here and nothing else — which mirrors what adding an element
 * actually costs in the engine, and stops this page drifting out of step with
 * the manifest it describes.
 */
export const KEPT_BY_ELEMENT: readonly KeptElement[] = [
  {
    element: 'Blood',
    note:
      'The first, and the expensive one — 8 generations, 6 of them spent learning that the ' +
      'generator returns finished objects and will not make repeating pieces.',
    generations: 8,
    candidates: [
      { ...pick(BATCH_B, 'blood_stream_strip'), label: '2 · Stream — the blast' },
      { ...pick(BATCH_B, 'blood_stream_churn'), label: '2b · Stream churn — internal flow' },
      { ...pick(BATCH_A, 'blood_impact_pixen64'), label: '3 · Impact — the splash' },
    ],
  },
  {
    element: 'Water',
    note:
      'Proved the recipe transfers. Rolling foam crests and an upward crown, where Blood is ' +
      'a smooth beaded band and a flat splatter.',
    generations: 4,
    candidates: [
      { ...pick(BATCH_C, 'water_stream_strip'), label: '2 · Stream — the blast' },
      { ...pick(BATCH_C, 'water_impact'), label: '3 · Impact — the splash' },
    ],
  },
  {
    element: 'Fire',
    note:
      'Re-briefed after the first attempt came back as lava (which became Infernal). Fire is ' +
      'not a liquid: it catches rather than pools, blows rather than sprays, and spreads along ' +
      'a surface rather than detonating off it.',
    generations: 5,
    candidates: BATCH_E,
  },
  {
    element: 'Infernal',
    note:
      'The lava set, generated as "Fire" and rehomed. Kept its liquid behaviour — it pools ' +
      'and pours where Fire catches and blows, which is why two elements in the same damage ' +
      'family share none of their movement.',
    generations: 4,
    candidates: [
      { ...pick(BATCH_D, 'infernal_stream_strip'), label: '2 · Stream — the pour' },
      { ...pick(BATCH_D, 'infernal_impact'), label: '3 · Impact — the spark' },
    ],
  },
  {
    element: 'Nature',
    note:
      'The only element that does not travel. Roots erupt from the ground AROUND the boss and ' +
      'wrap it, rather than being fired at it — a different sentence from every other ability, ' +
      'which is the point.',
    generations: 4,
    candidates: BATCH_F,
  },
  {
    element: 'Shadow',
    note:
      'The hardest no-colour test yet: nine elements resolve as umbral damage, so Shadow is ' +
      'authored as Blood’s structural opposite — no edge at all where Blood has a glossy one, ' +
      'and an impact that hangs over the target rather than resolving.',
    generations: 4,
    candidates: BATCH_G,
  },
  {
    element: 'Sanguine',
    note:
      'The first SOLID. A vampire hardens their own blood and throws it — so the delivery is ' +
      'a volley of discrete shards with air between them, not a continuous body. Every field ' +
      'is chosen against Blood, the element it is most likely to collapse into.',
    generations: 2,
    candidates: BATCH_H,
  },
  {
    element: 'Earth',
    note:
      'The first of Batch I, and the first test of the new `jagged_block` silhouette. The ' +
      'stream reads as heavy stacked rock; the impact fell into the spiky-urchin default the ' +
      'batch-level note describes — approved anyway, worth a reroll later (Raheem, 2026-08-02).',
    generations: 3,
    candidates: [pick(BATCH_I, 'earth_stream'), pick(BATCH_I, 'earth_impact')],
  },
  {
    element: 'Storm',
    note:
      'First real test of `branching_bolt`, authored specifically so lightning would not share ' +
      'Fire’s tapering-tongue shape. Both pieces landed clean on the first attempt — no rerolls.',
    generations: 4,
    candidates: [pick(BATCH_I, 'storm_stream'), pick(BATCH_I, 'storm_impact')],
  },
  {
    element: 'Void',
    note:
      'Shares Shadow’s `fraying_smoke` silhouette on purpose — both are formless umbral absence ' +
      '— and is told apart by value and undertone rather than shape. The impact is the strongest ' +
      'single result in the batch.',
    generations: 4,
    candidates: [pick(BATCH_I, 'void_stream'), pick(BATCH_I, 'void_impact')],
  },
  {
    element: 'Ice',
    note:
      'Shares Sanguine’s `faceted_shard` silhouette (both crystal) and is told apart by being a ' +
      'continuous jet rather than a discrete thrown volley. Both pieces landed clean, no rerolls.',
    generations: 4,
    candidates: [pick(BATCH_I, 'ice_stream'), pick(BATCH_I, 'ice_impact')],
  },
  {
    element: 'Metal',
    note:
      'The stream came back closer to a segmented rod than a repeating band — approved anyway, ' +
      'worth checking at the tiling-test zoom — and the impact fell into the same spiky-urchin ' +
      'default as Earth. Human’s only element.',
    generations: 3,
    candidates: [pick(BATCH_I, 'metal_stream'), pick(BATCH_I, 'metal_impact')],
  },
  {
    element: 'Cosmic',
    note:
      'The stream needed a reroll to remove a bright "head" cluster. The impact is the best ' +
      'single piece in the whole batch — a calm bloom, not a burst, exactly per Bible.',
    generations: 5,
    candidates: [pick(BATCH_I, 'cosmic_stream'), pick(BATCH_I, 'cosmic_impact')],
  },
  {
    element: 'Plasma',
    note:
      'Mech Pilot’s sole element, and the first test of the new `contained` charge form. The ' +
      'stream needed a reroll after coming back as lightning instead of a smooth tube. Raheem, ' +
      'on the visible end-cap orb: "I do not think that\'s a mistake, I like the opaque look of ' +
      'it" — kept as-is, no further reroll.',
    generations: 5,
    candidates: [pick(BATCH_I, 'plasma_stream'), pick(BATCH_I, 'plasma_impact')],
  },
  {
    element: 'Light',
    note:
      'The stream came back as a golden vine with thorns on the first attempt — completely wrong ' +
      'material — and the reroll produced a beaded chain rather than a smooth beam. Approved as ' +
      'reading radiant either way. The impact is clean.',
    generations: 5,
    candidates: [pick(BATCH_I, 'light_stream'), pick(BATCH_I, 'light_impact')],
  },
  {
    element: 'Bone',
    note:
      'Necromancer’s exclusive element. The shard reads as bone rather than a recolour of ' +
      'Sanguine’s crystal or Nanite’s metal, which was the point of giving it an organic rather ' +
      'than faceted or machined shape. The impact is the third to fall into the spiky-urchin ' +
      'default this batch.',
    generations: 2,
    candidates: [pick(BATCH_I, 'bone_shard'), pick(BATCH_I, 'bone_impact')],
  },
  {
    element: 'Nanite',
    note:
      'Android’s sole natural element. The shard needed a reroll after coming back as an ice ' +
      'crystal instead of a machine part. The impact is the most distinct silhouette in the ' +
      'whole set — a scatter ring, never a burst, matching the "swarm, never one big machine" ' +
      'Bible instruction.',
    generations: 3,
    candidates: [pick(BATCH_I, 'nanite_shard'), pick(BATCH_I, 'nanite_impact')],
  },
];

/**
 * The batch review queue — generated, not yet looked at.
 *
 * Empty right now: Batch I shipped (2026-08-02, Raheem: "Alright. I like
 * them. Let's go ahead and move on to the next.") after one real fix along
 * the way — the beam was fading out during the impact stage instead of
 * holding through it, caught by watching a real cast in `/battle`, not by
 * anything visible in this static gallery. Next batch lands here the same
 * way the last one did.
 */
export const PENDING_REVIEW: readonly KeptElement[] = [];

export const PENDING_GENERATIONS = PENDING_REVIEW.reduce((n, g) => n + g.generations, 0);

function pick(batch: readonly ArtCandidate[], id: string): ArtCandidate {
  const found = batch.find((c) => c.id === id);
  if (!found) throw new Error(`artCandidates: no candidate ${id}`);
  return found;
}

const ALL = [...BATCH_A, ...BATCH_B, ...BATCH_C, ...BATCH_D, ...BATCH_E, ...BATCH_F, ...BATCH_G, ...BATCH_H, ...BATCH_I];
const KEPT_IDS = new Set([
  'blood_stream_strip', 'blood_stream_churn', 'blood_impact_pixen64',
  'water_stream_strip', 'water_impact',
  'infernal_stream_strip', 'infernal_impact',
  'fire_stream_wispy', 'fire_impact_spread',
  'nature_wrap', 'nature_bloom',
  'shadow_stream', 'shadow_impact',
  'sanguine_shard', 'sanguine_impact',
  'earth_stream', 'earth_impact',
  'storm_stream', 'storm_impact',
  'void_stream', 'void_impact',
  'ice_stream', 'ice_impact',
  'metal_stream', 'metal_impact',
  'cosmic_stream', 'cosmic_impact',
  'plasma_stream', 'plasma_impact',
  'light_stream', 'light_impact',
  'bone_shard', 'bone_impact',
  'nanite_shard', 'nanite_impact',
]);

export const REJECTED_COUNT = ALL.filter((c) => !KEPT_IDS.has(c.id)).length;
export const TOTAL_GENERATIONS = ALL.reduce((n, c) => n + c.provenance.generationCost, 0);

export const BATCH_B_FINDING =
  'Asking for a texture instead of an object worked — the tile is a continuous band, and ' +
  'mirror-tiling means its seam cannot show. The open question is the churn: it moves well ' +
  'but thins mid-loop, so it may pulse rather than flow.';

/**
 * What I think the batch taught us, as one sentence I would defend.
 *
 * Deliberately stated as a claim rather than a summary — if it is wrong,
 * Raheem can say so in one word, and that is worth more than a paragraph of
 * hedging.
 */
export const BATCH_A_FINDING =
  'PixelLab makes excellent self-contained moments and cannot make repeating path pieces — ' +
  'so the whip BODY should stay code-drawn, and generated art should be spent on impacts, ' +
  'residue and ground tells, which is where it is already winning.';

export const BATCH_A_COST = BATCH_A.reduce((n, c) => n + c.provenance.generationCost, 0);
