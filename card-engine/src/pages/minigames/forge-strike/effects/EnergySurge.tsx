import type { StrikeGrade } from '../../../../services/minigames/forge-strike/types';

/**
 * The rising light channeled into the card on a successful strike — the
 * game's payoff beat. A layered column: a white-hot core beam, flanking rays,
 * rising motes, and a base flare. Everything scales with `streak` (combo) and
 * grade, so a hot streak erupts. Bounded, pointer-transparent, presentation
 * only. Reduced motion collapses the travel to a still bloom (index.css).
 */

interface EnergySurgeProps {
  /** Bumps per resolved strike; a change re-fires the surge. */
  seq: number;
  grade: StrikeGrade | null;
  /** Combo streak length including this strike (drives intensity). */
  streak: number;
  /** Selected-stat identity color. */
  color: string;
}

const MAX_MOTES = 22;
/** Horizontal center of the local 220px-wide stage. */
const C = 110;

/** 0..1 intensity from the combo streak, boosted by a Perfect. */
function intensityOf(grade: StrikeGrade, streak: number): number {
  const combo = Math.min(1, Math.max(0, (streak - 1) / 4)); // streak 1→0, 5→1
  return Math.min(1, combo + (grade === 'perfect' ? 0.3 : 0));
}

/** Cheap deterministic pseudo-random so a surge doesn't jitter on re-render. */
function rand(seq: number, i: number, salt: number): number {
  const x = Math.sin(seq * 12.9898 + i * 78.233 + salt * 3.1415) * 43758.5453;
  return x - Math.floor(x);
}

export function EnergySurge({ seq, grade, streak, color }: EnergySurgeProps) {
  if (!seq || (grade !== 'good' && grade !== 'perfect')) return null;

  const I = intensityOf(grade, streak);
  const rise = 130 + I * 120;
  const coreW = (grade === 'perfect' ? 8 : 5) + I * 10;
  const beamCount = 1 + Math.round(I * 4); // 1..5
  const moteCount = Math.min(MAX_MOTES, Math.round(8 + I * 14));
  const glow = 5 + I * 10;

  const beams = Array.from({ length: beamCount }, (_, k) => {
    if (k === 0) {
      return { i: 0, offset: 0, width: coreW, dur: 660, delay: 0, core: true };
    }
    const side = k % 2 === 0 ? 1 : -1;
    const rank = Math.ceil(k / 2);
    return {
      i: k,
      offset: side * (12 + rank * 11),
      width: Math.max(2, coreW * 0.42 - rank * 1.4),
      dur: 620 + rank * 70,
      delay: rank * 45,
      core: false,
    };
  });

  const motes = Array.from({ length: moteCount }, (_, i) => ({
    i,
    left: C + (rand(seq, i, 1) - 0.5) * (26 + I * 78),
    size: 2 + Math.floor(rand(seq, i, 2) * 3),
    dx: (rand(seq, i, 3) - 0.5) * 34,
    mrise: -(rise * 0.85 + rand(seq, i, 4) * 70),
    dur: 720 + rand(seq, i, 5) * 340,
    delay: rand(seq, i, 6) * 200,
    white: i % 4 === 0,
  }));

  return (
    <div
      key={seq}
      className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2"
      style={{ width: 220, height: rise }}
      aria-hidden="true"
    >
      {/* Base flare — the eruption point. Stat-colored, no white core, so it
          reads as forge light instead of washing out the backdrop. */}
      <div
        className="fs-baseflare absolute bottom-0 rounded-full"
        style={{
          left: '50%',
          width: 44 + I * 66,
          height: 20 + I * 32,
          background: `radial-gradient(ellipse at center, ${color}ee 0%, ${color}66 40%, transparent 70%)`,
          filter: 'blur(3px)',
        }}
      />

      {/* Beams — white-hot core + flanking rays */}
      {beams.map((b) => (
        <span
          key={b.i}
          className="fs-beam absolute bottom-0 rounded-full"
          style={{
            left: C + b.offset - b.width / 2,
            width: b.width,
            height: rise,
            background: `linear-gradient(to top, ${color}f0 0%, ${color} ${b.core ? 22 : 30}%, ${color}00 100%)`,
            boxShadow: `0 0 ${glow}px ${color}`,
            opacity: b.core ? 0.95 : 0.7,
            ['--rise' as string]: `${rise}px`,
            ['--dur' as string]: `${b.dur}ms`,
            animationDelay: `${b.delay}ms`,
          }}
        />
      ))}

      {/* Rising motes riding the column */}
      {motes.map((m) => (
        <span
          key={`m${m.i}`}
          className="fs-mote absolute bottom-0 rounded-full"
          style={{
            left: m.left,
            width: m.size,
            height: m.size,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            opacity: m.white ? 0.95 : 0.8,
            ['--mrise' as string]: `${m.mrise}px`,
            ['--mdx' as string]: `${m.dx}px`,
            ['--dur' as string]: `${m.dur}ms`,
            animationDelay: `${m.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
