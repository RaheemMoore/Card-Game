import type { Card, ModifierStack } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';

export interface AscendantPath {
  /** Short evocative name for the path, e.g. "The Royal Champion of the Sandstorm". */
  title: string;
  /** 2-3 sentence dramatic narrative fusing the character's whispers into a mythic image. */
  narrative: string;
}

/**
 * Generates 2 dramatic narrative options for an Ascendant tier-up. Each option
 * synthesizes the character's existing whispers/modifiers/lineage into a single
 * mythic direction. The user picks one, and the chosen narrative gets fed into
 * the main tier-up Claude call as a heavily-weighted prompt directive.
 *
 * Cost: ~$0.0001 (one Claude Haiku call, no image).
 */
export async function generateAscendantPaths(card: Card): Promise<AscendantPath[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('No Anthropic API key — using fallback ascendant paths');
    return fallbackPaths(card);
  }

  const arch = ARCHETYPES[card.archetype];
  const mods: Partial<ModifierStack> = card.modifiers ?? {};

  const modLines = [
    mods.element && `Element: ${mods.element}`,
    mods.physique && `Physique: ${mods.physique}`,
    mods.lineage && `Lineage: ${mods.lineage}`,
    mods.setting && `Setting: ${mods.setting}`,
    mods.demeanor && `Demeanor: ${mods.demeanor}`,
    mods.signatureDetail && `Signature Detail: ${mods.signatureDetail}`,
    mods.lighting && `Lighting: ${mods.lighting}`,
    mods.classSignature && `Class Trait: ${mods.classSignature}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are crafting two "Ascendant Paths" for a fantasy card character reaching their final legendary form.

CHARACTER:
- Name: ${card.cardName}
- Title (Forged): ${card.nameAndTitle}
- Archetype: ${card.archetype} — ${arch.identity}
- Current lore: ${card.lore}

WHISPERS (existing modifiers — these define who they are):
${modLines}

YOUR TASK:
Generate TWO distinct dramatic narrative paths for this character's Ascendant form. Each path FUSES their existing whispers (element + physique + lineage + demeanor + setting) into ONE mythic combined image. This is not evolution — this is APOTHEOSIS. The whispers should CROSS-POLLINATE.

Example — for whispers "Sand, broad-shouldered brawler, royal blood":
- Path A: "The Deposed King of the Sandstorm — the royal who lost their kingdom to the desert now returns as the storm itself, their coronation robes replaced by whirling dust, their crown crackling with heat-lightning."
- Path B: "The Champion of the Buried City — where their palace once stood, now only dunes; they walk the ruined plaza claiming rulership over ghosts, sand pouring off their broad shoulders like a mantle."

Both paths must:
- FUSE whispers into a single unified image (not just list them)
- Feel MYTHIC and inevitable, like the character's arc completing
- Be DIFFERENT from each other — offer the user a real choice of direction
- Preserve the archetype identity (a Necromancer doesn't become a Seraph)
- Keep the character's core (${card.cardName} is still ${card.cardName})

Respond with ONLY a JSON object, no markdown, no explanation:
{
  "paths": [
    {"title": "short evocative name, 4-8 words", "narrative": "2-3 sentences of dramatic fusion, present-tense, painterly imagery"},
    {"title": "different direction, 4-8 words", "narrative": "2-3 sentences of dramatic fusion, present-tense, painterly imagery"}
  ]
}`;

  try {
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
        max_tokens: 600,
        temperature: 1,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Ascendant paths API failed: ${response.status}`);
    const data = await response.json();
    const raw = data.content[0].text;
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(text) as { paths?: unknown };

    if (!Array.isArray(parsed.paths) || parsed.paths.length < 2) {
      throw new Error('Malformed paths response');
    }

    const paths = parsed.paths.slice(0, 2).map((p, i) => {
      const obj = p as Record<string, unknown>;
      const title = typeof obj.title === 'string' && obj.title.trim() ? obj.title : `Ascendant Path ${i + 1}`;
      const narrative = typeof obj.narrative === 'string' && obj.narrative.trim() ? obj.narrative : '';
      return { title, narrative };
    });

    if (paths.some((p) => !p.narrative)) throw new Error('Missing narrative on a path');
    return paths;
  } catch (err) {
    console.warn('Ascendant paths generation failed, using fallback:', err);
    return fallbackPaths(card);
  }
}

function fallbackPaths(card: Card): AscendantPath[] {
  const mods: Partial<ModifierStack> = card.modifiers ?? {};
  const element = mods.element ?? 'silent power';
  const setting = mods.setting ?? 'a place lost to time';
  const lineage = mods.lineage ?? 'their forgotten birthright';
  return [
    {
      title: `The ${card.archetype} Enthroned`,
      narrative: `${card.cardName} stands at the center of ${setting}, their ${element} answering their command, their ${lineage} finally understood as prophecy. What began as struggle ends as sovereignty.`,
    },
    {
      title: `The ${card.archetype} Unbound`,
      narrative: `${card.cardName} steps beyond ${setting} entirely — ${element} pouring from them like breath, ${lineage} no longer a chain but a weapon. They are not the champion of a place. They are the storm that reshapes it.`,
    },
  ];
}
