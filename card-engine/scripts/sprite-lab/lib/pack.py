#!/usr/bin/env python3
"""
Pack character frames into one uniform sprite sheet for Phaser.

Layout: 4 rows (screen directions) x N columns.
  column 0     = idle / standing frame
  columns 1..  = walk cycle
  row 0 = down, row 1 = up, row 2 = left, row 3 = right
Phaser frame index = row * columns + column.

THREE RULES, each learned from a defect that reached the game:

1. SCREEN DIRECTIONS, and this generator's labels are counter-intuitive.
   `east` renders facing screen RIGHT, `west` facing screen LEFT. An earlier
   version had these swapped and the hero walked backwards. Static analysis got
   this wrong twice — in opposite directions — so the only accepted proof is
   walking him in the game.

2. NEVER MIX SOURCES. The idle frame must come from the same animation as the
   walk frames. Taking idle from a *rotation* and walking from an *animation*
   produced a 33% size jump between standing and walking, because the two
   endpoints don't agree on body scale.

3. NORMALIZE ON THE FEET. Every frame is scaled to a shared body height and
   pasted so the feet land on one ground line. Without this the hero shrank 25%
   walking left and his ground line moved 12% of his height. With `pro`-mode
   generation the corrections are near 1.0 and this is just insurance.

Usage: pack.py <frames_dir> <out_png> <out_json> [--source rotations-idle]
"""
import json
import os
import sys
from PIL import Image
import numpy as np

MARGIN = 3  # transparent px around the normalized body inside each cell


def alpha_box(im):
    return im.getbbox()


def body_metrics(im):
    """Body height and the horizontal centre of the FEET (bottom 15%).

    Feet are a far more stable horizontal anchor than the bounding-box centre:
    arms and a swinging leg move the bbox sideways every frame, which would
    make the character slide within his own cell.
    """
    a = np.array(im)[..., 3] > 32
    ys, xs = np.nonzero(a)
    if len(ys) == 0:
        return None
    top, bottom = ys.min(), ys.max()
    height = bottom - top + 1
    foot_band = a[max(bottom - max(1, int(height * 0.15)), 0):bottom + 1, :]
    fy, fx = np.nonzero(foot_band)
    centre = float(fx.mean()) if len(fx) else float(xs.mean())
    return {"top": int(top), "bottom": int(bottom), "height": int(height), "foot_x": centre}


def build_plan(d, prefer=None):
    """(screen direction, [frame paths]) — idle is element 0, taken from the
    same animation as the walk so scale can't disagree.

    Frames are DISCOVERED, not hardcoded: template mode returns 6 per direction,
    v3 returns frame_count + 1, and pro returned 4 despite being asked for 6.
    Hardcoding counts made the packer fail on its own generator's output.
    """
    import glob
    import re

    # 'walk-front' is the v3 pass whose frame 00 is a pinned standing pose — the
    # ideal idle — so prefer it for the front-facing row when it exists.
    prefer = prefer or ["walk-front", "walk"]

    def frames_for(direction):
        by_anim = {}
        for p in glob.glob(os.path.join(d, f"anim-*-{direction}-*.png")):
            m = re.match(rf"anim-(.+)-{direction}-(\d+)\.png$", os.path.basename(p))
            if m:
                by_anim.setdefault(m.group(1), []).append((int(m.group(2)), p))
        if not by_anim:
            return None
        for name in prefer:
            if name in by_anim:
                chosen = by_anim[name]
                break
        else:
            chosen = by_anim[sorted(by_anim)[0]]
        return [p for _, p in sorted(chosen)]

    # east -> screen RIGHT, west -> screen LEFT. See rule 1.
    plan = [
        ("down", frames_for("south")),
        ("up", frames_for("north")),
        ("left", frames_for("west")),
        ("right", frames_for("east")),
    ]
    missing = [n for n, f in plan if not f]
    if missing:
        raise SystemExit(f"no frames found for direction(s): {missing}")
    return plan


def main(frames_dir, out_png, out_json):
    plan = build_plan(frames_dir)

    # Uniform column count: trim every row to the shortest so the grid is
    # rectangular (Phaser needs a fixed frame size and stride).
    cols = min(len(files) for _, files in plan)
    plan = [(name, files[:cols]) for name, files in plan]

    loaded = []
    for name, files in plan:
        row = []
        for p in files:
            im = Image.open(p).convert("RGBA")
            box = alpha_box(im)
            if box is None:
                raise SystemExit(f"empty frame: {p}")
            im = im.crop(box)
            m = body_metrics(im)
            row.append((im, m))
        loaded.append((name, row))

    # One shared target body height for the whole character.
    target = float(np.median([m["height"] for _, row in loaded for _, m in row]))

    scaled = []
    for name, row in loaded:
        out_row = []
        for im, m in row:
            s = target / m["height"]
            w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
            out_row.append((im.resize((w, h), Image.NEAREST), m["foot_x"] * s))
        scaled.append((name, out_row))

    fw = max(im.width for _, row in scaled for im, _ in row) + MARGIN * 2
    fh = max(im.height for _, row in scaled for im, _ in row) + MARGIN * 2
    baseline_y = fh - MARGIN  # every character's feet land here

    sheet = Image.new("RGBA", (fw * cols, fh * len(scaled)), (0, 0, 0, 0))
    rows_meta = []
    for r, (name, row) in enumerate(scaled):
        for c, (im, foot_x) in enumerate(row):
            # Feet on the shared ground line; centred on the feet, not the bbox.
            x = r * 0 + c * fw + round(fw / 2 - foot_x)
            y = r * fh + (baseline_y - im.height)
            sheet.paste(im, (x, y))
        rows_meta.append({
            "direction": name,
            "idle": r * cols,
            "walk": [r * cols + c for c in range(1, cols)],
        })

    sheet.save(out_png)
    meta = {
        "image": os.path.basename(out_png),
        "frameWidth": fw,
        "frameHeight": fh,
        "columns": cols,
        "rows": rows_meta,
        "baselineY": baseline_y,
        "targetBodyHeight": round(target),
        "note": (
            "Frame index = row * columns + column. Every frame is normalized to one body "
            "height and aligned on a shared feet baseline; idle comes from the same animation "
            "as the walk so the two cannot disagree on scale. east=screen right, west=screen left."
        ),
    }
    with open(out_json, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"{out_png}  {sheet.size[0]}x{sheet.size[1]}  frame {fw}x{fh}  cols {cols}  body {round(target)}px")
    print(f"{out_json}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
