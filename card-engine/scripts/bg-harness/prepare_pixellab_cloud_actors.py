#!/usr/bin/env python3
"""Turn approved PixelLab cloud objects into exact three-band palette sprites."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE_V1 = ROOT.parent / "sprite-lab/out/castle-front-cloud-actors-v1"
SOURCE_V2 = ROOT.parent / "sprite-lab/out/castle-front-cloud-family-v2"
OUTPUT = ROOT / "out/castle-front-v4-cloud-actors"

SOURCES = {
    "broad": SOURCE_V1 / "object-neutral-cloud-family-v1-frame_0.png",
    "mound": SOURCE_V2 / "object-rounded-cloud-family-v2-frame_0.png",
    "puffs": SOURCE_V2 / "object-rounded-cloud-family-v2-frame_1.png",
    "sweep": SOURCE_V2 / "object-rounded-cloud-family-v2-frame_2.png",
}

# Dark underside -> brightest upper highlight. Every atmosphere uses the same
# three indices, so changing time of day never changes the cloud drawing.
PALETTES = {
    "neutral": ["#918991", "#ddd4ce", "#f7eee3"],
    "afternoon": ["#99adbc", "#e0e6e4", "#fff8e2"],
    "sunset": ["#a37f93", "#efb99a", "#ffd99d"],
    "twilight": ["#59627d", "#a7adbf", "#d4d6df"],
}


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def value_indices(image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[:, :, 3]
    opaque = alpha > 0
    luminance = (
        rgba[:, :, 0].astype(np.float32) * .2126
        + rgba[:, :, 1].astype(np.float32) * .7152
        + rgba[:, :, 2].astype(np.float32) * .0722
    )
    values = luminance[opaque]
    # Cluster the provider's actual painted values instead of splitting the
    # histogram by area. Large midtone regions would otherwise swallow a small
    # but important highlight or underside band on the distant cloud.
    centers = np.percentile(values, [12, 52, 88]).astype(np.float32)
    for _ in range(12):
        labels = np.abs(values[:, None] - centers[None, :]).argmin(axis=1)
        updated = np.asarray(
            [values[labels == index].mean() if np.any(labels == index) else centers[index]
             for index in range(3)],
            dtype=np.float32,
        )
        if np.allclose(updated, centers):
            break
        centers = updated
    centers.sort()
    thresholds = (centers[:-1] + centers[1:]) / 2.0
    indices = np.digitize(luminance, thresholds).astype(np.uint8)
    indices[~opaque] = 0
    return indices, alpha


def apply_palette(indices: np.ndarray, alpha: np.ndarray, colors: list[str]) -> Image.Image:
    table = np.asarray([rgb(color) for color in colors], dtype=np.uint8)
    rgba = np.dstack([table[indices], alpha])
    return Image.fromarray(rgba, "RGBA")


def main() -> int:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, object] = {
        "source": "PixelLab /create-1-direction-object",
        "acceptedSources": {
            "broad": "v1 frame 0, user-selected anchor",
            "mound": "v2 frame 0",
            "puffs": "v2 frame 1",
            "sweep": "v2 frame 2",
        },
        "rejectedSources": {
            "v1 frame 1": "flat-bottomed tower silhouette rejected by user",
            "v1 frame 2": "unrelated fireplace",
            "v1 frame 3": "unrelated container",
            "v2 frame 3": "near-duplicate of v2 frame 0",
        },
        "palettes": PALETTES,
        "assets": {},
    }

    for name, source_path in SOURCES.items():
        source = Image.open(source_path).convert("RGBA")
        bounds = source.getchannel("A").getbbox()
        if not bounds:
            raise SystemExit(f"{source_path} is fully transparent")
        padding = 4
        bounds = (
            max(0, bounds[0] - padding),
            max(0, bounds[1] - padding),
            min(source.width, bounds[2] + padding),
            min(source.height, bounds[3] + padding),
        )
        source = source.crop(bounds)
        indices, alpha = value_indices(source)
        files: dict[str, str] = {}
        for palette_name, colors in PALETTES.items():
            output_path = OUTPUT / f"cloud-{name}-{palette_name}.png"
            apply_palette(indices, alpha, colors).save(output_path, optimize=True)
            files[palette_name] = output_path.name
            print(output_path)
        manifest["assets"][name] = {
            "source": source_path.name,
            "size": list(source.size),
            "files": files,
        }

    manifest_path = OUTPUT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(manifest_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
