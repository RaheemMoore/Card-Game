#!/usr/bin/env bash
# The PixelLab pass: five Leonardo plates -> a coherent 16-bit castle kit.
#
#   bash scripts/bg-harness/castle-pixellab.sh
#
# 6 generations, ~$0.05. Re-running spends again — there is no skip-if-exists
# here, unlike the Leonardo harness.
#
# ORDER MATTERS AND EACH STEP EARNS ITS PLACE:
#
#   1 redraw     /image-to-pixelart. Output caps at 320 in BOTH dimensions
#                (read live from the API, not from the playbook), so the battle
#                tower is banded rather than squeezed — whole, it would come
#                back 130x320.
#   2 harmonise  PixelLab reinterprets colour freely. It returned stone at
#                232 degrees hue on the wall and 170 on the battle tower —
#                blue-violet against teal — and pushed metal saturation from
#                0.49 to 0.73-0.91. Anchoring on the wall pulls it all back.
#   3 quantize   The step that actually delivers flatness. CLAUDE.md is explicit
#                that the quantize, not the redraw, is "what lands on the kit's
#                flatness": straight out of the API these measured 9-27% flat
#                with up to 42,000 colours. Also what makes the shared palette
#                EXACT rather than merely close.
#   4 key        White surround off, then dehalo.
set -euo pipefail
cd "$(dirname "$0")"

# One global scale so relative proportions survive, times a per-piece
# multiplier where a plate was framed at a different internal scale. The castle
# towers need x2.6 to put their doors in the same world as the walls' doors —
# sizing each piece to fill 320 independently would silently destroy that.
K=0.3125          # walls and gate
T=0.8125          # towers: 0.3125 x 2.6

mkdir -p out/pixellab
python lib/image_to_pixelart.py out/castle-final/H2-wall.png        out/pixellab/wall.png         --scale $K
python lib/image_to_pixelart.py out/castle-final/V3-wall-side.png   out/pixellab/wall-side.png    --scale $K
python lib/image_to_pixelart.py out/castle-final/G5-gate.png        out/pixellab/gate.png         --scale $K
python lib/image_to_pixelart.py out/castle-final/corner-tower-cut.png out/pixellab/corner-tower.png --scale $T
# Band line 290 is a cornice. Left to split evenly it would cut at 282, mid-
# storey, and the seam would show.
python lib/image_to_pixelart.py out/castle-final/T3-tower-cut.png   out/pixellab/battle-tower.png --scale $T --band-lines 290

python lib/harmonise_materials.py apply out/pixellab/*.png --out out/pl-harm --anchor out/pixellab/wall.png

python lib/quantize_shared.py out/pl-harm/*.png --out out/castle-kit --colors 48 \
  --palette-png out/castle-kit/_palette.png

# key_white rather than sprite-lab's cut_flat_background: PixelLab draws a dark
# rim into the outermost pixels of its own frame, so a "most common border
# colour" vote returns near-black, the flood starts on the rim and stops there,
# and 640px of a 68,000px plate gets cut. See lib/key_white.py.
python lib/key_white.py out/castle-kit out/castle-kit-final
for f in wall wall-side gate corner-tower battle-tower; do
  python ../sprite-lab/lib/dehalo.py out/castle-kit-final/$f.png out/castle-kit-final/$f.png --min-value 185
done

echo
echo "Kit in out/castle-kit-final. Walls key to 0px on purpose — they are tiling"
echo "strips that run to the frame edge and have no surround to remove."
