#!/usr/bin/env python3
"""
Lift a sprite into the plate's daylight WITHOUT dulling it.

MEASURED PROBLEM. Body tones (outline excluded) against the painting's own props:

    plate sunlit paving   175      hero        73
    plate crates          141      dwarf       90
    plate barrel          110      archivist   91
                                   horse       84

Saturation was never the issue — the sprites sit at 0.31-0.61 against the plate's
0.35-0.53. They are simply DARKER than everything the painting contains. So this
raises value and leaves colour alone. Raheem, on an earlier attempt to match the
scene: "we want the characters to pop. Maybe blend his colours to match the game
but do not dull the character."

MULTIPLY, NEVER ADD. The first version of this added light to all three channels
on a sine curve. It hit the target exposure and gutted the colour — the hero went
from saturation 0.53 to 0.17, the dwarf 0.31 to 0.19. Obvious in hindsight:
saturation is (max-min)/max, so adding a constant raises the minimum as much as
the maximum and washes every pixel toward grey. Only the verdict line below
caught it.

Scaling all three channels by the same factor leaves (max-min)/max untouched, so
hue and saturation survive exactly. The factor is capped per pixel at
255/max(R,G,B) so nothing can clip — already-bright pixels simply lift less,
which is the right behaviour anyway. Black stays black, so the pixel-art outline
(15-64% of these sprites) keeps its bite instead of turning grey.

`amount` is solved per sprite against a target mean, so every character arrives
at the same exposure rather than each being nudged by eye.

Usage:
  relight.py <in.png> <out.png> [--target 115] [--warmth 0.06]
"""
import sys
import numpy as np
from PIL import Image

OUTLINE_MAX = 45          # below this is outline, not body — excluded from stats
WARM = np.array([1.0, 0.86, 0.55])   # sampled from the plate's sunlit paving


def body_stats(rgb, opaque):
    px = rgb[opaque]
    lum = px.mean(1)
    body = lum > OUTLINE_MAX
    if body.sum() == 0:
        return 0.0, 0.0, 0.0
    b = px[body]
    lum = b.mean(1)
    mx, mn = b.max(1), b.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    return lum.mean(), sat.mean(), lum.std()


def lift(rgb, gain, warmth):
    """Scale every channel of a pixel by one factor, so saturation is untouched.

    The factor is capped so the brightest channel lands exactly on 255 — no
    clipping, and highlights roll off on their own instead of flattening.
    """
    peak = rgb.max(2, keepdims=True)
    headroom = np.where(peak > 0, 255.0 / np.maximum(peak, 1), gain)
    scale = np.minimum(gain, headroom)
    out = rgb * scale
    # Warmth as a mild per-channel MULTIPLIER, again to avoid washing colour out.
    tint = 1.0 + warmth * (WARM.reshape(1, 1, 3) / WARM.mean() - 1.0)
    return np.clip(out * tint, 0, 255)


def main(src, dst, target=115.0, warmth=0.06, fixed_gain=None):
    im = Image.open(src).convert('RGBA')
    a = np.array(im).astype(float)
    rgb, alpha = a[..., :3], a[..., 3]
    opaque = alpha > 200
    if not opaque.any():
        raise SystemExit(f'{src}: no opaque pixels')

    before = body_stats(rgb, opaque)
    colours = len({tuple(p) for p in rgb[opaque].astype(int)})

    if fixed_gain is not None:
        # ONE GAIN FOR THE WHOLE CAST — the right default.
        #
        # Solving a gain per sprite so they all land on the same mean flattens
        # the cast: it demanded 2.97x for the hero (dark skin, dark clothes,
        # black hair) against 1.49x for the archivist, and at that gain enough
        # pixels hit the no-clip cap to cost him saturation. Characters in a
        # painting are not all the same brightness. Lift everyone by the same
        # amount and their differences survive.
        amount = fixed_gain
    else:
        lo, hi = 1.0, 6.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if body_stats(lift(rgb, mid, warmth), opaque)[0] < target:
                lo = mid
            else:
                hi = mid
        amount = (lo + hi) / 2

    out = a.copy()
    out[..., :3] = lift(rgb, amount, warmth)
    after = body_stats(out[..., :3], opaque)

    img = Image.fromarray(out.astype(np.uint8), 'RGBA')
    # Back to a disciplined palette — a lift introduces in-between tones.
    q = img.convert('RGB').quantize(colors=min(255, max(8, colours)),
                                    method=Image.MEDIANCUT).convert('RGB')
    final = Image.fromarray(np.dstack([np.array(q), alpha.astype(np.uint8)]), 'RGBA')
    final.save(dst)

    print(f'{src.split("/")[-1]:26} amount {amount:.3f}')
    print(f'{"":26}   body lum {before[0]:6.1f} -> {after[0]:6.1f}   (target {target:.0f})')
    print(f'{"":26}   sat      {before[1]:6.2f} -> {after[1]:6.2f}   '
          f'{"kept" if after[1] >= before[1] - 0.02 else "*** DULLED ***"}')
    print(f'{"":26}   contrast {before[2]:6.1f} -> {after[2]:6.1f}   '
          f'{"kept" if after[2] >= before[2] * 0.9 else "*** FLATTENED ***"}')


if __name__ == '__main__':
    args = sys.argv[1:]
    kw = {}
    for flag, key, cast in (('--target', 'target', float), ('--warmth', 'warmth', float),
                            ('--gain', 'fixed_gain', float)):
        if flag in args:
            i = args.index(flag)
            kw[key] = cast(args[i + 1])
            del args[i:i + 2]
    main(args[0], args[1], **kw)
