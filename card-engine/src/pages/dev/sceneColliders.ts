/**
 * The collision layer — read out of whatever the Phaser Editor saved.
 *
 * Raheem, 2026-08-07: he wanted to author collision the same way he authors
 * everything else in the courtyard — by drawing it in the Editor and pressing
 * Ctrl+S. So this module contains no coordinates at all. Every blocking shape in
 * the game is a Rectangle he drew inside the `L14_COLLIDERS` layer.
 *
 * WHY A LAYER OF RECTANGLES, AND NOT ARCADE PHYSICS BODIES
 *
 * Arcade bodies are axis-aligned: rotating a rectangle does not rotate its body,
 * so a wall that leans with the castle's perspective would seal off open paving
 * at both ends. The courtyard has one walking character, no projectiles and no
 * bouncing, so it does not need a physics simulation — only "may the feet go
 * here?". That is a point-in-polygon test, which handles a rotated rectangle
 * exactly. The maths already exists and is unit-tested: `walkBlocking.ts`.
 *
 * Consequence for the author: **a rotated rectangle just works.** Draw the wall
 * along the lean, do not square it off into a staircase of little boxes.
 *
 * HOW A RECTANGLE SAYS WHAT IT IS
 *
 * The Editor does not give a game object a runtime name — the label in the
 * Outline becomes a variable name in the generated file and nothing else. So the
 * meaning is carried by FILL COLOUR, which has the happy side effect of being
 * readable at a glance on the canvas without opening anything.
 *
 *   red   #ff3355  BLOCK — solid. The hero cannot enter it.
 *   blue  #33ccff  ZONE  — passable trigger. Entering it fires an event.
 *
 * Anything else in the layer is ignored, deliberately: a scratch shape you are
 * still positioning does nothing until you give it a meaning colour.
 */

import type Phaser from 'phaser';
import type { Polygon } from '../castle/v2-preview/walkBlocking';

/** The Editor label `L14_COLLIDERS` compiles to this class field. */
export const COLLIDER_LAYER_VAR = 'l14_COLLIDERS';

export const COLLIDER_COLORS = {
  block: 0xff3355,
  zone: 0x33ccff,
} as const;

export type ColliderKind = keyof typeof COLLIDER_COLORS;

export interface SceneZone {
  polygon: Polygon;
  /** Editor-drawn bounds, for a cheap centre-point test. */
  rect: { x: number; y: number; width: number; height: number };
}

export interface SceneColliders {
  blockers: Polygon[];
  zones: SceneZone[];
  /** Every shape found, so the preview can show/hide them as one. */
  shapes: Phaser.GameObjects.Rectangle[];
  /** True when the scene has no `L14_COLLIDERS` layer at all. */
  missing: boolean;
}

/**
 * Four world-space corners of a Rectangle, honouring origin, scale and rotation.
 *
 * Editor rectangles default to origin 0,0 (top-left) but nothing stops a hand
 * placed one from using 0.5,0.5 — reading `originX/Y` off the object rather than
 * assuming is the difference between a wall that blocks and a wall that blocks
 * somewhere else entirely.
 */
function cornersOf(r: Phaser.GameObjects.Rectangle): Polygon {
  const w = r.width * r.scaleX;
  const h = r.height * r.scaleY;
  const ox = -r.originX * w;
  const oy = -r.originY * h;

  const local: [number, number][] = [
    [ox, oy],
    [ox + w, oy],
    [ox + w, oy + h],
    [ox, oy + h],
  ];

  const cos = Math.cos(r.rotation);
  const sin = Math.sin(r.rotation);
  return local.map(([lx, ly]) => [
    r.x + lx * cos - ly * sin,
    r.y + lx * sin + ly * cos,
  ]) as Polygon;
}

const isRectangle = (o: unknown): o is Phaser.GameObjects.Rectangle =>
  typeof o === 'object' &&
  o !== null &&
  'width' in o &&
  'height' in o &&
  'fillColor' in o &&
  'originX' in o;

/**
 * Pull the collision layer off a running scene.
 *
 * Called once, after the compiled `editorCreate()` has run. Everything it finds
 * is a plain snapshot — the shapes never move, so there is nothing to keep in
 * sync frame to frame.
 */
export function readSceneColliders(scene: Phaser.Scene): SceneColliders {
  const layer = (scene as unknown as Record<string, Phaser.GameObjects.Layer | undefined>)[
    COLLIDER_LAYER_VAR
  ];

  if (!layer || typeof layer.getAll !== 'function') {
    return { blockers: [], zones: [], shapes: [], missing: true };
  }

  const blockers: Polygon[] = [];
  const zones: SceneZone[] = [];
  const shapes: Phaser.GameObjects.Rectangle[] = [];

  for (const child of layer.list) {
    if (!isRectangle(child)) continue;
    const kind = kindOf(child.fillColor);
    if (!kind) continue;

    shapes.push(child);
    const polygon = cornersOf(child);

    if (kind === 'block') {
      blockers.push(polygon);
    } else {
      const xs = polygon.map((p) => p[0]);
      const ys = polygon.map((p) => p[1]);
      zones.push({
        polygon,
        rect: {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        },
      });
    }
  }

  return { blockers, zones, shapes, missing: false };
}

/**
 * Colours are matched with a small tolerance per channel. The Editor's colour
 * picker is a picker — a shape nudged to #ff3457 while fiddling should still be
 * a wall, rather than silently becoming decoration.
 */
function kindOf(fill: number): ColliderKind | undefined {
  for (const [kind, ref] of Object.entries(COLLIDER_COLORS) as [ColliderKind, number][]) {
    if (near(fill, ref)) return kind;
  }
  return undefined;
}

function near(a: number, b: number, tolerance = 24): boolean {
  const ch = (v: number, shift: number) => (v >> shift) & 0xff;
  return (
    Math.abs(ch(a, 16) - ch(b, 16)) <= tolerance &&
    Math.abs(ch(a, 8) - ch(b, 8)) <= tolerance &&
    Math.abs(ch(a, 0) - ch(b, 0)) <= tolerance
  );
}
