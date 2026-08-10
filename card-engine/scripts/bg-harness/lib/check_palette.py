#!/usr/bin/env python3
"""Report kit pieces that have drifted off the shared palette. Warns, never blocks.

Nothing in this repo would notice a hand-edited asset today. `lint-assets.mjs`
only walks `public/assets/areas/**` and never opens a PNG; `build-asset-pack.mjs`
checks `existsSync` and reads IHDR width/height. A file whose colours wandered is
invisible to every existing check — same path, same size, still in the manifest.

That was survivable while only scripts touched the art. Once Raheem is painting
in Pixelorama it is not, so this exists.

Warn-only by his call: it tells you what moved and gets out of the way. A
deliberate new colour is a normal thing to paint, and failing the build over it
would make hand-editing hostile.

    python lib/check_palette.py <file-or-dir> [more...] --palette castle-kit.hex

Reports per piece:
  mode      P is indexed and editable; RGBA means the indexing evaporated. Every
            sprite-lab script — recolor.py, harmonize.py, relight.py,
            resample.py — ends in .convert("RGBA"), so running one over an
            indexed file silently un-indexes it. Pixels survive, palette does not.
  off-pal   colours not in the shared palette, with the worst offenders listed.
"""
import argparse
import os

import numpy as np
from PIL import Image


def load_palette(path):
    cols = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if len(line) == 6:
                cols.add((int(line[0:2], 16), int(line[2:4], 16), int(line[4:6], 16)))
    return cols


def collect(paths):
    out = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                out += [os.path.join(root, f) for f in sorted(files)
                        if f.endswith(".png") and not f.startswith("_")]
        else:
            out.append(p)
    return sorted(set(out))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--palette", required=True)
    a = ap.parse_args()

    pal = load_palette(a.palette)
    files = collect(a.paths)
    print(f"shared palette: {len(pal)} colours  ({a.palette})\n")
    print(f"{'piece':32s} {'mode':6s} {'colours':>8} {'off-palette':>12}")

    drifted, unindexed = 0, 0
    for f in files:
        im = Image.open(f)
        a_ = np.asarray(im.convert("RGBA"))
        opaque = a_[:, :, 3] > 0
        used = {tuple(int(v) for v in c)
                for c in np.unique(a_[:, :, :3][opaque], axis=0)} if opaque.any() else set()
        off = used - pal
        if off:
            drifted += 1
        if im.mode != "P":
            unindexed += 1
        flag = "" if im.mode == "P" else "  <- not indexed any more"
        print(f"{os.path.basename(f):32s} {im.mode:6s} {len(used):8d} {len(off):12d}{flag}")
        for c in sorted(off)[:6]:
            n = int((np.abs(a_[:, :, :3].astype(int) - np.array(c)).max(2) == 0).sum())
            print(f"    #{c[0]:02x}{c[1]:02x}{c[2]:02x}  {n:,} px")
        if len(off) > 6:
            print(f"    ... and {len(off) - 6} more")

    print()
    if not drifted and not unindexed:
        print("clean — every piece indexed and on the shared palette")
    else:
        if drifted:
            print(f"{drifted} piece(s) use colours outside the palette. If that was deliberate, "
                  f"re-run export_indexed.py to fold the new colours in.")
        if unindexed:
            print(f"{unindexed} piece(s) are no longer indexed. Re-run export_indexed.py to "
                  f"restore the palette; the pixels are unharmed.")


if __name__ == "__main__":
    main()
