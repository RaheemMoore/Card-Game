import { describe, it, expect } from 'vitest';
import {
  reachableCells,
  isFall,
  isBridge,
  BRIDGE_COL,
  RIFT_ROW,
} from './board';
import type { Unit, WarbandState, Side, Pos } from './types';

function mkUnit(id: string, side: Side, pos: Pos | null, over: Partial<Unit> = {}): Unit {
  return {
    id,
    side,
    name: id,
    element: 'fire',
    atk: 50,
    defMax: 50,
    def: 50,
    ability: 30,
    flier: false,
    move: 2,
    cost: 2,
    pos,
    state: 'none',
    statePower: 0,
    hasMoved: false,
    hasAttacked: false,
    fallen: false,
    ...over,
  };
}

function mkState(units: Unit[]): WarbandState {
  const rec: Record<string, Unit> = {};
  for (const u of units) rec[u.id] = u;
  return {
    turn: 1,
    active: 'player',
    energy: 1,
    units: rec,
    order: units.map((u) => u.id),
    crystals: {
      player: { side: 'player', facets: ['fire', 'ice', 'earth'], facetMax: 3 },
      enemy: { side: 'enemy', facets: ['fire', 'ice', 'earth'], facetMax: 3 },
    },
    reserves: { player: [], enemy: [] },
    selectedUnitId: null,
    winner: null,
    log: [],
  };
}

const has = (cells: Pos[], r: number, c: number) =>
  cells.some((p) => p.r === r && p.c === c);

describe('board roles', () => {
  it('centre rift cell is the bridge, other rift cells are the fall', () => {
    expect(isBridge({ r: RIFT_ROW, c: BRIDGE_COL })).toBe(true);
    expect(isFall({ r: RIFT_ROW, c: BRIDGE_COL })).toBe(false);
    expect(isFall({ r: RIFT_ROW, c: BRIDGE_COL + 1 })).toBe(true);
    expect(isFall({ r: RIFT_ROW - 1, c: 0 })).toBe(false);
  });
});

describe('reachableCells', () => {
  it('a grounded unit can step onto the bridge but not into the fall', () => {
    // sit just below the bridge cell
    const u = mkUnit('g', 'player', { r: RIFT_ROW + 1, c: BRIDGE_COL }, { move: 1, flier: false });
    const cells = reachableCells(mkState([u]), u);
    expect(has(cells, RIFT_ROW, BRIDGE_COL)).toBe(true); // onto the bridge
    // an adjacent fall cell one column over on the rift row is NOT reachable in 1 step
    expect(has(cells, RIFT_ROW, BRIDGE_COL + 1)).toBe(false);
  });

  it('a flier can cross a fall cell that a grounded unit cannot', () => {
    const pos = { r: RIFT_ROW + 1, c: BRIDGE_COL + 1 };
    const flier = mkUnit('f', 'player', pos, { move: 1, flier: true });
    const ground = mkUnit('g', 'player', pos, { move: 1, flier: false });
    expect(has(reachableCells(mkState([flier]), flier), RIFT_ROW, BRIDGE_COL + 1)).toBe(true);
    expect(has(reachableCells(mkState([ground]), ground), RIFT_ROW, BRIDGE_COL + 1)).toBe(false);
  });

  it('units block movement (cannot land on an occupied cell)', () => {
    const mover = mkUnit('a', 'player', { r: 6, c: 3 }, { move: 1 });
    const blocker = mkUnit('b', 'player', { r: 5, c: 3 });
    const cells = reachableCells(mkState([mover, blocker]), mover);
    expect(has(cells, 5, 3)).toBe(false); // occupied
    expect(has(cells, 6, 2)).toBe(true); // free neighbour
  });
});
