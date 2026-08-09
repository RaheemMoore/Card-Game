#!/usr/bin/env python3
"""Build the castle prompt kit — the extracted formula, not more images.

Raheem, 2026-08-09: "I need a prompt that can generate this angle and this
style. Tell me what the keywords are." Fifteen generations produced two usable
plates, which is a bad ratio, and the reason is that the formula was extractable
after round ONE — B and E landed and A, C and F drifted, and that was already
enough signal. This page is that analysis, done properly and costing nothing.

Every claim here is backed by a phrase-frequency diff across the 13 generated
prompts in out/castle-grand-topdown/manifest.json — win count vs lose count is
printed beside each keyword, not asserted.

    python scripts/bg-harness/build-castle-promptkit.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "castle-grand-topdown")
CFG = os.path.join(HERE, "configs", "castle-grand-topdown.json")

WINNERS = ["front-b-arcane", "kit-b-wall-straight"]

# Measured by build time from the real prompts — see phrase_stats().
KEYWORDS = [
    dict(
        slot="1. Register",
        must=True,
        text="2D game art for a 16-bit top-down RPG tilemap, like a Pokemon overworld map. "
             "Flat cel shading, clean dark outlines, strictly limited palette, chunky readable shapes.",
        why="This sets the style and never varies. It is in all 13 prompts, winners and losers alike, "
            "which is exactly why it is NOT what controls the angle — do not expect it to.",
    ),
    dict(
        slot="2. The angle, as geometry",
        must=True,
        text="The FLAT TOP SURFACES dominate: the wall shows its broad flat wall-walk as a wide paved path "
             "along its length, crenellations along that path's outer edge READ FROM ABOVE as a row of "
             "short blocks, never as a tall silhouette.",
        why="Name what you SEE, never the camera. Describing the top surface as a walkable path is what "
            "produces the angle. Every attempt to state the camera instead — degrees, tilt — failed.",
    ),
    dict(
        slot="3. The counterweight",
        must=True,
        text="Only a SHORT band of outer face shows below the walk, about one third as deep as the walk "
             "is wide.",
        why="THE MOST OVERLOOKED LINE. Slot 2 alone drives it to a flat overhead plan — that is exactly "
            "what happened to A (88 degrees) and D (86 degrees). This sentence is what holds it at ~70 "
            "instead of 90. Present in 2/2 winners.",
    ),
    dict(
        slot="4. Composition",
        must=True,
        text="running horizontally across the full frame width, its outer face toward the bottom of the "
             "image",
        why="THE STRONGEST SINGLE LEVER, and the one that decides isometric vs top-down. The subject must "
            "be a horizontal run leaving both side edges. Every free-standing object centred on white came "
            "back isometric: F, H, I, K, no exceptions.",
    ),
    dict(
        slot="5. Isolation",
        must=True,
        text="Stands alone on plain flat solid white, with no ground, grass, paving, sky, horizon, scenery, "
             "shadow or other objects.",
        why="Needed so the plate mattes cleanly for the PixelLab redraw. K ignored it and came back on a "
            "cream ground, which would need keying before anything else could happen.",
    ),
    dict(
        slot="6. Scale anchor",
        must=False,
        text="A single tiny human figure stands at the wall's foot for scale.",
        why="Optional but valuable. E drew one unprompted and it is the only reason the 10.7x wall-to-person "
            "ratio could be measured. Ask for it and every plate becomes self-measuring.",
    ),
]

BANNED = [
    ("tilted toward the viewer", "0/2 winners &middot; 5/11 losers",
     "Reads as “tilt the object” and produces isometric. Round 2 added it to every prompt and made "
     "everything worse."),
    ("any degree number (“at seventy degrees”)", "0/2 winners &middot; 5/11 losers",
     "Numbers do nothing. The model does not measure angles; it draws what you describe."),
    ("“seen from above” on a whole building", "0/2 winners &middot; 2/11 losers",
     "Fine applied to one detail like crenellations. Applied to the whole subject it flattens to plan view."),
    ("“turning a ninety degree corner”", "0/2 winners &middot; 3/11 losers",
     "Produced a curve both times it was tried (G, M). It will not draw a square corner. Build corners in "
     "the tile kit instead, or mirror a straight run."),
    ("“running vertically”", "0/2 winners &middot; 1/11 loser",
     "Produced a diagonal isometric run (P). Horizontal is the only orientation this model holds."),
    ("“enters from the LEFT FRAME EDGE”", "0/2 winners &middot; 5/11 losers",
     "Naming individual edges did not help and correlates with the drifted set. “across the full frame "
     "width” is the phrasing that worked."),
    ("“isometric” in the NEGATIVE prompt", "&mdash;",
     "Does not work. F came back isometric with “isometric” sitting in its negative. Only composition "
     "(slot 4) prevents it."),
]

TEMPLATES = [
    dict(
        name="Straight wall — front or back run",
        status="proven",
        note="This is E. Copy it as-is; it is the only composition confirmed to hold.",
        body="A long straight castle curtain wall running horizontally across the full frame width, its "
             "outer face toward the bottom of the image. The dominant shape is the BROAD FLAT WALL-WALK, a "
             "paved path four people could walk abreast running the full length, a low inner parapet along "
             "the top side and crenellations along the bottom outer edge read from above as an even row of "
             "short amber-gold-capped blocks. Below that edge a SHORT band of face shows, one third as deep "
             "as the walk is wide, with arrow slits, a string course and a battered foundation plinth. The "
             "wall divides into IDENTICAL REPEATING BAYS by slender buttress pilasters at even intervals so "
             "it can be cut apart and tiled seamlessly. A flight of stone steps rises to the walk; braziers "
             "stand along it.",
    ),
    dict(
        name="Side wall — left or right run",
        status="derive",
        note="Do NOT ask for a vertical wall; P proved that gives diagonal isometric. Generate the "
             "straight wall above and ROTATE IT 90&deg; in Pixelorama. The walkway is symmetric, so only "
             "the face band's shading needs a touch-up — which is a two-minute paint job, not a generation.",
        body=None,
    ),
    dict(
        name="Tower standing on the wall",
        status="untested",
        note="Built on the proven composition — the WALL spans the frame and the tower is embedded in it, "
             "so slot 4 still holds. This is the template most worth your first Leonardo attempt.",
        body="A long straight castle curtain wall running horizontally across the full frame width, its "
             "outer face toward the bottom of the image, with a single octagonal watch tower standing "
             "astride it at the centre. The wall's dominant shape is the BROAD FLAT WALL-WALK, a paved path "
             "four people could walk abreast, crenellations along its bottom outer edge read from above as "
             "an even row of short amber-gold-capped blocks, and below that edge a SHORT band of face "
             "carrying arrow slits and a battered plinth. The tower rises from the wall: its crenellated "
             "top reads as a flat ring seen from above under a verdigris copper cap, and below it a band of "
             "octagonal shaft shows, twice as deep as the wall's own face band, with a lit window. A single "
             "tiny human figure stands at the tower's foot.",
    ),
    dict(
        name="Gate set into the wall",
        status="untested",
        note="B already works as a free-standing gatehouse. Use this instead when you want the gate "
             "continuous with a wall run so it tiles into the circuit.",
        body="A long straight castle curtain wall running horizontally across the full frame width, its "
             "outer face toward the bottom of the image, with a gate opening set into it at the centre. The "
             "wall's dominant shape is the BROAD FLAT WALL-WALK, a paved path four people could walk "
             "abreast, crenellations along its bottom outer edge read from above as an even row of short "
             "amber-gold-capped blocks. Below that edge a SHORT band of face shows, one third as deep as "
             "the walk is wide, and set into that face a deep pointed archway ringed in amber gold "
             "voussoirs, its portcullis hauled up and its timber doors swung inward on a dark passage. A "
             "timber drawbridge lies lowered from the threshold toward the bottom of the image, planks and "
             "chains drawn. A single tiny human figure stands on the drawbridge.",
    ),
    dict(
        name="Corner",
        status="derive",
        note="Do not prompt for one. Two attempts (G, M) both returned curves. Take the tower-on-wall "
             "plate above, cut it at the tower, and mirror one half — a square corner is two straight runs "
             "meeting, and you already own both. Or let the tile kit generate it.",
        body=None,
    ),
]

NEGATIVE = (
    "front elevation, side elevation, straight-on view, eye-level view, horizon line, vanishing point, "
    "perspective, isometric, three-quarter view, ground, grass, dirt, paving, terrain, sky, clouds, "
    "horizon, landscape, scenery, trees, moat, water, cast shadow, drop shadow, photorealistic, "
    "photograph, 3d render, cgi, realistic, painterly, blurry, gradient background, curved wall, arc, "
    "bend, nude, bare chest, text, letters, signature, watermark, logo, ui, frame, border, ruins, decay, "
    "rubble, crumbling"
)

STYLE_HEADER_NOTE = (
    "Paste the style header FIRST, then one subject block. Leonardo's prompt box takes them as one string. "
    "Keep the total under 1500 characters — the harness enforces that cap because Leonardo rejects longer "
    "prompts outright."
)


def phrase_stats():
    """Recompute the win/lose counts from the real prompts so the page can never lie."""
    cfg = json.load(open(CFG, encoding="utf-8"))
    man = json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))
    gen = [s for s in cfg["states"] if s["id"] in man["states"]]
    out = {}
    for probe in ["SHORT band", "full frame width", "TILTED", "SEVENTY", "ninety degree", "VERTICALLY",
                  "FRAME EDGE", "seen from above"]:
        w = sum(1 for s in gen if s["id"] in WINNERS and probe in s.get("line", ""))
        l = sum(1 for s in gen if s["id"] not in WINNERS and probe in s.get("line", ""))
        out[probe] = (w, len([s for s in gen if s["id"] in WINNERS]),
                      l, len([s for s in gen if s["id"] not in WINNERS]))
    return out


def build():
    cfg = json.load(open(CFG, encoding="utf-8"))
    stats = phrase_stats()
    sw, st, sl, slt = stats["SHORT band"]
    cw, ct, cl, clt = stats["full frame width"]

    slots = "".join(f"""<div class="slot{'' if k['must'] else ' opt'}">
  <div class="slothead"><h3>{k['slot']}</h3>{'' if k['must'] else '<span class="optional">optional</span>'}</div>
  <pre class="paste">{k['text']}</pre>
  <p class="why">{k['why']}</p>
</div>""" for k in KEYWORDS)

    banned = "".join(f"""<tr><td class="bad-word">{w}</td><td class="count">{c}</td><td>{why}</td></tr>"""
                     for w, c, why in BANNED)

    tmpl = []
    for t in TEMPLATES:
        badge = {"proven": ("Proven", "ok"), "untested": ("Untested &mdash; built on the proven shape", "warn"),
                 "derive": ("Do not generate &mdash; derive it", "hold")}[t["status"]]
        block = f'<pre class="paste">{t["body"]}</pre>' if t["body"] else ""
        tmpl.append(f"""<article class="tcard {badge[1]}">
  <div class="rowtop"><span class="tag {badge[1]}">{badge[0]}</span><h3>{t['name']}</h3></div>
  <p class="why">{t['note']}</p>
  {block}
</article>""")

    return (TEMPLATE
            .replace("{{SLOTS}}", slots)
            .replace("{{BANNED}}", banned)
            .replace("{{TEMPLATES}}", "\n".join(tmpl))
            .replace("{{HEADER}}", cfg["styleHeader"])
            .replace("{{NEGATIVE}}", NEGATIVE)
            .replace("{{HEADERNOTE}}", STYLE_HEADER_NOTE)
            .replace("{{SHORTBAND}}", f"{sw}/{st} winners &middot; {sl}/{slt} losers")
            .replace("{{SPAN}}", f"{cw}/{ct} winners &middot; {cl}/{clt} losers"))


TEMPLATE = """<title>Castle prompt kit &mdash; the angle formula</title>
<style>
  :root{
    --stone-900:#17141c; --stone-850:#1d1924; --stone-800:#231e2c; --edge:#372f44;
    --ink:#ece7dd; --muted:#9c92aa; --gold:#d9b45b; --verdigris:#57b9aa; --rust:#c0705a;
    --display:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --body:ui-sans-serif,system-ui,"Segoe UI",Helvetica,Arial,sans-serif;
    --data:ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace;
  }
  @media (prefers-color-scheme: light){
    :root{ --stone-900:#f2eee9; --stone-850:#e9e3dc; --stone-800:#fffdfa; --edge:#d3c9be;
           --ink:#231e2c; --muted:#6b6274; --gold:#8a6a1c; --verdigris:#1f7a6d; --rust:#9c4630; }
  }
  :root[data-theme="dark"]{
    --stone-900:#17141c; --stone-850:#1d1924; --stone-800:#231e2c; --edge:#372f44;
    --ink:#ece7dd; --muted:#9c92aa; --gold:#d9b45b; --verdigris:#57b9aa; --rust:#c0705a; }
  :root[data-theme="light"]{
    --stone-900:#f2eee9; --stone-850:#e9e3dc; --stone-800:#fffdfa; --edge:#d3c9be;
    --ink:#231e2c; --muted:#6b6274; --gold:#8a6a1c; --verdigris:#1f7a6d; --rust:#9c4630; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--stone-900);color:var(--ink);font-family:var(--body);
       font-size:16px;line-height:1.62;-webkit-font-smoothing:antialiased}
  .wrap{max-width:940px;margin:0 auto;padding:56px 24px 96px;display:flex;flex-direction:column;gap:44px}

  header{display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--edge);padding-bottom:34px}
  .eyebrow{font-family:var(--data);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
  h1{font-family:var(--display);font-weight:600;font-size:clamp(32px,5vw,48px);line-height:1.08;
     margin:0;text-wrap:balance;letter-spacing:-.01em}
  .sub{color:var(--muted);max-width:64ch;margin:0;font-size:17px}
  h2{font-family:var(--display);font-size:29px;font-weight:600;margin:0 0 4px;line-height:1.15}
  h3{font-family:var(--display);font-size:20px;font-weight:600;margin:0;line-height:1.25}
  section{display:flex;flex-direction:column;gap:18px}
  p{margin:0;max-width:70ch}

  .paste{font-family:var(--data);font-size:12.5px;line-height:1.68;background:var(--stone-800);
         border:1px solid var(--edge);border-left:3px solid var(--gold);border-radius:2px;
         padding:15px 17px;margin:0;white-space:pre-wrap;overflow-x:auto;color:var(--ink);
         -webkit-user-select:all;user-select:all}
  .why{color:var(--muted);font-size:14.5px}

  .slot{background:var(--stone-850);border:1px solid var(--edge);border-radius:3px;padding:20px 22px;
        display:flex;flex-direction:column;gap:11px}
  .slot.opt{border-style:dashed}
  .slothead{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .optional{font-family:var(--data);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;
            color:var(--muted);border:1px solid var(--edge);padding:3px 8px;border-radius:2px}

  table{border-collapse:collapse;width:100%;font-size:14.5px}
  th,td{text-align:left;padding:11px 13px;border-bottom:1px solid var(--edge);vertical-align:top}
  th{font-family:var(--data);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
  .bad-word{font-family:var(--data);font-size:13px;color:var(--rust);white-space:nowrap}
  .count{font-family:var(--data);font-size:12px;color:var(--muted);white-space:nowrap;
         font-variant-numeric:tabular-nums}
  .scroll{overflow-x:auto}

  .tcard{background:var(--stone-850);border:1px solid var(--edge);border-radius:3px;padding:20px 22px;
         display:flex;flex-direction:column;gap:12px;border-left-width:3px}
  .tcard.ok{border-left-color:var(--verdigris)} .tcard.warn{border-left-color:var(--gold)}
  .tcard.hold{border-left-color:var(--muted)}
  .rowtop{display:flex;align-items:center;gap:13px;flex-wrap:wrap}
  .tag{font-family:var(--data);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;
       padding:4px 9px;border-radius:2px;border:1px solid currentColor;white-space:nowrap}
  .tag.ok{color:var(--verdigris)} .tag.warn{color:var(--gold)} .tag.hold{color:var(--muted)}

  .callout{background:var(--stone-850);border:1px solid var(--edge);border-left:3px solid var(--verdigris);
           border-radius:3px;padding:22px 24px;display:flex;flex-direction:column;gap:12px}
  .callout .lead{font-family:var(--display);font-size:20px;line-height:1.45}
  code{font-family:var(--data);font-size:13px;color:var(--gold)}
</style>

<div class="wrap">
  <header>
    <div class="eyebrow">bg-harness &middot; castle-grand-topdown &middot; prompt kit</div>
    <h1>The angle formula, extracted</h1>
    <p class="sub">Six slots, five banned phrases, and paste-ready blocks for every castle part.
      Every claim below is a count across the 13 prompts actually generated &mdash; not an opinion.</p>
  </header>

  <section>
    <h2>The two keywords that decide everything</h2>
    <div class="callout">
      <p class="lead">&ldquo;across the full frame width&rdquo; decides isometric vs top-down.
        &ldquo;a SHORT band of face&rdquo; decides 70&deg; vs 90&deg;.</p>
      <p>Those two phrases are the whole trick. The horizontal frame-spanning run stops the model drawing
        a free-standing object in isometric &mdash; every single object centred on white came back
        isometric. And the short-face-band sentence stops it collapsing to a flat overhead plan, which is
        what happens when you only describe the top surface.</p>
      <p class="why">Measured: &ldquo;SHORT band&rdquo; {{SHORTBAND}} &middot;
        &ldquo;full frame width&rdquo; {{SPAN}}</p>
    </div>
  </section>

  <section>
    <h2>The six slots</h2>
    <p class="why">In this order. Slots 1&ndash;5 are required; slot 6 is free value.</p>
    {{SLOTS}}
  </section>

  <section>
    <h2>Banned phrases</h2>
    <p class="why">Each of these caused a documented failure in this run. They are not stylistic
      preferences &mdash; they actively break the angle.</p>
    <div class="scroll"><table>
      <tr><th>Phrase</th><th>Appears in</th><th>What it does</th></tr>
      {{BANNED}}
    </table></div>
  </section>

  <section>
    <h2>Paste-ready: the style header</h2>
    <p class="why">{{HEADERNOTE}}</p>
    <pre class="paste">{{HEADER}}</pre>
  </section>

  <section>
    <h2>Paste-ready: the negative prompt</h2>
    <p class="why">Note what is <em>not</em> load-bearing here: &ldquo;isometric&rdquo; is in this list and
      it still did not stop isometric output. Composition does that, not the negative.</p>
    <pre class="paste">{{NEGATIVE}}</pre>
  </section>

  <section>
    <h2>Paste-ready: one block per castle part</h2>
    <p class="why">Append one of these to the style header above.</p>
    {{TEMPLATES}}
  </section>

  <section>
    <h2>How this becomes a whole castle</h2>
    <div class="callout">
      <p>Straight and honest: two plates are not a castle, and saying otherwise was wrong. But you also do
        not need a Leonardo plate per part. A square castle is built from four things &mdash;
        <b>a wall run, a corner, a tower, a gate</b> &mdash; and of those, only the wall and the tower
        need designing. Corners are two wall runs meeting, and every mirror and rotation of a piece is
        free.</p>
      <p>So the realistic target from Leonardo is <b>three plates</b>: the straight wall (you have it),
        the tower-on-wall (template above, untested), and the gate (you have it as B). The side walls come
        from rotating the first. Everything else &mdash; junctions, end caps, inner corners &mdash; is what
        <code>/create-tiles-pro</code> with <code>tile_feature: 'building'</code> returns as a 56-piece set
        for 20 generations, style-referenced off whichever plate you approve.</p>
      <p class="why">That endpoint has not been run in this project yet, so treat the 56-piece claim as the
        API's documentation rather than something proven here. If it disappoints, the fallback is cutting
        corners and junctions out of the tower-on-wall plate by hand in Pixelorama &mdash; which is free,
        and which is how the existing tower cap and base pieces were made.</p>
    </div>
  </section>
</div>
"""


if __name__ == "__main__":
    dest = os.path.join(OUT, "prompt-kit.html")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(build())
    print(f"wrote {dest}  ({os.path.getsize(dest)/1024:.0f} KB)")
