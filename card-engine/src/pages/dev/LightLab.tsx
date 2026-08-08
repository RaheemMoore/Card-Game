import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Light Lab — /dev/light-lab
 *
 * Raheem, 2026-08-07: "I do want you to build me a light lab that I can actually
 * tweak... the sun in the sky, the tree canopy over the ground, and then the light
 * going through the ground, splotches of light."
 *
 * This is deliberately NOT in Phaser Editor. The Editor places things; it never
 * runs the game, so it can never show lighting — lighting is a runtime effect.
 * That distinction is the lesson, so the lab is the thing that teaches it.
 *
 * The mechanism is exactly the three tricks from Phaser School lesson 4, and
 * nothing more:
 *   1. a full-screen RenderTexture filled with an ambient colour, drawn MULTIPLY
 *      — that rectangle IS the time of day;
 *   2. soft blobs `erase()`d out of it — those holes ARE the light through leaves;
 *   3. the blobs drift slowly — that drift IS the wind.
 *
 * Whatever numbers look right here are the numbers that get pasted into the real
 * courtyard scene, so the panel ends with a copyable JSON block.
 */

const KIT = '/assets/kits/halo-stone-castle';
const GRASS = `${KIT}/ground/tilesets/castle-ground-grass-dirt-wang-32.png`;
const GRASS_FRAME = 15; // all four corners grass — see the Wang decode in lesson 1
const TREES = [
  `${KIT}/recovered/castle-trees-a-0.png`,
  `${KIT}/recovered/castle-trees-b-0.png`,
  `${KIT}/recovered/castle-trees-a-2.png`,
  `${KIT}/recovered/castle-trees-b-1.png`,
  `${KIT}/recovered/castle-trees-a-1.png`,
];
/** A figure goes in every review surface — scale is invisible without one. */
const HERO = `${KIT}/characters/apprentice-redhair-alt-rot-south.png`;

/** Every value the lab exposes. This object is what gets copied out. */
export type LightSettings = {
  /** 0-24. Drives the ambient colour preset it lerps between. */
  hour: number;
  /** 0-1. How much of the ambient colour actually lands. */
  ambientStrength: number;
  /** How many holes are cut in the darkness. */
  spotCount: number;
  /** Radius of each hole, in screen px. */
  spotSize: number;
  /** 0-1. 0 = hard-edged disc, 1 = barely-there haze. */
  softness: number;
  /** px the spots wander. 0 = dead still. */
  driftAmount: number;
  /** Seconds for one drift cycle. Higher = lazier. */
  driftSeconds: number;
  /** Degrees. Where the sun is, which is where shadows point away from. */
  sunAngle: number;
  /** 0-1. Contact-shadow opacity. */
  shadowStrength: number;
  /** How far shadows stretch, as a fraction of sprite width. */
  shadowLength: number;
};

const DEFAULTS: LightSettings = {
  hour: 17,
  ambientStrength: 0.55,
  spotCount: 14,
  spotSize: 130,
  softness: 0.72,
  driftAmount: 26,
  driftSeconds: 9,
  sunAngle: 250,
  shadowStrength: 0.38,
  shadowLength: 0.7,
};

/**
 * Time of day as a handful of anchor colours, lerped between. Real sunlight is
 * not a hue wheel — dawn and dusk are warm and dim, noon is near-white, night is
 * cold and dark — so anchors beat any formula.
 */
const HOUR_ANCHORS: { h: number; c: [number, number, number]; label: string }[] = [
  { h: 0, c: [40, 55, 105], label: 'deep night' },
  { h: 5, c: [70, 75, 125], label: 'before dawn' },
  { h: 7, c: [225, 165, 140], label: 'dawn' },
  { h: 12, c: [255, 252, 240], label: 'noon' },
  { h: 16, c: [255, 225, 180], label: 'afternoon' },
  { h: 19, c: [235, 140, 105], label: 'golden hour' },
  { h: 21, c: [95, 85, 140], label: 'dusk' },
  { h: 24, c: [40, 55, 105], label: 'deep night' },
];

function ambientFor(hour: number): { rgb: [number, number, number]; label: string } {
  for (let i = 0; i < HOUR_ANCHORS.length - 1; i++) {
    const a = HOUR_ANCHORS[i];
    const b = HOUR_ANCHORS[i + 1];
    if (hour >= a.h && hour <= b.h) {
      const t = b.h === a.h ? 0 : (hour - a.h) / (b.h - a.h);
      return {
        rgb: [
          Math.round(a.c[0] + (b.c[0] - a.c[0]) * t),
          Math.round(a.c[1] + (b.c[1] - a.c[1]) * t),
          Math.round(a.c[2] + (b.c[2] - a.c[2]) * t),
        ],
        label: t < 0.5 ? a.label : b.label,
      };
    }
  }
  return { rgb: HOUR_ANCHORS[0].c, label: HOUR_ANCHORS[0].label };
}

const toHex = (rgb: [number, number, number]) => (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];

/* ------------------------------------------------------------------ scene */

/**
 * Built as a factory rather than a top-level class so Phaser is only touched
 * after the dynamic import resolves — the same rule the castle scene follows,
 * and the reason the 1.2 MB engine never enters the main bundle.
 */
function makeScene(Phaser: typeof import('phaser'), getSettings: () => LightSettings) {
  return class LightScene extends Phaser.Scene {
    private ambient!: Phaser.GameObjects.RenderTexture;
    private spots: { x: number; y: number; r: number; px: number; py: number }[] = [];
    private shadows: { img: Phaser.GameObjects.Image; w: number }[] = [];
    private t = 0;

    constructor() {
      super('light-lab');
    }

    preload() {
      this.load.spritesheet('grass', GRASS, { frameWidth: 32, frameHeight: 32 });
      TREES.forEach((src, i) => this.load.image(`tree${i}`, src));
      this.load.image('hero', HERO);
    }

    create() {
      const { width, height } = this.scale;

      // NEAREST on everything. The single most common cause of "the art looks
      // bad" in this project is Phaser's LINEAR default, not the art.
      this.textures.get('grass').setFilter(Phaser.Textures.FilterMode.NEAREST);
      TREES.forEach((_, i) => this.textures.get(`tree${i}`).setFilter(Phaser.Textures.FilterMode.NEAREST));

      this.add
        .tileSprite(0, 0, width, height, 'grass', GRASS_FRAME)
        .setOrigin(0, 0)
        .setTileScale(2, 2);

      this.makeBlobTexture();
      this.makeShadowTexture();

      // Trees, with a shadow under each. Placed by hand rather than on a grid so
      // the dapple has something irregular to fall across.
      const placed: [number, number, number, number][] = [
        [130, 300, 0, 2.0],
        [340, 250, 1, 1.7],
        [560, 320, 2, 2.1],
        [780, 260, 3, 1.8],
        [450, 460, 4, 2.3],
      ];
      for (const [x, y, idx, scale] of placed) {
        const key = `tree${idx}`;
        const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
        const w = src.width * scale;
        const shadow = this.add.image(x, y, 'blobShadow').setOrigin(0.5, 0.5).setDepth(1);
        this.shadows.push({ img: shadow, w });
        this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(2);
      }

      if (this.textures.exists('hero')) {
        this.textures.get('hero').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.add.image(650, 470, 'hero').setOrigin(0.5, 1).setScale(2).setDepth(3);
      }

      this.ambient = this.add
        .renderTexture(0, 0, width, height)
        .setOrigin(0, 0)
        .setDepth(50)
        .setBlendMode(Phaser.BlendModes.MULTIPLY);

      this.seedSpots();
    }

    /** A radial-gradient disc, generated at runtime so softness is a slider. */
    private makeBlobTexture() {
      const size = 256;
      const c = this.textures.createCanvas('blob', size, size);
      if (!c) return;
      const ctx = c.getContext();
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      c.refresh();
    }

    /**
     * The contact shadow. In the real scene this is generated from each sprite's
     * own alpha — squash, blur, darken — so it matches the silhouette exactly.
     * Here a soft ellipse is enough to tune direction and strength against.
     */
    private makeShadowTexture() {
      const w = 256;
      const h = 96;
      const c = this.textures.createCanvas('blobShadow', w, h);
      if (!c) return;
      const ctx = c.getContext();
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, h / w);
      ctx.translate(-w / 2, -w / 2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
      ctx.restore();
      c.refresh();
    }

    /** Fixed pseudo-random layout — reseeded only when the count changes. */
    private seedSpots() {
      const { width, height } = this.scale;
      const n = getSettings().spotCount;
      this.spots = [];
      let s = 20260807;
      const rand = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
      for (let i = 0; i < n; i++) {
        this.spots.push({
          x: rand() * width,
          y: rand() * height,
          r: 0.6 + rand() * 0.8,
          px: rand() * Math.PI * 2,
          py: rand() * Math.PI * 2,
        });
      }
    }

    update(_time: number, delta: number) {
      const s = getSettings();
      if (this.spots.length !== s.spotCount) this.seedSpots();
      this.t += delta / 1000;

      const { rgb } = ambientFor(s.hour);
      const { width, height } = this.scale;

      // 1. the darkness = the hour
      this.ambient.clear();
      this.ambient.fill(toHex(rgb), s.ambientStrength, 0, 0, width, height);

      // 2. the holes = the light
      const drawScale = (s.spotSize / 128) * (0.6 + s.softness * 0.9);
      const alpha = 1;
      const phase = (this.t / Math.max(0.5, s.driftSeconds)) * Math.PI * 2;
      for (const sp of this.spots) {
        const x = sp.x + Math.sin(phase + sp.px) * s.driftAmount;
        const y = sp.y + Math.cos(phase * 0.7 + sp.py) * s.driftAmount * 0.6;
        this.ambient.erase(
          this.makeStamp(x, y, sp.r * drawScale, alpha),
        );
      }

      // shadows follow the sun
      const rad = Phaser.Math.DegToRad(s.sunAngle);
      for (const sh of this.shadows) {
        sh.img.setAlpha(s.shadowStrength);
        sh.img.setDisplaySize(sh.w * (0.8 + s.shadowLength), sh.w * 0.32);
        sh.img.setRotation(rad);
      }
    }

    /**
     * `erase()` needs a game object, not a rectangle, so a single hidden stamp
     * image is reused and repositioned rather than allocating one per spot per
     * frame — which is what turned an early version into a garbage-collector
     * stress test.
     */
    private stamp?: Phaser.GameObjects.Image;
    private makeStamp(x: number, y: number, scale: number, alpha: number) {
      if (!this.stamp) {
        this.stamp = this.add.image(0, 0, 'blob').setVisible(false);
      }
      this.stamp.setPosition(x, y).setScale(scale).setAlpha(alpha);
      return this.stamp;
    }
  };
}

/* ----------------------------------------------------------------- react */

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="font-mono text-amber-300">
          {value}
          {suffix ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-amber-400"
      />
    </label>
  );
}

export function LightLab() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<LightSettings>(DEFAULTS);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [copied, setCopied] = useState(false);

  const ambient = useMemo(() => ambientFor(settings.hour), [settings.hour]);

  useEffect(() => {
    let game: import('phaser').Game | undefined;
    let cancelled = false;

    void (async () => {
      const Phaser = (await import('phaser')).default;
      if (cancelled || !hostRef.current) return;
      const Scene = makeScene(Phaser, () => settingsRef.current);
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: 960,
        height: 540,
        backgroundColor: '#0b0f0a',
        pixelArt: true,
        // So the canvas can be read back / screenshotted. Off by default in
        // Phaser, which is why a WebGL grab of this lab came back solid black.
        render: { preserveDrawingBuffer: true },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [Scene],
      });
      // DEV handle. The lab is often inspected in a hidden browser pane, where
      // requestAnimationFrame is throttled and the canvas never composites — a
      // manual `__lightLab.loop.step(performance.now())` is the only way to get
      // a real frame out of it.
      (window as unknown as { __lightLab?: unknown }).__lightLab = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  const set = <K extends keyof LightSettings>(k: K) => (v: LightSettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const json = JSON.stringify(
    { ...settings, ambientColor: `#${toHex(ambient.rgb).toString(16).padStart(6, '0')}` },
    null,
    2,
  );

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-white">
      <header className="mb-5">
        <a href="/dev/phaser-school" className="text-xs text-amber-400 hover:underline">
          ← Phaser School
        </a>
        <h1 className="font-fantasy text-3xl text-amber-200">Light Lab</h1>
        <p className="max-w-3xl text-sm text-white/60">
          A dark rectangle is the time of day. Holes erased in it are the light. Moving the holes
          slowly is the wind. Everything below is just tuning those three things.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div
            ref={hostRef}
            className="overflow-hidden rounded-lg border border-white/10 bg-black"
            style={{ aspectRatio: '16 / 9' }}
          />
          <p className="mt-2 text-xs text-white/40">
            Real grass tile, real trees, real hero — so the numbers you land on transfer straight
            into CourtyardV2.
          </p>
        </div>

        <aside className="w-full shrink-0 space-y-5 rounded-lg border border-white/10 bg-white/5 p-4 lg:w-80">
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              1 · The hour
            </h2>
            <Slider
              label="Time of day"
              value={settings.hour}
              min={0}
              max={24}
              step={0.5}
              suffix="h"
              onChange={set('hour')}
            />
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span
                className="inline-block h-4 w-8 rounded border border-white/20"
                style={{ background: `rgb(${ambient.rgb.join(',')})` }}
              />
              {ambient.label}
            </div>
            <Slider
              label="Ambient strength"
              value={settings.ambientStrength}
              min={0}
              max={1}
              step={0.01}
              onChange={set('ambientStrength')}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              2 · The canopy
            </h2>
            <Slider
              label="Light spots"
              value={settings.spotCount}
              min={0}
              max={60}
              step={1}
              onChange={set('spotCount')}
            />
            <Slider
              label="Spot size"
              value={settings.spotSize}
              min={20}
              max={400}
              step={5}
              suffix="px"
              onChange={set('spotSize')}
            />
            <Slider
              label="Softness"
              value={settings.softness}
              min={0}
              max={1}
              step={0.01}
              onChange={set('softness')}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              3 · The wind
            </h2>
            <Slider
              label="Drift distance"
              value={settings.driftAmount}
              min={0}
              max={120}
              step={1}
              suffix="px"
              onChange={set('driftAmount')}
            />
            <Slider
              label="Drift cycle"
              value={settings.driftSeconds}
              min={1}
              max={40}
              step={0.5}
              suffix="s"
              onChange={set('driftSeconds')}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              4 · Shadows
            </h2>
            <Slider
              label="Sun angle"
              value={settings.sunAngle}
              min={0}
              max={360}
              step={1}
              suffix="°"
              onChange={set('sunAngle')}
            />
            <Slider
              label="Shadow strength"
              value={settings.shadowStrength}
              min={0}
              max={1}
              step={0.01}
              onChange={set('shadowStrength')}
            />
            <Slider
              label="Shadow length"
              value={settings.shadowLength}
              min={0}
              max={2}
              step={0.05}
              onChange={set('shadowLength')}
            />
          </section>

          <div className="space-y-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(json);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="w-full rounded bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400"
            >
              {copied ? 'Copied' : 'Copy these values'}
            </button>
            <button
              type="button"
              onClick={() => setSettings(DEFAULTS)}
              className="w-full rounded border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"
            >
              Reset
            </button>
            <pre className="max-h-48 overflow-auto rounded bg-black/50 p-2 text-[10px] leading-tight text-white/50">
              {json}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}
