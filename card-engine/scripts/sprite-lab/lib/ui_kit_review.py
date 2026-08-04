#!/usr/bin/env python3
"""
Build the in-context review composites for a pixel UI-chrome round.

WHY THIS EXISTS: chrome approved on a checkerboard is how you ship chrome that
vanishes against the plate. Round 1 of ui-kit-pixel looked fine as loose PNGs and
was tonally wrong the moment it sat on the courtyard — the slot read as a black
hole on light paving and the bar trough nearly disappeared. Both composites below
exist to catch exactly that, before anyone slices anything in Figma.

Writes two files per round, picked up automatically by `sprite-lab.mjs sheet`
(anything matching `review-*.png` is promoted to a full-width figure):

  review-<round>-contrast.png  every piece over the LIGHT plate and a DARK ground
  review-<round>-menu.png      the frame 9-sliced to a real menu at game scale

Usage: ui_kit_review.py <out_dir> <round_prefix> <plate.png> [corner_slice]
   eg: ui_kit_review.py out/ui-kit-pixel object-core-v2 ../../public/.../courtyard.png 32
"""
import glob
import os
import sys

from PIL import Image, ImageDraw


def nine_slice(src: str, w: int, h: int, s: int = 32, scale: int = 1) -> Image.Image:
    """Stretch a frame to w*h, keeping corners intact. `scale` thickens the
    border without changing the source art (a 128px source stretched to a
    860px panel otherwise reads spindly)."""
    im = Image.open(src).convert("RGBA")
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        s *= scale
    W, H = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    p = lambda b: im.crop(b)

    def put(img, box):
        bw, bh = box[2] - box[0], box[3] - box[1]
        if bw > 0 and bh > 0:
            out.paste(img.resize((bw, bh), Image.NEAREST), (box[0], box[1]))

    out.paste(p((0, 0, s, s)), (0, 0))
    out.paste(p((W - s, 0, W, s)), (w - s, 0))
    out.paste(p((0, H - s, s, H)), (0, h - s))
    out.paste(p((W - s, H - s, W, H)), (w - s, h - s))
    put(p((s, 0, W - s, s)), (s, 0, w - s, s))
    put(p((s, H - s, W - s, H)), (s, h - s, w - s, h))
    put(p((0, s, s, H - s)), (0, s, s, h - s))
    put(p((W - s, s, W, H - s)), (w - s, s, w, h - s))
    return out


def contrast(pieces, plate, dst):
    """Every piece on light paving (top) and a dark panel interior (bottom).
    The two grounds chrome actually has to survive."""
    n = len(pieces)
    cw, half = 260, 220
    sheet = Image.new("RGBA", (cw * n, half * 2), (0, 0, 0, 255))
    light = plate.crop((300, 900, 1420, 1110)).resize((cw * n, half))
    sheet.paste(light, (0, 0))
    ImageDraw.Draw(sheet).rectangle([0, half, cw * n, half * 2], fill=(58, 44, 34, 255))
    for i, f in enumerate(pieces):
        im = Image.open(f).convert("RGBA")
        sc = min(170 / im.width, 170 / im.height)
        im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.NEAREST)
        x = i * cw + (cw - im.width) // 2
        sheet.alpha_composite(im, (x, (half - im.height) // 2))
        sheet.alpha_composite(im, (x, half + (half - im.height) // 2))
    sheet.convert("RGB").save(dst)


def menu(frame_src, slot_src, plate, dst, s=32):
    """The frame stretched to a real Collection menu over the plate. Proves the
    9-slice tiles without seams at the size it will actually ship at."""
    cx, cy = plate.width // 2, plate.height // 2
    bg = plate.crop((cx - 640, cy - 360, cx + 640, cy + 360)).copy()
    PX, PY, PW, PH = 210, 90, 860, 560
    ImageDraw.Draw(bg, "RGBA").rectangle(
        [PX + 40, PY + 40, PX + PW - 40, PY + PH - 40], fill=(58, 44, 34, 242)
    )
    bg.alpha_composite(nine_slice(frame_src, PW, PH, s=s, scale=2), (PX, PY))
    if slot_src and os.path.exists(slot_src):
        slot = Image.open(slot_src).convert("RGBA").resize((112, 112), Image.NEAREST)
        for r in range(3):
            for c in range(6):
                bg.alpha_composite(slot, (PX + 70 + c * 124, PY + 80 + r * 124))
    bg.convert("RGB").save(dst)


def main() -> None:
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    out_dir, prefix, plate_path = sys.argv[1], sys.argv[2], sys.argv[3]
    s = int(sys.argv[4]) if len(sys.argv) > 4 else 32

    pieces = sorted(glob.glob(os.path.join(out_dir, f"{prefix}-*.png")))
    if not pieces:
        sys.exit(f"no pieces matching {prefix}-*.png in {out_dir}")
    plate = Image.open(plate_path).convert("RGBA")
    short = prefix.replace("object-", "")

    contrast(pieces, plate, os.path.join(out_dir, f"review-{short}-contrast.png"))
    # Piece 0 is the frame by construction — item_descriptions lists it first
    # BECAUSE it is the piece the whole kit depends on.
    #
    # The slot is NOT reliably at a fixed index: R2's model reordered the items,
    # so a hardcoded index 3 silently tiled the BAR into the card grid in R3 and
    # the mock looked wrong for a reason that had nothing to do with the art.
    # Pick it by shape instead — the slot is the squarest non-frame piece.
    def squareness(f):
        # Measure the CONTENT box, not the canvas. Every piece is returned on the
        # same 128x128 canvas, so canvas dimensions are identical and a
        # canvas-based test silently picked the button instead of the slot.
        im = Image.open(f).convert("RGBA")
        box = im.getbbox() or (0, 0, im.width, im.height)
        cw, ch = box[2] - box[0], box[3] - box[1]
        return abs(cw - ch) / max(cw, ch, 1)

    others = pieces[1:]
    slot = min(others, key=squareness) if others else None
    menu(pieces[0], slot, plate, os.path.join(out_dir, f"review-{short}-menu.png"), s=s)
    print(f"wrote review-{short}-contrast.png and review-{short}-menu.png")


if __name__ == "__main__":
    main()
