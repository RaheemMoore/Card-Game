#!/usr/bin/env python3
"""POST /image-to-pixelart — the Leonardo-to-PixelLab redraw, finally scripted.

CLAUDE.md documents this pipeline but nothing implemented it: the forge and the
archivist were both done by hand inline on 2026-08-07, and the commit that
shipped them added no library code. A castle kit is seven calls, so it needs to
be repeatable.

THE CONSTRAINT THAT SHAPES EVERYTHING, read live from the API rather than from
PIXELLAB_PLAYBOOK.md: output is capped at 320 in width AND height,
independently; input at 1280 each. So a tall piece cannot be sent whole — a
229x564 tower has to fit 564 into 320 and comes back 130x320, a tiny tower. Tall
pieces are BANDED instead: several calls down the piece, each within the cap,
stacked afterwards. The castle kit already works this way — tower-cap-v2
(288x224) and tower-base-v2 (288x192) stack.

SCALE IS GLOBAL, NOT PER-PIECE. Every piece is scaled by one shared factor so
their relative proportions survive, with a per-piece multiplier for plates that
were framed at a different internal scale (the castle towers need x2.6 to put
their doors in the same world as the walls' doors). Sizing each piece to fill
320 independently would silently destroy that.

    python lib/image_to_pixelart.py <in.png> <out.png> --scale 0.3125 [--bands N]
                                    [--band-lines Y1,Y2] [--dry-run]

--dry-run prints the plan and the generation count without spending anything.
Every call is one generation, about a cent.
"""
import argparse
import base64
import io
import json
import os
import sys
import urllib.request

import numpy as np
from PIL import Image

API = "https://api.pixellab.ai/v2/image-to-pixelart"
MAX_OUT = 320
MAX_IN = 1280


def load_key():
    env = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env.local")
    env = os.path.normpath(env)
    with open(env, encoding="utf-8") as f:
        for line in f:
            if line.startswith("PIXELLAB_API_KEY="):
                return line.split("=", 1)[1].strip().strip("\"'")
    raise SystemExit(f"PIXELLAB_API_KEY not found in {env}")


def subject_bbox(im):
    """Trim to the artwork. White margin wastes the 320 budget on nothing."""
    a = np.asarray(im.convert("RGBA"))
    if a[:, :, 3].min() < 255:
        m = a[:, :, 3] > 8
    else:
        m = a[:, :, :3].min(2) < 246
    ys, xs = np.where(m)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def flatten(img):
    """Composite onto white. Never hand the API a bare RGBA->RGB conversion.

    Dropping the alpha channel does not remove what was behind it: our cutouts
    keep the original pixels under alpha=0, so a tower cut out of a landscape
    still carries the grass. The first run did exactly this and PixelLab redrew
    the field along with the tower, and let the green pull the stone toward
    blue-teal. Flattening onto white is what the plate is supposed to be, and
    matches what the walls and gate already are.
    """
    if img.mode != "RGBA":
        return img.convert("RGB")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, (0, 0), img)
    return bg


def call(img, out_w, out_h, key, seed=None):
    buf = io.BytesIO()
    flatten(img).save(buf, "PNG")
    body = {
        "image": {"type": "base64", "base64": base64.b64encode(buf.getvalue()).decode(), "format": "png"},
        "image_size": {"width": img.width, "height": img.height},
        "output_size": {"width": out_w, "height": out_h},
    }
    if seed is not None:
        body["seed"] = seed
    req = urllib.request.Request(
        API, data=json.dumps(body).encode(),
        headers={"authorization": f"Bearer {key}", "content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.loads(r.read())
    png = base64.b64decode(res["image"]["base64"])
    usage = res.get("usage")
    return Image.open(io.BytesIO(png)).convert("RGB"), usage


def plan(im, scale, bands, band_lines):
    box = subject_bbox(im)
    sub = im.crop(box)
    tw, th = round(sub.width * scale), round(sub.height * scale)
    if band_lines:
        cuts = [0] + list(band_lines) + [sub.height]
    else:
        if bands is None:
            bands = max(1, -(-th // MAX_OUT))
        cuts = [round(sub.height * i / bands) for i in range(bands + 1)]
    rows = []
    for i in range(len(cuts) - 1):
        y0, y1 = cuts[i], cuts[i + 1]
        oh = round((y1 - y0) * scale)
        rows.append((y0, y1, tw, oh))
    return sub, tw, th, rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--scale", type=float, required=True,
                    help="shared world scale; the SAME value across a kit, times any per-piece multiplier")
    ap.add_argument("--bands", type=int, help="force a band count (default: fewest that fit the 320 cap)")
    ap.add_argument("--band-lines", help="explicit source rows to split at, comma separated — use these to "
                                         "land seams on cornices instead of arbitrary thirds")
    # Bands are independent calls, so without a fixed seed each one interprets
    # the style afresh and the stack shows a step at every seam. One seed for
    # the whole piece keeps them in agreement.
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    lines = [int(x) for x in a.band_lines.split(",")] if a.band_lines else None
    im = Image.open(a.src)
    sub, tw, th, rows = plan(im, a.scale, a.bands, lines)

    print(f"{os.path.basename(a.src)}  subject {sub.width}x{sub.height} -> {tw}x{th}  "
          f"{len(rows)} band(s), {len(rows)} generation(s)")
    for i, (y0, y1, ow, oh) in enumerate(rows):
        flag = "" if (ow <= MAX_OUT and oh <= MAX_OUT) else "   *** OVER 320 CAP ***"
        print(f"   band {i}: src rows {y0}-{y1} -> {ow}x{oh}{flag}")
    if any(ow > MAX_OUT or oh > MAX_OUT for _, _, ow, oh in rows):
        raise SystemExit("a band exceeds the 320 cap — raise --bands or lower --scale")
    if a.dry_run:
        return

    key = load_key()
    parts, spent = [], []
    for i, (y0, y1, ow, oh) in enumerate(rows):
        crop = flatten(sub.crop((0, y0, sub.width, y1)))
        if crop.width > MAX_IN or crop.height > MAX_IN:
            k = MAX_IN / max(crop.width, crop.height)
            crop = crop.resize((int(crop.width * k), int(crop.height * k)), Image.LANCZOS)
        print(f"   -> band {i} ({ow}x{oh}) …", flush=True)
        img, usage = call(crop, ow, oh, key, a.seed)
        parts.append(img)
        spent.append(usage)

    out = Image.new("RGB", (tw, sum(p.height for p in parts)), (255, 255, 255))
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height
    out.save(a.dst)
    print(f"   wrote {a.dst}  {out.width}x{out.height}   usage {spent}")


if __name__ == "__main__":
    main()
