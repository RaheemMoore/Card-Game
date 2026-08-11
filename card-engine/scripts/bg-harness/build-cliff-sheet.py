#!/usr/bin/env python3
"""Review sheet for the cliff tile kits.

Rule Zero: never show work in chat, show it in a harness.

A connectable kit is not a gallery of pictures — it is 56 tiles whose whole value
is how they JOIN. So this sheet does two things a grid cannot:

  * groups tiles by their semantic role from `tile_rules` (floor, the four
    sides, corners, outer corners, stairs, pillar), because "tile_37" tells you
    nothing and "sides-S" tells you everything;
  * assembles a real plateau from the kit — floor filled, edges and corners
    placed by rule — so the joins can actually be judged. A kit that looks fine
    tile-by-tile and fails at the corners is the failure mode worth catching.

    python scripts/bg-harness/build-cliff-sheet.py
"""
import base64
import io
import json
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
KITS = ["A", "B"]


def kit_dir(tag):
    return os.path.join(OUT, f"cliff-kit-{tag}")


def load(tag):
    d = kit_dir(tag)
    tiles = {}
    for f in sorted(os.listdir(d)):
        if not f.endswith(".png"):
            continue
        idx = int(f[:2])
        role = f[3:-4] or None
        tiles[idx] = (role, Image.open(os.path.join(d, f)).convert("RGBA"))
    rules = json.load(open(os.path.join(d, "_rules.json"), encoding="utf-8"))
    return tiles, rules


def uri(im, scale=1):
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    b = io.BytesIO()
    im.save(b, "PNG")
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def assemble(tiles, rules, cols=5, rows=3):
    """Build a plateau so the JOINS can be judged, not just the tiles.

    Tiles overlap: each is 52x111 but represents a 32px cell with the wall
    hanging below and the top surface sitting above, so they are placed on a
    32px grid and allowed to overlap. Drawing them edge-to-edge on their own
    width would show a kit that does not exist.
    """
    parts = rules["tile_rules"]["parts"]
    step = 32
    any_tile = next(iter(tiles.values()))[1]
    ox, oy = (any_tile.width - step) // 2, any_tile.height - step
    W = cols * step + any_tile.width
    H = rows * step + any_tile.height
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    def put(idx, cx, cy):
        t = tiles.get(idx)
        if t:
            c.alpha_composite(t[1], (cx * step + ox - ox, cy * step))

    # Painted back-to-front by row so a lower row's wall overlaps the row above,
    # which is how the depth reads in game.
    for ry in range(rows):
        for rx in range(cols):
            n, s = ry == 0, ry == rows - 1
            w, e = rx == 0, rx == cols - 1
            if n and w:
                idx = parts["corners"]["NW"]
            elif n and e:
                idx = parts["corners"]["NE"]
            elif s and w:
                idx = parts["corners"]["SW"]
            elif s and e:
                idx = parts["corners"]["SE"]
            elif n:
                idx = parts["sides"]["N"]
            elif s:
                idx = parts["sides"]["S"]
            elif w:
                idx = parts["sides"]["W"]
            elif e:
                idx = parts["sides"]["E"]
            else:
                idx = parts["floor"]
            put(idx, rx, ry)
    return c.crop(c.getbbox())


GROUPS = [
    ("floor", ["floor"]),
    ("edges", ["sides-N", "sides-E", "sides-S", "sides-W"]),
    ("inner corners", ["corners-NW", "corners-NE", "corners-SE", "corners-SW"]),
    ("outer corners", ["outer_corners-NW", "outer_corners-NE", "outer_corners-SE", "outer_corners-SW"]),
    ("stairs", ["stairs0", "stairs1"]),
    ("pillar", ["pillar"]),
]


def build():
    sections = []
    for tag in KITS:
        tiles, rules = load(tag)
        by_role = {r: im for _, (r, im) in tiles.items() if r}
        union = set()
        for _, im in tiles.values():
            a = np.asarray(im)
            op = a[:, :, 3] > 0
            if op.any():
                union |= {tuple(int(v) for v in x) for x in np.unique(a[:, :, :3][op], axis=0)}

        groups = []
        for title, roles in GROUPS:
            cells = "".join(
                f'<figure><img src="{uri(by_role[r], 3)}" alt="{r}"/><figcaption>{r}</figcaption></figure>'
                for r in roles if r in by_role)
            if cells:
                groups.append(f'<div class="grp"><h4>{title}</h4><div class="row">{cells}</div></div>')

        extras = [r for r in sorted(by_role) if not any(r in rs for _, rs in GROUPS)]
        if extras:
            cells = "".join(
                f'<figure><img src="{uri(by_role[r], 2)}" alt="{r}"/><figcaption>{r}</figcaption></figure>'
                for r in extras)
            groups.append(f'<div class="grp"><h4>everything else &mdash; {len(extras)} tiles</h4>'
                          f'<div class="row small">{cells}</div></div>')

        plate = assemble(tiles, rules)
        sections.append(f"""<section>
  <div class="head"><h2>Kit {tag}</h2>
    <span class="meta">56 tiles &middot; {next(iter(tiles.values()))[1].width}&times;{next(iter(tiles.values()))[1].height}px each
      &middot; {len(union)} colours &middot; 20 generations</span></div>
  <div class="assembled"><img src="{uri(plate, 2)}" alt="assembled plateau"/>
    <p class="cap">Assembled from the kit's own rules &mdash; floor, four edges, four corners. This is the
      test that matters: a kit can look fine tile-by-tile and fall apart where they meet.</p></div>
  {''.join(groups)}
</section>""")
    return TEMPLATE.replace("{{SECTIONS}}", "\n".join(sections))


TEMPLATE = """<title>Cliff kits &mdash; PixelLab building tilesets</title>
<style>
  :root{--bg:#17141c;--panel:#1d1924;--box:#231e2c;--edge:#372f44;--ink:#ece7dd;--muted:#9c92aa;
        --gold:#d9b45b;--verdigris:#57b9aa;
        --display:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
        --body:ui-sans-serif,system-ui,"Segoe UI",Helvetica,Arial,sans-serif;
        --data:ui-monospace,"Cascadia Mono",Consolas,monospace}
  @media (prefers-color-scheme: light){:root{--bg:#f2eee9;--panel:#e9e3dc;--box:#fffdfa;--edge:#d3c9be;
        --ink:#231e2c;--muted:#6b6274;--gold:#8a6a1c;--verdigris:#1f7a6d}}
  :root[data-theme="dark"]{--bg:#17141c;--panel:#1d1924;--box:#231e2c;--edge:#372f44;--ink:#ece7dd;--muted:#9c92aa;--gold:#d9b45b}
  :root[data-theme="light"]{--bg:#f2eee9;--panel:#e9e3dc;--box:#fffdfa;--edge:#d3c9be;--ink:#231e2c;--muted:#6b6274;--gold:#8a6a1c}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);line-height:1.6}
  .wrap{max-width:1180px;margin:0 auto;padding:48px 22px 90px;display:flex;flex-direction:column;gap:40px}
  h1{font-family:var(--display);font-size:clamp(30px,4.6vw,44px);margin:0;line-height:1.1}
  h2{font-family:var(--display);font-size:28px;margin:0}
  h4{font-family:var(--data);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin:0 0 10px}
  p{margin:0}
  .eyebrow{font-family:var(--data);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
  .sub{color:var(--muted);max-width:72ch}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:3px;padding:22px 24px;
          display:flex;flex-direction:column;gap:20px}
  .head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
  .meta{font-family:var(--data);font-size:12px;color:var(--muted)}
  .assembled{background:var(--box);border:1px solid var(--edge);border-radius:3px;padding:18px;
             display:flex;flex-direction:column;gap:10px;align-items:flex-start}
  .assembled img{image-rendering:pixelated;max-width:100%}
  .cap{color:var(--muted);font-size:14px;max-width:70ch}
  .row{display:flex;gap:14px;flex-wrap:wrap}
  figure{margin:0;display:flex;flex-direction:column;gap:6px;align-items:center}
  figure img{image-rendering:pixelated;background:var(--box);border:1px solid var(--edge);border-radius:2px}
  figcaption{font-family:var(--data);font-size:10.5px;color:var(--muted)}
  .row.small figure img{max-height:120px}
  .call{background:var(--panel);border:1px solid var(--edge);border-left:3px solid var(--gold);
        border-radius:3px;padding:20px 22px;display:flex;flex-direction:column;gap:10px}
  .call .lead{font-family:var(--display);font-size:20px;line-height:1.45}
  code{font-family:var(--data);font-size:13px;color:var(--gold)}
</style>
<div class="wrap">
  <div>
    <div class="eyebrow">PixelLab &middot; create-tiles-pro &middot; tile_feature: building</div>
    <h1>Cliff kits</h1>
    <p class="sub">Two runs of the same brief. 56 connectable tiles each, 3-tile wall height, high top-down
      &mdash; every corner, edge, stair and pillar generated as a set rather than designed piece by piece.</p>
  </div>

  <div class="call">
    <p class="lead">Not yet on a palette &mdash; that comes when you pick one.</p>
    <p>These are raw from PixelLab. Once you choose a kit it gets indexed onto the shared
      <code>castle-kit.gpl</code> exactly like the castle and the buildings, so a swatch change repaints
      every tile at once. Doing that now for both would be 112 files of work to throw half away.</p>
  </div>

  {{SECTIONS}}
</div>
"""


if __name__ == "__main__":
    dest = os.path.join(OUT, "cliff-kits.html")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(build())
    print(f"wrote {dest}  ({os.path.getsize(dest)/1024:.0f} KB)")
