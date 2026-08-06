#!/usr/bin/env python3
"""
Trim a generated UI piece to its own artwork, and report a usable 9-slice.

WHY THIS EXISTS: PixelLab returns every object on a fixed square canvas
regardless of the object's shape. The UI kit's button is 112x34 of art sitting
in a 128x128 canvas; the bar trough is 120x30; the slot is 45x47. More than
three quarters of those files is transparent padding.

That padding is invisible until you use the file as a `border-image`, where the
slice is measured FROM THE CANVAS EDGE. A 28px slice on the button grabbed
almost entirely empty space, so the rendered control was a flat CSS rectangle
with a few stray ornament pixels at its edges and none of the generated wood or
gold. Raheem, correctly: "the buttons are absolutely terrible... the bars are
lifeless, they're tiny, surrounded by these giant dark boxes."

Trimming to the content box makes the slice mean what it looks like it means.
Deterministic, free, and repeatable — run it on every new UI piece before
wiring it to a component.

The suggested slice is content-aware rather than a fixed fraction: it never
exceeds 40% of a side, so the middle band always survives to be repeated. A
slice that eats the whole piece leaves nothing to stretch and the art smears.

Usage: trim_ui_piece.py <in.png> [out.png]
"""
import sys

from PIL import Image


def trim(src: str, dst: str) -> None:
    im = Image.open(src).convert("RGBA")
    box = im.getbbox()
    if not box:
        sys.exit(f"{src} is fully transparent")
    out = im.crop(box)
    out.save(dst)

    w, h = out.size
    # Cap at 40% so a middle band always remains on both axes.
    sx = max(1, min(round(w * 0.28), int(w * 0.4)))
    sy = max(1, min(round(h * 0.28), int(h * 0.4)))
    print(f"{src} {im.size} -> {dst} {out.size}")
    print(f"  border-image-slice: {sy} {sx} fill")
    print(f"  suggested borderWidth: {sy}px vertical / {sx}px horizontal")
    print(
        "  NOTE: use the `fill` keyword for SOLID pieces (button, bar, slot) — without it\n"
        "  the middle of the art is discarded and the element's own background shows\n"
        "  through, which is the exact defect this script was written after."
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    trim(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else sys.argv[1])
