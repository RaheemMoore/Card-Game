#!/usr/bin/env python3
"""Pack loose Wang tiles into the 4x4 sheet the project's tilemaps already use.

The five ground sets in the courtyard are each ONE 128x128 png — a 4x4 grid of
32px tiles — registered as a single asset and added to the tilemap's tilesets
array. That is what makes them selectable from the Editor's tileset picker. A
directory of 25 loose PNGs is not selectable as a tileset at all, so the cliff
tiles have to be packed the same way to be usable the way Raheem already works.

BIT ORDER IS THE PROJECT'S, NOT MINE. sprite-lab/lib/wang_autotile.py asserts
index = TL*8 + TR*4 + BL*2 + BR*1 on every run, with the set bit meaning "cell
15's material", and it verified identically across grass-dirt, forestfloor-dirt
and dirt-paving. Emitting a different order would produce a sheet that is wrong
everywhere at once and merely looks noisy, so this writes that exact order.

MISSING SIGNATURES ARE SYNTHESISED FROM QUADRANTS, not faked. A generated set
usually omits the two diagonals — plateaus touching at a single corner — because
the art is ambiguous. But a 4x4 sheet has no empty slots: cell 6 and cell 9 must
contain something or the autotiler picks garbage. Each missing tile is therefore
built one quadrant at a time, taking each quadrant from a real tile whose own
corner matches the target there. It is a seam, but it is a seam made of correct
material rather than a hole.

    python lib/pack_wang.py <tile-dir> <out.png> [--tile 32] [--k 2]
"""
import argparse
import os

from PIL import Image

# (NW, NE, SW, SE) -> sheet index, the order wang_autotile.py verifies.
def sig_to_index(sig):
    nw, ne, sw, se = (int(bool(v)) for v in sig)
    return nw * 8 + ne * 4 + sw * 2 + se * 1


QUADRANTS = {0: (0, 0), 1: (1, 0), 2: (0, 1), 3: (1, 1)}   # NW NE SW SE


def synthesise(sig, index, tile):
    """Build a missing tile from quadrants of real ones."""
    out = Image.new("RGBA", (tile, tile), (0, 0, 0, 0))
    half = tile // 2
    for qi, (qx, qy) in QUADRANTS.items():
        want = bool(sig[qi])
        # Prefer a donor that agrees at THIS corner and differs least elsewhere,
        # so the borrowed quadrant carries the right material and roughly the
        # right boundary direction.
        donors = [s for s in index if bool(s[qi]) == want]
        best = min(donors, key=lambda s: sum(p != q for p, q in zip(s, sig)))
        src = index[best][0]
        box = (qx * half, qy * half, qx * half + half, qy * half + half)
        out.paste(src.crop(box), box)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tiles")
    ap.add_argument("out")
    ap.add_argument("--tile", type=int, default=32)
    ap.add_argument("--k", type=int, default=2)
    a = ap.parse_args()

    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from wang_paint import build_index

    index, lower, upper = build_index(a.tiles, a.k)
    print(f"terrains: lower {lower}  upper {upper}   {len(index)}/16 signatures present")

    sheet = Image.new("RGBA", (a.tile * 4, a.tile * 4), (0, 0, 0, 0))
    synth = []
    for nw in (0, 1):
        for ne in (0, 1):
            for sw in (0, 1):
                for se in (0, 1):
                    sig = (bool(nw), bool(ne), bool(sw), bool(se))
                    i = sig_to_index(sig)
                    if sig in index:
                        im = index[sig][0]
                    else:
                        im = synthesise(sig, index, a.tile)
                        synth.append(i)
                    sheet.paste(im, ((i % 4) * a.tile, (i // 4) * a.tile))
    sheet.save(a.out)
    print(f"wrote {a.out}  {sheet.width}x{sheet.height}  (4x4 of {a.tile}px)")
    if synth:
        print(f"cells {sorted(synth)} synthesised from quadrants — the diagonals the set omits")
    print("index = TL*8 + TR*4 + BL*2 + BR*1, matching wang_autotile.py")


if __name__ == "__main__":
    main()
