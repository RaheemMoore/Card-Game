#!/usr/bin/env python3
"""
Blend a character's colours toward the scene's light WITHOUT dulling him.

The brief: characters should pop. They should feel like they belong in the
courtyard's light, not be desaturated into it. So this is a lighting grade, not
a palette reduction — the same split-tone trick used to seat a film composite
into a plate:

  * highlights drift toward the scene's KEY light (warm sunlit honey)
  * shadows drift toward the scene's AMBIENT bounce (cool sky fill)
  * mid-tone saturation is LIFTED slightly to counteract the flattening that any
    grade causes

Then the result is re-quantised to the sprite's ORIGINAL colour count, so it
stays disciplined pixel art rather than becoming a blurry gradient.

What this deliberately does NOT do: lower saturation, lower contrast, or reduce
the colour count. Those would dull the character, and the whole point is that
his design is good and should stay loud. The script prints before/after metrics
so that claim is checkable rather than asserted.

Usage:
  harmonize.py <sprite.png> <out.png> [--strength 0.14] [--plate <plate.png>]
"""
import sys
import numpy as np
from PIL import Image

# Courtyard light, sampled from the painted plate: sunlit honey stone key,
# cool sky-bounce in the shadows.
KEY_LIGHT = np.array([255, 226, 170], dtype=float)
AMBIENT_SHADOW = np.array([96, 116, 150], dtype=float)
DEFAULT_STRENGTH = 0.14
SATURATION_LIFT = 1.08


def metrics(rgb: np.ndarray, mask: np.ndarray) -> dict:
    px = rgb[mask]
    mx, mn = px.max(1), px.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    lum = px.mean(1)
    return {
        'colours': len({tuple(p) for p in px.astype(int)}),
        'saturation': float(sat.mean()),
        'contrast': float(lum.std()),
        'brightness': float(lum.mean()),
    }


def harmonize(src: str, dst: str, strength: float = DEFAULT_STRENGTH) -> None:
    img = Image.open(src).convert('RGBA')
    a = np.array(img)
    rgb = a[..., :3].astype(float)
    mask = a[..., 3] > 32

    before = metrics(a[..., :3].astype(int), mask)

    # Luminance decides how much key vs ambient a pixel receives.
    lum = rgb.mean(2, keepdims=True) / 255.0
    target = AMBIENT_SHADOW + (KEY_LIGHT - AMBIENT_SHADOW) * lum
    graded = rgb * (1 - strength) + target * strength

    # Re-saturate around each pixel's own luminance so the grade doesn't wash
    # the character out — this is the step that keeps him popping.
    glum = graded.mean(2, keepdims=True)
    graded = glum + (graded - glum) * SATURATION_LIFT

    # Restore luminance contrast. Any grade toward a mid-tone compresses the
    # tonal range — the first run measured a 9% contrast loss, which the
    # verdict line correctly called dulling. Rescaling the luminance spread back
    # to the original standard deviation keeps the character reading as crisply
    # as before while still sitting in the scene's light.
    orig_lum = rgb.mean(2)
    new_lum = graded.mean(2)
    o_std = orig_lum[mask].std()
    n_std = new_lum[mask].std()
    if n_std > 1e-6:
        n_mean = new_lum[mask].mean()
        scale = o_std / n_std
        adjusted = n_mean + (new_lum - n_mean) * scale
        graded += (adjusted - new_lum)[..., None]

    graded = np.clip(graded, 0, 255)

    out = a.copy()
    out[..., :3] = graded.astype(np.uint8)
    out[~mask] = 0  # keep transparency crisp

    # Re-quantise to the original colour count so it stays pixel art.
    tmp = Image.fromarray(out, 'RGBA')
    alpha = tmp.getchannel('A')
    quant = tmp.convert('RGB').quantize(colors=max(2, min(256, before['colours'])), method=Image.MEDIANCUT)
    final = quant.convert('RGBA')
    final.putalpha(alpha)
    final.save(dst)

    after = metrics(np.array(final)[..., :3].astype(int), mask)

    print(f"{'metric':12} {'before':>9} {'after':>9}   verdict")
    for k in ('colours', 'saturation', 'contrast', 'brightness'):
        b, af = before[k], after[k]
        if k == 'colours':
            v = 'preserved' if af >= b * 0.9 else 'REDUCED — too aggressive'
        elif k in ('saturation', 'contrast'):
            v = 'kept/raised' if af >= b * 0.98 else 'DULLED — lower the strength'
        else:
            v = 'warmed' if af >= b else 'darkened'
        fmt = f"{b:9.0f} {af:9.0f}" if k == 'colours' else f"{b:9.3f} {af:9.3f}"
        print(f"{k:12} {fmt}   {v}")
    print(f"\n{dst}  (strength {strength})")


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    s = DEFAULT_STRENGTH
    for x in sys.argv[1:]:
        if x.startswith('--strength'):
            s = float(x.split('=')[1]) if '=' in x else s
    harmonize(args[0], args[1], s)
