import { describe, it, expect, vi } from 'vitest';
import { buildNamingBibleBlock, selectNamingSparks } from './namingPrompt';
import {
  NAMING_BIBLE,
  NAME_STRUCTURE_LABELS,
  NAMING_BANNED_TROPES,
  NAMING_QUALITY_REMINDERS,
  EPITHET_BY_RANK,
  rotateSlice,
} from '../../data/namingBible';
import { ARCHETYPE_NAMES, RANKS, type ArchetypeName, type Rank } from '../../types/card';

/**
 * These tests exist to prove ONE thing: pulling the naming block out of
 * claudeApi.ts did not change a single character of what the forge sends.
 *
 * The golden below is a verbatim copy of the template literal as it stood in
 * claudeApi.ts before the extraction (commit ade5e86, lines 773–803). It is
 * duplicated on purpose — a golden test that imports the thing it is checking
 * proves nothing. If someone edits the Bible block, BOTH copies have to move,
 * and that friction is the point.
 */

type RankKey = 'Foundation' | 'Forged' | 'Ascendant';

function originalBlock(
  archetype: ArchetypeName,
  rankKey: RankKey,
  namingOffset: number,
  nameSampleCount: number,
  nameFullCount: number,
  nameRegisterCount: number,
  recentNamesStr: string,
): string {
  const namingGuide = NAMING_BIBLE[archetype];
  const rotatedSampleNames = namingGuide
    ? rotateSlice(namingGuide.sampleNames, namingOffset * 3, nameSampleCount)
    : [];
  const rotatedFullNames = namingGuide
    ? rotateSlice(namingGuide.sampleFullNames, namingOffset * 2, nameFullCount)
    : [];
  const rotatedRegisters = namingGuide
    ? rotateSlice(namingGuide.culturalRegisters, namingOffset, nameRegisterCount)
    : [];

  return `
=== FANTASY CHARACTER NAMING BIBLE (Raheem v1.0 — enforce for cardName and nameAndTitle) ===
CORE PRINCIPLE: A name is compressed worldbuilding. It should feel like the character existed BEFORE the prompt. Do NOT sample the example names below verbatim — they are showing STRUCTURE, RHYTHM, and CULTURAL DIRECTION only. Generate an ORIGINAL name that fits THIS character's ancestry (from the diversity axis + hiddenFate.skinTone), archetype, and story.

ARCHETYPE NAMING IDENTITY (${archetype}): ${namingGuide?.identity ?? ''}.

CULTURAL DIRECTION (pick ONE that fits the character's ancestry — do NOT default to a Norse/Latin/East-Asian stereotype for this archetype):
${rotatedRegisters.map((r) => `  - ${r}`).join('\n')}

SUITABLE NAME STRUCTURES for ${archetype} (choose ONE):
${(namingGuide?.structures ?? []).map((s) => `  - ${NAME_STRUCTURE_LABELS[s]}`).join('\n')}

EXAMPLE PERSONAL NAMES (for tone/rhythm reference — DO NOT copy verbatim): ${rotatedSampleNames.join(', ')}
EXAMPLE FULL NAMES (for structure/epithet reference — DO NOT copy verbatim): ${rotatedFullNames.join(' ; ')}

BANNED TROPES (project-wide — DO NOT use, no exceptions):
  ${NAMING_BANNED_TROPES.slice(0, 25).join(', ')}
  (and: any "X, Keeper of Y" / "X, the Warden of Y" / "X, Y's Vigil" default epithets — these are the exact tropes we are eliminating)

ARCHETYPE-SPECIFIC AVOID for ${archetype}:
${(namingGuide?.avoid ?? []).map((a) => `  - ${a}`).join('\n')}

EPITHET GUIDANCE (rank = ${rankKey}): ${EPITHET_BY_RANK[rankKey]}

QUALITY REMINDERS:
${NAMING_QUALITY_REMINDERS.map((q) => `  - ${q}`).join('\n')}

RECENT CARD NAMES (do NOT repeat these, do NOT reuse the same first-name shape or ending): ${recentNamesStr || '(none yet — this is an early forge)'}

Before returning cardName + nameAndTitle, verify: (1) does it fit THIS character's specific ancestry/story, not just a generic archetype cliché? (2) is it structurally different from the recent names above? (3) is it FREE of every banned trope? (4) is any epithet EARNED by a specific Story Pillar answer (Foundation: usually no epithet)? If any answer is weak, revise the name.
`;
}

/** The three retry tiers in claudeApi.ts (retryAttempt 0/1, 2, 3+). */
const COUNT_TIERS: ReadonlyArray<[number, number, number]> = [
  [6, 4, 3],
  [4, 3, 2],
  [3, 2, 1],
];

const RANK_KEYS: readonly RankKey[] = ['Foundation', 'Forged', 'Ascendant'];
const ARCHETYPES: readonly ArchetypeName[] = ARCHETYPE_NAMES;

describe('buildNamingBibleBlock — behaviour-preserving extraction', () => {
  it('renders the pinned case character-for-character', () => {
    const pinned = {
      archetype: 'Barbarian' as ArchetypeName,
      rank: 'Forged' as RankKey,
      offset: 7,
      sampleCount: 6,
      fullCount: 4,
      registerCount: 3,
      recentNamesStr: 'Adisa Reed-Breaker; Veyra',
    };
    expect(buildNamingBibleBlock(pinned)).toBe(
      originalBlock('Barbarian', 'Forged', 7, 6, 4, 3, 'Adisa Reed-Breaker; Veyra'),
    );
  });

  it('matches the original across every archetype, rank, offset and retry tier', () => {
    for (const archetype of ARCHETYPES) {
      for (const rank of RANK_KEYS) {
        for (let offset = 0; offset < 6; offset += 1) {
          for (const [sampleCount, fullCount, registerCount] of COUNT_TIERS) {
            const recent = offset % 2 === 0 ? '' : 'Joren; Mira, Unit MR-A9';
            expect(
              buildNamingBibleBlock({
                archetype, rank, offset, sampleCount, fullCount, registerCount,
                recentNamesStr: recent,
              }),
            ).toBe(originalBlock(archetype, rank, offset, sampleCount, fullCount, registerCount, recent));
          }
        }
      }
    }
  });

  it('keeps the leading and trailing newlines the caller interpolates around', () => {
    const block = buildNamingBibleBlock({
      archetype: 'Monk', rank: 'Foundation', offset: 0,
      sampleCount: 6, fullCount: 4, registerCount: 3, recentNamesStr: '',
    });
    expect(block.startsWith('\n===')).toBe(true);
    expect(block.endsWith('name.\n')).toBe(true);
  });

  it('renders the early-forge note when there are no recent names', () => {
    const block = buildNamingBibleBlock({
      archetype: 'Druid', rank: 'Foundation', offset: 0,
      sampleCount: 6, fullCount: 4, registerCount: 3, recentNamesStr: '',
    });
    expect(block).toContain('(none yet — this is an early forge)');
  });

  it('touches no storage — the rotation cursor belongs to the caller', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    buildNamingBibleBlock({
      archetype: 'Seraph', rank: 'Ascendant', offset: 3,
      sampleCount: 6, fullCount: 4, registerCount: 3, recentNamesStr: '',
    });
    selectNamingSparks({
      archetype: 'Seraph', rank: 'Ascendant', offset: 3,
      sampleCount: 6, fullCount: 4, registerCount: 3,
    });
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe('selectNamingSparks', () => {
  it('offers exactly the examples the prompt block shows — the panel cannot lie', () => {
    for (const archetype of ARCHETYPES) {
      for (let offset = 0; offset < 4; offset += 1) {
        const sel = { archetype, rank: 'Foundation' as RankKey, offset, sampleCount: 6, fullCount: 4, registerCount: 3 };
        const sparks = selectNamingSparks(sel);
        const block = buildNamingBibleBlock({ ...sel, recentNamesStr: '' });
        expect(block).toContain(sparks.sampleNames.join(', '));
        expect(block).toContain(sparks.sampleFullNames.join(' ; '));
        for (const register of sparks.registers) expect(block).toContain(register);
      }
    }
  });

  it('labels every structure — an unlabelled key would render "undefined" to a director', () => {
    for (const archetype of ARCHETYPES) {
      const sparks = selectNamingSparks({
        archetype, rank: 'Foundation', offset: 0, sampleCount: 6, fullCount: 4, registerCount: 3,
      });
      expect(sparks.structures.length).toBeGreaterThan(0);
      for (const s of sparks.structures) {
        expect(typeof s.label).toBe('string');
        expect(s.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('carries every rank of epithet guidance, so the panel can show where a name may travel', () => {
    const sparks = selectNamingSparks({
      archetype: 'Barbarian', rank: 'Foundation', offset: 0, sampleCount: 6, fullCount: 4, registerCount: 3,
    });
    expect(sparks.epithetGuidance).toBe(EPITHET_BY_RANK.Foundation);
    for (const rank of RANK_KEYS) expect(sparks.epithetByRank[rank]).toBeTruthy();
  });

  it('clamps to what an archetype actually has — lists are different lengths', () => {
    for (const archetype of ARCHETYPES) {
      const guide = NAMING_BIBLE[archetype];
      const sparks = selectNamingSparks({
        archetype, rank: 'Foundation', offset: 2, sampleCount: 99, fullCount: 99, registerCount: 99,
      });
      expect(sparks.sampleNames).toHaveLength(guide.sampleNames.length);
      expect(sparks.registers).toHaveLength(guide.culturalRegisters.length);
    }
  });
});

// RANKS is imported to assert the rank union stays in step with the card type.
describe('rank coverage', () => {
  it('covers every Rank the card type defines', () => {
    expect([...RANKS].sort()).toEqual([...RANK_KEYS].sort() as Rank[]);
  });
});
