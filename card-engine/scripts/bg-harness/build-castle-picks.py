#!/usr/bin/env python3
"""Review sheet for Raheem's Leonardo/Gemini castle extracts — the pick-and-choose gate.

Raheem, 2026-08-09: "a folder of all my Leonardo extracts... put them in a
harness and let us choose and pick which ones would actually work and which
ones won't... make sure we have everything we need and make sure they're all an
acceptable angle and state before using any Pixel generations."

So this is a DECISION sheet, not a gallery. Every card carries the four numbers
that decide whether a plate survives the PixelLab redraw, measured here rather
than asserted:

  flatness  share of neighbouring pixels that are exactly equal. CLAUDE.md's
            structural test for "real pixel art" vs "a downsampled painting".
            The old Leonardo-downsample path measured 0.6%; the shipped kit art
            is 59.4%. These are JPEGs, so JPEG noise depresses the number a few
            points — read it comparatively, not absolutely.
  colours   high is fine going IN (PixelLab requantises), but it is the tell
            for how much photographic gradient is present.
  white bg  share of the frame border that is pure white. Anything under ~95%
            means the subject runs off the edge (correct for a tiling wall) or
            there is a painted background to cut (a problem for the towers).
  seam      wrap discontinuity vs ordinary interior discontinuity. 1.0 means an
            invisible join. Walls only.

Source images are read from Raheem's Downloads folder and are NOT copied into
the repo — they are 20 x ~250KB JPEGs and the repo is not their home. If the
folder moves, pass the new path as argv[1].

    python scripts/bg-harness/build-castle-picks.py ["C:/path/to/Castle"]
"""
import base64
import io
import os
import sys

import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\storm\Downloads\Castle"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "castle-grand-topdown")
OUT_PICKS = os.path.join(HERE, "out", "castle-picks")

# (folder, letter-prefix, tiling axis or None, section title, section note)
GROUPS = [
    ("Horizontal Walls", "H", 0, "Horizontal walls",
     "Front and back runs. The piece everything else has to match, because it is the one that repeats."),
    ("Vertical Wall", "V", 1, "Vertical walls",
     "Left and right runs. Correctly show no face band — at this camera tilt a north-south wall is almost "
     "edge-on, so all you see is the walkway."),
    ("Gate", "G", None, "Gates",
     "The front entrance, used once. Four of the five are the same arch design; one is not."),
    ("Towers", "T", None, "Towers",
     "All seven are tall multi-storey BATTLE towers in a full landscape, not corner towers. See the gap "
     "note at the bottom."),
]

# Keyed by label. verdict: pick | ok | risky | cut | gap
NOTES = {
    "H1": ("ok", "Barred windows.",
           "Same base as H5 with grilles in the openings. Reads better than shutters on a defensive wall, "
           "and the bars survive downsampling because they are high-contrast."),
    "H2": ("risky", "Shuttered windows.",
           "Wooden doors at ground level on a curtain wall is an odd read — a defensive wall does not have "
           "doors along its outside face. Fine if these are meant to be inward-facing storerooms."),
    "H3": ("risky", "Pipes and torches.",
           "Handsome, but the pipe runs are irregular across the width, so this cannot tile — repeat it and "
           "the pipework visibly restarts. Pipes want to be a separate overlay decal, not baked in."),
    "H4": ("risky", "Pipes and teal runes.",
           "Same tiling problem as H3, plus the rune glyphs differ per bay. Great source for decal art, "
           "wrong shape for a repeating wall."),
    "H5": ("pick", "The cleanest base.",
           "Lowest colour count of any wall here and the highest flatness in its group — it is the least "
           "photographic thing in the set, which is exactly what survives the redraw. Plain arched "
           "openings, even bay spacing, nothing that fights tiling."),
    "V1": ("ok", "Pipes, faint magic.",
           "Least affected by the soft band, and the most detail. Same tiling caveat as the horizontal "
           "pipe walls: the pipework does not repeat."),
    "V2": ("ok", "Pipes and teal runes.",
           "Middle option. Pipework again irregular down the strip."),
    "V3": ("pick", "The cleanest base.",
           "25k colours against V1's 88k, and the highest flatness in the whole set. Plain, tileable, "
           "and it matches H5's restraint. Carries a soft low-detail band across the parapet edges around "
           "40-60% height — measurable (0.88 detail ratio) and worth a touch-up, but minor."),
    "G1": ("risky", "Most ornate — pipes, finials, crystal swirl.",
           "Lowest flatness of the gates and the most colours. The crystal swirl is a visual effect, not "
           "architecture — it belongs as a Phaser layer over the sprite so it can animate, not baked into "
           "a static plate where it will never move."),
    "G2": ("risky", "Pipes with floating runes.",
           "Same note as G1. The runes floating above the towers will key out as loose fragments."),
    "G3": ("ok", "The odd one out — no arch.",
           "Cleanest gate by the numbers: highest flatness, fewest colours, pure white border. But it is "
           "the only gate WITHOUT the raised arch, so picking it means the other four were a different "
           "castle. Decide the silhouette first, then the finish."),
    "G4": ("pick", "Cleanest of the arch family.",
           "If the arch is the design — and four of five say it is — this is the one to take: better "
           "flatness and far fewer colours than G1/G2, with the roundels and doors intact. Watch the pale "
           "washed-out patch on the wall behind the arch; it is an artifact and will survive the redraw."),
    "G5": ("ok", "Arch with apex gem and cyan runes.",
           "Near-identical to G4 with a different crown. Same pale patch behind the arch. Pick on taste."),
    "T1": ("ok", "Copper and steam, plain crown.",
           "Clean silhouette and the calmest of the steampunk four."),
    "T2": ("ok", "Gold and orange, dark gun-deck crown.",
           "Strongest read of the steampunk set — the dark top gives the crown a clear edge against the "
           "pale stone."),
    "T3": ("ok", "Grey and copper, chimneys, figures.",
           "Has tiny people at the treeline, which is a free scale reading. They are in the landscape, "
           "not on the tower, so they cut away with the background."),
    "T4": ("ok", "Blue and gold, most ornate.",
           "Busiest of the set. Lovely, and the most detail to lose in a 320px redraw."),
    "T5": ("ok", "Brown and teal, plainest.",
           "The most restrained tower here. Least interesting, most likely to survive the redraw intact."),
    "T6": ("pick", "Teal and orange runes.",
           "Best balance in the group: clear storey banding, strong crown, glowing windows that will "
           "still read at a fraction of this size. Highest flatness of the towers bar one."),
    "T7": ("risky", "Purple, magical, flowers.",
           "The prettiest and the worst by the numbers — 156k colours and the lowest flatness of all "
           "twenty. Most photographic thing in the set, so it has the furthest to fall in the redraw."),
}

VERDICT = {
    "pick": ("Recommended", "ok"),
    "ok": ("Usable", "warn"),
    "risky": ("Works, with a catch", "risk"),
    "cut": ("Cut", "bad"),
}


def flatness(a):
    h = (a[:, 1:] == a[:, :-1]).all(2).mean()
    v = (a[1:, :] == a[:-1, :]).all(2).mean()
    return (h + v) / 2 * 100


def seam(a, axis):
    if axis == 0:
        s = np.abs(a[:, -1].astype(int) - a[:, 0].astype(int)).mean()
        inner = np.abs(a[:, 1:].astype(int) - a[:, :-1].astype(int)).mean(axis=(0, 2))
    else:
        s = np.abs(a[-1].astype(int) - a[0].astype(int)).mean()
        inner = np.abs(a[1:].astype(int) - a[:-1].astype(int)).mean(axis=(1, 2))
    return s / max(np.median(inner), 0.5)


def thumb_uri(path, box=760):
    im = Image.open(path).convert("RGB")
    im.thumbnail((box, box), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


PICKED = [
    ("H2-wall.png", "H2", "Horizontal wall", "Taken as-is.",
     "Front and back runs. Rotate the walkway band 90&deg; for the sides."),
    ("V3-wall-side.png", "V3", "Vertical wall", "Railing repaired.",
     "Rows 400&ndash;650 had the crenel pattern destroyed &mdash; railing quality measured 0.5&ndash;1.9 "
     "there against ~3.5 elsewhere, with 45- and 90-row holes where the rhythm is only 13&ndash;17. "
     "Cloned from rows 652&ndash;902, the cleanest band, a whole pattern offset away. No gap now exceeds "
     "the crenel spacing."),
    ("G5-gate.png", "G5", "Gate", "Floating runes removed.",
     "The solid rune cores came off as their own connected components. The palest glyphs sit above the "
     "white cutoff so nothing could see them &mdash; those were cleared by region, left and right of the "
     "arch, which cannot touch architecture."),
    ("corner-tower-cut.png", "&#9670;", "Corner tower", "Composited from T3, zero generations.",
     "229&times;336. T3's crown grafted onto T3's own base &mdash; the blind storey and the arched door "
     "&mdash; skipping the middle storeys. Both halves come from the same plate, so palette, angle and "
     "lighting match by construction rather than by matching. The seam lands on a cornice line and widths "
     "there are 200 and 205."),
    ("T3-tower-cut.png", "T3", "Battle tower", "Cut out, crown whole, flags removed.",
     "229&times;564, keyed on grass rather than traced. The banner poles are the crown's own corner "
     "finials carried upward, so they were severed above the rim rather than clipped &mdash; which is why "
     "the crown survives complete this time. Goes through PixelLab in three bands, not one; see below."),
]


def build():
    picks = "".join(f"""<article class="card ok">
  <div class="shot"><span class="stamp ok">{lab}</span><img src="{thumb_uri(os.path.join(OUT_PICKS, fn))}" alt="{name}"/></div>
  <div class="body">
    <div class="rowtop"><span class="tag ok">{name}</span></div>
    <h3>{head}</h3>
    <p>{body}</p>
  </div>
</article>""" for fn, lab, name, head, body in PICKED)

    sections = [f"""<section>
  <h2>Confirmed picks</h2>
  <p class="note">The four you chose, with the two repairs applied. Both fixes are exact edits to approved
    art &mdash; re-rolling either would have changed everything else on the plate and cost a generation to
    do it worse. Reproduce with <code>bash scripts/bg-harness/castle-picks.sh</code>.</p>
  <div class="grid">{picks}</div>
</section>"""]
    for folder, prefix, axis, title, note in GROUPS:
        d = os.path.join(SRC, folder)
        files = sorted(f for f in os.listdir(d) if f.lower().endswith(".jpg"))
        cards = []
        for i, fn in enumerate(files, 1):
            label = f"{prefix}{i}"
            path = os.path.join(d, fn)
            a = np.asarray(Image.open(path).convert("RGB"))
            cols = len(np.unique(a.reshape(-1, 3), axis=0))
            border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
            bg = (border.min(1) >= 246).mean() * 100
            verdict, head, body = NOTES.get(label, ("ok", "", "Not yet reviewed."))
            vlabel, tone = VERDICT[verdict]
            stats = [("flatness", f"{flatness(a):.0f}%"), ("colours", f"{cols//1000}k"),
                     ("white border", f"{bg:.0f}%")]
            if axis is not None:
                stats.append(("seam", f"{seam(a, axis):.1f}"))
            stat_html = "".join(f"<div><b>{v}</b><span>{k}</span></div>" for k, v in stats)
            cards.append(f"""<article class="card {tone}" id="{label}">
  <div class="shot"><span class="stamp {tone}">{label}</span><img src="{thumb_uri(path)}" alt="{label}"/></div>
  <div class="body">
    <div class="rowtop"><span class="tag {tone}">{vlabel}</span></div>
    <h3>{head}</h3>
    <p>{body}</p>
    <div class="stats">{stat_html}</div>
  </div>
</article>""")
        sections.append(f"""<section>
  <h2>{title}</h2>
  <p class="note">{note}</p>
  <div class="grid">{''.join(cards)}</div>
</section>""")
    return (TEMPLATE.replace("{{SECTIONS}}", "\n".join(sections))
            .replace("{{HARMONISE}}", thumb_uri(os.path.join(OUT_PICKS, "_harmonise-compare.png"), 1400)))


TEMPLATE = """<title>Castle extracts &mdash; pick and choose</title>
<style>
  :root{
    --bg:#17141c; --panel:#1d1924; --box:#231e2c; --edge:#372f44;
    --ink:#ece7dd; --muted:#9c92aa; --gold:#d9b45b; --verdigris:#57b9aa; --rust:#c0705a; --amber:#d59a4e;
    --display:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --body:ui-sans-serif,system-ui,"Segoe UI",Helvetica,Arial,sans-serif;
    --data:ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace;
  }
  @media (prefers-color-scheme: light){
    :root{ --bg:#f2eee9; --panel:#e9e3dc; --box:#fffdfa; --edge:#d3c9be;
           --ink:#231e2c; --muted:#6b6274; --gold:#8a6a1c; --verdigris:#1f7a6d; --rust:#9c4630; --amber:#8d5a12; }
  }
  :root[data-theme="dark"]{ --bg:#17141c; --panel:#1d1924; --box:#231e2c; --edge:#372f44;
    --ink:#ece7dd; --muted:#9c92aa; --gold:#d9b45b; --verdigris:#57b9aa; --rust:#c0705a; --amber:#d59a4e; }
  :root[data-theme="light"]{ --bg:#f2eee9; --panel:#e9e3dc; --box:#fffdfa; --edge:#d3c9be;
    --ink:#231e2c; --muted:#6b6274; --gold:#8a6a1c; --verdigris:#1f7a6d; --rust:#9c4630; --amber:#8d5a12; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;
       line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1240px;margin:0 auto;padding:48px 22px 88px;display:flex;flex-direction:column;gap:46px}
  h1{font-family:var(--display);font-weight:600;font-size:clamp(30px,4.6vw,46px);margin:0;line-height:1.1}
  h2{font-family:var(--display);font-weight:600;font-size:29px;margin:0;line-height:1.15}
  h3{font-family:var(--display);font-weight:600;font-size:20px;margin:0;line-height:1.25}
  p{margin:0}
  .eyebrow{font-family:var(--data);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
  .sub{color:var(--muted);max-width:70ch}
  section{display:flex;flex-direction:column;gap:16px}
  .note{color:var(--muted);max-width:74ch}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:18px}
  .card{background:var(--panel);border:1px solid var(--edge);border-radius:3px;overflow:hidden;
        display:flex;flex-direction:column;border-top-width:3px}
  .card.ok{border-top-color:var(--verdigris)} .card.warn{border-top-color:var(--muted)}
  .card.risk{border-top-color:var(--amber)} .card.bad{border-top-color:var(--rust)}
  .shot{background:#fff;position:relative;line-height:0}
  .shot img{width:100%;height:auto;display:block}
  .stamp{position:absolute;top:0;left:0;font-family:var(--display);font-size:23px;line-height:1;
         padding:8px 13px;background:var(--bg);color:var(--ink);
         border-right:1px solid var(--edge);border-bottom:1px solid var(--edge)}
  .stamp.ok{color:var(--verdigris)} .stamp.risk{color:var(--amber)} .stamp.bad{color:var(--rust)}
  .body{padding:16px 18px;display:flex;flex-direction:column;gap:9px;flex:1}
  .rowtop{display:flex;gap:10px;flex-wrap:wrap}
  .tag{font-family:var(--data);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
       padding:3px 8px;border-radius:2px;border:1px solid currentColor}
  .tag.ok{color:var(--verdigris)} .tag.warn{color:var(--muted)}
  .tag.risk{color:var(--amber)} .tag.bad{color:var(--rust)}
  .body p{font-size:14.5px;color:var(--muted)}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(66px,1fr));gap:1px;margin-top:auto;
         background:var(--edge);border:1px solid var(--edge);border-radius:2px;overflow:hidden}
  .stats div{background:var(--box);padding:8px 9px;display:flex;flex-direction:column;gap:1px}
  .stats b{font-family:var(--data);font-size:15px;font-variant-numeric:tabular-nums;line-height:1}
  .stats span{font-size:10px;color:var(--muted);letter-spacing:.03em}

  .call{background:var(--panel);border:1px solid var(--edge);border-left:3px solid var(--gold);
        border-radius:3px;padding:22px 24px;display:flex;flex-direction:column;gap:12px}
  .call.gap{border-left-color:var(--rust)}
  .call .lead{font-family:var(--display);font-size:20px;line-height:1.45}
  .call p{max-width:74ch}
  code{font-family:var(--data);font-size:13px;color:var(--gold)}
  ul.plain{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
  ul.plain li{padding-left:18px;position:relative;color:var(--muted);font-size:15px}
  ul.plain li::before{content:"";position:absolute;left:0;top:.62em;width:7px;height:7px;
                      background:var(--gold);border-radius:1px}
</style>

<div class="wrap">
  <div>
    <div class="eyebrow">Gemini 2.5 Flash Image via Leonardo &middot; 20 extracts &middot; 9 Aug 2026</div>
    <h1>Pick and choose</h1>
    <p class="sub">Every extract, grouped by piece, with the four numbers that decide whether it survives
      the PixelLab redraw. Flatness is the structural test: real pixel art has flat neighbouring pixels, a
      downsampled painting does not. These are JPEGs, so read flatness comparatively &mdash; the shipped
      kit art sits at 59%.</p>
  </div>

  <div class="call">
    <p class="lead">Angle first: all twenty hold it. Not one drifted to isometric or elevation.</p>
    <p>Feeding a correct plate back in as a reference and asking for changes holds the projection far
      better than describing it ever did. The choices below are therefore about tiling, cleanliness and
      consistency &mdash; not about whether the angle survived.</p>
    <p><b>Masters checked.</b> All twenty downloads are byte-identical to what the Leonardo API serves. For
      <code>gemini-2.5-flash-image</code> the CDN file <em>is</em> the original and it is a JPEG &mdash;
      there is no higher-quality version to fetch. Verified, not assumed:
      <code>node scripts/bg-harness/fetch-masters.mjs match</code>.</p>
  </div>

  {{SECTIONS}}

  <section>
    <h2>Consistency: one stone, one metal</h2>
    <p class="note">Your read was right and it measures. Two groups: the walls and gate are
      <b>gold</b> (metal hue ~29&deg;, saturation ~0.48), both towers are <b>bronze</b> (hue ~24&deg;,
      saturation ~0.60). Separately the gate's stone is much darker and cooler than the walls'.</p>
    <div class="scroll"><table>
      <tr><th>piece</th><th>metal hue</th><th>metal sat</th><th>stone value</th><th>stone warmth</th></tr>
      <tr><td>H2 wall</td><td class="count">29.4</td><td class="count">0.49</td><td class="count">0.69</td><td class="count">0.071</td></tr>
      <tr><td>V3 side wall</td><td class="count">29.1</td><td class="count">0.48</td><td class="count">0.68</td><td class="count">0.075</td></tr>
      <tr><td>G5 gate</td><td class="count">28.8</td><td class="count">0.47</td><td class="count">0.51</td><td class="count">&minus;0.004</td></tr>
      <tr><td>T3 tower</td><td class="count bad-word">23.5</td><td class="count bad-word">0.61</td><td class="count">0.54</td><td class="count">0.051</td></tr>
      <tr><td>corner tower</td><td class="count bad-word">24.7</td><td class="count bad-word">0.59</td><td class="count">0.53</td><td class="count">0.047</td></tr>
    </table></div>
    <p><code>lib/harmonise_materials.py</code> classifies pixels by material, measures each plate's own
      median, and moves only that material toward a shared target &mdash; metal by hue and saturation,
      stone by value and warmth. Timber, stained glass and glow are left alone because they are meant to
      vary. Result:</p>
    <div class="stats" style="max-width:720px">
      <div><b>5.9 &rarr; 0.9</b><span>metal hue spread, degrees</span></div>
      <div><b>0.14 &rarr; 0.01</b><span>metal saturation spread</span></div>
      <div><b>0.18 &rarr; 0.02</b><span>stone value spread</span></div>
    </div>
    <img src="{{HARMONISE}}" alt="before and after harmonisation" style="width:100%;height:auto;border:1px solid var(--edge);border-radius:3px"/>
    <p><b>Which target?</b> <b>A</b> uses the set median, which keeps the gate's depth and brings both
      towers onto the walls' gold. <b>B</b> anchors on the wall, which brightens everything but washes the
      gate out. I would take <b>A</b>. Either is one command to redo, so this is not a decision you are
      stuck with.</p>
    <p class="note">Why not a single global quantize across all five: median cut allocates colours by
      area, so the walls &mdash; mostly pale stone &mdash; would swallow the budget and the towers' copper
      would collapse to two or three muddy steps. It also cannot tell stone from timber from stained
      glass. Material-aware beats palette-wide here. A shared-palette quantize still happens, but AFTER
      the redraw, as the final lock.</p>
  </section>

  <div class="call">
    <p class="lead">How these get through PixelLab without coming back tiny or cropped</p>
    <p><b>The constraint, read live from the API rather than from our notes:</b>
      <code>/image-to-pixelart</code> caps output at <b>320 in width AND 320 in height, independently</b>
      (input caps at 1280 each). That is the whole problem. The tower is 229&times;564 &mdash; a 1:2.5
      strip &mdash; so a single call has to fit 564 into 320 and returns a <b>130&times;320</b> tower.
      Tiny, exactly as feared.</p>
    <p><b>So tall pieces get banded, not squeezed.</b> Three calls down the tower, split at the storey
      cornices so the seams land on lines that are already there, each returning 320&times;~263, stacked
      back to <b>320&times;788</b>. This is not a new idea in this kit &mdash;
      <code>tower-cap-v2</code> (288&times;224) and <code>tower-base-v2</code> (288&times;192) already
      stack exactly this way. Cost is 3 generations instead of 1, roughly three cents.</p>
    <div class="stats" style="max-width:720px">
      <div><b>100</b><span>hero, world px</span></div>
      <div><b>256</b><span>wall band &mdash; 2.6&times; hero, matches the references</span></div>
      <div><b>320&times;788</b><span>battle tower &mdash; 7.9&times; hero, a landmark</span></div>
      <div><b>3</b><span>i2p calls for the tower, 1 each for the walls</span></div>
    </div>
    <p>The walls have the opposite problem and it is not a problem: they are wide and short, so one call
      each fits comfortably and the reduction is a genuine downsample rather than a squeeze.</p>
    <p class="note">On resolution: T3 measures 1.7% flatness against 48&ndash;64% for the other three,
      because it was drawn small inside a landscape while they filled their frames. Your call to carry on
      is reasonable &mdash; PixelLab redraws rather than downsamples, so the design survives even when the
      source pixels are soft. Worth knowing it is a real difference and not a rendering artifact, and that
      regenerating the tower alone on white would close it for one generation if the redraw disappoints.</p>
  </div>

  <div class="call gap">
    <p class="lead">The plates were drawn at different internal scales. The tower needs &times;2.6.</p>
    <p>Composited against the wall, the tower's arched door only lines up with the wall's doors at about
      <b>&times;2.6</b>, and its corner finials come closest to the wall's merlons there too. At native
      size the tower is roughly a third of the world the walls live in &mdash; which is invisible until
      you put them side by side, and fatal once you do.</p>
    <p>That multiplier belongs in the manifest at placement time. The asset itself stays native, so the
      number stays changeable when you see it in the scene.</p>
    <p class="note">This is the thing to watch on every future plate: Leonardo has no idea what scale
      anything else was drawn at. Two plates that each look correct alone can be a third of each other's
      size, and the only way to catch it is to composite them and look at a human-scale feature &mdash; a
      door, a step, a merlon.</p>
  </div>

  <div class="call">
    <p class="lead">Before any PixelLab spend</p>
    <ul class="plain">
      <li>Pull the full-quality masters from the Leonardo generations API rather than these downloads
        &mdash; your call, and correct. Worth knowing up front: for <code>gemini-2.5-flash-image</code>
        the CDN file <em>is</em> the master and it is a JPEG, so there may be no cleaner original. I will
        check per image and say plainly which ones gained anything.</li>
      <li>Reconcile the walkway texture. The horizontal walls use brick coursing, the vertical walls use
        cobble. They meet at every corner, so one has to give.</li>
      <li>Decide the gate silhouette &mdash; arch or no arch. Four of five say arch; G3 is the only one
        without, and it is also the cleanest by the numbers.</li>
      <li>Anything glowing, swirling or floating comes off the plate and becomes a Phaser layer. Baked
        into a sprite it can never move, and this is the one thing we get for free.</li>
    </ul>
  </div>
</div>
"""


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, "castle-picks.html")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(build())
    print(f"wrote {dest}  ({os.path.getsize(dest)/1024:.0f} KB)")
