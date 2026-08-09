#!/usr/bin/env python3
"""
Plant a treeline along a terrain seam in a Phaser Editor scene.

THE PROBLEM IT SOLVES. CourtyardV2's lawn meets its forest floor along a hard
straight line, because the kit has no wang set between the two greens — it has
grass<->dirt, forest<->dirt, dirt<->paving, castle-floor and kerb, and nothing
joining lawn to forest. `wang_autotile.py` can blend every other boundary in the
map and leaves 129 cells of this one untouched, correctly, since roughening an
edge you cannot autotile only makes it ragged instead of straight.

Covering the seam is the other answer, it is what games actually do, and it costs
no generations: the kit already has the trees. Raheem chose it over generating a
transition set on 2026-08-08.

TWO LAYERS, NOT ONE. A row of canopy alone still shows the line at the trunks,
because a canopy floats above the ground it is meant to hide. So this plants a
CANOPY along the seam and an UNDERSTORY of shrub and rock clusters at its foot,
which is what actually breaks the line — the eye reads a wood's edge as a band of
mixed scale, not a fringe. The scene already carried an empty layer named
`L13_Forest_Under_Brush`, so the intent predates this script.

ORIGIN IS BOTTOM-CENTRE, DELIBERATELY. The existing canopy uses centre origin and
so every one of its trees carries a hand-computed negative y — the first tree
sits at y=-117 because 426/2 subtracted from a base line of 96 happens to land
there. Placing from the base instead means the seam row IS the y value, so a
misplaced tree is a visible arithmetic error rather than a plausible-looking one.
Matches `L8_NATURE`, which already does this.

THE SCENE FILE ROUND-TRIPS EXACTLY at json indent=4 with no trailing newline —
verified before writing. That is why this one may re-serialise where
`wang_autotile.py` had to patch text: there the layer data is a STRING of ints
and a naive dump changed its type as well as the whole file's indentation.

Usage:
  treeline.py <SceneName> [--spacing 96] [--seed 5] [--dry-run] [--strip]
                          [--render out.png]
"""
import hashlib
import json
import os
import re
import sys

TILE = 32
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

GRASS = (1, 16)
FOREST = (49, 64)

CANOPY_LAYER = 'L12_FOREST_CANOPY'
UNDER_LAYER = 'L13_Forest_Under_Brush'
MARK = 'seamline'          # every object this script owns is labelled with it

# key -> (native w, h). Scale is chosen per-plant against the canopy's own 3x
# broadleaf, so the line reads as one wood rather than a sampler of species.
CANOPY = [
    ('nature-tree-broadleaf-large', 128, 142, 2.6, 3.2, 6),
    ('nature-tree-broadleaf-small', 73, 117, 2.4, 3.0, 2),
]
UNDER = [
    ('nature-shrub-young-tree-cluster', 103, 90, 0.9, 1.5, 3),
    ('nature-rocks-scrub-cluster', 123, 75, 0.8, 1.3, 1),
]


def rnd(seed, *parts):
    h = hashlib.blake2b((':'.join(map(str, (seed,) + parts))).encode(), digest_size=6).digest()
    return int.from_bytes(h, 'big') / float(1 << 48)


def pick(table, r):
    total = sum(w for *_, w in table)
    acc = 0.0
    for entry in table:
        acc += entry[-1] / total
        if r <= acc:
            return entry
    return table[-1]


def seam_edges(data, W, H):
    """Grass cells touching forest, with which side the forest lies on.

    Returns world-space (x, y, side) where the point is the MIDDLE of the shared
    edge, so a tree planted there straddles the boundary instead of sitting in
    one field or the other.
    """
    def in_range(g, r):
        return r[0] <= g <= r[1]
    out = []
    for y in range(H):
        for x in range(W):
            if not in_range(data[y * W + x], GRASS):
                continue
            for dx, dy, side in ((0, -1, 'N'), (0, 1, 'S'), (-1, 0, 'W'), (1, 0, 'E')):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < W and 0 <= ny < H):
                    continue
                if in_range(data[ny * W + nx], FOREST):
                    wx = x * TILE + TILE / 2 + dx * TILE / 2
                    wy = y * TILE + TILE / 2 + dy * TILE / 2
                    out.append((wx, wy, side))
                    break
    return out


def chain(points, spacing):
    """Thin a seam to roughly one plant every `spacing` px along its run."""
    kept = []
    for p in sorted(points, key=lambda p: (round(p[1] / TILE), p[0])):
        if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > spacing ** 2 for q in kept):
            kept.append(p)
    return kept


def obj(label, key, x, y, scale, oy=1.0):
    o = {
        'type': 'Image',
        'id': hashlib.blake2b(f'{label}'.encode(), digest_size=16).hexdigest(),
        'label': label,
        'texture': {'key': key},
        'x': round(x),
        'y': round(y),
    }
    if abs(scale - 1) > 1e-6:
        o['scaleX'] = round(scale, 3)
        o['scaleY'] = round(scale, 3)
    o['originX'] = 0.5
    o['originY'] = oy
    return o


def js_block(o):
    var = re.sub(r'\W', '_', o['label'])
    lines = [f'\t\t// {o["label"]}',
             f'\t\tconst {var} = this.add.image({o["x"]}, {o["y"]}, "{o["texture"]["key"]}");']
    if 'scaleX' in o:
        lines.append(f'\t\t{var}.scaleX = {o["scaleX"]};')
        lines.append(f'\t\t{var}.scaleY = {o["scaleY"]};')
    lines.append(f'\t\t{var}.setOrigin({o["originX"]}, {o["originY"]});')
    return lines, var


def layer_var(label):
    v = re.sub(r'\W', '_', label)
    return v[0].lower() + v[1:]


def ensure_named_layer(src, label, order):
    """Give an EMPTY layer a const so objects can be added to it.

    The Editor emits `const lX = this.add.layer();` only for layers that have
    children; an empty one compiles to a bare `this.add.layer();` with nothing to
    reference. L13_Forest_Under_Brush is empty and is exactly the layer this
    script is meant to fill, so the bare call is found by ORDER — the compiled
    file declares layers in displayList order — and named in place.
    """
    var = layer_var(label)
    if f'const {var} = this.add.layer();' in src:
        return src
    sites = [m for m in re.finditer(r'^\t\t(?:const \w+ = )?this\.add\.layer\(\);$', src, re.M)]
    if order >= len(sites):
        raise SystemExit(f'{label}: only {len(sites)} layer declarations, wanted #{order}')
    m = sites[order]
    if m.group(0).strip() != 'this.add.layer();':
        raise SystemExit(f'{label}: layer #{order} is already named as {m.group(0).strip()!r} '
                         f'— displayList and compiled order disagree, refusing to guess')
    return src[:m.start()] + f'\t\tconst {var} = this.add.layer();' + src[m.end():]


def inject_js(src, layer_label, objs, strip_first):
    var = layer_var(layer_label)
    # Everything this script owns is removable by label, so a re-run replaces
    # rather than accumulates — otherwise every run doubles the wood.
    if strip_first:
        src = re.sub(
            r'\n\t\t// [A-Za-z0-9_]*' + MARK + r'[A-Za-z0-9_]*\n(?:\t\t[^\n]*\n)*?\t\t' +
            re.escape(var) + r'\.add\([A-Za-z0-9_]+\);\n', '\n', src)
    if not objs:
        return src
    anchor = f'\t\tconst {var} = this.add.layer();\n'
    i = src.index(anchor) + len(anchor)
    chunk = []
    for o in objs:
        lines, v = js_block(o)
        chunk += [''] + lines + [f'\t\t{var}.add({v});']
    return src[:i] + '\n'.join(chunk) + '\n' + src[i:]


def render(scene, po, data, out_path, layers_to_draw, div=3):
    """Composite the floor and every placed sprite into one overview image.

    Exists because the seam is 2,000px of map edge and the in-game camera shows
    40 tiles at a time — you cannot see whether a treeline COVERS a line by
    walking along it, only by looking at the whole run at once.
    """
    from PIL import Image
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'wa', os.path.join(os.path.dirname(__file__), 'wang_autotile.py'))
    wa = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(wa)

    W, H = po['width'], po['height']
    tsets, gid = [], 1
    for ts in po['tilesets']:
        im = Image.open(os.path.join(wa.TILESET_DIR, wa.IMAGE_FOR_KEY[ts['imageKey']])).convert('RGBA')
        n = (im.width // TILE) * (im.height // TILE)
        tsets.append((gid, gid + n - 1, im)); gid += n
    img = Image.new('RGBA', (W * TILE, H * TILE), (0, 0, 0, 255))
    for i, g in enumerate(data):
        if g <= 0:
            continue
        for lo, hi, im in tsets:
            if lo <= g <= hi:
                cols = im.width // TILE
                ty, tx = divmod(g - lo, cols)
                img.paste(im.crop((tx * TILE, ty * TILE, tx * TILE + TILE, ty * TILE + TILE)),
                          ((i % W) * TILE, (i // W) * TILE))
                break

    pack = json.load(open(os.path.join(
        REPO, 'card-engine', 'public', 'assets', 'kits', 'halo-stone-castle', 'kit-pack.json')))
    url = {}
    for sec, body in pack.items():
        if isinstance(body, dict) and body.get('files'):
            for f in body['files']:
                url[f['key']] = f['url']

    by_label = {o.get('label'): o for o in scene['displayList'] if o.get('type') == 'Layer'}
    drawn = 0
    for lb in layers_to_draw:
        for o in by_label.get(lb, {}).get('list', []):
            key = o.get('texture', {}).get('key')
            if key not in url:
                continue
            sp = Image.open(os.path.join(REPO, 'card-engine', 'public', url[key])).convert('RGBA')
            sx, sy = o.get('scaleX', 1), o.get('scaleY', 1)
            sp = sp.resize((max(1, round(sp.width * sx)), max(1, round(sp.height * sy))), Image.NEAREST)
            ox, oy = o.get('originX', 0.5), o.get('originY', 0.5)
            img.alpha_composite(sp, (round(o['x'] - sp.width * ox), round(o['y'] - sp.height * oy)))
            drawn += 1
    img.convert('RGB').resize((W * TILE // div, H * TILE // div), Image.LANCZOS).save(out_path)
    print(f'  rendered {drawn} sprite(s) over the floor -> {out_path}')


def main(argv):
    if not argv or argv[0].startswith('--'):
        print(__doc__)
        return 2
    name = argv[0]
    def flag(f, d):
        return type(d)(argv[argv.index(f) + 1]) if f in argv else d
    spacing = flag('--spacing', 96)
    seed = flag('--seed', '5')
    dry = '--dry-run' in argv
    strip_only = '--strip' in argv

    sc_path = os.path.join(REPO, f'{name}.scene')
    js_path = os.path.join(REPO, f'{name}.js')
    src = open(sc_path, encoding='utf-8').read()
    scene = json.loads(src)
    if json.dumps(scene, indent=4) != src:
        raise SystemExit(f'{sc_path}: does not round-trip at indent=4 — refusing to rewrite it')

    po = next(x for x in scene['plainObjects'] if 'tileWidth' in x)
    W, H = po['width'], po['height']
    data = json.loads(po['layers'][0]['data'])

    layers = {o.get('label'): o for o in scene['displayList'] if o.get('type') == 'Layer'}
    for lb in (CANOPY_LAYER, UNDER_LAYER):
        if lb not in layers:
            raise SystemExit(f'{name}: no layer named {lb}')
        before = len(layers[lb].get('list', []))
        layers[lb]['list'] = [c for c in layers[lb].get('list', []) if MARK not in c.get('label', '')]
        if before != len(layers[lb]['list']):
            print(f'  {lb}: removed {before - len(layers[lb]["list"])} previous {MARK} object(s)')

    canopy, under = [], []
    if not strip_only:
        pts = chain(seam_edges(data, W, H), spacing)
        print(f'{name}: {len(pts)} planting points along the grass/forest seam')
        for n, (x, y, side) in enumerate(pts):
            r1, r2, r3, r4 = (rnd(seed, n, k) for k in range(4))
            key, kw, kh, lo, hi, _ = pick(CANOPY, r1)
            s = lo + (hi - lo) * r2
            h = kh * s
            #
            # THE BASE GOES SOUTH OF THE SEAM BY 45% OF THE TREE'S HEIGHT.
            #
            # A bottom-origin sprite grows UPWARD from its y, so planting a tree
            # ON the line puts its whole canopy north of the line and hides
            # nothing. The first run did exactly that and, because this seam sits
            # only three tiles from the top of the map, the canopies went off the
            # top edge entirely and left a row of bare trunks.
            #
            # 45% of the scaled height puts the canopy MASS across the line,
            # which is the only part that hides anything. It also reads correctly
            # as a wood's edge: the trunks stand just inside the clearing and the
            # crowns overhang it.
            #
            dy = 0.45 * h if side in ('N', 'S') else 0.30 * h
            dx = {'N': 0, 'S': 0, 'W': -0.18 * kw * s, 'E': 0.18 * kw * s}[side]
            # Jitter is wide on purpose. A row of trunks at one y is the same
            # defect as the ruled terrain line it was planted to hide, just
            # rendered in bark — so the base wanders by most of a tile-and-a-half.
            bx = x + dx + (r3 - 0.5) * 46
            by = y + dy + (r4 - 0.5) * 74
            canopy.append(obj(f'{MARK}_canopy_{n}', key, bx, by, s))
            # Understory sits at the trunk line, not at the seam — it is there to
            # break the row of trunks, which is the other thing that reads as a
            # ruled line once the canopy is doing its job.
            if r3 < 0.55:
                ukey, _, _, ulo, uhi, _ = pick(UNDER, r4)
                under.append(obj(f'{MARK}_under_{n}', ukey,
                                 bx + (r2 - 0.5) * 70,
                                 by + 10 + (r1 - 0.5) * 16,
                                 ulo + (uhi - ulo) * r1))

    layers[CANOPY_LAYER].setdefault('list', []).extend(canopy)
    layers[UNDER_LAYER].setdefault('list', []).extend(under)
    print(f'  {CANOPY_LAYER}: +{len(canopy)} trees  ({len(layers[CANOPY_LAYER]["list"])} total)')
    print(f'  {UNDER_LAYER}: +{len(under)} brush  ({len(layers[UNDER_LAYER]["list"])} total)')

    order = [o.get('label') for o in scene['displayList'] if o.get('type') == 'Layer']
    js = open(js_path, encoding='utf-8').read()
    js = ensure_named_layer(js, UNDER_LAYER, order.index(UNDER_LAYER))
    js = inject_js(js, CANOPY_LAYER, canopy, True)
    js = inject_js(js, UNDER_LAYER, under, True)

    render_to = flag('--render', '')
    if render_to:
        os.makedirs(os.path.dirname(render_to) or '.', exist_ok=True)
        render(scene, po, data, render_to, [UNDER_LAYER, CANOPY_LAYER])

    if dry:
        print('  dry run, nothing written')
        return 0
    open(sc_path, 'w', encoding='utf-8', newline='\n').write(json.dumps(scene, indent=4))
    open(js_path, 'w', encoding='utf-8', newline='\n').write(js)
    print(f'  wrote {name}.js and {name}.scene')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
