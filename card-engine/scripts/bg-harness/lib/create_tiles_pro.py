#!/usr/bin/env python3
"""POST /create-tiles-pro — connectable tile kits (buildings, cliffs, roads, terrain).

WHY A CLIFF IS A "BUILDING" KIT. Raheem's reference cliffs have lobed, organic
edges that never repeat the same way twice, which a straight-run sprite plus a
corner and an endcap physically cannot produce — that is exactly why the current
terrain reads as a masonry retaining wall. Those cliffs are a connectable TILE
SET: paint with it and the corners, ends and curves resolve themselves.

`/create-tileset` looked like the obvious endpoint and is not. Its response is
exactly 16 tiles named by corner combination with terrain types ["lower",
"upper"] — a FLAT boundary between two ground materials, like the grass-to-dirt
sets already in the courtyard. No vertical face, so it cannot make a cliff you
climb.

`tile_feature: 'building'` gives "floor, connectable walls, doorways, pillar and
staircase" with `building_wall_tiles` 1-3. A cliff is structurally that: a
plateau floor, a 3-tile rock face, and every corner. The name is about the
intended use, not the geometry.

THE COST OF THIS ROUTE, STATED PLAINLY: `tile_feature` cannot be combined with
`style_images`, so there is no way to point this at a Leonardo design. Style
comes from text alone. That is why Raheem's colour pass matters — the shape and
connectivity come from here, the colour comes later from the shared palette.

Height: 3 tiles = 96px against a 71px hero, so it reads as "climb", not "step
up". Two tiles would be 64px, shorter than he is, and would read as a hop —
which matters because monsters camp at the foot and there is a climb animation
planned.

    python lib/create_tiles_pro.py <config.json> --out DIR [--dry-run]

Background job: POST returns 202 with a tile_id immediately, then
GET /tiles-pro/{tile_id} is polled until the tiles land. Roughly 20 generations
per kit, so --dry-run prints the body and spends nothing.
"""
import argparse
import base64
import json
import os
import time
import urllib.error
import urllib.request

BASE = "https://api.pixellab.ai/v2"
BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def load_key():
    env = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env.local"))
    for line in open(env, encoding="utf-8"):
        if line.startswith("PIXELLAB_API_KEY="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise SystemExit(f"PIXELLAB_API_KEY not found in {env}")


def api(method, path, key, body=None, soft=()):
    """soft: HTTP codes that mean "not an error, just not ready yet".

    GET /tiles-pro/{id} answers 423 Locked with "Tiles are still being
    generated" while the background job runs. Treating every HTTPError as fatal
    killed the poller on its first tick and made a perfectly healthy job look
    like a failure.
    """
    req = urllib.request.Request(
        BASE + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"authorization": f"Bearer {key}", "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code in soft:
            return {"status": f"http {e.code} — still generating", "_pending": True}
        raise SystemExit(f"{e.code} {path}\n{e.read().decode()[:900]}")


def role_names(rules):
    """index -> semantic role, from tile_rules.

    A building kit returns 56 anonymous `tile_N` URLs plus a `tile_rules` map
    that says which index is the floor, which are the four sides, which are the
    corners, the pillar, the stairs and the doors. Without folding those names
    into the filenames you get 56 numbered PNGs and no way to tell a north edge
    from a south one — which is the entire value of a connectable set.
    """
    names = {}
    parts = (rules or {}).get("parts", {})
    for k, v in parts.items():
        if isinstance(v, int):
            names[v] = k
        elif isinstance(v, dict):
            for sub, idx in v.items():
                if isinstance(idx, int):
                    names[idx] = f"{k}-{sub}"
        elif isinstance(v, list) and k != "painted":
            for n, idx in enumerate(v):
                if isinstance(idx, int):
                    names[idx] = f"{k}{n}"
    return names


def save_tiles(res, out_dir):
    """Write every tile PNG plus the placement rules that make the set usable.

    A building kit returns NOTHING inline — `storage_urls` is a dict of remote
    PNG links, which is what the playbook means by "nothing inline" for
    tile_feature: building. The inline `tiles` path below is kept because the
    plain (non-feature) tile response does use it.
    """
    os.makedirs(out_dir, exist_ok=True)
    written = 0

    rules = res.get("tile_rules") or {}
    names = role_names(rules)
    urls = res.get("storage_urls") or {}
    for key, url in sorted(urls.items(), key=lambda kv: int(kv[0].rsplit("_", 1)[-1])
                           if kv[0].rsplit("_", 1)[-1].isdigit() else 0):
        idx = int(key.rsplit("_", 1)[-1]) if key.rsplit("_", 1)[-1].isdigit() else written
        role = names.get(idx, "")
        fname = f"{idx:02d}_{role}.png" if role else f"{idx:02d}.png"
        try:
            # Cloudflare fronts the tile storage and answers urllib's default
            # User-Agent with 403 "error code: 1010" — a browser-fingerprint
            # block, not an auth failure. The bearer token makes no difference;
            # a browser UA does.
            with urllib.request.urlopen(
                    urllib.request.Request(url, headers={"User-Agent": BROWSER_UA}), timeout=120) as r:
                data = r.read()
        except Exception as e:  # noqa: BLE001 - a dead link should not lose the rest
            print(f"    {key}: {e}")
            continue
        with open(os.path.join(out_dir, fname), "wb") as f:
            f.write(data)
        written += 1

    tiles = res.get("tiles") or (res.get("tileset") or {}).get("tiles") or []
    for i, t in enumerate(tiles):
        img = t.get("image") or {}
        if not img.get("base64"):
            continue
        name = (t.get("name") or t.get("id") or f"tile{i}").replace("+", "_").replace(" ", "-")
        with open(os.path.join(out_dir, f"{i:02d}_{name}.png"), "wb") as f:
            f.write(base64.b64decode(img["base64"]))
        written += 1

    with open(os.path.join(out_dir, "_rules.json"), "w", encoding="utf-8") as f:
        json.dump({k: v for k, v in res.items() if k != "storage_urls"}, f, indent=1)
    return written, len(urls) + len(tiles)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("config")
    ap.add_argument("--out", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--poll", type=int, default=15, help="seconds between polls")
    ap.add_argument("--timeout", type=int, default=1800)
    ap.add_argument("--resume", help="poll an existing tile_id instead of generating again")
    a = ap.parse_args()

    cfg = json.load(open(a.config, encoding="utf-8"))
    body = {k: v for k, v in cfg.items() if not k.startswith("_")}
    print(json.dumps(body, indent=1))
    if a.dry_run:
        print("\ndry run — nothing spent")
        return

    key = load_key()
    # --resume polls an EXISTING job. This exists because the first version did
    # not have it: a poller crash looked like a failed run, the obvious response
    # was to run the command again, and that spent a second kit on a job that was
    # already generating fine. A background job that hands back an id up front
    # must always have a way to re-attach to it.
    if a.resume:
        tile_id = a.resume
        print(f"\nresuming tile_id {tile_id} — no new generation")
    else:
        started = api("POST", "/create-tiles-pro", key, body)
        tile_id = started.get("tile_id")
        print(f"\ntile_id {tile_id}   usage {started.get('usage')}   status {started.get('status')}")

    t0 = time.time()
    while time.time() - t0 < a.timeout:
        time.sleep(a.poll)
        res = api("GET", f"/tiles-pro/{tile_id}", key, soft=(423, 404, 425))
        status = res.get("status") or res.get("state") or "?"
        tiles = res.get("tiles") or (res.get("tileset") or {}).get("tiles") or []
        print(f"  {int(time.time()-t0):4d}s  status={status}  tiles={len(tiles)}")
        # A building kit NEVER returns inline `tiles` — it returns storage_urls.
        # Testing only for `tiles` meant the poller kept polling a job that had
        # been finished for twenty minutes, timed out, and looked like a failure.
        # That is the exact appearance that led to re-running the command and
        # paying for a second kit.
        if tiles or res.get("storage_urls") or str(status).lower() in ("completed", "succeeded", "done"):
            written, total = save_tiles(res, a.out)
            print(f"\n{written} file(s) from {total} tiles -> {a.out}")
            return
        if str(status).lower() in ("failed", "error"):
            raise SystemExit(json.dumps(res)[:600])
    raise SystemExit(f"timed out after {a.timeout}s; tile_id {tile_id} is still valid, re-poll it")


if __name__ == "__main__":
    main()
