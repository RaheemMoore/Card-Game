import colliderData from '../../../assets/dev-preview/forge/collision/colliders.json';
import { HERO_FEET } from '../../../data/castle/heroSprite';

const FIGMA_NODES = {
  'forge-footprint': '61:2',
  'counter-cabinet-footprint': '61:4',
  'bench-footprint': '61:6',
} as const;

type ColliderId = keyof typeof FIGMA_NODES;

export interface PreviewForgeCollider {
  id: string;
  objectId: ColliderId;
  figmaNode: (typeof FIGMA_NODES)[ColliderId];
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PREVIEW_FORGE_COLLIDER_GRID = colliderData.grid;

export const PREVIEW_FORGE_COLLIDERS: PreviewForgeCollider[] =
  colliderData.colliders.flatMap((object) => {
    const objectId = object.id as ColliderId;
    return object.boxes.map((box, index) => ({
      id: `${objectId}-${index}`,
      objectId,
      figmaNode: FIGMA_NODES[objectId],
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      width: box.width,
      height: box.height,
    }));
  });

const boxesFor = (id: ColliderId) =>
  PREVIEW_FORGE_COLLIDERS.filter((box) => box.objectId === id);

const counterFront = Math.max(
  ...boxesFor('counter-cabinet-footprint').map((box) => box.y + box.height / 2),
);
const benchBack = Math.min(
  ...boxesFor('bench-footprint').map((box) => box.y - box.height / 2),
);
const forgeFront = Math.max(
  ...boxesFor('forge-footprint').map((box) => box.y + box.height / 2),
);
const counterBack = Math.min(
  ...boxesFor('counter-cabinet-footprint').map((box) => box.y - box.height / 2),
);

const NAVIGATION_TOLERANCE = 4;

export const PREVIEW_FORGE_AISLE = {
  counterFront,
  benchBack,
  availableClearance: benchBack - counterFront,
  heroFeetHeight: HERO_FEET.height,
  navigationTolerance: NAVIGATION_TOLERANCE,
  requiredClearance: HERO_FEET.height + NAVIGATION_TOLERANCE,
  navigableByGeometry:
    benchBack - counterFront >= HERO_FEET.height + NAVIGATION_TOLERANCE,
} as const;

export const PREVIEW_FORGE_COUNTER_AISLE = {
  forgeFront,
  counterBack,
  availableClearance: counterBack - forgeFront,
  heroFeetHeight: HERO_FEET.height,
  navigationTolerance: NAVIGATION_TOLERANCE,
  requiredClearance: HERO_FEET.height + NAVIGATION_TOLERANCE,
  navigableByGeometry:
    counterBack - forgeFront >= HERO_FEET.height + NAVIGATION_TOLERANCE,
} as const;
