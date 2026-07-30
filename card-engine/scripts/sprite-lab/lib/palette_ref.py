#!/usr/bin/env python3
"""
Shrink a scene plate into a small palette reference for PixelLab's
`color_image` field.

The full courtyard plate is 1536x1152 — base64'd that is ~800KB of request
body just to communicate "these are the colours". A 192px-wide thumbnail
carries the same palette information at a fraction of the size, and PixelLab
only samples colour from it.

Usage: palette_ref.py <in.png> <out.png> [width]
"""
import sys
from PIL import Image


def make_ref(src: str, dst: str, width: int = 192) -> None:
    img = Image.open(src).convert("RGB")
    ratio = width / img.width
    img = img.resize((width, max(1, round(img.height * ratio))), Image.LANCZOS)
    img.save(dst)
    print(f"{dst}  {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 192
    make_ref(sys.argv[1], sys.argv[2], w)
