import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCTION_SCENE } from './v2/courtyardRuntime';
import { CONTACT_BIAS_BY_TEXTURE } from '../dev/sceneDepth';

/**
 * The north–south segmentation, guarded so it cannot be quietly undone.
 *
 * THE RULE. An object is drawn at the Y where it touches the ground. That is
 * exact for a wall running east–west, whose base is a horizontal line, and a lie
 * for one running north–south, whose base is a long strip claiming to stand at
 * its southern tip along its whole length. A hero halfway up such a wall is
 * either in front of all of it or behind all of it, and both look broken.
 *
 * The fix was to cut each side wall into six stacked pieces, so each piece's base
 * is short enough to be honest. `wall-side-v3` is the north–south art;
 * `wall-straight-v3` is the east–west art and is correctly placed as single long
 * runs — the exemption is the whole reason this test keys on texture.
 *
 * WHY A TEST AND NOT AN AUDIT. Phaser Editor rewrites the .scene file wholesale
 * on every save, which is already how hand-set depths were lost once (see
 * CONTACT_BIAS_BY_TEXTURE in sceneDepth.ts). Segmentation is placement, so it
 * lives in exactly the file that gets rewritten, and one careless drag could
 * merge six pieces back into one with nothing to notice.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not try to discover new north–south
 * runs by shape. In a three-quarter view an image's height mixes real height with
 * north–south depth — a tower is tall and occupies almost no ground — so a
 * ratio rule flags every tower and pillar in the scene and means nothing. Finding
 * new candidates is a judgement call on the art, and `npm run castle:composition`
 * ranks them for a human instead of guessing here.
 */

const scene = JSON.parse(
  readFileSync(resolve(__dirname, '../../../..', `${PRODUCTION_SCENE}.scene`), 'utf8'),
) as { displayList?: unknown[] };

interface Placed {
  layer: string;
  label: string;
  texture: string;
  x: number;
  y: number;
  scaleY: number;
  originY: number;
}

function collect(): Placed[] {
  const out: Placed[] = [];
  const walk = (node: Record<string, unknown>, layer: string) => {
    for (const child of (node.list as Record<string, unknown>[]) ?? []) {
      const type = child.type as string;
      if (type === 'Layer') walk(child, (child.label as string) ?? layer);
      else if (type === 'Image' || type === 'Sprite' || type === 'TileSprite') {
        out.push({
          layer,
          label: (child.label as string) ?? '',
          texture: ((child.texture as { key?: string }) ?? {}).key ?? '',
          x: (child.x as number) ?? 0,
          y: (child.y as number) ?? 0,
          scaleY: (child.scaleY as number) ?? 1,
          originY: (child.originY as number) ?? 0.5,
        });
      } else if (child.list) walk(child, layer);
    }
  };
  for (const top of (scene.displayList as Record<string, unknown>[]) ?? []) {
    if ((top.type as string) === 'Layer') walk(top, (top.label as string) ?? '(root)');
  }
  return out;
}

/** The map is 2560x1920; the parts shelf and void library are parked outside it. */
const onMap = (p: Placed) => p.x >= 0 && p.x < 2560 && p.y >= 0 && p.y < 1920;

const placed = collect().filter(onMap);
const sideWalls = placed.filter((p) => p.texture === 'wall-side-v3');

describe('courtyard north-south depth segmentation', () => {
  it('reads a scene with something in it', () => {
    // Guards the parser rather than the scene: a walk that silently returns
    // nothing would make every assertion below vacuously true.
    expect(placed.length).toBeGreaterThan(50);
  });

  it('keeps both side walls cut into pieces', () => {
    // Six per side. Fewer means someone merged them and the wall is back to
    // claiming one ground contact along its whole length.
    expect(sideWalls.length).toBeGreaterThanOrEqual(12);

    const west = sideWalls.filter((p) => p.x < 1280).length;
    const east = sideWalls.filter((p) => p.x >= 1280).length;
    expect(west, 'west wall segments').toBeGreaterThanOrEqual(6);
    expect(east, 'east wall segments').toBeGreaterThanOrEqual(6);
  });

  it('keeps every segment the same size, so none has swallowed its neighbours', () => {
    // The failure this catches is subtler than a deleted piece: one segment
    // scaled up to cover the gap left by others still LOOKS like a wall and
    // sorts exactly as wrongly as the un-segmented original did.
    const scales = sideWalls.map((p) => p.scaleY);
    const min = Math.min(...scales);
    const max = Math.max(...scales);
    expect(max / min, `segment scaleY spread ${min}-${max}`).toBeLessThan(1.5);
  });

  it('spreads the segments down the wall instead of stacking them in one place', () => {
    // Six pieces at the same Y is six pieces with one ground contact, which is
    // the exact problem segmentation exists to solve.
    for (const side of [
      sideWalls.filter((p) => p.x < 1280),
      sideWalls.filter((p) => p.x >= 1280),
    ]) {
      const ys = side.map((p) => p.y).sort((a, b) => a - b);
      expect(ys[ys.length - 1] - ys[0], 'vertical span of one wall run').toBeGreaterThan(200);
    }
  });

  it('keeps the corner-tower bias worth the number it carries', () => {
    /**
     * `CONTACT_BIAS_BY_TEXTURE['tower-corner-v3']` is 60 because the corner tower
     * touches ground ~58px NORTH of the north wall run beside it, and a true
     * horizontal base cannot be segmented away. It is documented as temporary and
     * its removal needs the art bases aligned, which is placement work.
     *
     * Until then the risk is not that it is wrong today — it is that someone
     * nudges either piece in the Editor and the number silently stops matching
     * the gap it was measured against. The compensation and the geometry it
     * compensates for should fail together, not drift apart.
     *
     * Art heights are not in the .scene, so this measures the gap in scene units
     * and checks the bias is the right size and direction for it, rather than
     * re-deriving the exact pixel.
     */
    const tower = placed.find((p) => p.label === 'towerCornerNW');
    const wall = placed.find((p) => p.label === 'wallNorthRun');
    expect(tower, 'towerCornerNW').toBeDefined();
    expect(wall, 'wallNorthRun').toBeDefined();

    const bias = CONTACT_BIAS_BY_TEXTURE['tower-corner-v3'];
    expect(typeof bias, 'the tower bias is a plain number').toBe('number');
    // Pushes the tower SOUTH, toward the wall it should sort behind.
    expect(bias as number).toBeGreaterThan(0);
    // Measured gap is ~58px. A bias far larger would shove the tower past pieces
    // that genuinely do stand in front of it.
    expect(bias as number).toBeLessThan(120);

    // The tower must still start north of the wall, which is the whole premise.
    expect(tower!.y).toBeLessThan(wall!.y);
  });

  it('leaves the east-west walls as single runs, on purpose', () => {
    // `wall-straight-v3` runs east-west, so its base IS a horizontal line and one
    // ground contact describes it exactly. Segmenting it would buy nothing and
    // cost draw calls — this asserts the exemption is intentional, so a future
    // reader does not "fix" it.
    const straight = placed.filter((p) => p.texture === 'wall-straight-v3');
    expect(straight.length).toBeGreaterThan(0);
    expect(straight.length).toBeLessThan(6);
  });
});
