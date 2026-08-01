#!/usr/bin/env python3
"""
Punch transparency into an environment plate using traced cutout shapes.

WHY THIS IS SEPARATE from import_traces.py. Cutouts are not collision data —
they are a masking operation on the artwork. Keeping them in their own frame in
Figma and their own step here means a cut shape can never be mistaken for an
invisible obstacle, which is exactly what would happen if it landed in
`occluders`.

TWO KINDS OF TRANSPARENCY, and only one of them is automatic:

  1. OUTSIDE the building. Border-connected white, removed by flood fill. Free.
  2. The ENCLOSED gaps between columns. White, but walled in by stone on every
     side, so a border flood can never reach them. These are the WINDOWS the
     drifting sky is seen through, and they have to be traced by a human.

Usage: cut_plate.py <traces.json> <plate.png> <out.png>
"""
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
from import_traces import leaf_rings

WHITE = 238


def main(traces_path, plate_path, out_path):
    traces = json.load(open(traces_path))
    plate = Image.open(plate_path).convert('RGBA')
    W, H = plate.size
    a = np.asarray(plate).astype(np.int16)

    # 1. flood the border-connected white
    from collections import deque
    white = (a[:, :, 0] >= WHITE) & (a[:, :, 1] >= WHITE) & (a[:, :, 2] >= WHITE)
    seen = np.zeros_like(white, bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if white[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if white[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and white[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    outside = int(seen.sum())

    # 2. the traced cutouts
    cut = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(cut)
    for obj in traces.get('cutouts', []):
        for leaf in obj['leaves']:
            for ring in leaf_rings(leaf):
                if len(ring) > 2:
                    d.polygon(ring, fill=255)
    traced = np.array(cut) > 127

    alpha = np.asarray(plate.getchannel('A')).copy()
    alpha[seen] = 0
    alpha[traced] = 0
    out = plate.copy()
    out.putalpha(Image.fromarray(alpha, 'L'))
    out.save(out_path)

    total = int((alpha == 0).sum())
    print(f'{out_path}')
    print(f'  outside (flood)   {outside:>10,} px')
    print(f'  traced (windows)  {int(traced.sum()):>10,} px')
    print(f'  transparent total {total:>10,} px  ({100*total/(W*H):.1f}% of plate)')


if __name__ == '__main__':
    main(*sys.argv[1:4])
