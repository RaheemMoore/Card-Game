#!/usr/bin/env python3
"""
Autotile a Phaser Editor tilemap's natural terrain with 16-cell corner wang sets.

WHAT IT ACTUALLY FOUND, WHICH IS LESS THAN THE FIRST DIAGNOSIS CLAIMED. Read from
a distance, CourtyardV2's floor looks un-autotiled: 60.4% of its 4,800 cells are
pure grass and 19.7% pure forest floor, so 80% of it is two tiles. The first
conclusion drawn from that — that the map was painted with plain cells and every
boundary is a stair-step — was wrong. Most patch edges are already correctly
scalloped. That statistic is simply what a large open lawn looks like.

The real yield is 105 cells: stretches where grass butts a dirt edge with no
transition cell, and one stray forest-floor tile marooned in the middle of the
lawn. Worth fixing and worth having a tool for, but the courtyard's ground reads
empty because it is an empty lawn, not because it is mis-tiled. Scatter is that
problem's fix, not this. Measured 2026-08-08 against the top-down reference.

THE BIT ORDER IS MEASURED, NOT ASSUMED. `verify_bit_order()` samples the four
corners of all 16 cells and asserts index = TL*8 + TR*4 + BL*2 + BR*1 with the
set bit meaning "cell 15's material". That held identically across grass-dirt,
forestfloor-dirt and dirt-paving. It is checked on every run rather than trusted,
because a silently different set would emit a map that is wrong everywhere at
once and looks merely "noisy" rather than broken.

WHY ARCHITECTURE IS LEFT ALONE. Paving, castle floor and the tan kerb are
authored shapes — a paved cross, a courtyard, a deliberate kerb edging that uses
exactly one of its sixteen cells as a border strip. Those are Raheem's layout
decisions and round-tripping them through a corner grid would shave a cell off
every path and erase anything one cell wide. Only grass, dirt and forest floor —
where every square-cornered blob in the map actually lives — are recomputed.

WHY CORNERS AND NOT CELLS. A corner wang tile is chosen by the four terrain
corners around it, not by its own cell, so the authoritative grid is (W+1)x(H+1)
corners derived from the cell terrains. This is what makes a diagonal read as a
diagonal instead of a staircase.

THE ONE GAP IT CANNOT CLOSE. There is no tileset encoding grass <-> forest
floor. The kit has grass-dirt, forestfloor-dirt, dirt-paving, castle-floor and
tan-kerb, and the two greens meet directly across the middle of the map with no
transition art to put between them, so those boundaries are left exactly as
authored. Closing it properly needs either one generated transition set or a
treeline of sprites laid over the seam.

Usage:
  wang_autotile.py <SceneName> [--roughen N] [--seed 7] [--dry-run] [--render DIR]
"""
import hashlib
import json
import os
import re
import sys

from PIL import Image

TILE = 32
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
KIT = os.path.join(REPO, 'card-engine', 'public', 'assets', 'kits', 'halo-stone-castle')
TILESET_DIR = os.path.join(KIT, 'ground', 'tilesets')

IMAGE_FOR_KEY = {
    'ground-tileset-grass-dirt-32': 'castle-ground-grass-dirt-wang-32.png',
    'ground-tileset-dirt-paving-32': 'castle-ground-dirt-paving-wang-32.png',
    'ground-tileset-dirt-floor-32': 'castle-ground-dirt-floor-wang-32.png',
    'ground-tileset-forestfloor-dirt-32': 'castle-ground-forestfloor-dirt-wang-32.png',
    'ground-tileset-tan-kerb-32': 'castle-ground-tan-kerb-wang-32.png',
}

# Sets whose materials are natural ground and may be reshaped. Everything else
# is architecture and is copied through untouched.
NATURAL_SETS = {'grass-dirt', 'ground-tileset-forestfloor-dirt-32'}


# ---------------------------------------------------------------- tileset probe

def corner_rgb(im, cell, cx, cy, k=8, inset=2):
    cols = im.width // TILE
    ty, tx = divmod(cell, cols)
    ox, oy = tx * TILE, ty * TILE
    xs = range(inset, inset + k) if cx == 0 else range(TILE - inset - k, TILE - inset)
    ys = range(inset, inset + k) if cy == 0 else range(TILE - inset - k, TILE - inset)
    px = im.load()
    n = r = g = b = 0
    for y in ys:
        for x in xs:
            p = px[ox + x, oy + y]
            r += p[0]; g += p[1]; b += p[2]; n += 1
    return (r / n, g / n, b / n)


def verify_bit_order(im, name):
    """Assert index = TL*8 + TR*4 + BL*2 + BR*1, set bit = cell 15's material.

    THE SAMPLE WINDOW SHRINKS UNTIL THE SET VERIFIES, and that is a fix rather
    than a loosening. 8x8 was calibrated on the five ground sets, where the two
    terrains meet in a thin scalloped seam and each corner is filled by its own
    material. castle-cliff-rock is not built that way: its plateau is a raised
    body that overhangs, so on the six cells with a half-plateau the lower
    corners are a sliver and an 8x8 block lands on rock. Those cells all read as
    15 and a perfectly standard set was rejected.

    Shrinking is safe because it is tried in order and the first pass wins: every
    existing set still verifies at 8, so none of their reads change. Only a set
    that FAILS at 8 ever sees a smaller window, and a set that fails at all three
    is genuinely not a corner wang set. Reporting the window that worked keeps
    this visible instead of silent — a 2px read is a real signal about the art.

    THE INSET GOES TO ZERO AT THE SMALLEST WINDOW. The 2px inset exists to skip a
    tile's outermost row, where neighbouring sets can bleed. At an 8px sample
    that costs nothing. At a 2px sample it throws away the only pure-terrain
    pixels the corner has and reads the overhang instead — which is exactly how
    cliff-rock's cell 5 came back as 13 on the first attempt at this fix.
    """
    for k, inset in ((8, 2), (4, 2), (2, 0)):
        a, b = corner_rgb(im, 0, 0, 0, k, inset), corner_rgb(im, 15, 0, 0, k, inset)

        def bit(c, a=a, b=b):
            return 1 if sum((x - y) ** 2 for x, y in zip(c, b)) < sum((x - y) ** 2 for x, y in zip(c, a)) else 0

        bad = None
        for cell in range(16):
            v = (bit(corner_rgb(im, cell, 0, 0, k, inset)) * 8 + bit(corner_rgb(im, cell, 1, 0, k, inset)) * 4
                 + bit(corner_rgb(im, cell, 0, 1, k, inset)) * 2 + bit(corner_rgb(im, cell, 1, 1, k, inset)))
            if v != cell:
                bad = (cell, v)
                break
        if bad is None:
            if k != 8:
                print(f'  {name}: verified at a {k}px corner sample (inset {inset}) — its terrains '
                      f'overhang further than the ground sets do')
            return a, b
    cell, v = bad
    raise SystemExit(
        f'{name}: not a standard corner wang set — cell {cell} reads as {v} even at a 2px '
        f'corner sample. Refusing to autotile; the emitted map would be wrong everywhere.')


def material_id(rgb, table, tol=14):
    """Merge materials across tilesets by colour, so dirt is dirt everywhere."""
    for mid, ref in table.items():
        if sum((x - y) ** 2 for x, y in zip(rgb, ref)) ** 0.5 < tol:
            return mid
    mid = len(table)
    table[mid] = rgb
    return mid


# ------------------------------------------------------------------- scene i/o

def load_scene(name):
    js = os.path.join(REPO, f'{name}.js')
    sc = os.path.join(REPO, f'{name}.scene')
    scene = json.load(open(sc, encoding='utf-8'))
    po = next(x for x in scene['plainObjects'] if 'tileWidth' in x)
    layer = next(l for l in po['layers'] if l['name'] == 'ground')
    data = layer['data']
    if isinstance(data, str):
        data = json.loads(data)
    return js, sc, scene, po, layer, list(data)


def write_back(js_path, sc_path, data, dry_run):
    """Patch the tile array in place, as text, in both files.

    NOT via json.dump. The Editor's .scene is 4-space indented and stores the
    layer as a STRING of comma-separated ints — `"data": "[64,64,...]"` — so
    re-serialising the parsed object rewrote 11,203 lines and changed the field's
    type. That would collide with every future Editor save and make the change
    unreviewable. Both files therefore get a single anchored substitution and
    stay byte-identical everywhere else.

    The two files must move together: .js is what the game fetches and runs,
    .scene is what the Editor opens. Writing one without the other leaves the
    thing Raheem reviews and the thing a player walks disagreeing.
    """
    if dry_run:
        return

    sc_src = open(sc_path, encoding='utf-8').read()
    sc_new = '"data": "[' + ','.join(str(v) for v in data) + ']"'
    sc_out, n = re.subn(r'"data": "\[[0-9,]+\]"', lambda _: sc_new, sc_src, count=1)
    if n != 1:
        raise SystemExit(f'{sc_path}: expected exactly one tile data string, matched {n}')

    js_src = open(js_path, encoding='utf-8').read()
    js_new = 'data: [' + ', '.join(str(v) for v in data) + '],'
    js_out, n = re.subn(r'data: \[[0-9,\s]+\],', lambda _: js_new, js_src, count=1)
    if n != 1:
        raise SystemExit(f'{js_path}: expected exactly one tile data array, matched {n}')

    open(sc_path, 'w', encoding='utf-8', newline='\n').write(sc_out)
    open(js_path, 'w', encoding='utf-8', newline='\n').write(js_out)


# ------------------------------------------------------------------- autotiling

def _lattice(x, y, seed):
    h = hashlib.blake2b(f'{seed}:{x}:{y}'.encode(), digest_size=4).digest()
    return int.from_bytes(h, 'big') / 0xFFFFFFFF


def coherent(x, y, seed, scale=6.0):
    """Smooth 0..1 value noise, bilinear with a smoothstep fade.

    Per-cell hash noise was the first attempt and it was wrong: uncorrelated
    randomness makes a boundary FIZZ — every cell decides alone, so the edge
    gains pixel confetti and loses nothing of its straightness. A coherent field
    makes neighbouring cells agree, so a whole stretch of boundary bulges or
    retreats together, which is what reads as a curve.
    """
    fx, fy = x / scale, y / scale
    x0, y0 = int(fx // 1), int(fy // 1)
    tx, ty = fx - x0, fy - y0
    sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    v00, v10 = _lattice(x0, y0, seed), _lattice(x0 + 1, y0, seed)
    v01, v11 = _lattice(x0, y0 + 1, seed), _lattice(x0 + 1, y0 + 1, seed)
    return (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy


def roughen_corners(corners, W, H, natural, pair_set, passes, seed):
    """Wave a natural boundary without moving where it sits.

    ONLY BOUNDARIES THAT HAVE TRANSITION ART. Roughening a pair with no wang set
    between them — grass against forest floor here — buys nothing and costs a
    lot: the edge cannot be autotiled either way, so all the flip achieves is to
    replace a clean straight seam with a ragged one.

    OFF BY DEFAULT. This rewrites authored shapes. At two passes it ate holes in
    the dirt patches and grew tentacles off their corners, which is worse than
    the square corners it set out to fix. Kept because a NEW region painted as a
    rectangle genuinely wants it; not applied to Raheem's existing layout.
    """
    for p in range(passes):
        snap = [row[:] for row in corners]
        for y in range(H + 1):
            for x in range(W + 1):
                t = snap[y][x]
                if t not in natural:
                    continue
                others = []
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx <= W and 0 <= ny <= H):
                        continue
                    o = snap[ny][nx]
                    if o in natural and o != t and frozenset((o, t)) in pair_set:
                        others.append(o)
                if others and coherent(x, y, f'{seed}:{p}') < 0.30 + 0.10 * len(others):
                    corners[y][x] = max(set(others), key=others.count)
    return corners


def main(argv):
    if not argv or argv[0].startswith('--'):
        print(__doc__)
        return 2
    name = argv[0]
    def flag(f, d):
        return type(d)(argv[argv.index(f) + 1]) if f in argv else d
    passes = flag('--roughen', 0)
    seed = flag('--seed', '7')
    dry = '--dry-run' in argv
    render_dir = flag('--render', '')

    js, sc, scene, po, layer, data = load_scene(name)
    W, H = po['width'], po['height']
    print(f'{name}: {W}x{H} = {len(data)} cells')

    # ---- probe every tileset, build gid ranges and a shared material table ----
    mats, sets, gid = {}, [], 1
    for ts in po['tilesets']:
        im = Image.open(os.path.join(TILESET_DIR, IMAGE_FOR_KEY[ts['imageKey']])).convert('RGB')
        a_rgb, b_rgb = verify_bit_order(im, ts['name'])
        a, b = material_id(a_rgb, mats), material_id(b_rgb, mats)
        n = (im.width // TILE) * (im.height // TILE)
        sets.append({'name': ts['name'], 'lo': gid, 'hi': gid + n - 1, 'A': a, 'B': b,
                     'natural': ts['name'] in NATURAL_SETS})
        print(f'  {ts["name"]:36s} gid {gid:>3}-{gid + n - 1:<3} materials A={a} B={b}'
              f'{"  [natural]" if ts["name"] in NATURAL_SETS else ""}')
        gid += n
    print(f'  bit order verified on all {len(sets)} sets')

    natural = {s['A'] for s in sets if s['natural']} | {s['B'] for s in sets if s['natural']}
    pair_set = {}
    for s in sets:
        if s['natural']:
            pair_set[frozenset((s['A'], s['B']))] = s

    # ---- derive a cell terrain grid; architecture keeps its gid verbatim ------
    #
    # CORNERS COME STRAIGHT OFF THE TILES, NOT VIA A CELL TERRAIN.
    #
    # The first version of this collapsed each tile to one terrain by majority of
    # its corner bits, then rebuilt corners by majority of the neighbouring
    # cells. That round trip is LOSSY and it made the map worse: a half-and-half
    # transition tile flattened to a single terrain, and the rebuilt corner grid
    # then smoothed the scallop away — so already-correct scalloped patch edges
    # came back out square. Caught by zooming a dirt patch and finding the
    # "before" better than the "after".
    #
    # A corner wang tile states its four corners exactly. So each tile votes for
    # the four corners it touches, and a corner takes the majority of its votes.
    # On a consistent map that is lossless, and where the map disagrees with
    # itself the majority is the repair.
    #
    ARCH = -1
    votes = [[[] for _ in range(W + 1)] for _ in range(H + 1)]
    cell_terr, keep = [], [None] * len(data)
    for i, g in enumerate(data):
        x, y = i % W, i // W
        s = next((s for s in sets if s['lo'] <= g <= s['hi']), None)
        if s is None or not s['natural']:
            cell_terr.append(ARCH)
            keep[i] = g
            continue
        cell = g - s['lo']
        mat = lambda bit: s['B'] if bit else s['A']
        votes[y][x].append(mat((cell >> 3) & 1))          # TL
        votes[y][x + 1].append(mat((cell >> 2) & 1))      # TR
        votes[y + 1][x].append(mat((cell >> 1) & 1))      # BL
        votes[y + 1][x + 1].append(mat(cell & 1))         # BR
        cell_terr.append(s['B'] if bin(cell).count('1') >= 2 else s['A'])
    terr = cell_terr

    before_nat = sum(1 for t in terr if t != ARCH)
    print(f'  {before_nat} natural cells, {len(data) - before_nat} architectural (preserved)')

    # ---- corners, then emit --------------------------------------------------
    def cell_terrain(x, y):
        if 0 <= x < W and 0 <= y < H:
            t = terr[y * W + x]
            if t != ARCH:
                return t
        return None

    def corner(x, y):
        """Majority of the votes the surrounding tiles cast for this corner.

        Falls back to the neighbouring cells' terrain only where no tile voted —
        i.e. a corner surrounded entirely by architecture.
        """
        v = votes[y][x]
        if v:
            return max(set(v), key=v.count)
        vals = [t for t in (cell_terrain(x - 1, y - 1), cell_terrain(x, y - 1),
                            cell_terrain(x - 1, y), cell_terrain(x, y)) if t is not None]
        return max(set(vals), key=vals.count) if vals else None

    corners = [[corner(x, y) for x in range(W + 1)] for y in range(H + 1)]

    # Roughening happens HERE, on corners, not on cell terrains — corners are
    # what the tile choice actually reads, and displacing them moves a boundary
    # by half a tile instead of a whole one. Off by default: it rewrites shapes
    # Raheem authored, and at --roughen 2 it ate holes in the dirt patches.
    if passes:
        corners = roughen_corners(corners, W, H, natural, pair_set, passes, seed)

    out, unmapped = list(data), 0
    for y in range(H):
        for x in range(W):
            i = y * W + x
            if terr[i] == ARCH:
                out[i] = keep[i]
                continue
            c = [corners[y][x], corners[y][x + 1], corners[y + 1][x], corners[y + 1][x + 1]]
            c = [v if v is not None else terr[i] for v in c]
            present = set(c)
            if len(present) > 2:
                # Collapse the minority so a three-terrain corner still emits.
                keepers = sorted(present, key=lambda t: -c.count(t))[:2]
                c = [v if v in keepers else keepers[0] for v in c]
                present = set(c)
            if len(present) == 1:
                t = next(iter(present))
                s = next((s for s in sets if s['natural'] and t in (s['A'], s['B'])), None)
                out[i] = s['lo'] + (15 if t == s['B'] else 0) if s else keep[i] or data[i]
                continue
            s = pair_set.get(frozenset(present))
            if s is None:
                # No transition art for this pair (grass <-> forest floor).
                # Keep the cell's own plain tile; the roughened edge is the fix.
                t = terr[i]
                s2 = next((s for s in sets if s['natural'] and t in (s['A'], s['B'])), None)
                out[i] = s2['lo'] + (15 if t == s2['B'] else 0)
                unmapped += 1
                continue
            idx = sum(bit * w for bit, w in
                      zip([1 if v == s['B'] else 0 for v in c], (8, 4, 2, 1)))
            out[i] = s['lo'] + idx

    changed = sum(1 for a, b in zip(data, out) if a != b)
    distinct_before = len(set(data))
    distinct_after = len(set(out))
    print(f'  {changed} cells changed; distinct tiles {distinct_before} -> {distinct_after}')
    if unmapped:
        print(f'  {unmapped} cells sit on a grass<->forest boundary with no transition set '
              f'— left straight, there is no art to blend them')

    if render_dir:
        os.makedirs(render_dir, exist_ok=True)
        for tag, grid in (('before', data), ('after', out)):
            img = Image.new('RGB', (W * TILE, H * TILE))
            cache = {}
            for i, g in enumerate(grid):
                if g <= 0:
                    continue
                if g not in cache:
                    s = next(s for s in sets if s['lo'] <= g <= s['hi'])
                    im = Image.open(os.path.join(TILESET_DIR, IMAGE_FOR_KEY[
                        po['tilesets'][sets.index(s)]['imageKey']])).convert('RGB')
                    cols = im.width // TILE
                    ty, tx = divmod(g - s['lo'], cols)
                    cache[g] = im.crop((tx * TILE, ty * TILE, tx * TILE + TILE, ty * TILE + TILE))
                img.paste(cache[g], ((i % W) * TILE, (i // W) * TILE))
            p = os.path.join(render_dir, f'floor-{tag}.png')
            img.resize((W * TILE // 3, H * TILE // 3), Image.LANCZOS).save(p)
            print(f'  wrote {p}')

    write_back(js, sc, out, dry)
    print('  dry run, nothing written' if dry else f'  wrote {name}.js and {name}.scene')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
