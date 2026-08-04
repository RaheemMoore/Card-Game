#!/usr/bin/env python3
"""
Flatten baked daylight out of a generated ground plate.

WHY THIS EXISTS. The courtyard floor is being regenerated so the castle can have
a day/night cycle, and a cast shadow painted into the art is a FIXED SUN — you
cannot animate a light that is welded into the pixels. Leonardo obeys "shadowless"
at swatch size and ignores it at plate size, where it decides it is painting a
scene and a scene gets a sun. Raheem, 2026-08-04: "maybe you could remove shadows
later, if that's a thing." It is a thing, within limits, and this measures them.

MULTIPLY, NEVER ADD — the same rule lib/relight.py learned the hard way. A shadow
is not a dark layer laid on top of the ground, it is the ground receiving less
light: the physics is multiplicative. So the repair is a per-pixel GAIN, not an
offset. Scaling all three channels by one factor leaves (max-min)/max untouched,
so hue and saturation come through exactly; adding a constant would raise the
minimum as much as the maximum and wash the whole plate toward grey. relight.py
recorded that failure (hero saturation 0.53 -> 0.17) and it applies verbatim here.

HOW. Illumination in a shadow is low-frequency and the ground texture is high-
frequency, so they separate by scale. A large-radius blur of the luminance is an
estimate of "how much light landed here"; dividing it out flattens the lighting
and leaves the texture. This is flat-field correction, and it is the same trick
astronomers use to remove uneven illumination from a sensor.

THE HONEST LIMIT. A hard shadow EDGE is not low-frequency, so the blur cannot
follow it exactly and a soft halo survives at the boundary. Soft and mid shadows
clean up well; a knife-edged shadow leaves a visible seam. Check the printed
verdict rather than trusting the method — and prefer a plate generated closer to
high noon, where there is less to remove in the first place.

Nothing here spends a generation. It is free and re-runnable, so reach for it
before re-rolling a plate that is otherwise good.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image, ImageFilter

# Radius of the illumination estimate, as a fraction of the image's long edge.
# Too small and it starts following the texture, erasing the ground's own
# contrast along with the shadow; too large and it stops following the shadow.
BLUR_FRACTION = 0.09

# A shadow may be lifted by at most this much. Uncapped gain turns the darkest
# corners into noise, because a deep shadow simply has less signal to recover.
MAX_GAIN = 2.6


def _illumination(lum: np.ndarray, radius: float) -> np.ndarray:
    """Low-frequency light field: how much light landed, texture removed."""
    img = Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)


def flatten(rgb: np.ndarray) -> tuple[np.ndarray, dict]:
    """Return (flattened RGB float array, measurements)."""
    lum = rgb.mean(axis=2)
    radius = BLUR_FRACTION * max(rgb.shape[:2])
    illum = np.maximum(_illumination(lum, radius), 1.0)

    # Aim at the plate's own bright ground rather than an absolute value, so a
    # deliberately warm or deliberately cool plate keeps its exposure.
    target = float(np.percentile(illum, 90))
    gain = np.clip(target / illum, 1.0, MAX_GAIN)[:, :, None]

    # Cap per pixel so nothing clips: an already-bright pixel simply lifts less,
    # which is the correct behaviour anyway.
    headroom = 255.0 / np.maximum(rgb.max(axis=2, keepdims=True), 1.0)
    out = rgb * np.minimum(gain, headroom)

    return np.clip(out, 0, 255), {
        "spread_before": _spread(lum),
        "spread_after": _spread(out.mean(axis=2)),
        "sat_before": _saturation(rgb),
        "sat_after": _saturation(out),
    }


def _spread(lum: np.ndarray) -> float:
    """Brightest regions over darkest. 1.0 would be perfectly flat light."""
    return float(np.percentile(lum, 95) / max(np.percentile(lum, 5), 1.0))


def _saturation(rgb: np.ndarray) -> float:
    mx = rgb.max(axis=2)
    return float(np.mean((mx - rgb.min(axis=2)) / np.maximum(mx, 1.0)))


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: deshadow.py <in.png> <out.png>", file=sys.stderr)
        return 2

    src, dst = argv[1], argv[2]
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    out, m = flatten(rgb)
    Image.fromarray(out.astype(np.uint8)).save(dst)

    print(f"light spread  {m['spread_before']:.2f} -> {m['spread_after']:.2f}  (1.0 = flat)")
    print(f"saturation    {m['sat_before']:.3f} -> {m['sat_after']:.3f}  (must not drop)")

    # The verdict line. relight.py's history is that only the verdict caught the
    # regression, so state a plain pass/fail rather than leaving it to the eye.
    flat_enough = m["spread_after"] <= 3.0
    kept_colour = m["sat_after"] >= m["sat_before"] - 0.02
    print(f"VERDICT       {'PASS' if flat_enough and kept_colour else 'REVIEW'}"
          f" — {'usable as a day/night base' if flat_enough else 'shadow survives; regenerate nearer high noon'}"
          f"{'' if kept_colour else '; COLOUR LOST, do not ship'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
