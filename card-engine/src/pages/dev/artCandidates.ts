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
 */

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
export const KEPT: readonly ArtCandidate[] = [
  { ...pick(BATCH_B, 'blood_stream_strip'), label: '2 · Stream — the blast' },
  { ...pick(BATCH_B, 'blood_stream_churn'), label: '2b · Stream churn — internal flow' },
  { ...pick(BATCH_A, 'blood_impact_pixen64'), label: '3 · Impact — the splash' },
];

/** The same three parts, in Water. */
export const KEPT_WATER: readonly ArtCandidate[] = [
  { ...pick(BATCH_C, 'water_stream_strip'), label: '2 · Stream — the blast' },
  { ...pick(BATCH_C, 'water_impact'), label: '3 · Impact — the splash' },
];

function pick(batch: readonly ArtCandidate[], id: string): ArtCandidate {
  const found = batch.find((c) => c.id === id);
  if (!found) throw new Error(`artCandidates: no candidate ${id}`);
  return found;
}

const ALL = [...BATCH_A, ...BATCH_B, ...BATCH_C];
const KEPT_IDS = new Set([
  'blood_stream_strip', 'blood_stream_churn', 'blood_impact_pixen64',
  'water_stream_strip', 'water_impact',
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
