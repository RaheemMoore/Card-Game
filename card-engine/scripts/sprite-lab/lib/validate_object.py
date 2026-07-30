#!/usr/bin/env python3
"""
Quality gate for scene OBJECTS (props) and TILESETS.

Separate from validate.py on purpose. That one is four-row-directional by
construction — row medians, idle-vs-walk, left/right mirror-IoU — and none of it
means anything for a still prop. Loosening it to let objects through is how the
sprite gate gets lost, so this is its own file.

Checks, each tied to a real observed failure:
  * alpha coverage        — empty output, or a solid rectangle with no cutout
  * edge opacity          — the grey-background corruption that hit `pro` mode
                            at drift 191; expect it to recur on objects
  * anchor validity       — bottom opaque row must sit at the crop bottom, or
                            the object floats when placed on its feet baseline
  * scale vs hero         — objects generated at different native sizes disagree
                            by tens of percent, the same class of bug as the 33%
                            idle/walk jump
  * baked shadow          — a soft dark ellipse under the base renders OVER the
                            hero's feet; shadows must be separate sprites
  * tile seam continuity  — a tileset that doesn't tile is worthless, and the
                            defect is invisible on a single tile

Usage:
  validate_object.py object <hero_sheet.png> <hero_meta.json> <obj.png> [...]
  validate_object.py tileset <grid.png> <tile_size>
  validate_object.py loop <sheet.png> <sheet.json>
"""
import json
import sys
from PIL import Image
import numpy as np

ALPHA_MIN, ALPHA_MAX = 0.05, 0.70
EDGE_OPAQUE_MAX = 0.02          # fraction of border pixels allowed opaque
ANCHOR_SLACK_PX = 2
SCALE_MIN, SCALE_MAX = 0.15, 3.0  # object height / hero body height
SEAM_DELTA_MAX = 42.0           # mean abs RGB difference across a tile seam

# Loop-mode tolerances. Deliberately the SAME calibrated values validate.py uses
# for walk cycles, so the two gates cannot disagree about what "drifting" means.
# Reference data: healthy frames measured 3-15 palette drift, a rogue frame 43.7,
# corrupt output 191. Feet baseline is a fraction of body height, not raw pixels —
# a flat pixel rule false-positived a healthy walk, because legs legitimately lift.
HEIGHT_TOLERANCE = 0.04
BASELINE_SPREAD_FRACTION = 0.08
DRIFT_LIMIT = 20.0
PALETTE_BUCKETS = 6

# Localized drift. The global palette signature is deliberately robust to the
# subject moving inside the frame, and that robustness is a blind spot: a belt
# pouch teleporting hip-to-hip keeps every colour present and merely relocates
# it, so global drift barely twitches. The archivist shipped with her pouch
# jumping between all four frames and the gate said PASSED.
#
# Fix: run the same signature over a 3x3 grid and compare each cell against the
# row median FOR THAT CELL. Calibrated on a matched pair — same pipeline, same
# frame count, one clean and one broken:
#     dwarf     (clean)  worst cell 6.7
#     archivist (broken) worst cell 20.8, lowest frame still 15.4
# 12.0 sits with 1.8x margin under the clean sprite and fails every broken frame.
BLOCK_DRIFT_LIMIT = 12.0
BLOCK_GRID = 3


def palette(img):
    """Coarse colour signature: mean RGB of luminance-ordered buckets. Robust to
    the subject shifting inside the frame, sensitive to its colours changing."""
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


def block_signature(cell, grid=BLOCK_GRID):
    """Per-region colour signature: `palette()` over a grid of tiles.

    Sensitive to a feature MOVING, which the whole-frame signature is designed
    not to be. See BLOCK_DRIFT_LIMIT for why that distinction cost real art.
    """
    fh, fw = cell.shape[:2]
    return np.array([
        palette(cell[r * fh // grid:(r + 1) * fh // grid,
                     c * fw // grid:(c + 1) * fw // grid])
        for r in range(grid) for c in range(grid)
    ])


def load(path):
    return np.array(Image.open(path).convert('RGBA'))


def hero_body_height(sheet_path, meta_path):
    meta = json.load(open(meta_path))
    fw, fh = meta['frameWidth'], meta['frameHeight']
    sheet = load(sheet_path)
    cell = sheet[0:fh, 0:fw]
    ys, _ = np.nonzero(cell[..., 3] > 32)
    return int(ys.max() - ys.min() + 1) if len(ys) else fh


def check_object(path, hero_h):
    """
    Two kinds of image reach this function and they need different checks:

      RAW output   — the object sits centred in a padded square canvas. Coverage
                     and edge-opacity are meaningful here: near-total coverage or
                     opaque borders mean empty output or background bleed.
      TRIMMED asset — cropped to its own alpha bbox for placement. Coverage and
                     edge-opacity are then meaningless BY CONSTRUCTION, because
                     the object necessarily touches every edge of its own bbox.

    Applying the raw thresholds to a trimmed asset produced four confident false
    positives on assets that were fine — the same error as an earlier flat-pixel
    baseline rule that flagged a healthy walk cycle. So detect which we have.
    """
    a = load(path)
    h, w = a.shape[:2]
    alpha = a[..., 3] > 32
    issues = []
    skipped = []

    ys, xs = np.nonzero(alpha)
    if len(ys) == 0:
        return ['completely empty'], {}, []

    trimmed = (
        int(ys.min()) == 0 and int(xs.min()) == 0
        and int(ys.max()) == h - 1 and int(xs.max()) == w - 1
    )

    coverage = alpha.mean()
    border = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
    edge = border.mean()

    if trimmed:
        skipped.append('coverage + edge-opacity (image is tightly cropped; both are meaningless)')
    else:
        if not (ALPHA_MIN <= coverage <= ALPHA_MAX):
            issues.append(
                f"alpha coverage {coverage*100:.1f}% outside {ALPHA_MIN*100:.0f}–{ALPHA_MAX*100:.0f}% "
                f"(empty output, or a solid block with no silhouette)"
            )
        if edge > EDGE_OPAQUE_MAX:
            issues.append(
                f"{edge*100:.1f}% of border pixels are opaque (limit {EDGE_OPAQUE_MAX*100:.0f}%) — "
                f"background bled into the cutout"
            )

    obj_h = int(ys.max() - ys.min() + 1)
    if (h - 1) - int(ys.max()) > ANCHOR_SLACK_PX:
        issues.append(
            f"bottom opaque row is {(h-1)-int(ys.max())}px above the crop bottom — "
            f"the object will float when anchored on its baseline (trim it)"
        )

    ratio = obj_h / hero_h if hero_h else 0
    if not (SCALE_MIN <= ratio <= SCALE_MAX):
        issues.append(
            f"height is {ratio:.2f}x the hero's body ({obj_h}px vs {hero_h}px), outside "
            f"{SCALE_MIN}–{SCALE_MAX}x"
        )

    # Baked shadow: a wide, low-saturation, dark band in the bottom eighth that
    # extends well past the object's own width higher up.
    band = a[max(int(ys.max()) - max(2, obj_h // 8), 0):int(ys.max()) + 1]
    band_alpha = band[..., 3] > 32
    if band_alpha.any():
        band_rgb = band[..., :3][band_alpha].astype(float)
        dark = (band_rgb.mean(1) < 80).mean()
        band_width = band_alpha.any(axis=0).sum()
        body_width = alpha[: max(1, int(ys.max()) - obj_h // 4)].any(axis=0).sum()
        if dark > 0.55 and band_width > body_width * 1.25:
            issues.append(
                f"looks like a baked shadow at the base ({dark*100:.0f}% dark, "
                f"{band_width}px wide vs {body_width}px body) — ship shadows as separate sprites"
            )

    return issues, {'coverage': coverage, 'edge': edge, 'height': obj_h, 'ratio': ratio,
            'trimmed': trimmed}, skipped


def check_tileset(path, tile):
    """Tile the grid 3x3 and measure discontinuity across the seams."""
    a = load(path)
    h, w = a.shape[:2]
    issues = []
    if w % tile or h % tile:
        issues.append(f"grid {w}x{h} is not a whole multiple of tile size {tile}")
        return issues, {}

    rgb = a[..., :3].astype(float)
    worst = 0.0
    # For each tile, compare its right edge to its own left edge (horizontal
    # wrap) and bottom to top (vertical wrap) — how a repeating fill behaves.
    for ty in range(h // tile):
        for tx in range(w // tile):
            t = rgb[ty * tile:(ty + 1) * tile, tx * tile:(tx + 1) * tile]
            if a[ty * tile:(ty + 1) * tile, tx * tile:(tx + 1) * tile, 3].mean() < 32:
                continue
            worst = max(worst, float(np.abs(t[:, -1] - t[:, 0]).mean()))
            worst = max(worst, float(np.abs(t[-1, :] - t[0, :]).mean()))
    if worst > SEAM_DELTA_MAX:
        issues.append(
            f"worst tile seam discontinuity {worst:.1f} (limit {SEAM_DELTA_MAX}) — "
            f"tiles will show visible grid lines when repeated"
        )
    return issues, {'worstSeam': worst}


def check_loop(sheet_path, meta_path):
    """
    Gate a single-row animation loop (a shopkeeper's breathing idle, a grazing
    prop) — the case validate.py cannot cover, because every check in that file
    assumes a 4-row directional grid. This gap is why the first shopkeeper
    shipped on human review alone.

    Measures across the row:
      * frame count matches the manifest, and no frame is empty
      * body height is uniform (a character that changes size mid-loop pulses)
      * feet baseline is consistent (otherwise he bobs or sinks in place)
      * palette drift against the ROW MEDIAN — the check that caught a costume
        changing mid-cycle. Median, never a reference frame: when the rogue frame
        landed in the reference slot the drift silently fell from 51.7 to 16.8.
    """
    meta = json.load(open(meta_path))
    a = load(sheet_path)
    fw = meta['frameWidth']
    fh = meta['frameHeight']
    declared = meta.get('frameCount') or (a.shape[1] // fw)
    issues = []

    if a.shape[1] % fw or a.shape[0] % fh:
        issues.append(f'sheet {a.shape[1]}x{a.shape[0]} does not divide evenly into {fw}x{fh} frames')
        return issues, {}

    actual = a.shape[1] // fw
    if actual != declared:
        issues.append(f'manifest declares {declared} frames but the sheet holds {actual}')

    heights, baselines, palettes, blocks = [], [], [], []
    for i in range(actual):
        cell = a[0:fh, i * fw:(i + 1) * fw]
        mask = cell[..., 3] > 32
        ys, _ = np.nonzero(mask)
        if len(ys) == 0:
            issues.append(f'frame {i} is empty')
            continue

        # Clipping. A packed sheet is NEVER trimmed — pack_row guarantees a
        # margin on all four sides by construction — so an opaque pixel on a
        # frame edge can only mean the packer overflowed and cropped the art.
        # (The trimmed-asset exemption in check_object is about standalone
        # objects, which necessarily touch their own bbox; it does not apply
        # here.) Checked per FRAME, because the horse that lost his hindquarters
        # was clipped at an interior frame boundary the sheet border never sees.
        # Bottom edge is lenient: a baseline may legitimately sit flush.
        touched = [n for n, e in (('left', mask[:, 0]), ('right', mask[:, -1]),
                                  ('top', mask[0, :])) if e.any()]
        if touched:
            issues.append(
                f'frame {i} has opaque pixels on its {"/".join(touched)} edge — '
                f'the packer clipped this frame; part of the subject is missing'
            )

        heights.append(int(ys.max() - ys.min() + 1))
        baselines.append(int(ys.max()))
        palettes.append(palette(cell))
        blocks.append(block_signature(cell))

    if not heights:
        return issues, {}

    median_h = float(np.median(heights))
    spread = (max(heights) - min(heights)) / median_h if median_h else 0
    base_spread = (max(baselines) - min(baselines)) / median_h if median_h else 0

    median_palette = np.median(np.stack(palettes), axis=0)
    drifts = [float(np.linalg.norm(p - median_palette) / np.sqrt(PALETTE_BUCKETS)) for p in palettes]

    # Same signature, per grid cell, against the median FOR THAT CELL — catches a
    # feature relocating, which whole-frame drift is built to ignore.
    stack = np.stack(blocks)
    cell_med = np.median(stack, axis=0)
    cell_drift = np.linalg.norm(stack - cell_med, axis=3).mean(axis=2)  # (frames, cells)
    block_drifts = [float(x) for x in cell_drift.max(axis=1)]

    print(f"frames {actual}  body {median_h:.0f}px  height spread {spread*100:.1f}%  "
          f"baseline spread {base_spread*100:.1f}%  max drift {max(drifts):.1f}  "
          f"max block drift {max(block_drifts):.1f}")

    for i, h in enumerate(heights):
        if median_h and abs(h - median_h) / median_h > HEIGHT_TOLERANCE:
            issues.append(
                f'frame {i} body height {h}px is {(h-median_h)/median_h*100:+.1f}% off the '
                f'median {median_h:.0f}px — he changes size during the loop'
            )
    if base_spread > BASELINE_SPREAD_FRACTION:
        issues.append(
            f'feet baseline swings {base_spread*100:.1f}% of body height '
            f'(limit {BASELINE_SPREAD_FRACTION*100:.0f}%) — he bobs or sinks in place'
        )
    for i, dr in enumerate(drifts):
        if dr > DRIFT_LIMIT:
            issues.append(
                f'frame {i} sits {dr:.1f} from the row median palette (limit {DRIFT_LIMIT}) — '
                f'that frame\'s colours differ from the rest of the loop'
            )

    for i, bd in enumerate(block_drifts):
        if bd > BLOCK_DRIFT_LIMIT:
            r, c = divmod(int(cell_drift[i].argmax()), BLOCK_GRID)
            where = f'{["top", "middle", "bottom"][r]} {["left", "centre", "right"][c]}'
            issues.append(
                f'frame {i} drifts {bd:.1f} from the row median in its {where} region '
                f'(limit {BLOCK_DRIFT_LIMIT}) — something is MOVING or appearing there '
                f'between frames (a prop changing hands, hair redrawn, gear relocating). '
                f'Whole-frame drift cannot see this.'
            )

    return issues, {
        'frames': actual,
        'bodyHeight': median_h,
        'maxDrift': max(drifts),
        'maxBlockDrift': max(block_drifts),
    }


def main(argv):
    mode = argv[0]
    failures = 0
    if mode == 'object':
        hero_h = hero_body_height(argv[1], argv[2])
        print(f"hero body height: {hero_h}px\n")
        print(f"{'object':32} {'form':>7} {'cover':>7} {'edge':>6} {'h':>5} {'xhero':>6}")
        print('-' * 72)
        all_skipped = set()
        for p in argv[3:]:
            issues, m, skipped = check_object(p, hero_h)
            all_skipped.update(skipped)
            name = p.split('/')[-1][:38]
            if m:
                tag = 'trimmed' if m.get('trimmed') else 'raw'
                print(f"{name:32} {tag:>7} {m['coverage']*100:6.1f}% {m['edge']*100:5.1f}% "
                      f"{m['height']:5d} {m['ratio']:6.2f}")
            for i in issues:
                print(f"    ✗ {i}")
                failures += 1
    elif mode == 'tileset':
        issues, m = check_tileset(argv[1], int(argv[2]))
        print(f"tileset {argv[1]}: worst seam {m.get('worstSeam', 0):.1f}")
        for i in issues:
            print(f"    ✗ {i}")
            failures += 1
    elif mode == 'loop':
        issues, _m = check_loop(argv[1], argv[2])
        for i in issues:
            print(f'    ✗ {i}')
            failures += 1
    else:
        raise SystemExit('mode must be "object", "tileset" or "loop"')

    if mode == 'object' and all_skipped:
        print()
        for s_ in sorted(all_skipped):
            print(f"  (skipped: {s_})")

    print()
    if failures:
        print(f"FAILED — {failures} issue(s).")
        sys.exit(1)
    print("PASSED. Note: this proves the assets are mechanically sound, not that")
    print("they look right together. Judge the register by eye, in scene.")


if __name__ == '__main__':
    main(sys.argv[1:])
