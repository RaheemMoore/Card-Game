#!/usr/bin/env python3
"""
Derive a ground-contact footprint for a placed sprite, from its own alpha.

A collider is the patch of FLOOR a thing stands on — where its legs meet the
ground and the space between them — not a box around its picture. In a top-down
game you walk on the floor, so a collider shaped like the artwork stops the
player walking behind things they should be able to walk behind.

HOW THE FOOTPRINT IS FOUND. Scan up from the sprite's lowest opaque row and take
the band that actually touches the ground (default: the bottom 14% of the
sprite's height). The footprint's WIDTH is the horizontal extent of opaque pixels
in that band, not of the whole sprite — which is the entire point. A lectern's
picture is wide at the top and narrow at the foot; a box around the picture would
block a corridor the player can really walk through.

The result is inset slightly, because a collider that matches the visible
silhouette exactly reads as "I am stuck on nothing" the moment a foot clips a
protruding pixel.

Usage:
  derive_colliders.py <layout.json>        # [{id,url,x,y,width,height}, ...]
  derive_colliders.py --one <png> <x> <y> <w> <h>
"""
import json
import os
import sys

import numpy as np
from PIL import Image

BAND = 0.14      # fraction of sprite height that counts as ground contact
INSET = 0.10     # shrink each side, so a stray pixel does not snag the player
MIN_W, MIN_H = 8, 6


def footprint(png_path, x, y, w, h, band=BAND, inset=INSET):
    img = Image.open(png_path).convert("RGBA")
    a = np.asarray(img)
    opaque = a[..., 3] > 128
    rows = np.where(opaque.any(1))[0]
    if not len(rows):
        return None
    top, bot = rows.min(), rows.max()
    sprite_h = bot - top + 1

    band_px = max(2, int(round(sprite_h * band)))
    strip = opaque[bot - band_px + 1: bot + 1]
    cols = np.where(strip.any(0))[0]
    if not len(cols):
        return None

    # Sprite-space -> world, honouring that the layer may be scaled in Figma.
    sx = w / img.width
    sy = h / img.height

    fx0 = x + cols.min() * sx
    fx1 = x + (cols.max() + 1) * sx
    fy1 = y + (bot + 1) * sy
    fy0 = y + (bot - band_px + 1) * sy

    fw, fh = fx1 - fx0, fy1 - fy0
    fx0 += fw * inset
    fw -= fw * inset * 2
    fy0 += fh * 0.25          # the very top of the band is the object, not floor
    fh -= fh * 0.25

    return {
        "x": round(fx0), "y": round(fy0),
        "width": max(MIN_W, round(fw)), "height": max(MIN_H, round(fh)),
    }


def main():
    if sys.argv[1] == "--one":
        png, x, y, w, h = sys.argv[2], *map(float, sys.argv[3:7])
        print(json.dumps(footprint(png, x, y, w, h)))
        return
    items = json.load(open(sys.argv[1]))
    out = []
    for it in items:
        p = it["url"]
        if not os.path.exists(p):
            print(f"  !! missing {p}", file=sys.stderr)
            continue
        fp = footprint(p, it["x"], it["y"], it["width"], it["height"])
        out.append({"id": it["id"], **(fp or {})})
        print(f"{it['id']:22s} {fp}")
    json.dump(out, open("derived-colliders.json", "w"), indent=1)


if __name__ == "__main__":
    main()
