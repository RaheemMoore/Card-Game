#!/usr/bin/env python3
"""
Forge-plume processing — the LOCKED recipe (approved by Raheem, 2026-07-25).

A plume is generated in Leonardo as billowing smoke on a PURE BLACK background
(a narrow bright base rising into a dense element-colored cloud). This turns it
into a composited, anvil-seated, transparent PNG for the `plume` layer.

RULES (do not violate — see memory project_forge_dynamic_backgrounds):
  * NEVER change the smoke shape/texture. Per element, RECOLOR the SAME smoke
    (crimson=True maps luminance -> blood-red). Do not swap in crystals/bats/etc.
  * White fog pooled at the base (~y706) makes the plume read as sitting on the
    anvil top and fixes the plume->anvil connection. Do NOT paint fire on metal.
  * Feather the alpha + dissolve the lower-outer smoke so edges never look
    pasted-on against the background.

Usage: process_plume.py <in.png> <out.png> [--crimson] [--moon] [--blur N]
"""
import sys
from PIL import Image, ImageFilter

W, H = 768, 1024
FLOOR, OPAQUE = 14, 58
FADE_START, FADE_END = 905, 975     # fade the flame base off the metal
SEAT_Y = 690                        # base seated at the anvil top
FOG_CY = 706                        # white fog pool centre (on the anvil top)


def add_fog(canvas, cx=384, cy=FOG_CY, rx=155, ry=46):
    fog = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fp = fog.load()
    for y in range(max(0, cy - ry - 45), min(H, cy + ry + 45)):
        for x in range(max(0, cx - rx - 45), min(W, cx + rx + 45)):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d >= 1:
                continue
            a = ((1 - d) ** 1.5) * 0.60
            fp[x, y] = (246, 242, 236, int(a * 255))
    return Image.alpha_composite(canvas, fog.filter(ImageFilter.GaussianBlur(9)))


def add_moon(smoke, mx=384, my=150, rad=92):
    base = Image.new('RGBA', (W, H), (0, 0, 0, 0)); bp = base.load()
    for y in range(my - rad - 22, my + rad + 22):
        for x in range(mx - rad - 22, mx + rad + 22):
            if 0 <= x < W and 0 <= y < H:
                d = ((x - mx) ** 2 + (y - my) ** 2) ** 0.5
                if d <= rad:
                    bp[x, y] = (max(0, int(215 - 95 * d / rad)), max(0, int(70 - 45 * d / rad)),
                                max(0, int(62 - 40 * d / rad)), 255)
                elif d <= rad + 20:
                    bp[x, y] = (190, 45, 45, int(130 * (1 - (d - rad) / 20)))
    base.alpha_composite(smoke)
    return base


def process(inf, outf, crimson=False, moon=False, blur=6):
    src = Image.open(inf).convert('RGB').resize((W, H), Image.LANCZOS); sp = src.load()
    tmp = Image.new('RGBA', (W, H), (0, 0, 0, 0)); tp = tmp.load()
    for y in range(H):
        vf = 1.0 if y <= FADE_START else (0.0 if y >= FADE_END else (FADE_END - y) / (FADE_END - FADE_START))
        if vf <= 0:
            continue
        for x in range(W):
            r, g, b = sp[x, y]; Lm = max(r, g, b)
            if Lm <= FLOOR:
                continue
            av = min(1.0, (Lm - FLOOR) / (OPAQUE - FLOOR))
            if crimson:                       # recolor the SAME smoke to blood-red
                R, G, B = min(255, int(Lm)), min(255, int(Lm * 0.10)), min(255, int(Lm * 0.16))
            else:
                R, G, B = min(255, int(r * 1.12)), min(255, int(g * 1.12)), min(255, int(b * 1.12))
            tp[x, y] = (R, G, B, int(av * vf * 255))
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(tmp, (0, SEAT_Y - FADE_END))
    r, g, b, a = canvas.split(); a = a.filter(ImageFilter.GaussianBlur(blur)); ap = a.load()
    for y in range(H):                         # dissolve lower-outer smoke into the bg
        if y < 450:
            continue
        ty = min(1.0, (y - 450) / 210.0)
        for x in range(W):
            v = ap[x, y]
            if v == 0:
                continue
            tx = min(1.0, max(0.0, (abs(x - 384) - 110) / (384 - 110)))
            ap[x, y] = int(v * (1 - 0.85 * ty * tx))
    smoke = Image.merge('RGBA', (r, g, b, a))
    if moon:
        smoke = add_moon(smoke)
    smoke = add_fog(smoke)
    smoke.save(outf)


if __name__ == '__main__':
    args = sys.argv[1:]
    inf, outf = args[0], args[1]
    process(inf, outf,
            crimson='--crimson' in args, moon='--moon' in args,
            blur=int(args[args.index('--blur') + 1]) if '--blur' in args else 6)
    print('wrote', outf)
