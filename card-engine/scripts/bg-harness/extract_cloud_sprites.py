#!/usr/bin/env python3
"""Extract the four Leonardo cloud clusters into reusable alpha sprites.

Leonardo produced a smooth sky behind the requested sprites instead of the
requested chroma key. Each crop has clear sky on its left and right borders,
so this script estimates that background row-by-row and turns colour distance
from the estimate into a softly antialiased alpha channel. It deliberately
keeps the paid generation immutable and writes derived assets alongside it.
"""

from __future__ import annotations

import math
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


CROPS = {
    "cloud-near-left.png": (58, 44, 640, 296),
    "cloud-near-right.png": (640, 44, 1215, 312),
    "cloud-far-left.png": (76, 364, 635, 620),
    "cloud-far-right.png": (636, 360, 1225, 624),
}


def smoothstep(value: np.ndarray, low: float, high: float) -> np.ndarray:
    t = np.clip((value - low) / (high - low), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def keep_main_cloud(alpha: np.ndarray) -> np.ndarray:
    """Keep the single major cloud body and discard detached streaks/specks."""

    # Erode the detection mask first so hairline horizon streaks cannot act as
    # bridges between the real cloud and incidental Leonardo fragments.
    core_image = Image.fromarray(np.uint8(alpha > .12) * 255, "L")
    core = np.asarray(core_image.filter(ImageFilter.MinFilter(3))) > 0
    height, width = core.shape
    visited = np.zeros_like(core, dtype=bool)
    largest: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if not core[y, x] or visited[y, x]:
                continue
            component: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(y, x)])
            visited[y, x] = True
            while queue:
                cy, cx = queue.popleft()
                component.append((cy, cx))
                for ny in range(max(0, cy - 1), min(height, cy + 2)):
                    for nx in range(max(0, cx - 1), min(width, cx + 2)):
                        if core[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            queue.append((ny, nx))
            if len(component) > len(largest):
                largest = component

    if not largest:
        return np.zeros_like(alpha)

    main = np.zeros_like(core, dtype=np.uint8)
    ys, xs = zip(*largest)
    main[np.asarray(ys), np.asarray(xs)] = 255
    # Grow back into the original antialiased silhouette without admitting any
    # disconnected artwork outside the major formation.
    main = np.asarray(
        Image.fromarray(main, "L").filter(ImageFilter.MaxFilter(11))
    ) > 0
    return alpha * main.astype(np.float32)


def extract(
    source: Image.Image,
    box: tuple[int, int, int, int],
    *,
    approved_orange: bool = False,
) -> Image.Image:
    crop = np.asarray(source.crop(box).convert("RGB"), dtype=np.float32)
    height, width, _ = crop.shape
    border = max(10, min(24, width // 24))

    left = np.median(crop[:, :border, :], axis=1)
    right = np.median(crop[:, -border:, :], axis=1)
    blend = np.linspace(0.0, 1.0, width, dtype=np.float32)[None, :, None]
    background = left[:, None, :] * (1.0 - blend) + right[:, None, :] * blend

    # Weighted RGB distance emphasizes the warm-vs-blue separation that defines
    # these sunset cloud silhouettes without requiring a model dependency.
    delta = crop - background
    distance = np.sqrt(
        delta[:, :, 0] ** 2 * 0.38
        + delta[:, :, 1] ** 2 * 0.34
        + delta[:, :, 2] ** 2 * 0.28
    )
    alpha = smoothstep(distance, 15.0, 42.0)

    # The source generation painted unusually dark blue undersides. Lift those
    # shadow colours toward warm lavender so the clouds remain dimensional but
    # no longer read like storm clouds pasted onto a welcoming sunset.
    luminance = crop[:, :, 0] * .2126 + crop[:, :, 1] * .7152 + crop[:, :, 2] * .0722
    shadow = np.clip((170.0 - luminance) / 105.0, 0.0, 1.0)
    vertical = smoothstep(np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None], .38, .95)
    lift = shadow * (13.0 + vertical * 22.0) * np.clip(alpha * 1.5, 0.0, 1.0)
    crop[:, :, 0] = np.clip(crop[:, :, 0] + lift * 1.10 + shadow * alpha * 5.0, 0, 255)
    crop[:, :, 1] = np.clip(crop[:, :, 1] + lift * .92 + shadow * alpha * 3.0, 0, 255)
    crop[:, :, 2] = np.clip(crop[:, :, 2] + lift * .70, 0, 255)

    # Keep the generated image's own subtle edge softness while suppressing
    # isolated compression flecks and guaranteeing transparent outer bounds.
    alpha_img = Image.fromarray(np.uint8(np.clip(alpha * 255.0, 0, 255)), "L")
    alpha_img = alpha_img.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    alpha = np.asarray(alpha_img, dtype=np.float32) / 255.0
    if approved_orange:
        # The user approved this warm formation but rejected the blue lower
        # matte. Warm-vs-blue separation is reliable for this specific cloud:
        # retain its peach/lavender body and decisively remove the cool sky and
        # disappearing blue tail that the generic colour-distance matte kept.
        warmth = crop[:, :, 0] - crop[:, :, 2]
        warm_guard = smoothstep(warmth, -18.0, 24.0)
        alpha *= warm_guard
        alpha = smoothstep(alpha, .04, .68)
        cool_shadow = smoothstep(crop[:, :, 2] - crop[:, :, 0], 3.0, 42.0) * alpha
        lavender = np.array([190.0, 172.0, 188.0], dtype=np.float32)
        mix = (cool_shadow * .42)[:, :, None]
        crop = crop * (1.0 - mix) + lavender[None, None, :] * mix

    alpha = keep_main_cloud(alpha)
    # The chosen cloud is the minimum visual density: every sprite keeps a
    # solid body, with softness confined to its antialiased outer silhouette.
    alpha = np.power(smoothstep(alpha, .025, .62), .62)

    yy, xx = np.mgrid[0:height, 0:width]
    edge = np.minimum.reduce([xx, width - 1 - xx, yy, height - 1 - yy]).astype(np.float32)
    edge_fade = smoothstep(edge, 0.0, 18.0)
    alpha *= edge_fade

    rgba = np.dstack([crop, np.clip(alpha * 255.0, 0, 255)])
    sprite = Image.fromarray(np.uint8(rgba), "RGBA")

    # Trim dead canvas and store a compact half-resolution runtime asset. Phaser
    # will scale these gently; keeping them compact also lets the review harness
    # embed every image without becoming an oversized document.
    bounds = sprite.getchannel("A").point(lambda value: 255 if value > 10 else 0).getbbox()
    if bounds:
        padding = 8
        left = max(0, bounds[0] - padding)
        top = max(0, bounds[1] - padding)
        right = min(sprite.width, bounds[2] + padding)
        bottom = min(sprite.height, bounds[3] + padding)
        sprite = sprite.crop((left, top, right, bottom))
    scale = min(1.0, 420 / sprite.width, 190 / sprite.height)
    if scale < 1.0:
        sprite = sprite.resize(
            (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
            Image.Resampling.LANCZOS,
        )
    return sprite


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: extract_cloud_sprites.py <source.png> <output-dir>")
        return 2

    source_path = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    source = Image.open(source_path)

    for filename, box in CROPS.items():
        approved = filename == "cloud-near-left.png"
        sprite = extract(source, box, approved_orange=approved)
        sprite.save(output_dir / filename, optimize=True)
        print(output_dir / filename)
        if approved:
            approved_path = output_dir / "cloud-approved-orange.png"
            sprite.save(approved_path, optimize=True)
            print(approved_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
