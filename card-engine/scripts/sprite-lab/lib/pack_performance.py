#!/usr/bin/env python3
"""Pack one fixed-direction PixelLab performance into a runtime strip."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("prefix")
    parser.add_argument("output_png", type=Path)
    parser.add_argument("output_json", type=Path)
    parser.add_argument("--target-body-height", type=int, required=True)
    parser.add_argument("--reference-frame", type=int, default=0)
    parser.add_argument(
        "--substitute-frame",
        action="append",
        default=[],
        metavar="DEST=SOURCE",
        help="replace a rejected runtime frame with a clean frame while preserving raw output",
    )
    args = parser.parse_args()

    files = sorted(args.input_dir.glob(f"{args.prefix}*.png"))
    if not files:
        raise SystemExit(f"no frames matching {args.prefix}*.png")
    frames = [Image.open(file).convert("RGBA") for file in files]
    if len({frame.size for frame in frames}) != 1:
        raise SystemExit("performance frames do not share one canvas size")

    substitutions: dict[int, int] = {}
    for value in args.substitute_frame:
        try:
            dest_text, source_text = value.split("=", 1)
            dest, source = int(dest_text), int(source_text)
        except ValueError as error:
            raise SystemExit(f"invalid --substitute-frame '{value}', expected DEST=SOURCE") from error
        if not (0 <= dest < len(frames) and 0 <= source < len(frames)):
            raise SystemExit(f"substitution {dest}={source} is outside 0..{len(frames) - 1}")
        substitutions[dest] = source
    for dest, source in substitutions.items():
        frames[dest] = frames[source].copy()

    reference = frames[args.reference_frame]
    reference_box = reference.getbbox()
    if reference_box is None:
        raise SystemExit("reference frame is empty")
    body_height = reference_box[3] - reference_box[1]
    scale = args.target_body_height / body_height
    source_width, source_height = reference.size
    frame_width = round(source_width * scale)
    frame_height = round(source_height * scale)

    bottoms = [frame.getbbox()[3] for frame in frames if frame.getbbox()]
    baseline_source = round(float(np.median(bottoms)))
    baseline = round(baseline_source * scale)

    resized = [
        frame.resize((frame_width, frame_height), Image.Resampling.BOX) for frame in frames
    ]
    sheet = Image.new(
        "RGBA", (frame_width * len(resized), frame_height), (0, 0, 0, 0)
    )
    for index, frame in enumerate(resized):
        sheet.alpha_composite(frame, (index * frame_width, 0))

    pixels = np.array(sheet)
    opaque = pixels[..., :3][pixels[..., 3] > 32]
    colour_count = max(2, min(256, len({tuple(pixel) for pixel in opaque.astype(int)})))
    alpha = sheet.getchannel("A").point(lambda value: 255 if value > 110 else 0)
    quantized = sheet.convert("RGB").quantize(colors=colour_count, method=Image.MEDIANCUT)
    final = quantized.convert("RGBA")
    final.putalpha(alpha)

    args.output_png.parent.mkdir(parents=True, exist_ok=True)
    final.save(args.output_png)
    metadata = {
        "image": args.output_png.name,
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "frameCount": len(frames),
        "columns": len(frames),
        "rows": 1,
        "baselineY": baseline,
        "anchor": {"x": 0.5, "y": baseline / frame_height},
        "resampledFrom": {
            "frameWidth": source_width,
            "frameHeight": source_height,
            "referenceBodyHeight": body_height,
            "colours": colour_count,
        },
        "substitutedFrames": [
            {"destination": dest, "source": source}
            for dest, source in sorted(substitutions.items())
        ],
        "note": (
            "One fixed-direction performance, uniformly area-resampled to the live "
            "hero's body height. Original canvas coordinates and shared feet baseline "
            "are preserved; render at 1:1 or upscale, never downscale at runtime."
        ),
    }
    args.output_json.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(
        f"{args.output_png} frame {source_width}x{source_height} -> "
        f"{frame_width}x{frame_height}; {len(frames)} frames; baseline {baseline}"
    )


if __name__ == "__main__":
    main()
