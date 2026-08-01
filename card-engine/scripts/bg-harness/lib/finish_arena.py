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


def finish(
    src,
    cut=None,
    canopy=True,
    out_w=1360,
    out_h=768,
    top_vignette=0.0,
    top_vignette_reach=0.45,
    damp_ramp=False,
    damp_from=0.55,
    knockdowns=(),
):
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

    # 4 — HUD corners, PLUS a full-width top vignette.
    #
    # THE CORNER PASS IS A LANDSCAPE-ONLY CONTRACT AND THAT IS NOT ENOUGH.
    # The two ellipses below are centred on the top-left and top-right HUD
    # panels and contribute exactly NOTHING at x = 0.5. On desktop that is
    # correct — the centre is not a HUD zone. On iPhone portrait it is a bug:
    # the plate is cover-scaled to fill height, so only the middle ~26% of its
    # width is visible, the framing art at the edges is discarded, and whatever
    # sits at top-CENTRE becomes the top of the player's screen.
    #
    # Measured on the Still Season plate: desktop corners pass comfortably
    # (mean L 38.8 / 24.7) while the portrait band reads mean L 144, p95 207.
    # It would have shipped looking fine on the machine it was checked on.
    #
    # The vignette darkens rather than crops, so shafts and canopy silhouettes
    # survive as readable shape instead of being deleted.
    hh, ww = out.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww]
    if top_vignette > 0:
        # REACH MATTERS MORE THAN STRENGTH. A first version faded out by
        # y = 0.24h, which is inside the band being measured (0–0.23h), so the
        # bottom of that band got almost nothing: sweeping strength from 0.42 to
        # 0.82 moved p95 by nine points. The falloff has to extend past whatever
        # you are trying to darken, or you are only darkening its top edge.
        band = np.clip(1 - yy / (top_vignette_reach * hh), 0, 1) ** 1.15
        out *= (1 - top_vignette * band)[:, :, None]
    cl = np.clip(1 - ((xx / 420.0) ** 2 + (yy / 300.0) ** 2), 0, 1)
    cr = np.clip(1 - (((ww - xx) / 380.0) ** 2 + (yy / 300.0) ** 2), 0, 1)
    out *= (1 - 0.55 * np.maximum(cl, cr))[:, :, None]

    # 4b — knock down a too-bright feature that sits where a code layer goes.
    #
    # Not a general beautification pass: it exists because the Still Season's
    # plate has a LIT GREEN GATE at x 0.42–0.55, y 0.33–0.56, and the boss's
    # code-drawn rune halo occupies almost exactly that box in almost exactly
    # that green. Left alone the halo dissolves into the architecture and the
    # `act_season_hold` telegraph goes with it. Darkened, the gate reads as
    # unlit stone and the halo is the only lit green at head height.
    # FEATHERED, and that is not a nicety. A raw box multiply put a hard-edged
    # dark RECTANGLE in the middle of the plate — instantly readable as a bug,
    # because nothing in a painting has a straight vertical edge in mid-air.
    # A radial falloff reads as the light simply not reaching that spot.
    for (x0, y0, x1, y1, amount) in knockdowns:
        cx, cy = (x0 + x1) / 2 * ww, (y0 + y1) / 2 * hh
        rx, ry = max((x1 - x0) / 2 * ww, 1), max((y1 - y0) / 2 * hh, 1)
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        # smoothstep from the centre out to the box edge, 0 beyond it
        t = np.clip(1 - d, 0, 1)
        out *= (1 - amount * (t * t * (3 - 2 * t)))[:, :, None]

    # 5 — blight to dormant
    n = np.clip(out, 0, 255) / 255.0
    r, g, b = n[:, :, 0], n[:, :, 1], n[:, :, 2]
    mx, mn = n.max(2), n.min(2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    mag = (r > g + 0.10) & (b > g + 0.03) & (s > 0.22)
    grey = 0.35 * r + 0.45 * g + 0.20 * b

    # RAMPED BY HEIGHT, not flat — and this is the difference between damping a
    # stain and deleting the art.
    #
    # A flat damp made sense when the only magenta in the plate was a blight
    # stain that had to stay dull so the attack VFX could read against it. It is
    # actively wrong on a plate whose flowers ARE the greenery: the standing rule
    # here is "a colour grade cannot add a subject", and stripping painted
    # flowers back out is that same rule running in reverse.
    #
    # The real conflict is not brightness — on the Still Season plate the
    # magenta peaks at L 133 against the VFX's ~137, and there is already 25° of
    # hue separation (295° vs 320°). It is QUANTITY IN ONE BAND: 15.2% coverage
    # in the floor third, which is exactly where BossFlowerBed blooms. So damp
    # the floor and leave the tiers alone.
    w = np.clip((yy / hh - damp_from) / 0.25, 0, 1) if damp_ramp else np.ones_like(r)
    for i in range(3):
        ch = n[:, :, i]
        # 0.35/0.22 in ramped mode, NOT the flat mode's 0.58/0.30. Reusing the
        # flat numbers and merely ramping them took the floor's magenta from
        # 16.4% to 0.3% — elimination, not damping, which is the failure this
        # whole ramp exists to avoid. Damping means "a third of its chroma".
        mix = 0.35 * w if damp_ramp else np.full_like(w, 0.58)
        cut = 0.22 * w if damp_ramp else np.full_like(w, 0.30)
        ch = np.where(mag, (ch * (1 - mix) + grey * mix) * (1 - cut), ch)
        n[:, :, i] = ch
    if mag.any():
        lo = mag & (yy / hh >= damp_from)
        print(
            f"  blight mask {100*mag.mean():.1f}% of plate "
            f"({100*lo.mean():.1f}% below y={damp_from}) — "
            + ("ramped by height" if damp_ramp else "damped flat")
        )

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
    ap.add_argument(
        "--top-vignette",
        type=float,
        default=0.0,
        help="0-1. Full-width darkening of the top band. REQUIRED on any plate "
        "with a bright top-centre: the corner pass does nothing at x=0.5, and "
        "iPhone portrait crops to the centre. Try 0.42.",
    )
    ap.add_argument("--top-vignette-reach", type=float, default=0.45,
                    help="How far down the frame the vignette fades out, as a fraction of "
                         "height. Must extend PAST the region you are darkening.")
    ap.add_argument(
        "--damp-ramp",
        action="store_true",
        help="Ramp the magenta damp by height instead of applying it flat. Use "
        "whenever the plate's pink is painted CONTENT (flowers) rather than a "
        "stain — a flat damp deletes it.",
    )
    ap.add_argument("--damp-from", type=float, default=0.55)
    ap.add_argument(
        "--knockdown",
        action="append",
        default=[],
        metavar="x0,y0,x1,y1,amount",
        help="Darken a normalised box. For a bright plate feature sitting where "
        "a code layer has to be legible.",
    )
    args = ap.parse_args()

    kd = [tuple(float(v) for v in k.split(",")) for k in args.knockdown]
    print(f"finishing {args.src}")
    img = finish(
        Image.open(args.src).convert("RGB"),
        cut=args.cut,
        canopy=not args.no_canopy,
        top_vignette=args.top_vignette,
        top_vignette_reach=args.top_vignette_reach,
        damp_ramp=args.damp_ramp,
        damp_from=args.damp_from,
        knockdowns=kd,
    )
    tmp = args.dst + ".graded.png"
    img.save(tmp)
    subprocess.run(
        [sys.executable, os.path.join(HERE, "pixelize.py"), tmp, args.dst,
         "--scale", str(args.scale), "--colors", str(args.colors)],
        check=True,
    )
    os.remove(tmp)
    print(f"done -> {args.dst}")
