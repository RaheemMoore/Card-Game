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


def draw_object(canvas, o, urls):
    if o.get("visible") is False:
        return
    key = (o.get("texture") or {}).get("key")
    if not key or key not in urls:
        return
    img = Image.open(urls[key]).convert("RGBA")

    if o["type"] == "TileSprite":
        w, h = int(o.get("width", img.width)), int(o.get("height", img.height))
        tiled = Image.new("RGBA", (w, h))
        for y in range(0, h, img.height):
            for x in range(0, w, img.width):
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
    canvas.alpha_composite(img, (x, y))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene")
    ap.add_argument("--out")
    ap.add_argument("--skip", nargs="*", default=["L10_VOID_library", "L9_SHELF_offmap", "L5_QUADRANT_NW"])
    a = ap.parse_args()

    scene = json.load(open(os.path.join(ROOT, f"{a.scene}.scene"), encoding="utf-8"))
    js = open(os.path.join(ROOT, f"{a.scene}.js"), encoding="utf-8").read()
    urls = texture_urls()

    tm = scene["plainObjects"][0]
    W, H = tm["width"] * tm["tileWidth"], tm["height"] * tm["tileHeight"]
    canvas = Image.new("RGBA", (W, H), (28, 30, 38, 255))
    draw_tilemap(canvas, scene, js, urls)

    drawn = 0
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

    out = a.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", f"_{a.scene}.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.convert("RGB").save(out)
    print(f"{a.scene}: {W}x{H}, {drawn} objects -> {out}")


if __name__ == "__main__":
    main()
