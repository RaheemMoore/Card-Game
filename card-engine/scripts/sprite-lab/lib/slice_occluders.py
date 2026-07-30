#!/usr/bin/env python3
"""
Cut OCCLUDERS out of the painted courtyard plate.

THE PROBLEM. The plate is one image at depth 0 and every character sits at
setDepth(y) in the 300-1040 band, so the hero is painted over the entire world,
always. He walks "through" lamp posts, tables and bushes. Raheem, with
screenshots: "if you walk behind things it should show."

THE TRICK. Cut each object out as its own transparent PNG and draw it at the
depth of ITS OWN GROUND LINE. Characters already sort by their ground line, so
the comparison is automatic — stand above an object's base and it covers you,
stand below and you cover it. This is ordinary top-down occlusion.

WHY IT IS FORGIVING. The cutout is drawn on top of a plate that STILL CONTAINS
the object. Extra pixels in a mask are therefore identical to what is already
underneath, and invisible. Only cutting too TIGHT shows, as a character leaking
through the gap. So err generous — the one exception being a margin wide enough
that a character standing behind-but-beside the object gets wrongly covered.

WHY SHAPES AND NOT COLOUR KEYING. slice_plate.py keys the water on cyan, which
works because water is the one strongly saturated thing on this plate. The same
approach was tried here first and measurably fails:

  * The background was estimated from each box's border ring. For the lamps that
    ring clips wall and greenery, so the estimate came back dark ([123,106,90])
    and the mask INVERTED — paving scored distance 122, the post scored 28. It
    kept the floor and threw away the lamp.
  * Even with a correct background the crates do not separate: object distance
    56 against paving 32. Painted wood on painted stone is the same colour.

So each occluder is a hand-authored union of primitives instead. Deterministic,
tweakable, and there is no heuristic left to debug.

WHY BBOX-CROPPED, unlike water.png which is full-plate so it composites at (0,0)
with no offset bookkeeping: that is right for ONE layer and wrong for a dozen.
A full 1536x1152 RGBA texture is ~7 MB on the GPU. These crop to their own
bounds and the manifest carries the offset instead.

Output:
  <out_dir>/<id>.png     the object, transparent elsewhere, cropped to its bounds
  <out_dir>/occluders.json   id, x, y, width, height, groundY for each

Usage: slice_occluders.py <plate.png> <out_dir> [--qa qa_sheet.png]
"""
import json
import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ─────────────────────────────────────────────────────────────────────────────
# The occluder table.
#
# shapes   union of primitives, in PLATE coordinates:
#            ("ellipse", x0, y0, x1, y1)
#            ("poly", [(x, y), ...])
# groundY  where the object MEETS THE PAVING. This is the sort key and the whole
#          point: NOT the bottom of the shape and NOT its centre. For the lamps
#          it is the foot of the post, ~110px BELOW the crystal, because the
#          posts lean down-screen.
#
# HOW TIGHT TO DRAW. Extra pixels are invisible where they land on the object's
# own painted surroundings, because the cutout duplicates the plate exactly. They
# only hurt where a character could stand BEHIND the object but beside it, and be
# wrongly covered. So: tight around the free-standing props in open paving, and
# deliberately loose around the tent and booth, whose spare margin falls on wall
# and greenery outside WALKABLE (x 200-1340, y 300-1040) where nobody can stand.
# ─────────────────────────────────────────────────────────────────────────────
OCCLUDERS = [
    # Crystal lamps — a gold finial, a flared petal collar around the crystal,
    # and a tapered post leaning down-screen. The thing Raheem complained about.
    #
    # The collar is WIDE AND FLAT, not round. A first pass used a tall circular
    # ellipse for the head, which reached ~40px above and below the petals into
    # open paving — and that paving then occluded the hero, cutting him off at
    # the neck with a hard horizontal edge. Height here matters far more than
    # width: too wide only eats the object's own shadow, too tall eats floor
    # someone is standing on.
    {"id": "lamp-upper-left", "groundY": 493, "shapes": [
        ("ellipse", 302, 395, 384, 445), ("ellipse", 321, 367, 353, 397),
        ("poly", [(335, 433), (365, 433), (371, 495), (341, 497)])]},
    {"id": "lamp-mid-left", "groundY": 684, "shapes": [
        ("ellipse", 285, 588, 357, 638), ("ellipse", 299, 568, 322, 590),
        ("poly", [(318, 630), (344, 630), (346, 686), (320, 688)])]},
    {"id": "lamp-lower-left", "groundY": 1042, "shapes": [
        ("ellipse", 297, 938, 387, 996), ("ellipse", 315, 916, 341, 940),
        ("poly", [(330, 988), (358, 988), (364, 1044), (334, 1046)])]},
    {"id": "lamp-lower-right", "groundY": 1042, "shapes": [
        ("ellipse", 1042, 934, 1132, 992), ("ellipse", 1063, 912, 1089, 936),
        ("poly", [(1070, 984), (1098, 984), (1098, 1044), (1068, 1046)])]},

    # Right-hand market props.
    {"id": "brazier", "groundY": 626, "shapes": [
        ("poly", [(1150, 558), (1202, 556), (1206, 622), (1148, 628)]),
        ("ellipse", 1166, 546, 1188, 562)]},
    {"id": "produce-table", "groundY": 772, "shapes": [
        ("poly", [(1155, 700), (1248, 688), (1254, 758), (1160, 774)])]},
    {"id": "water-barrel", "groundY": 835, "shapes": [
        ("ellipse", 1216, 768, 1274, 842)]},

    # South edge greenery and crates.
    {"id": "bush-south", "groundY": 1027, "shapes": [
        ("ellipse", 478, 935, 655, 1035)]},
    {"id": "crates-south", "groundY": 1033, "shapes": [
        ("poly", [(885, 978), (940, 946), (1012, 976), (1006, 1036), (893, 1036)])]},
    # Not an ellipse: this one is a low band hugging the south-east wall, and an
    # ellipse around it swallowed ~40px of open paving above the leaves, which
    # would have hidden anyone walking past. Traced along its actual top edge.
    # groundY MATCHES ITS COLLIDER'S FRONT EDGE (scenery.ts bush-south-east,
    # y 1005 + h 30/2 = 1020). It was first set to 1038, the visual front of the
    # leaves, which left an 18px band below the collider where the player could
    # stand and be swallowed by the bush with only his hair showing. Whenever a
    # thing has both a collider and an occluder, the sort line belongs on the
    # collider's front edge: the moment you step clear of an object you should
    # draw in front of it.
    {"id": "bush-south-east", "groundY": 1020, "shapes": [
        ("poly", [(1126, 962), (1182, 946), (1242, 960), (1310, 952),
                  (1310, 1048), (1126, 1048)])]},

    # The two stall structures — the "stand behind the counter" win. Drawn loose
    # on purpose; their slack falls on the wall and the greenery beyond x 1340,
    # which is outside WALKABLE.
    {"id": "awning-tent", "groundY": 500, "shapes": [
        ("poly", [(1246, 128), (1436, 196), (1436, 336), (1306, 476),
                  (1196, 436), (1184, 296)])]},
    {"id": "booth", "groundY": 668, "shapes": [
        ("poly", [(1240, 470), (1458, 428), (1470, 646), (1292, 684), (1238, 604)])]},

    # The fountain. You can never walk INTO it — it has a collider — so all this
    # has to do is cover someone standing behind the far rim.
    {"id": "fountain", "groundY": 655, "shapes": [
        ("ellipse", 628, 468, 912, 668)]},
]


def shape_bounds(shapes):
    xs, ys = [], []
    for s in shapes:
        if s[0] == "ellipse":
            xs += [s[1], s[3]]
            ys += [s[2], s[4]]
        else:
            xs += [p[0] for p in s[1]]
            ys += [p[1] for p in s[1]]
    return min(xs), min(ys), max(xs), max(ys)


def rasterise(shapes, origin, size) -> Image.Image:
    """Union the primitives into an 8-bit mask, in local (cropped) coordinates."""
    ox, oy = origin
    img = Image.new("L", size, 0)
    d = ImageDraw.Draw(img)
    for s in shapes:
        if s[0] == "ellipse":
            d.ellipse([s[1] - ox, s[2] - oy, s[3] - ox, s[4] - oy], fill=255)
        else:
            d.polygon([(x - ox, y - oy) for x, y in s[1]], fill=255)
    return img


def refine(bgr: np.ndarray, shape: np.ndarray) -> np.ndarray:
    """Snap the authored shape onto the painted edges, via watershed.

    The authored shape says roughly where the object is; watershed decides where
    it actually ENDS, by flooding from a shrunken core out to a grown boundary
    and letting image gradients stop it. Cartoon art with dark outline strokes is
    the ideal case for this.

    Tried and rejected first: colour distance from a local background estimate
    (inverted the mask on the lamps), and GrabCut (kept paving wherever the
    object was also warm stone). Watershed is the best of the three, and still
    cannot separate pale stone blended into pale stone — see the module docstring.
    """
    k = np.ones((5, 5), np.uint8)
    core = cv2.erode(shape.astype(np.uint8), k, iterations=4) > 0
    outside = cv2.dilate(shape.astype(np.uint8), k, iterations=3) == 0
    if not core.any():
        return shape

    markers = np.zeros(bgr.shape[:2], np.int32)
    markers[outside] = 1
    markers[core] = 2
    # Bilateral first: flattens paint texture without softening the outlines,
    # which is exactly what watershed wants to follow.
    cv2.watershed(cv2.bilateralFilter(bgr, 9, 75, 75), markers)
    fg = markers == 2

    # Largest blob only. Watershed can leave detached slivers of floor that
    # would hover over a character as loose scraps.
    n, lab = cv2.connectedComponents(fg.astype(np.uint8))
    if n > 1:
        sizes = [(lab == i).sum() for i in range(1, n)]
        fg = lab == int(np.argmax(sizes)) + 1
    return fg


def build(plate: Image.Image, spec: dict):
    # Margin for the watershed to work in and for the feather to fall off.
    pad = 30
    bx0, by0, bx1, by1 = shape_bounds(spec["shapes"])
    x0, y0 = max(bx0 - pad, 0), max(by0 - pad, 0)
    x1, y1 = min(bx1 + pad, plate.width), min(by1 + pad, plate.height)

    shape = np.array(rasterise(spec["shapes"], (x0, y0), (x1 - x0, y1 - y0))) > 127
    if not shape.any():
        raise SystemExit(f'{spec["id"]}: mask is empty — check the shape coordinates')

    bgr = np.array(plate.crop((x0, y0, x1, y1)).convert("RGB"))[:, :, ::-1].copy()
    fg = shape if spec.get("refine") is False else refine(bgr, shape)

    ys, xs = np.nonzero(fg)
    cx0, cy0 = max(int(xs.min()) - 1, 0), max(int(ys.min()) - 1, 0)
    cx1, cy1 = min(int(xs.max()) + 2, x1 - x0), min(int(ys.max()) + 2, y1 - y0)
    fg = fg[cy0:cy1, cx0:cx1]
    x0, y0, x1, y1 = x0 + cx0, y0 + cy0, x0 + cx1, y0 + cy1
    mask = Image.fromarray((fg * 255).astype(np.uint8), mode="L")

    cut = plate.convert("RGBA").crop((x0, y0, x1, y1))
    # A single pixel of feather. Enough to kill the stair-stepped edge, not
    # enough to leave a translucent halo of paving over a character behind it.
    cut.putalpha(mask.filter(ImageFilter.GaussianBlur(0.8)))

    return cut, {
        "id": spec["id"],
        "x": x0,
        "y": y0,
        "width": x1 - x0,
        "height": y1 - y0,
        "groundY": spec["groundY"],
        "coverage": round(float((np.array(mask) > 127).mean()), 3),
    }


def qa_sheet(cuts, path):
    """Every cutout on magenta, so a bad mask is obvious at a glance.

    Judging these by reading coverage numbers does not work — a mask can be the
    right size and the wrong shape. Look at them.
    """
    pad, cols = 12, 5
    rows = (len(cuts) + cols - 1) // cols
    cw = max(c.width for c, _ in cuts) + pad
    ch = max(c.height for c, _ in cuts) + pad + 14
    sheet = Image.new("RGBA", (cw * cols, ch * rows), (255, 0, 255, 255))
    d = ImageDraw.Draw(sheet)
    for i, (cut, meta) in enumerate(cuts):
        ox, oy = (i % cols) * cw + pad // 2, (i // cols) * ch + pad // 2
        sheet.alpha_composite(cut, (ox, oy))
        d.text((ox, oy + ch - 16), f'{meta["id"]} {meta["coverage"]}', fill=(0, 0, 0, 255))
    sheet.save(path)
    print(f"{path}  QA sheet — LOOK at this before trusting any of it")


def main(plate_path: str, out_dir: str, qa_path=None) -> None:
    os.makedirs(out_dir, exist_ok=True)
    plate = Image.open(plate_path)

    cuts, manifest = [], []
    for spec in OCCLUDERS:
        cut, meta = build(plate, spec)
        cut.save(os.path.join(out_dir, f'{meta["id"]}.png'))
        cuts.append((cut, meta))
        manifest.append(meta)
        print(f'{meta["id"]:18} {meta["width"]:>4}x{meta["height"]:<4} '
              f'at ({meta["x"]},{meta["y"]})  groundY {meta["groundY"]:>4}  '
              f'coverage {meta["coverage"]}')

    with open(os.path.join(out_dir, "occluders.json"), "w") as f:
        json.dump({
            "plate": os.path.basename(plate_path),
            "plateSize": {"width": plate.width, "height": plate.height},
            "occluders": manifest,
            "note": (
                "Cut from the plate, so they match it exactly. Draw each at (x,y) "
                "with origin (0,0) and depth = groundY. Re-run if the plate is "
                "regenerated: every box is traced by hand, not derived."
            ),
        }, f, indent=2)
    print("occluders.json")

    if qa_path:
        qa_sheet(cuts, qa_path)


if __name__ == "__main__":
    args = sys.argv[1:]
    qa = None
    if "--qa" in args:
        i = args.index("--qa")
        qa = args[i + 1]
        del args[i:i + 2]
    main(args[0], args[1], qa)
