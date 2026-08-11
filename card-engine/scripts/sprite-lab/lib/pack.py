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

Usage: pack.py <frames_dir> <out_png> <out_json> [--prefer animation-name] [--anchor feet|bbox]
"""
import json
import os
import sys
import argparse
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
    return {
        "top": int(top),
        "bottom": int(bottom),
        "height": int(height),
        "width": int(xs.max() - xs.min() + 1),
        "foot_x": centre,
    }


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


def main(frames_dir, out_png, out_json, prefer=None, anchor="feet", measure="height"):
    plan = build_plan(frames_dir, [prefer] if prefer else None)

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

    # WHICH MEASUREMENT STAYS CONSTANT AS THE BODY TURNS?
    #
    # For a quadruped it is height: a fox seen from any facing is about as tall on
    # screen, so scaling every frame to one height keeps it the same animal.
    #
    # For a FISH it is not. Its long axis rotates with it, so its height is its
    # length when it swims north and its depth when it swims east — normalising on
    # height made the vertical frames 40% the size of the horizontal ones, which is
    # the very "hero shrank walking left" defect rule 3 exists to prevent, caused by
    # the fix rather than solved by it. `longest` measures the body's longest side,
    # which a rotation does not change.
    key = "height" if measure == "height" else None
    if key:
        target = float(np.median([m["height"] for _, row in loaded for _, m in row]))
        size_of = lambda m: m["height"]
    else:
        target = float(np.median([max(m["height"], m["width"]) for _, row in loaded for _, m in row]))
        size_of = lambda m: max(m["height"], m["width"])

    scaled = []
    for name, row in loaded:
        out_row = []
        for im, m in row:
            s = target / size_of(m)
            w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
            resized = im.resize((w, h), Image.NEAREST)
            anchor_x = m["foot_x"] * s if anchor == "feet" else resized.width / 2
            out_row.append((resized, anchor_x))
        scaled.append((name, out_row))

    # Measure the furthest left/right pixels AFTER applying the chosen anchor.
    # A simple max(image.width) is unsafe for quadrupeds: centring a long body
    # on its feet can push its nose or tail into the neighbouring Phaser cell.
    left_extent = min(-anchor_x for _, row in scaled for im, anchor_x in row)
    right_extent = max(im.width - anchor_x for _, row in scaled for im, anchor_x in row)
    content_width = int(np.ceil(right_extent - left_extent))
    fw = content_width + MARGIN * 2
    fh = max(im.height for _, row in scaled for im, _ in row) + MARGIN * 2
    baseline_y = fh - MARGIN  # every character's feet land here

    sheet = Image.new("RGBA", (fw * cols, fh * len(scaled)), (0, 0, 0, 0))
    rows_meta = []
    for r, (name, row) in enumerate(scaled):
        for c, (im, anchor_x) in enumerate(row):
            # Every frame uses the same measured anchor space, so even a long
            # nose or tail stays inside its own cell with transparent padding.
            x = c * fw + MARGIN + round(-left_extent - anchor_x)
            y = r * fh + (baseline_y - im.height)
            sheet.paste(im, (x, y))
        rows_meta.append({
            "direction": name,
            "idle": r * cols,
            "walk": [r * cols + c for c in range(1, cols)],
        })

    # Fail before saving if any opaque pixel touches a cell edge. Phaser may
    # sample that edge while scaling, and the neighbouring frame will bleed in.
    alpha = np.array(sheet)[..., 3]
    for r in range(len(scaled)):
        for c in range(cols):
            cell = alpha[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw]
            if np.any(cell[:, 0]) or np.any(cell[:, -1]) or np.any(cell[0, :]) or np.any(cell[-1, :]):
                raise SystemExit(f"opaque pixel touches cell edge at row {r}, column {c}")

    sheet.save(out_png)
    meta = {
        "image": os.path.basename(out_png),
        "frameWidth": fw,
        "frameHeight": fh,
        "columns": cols,
        "rows": rows_meta,
        "baselineY": baseline_y,
        "targetBodyHeight": round(target),
        "anchor": anchor,
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("frames_dir")
    parser.add_argument("out_png")
    parser.add_argument("out_json")
    parser.add_argument("--prefer", help="exact animation name to pack")
    parser.add_argument("--anchor", choices=("feet", "bbox"), default="feet")
    parser.add_argument(
        "--measure",
        choices=("height", "longest"),
        default="height",
        help="what is held constant across facings: body height (limbed animals) or "
             "the body's longest side (a fish, whose long axis rotates with it)",
    )
    args = parser.parse_args()
    main(args.frames_dir, args.out_png, args.out_json, args.prefer, args.anchor, args.measure)
