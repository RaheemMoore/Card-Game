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

# T3 — cut the tower out of its landscape.
#
# Keyed on grass rather than traced: the silhouette is railings, pipe runs and
# machicolation brackets, and a polygon would take an hour and still clip
# something. Trees, the pond and the distant walls are separate islands and drop
# away on their own once the fill takes only the seed's island.
#
# --box is doing real work. The banner poles reach up and MEET the curtain-wall
# arch, so without it the whole wall arrives as part of the tower's island —
# 235k pixels instead of 116k.
#
# --sever is why the box top is at row 60 and not row 112. A box low enough to
# cut the wall away also slices the crown: the wall runs to row ~110 and the
# crown's top rim starts at row 75, so they overlap in Y. Cutting at 112 lopped
# the top off the tower. The two sever rectangles remove the specific left and
# right bridges instead, and the crown survives whole.
#
# --floor 642 severs the approach path, the only thing genuinely joined to the
# tower.
# The four banner poles are the crown's own corner finials carried upward, so
# "remove the flags" is a sever above the rim (row 78) rather than a lower box —
# a box that clears the poles also clears the crown, because they share columns.
python lib/cut_from_scene.py "$O/T3-tower.png" "$O/T3-tower" \
  --seed 512 350 --floor 642 --box 382 78 652 642 \
  --sever 382 78 436 112 --sever 600 78 652 112 --scale 3 | tail -3

# CORNER TOWER — composited from T3's own crown and base. Zero generations.
#
# A corner tower terminates a wall run; T3 is the tall landmark. Rather than
# generate a second tower and risk a palette or angle mismatch, take T3's crown
# (rows 0-172, ending just under its cornice) and graft it onto T3's base (rows
# 400-end, the blind storey and the arched door). Both come from the same plate,
# so palette, angle and lighting match by construction rather than by matching.
# Widths at the seam are 200 and 205 — the join lands on a cornice line and
# reads as one.
#
# SCALE: T3 and the walls were framed differently, so their internal scales do
# NOT match. Composited side by side, the tower's arched door only matches the
# wall's doors at about 2.6x, and its corner finials come closest to the wall's
# merlons there too. That multiplier belongs in the manifest when these are
# placed — the asset itself stays at native size.
python - <<'PY'
from PIL import Image
src = Image.open('out/castle-picks/T3-tower-cut.png')
TOP_END, BOT_START = 172, 400
top = src.crop((0, 0, src.width, TOP_END))
bot = src.crop((0, BOT_START, src.width, src.height))
out = Image.new('RGBA', (src.width, top.height + bot.height), (0, 0, 0, 0))
out.paste(top, (0, 0)); out.paste(bot, (0, top.height))
out = out.crop(out.getbbox())
out.save('out/castle-picks/corner-tower-cut.png')
pad = 24
ref = Image.new('RGB', (out.width + pad*2, out.height + pad*2), (255, 255, 255))
ref.paste(out, (pad, pad), out)
ref = ref.resize((ref.width*3, ref.height*3), Image.NEAREST)
ref.save('out/castle-picks/corner-tower-reference.png')
print(f'  -> out/castle-picks/corner-tower-cut.png  {out.width}x{out.height}')
PY

# HARMONISE — TWO SEPARATE PASSES, and the order and separation both matter.
# Raheem chose the set-median target over anchoring on the wall, 2026-08-09.
#
# Pass 1, metal: converge hue, saturation and value. Metal is one material, so
# moving it wholesale is safe, and this is what takes the towers off bronze and
# onto the walls' gold.
#
# Pass 2, stone: COLOUR CAST ONLY, never value. The first attempt did both
# materials in one go and scaled all stone by a single factor to hit a target
# lightness — which flattened the wall, because its pale walkway and its dark
# outer face are BOTH stone and got compressed together. Raheem caught it: "the
# darker brick on the outside should stay there, and the top should stay a
# lighter grey brick, how it is in before." What actually differs between plates
# is the cast (the gate's stone is violet, the walls' warm), so only temperature
# moves and every plate keeps its own light-to-dark structure exactly as painted.
#
# Writes a separate folder rather than editing in place, so the un-harmonised
# cuts stay available if the target is ever revisited.
python lib/harmonise_materials.py apply \
  "$O/H2-wall.png" "$O/V3-wall-side.png" "$O/G5-gate.png" \
  "$O/T3-tower-cut.png" "$O/corner-tower-cut.png" \
  --out out/harm-metal --pass metal | tail -6
python lib/harmonise_materials.py apply out/harm-metal/*.png \
  --out out/castle-final --pass stone | tail -6

echo
echo "Five pieces in $O; harmonised shipping set in out/castle-final."
echo "That set is what goes to PixelLab."
