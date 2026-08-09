#!/usr/bin/env python3
"""Cut one piece out of a Leonardo plate along a polygon, for use as a Leonardo reference.

Why this exists. Raheem's workflow is: take a plate that already has the correct
angle and 16-bit read, drop it into Leonardo as a reference, and ask it to make
the thing fancier while holding the angle. That only works if the reference
shows ONE thing — hand it a tower with wall stubs attached and Leonardo
regenerates the wall too.

Free-standing subjects cannot be prompted for directly: every attempt in the
castle-grand-topdown run (F, H, I, K) came back isometric, because a horizontal
frame-spanning composition is the only thing that holds the angle. So the
reliable way to get a lone tower is to cut it out of a plate that has one
embedded in a wall.

    python lib/cut_piece.py <plate.png> <out-prefix> --poly x,y x,y x,y ...
                            [--pad 24] [--scale 4] [--no-flat]

Writes <out-prefix>-cut.png       transparent, trimmed to the piece
       <out-prefix>-reference.png flattened on white, padded and upscaled

The white flatten is not cosmetic. building-forge.json records the finding:
a transparent surround uploads to Leonardo as BLACK and drags the whole palette
dark. Always hand Leonardo the flattened file.

The upscale is NEAREST on purpose — these are pixel plates, and a smooth resize
would hand Leonardo a blurred reference and get blurred art back.
"""
import argparse
import os

from PIL import Image, ImageDraw


def cut(plate_path, poly, pad=24, scale=4, flat=True):
    im = Image.open(plate_path).convert("RGBA")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    piece = Image.new("RGBA", im.size, (0, 0, 0, 0))
    piece.paste(im, (0, 0), mask)
    box = piece.getbbox()
    if box is None:
        raise SystemExit("polygon selected nothing — check the coordinates against the plate")
    piece = piece.crop(box)

    ref = None
    if flat:
        ref = Image.new("RGB", (piece.width + pad * 2, piece.height + pad * 2), (255, 255, 255))
        ref.paste(piece, (pad, pad), piece)
        if scale > 1:
            ref = ref.resize((ref.width * scale, ref.height * scale), Image.NEAREST)
    return piece, ref


def parse_point(s):
    x, y = s.split(",")
    return int(x), int(y)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plate")
    ap.add_argument("out_prefix")
    ap.add_argument("--poly", nargs="+", required=True, metavar="X,Y",
                    help="polygon vertices in plate pixel coordinates, in order")
    ap.add_argument("--pad", type=int, default=24, help="white margin around the reference (default 24)")
    ap.add_argument("--scale", type=int, default=4, help="NEAREST upscale for the reference (default 4)")
    ap.add_argument("--no-flat", action="store_true", help="skip the white-flattened reference")
    a = ap.parse_args()

    poly = [parse_point(p) for p in a.poly]
    if len(poly) < 3:
        raise SystemExit("need at least 3 polygon points")

    piece, ref = cut(a.plate, poly, a.pad, a.scale, not a.no_flat)
    cut_path = f"{a.out_prefix}-cut.png"
    piece.save(cut_path)
    print(f"{cut_path}  {piece.width}x{piece.height}  transparent")
    if ref is not None:
        ref_path = f"{a.out_prefix}-reference.png"
        ref.save(ref_path)
        print(f"{ref_path}  {ref.width}x{ref.height}  flattened on white — give Leonardo THIS one")


if __name__ == "__main__":
    main()
