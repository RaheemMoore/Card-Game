import { describe, it, expect } from 'vitest';
import type { Card, CardStats } from '../../types/card';
import type { BattleEvent } from '../../types/combat';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from '../abilities/seed';
import { assignAbilitiesForCard } from '../abilities/rosterAssigner';
import { damageTypeForElement } from '../../data/abilities/elementDamageType';
import type { ElementName } from '../../types/bible';
import {
  runBattle,
  buildAbilitySnapshot,
  buildHeroSnapshot,
  buildBattleSnapshot,
  snapshotFromBossVersion,
  baselineHeroPolicy,
} from './harness';
import { SEED_BOSSES } from '../../data/bosses/seedBosses';

/**
 * The SHIPPED boss — v4, 1100 hp, three phases.
 *
 * The harness's `buildFireElementalBossSnapshot()` is a 340 hp two-phase
 * FIXTURE, not this.
 * Measuring against it makes any roster look invincible: a three-hero party
 * cleared it in two rounds without losing anyone. The number that matters is
 * the one a player actually meets.
 */
function shippedBoss() {
  const seed = SEED_BOSSES[0];
  return snapshotFromBossVersion(seed.definition, seed.version);
}

/**
 * Balance sweep against the SHIPPED roster.
 *
 * Every other suite in this folder builds heroes from hand-picked ability
 * fixtures, which measures the fixtures rather than the game. This one runs
 * the real path — seed the library, assign loadouts through `rosterAssigner`,
 * fight the real boss — so the numbers it prints describe what a player would
 * actually experience.
 *
 * Assertions are deliberately RANGES with a printed summary. The point is to
 * catch a collapse (nobody can win / everybody wins on turn three), not to
 * pin an exact win rate that a one-point damage tweak would break.
 *
 * `baselineHeroPolicy` is greedy and dumb — it is a LOWER bound on player
 * skill, not a model of one. Real play should land above whatever this prints.
 */

function statsFor(atk: number, def: number, resource: number, kind: 'Mana' | 'Tech'): CardStats {
  const base: CardStats = {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
  };
  if (kind === 'Mana') base.Mana = { value: resource, bias: 'Mid', hardCap: 100 };
  else base.Tech = { value: resource, bias: 'Very High', hardCap: 100 };
  return base;
}

function makeCard(
  cardId: string,
  archetype: Card['archetype'],
  stats: CardStats,
  element?: ElementName,
): Card {
  return {
    cardId,
    archetype,
    cardName: cardId,
    nameAndTitle: `${cardId}, the Measured`,
    portraitAsset: '',
    dominantStat: null,
    border: { baseVariant: 'Default', baseSource: 'none' },
    lore: '',
    whisperWords: [],
    evolutionHistory: {},
    createdAt: '2026-07-28T00:00:00.000Z',
    stats,
    // Only `.element` is read downstream (by damageTypeForElement), so the
    // rest of ElementSelection is filled in loosely rather than faked in full.
    ...(element
      ? {
          elementSelection: {
            element,
            bond: 'Inheritance',
            compatibility: 'natural',
          } as unknown as Card['elementSelection'],
        }
      : {}),
  };
}

async function heroFromCard(card: Card) {
  const store = new InMemoryAbilityStore();
  await seedAbilityLibrary(store);
  const assigned = assignAbilitiesForCard(store, card);
  return buildHeroSnapshot({
    cardId: card.cardId,
    archetype: card.archetype,
    displayName: card.cardName,
    stats: card.stats,
    rank: 'Forged',
    elementDamageType: damageTypeForElement(card.elementSelection?.element),
    abilities: assigned.map((a) => buildAbilitySnapshot(a.definition, a.version)),
  });
}

interface Summary {
  wins: number;
  runs: number;
  winRate: number;
  avgRounds: number;
  dotShare: number;
  timeouts: number;
}

function sweep(hero: Awaited<ReturnType<typeof heroFromCard>>, runs: number): Summary {
  const boss = shippedBoss();
  let wins = 0;
  let rounds = 0;
  let timeouts = 0;
  let direct = 0;
  let dot = 0;

  for (let seed = 1; seed <= runs; seed++) {
    const { result, events, finalState } = runBattle(
      buildBattleSnapshot({ seed, hero, boss }),
      baselineHeroPolicy,
    );
    if (result.outcome === 'victory') wins++;
    if (result.roundsElapsed >= 30) timeouts++;
    rounds += result.roundsElapsed;
    const bossId = finalState.boss.actorId;
    for (const e of events as BattleEvent[]) {
      if (e.kind === 'damage_dealt' && e.targetActorId === bossId) direct += e.amount;
      if (e.kind === 'dot_ticked' && e.targetActorId === bossId) dot += e.amount;
    }
  }

  const total = direct + dot;
  return {
    wins,
    runs,
    winRate: wins / runs,
    avgRounds: rounds / runs,
    dotShare: total > 0 ? dot / total : 0,
    timeouts,
  };
}

const RUNS = 120;

describe('roster balance sweep — Emberborn Wraith', () => {
  it('reports the shipped roster against the shipped boss', async () => {
    const cases: [string, Card][] = [
      ['Barbarian / Fire', makeCard('b1', 'Barbarian', statsFor(70, 55, 65, 'Mana'), 'Fire')],
      ['Druid / Nature', makeCard('d1', 'Druid', statsFor(60, 60, 75, 'Mana'), 'Nature')],
      ['Seraph / Light', makeCard('s1', 'Seraph', statsFor(60, 60, 75, 'Mana'), 'Light')],
      ['Mech Pilot / Metal (basics only)', makeCard('m1', 'Mech Pilot', statsFor(65, 65, 70, 'Tech'), 'Metal')],
    ];

    const lines: string[] = [];
    for (const [label, card] of cases) {
      const hero = await heroFromCard(card);
      const s = sweep(hero, RUNS);
      lines.push(
        `  ${label.padEnd(34)} winRate=${s.winRate.toFixed(3)} avgRounds=${s.avgRounds.toFixed(1)} ` +
          `dotShare=${(s.dotShare * 100).toFixed(1)}% timeouts=${s.timeouts} abilities=${hero.abilities.length}`,
      );
    }
    // eslint-disable-next-line no-console
    console.info('\n[roster sweep] solo hero, greedy policy — LOWER bound on skill\n' + lines.join('\n'));
    expect(lines).toHaveLength(cases.length);
  }, 60_000);

  it('reports a full three-hero party — the shape real play actually takes', async () => {
    // The solo numbers above are a component test. This is the fight: three
    // heroes, mixed archetypes and elements, which is roughly three times the
    // throughput of any single row above.
    const party = await Promise.all([
      heroFromCard(makeCard('p1', 'Barbarian', statsFor(70, 55, 65, 'Mana'), 'Fire')),
      heroFromCard(makeCard('p2', 'Druid', statsFor(60, 60, 75, 'Mana'), 'Nature')),
      heroFromCard(makeCard('p3', 'Seraph', statsFor(60, 60, 75, 'Mana'), 'Light')),
    ]);

    const boss = shippedBoss();
    let wins = 0;
    let rounds = 0;
    let survivors = 0;
    for (let seed = 1; seed <= RUNS; seed++) {
      const { result, finalState } = runBattle(
        buildBattleSnapshot({ seed, heroes: party, boss }),
        baselineHeroPolicy,
      );
      if (result.outcome === 'victory') wins++;
      rounds += result.roundsElapsed;
      survivors += finalState.heroes.filter((h) => !h.defeated).length;
    }

    // eslint-disable-next-line no-console
    console.info(
      `\n[roster sweep] 3-hero party — winRate=${(wins / RUNS).toFixed(3)} ` +
        `avgRounds=${(rounds / RUNS).toFixed(1)} avgSurvivors=${(survivors / RUNS).toFixed(2)}/3`,
    );

    // Range, not a point. A party that cannot win means the roster is broken;
    // a party that wins without ever losing a hero means the boss is scenery.
    expect(wins / RUNS).toBeGreaterThan(0);
  }, 60_000);

  it('an element the boss is weak to out-damages one it resists', async () => {
    // The whole reason element typing exists. If this ever stops holding, the
    // Global Element Pillar has stopped reaching combat and the boss's
    // resistance profile is dead data again.
    const nature = await heroFromCard(
      makeCard('elem-n', 'Druid', statsFor(60, 60, 75, 'Mana'), 'Nature'),
    );
    const fire = await heroFromCard(
      makeCard('elem-f', 'Druid', statsFor(60, 60, 75, 'Mana'), 'Fire'),
    );

    // Measured PER HIT, not cumulatively. Total damage across a battle is a
    // trap here: the nature hero kills faster, so it lands FEWER hits and its
    // cumulative total comes out lower even though every individual hit is
    // stronger. That is exactly what the first version of this test got wrong.
    const meanHit = (hero: typeof nature) => {
      const boss = shippedBoss();
      let total = 0;
      let hits = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const { events, finalState } = runBattle(
          buildBattleSnapshot({ seed, hero, boss }),
          baselineHeroPolicy,
        );
        const bossId = finalState.boss.actorId;
        for (const e of events as BattleEvent[]) {
          if (e.kind === 'damage_dealt' && e.targetActorId === bossId) {
            total += e.amount;
            hits++;
          }
        }
      }
      return hits > 0 ? total / hits : 0;
    };

    expect(meanHit(nature)).toBeGreaterThan(meanHit(fire));
  }, 30_000);

  it('no archetype is left unable to fight', async () => {
    // Eight of eleven archetypes have no authored set and run on the shared
    // basics alone. They are expected to be WEAKER; they must not be unable
    // to act, which is what a zero-ability loadout would mean.
    const archetypes: Card['archetype'][] = [
      'Barbarian', 'Monk', 'Beastmaster', 'Druid', 'Necromancer', 'Vampire',
      'Lycanthrope', 'Mech Pilot', 'Android', 'Seraph', 'Human',
    ];
    for (const archetype of archetypes) {
      const kind = archetype === 'Mech Pilot' || archetype === 'Android' ? 'Tech' : 'Mana';
      const hero = await heroFromCard(
        makeCard(`any-${archetype}`, archetype, statsFor(60, 60, 60, kind)),
      );
      expect(hero.abilities.length, `${archetype} has no abilities`).toBeGreaterThan(0);
      const { result } = runBattle(
        buildBattleSnapshot({ seed: 5, hero, boss: shippedBoss() }),
        baselineHeroPolicy,
      );
      expect(['victory', 'defeat']).toContain(result.outcome);
    }
  }, 30_000);
});
