#!/usr/bin/env python3
"""
Finish a generated arena plate deterministically.

WHY THIS EXISTS: ten Leonardo images across four prompt rounds could not remove
the sky from the Still Season's arena. Every variant put a bright band across
the upper middle, because a wide symmetrical exterior wants a horizon and the
HUD needs dark upper corners — those two pull against each other and no amount
of negative prompting settled it ("no sky" asks the model to render an absence
in the highest-attention region of the frame, which is the same losing move as
"chest fully covered" in LEONARDO_PLAYBOOK.md).

It is a FRAMING problem, not a generation problem, so it is solved here — the
same way the dais moved into BossPlatform.tsx and the pixel grid moved into
pixelize.py. Deterministic, free, and re-runnable without re-rolling the look.

Passes, in order:

  1. CROP THE SKY. Detected as the bright warm low-detail band at the top, then
     cut and rescaled to the arena's fixed size. Side effect is exactly what the
     prompt kept failing to produce: the tiers tower and fill the frame.
  2. PUT THE CANOPY BACK. The trees lived in the band step 1 discarded. Their
     foliage is cut out of that band and composited across the top, darkened and
     faded downward. Cut FROM THE PLATE ITSELF, so style match is exact by
     construction — the standing rule for scenery layers.
  3. WARM THE GRADE. Cropping upward loses the warm floor bounce and leaves the
     plate cold blue-grey.
  4. DARKEN THE HUD CORNERS. top-left ~372x196 and top-right ~320px carry
     interface panels and must be dark, low-detail negative space.
  5. DAMP THE BLIGHT TO DORMANT. Boss VFX fire BRIGHT magenta (act_season_root).
     If the plate already glows the same colour, the attack reads as more floor
     instead of as an event. The stain must be matte; the flare is code's job.
  6. FLATTEN THE LOWER THIRD. That band is where the party stands and it must
     stay low contrast or it competes with the fighters.
  7. PIXELIZE via pixelize.py.

Usage: finish_arena.py <in.png> <out.png> [--cut N] [--no-canopy] [--scale 4]
"""
import argparse
import subprocess
import sys
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))


def detect_sky(a):
    """Last row of the bright, warm, top-of-frame band. 0 if there isn't one."""
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    sky = (r > 200) & (g > 150) & (b > 140) & (r >= g) & (g >= b)
    rows = sky.mean(axis=1)
    h = len(rows)
    hits = [y for y in range(h // 2) if rows[y] > 0.12]
    return (max(hits) + 8) if hits else 0


def finish(src, cut=None, canopy=True, out_w=1360, out_h=768):
    a0 = np.asarray(src).astype(int)
    W, H = src.size
    if cut is None:
        cut = detect_sky(a0)
    print(f"  sky band: 0..{cut} ({100*cut/H:.0f}% of height)")

    base = src.crop((0, cut, W, H)).resize((out_w, out_h), Image.LANCZOS).convert("RGBA")

    if canopy and cut > 30:
        band_h = int(out_h * 0.39)
        top = src.crop((0, 0, W, min(H, cut + 40))).resize((out_w, band_h), Image.LANCZOS)
        t = np.asarray(top).astype(int)
        r, g, b = t[:, :, 0], t[:, :, 1], t[:, :, 2]
        # Green mass or dark trunk. Everything else in that band was sky.
        foliage = ((g >= r - 8) & (g >= b - 4) & (g < 190)) | ((r + g + b) < 330)
        am = (
            Image.fromarray((foliage * 255).astype("uint8"))
            .filter(ImageFilter.MedianFilter(5))
            .filter(ImageFilter.GaussianBlur(3))
        )
        alpha = np.asarray(am).astype(float) / 255.0
        fade = np.clip(np.linspace(1.15, 0.0, band_h), 0, 1)[:, None]
        layer = np.dstack([t * 0.55, alpha * fade * 255]).astype("uint8")
        base.alpha_composite(Image.fromarray(layer, "RGBA"))
        print(f"  canopy relaid: {100*foliage.mean():.0f}% of the discarded band was foliage")

    out = np.asarray(base.convert("RGB")).astype(float)

    # 3 — mild warm correction ONLY. Stone stays the colour of stone.
    #
    # A green "moss grade" was tried here and REJECTED by Raheem, and the reason
    # is worth keeping because it is a general rule:
    #
    #   "Making the stone the colour of moss doesn't make the environment more
    #    nature-like. That would be including more plants or more overgrowth —
    #    actually changing the image, not just tinting the stones."
    #
    # He is right. Tinting stone green yields green stone, not a living place.
    # Nature has to arrive as CONTENT — plants, roots, drape, things growing —
    # which is what the `growth` dressing layer is for. A colour grade cannot
    # add a subject, and reaching for one to fake atmosphere is the same mistake
    # as negating an absence in a prompt: it addresses the symptom.
    #
    # So this only undoes the coldness the sky-crop introduces by discarding the
    # warm upper bounce. Nothing more.
    out[:, :, 0] *= 1.04
    out[:, :, 1] *= 1.00
    out[:, :, 2] *= 0.93

    # 4 — HUD corners
    hh, ww = out.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww]
    cl = np.clip(1 - ((xx / 420.0) ** 2 + (yy / 300.0) ** 2), 0, 1)
    cr = np.clip(1 - (((ww - xx) / 380.0) ** 2 + (yy / 300.0) ** 2), 0, 1)
    out *= (1 - 0.55 * np.maximum(cl, cr))[:, :, None]

    # 5 — blight to dormant
    n = np.clip(out, 0, 255) / 255.0
    r, g, b = n[:, :, 0], n[:, :, 1], n[:, :, 2]
    mx, mn = n.max(2), n.min(2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    mag = (r > g + 0.10) & (b > g + 0.03) & (s > 0.22)
    grey = 0.35 * r + 0.45 * g + 0.20 * b
    for i in range(3):
        ch = n[:, :, i]
        ch[mag] = (ch[mag] * 0.42 + grey[mag] * 0.58) * 0.70
        n[:, :, i] = ch
    print(f"  blight damped over {100*mag.mean():.1f}% of the plate")

    # 6 — flatten the lower third toward its own mean
    lo = int(hh * 0.66)
    band = n[lo:]
    n[lo:] = band * 0.72 + band.mean(axis=(0, 1)) * 0.28

    return Image.fromarray((np.clip(n, 0, 1) * 255).astype("uint8"))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--cut", type=int, default=None)
    ap.add_argument("--no-canopy", action="store_true")
    ap.add_argument("--scale", type=int, default=4)
    ap.add_argument("--colors", type=int, default=64)
    args = ap.parse_args()

    print(f"finishing {args.src}")
    img = finish(Image.open(args.src).convert("RGB"), cut=args.cut, canopy=not args.no_canopy)
    tmp = args.dst + ".graded.png"
    img.save(tmp)
    subprocess.run(
        [sys.executable, os.path.join(HERE, "pixelize.py"), tmp, args.dst,
         "--scale", str(args.scale), "--colors", str(args.colors)],
        check=True,
    )
    os.remove(tmp)
    print(f"done -> {args.dst}")
