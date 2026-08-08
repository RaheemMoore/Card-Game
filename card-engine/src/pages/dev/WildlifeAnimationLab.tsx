import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type AnimalId = 'fox' | 'rabbit' | 'tortoise';
type Direction = 'down' | 'up' | 'left' | 'right';

type Clip = {
  id: string;
  label: string;
  purpose: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
};

type Animal = {
  id: AnimalId;
  label: string;
  role: string;
  accent: string;
  clips: Clip[];
};

const DIRECTIONS: Direction[] = ['down', 'up', 'left', 'right'];

const ANIMALS: Animal[] = [
  {
    id: 'fox',
    label: 'Fox',
    role: 'Curious woodland wanderer',
    accent: '#f29b62',
    clips: [
      {
        id: 'trot',
        label: 'Trot',
        purpose: 'Travels between interesting places in the habitat.',
        src: '/assets/wildlife-lab/fox-trot-4dir.png',
        frameWidth: 171,
        frameHeight: 109,
        frames: 7,
        fps: 9,
      },
      {
        id: 'sniff',
        label: 'Sniff',
        purpose: 'Pauses to investigate a scent instead of walking endlessly.',
        src: '/assets/wildlife-lab/fox-sniff-4dir.png',
        frameWidth: 195,
        frameHeight: 108,
        frames: 7,
        fps: 7,
      },
      {
        id: 'sit-alert',
        label: 'Sit & listen',
        purpose: 'Settles briefly, then reacts to sounds in the forest.',
        src: '/assets/wildlife-lab/fox-sit-alert-4dir.png',
        frameWidth: 177,
        frameHeight: 112,
        frames: 9,
        fps: 7,
      },
    ],
  },
  {
    id: 'rabbit',
    label: 'Rabbit',
    role: 'Timid clearing visitor',
    accent: '#d8c3b7',
    clips: [
      {
        id: 'hop',
        label: 'Hop',
        purpose: 'Moves in short bursts, leaving pauses that feel rabbit-like.',
        src: '/assets/wildlife-lab/rabbit-hop-4dir.png',
        frameWidth: 148,
        frameHeight: 121,
        frames: 7,
        fps: 9,
      },
      {
        id: 'nibble-groom',
        label: 'Nibble & groom',
        purpose: 'Adds a calm daily activity between cautious movements.',
        src: '/assets/wildlife-lab/rabbit-nibble-groom-4dir.png',
        frameWidth: 128,
        frameHeight: 125,
        frames: 7,
        fps: 7,
      },
    ],
  },
  {
    id: 'tortoise',
    label: 'Glowcap tortoise',
    role: 'Simple magical forest resident',
    accent: '#62e8c2',
    clips: [
      {
        id: 'toddle',
        label: 'Slow walk',
        purpose: 'One quiet roaming action is enough for the first version.',
        src: '/assets/wildlife-lab/tortoise-toddle-4dir.png',
        frameWidth: 154,
        frameHeight: 106,
        frames: 7,
        fps: 5,
      },
    ],
  },
];

const animalById = (id: AnimalId) => ANIMALS.find((animal) => animal.id === id) ?? ANIMALS[0];

function SpriteFrame({ clip, direction, frame, scale = 1 }: {
  clip: Clip;
  direction: Direction;
  frame: number;
  scale?: number;
}) {
  const row = DIRECTIONS.indexOf(direction);
  return (
    <div
      aria-label={`${clip.label}, ${direction}, frame ${frame + 1}`}
      style={{
        width: clip.frameWidth * scale,
        height: clip.frameHeight * scale,
        backgroundImage: `url(${clip.src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${clip.frameWidth * clip.frames * scale}px ${clip.frameHeight * 4 * scale}px`,
        backgroundPosition: `${-frame * clip.frameWidth * scale}px ${-row * clip.frameHeight * scale}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

export function WildlifeAnimationLab() {
  const [animalId, setAnimalId] = useState<AnimalId>('fox');
  const [clipId, setClipId] = useState('trot');
  const [direction, setDirection] = useState<Direction>('right');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reviewAll, setReviewAll] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(2.25);
  const reviewAllRef = useRef(reviewAll);

  const animal = animalById(animalId);
  const clip = animal.clips.find((candidate) => candidate.id === clipId) ?? animal.clips[0];
  reviewAllRef.current = reviewAll;

  const selections = useMemo(
    () => ANIMALS.flatMap((entry) => entry.clips.flatMap((entryClip) =>
      DIRECTIONS.map((entryDirection) => ({
        animalId: entry.id,
        clipId: entryClip.id,
        direction: entryDirection,
      })))),
    [],
  );

  const select = useCallback((nextAnimal: AnimalId, nextClip: string, nextDirection: Direction) => {
    setAnimalId(nextAnimal);
    setClipId(nextClip);
    setDirection(nextDirection);
    setFrame(0);
  }, []);

  const selectNextAnimation = useCallback((amount = 1) => {
    const index = selections.findIndex((item) =>
      item.animalId === animalId && item.clipId === clip.id && item.direction === direction);
    const next = selections[(index + amount + selections.length) % selections.length];
    select(next.animalId, next.clipId, next.direction);
  }, [animalId, clip.id, direction, select, selections]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setFrame((current) => {
        if (current < clip.frames - 1) return current + 1;
        if (reviewAllRef.current) window.setTimeout(() => selectNextAnimation(1), 0);
        return 0;
      });
    }, 1000 / (clip.fps * speed));
    return () => window.clearInterval(timer);
  }, [clip.fps, clip.frames, playing, selectNextAnimation, speed]);

  const chooseAnimal = (nextId: AnimalId) => {
    const nextAnimal = animalById(nextId);
    select(nextId, nextAnimal.clips[0].id, direction);
  };

  const toggleReviewAll = () => {
    setReviewAll((current) => !current);
    setPlaying(true);
  };

  const checker = 'repeating-conic-gradient(#171a26 0 25%, #202432 0 50%) 0 / 22px 22px';

  return (
    <main style={S.page}>
      <style>{`
        .wildlife-lab-choice-copy { display: grid; gap: 2px; }
        .wildlife-lab-choice-copy small { color: #858a9c; font-size: 11px; line-height: 1.25; }
        .wildlife-lab-frame-number { position: absolute; right: 4px; bottom: 2px; color: #c8c2dd; font: 10px monospace; text-shadow: 0 1px 2px #000; }
        @media (max-width: 1180px) {
          .wildlife-lab-grid { grid-template-columns: 210px minmax(460px, 1fr) !important; }
          .wildlife-lab-notes { grid-column: 1 / -1; }
        }
        @media (max-width: 780px) {
          .wildlife-lab-grid { grid-template-columns: 1fr !important; }
          .wildlife-lab-notes { grid-column: auto; }
          .wildlife-lab-header { align-items: flex-start !important; flex-direction: column; }
          .wildlife-lab-stage { min-height: 310px !important; }
          .wildlife-lab-sliders { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <header className="wildlife-lab-header" style={S.header}>
        <div>
          <a href="/dev/phaser-school" style={S.back}>← Phaser School</a>
          <p style={S.eyebrow}>CHATGPT · CREATING LIFE</p>
          <h1 style={S.title}>Wildlife Animation Review Lab</h1>
          <p style={S.subtitle}>Watch the actual game sheets, inspect every frame, and decide what each motion communicates before it enters the world.</p>
        </div>
        <div style={S.status}><span style={S.statusDot} />Safe-cell sheets · no generation</div>
      </header>

      <section className="wildlife-lab-grid" style={S.workspace}>
        <aside style={S.sidebar}>
          <ControlLabel number="1" text="Choose an animal" />
          <div style={S.buttonStack}>
            {ANIMALS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => chooseAnimal(entry.id)}
                aria-pressed={animalId === entry.id}
                style={{ ...S.choice, ...(animalId === entry.id ? { ...S.choiceOn, borderColor: entry.accent } : {}) }}
              >
                <span style={{ ...S.animalMark, background: entry.accent }} />
                <span className="wildlife-lab-choice-copy"><strong>{entry.label}</strong><small>{entry.role}</small></span>
              </button>
            ))}
          </div>

          <ControlLabel number="2" text="Choose an action" />
          <div style={S.pills}>
            {animal.clips.map((entry) => (
              <button key={entry.id} type="button" onClick={() => select(animalId, entry.id, direction)}
                aria-pressed={clip.id === entry.id}
                style={{ ...S.pill, ...(clip.id === entry.id ? S.pillOn : {}) }}>{entry.label}</button>
            ))}
          </div>

          <ControlLabel number="3" text="Choose a direction" />
          <div style={S.directionGrid}>
            {DIRECTIONS.map((entry) => (
              <button key={entry} type="button" onClick={() => select(animalId, clip.id, entry)}
                aria-pressed={direction === entry}
                style={{ ...S.direction, ...(direction === entry ? S.directionOn : {}) }}>
                {entry === 'down' ? '↓' : entry === 'up' ? '↑' : entry === 'left' ? '←' : '→'} {entry}
              </button>
            ))}
          </div>
        </aside>

        <div style={S.mainPanel}>
          <div style={S.stageTop}>
            <div>
              <p style={S.nowLabel}>NOW REVIEWING</p>
              <h2 style={S.nowTitle}>{animal.label} · {clip.label} · {direction}</h2>
            </div>
            <div style={S.frameReadout}>FRAME <strong>{frame + 1}</strong> / {clip.frames}</div>
          </div>

          <div className="wildlife-lab-stage" style={{ ...S.stage, background: checker }}>
            <div style={{ ...S.cellBoundary, width: clip.frameWidth * zoom, height: clip.frameHeight * zoom }}>
              <SpriteFrame clip={clip} direction={direction} frame={frame} scale={zoom} />
            </div>
            <span style={S.boundaryLabel}>one Phaser frame cell</span>
          </div>

          <div style={S.transport}>
            <button type="button" style={S.transportButton} onClick={() => { setPlaying(false); setFrame((frame - 1 + clip.frames) % clip.frames); }} aria-label="Previous frame">◀|</button>
            <button type="button" style={S.playButton} onClick={() => setPlaying((current) => !current)}>{playing ? '❚❚  Pause' : '▶  Play'}</button>
            <button type="button" style={S.transportButton} onClick={() => { setPlaying(false); setFrame((frame + 1) % clip.frames); }} aria-label="Next frame">|▶</button>
            <button type="button" style={{ ...S.reviewButton, ...(reviewAll ? S.reviewButtonOn : {}) }} onClick={toggleReviewAll}>{reviewAll ? '✓ Reviewing all' : 'Review all animations'}</button>
          </div>

          <div style={S.frameRail} aria-label="Animation frames">
            {Array.from({ length: clip.frames }, (_, index) => (
              <button key={index} type="button" onClick={() => { setPlaying(false); setFrame(index); }}
                aria-label={`Show frame ${index + 1}`}
                style={{ ...S.thumbnail, ...(frame === index ? S.thumbnailOn : {}) }}>
                <SpriteFrame clip={clip} direction={direction} frame={index} scale={0.42} />
                <span className="wildlife-lab-frame-number">{index + 1}</span>
              </button>
            ))}
          </div>

          <div className="wildlife-lab-sliders" style={S.sliders}>
            <label style={S.sliderLabel}><span>Playback speed <strong>{speed.toFixed(2)}×</strong></span><input type="range" min="0.5" max="1.75" step="0.25" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} style={S.range} /></label>
            <label style={S.sliderLabel}><span>Preview size <strong>{zoom.toFixed(2)}×</strong></span><input type="range" min="1" max="3" step="0.25" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} style={S.range} /></label>
          </div>
        </div>

        <aside className="wildlife-lab-notes" style={S.notes}>
          <p style={S.notesEyebrow}>WHAT IT MEANS</p>
          <h3 style={S.notesTitle}>{clip.label}</h3>
          <p style={S.notesBody}>{clip.purpose}</p>
          <div style={S.fact}><span>Frames</span><strong>{clip.frames}</strong></div>
          <div style={S.fact}><span>Designed speed</span><strong>{clip.fps} fps</strong></div>
          <div style={S.fact}><span>Directions</span><strong>4</strong></div>
          <div style={S.lessonNote}>
            <strong>What to inspect</strong>
            <ul>
              <li>Does the action read without a label?</li>
              <li>Do the feet feel planted?</li>
              <li>Does any pixel cross the purple cell border?</li>
              <li>Does the loop pop when it restarts?</li>
            </ul>
          </div>
          <button type="button" style={S.nextClip} onClick={() => { setReviewAll(false); selectNextAnimation(1); }}>Next animation →</button>
        </aside>
      </section>
    </main>
  );
}

function ControlLabel({ number, text }: { number: string; text: string }) {
  return <p style={S.controlLabel}><span>{number}</span>{text}</p>;
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#11131c', color: '#f4f0ff', fontFamily: 'DM Sans, Inter, system-ui, sans-serif', padding: '28px clamp(18px, 3vw, 48px) 46px', boxSizing: 'border-box' },
  header: { maxWidth: 1440, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 },
  back: { color: '#9f91ff', textDecoration: 'none', fontSize: 14, fontWeight: 700 },
  eyebrow: { color: '#62e8c2', fontSize: 12, fontWeight: 800, letterSpacing: 1.8, margin: '24px 0 7px' },
  title: { fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: -1.5, margin: 0, lineHeight: 1.02 },
  subtitle: { color: '#aaa6ba', maxWidth: 760, lineHeight: 1.55, margin: '13px 0 0' },
  status: { border: '1px solid #34394a', borderRadius: 999, color: '#aeb4c4', fontSize: 12, padding: '9px 13px', whiteSpace: 'nowrap' },
  statusDot: { width: 7, height: 7, display: 'inline-block', borderRadius: '50%', background: '#62e8c2', marginRight: 8, boxShadow: '0 0 10px #62e8c2' },
  workspace: { maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(190px, 245px) minmax(480px, 1fr) minmax(210px, 270px)', gap: 16, alignItems: 'start' },
  sidebar: { background: '#181b27', border: '1px solid #292d3d', borderRadius: 16, padding: 17 },
  controlLabel: { display: 'flex', gap: 9, alignItems: 'center', color: '#d8d3e5', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: '7px 0 10px' },
  buttonStack: { display: 'grid', gap: 7, marginBottom: 22 },
  choice: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #303545', background: '#202431', color: '#e8e5ee', textAlign: 'left', cursor: 'pointer' },
  choiceOn: { background: '#292c3c' },
  animalMark: { width: 8, height: 32, borderRadius: 99, flexShrink: 0 },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 },
  pill: { border: '1px solid #353949', borderRadius: 999, background: '#202431', color: '#aaa6ba', padding: '7px 10px', cursor: 'pointer' },
  pillOn: { color: '#fff', borderColor: '#7c70ff', background: '#302a52' },
  directionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  direction: { border: '1px solid #353949', borderRadius: 8, background: '#202431', color: '#aaa6ba', padding: '8px 5px', cursor: 'pointer', textTransform: 'capitalize' },
  directionOn: { color: '#fff', borderColor: '#7c70ff', background: '#302a52' },
  mainPanel: { minWidth: 0, background: '#181b27', border: '1px solid #292d3d', borderRadius: 16, padding: 18 },
  stageTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px 14px' },
  nowLabel: { color: '#7f8495', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, margin: 0 },
  nowTitle: { color: '#fff', fontSize: 20, margin: '3px 0 0', textTransform: 'capitalize' },
  frameReadout: { color: '#858a9c', fontFamily: 'monospace', fontSize: 12 },
  stage: { minHeight: 390, borderRadius: 12, border: '1px solid #303545', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'auto' },
  cellBoundary: { border: '2px solid #8d75ff', boxShadow: '0 0 0 1px #0b0d13, 0 0 24px rgba(124,112,255,.15)', flexShrink: 0 },
  boundaryLabel: { position: 'absolute', right: 10, bottom: 8, padding: '4px 7px', color: '#b5aaff', background: 'rgba(12,14,21,.78)', borderRadius: 5, fontSize: 10, letterSpacing: 0.7 },
  transport: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15, flexWrap: 'wrap' },
  transportButton: { border: '1px solid #3a3f51', borderRadius: 9, background: '#242836', color: '#d6d3df', padding: '10px 13px', cursor: 'pointer' },
  playButton: { border: 0, borderRadius: 9, background: '#7967f2', color: '#fff', fontWeight: 800, minWidth: 118, padding: '11px 18px', cursor: 'pointer' },
  reviewButton: { marginLeft: 8, border: '1px solid #4a4f61', borderRadius: 9, background: 'transparent', color: '#c6c3cf', padding: '10px 14px', cursor: 'pointer' },
  reviewButtonOn: { borderColor: '#62e8c2', color: '#62e8c2', background: 'rgba(98,232,194,.08)' },
  frameRail: { display: 'flex', gap: 7, overflowX: 'auto', padding: '16px 2px 8px' },
  thumbnail: { flex: '0 0 auto', position: 'relative', overflow: 'hidden', padding: 0, border: '1px solid #34394a', borderRadius: 8, background: '#10121a', cursor: 'pointer' },
  thumbnailOn: { borderColor: '#8d75ff', boxShadow: '0 0 0 2px rgba(141,117,255,.25)' },
  sliders: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, borderTop: '1px solid #292d3d', marginTop: 8, padding: '15px 3px 0' },
  sliderLabel: { color: '#9499aa', fontSize: 12, display: 'grid', gap: 7 },
  range: { width: '100%', accentColor: '#7967f2' },
  notes: { background: '#181b27', border: '1px solid #292d3d', borderRadius: 16, padding: 20 },
  notesEyebrow: { color: '#62e8c2', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, margin: 0 },
  notesTitle: { fontSize: 25, color: '#fff', margin: '8px 0' },
  notesBody: { color: '#aaa6ba', fontSize: 14, lineHeight: 1.55, minHeight: 62 },
  fact: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2c3040', color: '#858a9c', padding: '10px 0', fontSize: 13 },
  lessonNote: { marginTop: 15, padding: '14px 13px', borderRadius: 10, background: '#202431', color: '#b9b5c5', fontSize: 13, lineHeight: 1.55 },
  nextClip: { width: '100%', marginTop: 14, border: '1px solid #4e456f', borderRadius: 9, background: '#26213d', color: '#c9c0ff', padding: '10px', fontWeight: 700, cursor: 'pointer' },
};
