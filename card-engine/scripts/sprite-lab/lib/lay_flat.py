#!/usr/bin/env python3
"""
Lay a flat-drawn texture down into the plate's ground plane.

A rug, a floor patch or a sparring circle is generated in TRUE PLAN VIEW —
square to the frame, seen from directly above — because that is the only way the
art is reusable anywhere. The courtyard floor is not a plan view: it is a raised
three-quarter plane, so dropping a flat rug straight on reads as a rug standing
slightly up off the floor.

**An affine shear cannot fix this.** A shear moves parallel edges in parallel, so
the far edge stays exactly as wide as the near edge, and the rug reads as leaning
rather than lying. Foreshortening requires the far edge to be genuinely SHORTER,
which is a projective transform — eight coefficients, not six.

`lay_symmetric()` is the standard: a symmetric trapezoid, no sideways lean, gentle
recession only. Reach for the free-corner form only when the surface itself is
turned to match a wall.

Usage:
  lay_flat.py <in.png> <out.png> <width> <height> [taper] [--pad N]

  width, height   the rug's footprint ON THE PLATE, in plate pixels
  taper           far-edge width as a fraction of the near edge (default 0.86;
                  1.0 is no recession at all, 0.7 is severe)
"""
import sys
from PIL import Image


def _coeffs(src, dst):
    """Solve the 8 projective coefficients mapping dst -> src.

    PIL's PERSPECTIVE transform samples the SOURCE for each destination pixel, so
    the system is set up in that direction. Solved with plain Gaussian
    elimination to keep this dependency-free — numpy is not worth a hard
    requirement for one 8x8.
    """
    m = []
    for (sx, sy), (dx, dy) in zip(src, dst):
        m.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy, sx])
        m.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy, sy])

    n = 8
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[piv][col]) < 1e-12:
            raise ValueError("degenerate quad — check the corner points")
        m[col], m[piv] = m[piv], m[col]
        p = m[col][col]
        m[col] = [v / p for v in m[col]]
        for r in range(n):
            if r == col:
                continue
            f = m[r][col]
            if f:
                m[r] = [a - f * b for a, b in zip(m[r], m[col])]
    return [m[r][n] for r in range(n)]


def lay_symmetric(img, width, height, taper=0.86, pad=6):
    """Symmetric trapezoid: far (top) edge narrower, no sideways lean."""
    w, h = img.width, img.height
    src = [(0, 0), (w, 0), (w, h), (0, h)]

    inset = width * (1 - taper) / 2.0
    # Destination quad in the OUTPUT canvas, padded so the fringe is not clipped.
    dst = [
        (pad + inset,          pad),           # far left
        (pad + width - inset,  pad),           # far right
        (pad + width,          pad + height),  # near right
        (pad,                  pad + height),  # near left
    ]

    out_w, out_h = int(width + pad * 2), int(height + pad * 2)
    return img.transform(
        (out_w, out_h),
        Image.PERSPECTIVE,
        _coeffs(src, dst),
        resample=Image.BICUBIC,
    )


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    pad = 6
    if "--pad" in sys.argv:
        pad = int(sys.argv[sys.argv.index("--pad") + 1])

    src, dst = args[0], args[1]
    width, height = int(args[2]), int(args[3])
    taper = float(args[4]) if len(args) > 4 else 0.86

    img = Image.open(src).convert("RGBA")
    out = lay_symmetric(img, width, height, taper, pad)
    out.save(dst)
    print(f"{dst}  {out.width}x{out.height}  (footprint {width}x{height}, taper {taper})")


if __name__ == "__main__":
    main()
