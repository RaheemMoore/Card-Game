import type { ArchetypeName, Rank, CardStats, ModifierStack, CharacterIdentity, LycanthropeIdentity } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';
import { assemblePortraitPrompt } from './promptAssembler';
import {
  deriveStatRanks,
  getDominantStat,
  getOverallRank,
  getSpecializationSuffix,
  getVisualMotif,
  getAbsenceMotifs,
  getStatNames,
} from '../data/powerSystem';

const RANK_MEANINGS: Record<Rank, string> = {
  Foundation: 'The beginning — raw, unproven, rough around the edges',
  Forged: 'Transformed through trial — gaining real power and presence',
  Ascendant: 'Mastery — legendary, fully realized, elite',
};

const NAMING_STYLES = [
  'Norse-inspired (hard consonants, compound words — e.g. Thrynn, Ashvald, Grimholdt)',
  'Celtic/Gaelic (flowing vowels, soft sounds — e.g. Aelwen, Ciarán, Branwen)',
  'Japanese-inspired (short syllables, clean sounds — e.g. Kaito, Renji, Sakuya)',
  'Arabic-inspired (liquid consonants, lyrical rhythm — e.g. Khalira, Zafir, Rashaan)',
  'West African-inspired (tonal, rhythmic — e.g. Kofi, Amara, Tendaji)',
  'Slavic-inspired (sharp, angular — e.g. Volkov, Yelara, Drazhan)',
  'Latin/Roman-inspired (formal, commanding — e.g. Corvinus, Valeria, Aurelian)',
  'Persian-inspired (elegant, poetic — e.g. Daryush, Soraya, Bahram)',
  'Mesoamerican-inspired (strong syllables — e.g. Tlaloc, Ixchel, Cipactli)',
  'Sanskrit-inspired (sacred, melodic — e.g. Ashvara, Devika, Rudran)',
  'Egyptian-inspired (ancient, regal — e.g. Ankhara, Sethari, Khepren)',
  'Korean-inspired (balanced, clear — e.g. Haneul, Jiwon, Seojin)',
];

const TONE_WORDS = [
  'tragic', 'triumphant', 'haunted', 'wrathful', 'serene', 'cunning',
  'melancholic', 'feral', 'noble', 'twisted', 'stoic', 'ecstatic',
  'ruthless', 'merciful', 'desperate', 'ancient', 'rebellious', 'exiled',
  'prophetic', 'forgotten', 'vengeful', 'wise', 'corrupted', 'reborn',
];

const ORIGIN_HOOKS = [
  'orphaned during a great war and raised by strangers',
  'born under a celestial eclipse that marked them for a strange destiny',
  'once a common laborer who stumbled into forbidden power',
  'the last heir of a bloodline thought extinct',
  'a deserter from an elite order, carrying stolen knowledge',
  'awakened from centuries of slumber with no memory',
  'forged in a ritual that was never meant to succeed',
  'betrayed by their mentor at the moment of greatest trust',
  'discovered wandering the edge of a dead realm, changed forever',
  'a prodigy who burned too bright and paid the price',
  "summoned by accident during an apprentice's failed experiment",
  'the survivor of a plague that killed everyone else in their village',
  'raised in a monastery built on the ruins of something older',
  'carved from living stone by a god who then vanished',
  'a refugee from a kingdom swallowed by the sea',
  'marked by a dying dragon with a brand that still burns',
  'a twin whose other half was taken by shadow',
  'chosen by a sentient weapon that refuses all other wielders',
  'born in a prison beneath the earth, never seeing sky until adulthood',
  'the only mortal to survive a divine tribunal',
];

const LORE_THEMES = [
  'a defining sacrifice they made',
  'a rival or nemesis who shapes their journey',
  'a prophecy they are trying to fulfill or escape',
  'a weapon, artifact, or companion that defines them',
  'a place they can never return to',
  'a secret they carry that would destroy them if revealed',
  'a transformation — physical or spiritual — they underwent',
  'a debt they owe to something inhuman',
  'a battle that changed the course of a war',
  'a curse or blessing they cannot remove',
  'a student or successor they are training',
  'a creature or spirit bound to their soul',
];

const EPITHET_FLAVORS = [
  'based on a legendary deed or battle',
  'referencing a physical trait or scar',
  'named after a natural phenomenon',
  'derived from the fear they inspire',
  'from the place or realm they conquered',
  'referring to a power or ability unique to them',
  'an ironic or contradictory title',
  'a title bestowed by enemies, not allies',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

interface GeneratedText {
  cardName: string;
  nameAndTitle: string;
  lore: string;
  /** Composed image-gen prompt, capped so Leonardo Phoenix (1500-char limit) accepts it. */
  portraitPrompt: string;
  /** Composed negative prompt for the same call. */
  negativePrompt: string;
  /**
   * Fixed identity of the character. Generated at Foundation and passed back
   * on every tier-up so gender/ethnicity/hair/eyes don't drift.
   */
  identity: CharacterIdentity;
  /**
   * The input modifiers escalated to fit the new rank. Only present on
   * tier-up calls (shouldEvolve=true). Same shape as ModifierStack — keys
   * preserved, values amplified. See CLAUDE prompt for the evolution rules.
   */
  evolvedModifiers?: ModifierStack;
}

const PORTRAIT_PROMPT_MAX = 1300;
const NEGATIVE_PROMPT_MAX = 400;

const BASE_NEGATIVE = [
  'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
  'extra limbs', 'extra fingers', 'disfigured', 'bad anatomy',
  'bad proportions', 'duplicate', 'multiple characters', 'split frame',
  'comic panels', 'UI elements', 'border', 'frame', 'card border',
  'gore', 'graphic violence', 'severed body parts', 'exposed wounds',
  'blood spatter', 'nudity', 'suggestive',
].join(', ');

function buildStatLine(stats: CardStats, archetype: ArchetypeName): string {
  const ranks = deriveStatRanks(stats);
  const names = getStatNames(archetype);
  return names
    .map((name) => {
      const entry = stats[name]!;
      return `${name} ${entry.value} (${ranks[name]}, bias: ${entry.bias})`;
    })
    .join(', ');
}

export async function generateCardText(
  archetype: ArchetypeName,
  stats: CardStats,
  whisperWords: string[],
  modifiers?: ModifierStack,
  existingName?: string,
  lockedIdentity?: CharacterIdentity,
  /**
   * When true, Claude escalates every modifier value to fit the target rank
   * and uses the escalated values inside portraitPrompt. Only used from tierUp.
   * regenerate/create-new should pass false (or omit).
   */
  shouldEvolve = false,
  /**
   * Ascendant-tier-up only: a fused-whisper narrative the user picked from the
   * two AscendantPath options. When present, Claude treats this as the single
   * organizing image for the portrait + lore — modifiers still exist but this
   * narrative wins any conflict.
   */
  ascendantNarrative?: string,
  /**
   * Lycanthrope-only. Rolled at forge (furColor, moonPhase) and locked to the
   * card. Re-injected verbatim on every regen so the same wolf carries across
   * ranks despite the human → lycan morphology change. Ignored for other
   * archetypes.
   */
  lycanIdentity?: LycanthropeIdentity,
): Promise<GeneratedText> {
  const arch = ARCHETYPES[archetype];
  const overallRank = getOverallRank(stats);
  const dominant = getDominantStat(stats);
  const ranks = deriveStatRanks(stats);

  const namingStyle = pick(NAMING_STYLES);
  const tone = pick(TONE_WORDS);
  const origin = pick(ORIGIN_HOOKS);
  const loreTheme = pick(LORE_THEMES);
  const epithetFlavor = pick(EPITHET_FLAVORS);
  const extraTones = pickN(TONE_WORDS.filter(t => t !== tone), 2);

  const specializationSuffix = dominant
    ? getSpecializationSuffix(archetype, dominant, ranks[dominant]!)
    : '';
  const visualMotif = dominant
    ? getVisualMotif(dominant, ranks[dominant]!)
    : '';
  const absenceMotifs = getAbsenceMotifs(stats);

  const statLine = buildStatLine(stats, archetype);
  const resourceType = stats.Tech ? 'Tech' : 'Mana';

  let specializationBlock = '';
  if (specializationSuffix) {
    specializationBlock += `\nSPECIALIZATION: ${specializationSuffix}`;
  }
  if (visualMotif) {
    specializationBlock += `\nVISUAL MOTIF: ${visualMotif}`;
  }
  if (absenceMotifs.length > 0) {
    specializationBlock += `\nABSENCE MOTIFS (weak stats): ${absenceMotifs.join('; ')}`;
  }

  const atkValue = stats.Atk.value;
  const defValue = stats.Def.value;
  const resourceValue = (stats.Tech ?? stats.Mana)!.value;

  const prompt = `You are a fantasy card game creative director. Generate a unique, memorable character card.

ARCHETYPE: ${archetype}
OVERALL RANK: ${overallRank} — ${RANK_MEANINGS[overallRank]}
STATS: ${statLine}
DOMINANT STAT: ${dominant ?? 'None (tied)'}
RESOURCE TYPE: ${resourceType}
WHISPER WORDS: ${whisperWords.length > 0 ? whisperWords.join(', ') : 'none'}

ARCHETYPE IDENTITY: ${arch.identity}
VISUAL MOTIFS: ${arch.motifs}
RANK APPEARANCE: ${arch.rankProgression[overallRank]}
${specializationBlock}${archetype === 'Android' || archetype === 'Mech Pilot' ? `

TECH-CLASS ESCALATION RULE (${archetype}):
Higher ranks mean MORE machine, MORE technology, MORE mechanical dominance — never less. When evolving modifiers or writing the portraitPrompt: intensify the tech (bigger chassis, more exposed circuitry, more integrated weapons, brighter energy cores, more visible mechanical joints) instead of softening toward "human" or "sleek" or "refined". A Forged/Ascendant ${archetype} should look MORE like a machine than the Foundation, not less. Add tech vocabulary to every clause the evolution touches (e.g. "muscular" becomes "muscular armored chassis"; "battle-scarred" becomes "battle-scarred with visible plate damage and exposed circuitry"). Prosthetics and mechanical limbs are ENHANCED, not hidden.` : ''}${archetype === 'Lycanthrope' ? `

LYCANTHROPE ESCALATION RULE (${overallRank}) — READ THIS TWICE:
Higher ranks mean MORE WOLF ANATOMY, LESS HUMAN ANATOMY. Not just cosmetic hair and eyes — real morphological change. If the portrait would still read as "muscular human man with wolf accessories," you have failed the rule. Escalate ALL of the following across ranks:

- Foundation → near-human primal warrior blessed by the Moon Goddess. SUBTLE wolfish tells only: elongated canines, glowing eyes matching moon phase, pointed ear tips, long unkempt mane in fur color, faint patch of fur at the temples or forearms. Human musculature still readable. Human hands with fingernails. Human feet or bare feet. Hints of moon iconography (small pendant, crescent scar).

- Forged → MID-SHIFT HYBRID. NON-NEGOTIABLE at this tier:
  * Fully anatomical WOLF HEAD (real snout, real fur, real ears — NOT a mask, NOT a helmet)
  * FUR spreading visibly down the shoulders, upper back, and forearms — no longer just "hair"
  * Fingers ending in visible CLAWS, not fingernails — dark, sharp, extending past the fingertips
  * Human torso is still there BUT roughened — the six-pack abs of Foundation are broken up by patches of dark fur and stretched, changing skin. Do NOT render a clean bodybuilder torso.
  * The identity token rests on the bare chest between patches of fur
  * The moon of their phase is VISIBLE in the sky
  * Torn practical clothing hangs off, splitting at the seams

- Ascendant → FULLY ANTHROPOMORPHIC WOLF-LORD. NON-NEGOTIABLE at this tier:
  * DIGITIGRADE legs (backward-bent knees, walks on toes) — MANDATORY, not optional
  * A visible WOLF TAIL emerging from the back of the armor
  * Full body covered in fur in their fur color — no exposed human skin except possibly the face/muzzle transition
  * Hands are pawed with long TALONS, not "clawed fingers" — the hand shape itself is different
  * NO HUMAN ABS visible under the armor — if unarmored zones show, they show fur and canine musculature, not gym-body definition
  * FUR PATTERN reflects battle experience: silver moonlight veins run through the fur, scarred patches where fur grows back lighter, streaks of gray or moon-silver at the temples, ruff around the neck fuller and more matted
  * Articulated dark plate armor with silver moon-sigil filigree, thick fur ruffing at collar and wrists, silver moonlight AURA cascading
  * The moon of their phase dominates the sky or forms the composition backdrop

FUR-AS-BATTLE-RECORD: at Forged and Ascendant, treat the fur as a living record of their journey. A Lycan who has fought many battles has scarred fur patterns, moonlight-silver streaks at the temples, patches where fur has grown back darker or lighter. Weave this into the portraitPrompt as a specific detail, not a generic "battle-worn."

Do NOT soften toward "human," "sleek," "hybrid but graceful," or "elegant" at higher ranks — a Forged/Ascendant Lycanthrope should look MORE lupine, MORE bestial (though still noble), and OBVIOUSLY not-human, not less.${lycanIdentity ? `

LOCKED LYCAN IDENTITY — these must appear verbatim in every generation of this character; they are the anchors that carry identity across the morph:
- Fur color: ${lycanIdentity.furColor} (mane at Foundation, full head fur at Forged, full body fur at Ascendant — always ${lycanIdentity.furColor.toLowerCase()})
- Moon phase: ${lycanIdentity.moonPhase} moon — this SPECIFIC moon must appear in the composition at every rank (subtle pendant/scar at Foundation; visible in sky at Forged; dominant in composition + reflected in armor filigree at Ascendant)
The eye-glow color should visually match the moon phase (Crescent/Half → cool silver-white; Full → warm silver-gold; Blood → red-orange; Eclipse → black corona with faint gold). Weave both anchors into the portraitPrompt verbatim.` : ''}

MOON GODDESS LORE INSTRUCTION:
The Lycanthrope is blessed — not cursed — by the Moon Goddess. She watches over her chosen; the transformation is her gift. The lore MUST reference the Moon Goddess (as "the Moon Goddess", "the Moon Mother", "She Who Watches", or a similar epithet — vary it). The character is her devoted, not her victim. Their power waxes and wanes with the moon.${overallRank === 'Ascendant' ? `

LORE-REFLECTED-IN-PORTRAIT (Ascendant only):
The lore you write for this Ascendant tier will mention specific story beats — a defining battle, a bond broken or forged, a sacrifice made, a rival slain, a place they can never return to, a companion bound to them. **Every meaningful story beat you commit to writing in the lore MUST appear as a visual detail in the portraitPrompt.** Concrete examples:
- Lore names a battle → the fur or armor carries a mark from it (silver-scarred fur, notched plate, a wound scar that healed into a moon shape)
- Lore names a slain rival → a trophy at the belt, or their sigil turned into a scar
- Lore names a bond with a specific pack member → that companion is a silhouette in the background, or their scent is caught in the wind
- Lore names a sacrificed piece of themselves → the missing piece is visible (an eye scarred shut, a paw notched, silver where fur used to be)
- Lore names the Moon Goddess appearing to them → her face is faintly visible in the moon behind them
Do NOT write generic "warrior of many battles" lore and then pair it with generic "battle-scarred" art. The lore and portrait must reference the SAME specific event, visible in both.` : ''}` : ''}

CREATIVE DIRECTION FOR THIS CARD:
- Name style: ${namingStyle}
- Emotional tone: ${tone}, with hints of ${extraTones.join(' and ')}
- Origin: ${origin}
- The lore should touch on: ${loreTheme}
- The epithet/title should be: ${epithetFlavor}

${atkValue > defValue ? 'This character leans aggressive — reflect that in their personality or fighting style.' : defValue > atkValue ? 'This character is a protector or endurer — reflect their resilience or patience.' : 'This character is balanced — equally dangerous and durable.'}
${resourceValue >= 70 ? `High ${resourceType} means this is a powerful, costly being — the lore should feel weighty.` : resourceValue <= 25 ? `Low ${resourceType} means this is a scrappy, quick, or expendable figure.` : ''}
${modifiers ? `
PORTRAIT MODIFIERS (the card's portrait depicts this — weave these into the lore and title):
- Setting: ${modifiers.setting}
- Demeanor: ${modifiers.demeanor}
- Signature Detail: ${modifiers.signatureDetail}
- Lighting/Atmosphere: ${modifiers.lighting}${modifiers.element ? `
- Elemental affinity: ${modifiers.element}` : ''}${modifiers.physique ? `
- Physique: ${modifiers.physique}` : ''}${modifiers.lineage ? `
- Lineage: ${modifiers.lineage}` : ''}${modifiers.classSignature && overallRank !== 'Foundation' ? `
- Class Signature (a defining companion/weapon/manifestation the lore should acknowledge): ${modifiers.classSignature}` : ''}

The character's name, title, and lore should feel coherent with this visual. Let the setting, detail, and mood emerge naturally in the flavor text.` : ''}

${existingName ? `
EVOLUTION CONTEXT:
This character's name is "${existingName}" — they are evolving to a higher rank. Do NOT change the cardName. Keep it exactly "${existingName}". Generate a NEW, more powerful title/epithet and new lore that reflects their growth, accumulated power, and the battles they've survived to reach ${overallRank} rank.` : ''}
${ascendantNarrative ? `
!!! ASCENDANT NARRATIVE — THIS IS THE ORGANIZING IMAGE OF THE PORTRAIT AND LORE !!!
The user chose this fused-whisper path for the character's apotheosis:

"${ascendantNarrative}"

This narrative WINS over any conflicting modifier language. When composing the portraitPrompt, this image should dominate the composition — every clause should serve this narrative. When writing the lore, this narrative IS the character's Ascendant story. The evolved modifiers should be shaped to fit this narrative rather than the reverse. The new nameAndTitle epithet should evoke this narrative directly. Weave every whisper (element, setting, lineage, demeanor, signature detail, class trait) INTO the narrative rather than listing them separately.` : ''}
${lockedIdentity ? `
LOCKED CHARACTER IDENTITY — this is the SAME PERSON as before, do NOT invent a new character:
- Gender: ${lockedIdentity.gender}
- Ethnicity/skin: ${lockedIdentity.ethnicity}
- Hair: ${lockedIdentity.hair}
- Eyes: ${lockedIdentity.eyes}
- Body type: ${lockedIdentity.bodyType}
- Distinctive features: ${lockedIdentity.distinctiveFeatures}
- Base apparent age at Foundation: ${lockedIdentity.apparentAge} (they read a bit older/harder at Forged, weathered/ancient at Ascendant)

The identity fields you return MUST match exactly what's above (verbatim). The portraitPrompt MUST include these identity markers word-for-word early in the prompt (right after style anchor, before modifiers). Emphasize "same character, aged and hardened" in the prompt. Body type NEVER changes with rank — a heavyset Foundation stays heavyset at Ascendant.` : `
NEW CHARACTER IDENTITY:
Invent a coherent visual identity for this character. Pick freely from any real-world human descent — do NOT default to European features. Be specific.

**BODY TYPE DIVERSITY MANDATE**: The vast majority of fantasy portraits default to "lean and wiry" or "athletic" — do NOT do this. Roll for real variety. Consider (rotate through, don't repeat "lean" every time):
- heavyset, powerfully built with a thick frame
- tall and broad-shouldered, gladiator build
- short and stocky, low center of gravity
- muscular with a barrel chest
- rail-thin and wiry
- soft-bodied and imposing, weight as armor
- amputee with a prosthetic (specify which limb + material)
- one arm mechanical/enchanted, the other flesh
- burn-scarred across half the body
- one leg noticeably shorter, weight shifted
- pregnant (mid-fight, a defiant image)
- elderly frame, still upright and dangerous

Body type is class-agnostic — a heavyset Monk is just as valid as a heavyset Barbarian. The identity you generate here is LOCKED — future tier-ups will reuse it, so pick something distinctive.`}
${shouldEvolve && modifiers ? `
EVOLVE MODIFIERS — escalate each modifier to fit the new ${overallRank} rank.

Rules:
- Keep the ESSENCE of each input. Storm still means storm energy. A single black feather still involves feathers. Curious still involves the same emotional root.
- AMPLIFY, don't replace. Escalate scale, intensity, drama, or scope — not the subject.
- Foundation → Forged is a step; Foundation → Ascendant is a leap. Match the escalation to the ${overallRank} target.
- If the input already sounds legendary, escalate its SCALE (Storm → Tempest → Savage Storm; not Storm → Sunbeam).
- Keep it a single tight phrase — same grammatical shape as the input where possible.
- These evolved values MUST be what you weave into the portraitPrompt (not the raw inputs above).

Examples (illustrative — match the input, don't copy):
- Element: "Storm" → Forged "Tempest" → Ascendant "Savage Storm"
- Element: "Water" → Forged "Tide" → Ascendant "Ocean"
- Signature Detail: "A single black feather stuck to the shoulder" → Forged "Feathers gathering at the shoulder" → Ascendant "Wreathed in feathers"
- Demeanor: "Curious, head tilted" → Forged "Demanding answers" → Ascendant "Commanding truth from the world"
- Setting: "Torchlit crypt lined with old bones" → Forged "Crypt-hall trembling with old power" → Ascendant "Cathedral of bone, air itself humming"
- Lighting: "Storm-lit, brief lightning flashes" → Forged "Continuous lightning splitting the sky" → Ascendant "Reality-tearing lightning, world reshaped by each flash"
- Class Trait: "Book of names hovering open before them" → Forged "Book of names orbiting, pages turning by themselves" → Ascendant "Book of names blazing with light, seraphim reading over their shoulder"

Return the evolved set as \`evolvedModifiers\` with EXACTLY these keys (only include a key if it was present in the input):
${Object.entries(modifiers).filter(([, v]) => v).map(([k, v]) => `- ${k}: "${v}"`).join('\n')}` : ''}

Generate ONLY a JSON object:
- cardName: ${existingName ? `MUST be exactly "${existingName}" — do not change this.` : 'a fantasy name (1-3 words, no title). MUST follow the naming style above.'}
- nameAndTitle: full name with epithet (e.g. "Kael, the Unbroken"). The title must reflect the rank's weight — Foundation titles are humble or uncertain, Forged titles show earned respect, Ascendant titles inspire awe.${existingName ? ` The title should feel like a dramatic upgrade from the previous rank — this character has grown more powerful and feared.` : ''}
- lore: 2-3 sentences of evocative flavor text. Weave the whisper words into the mood naturally — don't force them in literally. The lore should hint at a living character with history, not a generic description.${existingName ? ` Reference their journey and transformation — they are not new, they are reforged by experience.` : ''}
- portraitPrompt: an image-generation prompt for Leonardo AI Phoenix 1.0. MUST be under ${PORTRAIT_PROMPT_MAX} characters. Compose a single dense, comma-separated prompt that captures ALL of the above into evocative visual language. Structure: [style anchor: "fantasy character portrait, painterly digital art, chest-up, single character centered, ultra-detailed face, rich textures"], [IDENTITY BLOCK — verbatim gender/ethnicity/hair/eyes/distinctive features from LOCKED or NEW identity above], [rank-appropriate energy: Foundation = ready stance; Forged = dynamic action, visible aura; Ascendant = ultimate form, explosive power, overwhelming presence], [character maturity: Foundation youthful/unmarked; Forged battle-scarred, hardened eyes; Ascendant ancient eyes, deep scars, peak physical form], [archetype identity + motifs + specialization visuals], [modifiers woven in — elemental affinity, physique, lineage, setting, demeanor, signature detail, lighting, class trait], and [same-character continuity phrase for Forged/Ascendant, e.g. "same character as prior rank, aged and hardened, identical facial structure and skin tone"]. Prefer punchy visual clauses over paragraphs. NO gore, NO explicit violence, NO exposed wounds. Every impactful detail must appear.
- negativePrompt: image-gen negative prompt, under ${NEGATIVE_PROMPT_MAX} characters. Start with "${BASE_NEGATIVE}" and add anything that would ruin THIS specific character (if Foundation, add "grizzled, ancient, legendary aura"; if the character is regal, add "sloppy, casual"; ALWAYS add "different person, wrong ethnicity, different gender, changed face, inconsistent identity"). Comma-separated.
- identity: an object {gender, apparentAge, ethnicity, hair, eyes, bodyType, distinctiveFeatures}. ${lockedIdentity ? 'MUST be EXACTLY the LOCKED identity above, verbatim (all 7 fields).' : 'Invent it now — this locks the character\'s look across all future tiers. Every field must be specific and non-generic. bodyType MUST follow the diversity mandate — no defaulting to "lean and wiry".'}${shouldEvolve && modifiers ? `
- evolvedModifiers: an object with the same keys as the EVOLVE MODIFIERS block above (only the keys present in the input). Each value is the escalated version per the rules and examples given. These must be what you actually referenced when composing the portraitPrompt.` : ''}

Respond with ONLY valid JSON, no markdown, no explanation. Ensure portraitPrompt is under ${PORTRAIT_PROMPT_MAX} chars — this is a hard constraint from the image API.`;

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('No Anthropic API set — using fallback generator');
      return generateFallbackText(archetype, overallRank, stats, whisperWords, modifiers, lockedIdentity);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        temperature: 1,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.content[0].text;
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(text) as Partial<GeneratedText>;

    if (!parsed.cardName || !parsed.nameAndTitle || !parsed.lore) {
      throw new Error('Incomplete response — missing lore fields');
    }

    // Fill in portraitPrompt/negativePrompt from local fallback if Claude omitted them,
    // and hard-cap length so Leonardo's 1500-char limit is never exceeded.
    const composed = composePortraitFallback(archetype, overallRank, stats, modifiers, lockedIdentity);
    const portraitPrompt = truncateToLimit(parsed.portraitPrompt ?? composed.prompt, PORTRAIT_PROMPT_MAX);
    const negativePrompt = truncateToLimit(parsed.negativePrompt ?? composed.negativePrompt, NEGATIVE_PROMPT_MAX);

    // Identity: if lockedIdentity was passed in, trust that over Claude's echo
    // (Claude occasionally paraphrases). Otherwise, use what Claude generated,
    // falling back to a neutral placeholder if missing.
    const identity: CharacterIdentity =
      lockedIdentity ?? parsed.identity ?? fallbackIdentity();

    // evolvedModifiers: only populate when we asked for evolution. Validate
    // that every key present in the input is present in the output; drop
    // silently to the input modifiers if Claude misses a key or the field.
    let evolvedModifiers: ModifierStack | undefined;
    if (shouldEvolve && modifiers) {
      const raw = parsed.evolvedModifiers;
      if (raw && typeof raw === 'object') {
        const merged: ModifierStack = { ...modifiers };
        let anyEvolved = false;
        for (const key of Object.keys(modifiers) as (keyof ModifierStack)[]) {
          const inputValue = modifiers[key];
          if (!inputValue) continue;
          const evolved = (raw as unknown as Record<string, unknown>)[key];
          if (typeof evolved === 'string' && evolved.length > 0) {
            merged[key] = evolved;
            anyEvolved = true;
          }
        }
        if (anyEvolved) evolvedModifiers = merged;
        else console.warn('Claude returned evolvedModifiers with no usable keys; falling back to input modifiers.');
      } else {
        console.warn('Claude did not return evolvedModifiers; falling back to input modifiers.');
      }
    }

    return {
      cardName: parsed.cardName,
      nameAndTitle: parsed.nameAndTitle,
      lore: parsed.lore,
      portraitPrompt,
      negativePrompt,
      identity,
      evolvedModifiers,
    };
  } catch (err) {
    console.error('Claude API error, using fallback:', err);
    return generateFallbackText(archetype, overallRank, stats, whisperWords, modifiers, lockedIdentity);
  }
}

/** Bare-minimum identity used when Claude fails and no locked identity exists. */
function fallbackIdentity(): CharacterIdentity {
  return {
    gender: 'androgynous',
    apparentAge: 'young adult',
    ethnicity: 'ambiguous features, warm mid-toned skin',
    hair: 'dark hair, medium length',
    eyes: 'dark eyes',
    bodyType: 'stocky and powerfully built',
    distinctiveFeatures: 'strong jawline',
  };
}

/** Hard-cap a string to `limit` chars, preferring to cut at the last comma before the limit. */
function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const window = text.slice(0, limit);
  const lastComma = window.lastIndexOf(',');
  if (lastComma > limit * 0.6) return window.slice(0, lastComma);
  return window;
}

/** Local fallback prompt composer, kept short so it fits under Leonardo's cap. */
function composePortraitFallback(
  archetype: ArchetypeName,
  rank: Rank,
  stats: CardStats,
  modifiers?: ModifierStack,
  lockedIdentity?: CharacterIdentity,
): { prompt: string; negativePrompt: string } {
  const identityClause = lockedIdentity
    ? `${lockedIdentity.gender}, ${lockedIdentity.ethnicity}, ${lockedIdentity.bodyType}, ${lockedIdentity.hair}, ${lockedIdentity.eyes}, ${lockedIdentity.distinctiveFeatures}, same character across ranks, identical facial structure, skin tone, and body type`
    : '';
  const identityNegative = lockedIdentity
    ? ', different person, wrong ethnicity, different gender, changed face, changed body type, inconsistent identity'
    : '';

  if (modifiers) {
    const { prompt, negativePrompt } = assemblePortraitPrompt(archetype, rank, stats, modifiers);
    const withIdentity = identityClause ? `${prompt}. IDENTITY (must be preserved): ${identityClause}` : prompt;
    return {
      prompt: truncateToLimit(withIdentity, PORTRAIT_PROMPT_MAX),
      negativePrompt: truncateToLimit(negativePrompt + identityNegative, NEGATIVE_PROMPT_MAX),
    };
  }
  return {
    prompt: truncateToLimit(
      `Fantasy character portrait, painterly digital art, chest-up, ${archetype} (${rank} rank)${identityClause ? `, ${identityClause}` : ''}, detailed face, rich textures, dramatic lighting`,
      PORTRAIT_PROMPT_MAX,
    ),
    negativePrompt: truncateToLimit(BASE_NEGATIVE + identityNegative, NEGATIVE_PROMPT_MAX),
  };
}

function generateFallbackText(
  archetype: ArchetypeName,
  rank: Rank,
  stats: CardStats,
  whisperWords: string[],
  modifiers?: ModifierStack,
  lockedIdentity?: CharacterIdentity,
): GeneratedText {
  const prefixes: Record<Rank, string[]> = {
    Foundation: ['Young', 'Untested', 'Raw', 'Fledgling', 'Novice'],
    Forged: ['Battle-worn', 'Tempered', 'Proven', 'Hardened', 'Rising'],
    Ascendant: ['Legendary', 'Supreme', 'Eternal', 'Mythic', 'Divine'],
  };

  const titles: Record<Rank, string[]> = {
    Foundation: ['the Unproven', 'the Unnamed', 'of the First Step', 'the Aspirant', 'the Seeker'],
    Forged: ['the Relentless', 'of the Iron Will', 'Stormforged', 'the Unyielding', 'Oathbound'],
    Ascendant: ['Worldbreaker', 'the Undying', 'Dawnbringer', 'of the Infinite', 'the Ascended'],
  };

  const name = `${pick(prefixes[rank])} ${archetype.split(' ')[0]}`;
  const shortName = name.split(' ').pop()!;
  const title = pick(titles[rank]);
  const whisperFlavor = whisperWords.length > 0
    ? ` The whispers speak of one who is ${whisperWords[0]}.`
    : '';

  const { prompt: portraitPrompt, negativePrompt } = composePortraitFallback(
    archetype,
    rank,
    stats,
    modifiers,
  );

  return {
    cardName: shortName,
    nameAndTitle: `${shortName}, ${title}`,
    lore: `A ${rank.toLowerCase()} ${archetype.toLowerCase()} whose legend is still being written.${whisperFlavor} Those who stand in their path know only silence.`,
    portraitPrompt,
    negativePrompt,
    identity: lockedIdentity ?? fallbackIdentity(),
  };
}
