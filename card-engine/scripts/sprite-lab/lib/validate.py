#!/usr/bin/env python3
"""
Sprite sheet quality gate.

Every check here exists because the corresponding defect actually shipped and
a human had to catch it:

  * body height variance    -> the hero visibly SHRANK 25% walking left
  * idle vs walk height     -> idle came from a rotation, walk from an
                               animation, and the two sources disagree on scale
  * feet baseline           -> a character that sinks or floats between frames
  * palette drift           -> his COSTUME changed mid-walk-cycle
  * left/right mirror       -> internally inconsistent facing

WHAT THIS CANNOT DO: establish which way the character *actually* faces. It can
only prove the two side rows disagree with each other. Absolute facing was
wrong once precisely because it was "verified" by static analysis — a centroid
heuristic and a 4x zoom read gave opposite answers and the zoom won, wrongly.
Walk the character in the game and look. That is the only authority.

Thresholds are calibrated against the measured known-bad sheet, where the sound
rows drifted 3.5-13.0 and the broken row drifted 36.8-51.7 — a wide, unambiguous
gap.

Usage:
  validate.py <sheet.png> <meta.json>          # gate a packed sheet
  validate.py <sheet.png> <meta.json> --report # print numbers, never fail
"""
import json
import sys
from PIL import Image
import numpy as np

# --- tolerances -------------------------------------------------------------
HEIGHT_TOLERANCE = 0.04   # +/-4% of the row's median body height
IDLE_TOLERANCE = 0.04     # idle must match the walk median this closely
DRIFT_LIMIT = 20.0        # palette distance; good rows measured <= 13
PALETTE_BUCKETS = 6

# Feet baseline is measured as a FRACTION of body height, not raw pixels.
# A flat 2px rule flagged the healthy `down` row: in any real walk cycle the
# lowest opaque pixel rises as a leg lifts, so some movement is the animation
# working, not a defect. 8% catches gross floating (the broken `left` row swung
# 14.9%) while leaving normal stepping alone (`down` 5.8%, `right` 6.5%).
BASELINE_SPREAD_FRACTION = 0.08
# The ground line the character stands on, though, must not jump between
# standing and walking — that reads as popping up when you press a key.
BASELINE_IDLE_FRACTION = 0.04


def cell(sheet, meta, row, col):
    fw, fh = meta["frameWidth"], meta["frameHeight"]
    return sheet[row * fh:(row + 1) * fh, col * fw:(col + 1) * fw]


def silhouette(img):
    """Opaque mask, plus body height / width / feet baseline."""
    a = img[..., 3] > 32
    ys, xs = np.nonzero(a)
    if len(ys) == 0:
        return a, 0, 0, None
    return a, int(ys.max() - ys.min() + 1), int(xs.max() - xs.min() + 1), int(ys.max())


def palette(img):
    """
    Coarse colour signature: mean RGB of luminance-ordered buckets. Robust to
    the character moving within the frame, sensitive to the outfit changing
    colour — which is exactly the failure being detected.
    """
    a = img[..., 3] > 32
    px = img[..., :3][a].astype(float)
    if len(px) == 0:
        return np.zeros((PALETTE_BUCKETS, 3))
    px = px[np.argsort(px.mean(1))]
    n = len(px)
    return np.array([
        px[i * n // PALETTE_BUCKETS:(i + 1) * n // PALETTE_BUCKETS].mean(0)
        for i in range(PALETTE_BUCKETS)
    ])


def drift(a, b):
    return float(np.linalg.norm(palette(a) - palette(b)) / np.sqrt(PALETTE_BUCKETS))


def iou(a, b):
    union = (a | b).sum()
    return float((a & b).sum() / union) if union else 0.0


def normalized_mask(img):
    im = Image.fromarray(img)
    box = im.getbbox()
    if not box:
        return None
    return np.array(im.crop(box).resize((60, 140), Image.NEAREST))[..., 3] > 32


def validate(sheet_path, meta_path, report_only=False):
    meta = json.load(open(meta_path))
    sheet = np.array(Image.open(sheet_path).convert("RGBA"))
    cols = meta["columns"]
    rows = meta["rows"]
    failures = []

    print(f"\nvalidating {sheet_path}  ({meta['frameWidth']}x{meta['frameHeight']} frames)\n")
    print(f"{'row':7} {'idle_h':>7} {'walk_h(median)':>15} {'h_spread':>9} {'baseline':>9} {'max_drift':>10}")
    print("-" * 64)

    masks = {}
    for r, spec in enumerate(rows):
        name = spec["direction"]
        heights, baselines, empties = [], [], []
        for c in range(cols):
            img = cell(sheet, meta, r, c)
            mask, h, _w, base = silhouette(img)
            if base is None:
                empties.append(c)
                continue
            heights.append(h)
            baselines.append(base)
            if c == 1:
                masks[name] = normalized_mask(img)

        if empties:
            failures.append(f"{name}: empty frame(s) at column {empties}")
            continue

        idle_h, walk_h = heights[0], heights[1:]
        median = float(np.median(walk_h))
        spread = (max(walk_h) - min(walk_h)) / median if median else 0
        idle_base, walk_bases = baselines[0], baselines[1:]
        base_spread = max(walk_bases) - min(walk_bases)
        base_frac = base_spread / median if median else 0
        idle_base_frac = abs(idle_base - float(np.median(walk_bases))) / median if median else 0

        # Palette drift is measured against the row's MEDIAN palette, across
        # every column including the idle — never against a chosen reference
        # frame. An earlier version compared to frame 1, and when a rogue frame
        # landed in the idle slot the drift silently "disappeared" from 51.7 to
        # 16.8 while the costume change was still plainly visible in game.
        palettes = [palette(cell(sheet, meta, r, c)) for c in range(cols)]
        median_palette = np.median(np.stack(palettes), axis=0)
        drifts = [
            float(np.linalg.norm(p - median_palette) / np.sqrt(PALETTE_BUCKETS))
            for p in palettes
        ]
        max_drift = max(drifts)
        idle_walk_drift = drift(
            cell(sheet, meta, r, 0),
            cell(sheet, meta, r, 1 + int(np.argmin(drifts[1:]))),
        )

        print(f"{name:7} {idle_h:7d} {median:15.0f} {spread*100:8.1f}% {base_frac*100:8.1f}% {max_drift:10.1f}")

        # --- the gate ---
        for c, h in enumerate(walk_h, start=1):
            if median and abs(h - median) / median > HEIGHT_TOLERANCE:
                failures.append(
                    f"{name}: frame {c} body height {h}px is "
                    f"{(h-median)/median*100:+.1f}% off the row median {median:.0f}px "
                    f"(tolerance ±{HEIGHT_TOLERANCE*100:.0f}%) — the character changes size mid-walk"
                )
        if median and abs(idle_h - median) / median > IDLE_TOLERANCE:
            failures.append(
                f"{name}: idle height {idle_h}px is {(idle_h-median)/median*100:+.1f}% off the walk "
                f"median {median:.0f}px — idle and walk frames came from sources that disagree on scale"
            )
        if base_frac > BASELINE_SPREAD_FRACTION:
            failures.append(
                f"{name}: feet baseline swings {base_spread}px = {base_frac*100:.1f}% of body height "
                f"(limit {BASELINE_SPREAD_FRACTION*100:.0f}%) — the character floats or sinks while walking"
            )
        if idle_base_frac > BASELINE_IDLE_FRACTION:
            failures.append(
                f"{name}: idle ground line differs from the walk cycle by {idle_base_frac*100:.1f}% "
                f"of body height (limit {BASELINE_IDLE_FRACTION*100:.0f}%) — the character pops up or "
                f"down when he starts walking"
            )
        if max_drift > DRIFT_LIMIT:
            worst = int(np.argmax(drifts))
            slot = "idle" if worst == 0 else f"walk frame {worst}"
            failures.append(
                f"{name}: {slot} sits {max_drift:.1f} from the row's median palette "
                f"(limit {DRIFT_LIMIT}) — that frame's costume/colour differs from the rest"
            )
        if idle_walk_drift > DRIFT_LIMIT:
            failures.append(
                f"{name}: idle differs from the walk cycle by {idle_walk_drift:.1f} "
                f"(limit {DRIFT_LIMIT}) — the character changes clothes when he stops"
            )

    # left/right must be mirrors of one another, not the same pose twice
    if 'left' in masks and 'right' in masks and masks['left'] is not None and masks['right'] is not None:
        same = iou(masks['left'], masks['right'])
        flipped = iou(masks['left'], masks['right'][:, ::-1])
        print(f"\nleft/right mirror: same={same:.3f} flipped={flipped:.3f}", end="  ")
        if flipped > same:
            print("-> opposite facing ✓")
        else:
            print("-> FAIL")
            failures.append(
                f"left/right rows are not mirrors (same={same:.3f} >= flipped={flipped:.3f}) — "
                "both rows appear to face the same way"
            )

    print()
    if failures:
        print(f"{'REPORT' if report_only else 'FAILED'} — {len(failures)} issue(s):")
        for f in failures:
            print(f"  ✗ {f}")
        print(
            "\nNOTE: absolute facing is NOT checked here and cannot be. "
            "Walk the character in the game and look."
        )
        if not report_only:
            sys.exit(1)
    else:
        print("PASSED all mechanical checks.")
        print(
            "NOTE: this does not prove the character faces where he walks — "
            "only that the sheet is internally consistent. Verify in-game."
        )
    return failures


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    validate(args[0], args[1], report_only="--report" in sys.argv)
