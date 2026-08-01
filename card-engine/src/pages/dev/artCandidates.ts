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
    verdict: 'undecided',
    why:
      'The highlights genuinely travel and the scallops shift, which is exactly the internal ' +
      'life the scroll cannot supply on its own. But the band thins and breaks up around the ' +
      'middle frames, so a loop may pulse rather than flow. Whether that reads as a pumping ' +
      'artery — which would be perfect for Blood — or as a glitch is a judgement call, and ' +
      'it is genuinely yours. Frame 3 is shown; all nine are on disk.',
    provenance: { tool: 'animate_image', jobId: '288ba71c', seed: 7331, generationCost: 1 },
    tileable: true,
  },
];

export const BATCH_B_COST = BATCH_B.reduce((n, c) => n + c.provenance.generationCost, 0);

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
