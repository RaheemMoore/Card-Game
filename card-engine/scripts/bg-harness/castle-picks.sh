#!/usr/bin/env bash
# Raheem's four picks from the 20 Gemini extracts, plus the two repairs he asked for.
# Raheem, 2026-08-09: "T3 / G5 - remove the floating runes / V3 - need to fix the
# gap in the tan wall railing / H2".
#
#   bash scripts/bg-harness/castle-picks.sh ["C:/path/to/Castle"]
#
# Masters: verified byte-identical to what the Leonardo API serves (all 20 of
# them), so these downloads ARE the masters. For gemini-2.5-flash-image the CDN
# file is the original and it is a JPEG — there is no cleaner PNG behind it.
# See fetch-masters.mjs `match`.
set -euo pipefail
cd "$(dirname "$0")"
SRC="${1:-C:/Users/storm/Downloads/Castle}"
O=out/castle-picks
mkdir -p "$O"

G="$SRC/Gate/gemini-2.5-flash-image_Remove_the_center_pink_and_blue_crystal_but_maintain_the_exact_angle_and_2D_game-0.jpg"
V="$SRC/Vertical Wall/gemini-2.5-flash-image_Create_a_seamless_vertically_tileable_16-bit_castle_wall_strip_for_a_top-down_fa-0.jpg"
H="$SRC/Horizontal Walls/gemini-2.5-flash-image_Add_closed_shutters_to_all_3_of_the_lower_windows._NO_OPEN_WINDOWS_ALL_3_WINDOWS-0.jpg"
T="$SRC/Towers/gemini-2.5-flash-image_Add_hints_of_steam_punk_metal_infrastructure_but_maintain_the_exact_angle_and_2D-0 (1).jpg"

# G5 — drop the floating runes.
# Two-step on purpose. --drop-floaters removes the solid rune cores, which are
# their own connected components because they sit on white with a clean gap.
# It cannot remove the PALEST glyphs: those are above the white cutoff, so it
# reads them as background and leaves them. Raising the cutoff is worse, not
# better — at 253 the JPEG noise in the background bridges every floater into
# the main blob and nothing drops at all. So the remnants are cleared by region,
# left and right of the arch, which cannot touch architecture.
python lib/clean_plate.py "$G" "$O/G5-gate.png" \
  --drop-floaters --min-blob 4000 \
  --clear-rect 0 0 336 186 --clear-rect 694 0 1024 186 | tail -3

# V3 — repair the railing.
# Rows 400-650 had the crenel pattern destroyed: railing quality (saturation x
# detail on the railing columns) measured 0.5-1.9 there against ~3.5 everywhere
# else, and the tan run had 45- and 90-row holes where the crenel rhythm is only
# 13-17. Rows 652-902 are the cleanest band and sit a whole pattern offset away,
# so cloning them lands the crenels where the eye already expects them.
python lib/clean_plate.py "$V" "$O/V3-wall-side.png" --clone-band 652 902 400 | tail -2

# H2 and T3 — accepted as-is.
python -c "
from PIL import Image; import sys
Image.open(sys.argv[1]).save(sys.argv[2]); print('  ->', sys.argv[2])
" "$H" "$O/H2-wall.png"
python -c "
from PIL import Image; import sys
Image.open(sys.argv[1]).save(sys.argv[2]); print('  ->', sys.argv[2])
" "$T" "$O/T3-tower.png"

echo
echo "Four picks in $O. T3 still needs cutting out of its landscape before PixelLab."
