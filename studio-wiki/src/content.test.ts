import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { archetypes, bossStates, developmentCards, elements, navigation, permanentCards, searchEntries } from './content';
import { sectionsFromMarkdown } from './markdown';
import { isStudioPartnerRole } from './studioApi';
import { ARCHETYPE_NAMES } from '../../card-engine/src/types/card';
import { ELEMENT_NAMES } from '../../card-engine/src/types/bible';

describe('Studio Wiki content contracts', () => {
  it('limits shared Studio work to the two partner role classes', () => {
    expect(isStudioPartnerRole('admin')).toBe(true);
    expect(isStudioPartnerRole('lore_director')).toBe(true);
    expect(isStudioPartnerRole('user')).toBe(false);
    expect(isStudioPartnerRole(undefined)).toBe(false);
  });
  // These two compare the Wiki against the GAME, not against a number written
  // here. A count assertion passes forever while the Wiki quietly falls behind;
  // an equality assertion fails the moment the game grows, which is the only
  // signal that actually keeps this page honest.
  it('presents exactly the archetypes the game defines, in the game order', () => {
    expect(archetypes.map(([name]) => name)).toEqual([...ARCHETYPE_NAMES]);
  });

  it('presents exactly the elements the game defines, in the game order', () => {
    expect(elements.map(({ name }) => name)).toEqual([...ELEMENT_NAMES]);
    expect(elements.map(({ slug }) => slug)).toEqual(ELEMENT_NAMES.map((name) => name.toLowerCase()));
  });

  it('keeps the complete boss-state set', () => {
    expect(bossStates.map(({ id }) => id)).toEqual([
      'idle', 'windup', 'attack', 'ultimate', 'rage', 'hit', 'defeat',
    ]);
  });

  it('records combat-art coverage honestly rather than implying every element is done', () => {
    // Holy is procedural and Time is unauthored. If either gains real art the
    // count moves — that is a content decision worth failing a test over.
    expect(elements.find(({ slug }) => slug === 'holy')?.artStatus).toBe('procedural');
    expect(elements.find(({ slug }) => slug === 'time')?.artStatus).toBe('missing');
    expect(elements.filter(({ artStatus }) => artStatus === 'candidate')).toHaveLength(elements.length - 2);
  });

  it('states counts the page can derive rather than numbers typed into the markup', () => {
    // The Art & Assets tiles used to read "29 Element crystals" as a literal. That
    // was already wrong — Time has no crystal — and nothing would ever have caught
    // it. Any count the Wiki prints has to be countable from this module.
    const withCrystal = elements.filter(({ crystal }) => crystal);
    expect(withCrystal.length).toBeLessThan(elements.length);
    expect(elements.find(({ slug }) => slug === 'time')?.crystal).toBe('');

    const source = readFileSync(resolve(import.meta.dirname, 'App.tsx'), 'utf8');
    expect(source).not.toContain('>29 canonical elements');
    expect(source).not.toContain('<strong>29</strong><span>Element crystals');
    expect(source).not.toContain('<strong>11</strong><span>Integrated emblems');
  });

  it('does not expose duplicate routes', () => {
    const paths = navigation.flatMap(({ items }) => items.map(([path]) => path));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('presents the Battle Tower as the playable mode without losing its stable route', () => {
    const exploreItems = navigation.find(({ group }) => group === 'Explore')?.items;
    expect(exploreItems).toContainEqual(['/minigames', 'Battle Tower']);
  });

  it('keeps elements and abilities as separate first-class references', () => {
    const exploreItems = navigation.find(({ group }) => group === 'Explore')?.items;
    expect(exploreItems).toContainEqual(['/elements', 'Elements']);
    expect(exploreItems).toContainEqual(['/abilities', 'Abilities']);
  });

  it('keeps card tests separate from the human-accepted permanent roster', () => {
    expect(developmentCards).toHaveLength(5);
    expect(developmentCards.filter(({ kind }) => kind === 'candidate').map(({ name }) => name)).toEqual(['Gryndak', 'Seojin', 'Ashvara', 'Kael']);
    expect(developmentCards.filter(({ kind }) => kind === 'study').map(({ name }) => name)).toEqual(['Unnamed Druid']);
    expect(new Set(developmentCards.map(({ id }) => id)).size).toBe(developmentCards.length);
    expect(developmentCards.filter(({ tiers }) => tiers.every(({ image }) => image))).toHaveLength(2);
    expect(developmentCards.every(({ readiness }) => readiness.some(({ label, state }) => label === 'Human acceptance' && state === 'missing'))).toBe(true);
    expect(permanentCards).toHaveLength(0);
    expect(searchEntries).toContainEqual(expect.objectContaining({ path: '/characters/cards', title: 'Cards' }));
    const exploreItems = navigation.find(({ group }) => group === 'Explore')?.items;
    expect(exploreItems?.slice(2, 6)).toEqual([
      ['/bosses', 'Bosses & Arenas'],
      ['/characters/cards', 'Cards'],
      ['/elements', 'Elements'],
      ['/abilities', 'Abilities'],
    ]);
  });

  it('makes the coworker handbook a first-class Production destination', () => {
    const productionItems = navigation.find(({ group }) => group === 'Production')?.items;
    expect(productionItems?.[1]).toEqual(['/studio', 'AI Studio Handbook']);
  });

  it('labels the append-only studio memory as the Decision Log', () => {
    const productionItems = navigation.find(({ group }) => group === 'Production')?.items;
    expect(productionItems).toContainEqual(['/decisions', 'Decision Log']);
  });

  it('keeps advice, execution, deferred work, and Tori on separate Work Board routes', () => {
    const workBoard = navigation.find(({ group }) => group === 'Work Board')?.items;
    expect(workBoard).toEqual([
      ['/work/advice', 'AI Advice'],
      ['/work/active', 'Active Work'],
      ['/work/required', 'Required & Deferred'],
      ['/work/tori', "Tori's Desk"],
      ['/work/raheem', "Raheem's Desk"],
    ]);
  });

  it('adapts canonical Markdown into readable sections', () => {
    const sections = sectionsFromMarkdown('# Guide\nIntro\n## Status\n- Shipped');
    expect(sections).toEqual([
      { heading: 'Guide', level: 1, body: ['Intro'] },
      { heading: 'Status', level: 2, body: ['- Shipped'] },
    ]);
  });

  it('keeps blank lines, because they are the only paragraph boundaries left', () => {
    // PRODUCTION.md hard-wraps prose. Without the blanks there is no way to tell a
    // wrapped line from a new paragraph, and rejoining welds them together.
    const sections = sectionsFromMarkdown('## S\nfirst line\nwrapped on\n\nsecond para');
    expect(sections[0].body).toEqual(['first line', 'wrapped on', '', 'second para']);
  });

  it('captures level-3 subsections, which the Current Build page must reach', () => {
    // These were parsed and then made unreachable by a level<=2 table of contents,
    // hiding every recommendation, open-thread table, and decision-log entry.
    const sections = sectionsFromMarkdown('## Parent\nlead\n### Child\ndetail');
    expect(sections.map((section) => [section.heading, section.level])).toEqual([
      ['Parent', 2], ['Child', 3],
    ]);
    expect(sections[1].body).toEqual(['detail']);
  });
});
