#!/usr/bin/env python3
"""Build the castle high-top-down candidate review sheet.

Rule Zero: never show work in chat, show it in a harness. harness.mjs `sheet`
shells out to `sips`, which is macOS-only, so on Windows every thumbnail falls
back to a full-size PNG base64 and the sheet lands at ~15 MB. This builds the
same thing with PIL and adds the thing the generic sheet cannot show: the
camera ANGLE each candidate landed at, which is the whole finding of this run.

MANIFEST-DRIVEN ON PURPOSE. Every state in the manifest gets a card, whether or
not anyone has written a verdict for it yet. An unreviewed generation shows up
as "Not yet reviewed" rather than silently vanishing — the first version of this
script hard-coded its card list and five generated images (G-K) never reached
Raheem because of it. A sheet you have to remember to update is a sheet that
goes stale. Letters come from the config's own state order and are how these get
referred to in conversation, so they stay stable as states are added.

Run it through `npm run castle:gen` / `npm run castle:sheet` so generating and
publishing are the same action:

    python scripts/bg-harness/build-castle-sheet.py

Writes out/castle-grand-topdown/review.html, self-contained (data-URI images).
"""
import base64
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "castle-grand-topdown")
CFG = os.path.join(HERE, "configs", "castle-grand-topdown.json")
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# Keyed by state id. Angle is judged from the wall-walk:face depth ratio against
# the two reference tilemaps, and is labelled as a judgement on the sheet.
# A state with no entry here renders as unreviewed rather than disappearing.
NOTES = {
    "kit-b-wall-straight": dict(
        verdict="use", angle=70, round=1,
        head="This is the kit source.",
        body="Everything the brief asked for and one thing it didn't. Broad paved wall-walk running the "
             "full width; crenellations read from above as a row of short blocks; a short face band below "
             "carrying evenly spaced arrow slits and a battered plinth; identical repeating bays; a stair "
             "rising to the walk; octagonal corner towers with verdigris caps. It also drew a person at the "
             "foot of the stair unprompted, which is where the scale number above comes from.",
        note="Cut into wall.walkway + wall.face here. Also the style reference for the 56-piece PixelLab kit.",
    ),
    "front-b-arcane": dict(
        verdict="use", angle=70, round=1,
        head="This is the gate.",
        body="Square towers whose flat rooftops read as real top planes, sigils laid flat on them, curtain "
             "wall running off both frame edges with its walkway and crenellations visible, and a short face "
             "band carrying the arch. Side by side with your second reference it is the same read. The "
             "floating crystal is the one element drawn at the wrong angle — it stands vertical while "
             "everything under it lies flat.",
        note="Keep the composition, lose or flatten the crystal spire.",
    ),
    "kit-a-wall-corner": dict(
        verdict="partial", angle=86, round=1,
        head="Right corner, wrong angle.",
        body="Went almost to a straight overhead plan. The corner turn and the walkway surface are exactly "
             "the geometry we need, but the face band has vanished, so a wall built from this would have no "
             "visible height at all.",
        note="Superseded by M.",
    ),
    "front-a-grand": dict(
        verdict="reject", angle=88, round=1,
        head="Overshot to plan view.",
        body="The drum tower roofs became pure circles and the gate block a flat rectangle. No face band, so "
             "nothing reads as standing up off the ground.",
    ),
    "front-c-cathedral": dict(
        verdict="reject", angle=35, round=1,
        head="Reverted to the defect we're removing.",
        body="A near-elevation, roughly the angle the current castle kit is drawn at. Handsome, and entirely "
             "unusable: a facade you can only ever look at. Kept visible because it is the clearest possible "
             "before/after against B and E.",
    ),
    "mass-a-keep": dict(
        verdict="cut", angle=45, round=1,
        head="Cut — the game has no keep.",
        body="Isometric despite “isometric” sitting in the negative prompt, and nearly unshaded. But the real "
             "problem is that you were right to ask what it was for: card-engine-courtyard-v2-quadrants.md "
             "has no keep in it. The courtyard's quadrants are forge, tower, archive and training, and the "
             "tower quadrant's anchor is a portcullis set into the wall — a threshold, not a building.",
        note="Replaced by L, the Battle Tower, which has an actual game job.",
    ),
    "part-g-corner": dict(
        verdict="partial", angle=84, round=2,
        head="Curved instead of cornering.",
        body="Asked for a ninety degree turn and got a smooth arc, which cannot tile. Still the best of round "
             "two: the face band survives on the curve and both drum towers have real height. The figure at "
             "the centre came from the new explicit scale instruction and works.",
        note="Superseded by M.",
    ),
    "part-h-tower": dict(
        verdict="reject", angle=45, round=2,
        head="Isometric.",
        body="A free-standing tower centred on white, drawn in true isometric with two visible faces and a "
             "45-degree ground plane. Handsome object, wrong projection, and it cannot sit on a wall.",
        note="Superseded by N.",
    ),
    "part-i-endcap": dict(
        verdict="reject", angle=45, round=2,
        head="Isometric, and it became a box.",
        body="Read “end cap” as “closed cube” and drew a hollow crenellated box in isometric. None of the "
             "wall-run geometry survived.",
        note="End cap deferred — it is the least load-bearing part and can be cut from M's corner later.",
    ),
    "gate-j-open": dict(
        verdict="reject", angle=32, round=2,
        head="The best-looking wrong answer so far.",
        body="A genuinely handsome gatehouse in the same family as B — verdigris spires, drawbridge, chains, "
             "a figure in the archway. And it is a near-elevation, the exact defect this whole exercise "
             "exists to remove. Worth keeping as a design reference for what the gate should contain.",
        note="Superseded by O. Mine it for detail, not for angle.",
    ),
    "gate-k-portcullis": dict(
        verdict="reject", angle=45, round=2,
        head="Isometric, and it broke the white background.",
        body="Isometric again, and it came back on a cream ground despite the plain-white instruction, which "
             "means it would need keying before anything else. The winch drum and tally-marked stone are the "
             "right props for the Tower Warden's threshold, so the content brief holds even though the "
             "image doesn't.",
    ),
    "part-m-corner": dict(
        verdict="cut", angle=80, round=3,
        head="Curved again. The corner piece is cut.",
        body="Asked for a ninety degree corner twice and got a curve twice — a horseshoe here, an arc in G. "
             "A curved wall has nowhere to go in a square castle, and chasing it was the wrong call: G should "
             "have been the end of it. Corner pieces come later from the approved straight wall, in the "
             "PixelLab kit call that returns corners and junctions as part of the set.",
        note="Cut. No further re-rolls.",
    ),
    "part-n-tower": dict(
        verdict="held", angle=None, round=3,
        head="Not generated.",
        body="Deferred with the corner. The tower on the wall is a kit junction, not a hand-designed plate.",
    ),
    "part-o-gate": dict(
        verdict="held", angle=None, round=3,
        head="Not generated.",
        body="B already is the gate, and it landed in band. There is nothing here that B does not cover.",
    ),
    "part-p-wall-side": dict(
        verdict="reject", angle=45, round=3,
        head="Straight at last, but diagonal.",
        body="The state-level curve ban worked — this is the first genuinely straight run since E. But asking "
             "for a VERTICAL run made the model draw a diagonal isometric one. The lesson is narrow and "
             "final: this model draws a top-down wall when the run is HORIZONTAL and drifts on any other "
             "orientation. E is the only orientation it will hold.",
        note="Stop generating. Derive the side wall from E in your own Leonardo pass, or rotate it after "
             "the PixelLab redraw.",
    ),
    "mass-l-battle-tower": dict(
        verdict="held", angle=None, round=2,
        head="Held back on purpose.",
        body="Not generated yet, at your call: design it after the wall and gate lock so it can be "
             "style-referenced off the approved art rather than invented alongside it. Same reasoning that "
             "makes the 56-piece kit work.",
        note="Generate once M/N/O settle.",
    ),
}

VERDICT = {
    "use": ("Use", "ok"),
    "partial": ("Reference only", "warn"),
    "reject": ("Reject", "bad"),
    "cut": ("Cut", "bad"),
    "held": ("Held", "hold"),
    None: ("Not yet reviewed", "hold"),
}

ROUND_NOTE = {
    1: "Round 1 — one state per design idea",
    2: "Round 2 — one state per real kit part, angle restated in the subject sentence",
    3: "Round 3 — same parts recomposed as frame-spanning wall runs, no angle adjective at all",
}


def thumbs(ids):
    """Regenerate thumbnails for every state, so this can never drift from the PNGs."""
    from PIL import Image
    for sid in ids:
        src = os.path.join(OUT, f"{sid}.png")
        if not os.path.exists(src):
            continue
        dst = os.path.join(OUT, f"_thumb-{sid}.jpg")
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        im = Image.open(src).convert("RGB")
        im.thumbnail((900, 900), Image.LANCZOS)
        im.save(dst, "JPEG", quality=82)


def data_uri(path):
    with open(path, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()


def gauge(deg):
    """A 0-90 arc with the 65-75 target band marked and the candidate's angle drawn."""
    import math
    if deg is None:
        return '<svg class="gauge" viewBox="0 0 120 64" aria-hidden="true">' \
               '<path d="M 20 56 A 40 40 0 0 1 100 56" fill="none" stroke="var(--edge)" ' \
               'stroke-width="7" stroke-linecap="round"/></svg>'

    def pt(d, r):
        a = math.radians(180 - d)
        return 60 + r * math.cos(a), 56 + r * math.sin(a) * -1

    x1, y1 = pt(65, 40)
    x2, y2 = pt(75, 40)
    hx, hy = pt(deg, 38)
    ok = 65 <= deg <= 75
    col = "var(--verdigris)" if ok else "var(--rust)"
    return f"""<svg class="gauge" viewBox="0 0 120 64" aria-hidden="true">
  <path d="M 20 56 A 40 40 0 0 1 100 56" fill="none" stroke="var(--edge)" stroke-width="7" stroke-linecap="round"/>
  <path d="M {x1:.1f} {y1:.1f} A 40 40 0 0 1 {x2:.1f} {y2:.1f}" fill="none" stroke="var(--verdigris)" stroke-width="7" stroke-linecap="round"/>
  <line x1="60" y1="56" x2="{hx:.1f}" y2="{hy:.1f}" stroke="{col}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="60" cy="56" r="3.5" fill="{col}"/>
</svg>"""


ORDER = {"use": 0, "partial": 1, "held": 2, None: 3, "reject": 4, "cut": 5}


def build():
    cfg = json.load(open(CFG, encoding="utf-8"))
    man = json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))

    rows = []
    for i, st in enumerate(cfg["states"]):
        sid = st["id"]
        n = NOTES.get(sid, {})
        rows.append(dict(
            letter=LETTERS[i], id=sid,
            title=st["label"].split("—", 1)[-1].strip(),
            generated=sid in man["states"],
            prompt=man["states"].get(sid, {}).get("prompt", cfg["styleHeader"] + " " + st.get("line", "")),
            **n,
        ))

    thumbs([r["id"] for r in rows if r["generated"]])

    cards = []
    for r in sorted(rows, key=lambda r: (ORDER.get(r.get("verdict"), 3), r["letter"])):
        label, tone = VERDICT[r.get("verdict")]
        if r["generated"]:
            shot = f'<img src="{data_uri(os.path.join(OUT, "_thumb-" + r["id"] + ".jpg"))}" alt="{r["title"]}"/>'
        else:
            shot = '<div class="pending">Not generated yet</div>'
        note = f'<p class="note"><span>Next</span>{r["note"]}</p>' if r.get("note") else ""
        head = r.get("head", "Not yet reviewed.")
        body = r.get("body", "This generation has not been written up yet. The prompt that produced it is below.")
        rnd = ROUND_NOTE.get(r.get("round"), "")
        cards.append(f"""<article class="card {tone}" id="{r['letter']}">
  <div class="shot"><span class="stamp {tone}">{r['letter']}</span>{shot}</div>
  <div class="read">
    <div class="rowtop">
      <span class="tag {tone}">{label}</span>
      <code class="sid">{r['id']}</code>
    </div>
    <h3>{r['title']}</h3>
    <p class="head">{head}</p>
    <p>{body}</p>
    {note}
    <div class="angle">
      {gauge(r.get('angle'))}
      <div class="angletext"><b>{('~%d&deg;' % r['angle']) if r.get('angle') else '&mdash;'}</b><span>camera angle, judged<br/>target band 65&ndash;75&deg;</span></div>
    </div>
    <details><summary>Prompt &middot; {rnd}</summary><p class="prompt">{r['prompt']}</p></details>
  </div>
</article>""")

    jump = "".join(
        f'<a class="jump {VERDICT[r.get("verdict")][1]}" href="#{r["letter"]}">'
        f'<b>{r["letter"]}</b><span>{r["title"]}</span></a>'
        for r in rows
    )
    return TEMPLATE.replace("{{CARDS}}", "\n".join(cards)).replace("{{JUMP}}", jump)


TEMPLATE = """<title>Castle &mdash; high top-down candidates</title>
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
    --ink:#ece7dd; --muted:#9c92aa; --gold:#d9b45b; --verdigris:#57b9aa; --rust:#c0705a;
  }
  :root[data-theme="light"]{
    --stone-900:#f2eee9; --stone-850:#e9e3dc; --stone-800:#fffdfa; --edge:#d3c9be;
    --ink:#231e2c; --muted:#6b6274; --gold:#8a6a1c; --verdigris:#1f7a6d; --rust:#9c4630;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--stone-900);color:var(--ink);font-family:var(--body);
       font-size:16px;line-height:1.62;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1180px;margin:0 auto;padding:56px 24px 96px;display:flex;flex-direction:column;gap:44px}

  header{display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--edge);padding-bottom:34px}
  .eyebrow{font-family:var(--data);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
  h1{font-family:var(--display);font-weight:600;font-size:clamp(34px,5.2vw,52px);line-height:1.08;
     margin:0;text-wrap:balance;letter-spacing:-.01em}
  .sub{color:var(--muted);max-width:64ch;margin:0;font-size:17px}

  .thesis{background:var(--stone-850);border:1px solid var(--edge);border-radius:3px;
          padding:30px 32px;display:flex;flex-direction:column;gap:24px}
  .thesis p{margin:0;max-width:70ch}
  .thesis .lead{font-family:var(--display);font-size:21px;line-height:1.45;text-wrap:balance}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1px;
         background:var(--edge);border:1px solid var(--edge);border-radius:3px;overflow:hidden}
  .stat{background:var(--stone-800);padding:18px 20px;display:flex;flex-direction:column;gap:5px}
  .stat b{font-family:var(--data);font-size:29px;font-variant-numeric:tabular-nums;letter-spacing:-.02em;line-height:1}
  .stat span{font-size:12.5px;color:var(--muted);line-height:1.4}
  .stat.now b{color:var(--rust)} .stat.tgt b{color:var(--verdigris)} .stat.cand b{color:var(--gold)}

  .index{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .jump{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);
        background:var(--stone-850);border:1px solid var(--edge);border-radius:3px;padding:11px 13px;
        border-left-width:3px;transition:background .15s}
  .jump:hover{background:var(--stone-800)}
  .jump:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  .jump.ok{border-left-color:var(--verdigris)} .jump.warn{border-left-color:var(--gold)}
  .jump.bad{border-left-color:var(--rust)} .jump.hold{border-left-color:var(--muted)}
  .jump b{font-family:var(--display);font-size:23px;line-height:1;width:16px;flex:none}
  .jump.ok b{color:var(--verdigris)} .jump.warn b{color:var(--gold)}
  .jump.bad b{color:var(--rust)} .jump.hold b{color:var(--muted)}
  .jump span{font-size:13px;color:var(--muted);line-height:1.3}

  .card{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:0;
        background:var(--stone-850);border:1px solid var(--edge);border-radius:3px;overflow:hidden;
        scroll-margin-top:20px}
  .card.ok{border-color:color-mix(in srgb,var(--verdigris) 45%,var(--edge))}
  .shot{background:#fff;display:flex;align-items:center;justify-content:center;min-width:0;position:relative}
  .shot img{display:block;width:100%;height:auto}
  .pending{width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;
           background:var(--stone-800);color:var(--muted);font-family:var(--data);font-size:13px}
  .stamp{position:absolute;top:0;left:0;font-family:var(--display);font-size:30px;line-height:1;
         padding:11px 17px;background:var(--stone-900);color:var(--ink);
         border-right:1px solid var(--edge);border-bottom:1px solid var(--edge);z-index:1}
  .stamp.ok{color:var(--verdigris)} .stamp.warn{color:var(--gold)}
  .stamp.bad{color:var(--rust)} .stamp.hold{color:var(--muted)}
  .read{padding:26px 28px;display:flex;flex-direction:column;gap:13px;min-width:0}
  .rowtop{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .tag{font-family:var(--data);font-size:11px;letter-spacing:.13em;text-transform:uppercase;
       padding:4px 10px;border-radius:2px;border:1px solid currentColor}
  .tag.ok{color:var(--verdigris)} .tag.warn{color:var(--gold)}
  .tag.bad{color:var(--rust)} .tag.hold{color:var(--muted)}
  .sid{font-family:var(--data);font-size:12px;color:var(--muted)}
  h3{font-family:var(--display);font-size:25px;font-weight:600;margin:0;line-height:1.2}
  .read p{margin:0;font-size:15px}
  .head{font-weight:600}
  .note{border-left:2px solid var(--gold);padding-left:13px;color:var(--muted);font-size:14px}
  .note span{font-family:var(--data);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;
             color:var(--gold);display:block}
  .angle{display:flex;align-items:center;gap:14px;margin-top:4px;padding-top:16px;border-top:1px solid var(--edge)}
  .gauge{width:98px;height:52px;flex:none}
  .angletext b{font-family:var(--data);font-size:19px;font-variant-numeric:tabular-nums;display:block}
  .angletext span{font-size:11.5px;color:var(--muted);line-height:1.35;display:block}
  details{margin-top:2px;border-top:1px solid var(--edge);padding-top:12px}
  summary{cursor:pointer;font-family:var(--data);font-size:11px;letter-spacing:.13em;
          text-transform:uppercase;color:var(--muted)}
  summary:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
  .prompt{font-family:var(--data);font-size:12px;line-height:1.6;color:var(--muted);margin-top:10px}

  footer{border-top:1px solid var(--edge);padding-top:28px;color:var(--muted);font-size:14.5px;
         display:flex;flex-direction:column;gap:12px}
  footer b{color:var(--ink)}
  footer code{font-family:var(--data);font-size:13px;color:var(--gold)}

  @media (max-width:860px){ .card{grid-template-columns:1fr} }
</style>

<div class="wrap">
  <header>
    <div class="eyebrow">bg-harness &middot; castle-grand-topdown &middot; Lucid Origin &middot; 9 Aug 2026</div>
    <h1>The castle problem is projection, not size</h1>
    <p class="sub">Every candidate generated for the re-angled castle, newest rounds included.
      Sorted by verdict; the index below is in letter order.</p>
  </header>

  <section class="thesis">
    <p class="lead">The current wall is a facade drawn at about 25&deg; &mdash; roughly all face, no top.
      Your references are high top-down: a broad wall-walk you could stand on, with only a short band of
      face below it. That is why one can be walked around and the other can only be looked at.</p>
    <div class="stats">
      <div class="stat now"><b>2.88&times;</b><span>Today &mdash; <code>castle-wall-straight-v2</code> at 288px against the 100px hero</span></div>
      <div class="stat tgt"><b>2.5&ndash;3&times;</b><span>Both reference tilemaps &mdash; wall band against a character</span></div>
      <div class="stat cand"><b>10.7&times;</b><span>E as drawn &mdash; 268px wall against the 25px figure Leonardo added</span></div>
    </div>
    <p><b>The finding, after fifteen generations.</b> This model draws a top-down wall only when the run is
      <b>horizontal and spans the frame</b>. That is the whole rule. Angle adjectives do nothing, and
      &ldquo;tilted toward the viewer&rdquo; actively produces isometric. Vertical became diagonal isometric
      (P). Ninety-degree corners became curves, twice (G, M). Free-standing objects centred on white came
      back isometric every single time (F, H, I, K). <b>E is the only composition it will hold</b> &mdash;
      so E and B are what you take forward, and nothing further gets generated here.</p>
  </section>

  <section class="thesis">
    <p class="lead">Take B and E into Leonardo. Everything else comes out of them.</p>
    <p>The corner, the side wall, the tower junction and the end caps are not plates to be designed &mdash;
      they are what <code>/create-tiles-pro</code> with <code>tile_feature: 'building'</code> returns as a
      56-piece set for 20 generations, style-referenced off the approved wall. That is the correct place to
      get them, and it is why the wall has to be right first. The prompt that produced each plate is under
      its card, ready to paste.</p>
  </section>

  <nav class="index" aria-label="Jump to a candidate">{{JUMP}}</nav>

  {{CARDS}}

  <footer>
    <p><b>Parts still open:</b> corner, tower-on-wall, gate-in-wall (M, N, O &mdash; round 3), then the
      Battle Tower (L) once those lock, style-referenced off the approved art rather than invented
      alongside it. The wall end cap is deferred; it can be cut from the corner piece later.</p>
    <p><b>Then the pipeline:</b> crop &rarr; <code>image-to-pixelart</code> &rarr; border-flood white key
      &rarr; foundation cut &rarr; one shared-palette quantize across every piece at once, which is what
      makes the bricks match by construction rather than by matching them afterward.</p>
    <p>Full-resolution masters: <code>card-engine/scripts/bg-harness/out/castle-grand-topdown/</code></p>
  </footer>
</div>
"""


if __name__ == "__main__":
    html = build()
    dest = os.path.join(OUT, "review.html")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {dest}  ({os.path.getsize(dest)/1024:.0f} KB)")
