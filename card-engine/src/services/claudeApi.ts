import type { ArchetypeName, Rank, CombatStats } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';

const RANK_MEANINGS: Record<Rank, string> = {
  Foundation: 'The beginning — raw, unproven, rough around the edges',
  Forged: 'Transformed through trial — gaining real power and presence',
  Ascendant: 'Mastery — legendary, fully realized, elite',
};

interface GeneratedText {
  cardName: string;
  nameAndTitle: string;
  lore: string;
}

export async function generateCardText(
  archetype: ArchetypeName,
  rank: Rank,
  stats: CombatStats,
  manaCost: number,
  whisperWords: string[],
): Promise<GeneratedText> {
  const arch = ARCHETYPES[archetype];
  const prompt = `You are a fantasy card game creative director. Generate a unique character card.

Archetype: ${archetype}
Rank: ${rank}
Rank meaning: ${RANK_MEANINGS[rank]}
ATK: ${stats.atk}, DEF: ${stats.def}, Mana Cost: ${manaCost}
Whisper words: ${whisperWords.length > 0 ? whisperWords.join(', ') : 'none provided'}

Archetype identity: ${arch.identity}

Generate ONLY a JSON object with these fields:
- cardName: a fantasy name (1-3 words, no title)
- nameAndTitle: the full name with an epithet or title
- lore: 2-3 sentences of evocative flavor text for the card

The rank should heavily influence the tone: Foundation characters are
newcomers or raw talents, Forged characters have been tested and changed,
Ascendant characters command awe and legend. The title/epithet should
reflect the rank's weight (e.g. Foundation: "the Unproven" vs Ascendant:
"Worldbreaker"). The whisper words should subtly influence the character's
personality, backstory, or appearance. Don't force them in literally —
let them guide the mood.

Respond with ONLY valid JSON, no markdown, no explanation.`;

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('No Anthropic API key set — using fallback generator');
      return generateFallbackText(archetype, rank, whisperWords);
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
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const parsed = JSON.parse(text) as GeneratedText;

    if (!parsed.cardName || !parsed.nameAndTitle || !parsed.lore) {
      throw new Error('Incomplete response');
    }

    return parsed;
  } catch (err) {
    console.error('Claude API error, using fallback:', err);
    return generateFallbackText(archetype, rank, whisperWords);
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

  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const prefix = pick(prefixes[rank]);
  const name = `${prefix} ${archetype.split(' ')[0]}`;
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
