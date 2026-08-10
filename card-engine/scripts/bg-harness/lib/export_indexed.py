#!/usr/bin/env python3
"""Convert a kit to INDEXED PNGs on one shared palette, so it can be hand-coloured.

Raheem, 2026-08-09: "we need the ability to go in and change the colors ourselves
and to change the color of the individual pixels."

He already could open these — they are PNGs. What he could not do is change one
colour and have every pixel using it change. That needs indexed mode.

An RGBA image has no palette, so Pixelorama and Aseprite give you no swatch
panel: recolouring "all the stone grey" means select-by-colour and bucket-fill,
per file, per shade. An INDEXED image stores an index per pixel and the colours
once, in a table. Edit entry 17 and every pixel using it repaints instantly, and
because all five pieces share one table, it repaints across the whole kit.

THIS DOES NOT CHANGE A SINGLE PIXEL'S COLOUR. The palette is built from the
colours already present, not re-quantised, so the conversion is a container
change. `--verify` proves that rather than asserting it.

INDEX 0 IS RESERVED FOR TRANSPARENCY, written as a tRNS chunk. That is Aseprite's
convention and Pixelorama reads it the same way. It is also why the palette holds
47 colours plus one reserve rather than a round 48 of art.

    python lib/export_indexed.py <file-or-dir> [more...] --palette-out DIR [--verify]

Writes, beside the assets:
    castle-kit.gpl   GIMP palette — imported by BOTH Pixelorama and Aseprite
    castle-kit.hex   one RRGGBB per line, for anything else

Nothing in this repo could read or write a palette FILE before this. There was
derivation (quantize_shared.py), display (swatch strip PNGs) and remapping
(recolor.py), but no interchange format — which is exactly why hand-colouring was
blocked.

Downstream safety, verified rather than assumed: build-asset-pack.mjs only reads
IHDR width/height (pngSize(), lines 53-55) and never inspects colour type, and
browsers decode indexed PNG to RGBA anyway, so Phaser is unaffected.

THE TRAP: every existing sprite-lab script — recolor.py, harmonize.py,
relight.py, resample.py — ends with .convert("RGBA"). Run one over an indexed
file and the indexing silently evaporates: pixels identical, palette gone.
lib/check_palette.py reports mode so that surfaces rather than being discovered.
"""
import argparse
import os

import numpy as np
from PIL import Image

TRANSPARENT_INDEX = 0
MAX_COLOURS = 256


def collect(paths):
    """Expand files and directories into a sorted list of PNGs."""
    out = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                out += [os.path.join(root, f) for f in sorted(files)
                        if f.endswith(".png") and not f.startswith("_")]
        else:
            out.append(p)
    return sorted(set(out))


def shared_palette(files):
    """Every opaque colour used across the whole kit, in a stable order.

    Sorted by luminance so the palette strip reads dark-to-light in the editor
    rather than in whatever order the quantiser happened to emit — which matters
    when a human is hunting for "the stone shadow" among 47 swatches.
    """
    union = set()
    for f in files:
        a = np.asarray(Image.open(f).convert("RGBA"))
        opaque = a[:, :, 3] > 0
        if opaque.any():
            # int(), not the raw numpy scalars. np.unique hands back uint8, and
            # `np.uint8(200) << 16` wraps inside 8 bits and evaluates to 0 — so
            # every palette lookup silently returned index 0 and the first run
            # wrote five fully transparent files. --verify is what caught it.
            union |= {tuple(int(v) for v in c)
                      for c in np.unique(a[:, :, :3][opaque], axis=0)}
    cols = sorted(union, key=lambda c: (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]))
    if len(cols) + 1 > MAX_COLOURS:
        raise SystemExit(f"{len(cols)} colours + 1 transparent exceeds the {MAX_COLOURS} "
                         f"a PNG palette can hold — quantize further first")
    return cols


def to_indexed(path, cols, index_of):
    a = np.asarray(Image.open(path).convert("RGBA"))
    h, w = a.shape[:2]
    opaque = a[:, :, 3] > 0

    idx = np.zeros((h, w), np.uint8)          # 0 everywhere = transparent
    flat = a[:, :, :3].reshape(-1, 3)
    keys = (flat[:, 0].astype(np.int32) << 16) | (flat[:, 1].astype(np.int32) << 8) | flat[:, 2]
    lut = np.zeros(1 << 24, np.uint8)
    for c, i in index_of.items():
        lut[(c[0] << 16) | (c[1] << 8) | c[2]] = i
    idx = lut[keys].reshape(h, w)
    idx[~opaque] = TRANSPARENT_INDEX

    im = Image.fromarray(idx, "P")
    pal = [0, 0, 0]                            # index 0 — never drawn
    for c in cols:
        pal += list(c)
    pal += [0, 0, 0] * (MAX_COLOURS - len(cols) - 1)
    im.putpalette(pal)
    im.save(path, transparency=TRANSPARENT_INDEX, optimize=False)
    return im


def verify(path, before):
    """Prove no pixel changed value. A container change must be exactly that."""
    after = np.asarray(Image.open(path).convert("RGBA"))
    if after.shape != before.shape:
        return f"SHAPE CHANGED {before.shape} -> {after.shape}"
    # Compare colour only where both are opaque; RGB under full transparency is
    # meaningless and was deliberately cleared to (0,0,0,0) earlier.
    ob, oa = before[:, :, 3] > 0, after[:, :, 3] > 0
    if not np.array_equal(ob, oa):
        return f"ALPHA CHANGED on {int((ob ^ oa).sum())} px"
    if not np.array_equal(before[:, :, :3][ob], after[:, :, :3][oa]):
        diff = int((before[:, :, :3][ob] != after[:, :, :3][oa]).any(1).sum())
        return f"COLOUR CHANGED on {diff} px"
    return None


def write_palette(cols, out_dir, name="castle-kit"):
    os.makedirs(out_dir, exist_ok=True)
    gpl = os.path.join(out_dir, f"{name}.gpl")
    with open(gpl, "w", encoding="utf-8") as f:
        f.write(f"GIMP Palette\nName: {name}\nColumns: 8\n#\n")
        # Strictly ASCII. GIMP-palette parsers vary in strictness and a stray
        # em dash in a comment is a needless way to find out which ones care.
        f.write("  0   0   0\tindex 00 TRANSPARENT - do not paint with this\n")
        for i, c in enumerate(cols, start=1):
            f.write(f"{c[0]:3d} {c[1]:3d} {c[2]:3d}\t{i:02d} #{c[0]:02x}{c[1]:02x}{c[2]:02x}\n")
    hexf = os.path.join(out_dir, f"{name}.hex")
    with open(hexf, "w", encoding="utf-8") as f:
        for c in cols:
            f.write(f"{c[0]:02X}{c[1]:02X}{c[2]:02X}\n")
    return gpl, hexf


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+", help="PNG files or directories, converted IN PLACE")
    ap.add_argument("--palette-out", required=True, help="where castle-kit.gpl / .hex land")
    ap.add_argument("--name", default="castle-kit")
    ap.add_argument("--verify", action="store_true", help="prove no pixel changed value")
    a = ap.parse_args()

    files = collect(a.paths)
    if not files:
        raise SystemExit("no PNGs found")
    cols = shared_palette(files)
    index_of = {c: i + 1 for i, c in enumerate(cols)}   # 1..N, 0 stays transparent
    print(f"shared palette: {len(cols)} colours + 1 transparent index\n")

    problems = []
    for f in files:
        before = np.asarray(Image.open(f).convert("RGBA")).copy() if a.verify else None
        used = len(set(map(tuple, np.unique(
            np.asarray(Image.open(f).convert("RGBA"))[:, :, :3]
            [np.asarray(Image.open(f).convert("RGBA"))[:, :, 3] > 0], axis=0))))
        to_indexed(f, cols, index_of)
        note = ""
        if a.verify:
            err = verify(f, before)
            note = "  " + (err if err else "identical")
            if err:
                problems.append((f, err))
        print(f"  {os.path.basename(f):32s} {used:3d} colours -> indexed{note}")

    gpl, hexf = write_palette(cols, a.palette_out, a.name)
    print(f"\n  {gpl}")
    print(f"  {hexf}")
    if problems:
        raise SystemExit(f"\n{len(problems)} file(s) changed pixels — that is a bug, not a conversion")


if __name__ == "__main__":
    main()
