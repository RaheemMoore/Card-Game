#!/usr/bin/env python3
"""
Turn Raheem's Figma traces into occluder cutouts and collider boxes.

WHY A HUMAN TRACES. Three automatic methods were tried on this plate and each
failed on the same class of object — colour distance (inverted the mask on the
lamps, keeping paving and discarding the post), GrabCut, and watershed. The art
blends pale stone into pale stone with no edge to find. A person sees the
boundary instantly. See .claude/skills/trace-environment/SKILL.md.

WHAT COMES OUT

  occluders/<id>.png      the object cut from the plate, transparent elsewhere
  occluders/occluders.json   x, y, width, height, groundY per object

  colliders are printed as axis-aligned boxes ready to paste into scenery.ts

GROUND LINE IS DERIVED, NOT GUESSED. For an accurate silhouette the bottom of
the shape IS where the object meets the floor. Every groundY hand-tuned before
this existed was wrong at least once; this removes the guess.

COLLIDERS BECOME MANY BOXES, NOT ONE. Arcade physics bodies are axis-aligned, so
a single box around an L-shaped bush claims the empty corner — that bug shipped
once. Instead the traced shape is rasterised and decomposed into a set of boxes
that follow it. Rotation, curves and concave shapes all work; the author draws
whatever fits the object.

Usage:
  import_traces.py <traces.json> <plate.png> <out_dir> [--qa qa.png]
"""
import json
import os
import re
import sys
import numpy as np
from PIL import Image, ImageDraw

# Collider decomposition granularity, in plate pixels. Small enough that the
# stair-stepping on a diagonal is under a footstep; large enough that a scene
# stays in the low hundreds of bodies rather than thousands.
GRID = 8

TOKEN = re.compile(r'([MLCQZmlcqz])|(-?\d*\.?\d+(?:e-?\d+)?)')


def parse_path(d):
    """SVG path -> list of closed point rings, in the path's own coordinates.

    Figma emits M/L/C/Q/Z. Curves are flattened to polylines: these are masks,
    and a mask is judged by the pixels it covers, not by its smoothness.
    """
    toks = [(c or n) for c, n in TOKEN.findall(d)]
    rings, ring, cur, start, i = [], [], (0.0, 0.0), (0.0, 0.0), 0

    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    def flatten(p0, ctrl, p3, steps=12):
        """Cubic (or quadratic promoted to cubic) -> points, endpoint included."""
        p1, p2 = ctrl
        out = []
        for s in range(1, steps + 1):
            t = s / steps
            u = 1 - t
            out.append((
                u**3 * p0[0] + 3*u*u*t * p1[0] + 3*u*t*t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3*u*u*t * p1[1] + 3*u*t*t * p2[1] + t**3 * p3[1],
            ))
        return out

    while i < len(toks):
        cmd = toks[i]; i += 1
        if cmd == 'M':
            if len(ring) > 2:
                rings.append(ring)
            cur = start = (num(), num())
            ring = [cur]
        elif cmd == 'L':
            cur = (num(), num()); ring.append(cur)
        elif cmd == 'C':
            c1 = (num(), num()); c2 = (num(), num()); p = (num(), num())
            ring += flatten(cur, (c1, c2), p); cur = p
        elif cmd == 'Q':
            c = (num(), num()); p = (num(), num())
            # promote quadratic to cubic
            c1 = (cur[0] + 2/3*(c[0]-cur[0]), cur[1] + 2/3*(c[1]-cur[1]))
            c2 = (p[0] + 2/3*(c[0]-p[0]), p[1] + 2/3*(c[1]-p[1]))
            ring += flatten(cur, (c1, c2), p); cur = p
        elif cmd in 'Zz':
            if len(ring) > 2:
                rings.append(ring)
            ring = [start]; cur = start
        else:
            raise SystemExit(f'unsupported path command {cmd!r} — extend parse_path')

    if len(ring) > 2:
        rings.append(ring)
    return rings


def leaf_rings(leaf):
    """A leaf's outline(s) in PLATE coordinates."""
    a, c, tx, b, d, ty = leaf['m']
    xf = lambda p: (a * p[0] + c * p[1] + tx, b * p[0] + d * p[1] + ty)

    if leaf['t'] == 'VECTOR':
        rings = []
        for path in leaf.get('p', []):
            rings += parse_path(path)
    elif leaf['t'] == 'ELLIPSE':
        w, h = leaf['w'], leaf['h']
        rings = [[(w/2 + w/2*np.cos(t), h/2 + h/2*np.sin(t))
                  for t in np.linspace(0, 2*np.pi, 72, endpoint=False)]]
    else:  # RECTANGLE / FRAME / anything box-shaped
        w, h = leaf['w'], leaf['h']
        rings = [[(0, 0), (w, 0), (w, h), (0, h)]]

    return [[xf(p) for p in r] for r in rings]


def rasterise(obj, size):
    """Union every leaf of one object into a full-plate mask."""
    img = Image.new('L', size, 0)
    d = ImageDraw.Draw(img)
    for leaf in obj['leaves']:
        for ring in leaf_rings(leaf):
            if len(ring) > 2:
                d.polygon(ring, fill=255)
    return np.array(img) > 127


def boxes_from_mask(mask, grid=GRID):
    """Decompose a mask into axis-aligned boxes.

    Rows of runs, then merge vertically wherever a run repeats identically in
    the row below. Gives long horizontal strips on flat edges and a staircase on
    diagonals — which is the honest shape of the constraint.
    """
    h, w = mask.shape
    gh, gw = h // grid, w // grid
    small = mask[:gh*grid, :gw*grid].reshape(gh, grid, gw, grid).mean(axis=(1, 3)) > 0.4

    runs = []                      # (row, x0, x1) half-open in grid units
    for y in range(gh):
        x = 0
        while x < gw:
            if small[y, x]:
                x0 = x
                while x < gw and small[y, x]:
                    x += 1
                runs.append([y, x0, x])
            else:
                x += 1

    boxes, used = [], [False] * len(runs)
    by_row = {}
    for i, (y, x0, x1) in enumerate(runs):
        by_row.setdefault(y, []).append(i)

    for i, (y, x0, x1) in enumerate(runs):
        if used[i]:
            continue
        used[i] = True
        y1 = y + 1
        while True:
            nxt = next((j for j in by_row.get(y1, [])
                        if not used[j] and runs[j][1] == x0 and runs[j][2] == x1), None)
            if nxt is None:
                break
            used[nxt] = True
            y1 += 1
        boxes.append({
            'x': x0 * grid, 'y': y * grid,
            'width': (x1 - x0) * grid, 'height': (y1 - y) * grid,
        })
    return boxes


# Horizontal slice height for banded objects, in plate pixels.
#
# MUST STAY BELOW HERO_FEET.height (20). A band sorts on its slice boundary, so
# its ground line can sit up to BAND_H below the object's actual lowest pixel in
# a given column. The hero stops one feet-box (20px) short of a collider, so any
# band taller than that can still draw over him after he has stopped. At 24 this
# left two columns of the fountain rim wrong; 12 clears the margin.
BAND_H = 12


def slices(name, mask, plate, band):
    """One occluder, or several horizontal bands of one.

    WHY BANDS. A single ground line assumes an object's whole footprint sits at
    one depth. True for a lamp post; false for anything with a wide base. The
    fountain's bottom edge runs from y 621 at its sides to y 741 at its centre,
    but one number governed the lot — so walking up to it anywhere except the
    middle third left the hero stopped ABOVE the ground line and drawn behind.
    Raheem: "I go under it when coming from the bottom."

    Slicing horizontally gives each band its own ground line, so the parts of the
    object below you draw in front and the parts above draw behind — which is
    what a round basin actually looks like.

    NOT for lamps and other overhangs. A lamp's ground contact is the foot of its
    post and its head leans up-screen over floor you may stand on; banding it
    would draw the head BEHIND a player standing behind the post. Band things you
    walk AROUND, not things you walk BEHIND.
    """
    ys, xs = np.nonzero(mask)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

    if not band:
        cut = plate.crop((x0, y0, x1, y1))
        cut.putalpha(Image.fromarray((mask[y0:y1, x0:x1] * 255).astype(np.uint8), 'L'))
        # The bottom of an accurate silhouette IS the ground line.
        return [({'id': name, 'x': x0, 'y': y0,
                  'width': x1 - x0, 'height': y1 - y0, 'groundY': y1}, cut)]

    out = []
    for i, top in enumerate(range(y0, y1, BAND_H)):
        bot = min(top + BAND_H, y1)
        strip = mask[top:bot]
        if not strip.any():
            continue
        sxs = np.nonzero(strip.any(axis=0))[0]
        bx0, bx1 = int(sxs.min()), int(sxs.max()) + 1
        cut = plate.crop((bx0, top, bx1, bot))
        cut.putalpha(Image.fromarray((strip[:, bx0:bx1] * 255).astype(np.uint8), 'L'))
        out.append(({'id': f'{name}-band{i}', 'x': bx0, 'y': top,
                     'width': bx1 - bx0, 'height': bot - top,
                     # Each band sorts on its OWN bottom edge.
                     'groundY': bot}, cut))
    return out


def main(traces_path, plate_path, out_dir, qa_path=None):
    traces = json.load(open(traces_path))
    plate = Image.open(plate_path).convert('RGBA')
    size = plate.size
    os.makedirs(out_dir, exist_ok=True)

    # Objects the player walks AROUND rather than merely behind. See BAND_H.
    banded = set(traces.get('banded', []))

    # Shapes traced as the WALKABLE HOLE rather than the solid.
    #
    # A collider marks area the player cannot enter. Outside a room that area is
    # effectively unbounded, and a human cannot draw unbounded. Tracing the floor
    # you CAN stand on is easy and unambiguous, so those shapes are named in
    # `invert` and flipped here. Raheem asked the obvious question — "what goes
    # between the two rings?" — and the honest answer was nothing, which is what
    # this replaces.
    invert = set(traces.get('invert', []))

    manifest, qa = [], []
    print('OCCLUDERS')
    for obj in traces['occluders']:
        mask = rasterise(obj, size)
        if not mask.any():
            raise SystemExit(f'{obj["name"]}: empty mask')

        for meta, cut in slices(obj['name'], mask, plate, obj['name'] in banded):
            cut.save(os.path.join(out_dir, f'{meta["id"]}.png'))
            manifest.append(meta)
            qa.append((meta['id'], cut))
            print(f'  {meta["id"]:22} {meta["width"]:>4}x{meta["height"]:<4} '
                  f'at ({meta["x"]},{meta["y"]})  groundY {meta["groundY"]}')

    with open(os.path.join(out_dir, 'occluders.json'), 'w') as f:
        json.dump({'plate': os.path.basename(plate_path),
                   'plateSize': {'width': size[0], 'height': size[1]},
                   'occluders': manifest,
                   'note': ('Traced in Figma, cut from the plate so they match it '
                            'exactly. Draw at (x,y) origin (0,0), depth = groundY. '
                            'Regenerate with scripts/sprite-lab/lib/import_traces.py.')},
                  f, indent=2)

    print('\nCOLLIDERS')
    # A solid volume you can never enter has one true shape, so let its collider
    # BE its silhouette rather than a second drawing of the same thing that can
    # drift. The fountain's separately-traced collider sat ~20px inside the
    # painted stone rim, leaving a lip the player could stand on.
    solid = set(traces.get('solidFromOccluder', []))
    by_name = {o['name']: o for o in traces['occluders']}

    total = 0
    col_out = []
    for obj in traces['colliders']:
        src = by_name[obj['name']] if obj['name'] in solid else obj
        mask = rasterise(src, size)
        if obj['name'] in invert:
            # Traced as the WALKABLE HOLE, so the solid is its complement.
            mask = ~mask
        boxes = boxes_from_mask(mask)
        total += len(boxes)
        col_out.append({'id': obj['name'], 'boxes': boxes})
        print(f'  {obj["name"]:18} {len(boxes):>3} boxes')
    with open(os.path.join(out_dir, 'colliders.json'), 'w') as f:
        json.dump({'grid': GRID, 'colliders': col_out}, f, indent=2)
    print(f'  {"TOTAL":18} {total:>3} static bodies')

    if qa_path:
        pad, cols = 10, 5
        rows = (len(qa) + cols - 1) // cols
        cw = max(c.width for _, c in qa) + pad
        ch = max(c.height for _, c in qa) + pad + 14
        sheet = Image.new('RGBA', (cw * cols, ch * rows), (255, 0, 255, 255))
        d = ImageDraw.Draw(sheet)
        for i, (name, c) in enumerate(qa):
            ox, oy = (i % cols) * cw + pad // 2, (i // cols) * ch + pad // 2
            sheet.alpha_composite(c, (ox, oy))
            d.text((ox, oy + ch - 14), name, fill=(0, 0, 0, 255))
        sheet.save(qa_path)
        print(f'\n{qa_path}  QA sheet')


if __name__ == '__main__':
    args = sys.argv[1:]
    qa = None
    if '--qa' in args:
        i = args.index('--qa')
        qa = args[i + 1]
        del args[i:i + 2]
    main(args[0], args[1], args[2], qa)
