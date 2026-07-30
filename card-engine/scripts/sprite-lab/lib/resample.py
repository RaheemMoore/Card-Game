#!/usr/bin/env python3
"""
Resample a sprite sheet DOWN to the resolution it is actually displayed at.

THE PROBLEM THIS SOLVES: pixel art must never be downscaled at runtime. The
shopkeeper was authored at 244² (125px tall after packing) and displayed at 58
screen pixels — 46% — so nearest-neighbour sampling threw away more than half of
his rows and columns every frame. Individual dreadlocks, beads, fur strands and
buckles collapsed into noise, and he read as a dark smudge next to a painting
that downscales gracefully because it isn't pixel art. That is the "he's not from
the same game" feeling, and it is a rendering fault, not an art fault.

THE FIX: do the reduction ONCE, offline, with area-averaging (which considers
every source pixel instead of point-sampling one of them), then re-quantise to a
tight palette so the result is crisp indexed pixel art again. The sprite is then
rendered at ~1:1 or gently UPSCALED, which is the direction pixel art tolerates.

Sizing: target frame height = intended world height x the camera's cover zoom.
Authoring at that size means the runtime scale lands at or just above 1.0 across
window sizes, never below.

Usage:
  resample.py <in.png> <in.json> <out.png> <out.json> <target_frame_height>
"""
import json
import sys
import numpy as np
from PIL import Image


def dominant_colour_count(img: Image.Image) -> int:
    a = np.array(img.convert('RGBA'))
    px = a[..., :3][a[..., 3] > 32]
    return max(2, min(256, len({tuple(p) for p in px.astype(int)})))


def main(in_png, in_json, out_png, out_json, target_h):
    target_h = int(target_h)
    meta = json.load(open(in_json))
    sheet = Image.open(in_png).convert('RGBA')

    fw, fh = meta['frameWidth'], meta['frameHeight']
    if target_h >= fh:
        raise SystemExit(
            f'target {target_h}px is not smaller than the source frame {fh}px — '
            f'nothing to resample. Upscaling is the renderer\'s job.'
        )

    scale = target_h / fh
    new_fw = max(1, round(fw * scale))
    colours = dominant_colour_count(sheet)

    # Resample the WHOLE sheet uniformly so frame boundaries stay aligned, using
    # BOX (area average) — every source pixel contributes, which is what keeps
    # thin features like braids and belts readable instead of dropping them.
    cols = sheet.width // fw
    rows = sheet.height // fh
    out = Image.new('RGBA', (new_fw * cols, target_h * rows), (0, 0, 0, 0))
    for r in range(rows):
        for c in range(cols):
            cell = sheet.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh))
            out.paste(cell.resize((new_fw, target_h), Image.BOX), (c * new_fw, r * target_h))

    # Re-quantise back to a tight palette so it reads as pixel art rather than a
    # softly averaged photograph. Alpha is kept separate and re-binarised, or the
    # area average leaves a halo of semi-transparent fringe pixels.
    alpha = out.getchannel('A').point(lambda v: 255 if v > 110 else 0)
    quant = out.convert('RGB').quantize(colors=colours, method=Image.MEDIANCUT)
    final = quant.convert('RGBA')
    final.putalpha(alpha)
    final.save(out_png)

    new_meta = dict(meta)
    new_meta.update({
        'image': out_png.split('/')[-1],
        'frameWidth': new_fw,
        'frameHeight': target_h,
        'resampledFrom': {'frameWidth': fw, 'frameHeight': fh, 'colours': colours},
        'note': (
            'Area-averaged down to display resolution ONCE, offline, then re-quantised. '
            'Render this at ~1:1 or upscaled — never downscale pixel art at runtime.'
        ),
    })
    json.dump(new_meta, open(out_json, 'w'), indent=2)
    print(f'{out_png}  frame {fw}x{fh} -> {new_fw}x{target_h}  ({scale*100:.0f}%)  {colours} colours')
    print(out_json)


if __name__ == '__main__':
    main(*sys.argv[1:6])
