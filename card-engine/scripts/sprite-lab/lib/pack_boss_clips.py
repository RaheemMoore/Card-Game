#!/usr/bin/env python3
"""
Pack one boss's animation clips into horizontal strip sheets.

Simpler than pack.py — a boss on a frontal stage needs ONE direction, one strip
per clip, no direction rows. But it enforces the rule that matters most, and
that pack.py learned the hard way:

  ONE SHARED CROP BOX ACROSS EVERY CLIP.

`SpriteClipPlayer` derives its `aspectRatio` from `clip.frame`, so two clips
packed to different boxes make the boss visibly change size the instant she
switches from idle to attack. Cropping each frame to its own alpha bounds — the
obvious thing to do — guarantees that bug, because a raised-arms frame has
different bounds than a standing one. It also makes the figure jitter within a
single clip.

So the box is the UNION of every frame's alpha bounding box across every clip,
plus a margin, and every frame is pasted into that box at its original offset.

THE BOTTOM EDGE IS SPECIAL, AND IT IS NOT PART OF THE UNION.

The box's bottom is the GROUND LINE, taken from one nominated clip (idle) — not
from the union of all frames. Effects routinely paint below the feet: the
Debt-Bearer's attack throws flame 29px past her own soles. Including that in
the union pushes the box bottom down, and because the stage anchors her
platform to the box bottom, the standing pose then hovers 33px above the
ground she is supposed to be planted on. That is the exact "boss is floating"
complaint this whole effort exists to fix, reintroduced by the packer.

Anything below the ground line is clipped on purpose. On a flat stage, fire
beneath the soles is fire underneath the floor, and it should not render.

Usage: pack_boss_clips.py <frames_dir> <out_dir> <ground_clip> <clip> [<clip> ...]
"""
import sys
import os
import json
from PIL import Image

# Breathing room so the stage's shake and lunge transforms never clip an edge
# pixel. 4px matched the existing shipped crop.
MARGIN = 4


def frames_for(frames_dir, clip):
    """Every frame of one clip, in order."""
    # A boss is a CHARACTER and its frames carry a direction label ("-south-").
    # An OBJECT prop has no direction to label -- a 1-direction object animates
    # its single internal face -- so sprite-lab writes those frames "-unknown-".
    # Both are the same shape of thing to pack, so accept either rather than
    # forcing a rename that would throw away the provenance of which it was.
    prefixes = [f"anim-{clip}-south-", f"anim-{clip}-unknown-"]
    names = sorted(n for n in os.listdir(frames_dir)
                   if any(n.startswith(x) for x in prefixes) and n.endswith(".png"))
    if not names:
        raise SystemExit(
            f"no frames found for clip '{clip}' "
            f"(looked for {' or '.join(x + '*.png' for x in prefixes)})"
        )
    return [os.path.join(frames_dir, n) for n in names]


def main():
    if len(sys.argv) < 5:
        raise SystemExit(__doc__)
    frames_dir, out_dir, ground_clip = sys.argv[1], sys.argv[2], sys.argv[3]
    clips = sys.argv[4:]
    if ground_clip not in clips:
        raise SystemExit(f"ground clip '{ground_clip}' must also be listed in the clips")
    os.makedirs(out_dir, exist_ok=True)

    loaded = {c: [Image.open(p).convert("RGBA") for p in frames_for(frames_dir, c)]
              for c in clips}

    canvas_sizes = {img.size for imgs in loaded.values() for img in imgs}
    if len(canvas_sizes) != 1:
        # Frames from one character should all share the source canvas. If they
        # do not, offsets are not comparable and the union box is meaningless.
        raise SystemExit(f"frames have differing canvas sizes: {canvas_sizes}")

    # The union box. Computed across EVERY frame of EVERY clip — that is the
    # whole point; per-clip boxes are what this script exists to prevent.
    boxes = []
    for imgs in loaded.values():
        for img in imgs:
            bbox = img.getbbox()
            if bbox:
                boxes.append(bbox)
    if not boxes:
        raise SystemExit("every frame is fully transparent")

    cw, ch = canvas_sizes.pop()
    left = max(0, min(b[0] for b in boxes) - MARGIN)
    top = max(0, min(b[1] for b in boxes) - MARGIN)
    right = min(cw, max(b[2] for b in boxes) + MARGIN)

    # Ground line from the nominated clip only — see the module docstring.
    ground_boxes = [img.getbbox() for img in loaded[ground_clip] if img.getbbox()]
    ground = max(b[3] for b in ground_boxes)
    bottom = min(ch, ground + MARGIN)
    fw, fh = right - left, bottom - top

    below = max((b[3] for b in boxes), default=0) - ground
    if below > 0:
        print(f"note: {below}px of effect below the {ground_clip} ground line is "
              f"clipped by design (fire under the floor).")

    report = {"frameBox": {"width": fw, "height": fh}, "clips": {}}

    for clip, imgs in loaded.items():
        sheet = Image.new("RGBA", (fw * len(imgs), fh), (0, 0, 0, 0))
        for i, img in enumerate(imgs):
            sheet.paste(img.crop((left, top, right, bottom)), (i * fw, 0))
        out = os.path.join(out_dir, f"sprite-{clip}.png")
        sheet.save(out)

        # Guard against the packer-crop defect that once shipped 30% of a horse
        # missing: if any opaque pixel sits on a frame's outer edge, the union
        # box clipped the figure.
        clipped = []
        for i in range(len(imgs)):
            fr = sheet.crop((i * fw, 0, (i + 1) * fw, fh))
            b = fr.getbbox()
            # Bottom edge excluded: clipping below the ground line is the
            # documented intent, so including it would flag every attack frame
            # and train us to ignore this warning.
            if b and (b[0] <= 0 or b[1] <= 0 or b[2] >= fw):
                clipped.append(i)

        report["clips"][clip] = {
            "frameCount": len(imgs),
            "path": out,
            "clippedFrames": clipped,
        }
        flag = f"  !! CLIPPED at frames {clipped}" if clipped else ""
        print(f"{clip}: {len(imgs)} frames -> {out} ({fw}x{fh} each){flag}")

    print(f"\nSHARED frame box: {fw}x{fh} — put this on EVERY clip in the manifest.")
    print(json.dumps(report["clips"], indent=1))


if __name__ == "__main__":
    main()
