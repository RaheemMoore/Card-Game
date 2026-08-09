#!/usr/bin/env python3
"""Build the castle high-top-down candidate review sheet.

Rule Zero: never show work in chat, show it in a harness. harness.mjs `sheet`
shells out to `sips`, which is macOS-only, so on Windows every thumbnail falls
back to a full-size PNG base64 and the sheet lands at ~15 MB. This builds the
same thing with PIL and adds the one thing the generic sheet cannot show: the
measured camera ANGLE per candidate, which is the entire finding of this run.

    python scripts/bg-harness/build-castle-sheet.py

Writes out/castle-grand-topdown/review.html, self-contained (data-URI images),
suitable for publishing straight to an Artifact.
"""
import base64
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "castle-grand-topdown")

# Angle is eyeballed against the wall-walk:face depth ratio, then sanity-checked
# against the reference tilemaps. It is a judgement, not a measurement, and is
# labelled as such on the sheet. The 65-75 target band comes from the two
# reference tilemaps Raheem supplied 2026-08-09.
# Letters are the config's own state order (A-F) and are how Raheem refers to
# these in conversation, so they must stay stable even though the sheet is
# sorted by verdict rather than by letter.
CARDS = [
    dict(
        letter="E", id="kit-b-wall-straight", verdict="use", angle=70,
        title="Long straight wall run",
        head="This is the kit source.",
        body="Everything the brief asked for and one thing it didn't. Broad paved wall-walk running the "
             "full width; crenellations read from above as a row of short blocks; a short face band below "
             "carrying evenly spaced arrow slits and a battered plinth; identical repeating bays; a stair "
             "rising to the walk; octagonal corner towers with verdigris caps. It also drew a person at the "
             "foot of the stair unprompted, which is where the scale number below comes from.",
        note="Cut into wall.walkway + wall.face here. Also the style reference for the 56-piece PixelLab kit.",
    ),
    dict(
        letter="B", id="front-b-arcane", verdict="use", angle=70,
        title="Arcane gatehouse, sigils and ward",
        head="This is the gate.",
        body="Square towers whose flat rooftops read as real top planes, sigils laid flat on them, curtain "
             "wall running off both frame edges with its walkway and crenellations visible, and a short face "
             "band carrying the arch. Side by side with your second reference it is the same read. The "
             "floating crystal is the one element drawn at the wrong angle — it stands vertical while "
             "everything under it lies flat.",
        note="Keep the composition, lose or flatten the crystal spire.",
    ),
    dict(
        letter="D", id="kit-a-wall-corner", verdict="partial", angle=86,
        title="Wall turning a corner",
        head="Right corner, wrong angle.",
        body="Went almost to a straight overhead plan. The corner turn and the walkway surface are exactly "
             "the geometry we need and worth keeping as reference, but the face band has vanished entirely, "
             "so a wall built from this would have no visible height at all. The tower reads as a flat disc.",
        note="Reference only. Re-roll the corner from the approved wall once it exists.",
    ),
    dict(
        letter="A", id="front-a-grand", verdict="reject", angle=88,
        title="Grand gatehouse, drum towers",
        head="Overshot to plan view.",
        body="The drum tower roofs became pure circles and the gate block a flat rectangle. There is no face "
             "band, so nothing reads as standing up off the ground. Useful only as evidence of how far the "
             "model will travel when the subject is round.",
        note=None,
    ),
    dict(
        letter="C", id="front-c-cathedral", verdict="reject", angle=35,
        title="Cathedral gate, verdigris roofs",
        head="Reverted to the defect we're removing.",
        body="A near-elevation, roughly the angle the current castle kit is drawn at. Handsome, and entirely "
             "unusable: it is a facade you can only ever look at. Worth keeping visible because it is the "
             "clearest possible before/after against the two above.",
        note=None,
    ),
    dict(
        letter="F", id="mass-a-keep", verdict="reject", angle=45,
        title="The great keep",
        head="Isometric, despite the negative.",
        body="“isometric” sits in this config's negative prompt and the model drew isometric anyway. "
             "It also came back nearly unshaded, closer to a line render than to game art.",
        note=None,
    ),
]

VERDICT = {
    "use": ("Use", "ok"),
    "partial": ("Reference only", "warn"),
    "reject": ("Reject", "bad"),
}


def data_uri(path):
    with open(path, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()


def gauge(deg):
    """A 0-90 arc with the 65-75 target band marked and the candidate's angle drawn."""
    import math
    def pt(d, r):
        a = math.radians(180 - d)
        return 60 + r * math.cos(a), 56 + r * math.sin(a) * -1
    x1, y1 = pt(65, 40); x2, y2 = pt(75, 40)
    hx, hy = pt(deg, 38)
    ok = 65 <= deg <= 75
    return f"""<svg class="gauge" viewBox="0 0 120 64" aria-hidden="true">
  <path d="M 20 56 A 40 40 0 0 1 100 56" fill="none" stroke="var(--edge)" stroke-width="7" stroke-linecap="round"/>
  <path d="M {x1:.1f} {y1:.1f} A 40 40 0 0 1 {x2:.1f} {y2:.1f}" fill="none" stroke="var(--verdigris)" stroke-width="7" stroke-linecap="round"/>
  <line x1="60" y1="56" x2="{hx:.1f}" y2="{hy:.1f}" stroke="{'var(--verdigris)' if ok else 'var(--gold)'}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="60" cy="56" r="3.5" fill="{'var(--verdigris)' if ok else 'var(--gold)'}"/>
</svg>"""


def build():
    man = json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))
    cards = []
    for c in CARDS:
        label, tone = VERDICT[c["verdict"]]
        img = data_uri(os.path.join(OUT, f"_thumb-{c['id']}.jpg"))
        prompt = man["states"].get(c["id"], {}).get("prompt", "")
        note = f'<p class="note"><span>Next</span>{c["note"]}</p>' if c["note"] else ""
        cards.append(f"""<article class="card {tone}" id="{c['letter']}">
  <div class="shot"><span class="stamp {tone}">{c['letter']}</span><img src="{img}" alt="{c['title']}"/></div>
  <div class="read">
    <div class="rowtop">
      <span class="tag {tone}">{label}</span>
      <code class="sid">{c['id']}</code>
    </div>
    <h3><span class="lt">{c['letter']}</span>{c['title']}</h3>
    <p class="head">{c['head']}</p>
    <p>{c['body']}</p>
    {note}
    <div class="angle">
      {gauge(c['angle'])}
      <div class="angletext"><b>~{c['angle']}&deg;</b><span>camera angle, judged<br/>target band 65&ndash;75&deg;</span></div>
    </div>
    <details><summary>Prompt</summary><p class="prompt">{prompt}</p></details>
  </div>
</article>""")

    # Index in LETTER order, not verdict order — it exists so Raheem can jump to
    # whichever one he wants to talk about.
    jump = "".join(
        f'<a class="jump {VERDICT[c["verdict"]][1]}" href="#{c["letter"]}">'
        f'<b>{c["letter"]}</b><span>{c["title"]}</span></a>'
        for c in sorted(CARDS, key=lambda c: c["letter"])
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
  .jump.bad{border-left-color:var(--rust)}
  .jump b{font-family:var(--display);font-size:23px;line-height:1;width:16px;flex:none}
  .jump.ok b{color:var(--verdigris)} .jump.warn b{color:var(--gold)} .jump.bad b{color:var(--rust)}
  .jump span{font-size:13px;color:var(--muted);line-height:1.3}

  .card{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:0;
        background:var(--stone-850);border:1px solid var(--edge);border-radius:3px;overflow:hidden;
        scroll-margin-top:20px}
  .card.ok{border-color:color-mix(in srgb,var(--verdigris) 45%,var(--edge))}
  .shot{background:#fff;display:flex;align-items:center;justify-content:center;min-width:0;position:relative}
  .shot img{display:block;width:100%;height:auto}
  .stamp{position:absolute;top:0;left:0;font-family:var(--display);font-size:30px;line-height:1;
         padding:11px 17px;background:var(--stone-900);color:var(--ink);
         border-right:1px solid var(--edge);border-bottom:1px solid var(--edge)}
  .stamp.ok{color:var(--verdigris)} .stamp.warn{color:var(--gold)} .stamp.bad{color:var(--rust)}
  .lt{font-size:.72em;color:var(--muted);margin-right:.5em;font-variant-numeric:tabular-nums}
  .read{padding:26px 28px;display:flex;flex-direction:column;gap:13px;min-width:0}
  .rowtop{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .tag{font-family:var(--data);font-size:11px;letter-spacing:.13em;text-transform:uppercase;
       padding:4px 10px;border-radius:2px;border:1px solid currentColor}
  .tag.ok{color:var(--verdigris)} .tag.warn{color:var(--gold)} .tag.bad{color:var(--rust)}
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
    <p class="sub">Six candidates for a re-angled castle. The winning two become the authoritative front
      everything else is cut from or style-referenced against.</p>
  </header>

  <section class="thesis">
    <p class="lead">The current wall is a facade drawn at about 25&deg; &mdash; roughly all face, no top.
      Your references are high top-down: a broad wall-walk you could stand on, with only a short band of
      face below it. That is why one can be walked around and the other can only be looked at.</p>
    <p>Making the wall taller would only have produced a taller facade. The wall-to-hero ratio was never
      the problem &mdash; it already matches the references almost exactly.</p>
    <div class="stats">
      <div class="stat now"><b>2.88&times;</b><span>Today &mdash; <code>castle-wall-straight-v2</code> at 288px against the 100px hero</span></div>
      <div class="stat tgt"><b>2.5&ndash;3&times;</b><span>Both reference tilemaps &mdash; wall band against a character</span></div>
      <div class="stat cand"><b>10.7&times;</b><span>The winning candidate as drawn &mdash; 268px wall against the 25px figure Leonardo added</span></div>
    </div>
    <p>So the candidate is drawn at true castle proportion, and the references cheat it down to about a
      third of that. We will need to pick a working scale by compositing the approved wall against the real
      hero on the real ground &mdash; not by arithmetic. That is the next gate, after your pass in Leonardo.</p>
  </section>

  <nav class="index" aria-label="Jump to a candidate">{{JUMP}}</nav>

  {{CARDS}}

  <footer>
    <p><b>The pattern in the failures:</b> the angle holds when the subject is a <em>wall</em> and drifts
      when it is a free-standing <em>building</em>. Both wall prompts landed in band; two of the three
      building prompts flew past it and the keep came back isometric with &ldquo;isometric&rdquo; sitting in
      the negative prompt. Wall-shaped briefs are trustworthy here; building-shaped briefs need the angle
      restated inside the subject sentence, not just the style header.</p>
    <p><b>Your turn:</b> take <b>B</b> and <b>E</b> into the
      Leonardo web UI, push the design, and hand the masters back. Then they go through
      <code>image-to-pixelart</code>, a border-flood white key, a foundation cut, and a shared-palette
      quantize across every piece at once &mdash; which is what makes the bricks match by construction
      rather than by matching them afterward.</p>
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
