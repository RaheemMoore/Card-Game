#!/usr/bin/env python3
"""POST /create-tileset — the organic terrain-boundary generator.

WHY THIS EXISTS, AND WHY IT NEARLY DID NOT. I dismissed this endpoint by reading
the EXAMPLE in its docs — a 16x16, 16-tile flat response — and concluding it
could not make a cliff with height. That was wrong, and it cost a 20-generation
building kit that produced coursed masonry instead of rock. The parameters, not
the example, are the contract:

    shape_style 'round'   rounded boundary geometry
    raggedness            terrain boundary noise, 0 smooth -> 1 rough
    slope_size            "Slope on N/W/E sides as a fraction of WALL HEIGHT"
    spread_x              boundary spread, 0 steep -> 1 gradual
    transition_size       above 0.5 switches to the extended 4x8 layout
    upper/lower/transition_reference_image   style from a real picture
    color_image           forced palette
    view                  'high top-down' | 'low top-down'

Between them those are exactly the lobed, non-repeating cliff edges in Raheem's
reference — procedurally, without needing a reference image at all.

STANDING RULE THIS ENFORCES: probe before batching. Never spend a 20-generation
kit before a single cheap generation has shown the LOOK is right. Three separate
mistakes in the cliff work traced back to spending first and looking after.

    python lib/create_tileset.py <config.json> --out DIR [--dry-run]
"""
import argparse
import base64
import json
import os
import urllib.error
import urllib.request

BASE = "https://api.pixellab.ai/v2"


def load_key():
    env = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env.local"))
    for line in open(env, encoding="utf-8"):
        if line.startswith("PIXELLAB_API_KEY="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise SystemExit("PIXELLAB_API_KEY not found")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("config")
    ap.add_argument("--out", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    cfg = json.load(open(a.config, encoding="utf-8"))
    body = {k: v for k, v in cfg.items() if not k.startswith("_")}

    # Reference images live as PATHS in the config, not inline base64 — a config
    # you cannot read is a config nobody checks before spending. Any key named
    # `_ref_<field>` is loaded here and sent as <field>.
    for key, path in list(cfg.items()):
        if not key.startswith("_ref_"):
            continue
        field = key[len("_ref_"):]
        with open(path, "rb") as f:
            body[field] = {"type": "base64", "base64": base64.b64encode(f.read()).decode(),
                           "format": "png"}
        print(f"  reference {field:26s} <- {path}")
    print(json.dumps(body, indent=1))
    if a.dry_run:
        print("\ndry run — nothing spent")
        return

    key = load_key()
    req = urllib.request.Request(
        BASE + "/create-tileset", data=json.dumps(body).encode(),
        headers={"authorization": f"Bearer {key}", "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{e.code}\n{e.read().decode()[:900]}")

    os.makedirs(a.out, exist_ok=True)
    ts = res.get("tileset", res)
    tiles = ts.get("tiles", [])
    print(f"\nusage {res.get('usage')}   {ts.get('total_tiles', len(tiles))} tiles   "
          f"tile_size {ts.get('tile_size')}")
    for i, t in enumerate(tiles):
        img = t.get("image") or {}
        if not img.get("base64"):
            continue
        # The corner signature is the tile's identity in a Wang set — keep it.
        name = (t.get("name") or f"tile{i}").replace("+", "_").replace(" ", "-")
        with open(os.path.join(a.out, f"{i:02d}_{name}.png"), "wb") as f:
            f.write(base64.b64decode(img["base64"]))
    with open(os.path.join(a.out, "_response.json"), "w", encoding="utf-8") as f:
        json.dump({k: v for k, v in res.items() if k != "tileset"} |
                  {"tileset_meta": {k: v for k, v in ts.items() if k != "tiles"}}, f, indent=1)
    print(f"-> {a.out}")


if __name__ == "__main__":
    main()
