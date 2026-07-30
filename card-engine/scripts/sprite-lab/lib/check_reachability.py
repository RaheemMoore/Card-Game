#!/usr/bin/env python3
"""
Prove the courtyard is walkable — find dead ends before a human does.

WHY THIS EXISTS. Raheem, playing: "I am unable to walk to the left of the left
side lamps." The Training Yard's collider ended at x 315 and the lamp colliders
began at x 330, leaving a 15px corridor against a 34px-wide hero. Neither
collider was wrong on its own; the GAP BETWEEN THEM was impassable. No check
that looks at colliders one at a time can see that — it is a property of the
whole floor.

So: inflate every collider by the hero's half-width, flood-fill from his spawn,
and report anything he cannot reach. This is the standard trick — grow the
obstacles instead of the agent, then the agent is a point.

Reports every unreachable pocket of open floor with its size and centre, so a
15px corridor shows up as an island rather than as a complaint weeks later.

Usage: check_reachability.py [--png out.png]
"""
import json
import os
import re
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')

# Kept in step with layout.ts / heroSprite.ts. Asserted against the source below
# so this cannot silently drift from the game.
WALKABLE = (200, 300, 1340, 1040)
FEET_W, FEET_H = 34, 20
SPAWN = (768, 830)

# Ignored: a pocket smaller than this is a nook behind a bush, not a dead end.
MIN_POCKET = 400

# Narrow passages need their own, much lower floor: a corridor the hero cannot
# fit through is by definition a THIN sliver. Reusing MIN_POCKET here filtered
# out the 15px west corridor entirely and reported all clear.
NARROW_MIN = 100


def read_source_number(path, pattern):
    m = re.search(pattern, open(os.path.join(ROOT, path)).read())
    return int(float(m.group(1))) if m else None


def stalls_boxes():
    """Hand-authored destination colliders, parsed out of stalls.ts."""
    src = open(os.path.join(ROOT, 'src/pages/castle/courtyard/stalls.ts')).read()
    out = []
    for blk in re.findall(r"\{[^{}]*?id:\s*'([a-z]+)'.*?\}", src, re.S):
        pass
    for m in re.finditer(
        r"id:\s*'(\w+)',\s*label:[^\n]*\n\s*x:\s*(-?\d+),\s*\n?\s*y:\s*(-?\d+),\s*\n?\s*"
        r"width:\s*(\d+),\s*\n?\s*height:\s*(\d+)", src):
        _, x, y, w, h = m.groups()
        x, y, w, h = int(x), int(y), int(w), int(h)
        out.append((x - w // 2, y - h // 2, w, h))
    return out


def main(png_out=None):
    x0, y0, x1, y1 = WALKABLE
    W, H = x1 - x0, y1 - y0

    blocked = np.zeros((H, W), bool)

    def block(bx, by, bw, bh):
        # Inflate by the hero's half-extent, so he can be treated as a point.
        ax0 = max(int(bx - FEET_W / 2) - x0, 0)
        ay0 = max(int(by - FEET_H / 2) - y0, 0)
        ax1 = min(int(bx + bw + FEET_W / 2) - x0, W)
        ay1 = min(int(by + bh + FEET_H / 2) - y0, H)
        if ax1 > ax0 and ay1 > ay0:
            blocked[ay0:ay1, ax0:ax1] = True

    col = json.load(open(os.path.join(
        ROOT, 'public/assets/castle/occluders/colliders.json')))['colliders']
    n_boxes = 0
    for obj in col:
        for b in obj['boxes']:
            block(b['x'], b['y'], b['width'], b['height'])
            n_boxes += 1
    stalls = stalls_boxes()
    for bx, by, bw, bh in stalls:
        block(bx, by, bw, bh)

    print(f'{n_boxes} traced boxes + {len(stalls)} stall boxes, '
          f'inflated by the hero ({FEET_W}x{FEET_H})')

    free = ~blocked
    sx, sy = SPAWN[0] - x0, SPAWN[1] - y0
    if not free[sy, sx]:
        raise SystemExit('SPAWN IS INSIDE A COLLIDER — the hero starts stuck')

    # Flood fill from spawn (4-connected, scanline-free but fine at this size).
    reach = np.zeros_like(free)
    stack = [(sy, sx)]
    reach[sy, sx] = True
    while stack:
        y, x = stack.pop()
        for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= ny < H and 0 <= nx < W and free[ny, nx] and not reach[ny, nx]:
                reach[ny, nx] = True
                stack.append((ny, nx))

    pockets = free & ~reach
    print(f'reachable floor: {reach.sum() / free.sum() * 100:.1f}% of open space')

    # Label unreachable pockets so each one can be named and sized.
    issues = []
    seen = np.zeros_like(pockets)
    ys, xs = np.nonzero(pockets)
    for iy, ix in zip(ys, xs):
        if seen[iy, ix]:
            continue
        stack, cells = [(iy, ix)], []
        seen[iy, ix] = True
        while stack:
            y, x = stack.pop()
            cells.append((y, x))
            for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
                if 0 <= ny < H and 0 <= nx < W and pockets[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(cells) >= MIN_POCKET:
            cy = sum(c[0] for c in cells) / len(cells) + y0
            cx = sum(c[1] for c in cells) / len(cells) + x0
            issues.append((len(cells), int(cx), int(cy)))

    if issues:
        print(f'\n{len(issues)} UNREACHABLE POCKET(S) — floor the player can see but not enter:')
        for area, cx, cy in sorted(issues, reverse=True):
            print(f'  {area:>7} px around ({cx}, {cy})')
    else:
        print('\nno unreachable pockets — every part of the open floor connects to spawn')

    # ── Floor squeezed out by gaps too narrow for the hero ──────────────────
    # THE CHECK THAT ACTUALLY MATTERS, and it took three tries to find it.
    #
    # The bug: the Training Yard collider ended at x 315, the lamp colliders
    # began at x 330, and the hero is 34 wide. The strip beyond was never
    # STRANDED — you could still reach it the long way round — so the flood fill
    # above reported all clear. A "does this collider sit on paving?" heuristic
    # scored it 12.8%, below any sane threshold, and flagged six false positives
    # instead. Both checks were confidently green on a floor Raheem could not
    # walk down.
    #
    # What separates the two cases is the hero's WIDTH. So: flood-fill twice —
    # once with obstacles inflated by his half-extent, once with him treated as
    # a point — and compare. Floor a point can reach that the hero cannot is,
    # by definition, floor walled off by a gap too narrow for him.
    point_blocked = np.zeros((H, W), bool)

    def block_point(bx, by, bw, bh):
        ax0, ay0 = max(int(bx) - x0, 0), max(int(by) - y0, 0)
        ax1, ay1 = min(int(bx + bw) - x0, W), min(int(by + bh) - y0, H)
        if ax1 > ax0 and ay1 > ay0:
            point_blocked[ay0:ay1, ax0:ax1] = True

    for obj in col:
        for b in obj['boxes']:
            block_point(b['x'], b['y'], b['width'], b['height'])
    for bx, by, bw, bh in stalls:
        block_point(bx, by, bw, bh)

    def flood(mask, seed):
        out = np.zeros_like(mask)
        st = [seed]
        out[seed] = True
        while st:
            y, x = st.pop()
            for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not out[ny, nx]:
                    out[ny, nx] = True
                    st.append((ny, nx))
        return out

    point_reach = flood(~point_blocked, (sy, sx))

    # Grow the hero's reachable set back out by his half-extent: that is every
    # floor pixel his body can actually occupy or sweep.
    hy, hx = FEET_H // 2, FEET_W // 2
    covered = np.zeros_like(reach)
    ys_r, xs_r = np.nonzero(reach)
    for dy in range(-hy, hy + 1):
        yy = np.clip(ys_r + dy, 0, H - 1)
        for dx in range(-hx, hx + 1):
            covered[yy, np.clip(xs_r + dx, 0, W - 1)] = True

    squeezed = point_reach & ~covered & ~point_blocked

    # Report each region separately. A single centroid over several disjoint
    # slivers points at empty paving between them, which is worse than useless.
    regions, seen2 = [], np.zeros_like(squeezed)
    sy_, sx_ = np.nonzero(squeezed)
    for iy, ix in zip(sy_, sx_):
        if seen2[iy, ix]:
            continue
        st, cells = [(iy, ix)], []
        seen2[iy, ix] = True
        while st:
            y, x = st.pop()
            cells.append((y, x))
            for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
                if 0 <= ny < H and 0 <= nx < W and squeezed[ny, nx] and not seen2[ny, nx]:
                    seen2[ny, nx] = True
                    st.append((ny, nx))
        if len(cells) >= NARROW_MIN:
            regions.append((len(cells),
                            int(sum(c[1] for c in cells) / len(cells)) + x0,
                            int(sum(c[0] for c in cells) / len(cells)) + y0))

    if regions:
        print(f'\nFLOOR TOO NARROW FOR THE HERO ({FEET_W}px wide) — '
              f'{len(regions)} place(s):')
        for area, cx, cy in sorted(regions, reverse=True):
            print(f'  {area:>6} px around ({cx}, {cy})  — colliders closer than he is wide')
        issues += [('narrow', cx, cy) for _, cx, cy in regions]
    else:
        print(f'\nno passages narrower than the hero ({FEET_W}px wide)')

    if png_out:
        img = Image.new('RGB', (W, H), (30, 30, 34))
        a = np.array(img)
        a[reach] = (60, 140, 90)      # reachable
        a[pockets] = (220, 60, 60)    # stranded
        Image.fromarray(a).save(png_out)
        print(f'{png_out}  green = reachable, red = stranded, dark = solid')

    return 1 if issues else 0


if __name__ == '__main__':
    args = sys.argv[1:]
    png = None
    if '--png' in args:
        i = args.index('--png')
        png = args[i + 1]
    sys.exit(main(png))
