#!/usr/bin/env python3
"""Render a Phaser Editor scene to a PNG, offline, so it can actually be looked at.

The dev route `/dev/scene?start=<Name>` is the real answer, but this session's
browser pane stopped compositing frames — screenshots time out and Phaser's
loader, which runs on requestAnimationFrame, never progresses past "Loading
scene". This reads the compiled `.js` and the `.scene` directly and draws the
same thing with PIL.

Deliberately partial. It draws the ground tilemap, plain Images and TileSprites,
honours `visible:false`, scale, flips and origins, and skips Rectangles and Text
(colliders, elevation plates, markers, labels — none of which are art). It is a
LOOKING tool, not a second renderer: depth here is display-list order, whereas
the game sorts by ground contact at runtime, so overlaps can differ.

    python scripts/bg-harness/render_scene.py CourtyardV3 [--out x.png]
                                              [--skip L10_VOID_library ...]
"""
import argparse
import json
import os
import re

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
PUBLIC = os.path.join(ROOT, "card-engine", "public")


def texture_urls():
    """Every texture key -> file path, from both packs."""
    urls = {}
    for p in (os.path.join(PUBLIC, "asset-pack.json"),
              os.path.join(PUBLIC, "assets", "kits", "halo-stone-castle", "kit-pack.json")):
        d = json.load(open(p, encoding="utf-8"))
        for name, sec in d.items():
            if name == "meta":
                continue
            for f in sec.get("files", []):
                urls[f["key"]] = os.path.join(PUBLIC, f["url"])
    return urls


def tilesets_from_js(js):
    """firstgid -> image key. The .scene has no firstgids; only the compiled .js does."""
    block = re.search(r"tilesets:\s*\[(.*?)\],\s*layers:", js, re.S)
    out = []
    for m in re.finditer(r"firstgid:\s*(\d+),\s*image:\s*\"([^\"]+)\"", block.group(1)):
        out.append((int(m.group(1)), m.group(2)))
    return sorted(out)


def draw_tilemap(canvas, scene, js, urls):
    tm = scene["plainObjects"][0]
    tw, th = tm["tileWidth"], tm["tileHeight"]
    sets = tilesets_from_js(js)
    sheets = {gid: Image.open(urls[key]).convert("RGBA") for gid, key in sets}
    for layer in tm["layers"]:
        data = json.loads(layer["data"]) if isinstance(layer["data"], str) else layer["data"]
        w = layer["width"]
        for i, gid in enumerate(data):
            if gid <= 0:
                continue
            base, sheet = None, None
            for g, _ in sets:
                if gid >= g:
                    base = g
            sheet = sheets[base]
            local = gid - base
            cols = sheet.width // tw
            sx, sy = (local % cols) * tw, (local // cols) * th
            tile = sheet.crop((sx, sy, sx + tw, sy + th))
            canvas.paste(tile, ((i % w) * tw, (i // w) * th), tile)


def place_object(o, urls):
    """The image and its top-left corner, or None if there is nothing to draw.

    Split out of draw_object so --ysort can ask where an object's BOTTOM is
    without drawing it — that bottom edge is the whole basis of the game's
    sorting, and computing it from origin and height by hand is exactly the
    hand-rolled formula sceneDepth.py warns about.
    """
    if o.get("visible") is False:
        return None
    key = (o.get("texture") or {}).get("key")
    if not key or key not in urls:
        return None
    img = Image.open(urls[key]).convert("RGBA")

    if o["type"] == "TileSprite":
        w, h = int(o.get("width", img.width)), int(o.get("height", img.height))
        # tilePosition scrolls the texture INSIDE the frame, wrapping. Ignoring it
        # drew every wall segment as the same top-of-texture strip, which made a
        # correctly segmented wall look broken — a harness bug that would have been
        # read as an art bug. Segmented walls are exactly what this is used for.
        tpx = int(o.get("tilePositionX", 0)) % img.width
        tpy = int(o.get("tilePositionY", 0)) % img.height
        tiled = Image.new("RGBA", (w, h))
        for y in range(-tpy, h, img.height):
            for x in range(-tpx, w, img.width):
                tiled.paste(img, (x, y), img)
        img = tiled

    sx, sy = o.get("scaleX", 1), o.get("scaleY", 1)
    if abs(sx) != 1 or abs(sy) != 1:
        img = img.resize((max(1, round(img.width * abs(sx))), max(1, round(img.height * abs(sy)))),
                         Image.NEAREST)
    if sx < 0:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if sy < 0:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)

    ox, oy = o.get("originX", 0.5), o.get("originY", 0.5)
    x = round(o.get("x", 0) - img.width * ox)
    y = round(o.get("y", 0) - img.height * oy)
    return img, x, y


def draw_object(canvas, o, urls):
    placed = place_object(o, urls)
    if placed is None:
        return
    img, x, y = placed
    canvas.alpha_composite(img, (x, y))


# ------------------------------------------------------------------ y-sorting
#
# A second draw order, matching what the GAME does rather than what the Editor
# shows. See card-engine/src/pages/dev/sceneDepth.ts — this mirrors it, and the
# two must be changed together.

LEVEL_STRIDE = 100_000

# Layer LABELS as they appear in the .scene, matching EXCLUDED_LAYER_VARS.
EXCLUDED_LAYERS = {
    "L1_GROUND", "L11_MARKERS", "L14_COLLIDERS",
    "L20_GROUND_L0", "L21_GROUND_L1", "L22_GROUND_L2", "L23_RAMPS",
}
LEVEL_LAYERS = ["L20_GROUND_L0", "L21_GROUND_L1", "L22_GROUND_L2"]


def rect_bounds(o):
    """A plate rectangle as (left, top, right, bottom)."""
    w, h = o.get("width", 0), o.get("height", 0)
    left = o.get("x", 0) - w * o.get("originX", 0.5)
    top = o.get("y", 0) - h * o.get("originY", 0.5)
    return left, top, left + w, top + h


def read_plates(display_list):
    """(level, bounds) for every elevation plate, highest level first."""
    plates = []
    by_label = {e.get("label"): e for e in display_list if e.get("type") == "Layer"}
    for level, label in enumerate(LEVEL_LAYERS):
        layer = by_label.get(label)
        if not layer:
            continue
        for c in layer.get("list", []):
            if c.get("type") == "Rectangle":
                plates.append((level, rect_bounds(c)))
    return sorted(plates, key=lambda p: -p[0])


def level_at(x, y, plates):
    for level, (l, t, r, b) in plates:
        if l <= x <= r and t <= y <= b:
            return level
    return None


# Mirrors CONTACT_BIAS_BY_TEXTURE in sceneDepth.ts. Change both together.
CONTACT_BIAS_BY_TEXTURE = {
    "tower-corner-v3": 60,
}


def depth_of(bottom, centre_x, key, plates, authored=None):
    # A non-zero Depth authored in the Editor replaces the contact line. See the
    # escape-hatch note in sceneDepth.ts — same rule, and they must agree.
    if authored:
        bottom = authored
    else:
        bottom += CONTACT_BIAS_BY_TEXTURE.get(key, 0)
    level = level_at(centre_x, bottom, plates)
    if level is None:
        level = 0
    return level * LEVEL_STRIDE + bottom + (-1 if key.startswith("terrain-wall-") else 0), level


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene")
    ap.add_argument("--out")
    ap.add_argument("--skip", nargs="*", default=["L10_VOID_library", "L9_SHELF_offmap", "L5_QUADRANT_NW"])
    ap.add_argument("--ysort", action="store_true",
                    help="draw in the GAME's order (ground-contact Y + elevation) "
                         "instead of the Editor's layer order")
    ap.add_argument("--report", action="store_true",
                    help="print every object's contact Y, level and depth, game order")
    a = ap.parse_args()

    scene = json.load(open(os.path.join(ROOT, f"{a.scene}.scene"), encoding="utf-8"))
    js = open(os.path.join(ROOT, f"{a.scene}.js"), encoding="utf-8").read()
    urls = texture_urls()

    tm = scene["plainObjects"][0]
    W, H = tm["width"] * tm["tileWidth"], tm["height"] * tm["tileHeight"]
    canvas = Image.new("RGBA", (W, H), (28, 30, 38, 255))
    draw_tilemap(canvas, scene, js, urls)

    drawn = 0
    if not a.ysort:
        for e in scene["displayList"]:
            if e.get("label") in a.skip or e.get("visible") is False:
                continue
            if e.get("type") == "Layer":
                for c in e.get("list", []):
                    draw_object(canvas, c, urls)
                    drawn += 1
            else:
                draw_object(canvas, e, urls)
                drawn += 1
    else:
        plates = read_plates(scene["displayList"])
        band = []

        for e in scene["displayList"]:
            label = e.get("label")
            if label in a.skip or e.get("visible") is False:
                continue
            is_layer = e.get("type") == "Layer"

            # The ground layer draws first and never sorts — same as DEPTH.ground.
            if label == "L1_GROUND":
                for c in e.get("list", []):
                    draw_object(canvas, c, urls)
                    drawn += 1
                continue
            if label in EXCLUDED_LAYERS:
                continue

            for c in (e.get("list", []) if is_layer else [e]):
                placed = place_object(c, urls)
                if placed is None:
                    continue
                img, x, y = placed
                bottom = y + img.height
                key = (c.get("texture") or {}).get("key") or ""
                depth, level = depth_of(bottom, x + img.width / 2, key, plates, c.get("depth"))
                band.append((depth, level, bottom, c.get("label", "?"), label, placed))

        band.sort(key=lambda r: r[0])
        for depth, level, bottom, lbl, parent, (img, x, y) in band:
            canvas.alpha_composite(img, (x, y))
            drawn += 1

        if a.report:
            print(f"{'depth':>9} {'lvl':>3} {'botY':>6}  {'object':<34} layer")
            for depth, level, bottom, lbl, parent, _ in band:
                print(f"{depth:>9.0f} {level:>3} {bottom:>6.0f}  {lbl:<34} {parent}")

    out = a.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", f"_{a.scene}.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.convert("RGB").save(out)
    print(f"{a.scene}: {W}x{H}, {drawn} objects -> {out}")


if __name__ == "__main__":
    main()
