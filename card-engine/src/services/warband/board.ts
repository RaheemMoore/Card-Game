// Board geometry for the 7x7 top-down canyon board.
// Players hold the top and bottom rows; a horizontal rift splits the middle;
// the centre column is the bridge (ground crossing); the other rift cells are
// the fall — only fliers cross them.

import type { Pos, Side, Unit, WarbandState } from './types';

export const ROWS = 7;
export const COLS = 7;
export const RIFT_ROW = 3;
export const BRIDGE_COL = 3;

export const key = (p: Pos): string => `${p.r},${p.c}`;

export const inBounds = (p: Pos): boolean =>
  p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS;

export const isBridge = (p: Pos): boolean =>
  p.r === RIFT_ROW && p.c === BRIDGE_COL;

// A "fall" cell: on the rift row but not the bridge — grounded units cannot enter.
export const isFall = (p: Pos): boolean =>
  p.r === RIFT_ROW && p.c !== BRIDGE_COL;

export const homeRows = (side: Side): number[] =>
  side === 'player' ? [ROWS - 1, ROWS - 2] : [0, 1];

export const adjacent = (a: Pos, b: Pos): boolean =>
  Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

// Grounded units cannot enter a fall cell; fliers can.
export function passableFor(unit: Unit, p: Pos): boolean {
  if (!inBounds(p)) return false;
  if (isFall(p) && !unit.flier) return false;
  return true;
}

export function occupiedAt(state: WarbandState, p: Pos): Unit | null {
  for (const id of state.order) {
    const u = state.units[id];
    if (u.fallen || !u.pos) continue;
    if (u.pos.r === p.r && u.pos.c === p.c) return u;
  }
  return null;
}

const NEIGHBORS: Pos[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

// BFS over empty, passable cells within `unit.move` steps. Units block the path
// (you cannot move through or land on an occupied cell).
export function reachableCells(state: WarbandState, unit: Unit): Pos[] {
  if (!unit.pos) return [];
  const seen = new Set<string>([key(unit.pos)]);
  let frontier: Pos[] = [unit.pos];
  const out: Pos[] = [];
  for (let step = 0; step < unit.move; step++) {
    const next: Pos[] = [];
    for (const cur of frontier) {
      for (const d of NEIGHBORS) {
        const np: Pos = { r: cur.r + d.r, c: cur.c + d.c };
        const k = key(np);
        if (seen.has(k)) continue;
        seen.add(k);
        if (!passableFor(unit, np)) continue;
        if (occupiedAt(state, np)) continue;
        out.push(np);
        next.push(np);
      }
    }
    frontier = next;
  }
  return out;
}

// Enemy units adjacent to `unit` (valid clash targets).
export function adjacentEnemies(state: WarbandState, unit: Unit): Unit[] {
  if (!unit.pos) return [];
  const out: Unit[] = [];
  for (const id of state.order) {
    const u = state.units[id];
    if (u.fallen || !u.pos || u.side === unit.side) continue;
    if (adjacent(unit.pos, u.pos)) out.push(u);
  }
  return out;
}
