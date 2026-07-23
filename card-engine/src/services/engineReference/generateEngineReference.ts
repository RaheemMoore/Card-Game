/**
 * Engine reference generator (2026-07-22 organize-and-condense cleanup).
 *
 * Walks the CANONICAL data modules and emits two readable Markdown references —
 * one for the Image Engine, one for the Lore Engine — so the team can see every
 * pool/rule and where it lives WITHOUT poking around in the source. The code
 * stays the single source of truth; these docs are a generated view of it, so
 * they cannot drift. Regenerate with `npm run docs:engines`.
 *
 * This module only BUILDS the strings; the paired *.gen.test.ts runner writes
 * them to disk (keeps file IO out of the importable module).
 */
import { ARCHETYPE_NAMES } from '../../types/card';
import type { ArchetypeName, Rank } from '../../types/card';
import { getBibleChapter } from '../../data/archetypeBible';
import { ARCHETYPE_BODY_POOL } from '../../data/bodySkinBible';
import { ARCHETYPE_NON_HUMAN_FORMS, BASE_NEGATIVE } from '../imageEngine/imageConstants';
import { getWeaponPool } from '../../data/archetypeWeapons';
import { getCompanionPool } from '../../data/archetypeCompanions';
import { getEnvironmentPool } from '../../data/archetypeEnvironments';
import { getPosePool } from '../../data/archetypePoses';
import { ELEMENT_VISUAL_LANGUAGE } from '../../data/elementVisualLanguage';
import { getQuestionsForArchetype, getOptionsForQuestion } from '../../data/storyPillars';
import { NAMING_BIBLE } from '../../data/namingBible';

const RANKS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

function banner(title: string): string {
  return [
    `# ${title}`,
    '',
    '> **GENERATED FILE — do not edit by hand.** This is a view of the canonical',
    '> code modules under `card-engine/src`. Regenerate with `npm run docs:engines`.',
    `> Last generated: ${new Date().toISOString().slice(0, 10)}.`,
    '',
  ].join('\n');
}

function list(items: readonly string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join('\n') : '- _(none)_';
}

/** Image Engine reference — everything that shapes the deterministic portrait prompt. */
export function buildImageEngineReference(): string {
  const out: string[] = [banner('Image Engine Reference')];

  out.push(
    '## How the picture is built',
    '',
    'The Image Engine is deterministic: `services/portraitAssembler.ts` composes the',
    'Leonardo `{portraitPrompt, negativePrompt}` from a `CharacterSheet` (identity',
    'substrate + render context + resolved motifs). It never receives the lore text,',
    'so it cannot corrupt the character. Shared prompt constants live in',
    '`services/imageEngine/imageConstants.ts`.',
    '',
    `The master negative list (\`BASE_NEGATIVE\`) carries **${BASE_NEGATIVE.split(', ').length}** terms`,
    '(modesty, anti-sexualization, per-archetype bans, cross-element bans, rank-continuity bans).',
    '',
    '## Element Visual Language',
    '',
    'Per-element identity (`data/elementVisualLanguage.ts`). Every element must read',
    'even without color.',
    '',
    '| Element | Theme | Primary colors |',
    '| --- | --- | --- |',
  );
  for (const [name, v] of Object.entries(ELEMENT_VISUAL_LANGUAGE)) {
    out.push(`| ${name} | ${v.theme} | ${v.primaryColors} |`);
  }
  out.push('');

  out.push('## Per-archetype visual sources', '');
  for (const archetype of ARCHETYPE_NAMES) {
    const chapter = getBibleChapter(archetype);
    const nonHuman = ARCHETYPE_NON_HUMAN_FORMS[archetype as ArchetypeName];
    out.push(
      `### ${archetype}`,
      '',
      `**Visual DNA** (bible §7): ${chapter.visualDNA.recognitionCues}`,
      '',
      `**Avoid**: ${chapter.visualDNA.avoid}`,
      '',
      `**Symbol & material**: ${chapter.symbolAndMaterial.materials} — ${chapter.symbolAndMaterial.symbols}`,
      '',
      '**Rank evolution**:',
      ...RANKS.map((r) => `- _${r}_: ${chapter.rankEvolution[r]}`),
      '',
      '**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):',
      list(ARCHETYPE_BODY_POOL[archetype].map((d) => d.description)),
      '',
      `**Non-human form** (imageConstants.ts): ${nonHuman ?? '_(rooted mortal — no non-human form)_'}`,
      '',
      '**Weapons** (`data/archetypeWeapons.ts`):',
      list(getWeaponPool(archetype).map((w) => w.name)),
      '',
      '**Companions** (`data/archetypeCompanions.ts`):',
      list(getCompanionPool(archetype).map((c) => c.descriptor)),
      '',
      '**Environments** (`data/archetypeEnvironments.ts`):',
      list(getEnvironmentPool(archetype).map((e) => e.name)),
      '',
      `**Pose pool sizes** (data/archetypePoses.ts): ${RANKS.map((r) => `${r} ${getPosePool(archetype, r).length}`).join(' · ')}`,
      '',
    );
  }
  return out.join('\n');
}

/** Lore Engine reference — everything that shapes the Claude-authored name + lore. */
export function buildLoreEngineReference(): string {
  const out: string[] = [banner('Lore Engine Reference')];

  out.push(
    '## How the lore is written',
    '',
    'The Lore Engine is the Claude call in `services/claudeApi.ts`. It returns',
    '`cardName`, `nameAndTitle`, `lore`, `hiddenFate`, and `storyMotifs` — never a',
    'portrait prompt. Its inputs are the archetype Bible chapter, the player\'s',
    'immutable Story Pillar answers, the element + bond, and (on tier-up) the locked',
    'identity. Naming follows `data/namingBible.ts`.',
    '',
    '## Per-archetype narrative sources',
    '',
  );
  for (const archetype of ARCHETYPE_NAMES) {
    const chapter = getBibleChapter(archetype);
    const naming = NAMING_BIBLE[archetype];
    const questions = getQuestionsForArchetype(archetype);
    out.push(
      `### ${archetype}`,
      '',
      `**Identity through**: ${chapter.identityThrough}`,
      '',
      `**Core fantasy**: ${chapter.coreFantasy}`,
      '',
      `**Selection tagline**: ${chapter.selectionScreen.tagline}`,
      '',
      `**Promise**: ${chapter.coreFantasyPromise.promise}`,
      '',
      `**Emotional pillars**: ${chapter.coreFantasyPromise.emotionalPillars.join(', ')}`,
      '',
      '**Beliefs**:',
      `- Virtues: ${chapter.beliefs.virtues.join(', ')}`,
      `- Taboos: ${chapter.beliefs.taboos.join(', ')}`,
      `- Fears: ${chapter.beliefs.fears.join(', ')}`,
      '',
      `**Internal diversity** (orders/houses/packs): ${chapter.internalDiversity.groups.join(', ')}`,
      '',
      '**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):',
      ...questions.map(
        (q) => `- _${q.id}_: ${q.prompt} — ${getOptionsForQuestion(archetype, q.id).length} seed options`,
      ),
      '',
      `**Naming identity** (data/namingBible.ts): ${naming.identity}`,
      '',
      `**Sample names**: ${naming.sampleNames.slice(0, 6).join(', ')}`,
      '',
      `**Naming avoid**: ${naming.avoid.join(', ')}`,
      '',
      `**Approved prestige roles**: ${chapter.approvedPrestigeRoles.length ? chapter.approvedPrestigeRoles.join(', ') : '_(none)_'}`,
      '',
    );
  }
  return out.join('\n');
}
