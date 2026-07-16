import type { ArchetypeName, Rank, CardStats, StatName, ModifierStack } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';
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
}

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
${specializationBlock}

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
- Lighting/Atmosphere: ${modifiers.lighting}

The character's name, title, and lore should feel coherent with this visual. Let the setting, detail, and mood emerge naturally in the flavor text.` : ''}

${existingName ? `
EVOLUTION CONTEXT:
This character's name is "${existingName}" — they are evolving to a higher rank. Do NOT change the cardName. Keep it exactly "${existingName}". Generate a NEW, more powerful title/epithet and new lore that reflects their growth, accumulated power, and the battles they've survived to reach ${overallRank} rank.` : ''}

Generate ONLY a JSON object:
- cardName: ${existingName ? `MUST be exactly "${existingName}" — do not change this.` : 'a fantasy name (1-3 words, no title). MUST follow the naming style above.'}
- nameAndTitle: full name with epithet (e.g. "Kael, the Unbroken"). The title must reflect the rank's weight — Foundation titles are humble or uncertain, Forged titles show earned respect, Ascendant titles inspire awe.${existingName ? ` The title should feel like a dramatic upgrade from the previous rank — this character has grown more powerful and feared.` : ''}
- lore: 2-3 sentences of evocative flavor text. Weave the whisper words into the mood naturally — don't force them in literally. The lore should hint at a living character with history, not a generic description.${existingName ? ` Reference their journey and transformation — they are not new, they are reforged by experience.` : ''}

Respond with ONLY valid JSON, no markdown, no explanation.`;

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('No Anthropic API set — using fallback generator');
      return generateFallbackText(archetype, overallRank, whisperWords);
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
        max_tokens: 300,
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
    const parsed = JSON.parse(text) as GeneratedText;

    if (!parsed.cardName || !parsed.nameAndTitle || !parsed.lore) {
      throw new Error('Incomplete response');
    }

    return parsed;
  } catch (err) {
    console.error('Claude API error, using fallback:', err);
    return generateFallbackText(archetype, overallRank, whisperWords);
  }
}

function generateFallbackText(
  archetype: ArchetypeName,
  rank: Rank,
  whisperWords: string[],
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

  return {
    cardName: shortName,
    nameAndTitle: `${shortName}, ${title}`,
    lore: `A ${rank.toLowerCase()} ${archetype.toLowerCase()} whose legend is still being written.${whisperFlavor} Those who stand in their path know only silence.`,
  };
}
