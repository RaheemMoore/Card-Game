#!/usr/bin/env python3
"""
Pack one direction's frames into a single-row sprite sheet.

Separate from pack.py, which assumes a 4-row directional walk grid. A
stationary character (shopkeeper, boss, NPC) has one facing and one loop, so a
row is the right shape — forcing it through the grid packer would mean inventing
three empty rows.

Same two normalization rules as pack.py, for the same reasons:

  ONE SHARED CROP BOX across all frames. Cropping each frame to its own bounds
  re-centres the character every frame and he jitters.

  FEET ON A COMMON BASELINE, anchored horizontally on the centre of the feet
  (bottom ~15% of the silhouette) rather than the bounding-box centre — arms and
  shoulders move the bbox sideways, which would make him slide inside his cell.

  THE CANVAS IS SIZED FROM THE POST-ANCHOR EXTENT, not from image width. An
  earlier version derived frame width from the widest image and then shoved each
  frame sideways by the anchor offset, so the subject could run off the canvas
  and be cropped by the paste — silently, with no error and no failing gate. A
  grazing horse lost his entire hindquarters that way and only a human playing
  the game caught it. Measure where the frames actually land, then build a
  canvas that holds them.

Anchors:
  feet (default) — centre on the foot band. Correct for anything standing on
                   two legs; keeps arms and shoulders from sliding the body.
  bbox           — centre on the bounding box. Correct for quadrupeds, props,
                   and anything whose lowest pixels are not under its middle.

Usage: pack_row.py <out.png> <out.json> [--anchor feet|bbox] <frame1.png> ...
"""
import json
import os
import sys
import numpy as np
from PIL import Image

MARGIN = 3


def metrics(im: Image.Image):
    a = np.array(im)
    mask = a[..., 3] > 32
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return None
    top, bottom = int(ys.min()), int(ys.max())
    height = bottom - top + 1
    band = mask[max(bottom - max(1, int(height * 0.15)), 0):bottom + 1, :]
    _, fx = np.nonzero(band)
    foot_x = float(fx.mean()) if len(fx) else float(xs.mean())
    return {'top': top, 'bottom': bottom, 'height': height, 'foot_x': foot_x}


def main(out_png: str, out_json: str, frame_paths: list[str], anchor: str = 'feet') -> None:
    if not frame_paths:
        raise SystemExit('no frames given')
    if anchor not in ('feet', 'bbox'):
        raise SystemExit(f'unknown anchor {anchor!r} — expected feet or bbox')

    loaded = []
    for p in frame_paths:
        im = Image.open(p).convert('RGBA')
        box = im.getbbox()
        if box is None:
            raise SystemExit(f'empty frame: {p}')
        im = im.crop(box)
        m = metrics(im)
        loaded.append((im, m))

    # One shared body height for the whole loop.
    target = float(np.median([m['height'] for _, m in loaded]))
    scaled = []
    for im, m in loaded:
        s = target / m['height']
        w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
        scaled.append((im.resize((w, h), Image.NEAREST), m['foot_x'] * s))

    # Anchor advisory. The foot band approximates the body centre for a biped
    # and NOT for a head-down quadruped, whose bottom 15% is muzzle, hay and
    # front hooves clustered at one end. Report the disagreement; never act on
    # it. A packer that changes its own behaviour quietly is what cost the horse
    # his hindquarters in the first place.
    worst = max(abs(fx - im.width / 2) / im.width for im, fx in scaled)
    print(f'anchor: {anchor}  |foot_x - bbox_centre| up to {worst * 100:.0f}% of frame width')
    if anchor == 'feet' and worst > 0.20:
        print(
            '  NOTE: the foot band is far off the bbox centre, so it probably is '
            'not the body centre here (head-down quadruped? prop with an offset '
            'base?). --anchor bbox may be wanted.'
        )

    # Offsets FIRST, canvas second. Deriving the canvas from image width alone
    # ignores how far the anchor shoves each frame sideways, so the subject
    # silently ran off the edge and was cropped by the paste. Now the extent is
    # measured and the canvas is built to hold it, whatever the anchor does.
    offsets = [
        round((im.width / 2 if anchor == 'bbox' else fx) * -1) for im, fx in scaled
    ]
    left = min(offsets)
    span = max(off + im.width for off, (im, _) in zip(offsets, scaled)) - left

    fw = span + MARGIN * 2
    fh = max(im.height for im, _ in scaled) + MARGIN * 2
    baseline_y = fh - MARGIN

    sheet = Image.new('RGBA', (fw * len(scaled), fh), (0, 0, 0, 0))
    for i, ((im, _), off) in enumerate(zip(scaled, offsets)):
        sheet.paste(im, (i * fw + (off - left) + MARGIN, baseline_y - im.height))
    sheet.save(out_png)

    # Belt and braces, independent of the validator: prove nothing was clipped.
    # This is cheap and it is the exact failure that shipped past every gate.
    a = np.array(sheet)
    for i in range(len(scaled)):
        cell = a[:, i * fw:(i + 1) * fw]
        m = cell[..., 3] > 32
        if m[:, 0].any() or m[:, -1].any() or m[0, :].any():
            raise SystemExit(
                f'packer clipped frame {i}: opaque pixels on a frame edge. '
                f'This is a bug in pack_row, not in the art.'
            )

    meta = {
        'image': os.path.basename(out_png),
        'frameWidth': fw,
        'frameHeight': fh,
        'frameCount': len(scaled),
        'baselineY': baseline_y,
        'targetBodyHeight': round(target),
        'anchor': anchor,
        'note': (
            'Single-row loop. Frames share one crop box and one feet baseline, so '
            'the character never jitters or slides within his cell.'
        ),
    }
    with open(out_json, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f'{out_png}  {sheet.size[0]}x{sheet.size[1]}  frame {fw}x{fh} x{len(scaled)}  body {round(target)}px')
    print(out_json)


if __name__ == '__main__':
    args = sys.argv[1:]
    anchor = 'feet'
    if '--anchor' in args:
        i = args.index('--anchor')
        anchor = args[i + 1]
        del args[i:i + 2]
    main(args[0], args[1], args[2:], anchor)
