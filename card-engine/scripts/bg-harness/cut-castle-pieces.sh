#!/usr/bin/env bash
# Cut every castle piece out of its Leonardo plate.
#
# Raheem's workflow, 2026-08-09: hand Leonardo a plate that already has the
# correct angle and 16-bit read, ask a more capable engine than ours to make it
# fancier while holding the angle. That only works if the reference shows ONE
# thing — a tower with wall stubs attached makes Leonardo regenerate the wall.
#
# Polygon coordinates are in each plate's own pixel space and were read off a
# NEAREST-upscaled zoom of the plate. If a plate is regenerated the numbers here
# are void; re-read them, do not assume they carry over.
#
#   bash scripts/bg-harness/cut-castle-pieces.sh
#
# Always give Leonardo the *-reference.png (white background). The transparent
# *-cut.png is the game asset — a transparent surround uploads to Leonardo as
# black and drags the whole palette dark (building-forge.json).
set -euo pipefail
cd "$(dirname "$0")"
O=out/castle-grand-topdown

# TOWER — cut out of N (part-n-tower), which has it embedded in a wall run.
# Follows the roof octagon's diagonals, then steps IN to the shaft and base;
# a rectangular crop leaves wall showing in the octagon's corner cuts.
python lib/cut_piece.py $O/part-n-tower.png $O/castle-tower --poly \
  734,414 807,414 841,450 841,519 822,540 822,617 827,644 827,686 \
  806,706 737,707 713,686 713,644 718,617 718,540 699,519 699,450

# GATE — cut out of B (front-b-arcane). Drops the curtain walls running off both
# frame edges and the approach road below the arch, keeps both flanking towers
# and the crystal spire (Raheem is reworking that himself). Gate-block bottom
# measured at row 843, towers at 907. Scale 1: the plate is already large.
python lib/cut_piece.py $O/front-b-arcane.png $O/castle-gate --scale 1 --poly \
  270,190 560,190 560,345 728,345 728,125 822,125 822,345 982,345 \
  982,190 1272,190 1272,542 1230,542 1230,912 980,912 980,846 \
  580,846 580,912 308,912 308,542 270,542

# WALL — three repeating bays cut out of E (kit-b-wall-straight), clear of both
# corner towers and the stair. Bay pitch is 125px (arrow slits at x 269, 394,
# 519, 644), so the cut lands midway between slits at 331 and 706 and tiles.
# Bottom at 706: the wall's hard edge is row 705, below that is ground shadow.
python lib/cut_piece.py $O/kit-b-wall-straight.png $O/castle-wall --poly \
  331,450 706,450 706,706 331,706

echo
echo "Give Leonardo the *-reference.png files."
