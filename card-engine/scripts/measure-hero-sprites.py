#!/usr/bin/env python3
"""Re-measure the `anchor` block in `src/data/combat/heroSpriteManifest.ts`.

The hero sprites come from two sources that frame their characters completely
differently (the Figma pack leaves ~23% dead space under the feet, the Leonardo
renders run nearly to the edge). `HeroSpriteLayer` normalizes that at render
time using the per-archetype `anchor` numbers; this script is how those numbers
are produced. Run it after replacing or adding a sprite PNG and paste the
output into the manifest.

Anchors are measured from the LARGEST CONNECTED opaque region rather than the
raw alpha bounding box, because `monk.png` and `vampire.png` each have a
decorative moon floating in a corner that would otherwise skew both the height
normalization and the horizontal centering.

    pip install pillow numpy scipy
    python3 scripts/measure-hero-sprites.py
"""

import glob
import os

import numpy as np
from PIL import Image
from scipy import ndimage

SPRITE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public/assets/combat/heroes/archetypes",
)

# Anything below this alpha is treated as background, not silhouette.
ALPHA_THRESHOLD = 40


def measure(path):
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    opaque = np.array(image.split()[-1]) > ALPHA_THRESHOLD

    labels, count = ndimage.label(opaque)
    if count == 0:
        raise ValueError(f"{path} is fully transparent")
    areas = ndimage.sum(opaque, labels, range(1, count + 1))
    body = labels == int(np.argmax(areas)) + 1

    ys, xs = np.where(body)
    left, right = xs.min() / width, (xs.max() + 1) / width
    top, bottom = ys.min() / height, (ys.max() + 1) / height

    return {
        "baseline": round(bottom, 4),
        "bodyHeight": round(bottom - top, 4),
        "centerX": round((left + right) / 2, 4),
        "blobs": count,
    }


def main():
    paths = [p for p in sorted(glob.glob(f"{SPRITE_DIR}/*.png")) if "candidate" not in p]
    for path in paths:
        a = measure(path)
        name = os.path.basename(path)
        note = "" if a["blobs"] == 1 else f"   // {a['blobs']} blobs — largest used"
        print(
            f"{name:<20} anchor: {{ baseline: {a['baseline']}, "
            f"bodyHeight: {a['bodyHeight']}, centerX: {a['centerX']} }},{note}"
        )


if __name__ == "__main__":
    main()
