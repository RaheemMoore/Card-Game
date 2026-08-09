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


def build():
    man = json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))

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
</style>

<div class="wrap">
  <div>
    <div class="eyebrow">Leonardo &middot; Lucid Origin &middot; no style reference</div>
    <h1>What worked</h1>
  </div>

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
