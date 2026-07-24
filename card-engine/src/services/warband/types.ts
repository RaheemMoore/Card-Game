// Warband battle mode — core state shape (MVP).
// Isolated from services/combat/ (boss battles) by design: this is positional,
// Def=HP, simultaneous-trade combat. See card-engine-warband-battle-design.md.

export type Side = 'player' | 'enemy';

// MVP element set for the hand-authored roster. Full 26-element mapping is deferred.
export type ElementId = 'fire' | 'ice' | 'storm' | 'earth' | 'void';

// MVP applies only 'frozen' (drives Freeze -> Melt). More states land later.
export type UnitState = 'none' | 'frozen';

export interface Pos {
  r: number;
  c: number;
}

export interface Unit {
  id: string;
  side: Side;
  name: string;
  element: ElementId;
  atk: number;
  defMax: number; // toughness stat; also the starting HP pool
  def: number; // live HP pool; unit Falls at <= 0
  ability: number; // Mana|Tech collapsed — powers abilities/reactions, not the clash
  flier: boolean; // can cross the rift via a fly route
  move: number; // reachable range, in cells
  cost: number; // energy to deploy from reserve
  abilityName?: 'Freeze' | 'Ignite'; // active ability shown in the rail (MVP)
  pos: Pos | null; // null = still in reserve
  state: UnitState;
  statePower: number; // ability value that applied the current state (scales reactions)
  hasMoved: boolean;
  hasAttacked: boolean;
  fallen: boolean;
}

export interface Crystal {
  side: Side;
  facets: ElementId[]; // remaining facets (breaking all = defeat)
  facetMax: number;
}

export type EventKind =
  | 'deploy'
  | 'move'
  | 'attack'
  | 'reaction'
  | 'ability'
  | 'fall'
  | 'crystal'
  | 'turn'
  | 'win';

export interface WarbandEvent {
  kind: EventKind;
  text: string;
  unitId?: string;
  targetId?: string;
  amount?: number;
}

export type Action =
  | { t: 'select'; unitId: string | null }
  | { t: 'deploy'; unitId: string; to: Pos }
  | { t: 'move'; unitId: string; to: Pos }
  | { t: 'attackUnit'; unitId: string; targetId: string }
  | { t: 'attackCrystal'; unitId: string }
  | { t: 'ability'; unitId: string; targetId: string }
  | { t: 'endTurn' };

export interface WarbandState {
  turn: number;
  active: Side;
  energy: number; // ramps: equals the turn number
  units: Record<string, Unit>;
  order: string[]; // stable id order for iteration + rendering
  crystals: Record<Side, Crystal>;
  reserves: Record<Side, string[]>; // undeployed unit ids
  selectedUnitId: string | null;
  winner: Side | null;
  log: WarbandEvent[];
}
