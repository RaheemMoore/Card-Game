#!/usr/bin/env python3
"""
Put the dark back behind a barred opening that the background cut reached through.

WHY THIS EXISTS. `cut_flat_background.py` removes background by flooding inward
from the frame edge, which is correct and is the whole reason an enclosed grey
survives inside a sprite. But "enclosed" is a question about CONNECTIVITY, and a
portcullis, window lattice, railing or arrow slit is not enclosed — the flood
walks straight in between the bars. The castle bastion came out of the cut with a
clean silhouette and a gateway you could see the sky through, which reads as a
hole punched in the building rather than a passage into it.

Regenerating would be the wrong answer twice over: the art is right, and the
defect is deterministic and local. Per the playbook's correction ladder this is
rung 1 — a local operation that cannot drift identity.

METHOD, and why it is a horizontal span test rather than another flood. Working
row by row, any transparent run with opaque pixels on BOTH sides within the
sprite's own silhouette is interior, and gets filled. That is exactly true for
the space between portcullis bars and exactly false for the gaps between
battlements, which are open to the sky above — so the rule alone would eat the
crenellations. Hence `--below`: the caller states where the building's solid mass
begins, and nothing above that line is touched.

Sibling to `cut_flat_background.py` (creates transparency) and `knockout_interior.py`
(removes an interior that should be hollow). This one restores an interior that
should be solid. Run it after the cut, before dehalo.

Usage:
  close_openings.py <in.png> <out.png> --below <y> [--color "#1a1418"] [--dry-run]
"""

import argparse
import sys

from PIL import Image


def parse_colour(text: str) -> tuple:
    text = text.lstrip('#')
    if len(text) != 6:
        raise ValueError(f'colour must be #rrggbb, got {text!r}')
    return tuple(int(text[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def close_openings(src: str, dst: str, below: int, colour: tuple, dry_run: bool) -> int:
    image = Image.open(src).convert('RGBA')
    width, height = image.size
    px = image.load()

    filled = 0
    for y in range(max(0, below), height):
        opaque = [x for x in range(width) if px[x, y][3] > 8]
        if len(opaque) < 2:
            continue
        left, right = opaque[0], opaque[-1]
        run_start = None
        for x in range(left, right + 1):
            transparent = px[x, y][3] <= 8
            if transparent and run_start is None:
                run_start = x
            elif not transparent and run_start is not None:
                # Bounded on both sides by the sprite's own pixels: interior.
                for fill_x in range(run_start, x):
                    if not dry_run:
                        px[fill_x, y] = colour
                    filled += 1
                run_start = None
        # A run still open at `right` cannot happen — `right` is opaque by
        # construction — so there is deliberately no tail case here.

    if not dry_run:
        image.save(dst)
    return filled


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--below', type=int, required=True,
                    help='Only rows at or below this y are considered. Protects gaps that are open to the sky.')
    ap.add_argument('--color', default='#1a1418',
                    help='Fill colour for the restored interior. Default is a near-black shadow.')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    filled = close_openings(args.src, args.dst, args.below, parse_colour(args.color), args.dry_run)
    verb = 'would fill' if args.dry_run else 'filled'
    print(f'{args.src}  {verb} {filled} px below y={args.below}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
