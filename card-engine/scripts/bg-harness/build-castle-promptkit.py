#!/usr/bin/env python3
"""The castle prompt kit — the three plates that worked and the prompts behind them.

Raheem, 2026-08-09: "I just wanna see the successful images and what prompt
generated them. That's it. And then under that, a short list of key phrases.
I'm working on art, not trying to understand the Wikipedia."

So this page is deliberately three cards and one list. The evidence, the failure
analysis and the win/lose phrase counts live in git history and in the config's
_rules / _the_finding keys — not on the page an artist has to read to work.

    python scripts/bg-harness/build-castle-promptkit.py
"""
import base64
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "castle-grand-topdown")
CFG = os.path.join(HERE, "configs", "castle-grand-topdown.json")

# A square castle needs FOUR pieces, not eight. Corners are solved by putting a
# tower on every corner, which is how real castles and both of Raheem's
# reference tilemaps do it — so there is no corner wall piece on this list.
# Rotations and mirrors are free, so one wall segment serves all four sides.
CHECKLIST = [
    dict(
        n="1", name="Wall segment", status="have", src="E",
        uses="All four sides. As drawn = back wall. Mirror vertically = front wall. "
             "Rotate 90&deg; = left and right walls.",
        need="Cut out as three repeating bays, clear of the corner towers and the stair. Bay pitch is "
             "125px so it tiles &mdash; keep that rhythm and it still will.",
        img="castle-wall-cut.png",
    ),
    dict(
        n="2", name="Gatehouse", status="have", src="B",
        uses="The front entrance, once. Sits in a gap in the front wall run.",
        need="Cut out with the curtain walls and approach road removed &mdash; both towers kept. The "
             "floating crystal is still on it: it is the one vertical element in a flat plate, so either "
             "flatten it or lean into it, your call.",
        img="castle-gate-cut.png",
    ),
    dict(
        n="3", name="Tower", status="have", src="cropped out of N",
        uses="All four corners, plus anywhere along a wall you want punctuation. Doing double duty as "
             "the corner piece is why there is no corner on this list.",
        need="Cut out clean &mdash; no wall attached, so Leonardo will improve the tower and not "
             "regenerate a wall around it. Use <code>castle-tower-reference.png</code>, the white-flattened "
             "one: a transparent surround uploads as black and drags the palette dark.",
        img="castle-tower-cut.png",
    ),
    dict(
        n="4", name="Battle Tower", status="later", src=None,
        uses="The landmark rising over the back wall &mdash; the thing the player is about to climb. "
             "Game function, not decoration: beating the tower unlocks the rest of the game.",
        need="Hold until 1&ndash;3 lock, then design it against them so it matches rather than "
             "competing.",
    ),
]

# These are the things that break the PixelLab redraw downstream, not style
# opinions. Each one is a defect this run actually produced.
ACCEPTANCE = [
    ("Plain WHITE background", "Not cream, not grey. One plate came back on cream and would need keying "
                               "before anything else could happen."),
    ("No ground, grass or paving", "The redraw invents a ground skirt on its own; a painted one on top "
                                   "of that is two skirts to cut off."),
    ("No cast shadow", "Contact shadow is added in-engine so it can sit on any terrain."),
    ("Repeating bays on wall runs", "Identical bays divided by buttress pilasters are what let a run be "
                                    "cut apart and tiled."),
    ("Generate big &mdash; 1024&ndash;1536px", "We downsample into the kit. Never chase the final "
                                               "pixel size out of Leonardo."),
    ("Same session, same settings", "Palette continuity across plates is far easier to keep than to "
                                    "fix afterwards."),
]

WORKED = [
    ("kit-b-wall-straight", "E", "Straight wall", "Front and back runs. Rotate it 90° for the side walls."),
    ("front-b-arcane", "B", "Gate", "The front. Lose the floating crystal — it's the one vertical thing."),
    ("part-n-tower", "N", "Tower on the wall", "Cut it at the tower and mirror a half to make corners."),
]

PHRASES = [
    ("16-bit top-down RPG tilemap, like a Pokemon overworld map", "the style"),
    ("flat cel shading, clean dark outlines, strictly limited palette", "the pixel-art register"),
    ("running horizontally across the full frame width", "stops it going isometric"),
    ("its outer face toward the bottom of the image", "points the wall the right way"),
    ("the broad flat wall-walk, a paved path four people could walk abreast", "makes the top surface"),
    ("crenellations read from above as an even row of short blocks", "flattens the battlements"),
    ("a SHORT band of face shows, one third as deep as the walk is wide", "holds 70&deg; instead of 90&deg;"),
    ("stands alone on plain flat solid white, no ground, sky or shadow", "so it mattes cleanly"),
    ("a single tiny human figure stands at the wall's foot for scale", "makes the plate self-measuring"),
]

NEVER = [
    ("tilted toward the viewer", "gives you isometric"),
    ("any degree number", "does nothing at all"),
    ("running vertically", "gives you a diagonal"),
    ("turning a ninety degree corner", "gives you a curve"),
]

NEGATIVE = (
    "front elevation, side elevation, straight-on view, eye-level view, horizon line, vanishing point, "
    "perspective, isometric, three-quarter view, ground, grass, dirt, paving, terrain, sky, clouds, "
    "horizon, landscape, scenery, trees, moat, water, cast shadow, drop shadow, photorealistic, "
    "photograph, 3d render, cgi, realistic, painterly, blurry, gradient background, curved wall, arc, "
    "bend, nude, bare chest, text, letters, signature, watermark, logo, ui, frame, border, ruins, decay"
)


def thumb(sid):
    from PIL import Image
    src = os.path.join(OUT, f"{sid}.png")
    dst = os.path.join(OUT, f"_thumb-{sid}.jpg")
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        im = Image.open(src).convert("RGB")
        im.thumbnail((1000, 1000), Image.LANCZOS)
        im.save(dst, "JPEG", quality=84)
    with open(dst, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()


def raw_uri(name):
    with open(os.path.join(OUT, name), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def build():
    man = json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))

    STATUS = {"have": ("Have it", "ok"), "later": ("Later", "hold")}
    check = "".join(f"""<div class="row {STATUS[c['status']][1]}">
  <div class="num">{c['n']}</div>
  <div class="rowbody">
    <div class="rowhead">
      <h3>{c['name']}</h3>
      <span class="tag {STATUS[c['status']][1]}">{STATUS[c['status']][0]}{(' &middot; ' + c['src']) if c['src'] else ''}</span>
    </div>
    <p class="uses">{c['uses']}</p>
    <p class="need"><span>Bring back</span>{c['need']}</p>
  </div>
  {f'<div class="rowshot"><img src="{raw_uri(c["img"])}" alt="{c["name"]}"/></div>' if c.get('img') else ''}
</div>""" for c in CHECKLIST)

    accept = "".join(f'<li><code>{a}</code><span>{w}</span></li>' for a, w in ACCEPTANCE)

    cards = "".join(f"""<article class="card">
  <div class="shot"><span class="stamp">{letter}</span><img src="{thumb(sid)}" alt="{name}"/></div>
  <div class="body">
    <h2>{name}</h2>
    <p class="use">{use}</p>
    <pre class="paste">{man['states'][sid]['prompt']}</pre>
  </div>
</article>""" for sid, letter, name, use in WORKED)

    phrases = "".join(f'<li><code>{p}</code><span>{w}</span></li>' for p, w in PHRASES)
    never = "".join(f'<li><code>{p}</code><span>{w}</span></li>' for p, w in NEVER)

    return (TEMPLATE.replace("{{CARDS}}", cards)
            .replace("{{CHECKLIST}}", check)
            .replace("{{ACCEPT}}", accept)
            .replace("{{PHRASES}}", phrases)
            .replace("{{NEVER}}", never)
            .replace("{{NEGATIVE}}", NEGATIVE))


TEMPLATE = """<title>Castle &mdash; what worked</title>
<style>
  :root{
    --bg:#17141c; --panel:#1d1924; --box:#231e2c; --edge:#372f44;
    --ink:#ece7dd; --muted:#9c92aa; --gold:#d9b45b; --verdigris:#57b9aa; --rust:#c0705a;
    --display:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --body:ui-sans-serif,system-ui,"Segoe UI",Helvetica,Arial,sans-serif;
    --data:ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace;
  }
  @media (prefers-color-scheme: light){
    :root{ --bg:#f2eee9; --panel:#e9e3dc; --box:#fffdfa; --edge:#d3c9be;
           --ink:#231e2c; --muted:#6b6274; --gold:#8a6a1c; --verdigris:#1f7a6d; --rust:#9c4630; }
  }
  :root[data-theme="dark"]{ --bg:#17141c; --panel:#1d1924; --box:#231e2c; --edge:#372f44;
    --ink:#ece7dd; --muted:#9c92aa; --gold:#d9b45b; --verdigris:#57b9aa; --rust:#c0705a; }
  :root[data-theme="light"]{ --bg:#f2eee9; --panel:#e9e3dc; --box:#fffdfa; --edge:#d3c9be;
    --ink:#231e2c; --muted:#6b6274; --gold:#8a6a1c; --verdigris:#1f7a6d; --rust:#9c4630; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;
       line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1000px;margin:0 auto;padding:48px 22px 88px;display:flex;flex-direction:column;gap:38px}
  h1{font-family:var(--display);font-weight:600;font-size:clamp(30px,4.6vw,44px);margin:0;line-height:1.1}
  h2{font-family:var(--display);font-weight:600;font-size:25px;margin:0;line-height:1.2}
  h3{font-family:var(--display);font-weight:600;font-size:22px;margin:0 0 2px}
  p{margin:0}
  .eyebrow{font-family:var(--data);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}

  .card{background:var(--panel);border:1px solid var(--edge);border-radius:3px;overflow:hidden}
  .shot{background:#fff;position:relative;line-height:0}
  .shot img{width:100%;height:auto;display:block}
  .stamp{position:absolute;top:0;left:0;font-family:var(--display);font-size:28px;line-height:1;
         padding:10px 16px;background:var(--bg);color:var(--verdigris);
         border-right:1px solid var(--edge);border-bottom:1px solid var(--edge)}
  .body{padding:22px 24px;display:flex;flex-direction:column;gap:11px}
  .use{color:var(--muted);font-size:15px}
  .paste{font-family:var(--data);font-size:12.5px;line-height:1.66;background:var(--box);
         border:1px solid var(--edge);border-left:3px solid var(--gold);border-radius:2px;
         padding:14px 16px;margin:0;white-space:pre-wrap;overflow-x:auto;
         -webkit-user-select:all;user-select:all}

  ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px;
     background:var(--edge);border:1px solid var(--edge);border-radius:3px;overflow:hidden}
  li{background:var(--panel);padding:12px 16px;display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}
  li code{font-family:var(--data);font-size:13px;color:var(--ink);flex:1 1 380px;
          -webkit-user-select:all;user-select:all}
  li span{color:var(--muted);font-size:13.5px;flex:0 1 auto}
  .never li code{color:var(--rust)}
  section{display:flex;flex-direction:column;gap:14px}

  .row{display:flex;gap:18px;background:var(--panel);border:1px solid var(--edge);border-radius:3px;
       border-left-width:3px;padding:19px 21px;align-items:flex-start}
  .row.ok{border-left-color:var(--verdigris)} .row.hold{border-left-color:var(--muted)}
  .num{font-family:var(--display);font-size:30px;line-height:1;color:var(--muted);width:24px;flex:none}
  .rowbody{display:flex;flex-direction:column;gap:9px;min-width:0;flex:1}
  .rowhead{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .tag{font-family:var(--data);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;
       padding:3px 9px;border-radius:2px;border:1px solid currentColor;white-space:nowrap}
  .tag.ok{color:var(--verdigris)} .tag.hold{color:var(--muted)}
  .uses{font-size:15px;color:var(--muted)}
  .need{font-size:14.5px;border-left:2px solid var(--gold);padding-left:13px}
  .need span{font-family:var(--data);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;
             color:var(--gold);display:block}
  .rowshot{flex:none;width:120px;background:#fff;border:1px solid var(--edge);border-radius:2px;
           padding:6px;line-height:0}
  .rowshot img{width:100%;height:auto;display:block;image-rendering:pixelated}
  @media (max-width:640px){ .rowshot{display:none} }
</style>

<div class="wrap">
  <div>
    <div class="eyebrow">Leonardo &middot; Lucid Origin &middot; no style reference</div>
    <h1>Castle checklist</h1>
  </div>

  <section>
    <h3>Four pieces build the whole castle</h3>
    <p class="use">Rotations and mirrors are free, and a tower on every corner means there is no corner
      piece to make. Three of the four are already in hand.</p>
    {{CHECKLIST}}
  </section>

  <section>
    <h3>What every plate has to satisfy</h3>
    <p class="use">These are what break the PixelLab redraw downstream, not style opinions.</p>
    <ul>{{ACCEPT}}</ul>
  </section>

  <section>
    <h3>The plates and their prompts</h3>
  </section>

  {{CARDS}}

  <section>
    <h3>Key phrases</h3>
    <ul>{{PHRASES}}</ul>
  </section>

  <section>
    <h3>Never say these</h3>
    <ul class="never">{{NEVER}}</ul>
  </section>

  <section>
    <h3>Negative prompt</h3>
    <pre class="paste">{{NEGATIVE}}</pre>
  </section>
</div>
"""


if __name__ == "__main__":
    dest = os.path.join(OUT, "prompt-kit.html")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(build())
    print(f"wrote {dest}  ({os.path.getsize(dest)/1024:.0f} KB)")
