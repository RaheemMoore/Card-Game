#!/usr/bin/env python3
"""Build the first Castle Front sunset scene-layer review fragment."""

from __future__ import annotations

import base64
import sys
from pathlib import Path


def data_uri(path: Path) -> str:
    return f"data:image/png;base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: build_continuous_sky_harness.py <output-fragment.html>")
        return 2

    asset_root = (
        Path(__file__).resolve().parents[2]
        / "public/assets/kits/castle-front/background"
    )
    sky = data_uri(asset_root / "sky/castle-front-sunset-sky.png")
    mountains = data_uri(
        asset_root / "mountains/castle-front-mountains-loop.png"
    )
    forest = data_uri(asset_root / "forest/castle-front-forest-loop.png")
    actor_dir = asset_root / "clouds"
    sources = {
        actor: {
            palette: data_uri(actor_dir / f"cloud-{actor}-{palette}.png")
            for palette in ("afternoon", "sunset", "twilight")
        }
        for actor in ("broad", "mound", "puffs", "sweep")
    }

    fragment = f'''<div id="cloud-actor-harness">
  <style>
    #cloud-actor-harness {{ display: grid; gap: 12px; width: 100%; color: var(--foreground); }}
    #cloud-actor-harness .heading {{ display: flex; align-items: baseline; justify-content: space-between; gap: 8px 18px; flex-wrap: wrap; }}
    #cloud-actor-harness .heading p, #cloud-actor-harness .note {{ color: var(--muted-foreground); }}
    #cloud-actor-harness .sky {{
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      min-height: 320px;
      overflow: hidden;
      isolation: isolate;
      background: #6f9fc1 url("{sky}") center / cover no-repeat;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }}
    #cloud-actor-harness .sky::after {{
      content: "";
      position: absolute;
      inset: 0;
      z-index: 5;
      pointer-events: none;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--foreground) 10%, transparent);
    }}
    #cloud-actor-harness .cloud {{
      position: absolute;
      z-index: 2;
      height: auto;
      image-rendering: pixelated;
      pointer-events: none;
      user-select: none;
      will-change: transform;
    }}
    #cloud-actor-harness .mountains {{
      position: absolute;
      z-index: 1;
      inset-inline: 0;
      bottom: 0;
      height: 55%;
      opacity: .82;
      background: transparent url("{mountains}") repeat-x left bottom / auto 100%;
      filter: saturate(.88) brightness(.96);
      image-rendering: pixelated;
      pointer-events: none;
      user-select: none;
      will-change: background-position;
    }}
    #cloud-actor-harness .forest {{
      position: absolute;
      z-index: 3;
      inset-inline: 0;
      bottom: 0;
      height: 28%;
      opacity: .92;
      background: transparent url("{forest}") repeat-x left bottom / auto 100%;
      image-rendering: pixelated;
      pointer-events: none;
      user-select: none;
      will-change: background-position;
    }}
    #cloud-actor-harness .travel {{
      position: absolute;
      left: 10px;
      bottom: 10px;
      z-index: 6;
      padding: 4px 8px;
      border: 1px solid rgb(255 255 255 / 28%);
      border-radius: var(--radius-sm);
      color: rgb(255 255 255 / 94%);
      background: rgb(28 42 58 / 52%);
      backdrop-filter: blur(6px);
      font-variant-numeric: tabular-nums;
    }}
    #cloud-actor-harness .range {{ min-width: 220px; }}
    #cloud-actor-harness .range-head {{ display: flex; justify-content: space-between; gap: 10px; margin-bottom: 4px; }}
  </style>

  <div class="heading">
    <h2>Castle Front — first sunset scene</h2>
    <p>Locked depth: forest .70 · mountains .50 · clouds .20/.30 · fixed sky</p>
  </div>

  <div class="sky" id="cloud-sky" role="img" aria-label="The first Castle Front sunset scene with a fixed warm sky, camera-parallax mountains and forest, and four pixel-art clouds that combine depth parallax with continuous wind.">
    <div class="mountains" aria-hidden="true"></div>
    <img class="cloud" data-cloud="broad" alt="" src="{sources['broad']['sunset']}">
    <img class="cloud" data-cloud="mound" alt="" src="{sources['mound']['sunset']}">
    <img class="cloud" data-cloud="puffs" alt="" src="{sources['puffs']['sunset']}">
    <img class="cloud" data-cloud="sweep" alt="" src="{sources['sweep']['sunset']}">
    <div class="forest" aria-hidden="true"></div>
    <output class="travel text-small" id="cloud-travel">Camera 00000 px · Running</output>
  </div>

  <div class="viz-controls" aria-label="Cloud actor preview controls">
    <label class="form-label" for="cloud-palette">Cloud palette
      <select class="form-select" id="cloud-palette">
        <option value="afternoon">Mid-afternoon</option>
        <option value="sunset" selected>Sunset</option>
        <option value="twilight">Twilight</option>
      </select>
    </label>
    <label class="form-label range" for="cloud-opacity">
      <span class="range-head"><span>Cloud opacity</span><output id="opacity-output">100%</output></span>
      <input class="form-range" id="cloud-opacity" type="range" min="55" max="100" step="5" value="100">
    </label>
    <label class="form-label range" for="run-speed">
      <span class="range-head"><span>Run speed</span><output id="speed-output">80 px/s</output></span>
      <input class="form-range" id="run-speed" type="range" min="20" max="180" step="5" value="80">
    </label>
    <label class="form-label range" for="cloud-wind">
      <span class="range-head"><span>Cloud wind</span><output id="wind-output">12 px/s</output></span>
      <input class="form-range" id="cloud-wind" type="range" min="0" max="40" step="1" value="12">
    </label>
    <button type="button" class="btn btn-primary" id="motion-toggle" aria-pressed="true">Stop character</button>
  </div>
  <script>
    (() => {{
      const root = document.getElementById('cloud-actor-harness');
      const paletteSelect = root.querySelector('#cloud-palette');
      const opacity = root.querySelector('#cloud-opacity');
      const opacityOutput = root.querySelector('#opacity-output');
      const speed = root.querySelector('#run-speed');
      const speedOutput = root.querySelector('#speed-output');
      const wind = root.querySelector('#cloud-wind');
      const windOutput = root.querySelector('#wind-output');
      const toggle = root.querySelector('#motion-toggle');
      const travel = root.querySelector('#cloud-travel');
      const mountain = root.querySelector('.mountains');
      const forest = root.querySelector('.forest');
      const images = Array.from(root.querySelectorAll('[data-cloud]'));
      const sources = {sources!r};
      const motion = {{
        broad: {{ y: 15, width: 27, start: 7,  parallax: .20, period: 231 }},
        mound: {{ y: 39, width: 23, start: 34, parallax: .30, period: 239 }},
        puffs: {{ y: 8,  width: 13, start: 62, parallax: .20, period: 251 }},
        sweep: {{ y: 28, width: 28, start: 70, parallax: .30, period: 243 }}
      }};
      let cameraDistance = 0;
      let windDistance = 0;
      let running = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let last = 0;
      let frame = 0;

      function applyPalette() {{
        const palette = paletteSelect.value;
        images.forEach((image) => {{ image.src = sources[image.dataset.cloud][palette]; }});
      }}

      function paint() {{
        const alpha = Number(opacity.value) / 100;
        const viewportWidth = root.querySelector('#cloud-sky').clientWidth || 1;
        const windVw = windDistance / viewportWidth * 100;
        mountain.style.backgroundPositionX = `${{-cameraDistance * .50}}px`;
        forest.style.backgroundPositionX = `${{-cameraDistance * .70}}px`;
        images.forEach((image) => {{
          const config = motion[image.dataset.cloud];
          const cameraVw = cameraDistance * config.parallax / viewportWidth * 100;
          const x = ((config.start - cameraVw - windVw + 30) % config.period + config.period) % config.period - 30;
          image.style.top = `${{config.y}}%`;
          image.style.width = `${{config.width}}%`;
          image.style.opacity = String(alpha);
          image.style.transform = `translate3d(${{x}}vw, 0, 0)`;
        }});
        travel.value = `Camera ${{String(Math.floor(cameraDistance)).padStart(5, '0')}} px · ${{running ? 'Running' : 'Stopped'}}`;
      }}

      function setRunning(next) {{
        running = next;
        toggle.setAttribute('aria-pressed', String(next));
        toggle.textContent = next ? 'Stop character' : 'Start character';
        toggle.classList.toggle('btn-primary', next);
        paint();
      }}

      function tick(time) {{
        if (!last) last = time;
        const elapsed = Math.min(50, time - last) / 1000;
        last = time;
        if (running) cameraDistance += elapsed * Number(speed.value);
        windDistance += elapsed * Number(wind.value);
        paint();
        frame = requestAnimationFrame(tick);
      }}

      paletteSelect.addEventListener('change', applyPalette);
      opacity.addEventListener('input', () => {{ opacityOutput.value = `${{opacity.value}}%`; paint(); }});
      speed.addEventListener('input', () => {{ speedOutput.value = `${{speed.value}} px/s`; }});
      wind.addEventListener('input', () => {{ windOutput.value = `${{wind.value}} px/s`; }});
      toggle.addEventListener('click', () => setRunning(!running));
      window.addEventListener('pagehide', () => cancelAnimationFrame(frame), {{ once: true }});
      applyPalette();
      setRunning(running);
      frame = requestAnimationFrame(tick);
    }})();
  </script>
</div>
'''

    # Python repr uses single-quoted object keys and is valid JavaScript here;
    # make booleans/null unnecessary by storing strings only.
    output = Path(sys.argv[1]).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(fragment, encoding="utf-8")
    print(output)
    print(f"{output.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
