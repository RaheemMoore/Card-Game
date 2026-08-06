#!/usr/bin/env python3
"""
Make a generated UI frame's interior genuinely transparent.

WHY: a 9-slice frame is only usable if its centre is hollow — the element's own
background has to show through the ring. PixelLab returns this correctly most of
the time, but not always: ui-kit-pixel R3 came back with a fully opaque interior
(1849/1849 centre pixels opaque, white) while R1 and R2 were clean. Same prompt
family, different roll.

Regenerating to fix it would cost 20 generations AND is not reproducible
(/create-1-direction-object rejects `seed`), so a good frame could be lost to get
a hollow one. Per the playbook's correction ladder, this is rung 1: a
deterministic local operation that cannot drift identity.

Method: flood-fill inward from the centre, clearing any pixel connected to it
whose colour is within `tol` of the seed. Stops at the wood/gold ring because the
ring is nowhere near white. Fills only what is actually connected, so a ring with
a gap is left visibly broken rather than silently eaten.

Usage: knockout_interior.py <in.png> <out.png> [tol]
"""
import sys
from collections import deque

from PIL import Image


def knockout(src: str, dst: str, tol: int = 60) -> int:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    seed = px[w // 2, h // 2][:3]

    seen = [[False] * h for _ in range(w)]
    q = deque([(w // 2, h // 2)])
    seen[w // 2][h // 2] = True
    cleared = 0
    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        if max(abs(r - seed[0]), abs(g - seed[1]), abs(b - seed[2])) > tol:
            continue
        px[x, y] = (r, g, b, 0)
        cleared += 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny]:
                seen[nx][ny] = True
                q.append((nx, ny))

    im.save(dst)
    return cleared


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    n = knockout(sys.argv[1], sys.argv[2], tol)
    print(f"cleared {n} interior px -> {sys.argv[2]}")


if __name__ == "__main__":
    main()
