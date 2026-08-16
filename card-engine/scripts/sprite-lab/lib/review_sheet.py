#!/usr/bin/env python3
"""
The asset review harness.

One self-contained HTML page showing every generated courtyard asset **in
context on the plate at true game scale**, with its provenance, its cost, and
its verdict. Built because judging a sprite on a checkerboard is how you approve
something that turns out to be the wrong scale, the wrong angle, or invisible
against the paving.

Standing workflow (Raheem, 2026-08-04): **one item at a time.** An item is
drafted, reviewed here, and only once it is APPROVED do we spend the 25
generations to shoot its other seven faces. Nothing goes into the castle on my
say-so.

The page is self-contained (images inlined as base64), so it opens from disk
with no server and survives being copied anywhere.

Usage:
  review_sheet.py build [only]                rebuild the page; [only] filters ids by substring
  review_sheet.py add <id> <png> [options]    register a newly generated asset
  review_sheet.py decide <id> <verdict> [why] record a verdict
  review_sheet.py list                        print the register

Verdicts: pending | approved | rejected
"""
import base64
import io
import json
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.dirname(HERE)
CARD_ENGINE = os.path.dirname(os.path.dirname(LAB))
REVIEW = os.path.join(LAB, "review")
REGISTER = os.path.join(REVIEW, "assets.json")
# THE PLATE MUST BE THE COURTYARD THE GAME ACTUALLY SHIPS.
#
# This pointed at the V2 Figma plate until 2026-08-15, by which time /castle had
# been CourtyardV3 for weeks -- so every context shot was staged in a courtyard
# nobody had seen in the game for a month. Raheem, seeing it: "I don't even know
# what this looks like in our game because I haven't seen this courtyard in
# weeks." A review harness that stages art against a stale set is worse than no
# harness, because it produces confident judgements about the wrong thing.
#
# V3 is an Editor scene rather than one painted PNG, so it is RENDERED on demand
# by the offline scene renderer, in the game's own y-sort order:
#
#     python scripts/bg-harness/render_scene.py CourtyardV3 --ysort #         --out scripts/sprite-lab/review/courtyard-v3.png
#
# PRODUCTION_SCENE in src/pages/castle/v2/courtyardRuntime.ts is the source of
# truth for which scene that is. If it changes, re-render.
V3_PLATE = os.path.join(REVIEW, "courtyard-v3.png")
V2_PLATE = os.path.join(
    CARD_ENGINE, "src", "assets", "dev-preview", "courtyard-v2-figma.png"
)
PLATE = V3_PLATE if os.path.exists(V3_PLATE) else V2_PLATE
OUT = os.path.join(REVIEW, "review-sheet.html")
ARTIFACT_OUT = os.path.join(REVIEW, "review-sheet.artifact.html")

# Anchors are measured per plate, because they are absolute pixel positions and
# the two courtyards are neither the same size nor the same shape. V2 was a
# walled room shot square-on; V3 is a 2560x1920 top-down map with a gatehouse,
# a forge, a pond and a cliff. Using V2's coordinates on V3 drops the sprite in
# open sky.
WALLS_V3 = {
    "floor": {"label": "courtyard dirt, below the gatehouse", "x": 1290, "y": 1240, "face": "south", "lean": 0},
    "grass": {"label": "open grass, west side",               "x": 760,  "y": 1180, "face": "south", "lean": 0},
    "forge": {"label": "the paved run outside the forge",     "x": 1500, "y": 620,  "face": "south", "lean": 0},
    "pond":  {"label": "the pond's south bank",               "x": 2060, "y": 1330, "face": "south", "lean": 0},
}

WALLS_V2 = {
    "back":  {"label": "back wall (north)",  "x": 640,  "y": 470, "face": "south",      "lean": 0},
    "left":  {"label": "left wall (west)",   "x": 360,  "y": 640, "face": "south-east", "lean": 13},
    "right": {"label": "right wall (east)",  "x": 1210, "y": 640, "face": "south-west", "lean": -12},
    "floor": {"label": "open floor",         "x": 700,  "y": 760, "face": "south",      "lean": 0},
}

WALLS = WALLS_V3 if PLATE == V3_PLATE else WALLS_V2

VERDICTS = ("pending", "approved", "rejected")


def load():
    if not os.path.exists(REGISTER):
        return {"assets": []}
    with open(REGISTER, encoding="utf-8") as f:
        return json.load(f)


def save(reg):
    os.makedirs(REVIEW, exist_ok=True)
    with open(REGISTER, "w", encoding="utf-8") as f:
        json.dump(reg, f, indent=2)


def b64(img):
    """Sprite art — PNG, because alpha and hard pixel edges are the point."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def b64_photo(img, max_w=760):
    """Plate composites — JPEG. These are painted, photographic, and there are a
    dozen of them; as full-res PNG the page came out 7.3 MB and was unpleasant to
    open, which defeats the entire purpose of a review harness."""
    if img.width > max_w:
        h = round(img.height * max_w / img.width)
        img = img.resize((max_w, h), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=82, optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def resolve(p):
    return p if os.path.isabs(p) else os.path.join(CARD_ENGINE, p)


def context_shot(sprite, wall):
    """Composite the sprite onto the real plate, standing on its feet, and crop
    a window around it. Feet-anchored because that is how the game places it —
    a centre-anchored preview lies about how tall a thing reads."""
    plate = Image.open(PLATE).convert("RGBA")
    w = WALLS.get(wall, WALLS["floor"])
    x, y = w["x"], w["y"]
    scene = plate.copy()
    scene.alpha_composite(sprite, (int(x - sprite.width / 2), int(y - sprite.height)))
    pad_x, pad_top, pad_bottom = 210, 190, 120
    box = (
        max(0, int(x - sprite.width / 2) - pad_x),
        max(0, int(y - sprite.height) - pad_top),
        min(plate.width, int(x + sprite.width / 2) + pad_x),
        min(plate.height, y + pad_bottom),
    )
    return scene.crop(box)


def swatch(sprite, scale=3):
    """The sprite alone on courtyard paving tone, magnified with hard pixels."""
    pad = 10
    bg = Image.new(
        "RGBA", (sprite.width + pad * 2, sprite.height + pad * 2), (228, 196, 132, 255)
    )
    bg.alpha_composite(sprite, (pad, pad))
    return bg.resize((bg.width * scale, bg.height * scale), Image.NEAREST)


def build(only=None):
    """Render the sheet.  is a substring filter on the asset id.

    THE FILTER IS NOT A NICETY. The register only ever grows -- it passed 70
    assets on 2026-08-15 -- so an unfiltered page buries the thing you just
    made under everything ever judged, and the reviewer cannot find it. When
    you have generated one subject, build that subject.
    """
    reg = load()
    assets = reg.get("assets", [])
    if only:
        assets = [a for a in assets if only.lower() in a["id"].lower()]
    if not assets:
        if only:
            print(f'No registered asset id contains "{only}".')
            return
        print("No assets registered yet. Use: review_sheet.py add <id> <png>")
        return

    order = {"pending": 0, "rejected": 2, "approved": 1}
    assets = sorted(assets, key=lambda a: (order.get(a.get("verdict", "pending"), 9), a["id"]))

    total_gens = sum(a.get("generations", 0) or 0 for a in assets)
    counts = {v: sum(1 for a in assets if a.get("verdict", "pending") == v) for v in VERDICTS}

    cards = []
    for a in assets:
        p = resolve(a["file"])
        if not os.path.exists(p):
            cards.append(
                f'<article class="card missing"><h3>{a["id"]}</h3>'
                f'<p class="warn">FILE MISSING: {a["file"]}</p></article>'
            )
            continue
        sprite = Image.open(p).convert("RGBA")
        wall = a.get("wall", "floor")
        wl = WALLS.get(wall, WALLS["floor"])
        verdict = a.get("verdict", "pending")
        note = a.get("note", "")
        gens = a.get("generations")
        scale = 3 if max(sprite.size) < 130 else 2

        cards.append(f"""
<article class="card {verdict}">
  <header>
    <h3>{a['id']}</h3>
    <span class="badge {verdict}">{verdict.upper()}</span>
  </header>
  <div class="shots">
    <figure><img src="data:image/jpeg;base64,{b64_photo(context_shot(sprite, wall))}"/>
      <figcaption>IN CONTEXT &middot; {wl['label']} &middot; true game scale, standing on its feet</figcaption></figure>
    <figure><img class="pix" src="data:image/png;base64,{b64(swatch(sprite, scale))}"/>
      <figcaption>the asset alone &middot; {sprite.width}&times;{sprite.height}px &middot; {scale}&times;</figcaption></figure>
  </div>
  <dl>
    <dt>source</dt><dd>{a.get('source','—')}</dd>
    <dt>endpoint</dt><dd>{a.get('endpoint','—')}</dd>
    <dt>cost</dt><dd>{'—' if gens is None else str(gens) + ' generations'}</dd>
    <dt>faces</dt><dd>{a.get('faces','1 (front only — needs an 8-face pass if approved)')}</dd>
    <dt>file</dt><dd><code>{a['file']}</code></dd>
  </dl>
  {f'<p class="note">{note}</p>' if note else ''}
  <p class="cmd">approve: <code>review_sheet.py decide {a['id']} approved</code>
     &middot; reject: <code>review_sheet.py decide {a['id']} rejected "why"</code></p>
</article>""")

    head = """<title>Courtyard asset review</title>
<style>
 /* Tokens first, components styled only through them, so the viewer's theme
    toggle can override the OS preference in BOTH directions. */
 :root {
   --ground:#14121a; --panel:#1d1b26; --line:#2e2b3a; --chip:#26232f;
   --ink:#efe9dd; --muted:#9a94a8;
   --pending:#c9a227; --pending-ink:#231c00;
   --approved:#3f8f5a; --approved-ink:#03170b;
   --warn:#ff8080;
 }
 @media (prefers-color-scheme: light) {
   :root {
     --ground:#f7f4ef; --panel:#fffdfa; --line:#e2dbd0; --chip:#efe9e0;
     --ink:#241f2b; --muted:#6b6478;
     --pending:#a8851a; --pending-ink:#fffdf3;
     --approved:#2f7449; --approved-ink:#f2fbf5;
     --warn:#b3261e;
   }
 }
 :root[data-theme="light"] {
   --ground:#f7f4ef; --panel:#fffdfa; --line:#e2dbd0; --chip:#efe9e0;
   --ink:#241f2b; --muted:#6b6478;
   --pending:#a8851a; --pending-ink:#fffdf3;
   --approved:#2f7449; --approved-ink:#f2fbf5;
   --warn:#b3261e;
 }
 :root[data-theme="dark"] {
   --ground:#14121a; --panel:#1d1b26; --line:#2e2b3a; --chip:#26232f;
   --ink:#efe9dd; --muted:#9a94a8;
   --pending:#c9a227; --pending-ink:#231c00;
   --approved:#3f8f5a; --approved-ink:#03170b;
   --warn:#ff8080;
 }
 body { background:var(--ground); color:var(--ink);
        font:14px/1.55 ui-sans-serif,system-ui,-apple-system,sans-serif;
        margin:0; padding:30px 26px 80px }
 h1 { font-size:26px; margin:0 0 6px; text-wrap:balance }
 .lede { color:var(--muted); max-width:66ch; margin:0 0 14px }
 .tally { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 26px;
          font-variant-numeric:tabular-nums }
 .tally span { background:var(--chip); border:1px solid var(--line);
               border-radius:99px; padding:4px 12px; font-size:12.5px; color:var(--muted) }
 .tally b { color:var(--ink) }
 .card { background:var(--panel); border:1px solid var(--line); border-left-width:4px;
         border-radius:12px; padding:18px; margin:0 0 20px; max-width:1180px }
 .card.pending { border-left-color:var(--pending) }
 .card.approved { border-left-color:var(--approved) }
 .card.rejected { opacity:.5 }
 .card header { display:flex; align-items:center; gap:11px; margin-bottom:14px;
                flex-wrap:wrap }
 h3 { margin:0; font-size:17px }
 .badge { font-size:10.5px; letter-spacing:.13em; padding:3px 10px; border-radius:99px;
          background:var(--chip); color:var(--muted) }
 .badge.pending { background:var(--pending); color:var(--pending-ink) }
 .badge.approved { background:var(--approved); color:var(--approved-ink) }
 .shots { display:flex; flex-wrap:wrap; gap:18px; align-items:flex-end;
          overflow-x:auto }
 figure { margin:0 }
 figure img { max-width:100%; border-radius:8px; display:block }
 img.pix { image-rendering:pixelated }
 figcaption { color:var(--muted); font-size:11px; margin-top:6px }
 dl { display:grid; grid-template-columns:max-content 1fr; gap:3px 14px;
      margin:16px 0 0; font-size:12.5px; font-variant-numeric:tabular-nums }
 dt { color:var(--muted) }
 dd { margin:0 }
 code { background:var(--chip); padding:1px 5px; border-radius:4px;
        font:12px ui-monospace,SFMono-Regular,Menlo,monospace }
 .note { background:var(--chip); border-left:3px solid var(--pending);
         padding:9px 12px; margin:14px 0 0; border-radius:0 6px 6px 0 }
 .cmd { color:var(--muted); font-size:11.5px; margin:12px 0 0 }
 .warn { color:var(--warn) }
 @media (prefers-reduced-motion:reduce) { * { animation:none!important; transition:none!important } }
</style>"""

    body = f"""<h1>Courtyard asset review</h1>
<p class="lede">Every generated asset, on the real plate, at true game scale, standing on its
feet. Nothing here is in the castle. <b>One item at a time:</b> an item is drafted, judged
here, and only once it is approved does it earn its animation and its other seven faces.</p>
<p class="tally">
 <span><b>{counts['pending']}</b> awaiting your call</span>
 <span><b>{counts['approved']}</b> approved</span>
 <span><b>{counts['rejected']}</b> rejected</span>
 <span><b>{total_gens}</b> generations spent</span>
</p>
{''.join(cards)}
"""
    html = "<!doctype html><meta charset=\"utf-8\">\n" + head + "\n" + body
    os.makedirs(REVIEW, exist_ok=True)
    out_path = OUT if not only else OUT.replace(".html", f"-{only}.html")
    art_path = ARTIFACT_OUT if not only else ARTIFACT_OUT.replace(".html", f"-{only}.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    # Artifact-ready twin: no doctype/meta, since the Artifact host supplies the
    # skeleton. Same content, so the shared URL and the local file never diverge.
    with open(art_path, "w", encoding="utf-8") as f:
        f.write(head + "\n" + body)
    print(OUT)
    print(ARTIFACT_OUT)
    print(
        f"  {counts['pending']} pending · {counts['approved']} approved · "
        f"{counts['rejected']} rejected · {total_gens} generations"
    )


def add(argv):
    aid, png = argv[0], argv[1]
    opts = {}
    for kv in argv[2:]:
        if "=" in kv:
            k, v = kv.split("=", 1)
            opts[k] = v
    reg = load()
    rel = os.path.relpath(resolve(png), CARD_ENGINE)
    entry = {
        "id": aid,
        "file": rel,
        "wall": opts.get("wall", "floor"),
        "source": opts.get("source", ""),
        "endpoint": opts.get("endpoint", ""),
        "generations": int(opts["generations"]) if "generations" in opts else None,
        "faces": opts.get("faces", "1 (front only — needs an 8-face pass if approved)"),
        "verdict": "pending",
        "note": opts.get("note", ""),
    }
    reg["assets"] = [a for a in reg.get("assets", []) if a["id"] != aid] + [entry]
    save(reg)
    print(f"registered {aid} ({rel}) against the {entry['wall']} wall — pending")


def decide(argv):
    aid, verdict = argv[0], argv[1]
    if verdict not in VERDICTS:
        sys.exit(f"verdict must be one of {', '.join(VERDICTS)}")
    why = argv[2] if len(argv) > 2 else ""
    reg = load()
    for a in reg.get("assets", []):
        if a["id"] == aid:
            a["verdict"] = verdict
            if why:
                a["note"] = why
            save(reg)
            print(f"{aid} -> {verdict}" + (f" ({why})" if why else ""))
            return
    sys.exit(f"no asset registered as {aid}")


def show():
    for a in load().get("assets", []):
        print(
            f"{a.get('verdict','pending'):9} {a['id']:34} {a.get('wall','floor'):6} "
            f"{a.get('generations') if a.get('generations') is not None else '—'}"
        )


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "build":
        build(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == "add":
        add(sys.argv[2:])
    elif cmd == "decide":
        decide(sys.argv[2:])
    elif cmd == "list":
        show()
    else:
        sys.exit(__doc__)
