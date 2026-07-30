#!/usr/bin/env python3
"""
Extract a style-reference image from a packed character sheet.

PixelLab's `style_images` (objects, tiles) caps at 256x256. This pulls one frame
out of a sheet, trims it to the character, and fits it inside that cap without
upscaling — so scenery can be anchored to THE HERO's register rather than to the
painted plate.

Why the hero and not the plate: passing `courtyard.png` as a colour reference
dragged the chibi toward dark stone tones and cost him face contrast. The
character the player watches sets the register; the scenery follows.

Usage: style_ref.py <sheet.png> <meta.json> <out.png> [frame_index] [max_px]
"""
import json
import sys
from PIL import Image


def extract(sheet_path: str, meta_path: str, out_path: str, frame: int = 0, cap: int = 256) -> None:
    meta = json.load(open(meta_path))
    fw, fh, cols = meta["frameWidth"], meta["frameHeight"], meta["columns"]
    row, col = divmod(frame, cols)

    sheet = Image.open(sheet_path).convert("RGBA")
    cell = sheet.crop((col * fw, row * fh, (col + 1) * fw, (row + 1) * fh))

    box = cell.getbbox()
    if box:
        cell = cell.crop(box)

    # Fit inside the cap. Never upscale — inventing pixels would misrepresent
    # the very style we are trying to communicate.
    if max(cell.size) > cap:
        scale = cap / max(cell.size)
        cell = cell.resize(
            (max(1, round(cell.width * scale)), max(1, round(cell.height * scale))),
            Image.NEAREST,
        )

    cell.save(out_path)
    print(f"{out_path}  {cell.size[0]}x{cell.size[1]}  (frame {frame})")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    extract(
        args[0],
        args[1],
        args[2],
        int(args[3]) if len(args) > 3 else 0,
        int(args[4]) if len(args) > 4 else 256,
    )
