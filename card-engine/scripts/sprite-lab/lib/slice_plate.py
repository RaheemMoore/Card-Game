#!/usr/bin/env python3
"""
Cut animatable layers out of the painted courtyard plate.

WHY CUT RATHER THAN GENERATE: a pixel prop sitting next to a painted prop reads
as a bug. Layers taken from the plate itself match by construction — the pixels
came out of that painting. This is what makes the courtyard animatable without
touching its art.

Only the FOUNTAIN WATER is extracted. The crystal lampposts need no cutout at
all: a procedural additive glow drawn over the painted crystal is cheaper, has
no asset to keep in sync, and looks better than a re-tinted crop.

Output:
  water.png       the water surface, transparent elsewhere, full-plate sized so
                  it composites at (0,0) with no offset bookkeeping
  layers.json     bounding box + the glow anchor positions

Usage: slice_plate.py <plate.png> <out_dir>
"""
import json
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

# Fountain basin in plate coordinates, read off a coordinate-grid overlay and
# confirmed by colour probe (mean RGB [141,173,162] — cyan-dominant).
WATER_BOX = (655, 548, 885, 695)

# Crystal lamppost heads, same method. A glow is drawn at each.
GLOWS = [
    {"x": 333, "y": 398, "radius": 46, "color": "#8fe6ff"},
    {"x": 315, "y": 600, "radius": 46, "color": "#c9a8ff"},
    {"x": 333, "y": 952, "radius": 50, "color": "#ffb3e6"},
    {"x": 1083, "y": 948, "radius": 50, "color": "#8fe6ff"},
]


def extract_water(plate: Image.Image) -> Image.Image:
    a = np.array(plate.convert("RGB")).astype(int)
    h, w, _ = a.shape
    x0, y0, x1, y1 = WATER_BOX

    region = a[y0:y1, x0:x1]
    R, G, B = region[..., 0], region[..., 1], region[..., 2]
    mx, mn = region.max(2), region.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)

    # Water is cyan-dominant: blue and green both above red, with real saturation.
    mask = ((B > R + 8) | (G > R + 6)) & (sat > 0.18) & (mx > 90)

    alpha = np.zeros((h, w), dtype=np.uint8)
    alpha[y0:y1, x0:x1] = (mask * 255).astype(np.uint8)

    layer = plate.convert("RGBA").copy()
    a_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(1.2))
    layer.putalpha(a_img)
    return layer, int(mask.sum())


def main(plate_path: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    plate = Image.open(plate_path)

    water, px = extract_water(plate)
    water.save(os.path.join(out_dir, "water.png"))
    print(f"water.png  {px} px of water surface")

    meta = {
        "plate": os.path.basename(plate_path),
        "plateSize": {"width": plate.width, "height": plate.height},
        "waterBox": {"x": WATER_BOX[0], "y": WATER_BOX[1],
                     "width": WATER_BOX[2] - WATER_BOX[0],
                     "height": WATER_BOX[3] - WATER_BOX[1]},
        "glows": GLOWS,
        "note": (
            "Layers are cut from the plate so they match it exactly. Re-run this "
            "if the plate is ever regenerated — the boxes are traced, not derived."
        ),
    }
    with open(os.path.join(out_dir, "layers.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print("layers.json")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
