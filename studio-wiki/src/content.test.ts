import { describe, expect, it } from 'vitest';
import { archetypes, bossStates, elements, navigation } from './content';
import { sectionsFromMarkdown } from './markdown';

describe('Studio Wiki content contracts', () => {
  it('keeps the complete archetype and boss-state sets', () => {
    expect(archetypes).toHaveLength(11);
    expect(new Set(archetypes.map(([name]) => name)).size).toBe(11);
    expect(bossStates.map(({ id }) => id)).toEqual([
      'idle', 'windup', 'attack', 'ultimate', 'rage', 'hit', 'defeat',
    ]);
  });

  it('indexes the complete element language and the committed combat-art coverage', () => {
    expect(elements).toHaveLength(29);
    expect(new Set(elements.map(({ slug }) => slug)).size).toBe(29);
    expect(elements.filter(({ artStatus }) => artStatus === 'candidate')).toHaveLength(27);
    expect(elements.find(({ slug }) => slug === 'holy')?.artStatus).toBe('procedural');
    expect(elements.find(({ slug }) => slug === 'time')?.artStatus).toBe('missing');
  });

  it('does not expose duplicate routes', () => {
    const paths = navigation.flatMap(({ items }) => items.map(([path]) => path));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('presents the Battle Tower as the playable mode without losing its stable route', () => {
    const exploreItems = navigation.find(({ group }) => group === 'Explore')?.items;
    expect(exploreItems).toContainEqual(['/minigames', 'Battle Tower']);
  });

  it('makes the coworker handbook a first-class Production destination', () => {
    const productionItems = navigation.find(({ group }) => group === 'Production')?.items;
    expect(productionItems?.[1]).toEqual(['/studio', 'AI Studio Handbook']);
  });

  it('keeps advice, execution, deferred work, and Tori on separate Work Board routes', () => {
    const workBoard = navigation.find(({ group }) => group === 'Work Board')?.items;
    expect(workBoard).toEqual([
      ['/work/advice', 'AI Advice'],
      ['/work/active', 'Active Work'],
      ['/work/required', 'Required & Deferred'],
      ['/work/tori', "Tori's Desk"],
    ]);
  });

  it('adapts canonical Markdown into readable sections', () => {
    const sections = sectionsFromMarkdown('# Guide\nIntro\n## Status\n- Shipped');
    expect(sections).toEqual([
      { heading: 'Guide', level: 1, body: ['Intro'] },
      { heading: 'Status', level: 2, body: ['- Shipped'] },
    ]);
  });
});
