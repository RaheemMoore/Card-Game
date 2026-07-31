#!/usr/bin/env python3
"""
Draw a TRACE GUIDE over an environment plate — the layer Raheem works on top of.

WHY THIS EXISTS. Tracing a plate is the one step in the environment pipeline a
human has to do (see .claude/skills/trace-environment/SKILL.md — three automatic
methods were tried and each failed on pale-stone-against-pale-stone). Telling him
what to trace in chat means holding twenty instructions in his head while he
works. Telling him ON THE PLATE means the instruction sits beside the shape.

It is a script rather than a hand-drawn layer because the tower has eleven
floors, and anything done by hand eleven times gets done inconsistently.

USAGE
  trace_guide.py <plate.png> <spec.json> <out.png>

SPEC
  {
    "title": "Battle Tower — Floor 1",
    "note": "optional line under the title",
    "items": [
      {"kind": "cut|occluder|collider|skip",
       "shape": "ellipse|rect",
       "box": [x0, y0, x1, y1],
       "label": "arch gap 1",
       "note": "cut to transparent"}
    ]
  }

Items are numbered in the order given — that IS the order to work in, so put
the cut-outs before the traces.

KIND DRIVES COLOUR, and the colours are the same three every time so they can be
learned once:
  cut      magenta   remove to transparency
  occluder green     what the player passes behind (trace to the floor contact)
  collider blue      where the player stops
  skip     grey      deliberately NOT traced, with the reason in the note
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

KIND = {
    "cut":      ((214, 51, 168), "CUT"),
    "occluder": ((46, 160, 96), "OCCLUDER"),
    "collider": ((48, 118, 214), "COLLIDER"),
    "skip":     ((130, 138, 154), "SKIP"),
}
WASH = 150          # how far the plate is faded toward white, 0-255
PANEL_W = 430


def font(size, bold=False):
    """Best available system face; falls back to PIL's bitmap font."""
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def badge(draw, x, y, n, colour, r=21):
    """Numbered disc. Drawn last so it always sits above its own outline."""
    draw.ellipse((x - r, y - r, x + r, y + r), fill=colour + (255,), outline=(255, 255, 255, 255), width=3)
    f = font(22, bold=True)
    t = str(n)
    tw = draw.textlength(t, font=f)
    draw.text((x - tw / 2, y - 15), t, font=f, fill=(255, 255, 255, 255))


def main():
    plate_path, spec_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    spec = json.load(open(spec_path))
    items = spec["items"]

    plate = Image.open(plate_path).convert("RGBA")
    W, H = plate.size

    # Fade the art so the marks read on top of it without hiding what to trace.
    wash = Image.new("RGBA", (W, H), (255, 255, 255, WASH))
    base = Image.alpha_composite(plate, wash)

    canvas = Image.new("RGBA", (W + PANEL_W, H), (250, 249, 246, 255))
    canvas.alpha_composite(base, (0, 0))
    d = ImageDraw.Draw(canvas, "RGBA")

    # Big shapes go down first and get NO fill — a filled ring or floor would
    # bury every small mark inside it, which is exactly what the first version
    # of this script did. Only marks small enough to read as a target get tinted.
    area = lambda b: abs(b[2] - b[0]) * abs(b[3] - b[1])
    order = sorted(range(len(items)), key=lambda k: -area(items[k]["box"]))
    FILL_LIMIT = 0.05 * W * H

    for k in order:
        it = items[k]
        colour, _ = KIND[it["kind"]]
        x0, y0, x1, y1 = it["box"]
        tinted = area(it["box"]) < FILL_LIMIT

        # Each mark is composited from its own layer so alpha is honoured
        # exactly; drawing translucent fills straight onto the canvas silently
        # came out opaque.
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer, "RGBA")
        fill = colour + (46,) if tinted else None
        shape = ld.ellipse if it["shape"] == "ellipse" else ld.rectangle
        shape((x0, y0, x1, y1), fill=fill, outline=colour + (255,), width=5)
        canvas.alpha_composite(layer)

    # Badges last, so a number is never hidden under a later mark. Big shapes
    # get their badge on the boundary rather than at a centre they don't occupy.
    for i, it in enumerate(items, 1):
        colour, _ = KIND[it["kind"]]
        x0, y0, x1, y1 = it["box"]
        if area(it["box"]) < FILL_LIMIT:
            bx, by = x0 + (x1 - x0) / 2, y0 + (y1 - y0) / 2
        else:
            bx, by = x0 + (x1 - x0) / 2, y1 - 4     # bottom edge of the ring
        badge(d, bx, by, i, colour)

    # ── side panel: legend, then the numbered worklist in order ──────────
    px = W + 26
    d.text((px, 30), spec.get("title", "Trace guide"), font=font(28, bold=True), fill=(28, 34, 48, 255))
    y = 70
    if spec.get("note"):
        d.text((px, y), spec["note"], font=font(15), fill=(96, 104, 120, 255))
        y += 34

    y += 10
    d.text((px, y), "LEGEND", font=font(13, bold=True), fill=(120, 128, 144, 255))
    y += 26
    for kind, (colour, name) in KIND.items():
        d.rectangle((px, y, px + 26, y + 16), fill=colour + (60,), outline=colour + (255,), width=3)
        d.text((px + 38, y - 1), name, font=font(15, bold=True), fill=colour + (255,))
        y += 28

    y += 18
    d.line((px, y, px + PANEL_W - 52, y), fill=(214, 210, 200, 255), width=1)
    y += 18
    d.text((px, y), "DO THEM IN THIS ORDER", font=font(13, bold=True), fill=(120, 128, 144, 255))
    y += 28

    fl = font(15, bold=True)
    fn = font(14)
    for i, it in enumerate(items, 1):
        colour, _ = KIND[it["kind"]]
        d.ellipse((px, y + 1, px + 20, y + 21), fill=colour + (255,))
        n = str(i)
        d.text((px + 10 - d.textlength(n, font=font(12, bold=True)) / 2, y + 4), n,
               font=font(12, bold=True), fill=(255, 255, 255, 255))
        d.text((px + 30, y), it["label"], font=fl, fill=(28, 34, 48, 255))
        if it.get("note"):
            d.text((px + 30, y + 19), it["note"], font=fn, fill=(110, 118, 134, 255))
            y += 42
        else:
            y += 26

    canvas.convert("RGB").save(out_path)
    print(f"{out_path}  {canvas.size[0]}x{canvas.size[1]}  {len(items)} items")


if __name__ == "__main__":
    main()
