#!/usr/bin/env python3
"""Prepare the user's Leonardo sky as a clean 16:9 proof plate.

The supplied square reference contains an excellent clear atmosphere above the
sun line and a dense cloud field below it. This script keeps only x=0..910 and
y=0..512, an exact 16:9 crop that preserves the sun near the lower-left edge
while excluding the cloud field, then exports the 1280x720 harness plate.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: prepare_user_sky.py <source.png> <output.png>")
        return 2

    source_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()
    source = Image.open(source_path).convert("RGB")
    if source.width < 910 or source.height < 512:
        raise ValueError(f"expected at least 910x512, got {source.size}")

    plate = source.crop((0, 0, 910, 512))
    plate = plate.resize((1280, 720), Image.Resampling.LANCZOS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plate.save(output_path, optimize=True)
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
