import { useEffect, useRef, useState } from 'react';
import type { StrikeGrade } from '../../../../services/minigames/forge-strike/types';

/**
 * Forge Strike impact effects — bounded, pointer-transparent, presentation
 * only. A burst is spawned whenever `strikeSeq` changes (each resolved
 * strike bumps it). The engine's grade drives intensity; effects never
 * feed back into scoring. Reduced motion is handled in index.css (the
 * travel/scale keyframes collapse to no-ops, flash is retained).
 */

interface StrikeEffectsProps {
  /** Monotonic counter — increment to fire a burst. 0 = nothing yet. */
  strikeSeq: number;
  grade: StrikeGrade | null;
  /** Selected-stat identity color for warm sparks. */
  color: string;
}

interface Spark {
  id: number;
  dx: number;
  dy: number;
  dur: number;
  size: number;
}

/** Bounded particle counts — never allocate unbounded DOM (plan §10.7). */
const SPARK_COUNT: Record<StrikeGrade, number> = { perfect: 14, good: 7, miss: 2 };

function makeSparks(grade: StrikeGrade, seq: number): Spark[] {
  const n = SPARK_COUNT[grade];
  const spread = grade === 'perfect' ? 120 : grade === 'good' ? 84 : 40;
  return Array.from({ length: n }, (_, i) => {
    // Deterministic-ish angular spread biased upward (sparks fly off the anvil).
    const angle = (Math.PI * (i / Math.max(1, n - 1))) - Math.PI; // -180°..0°
    const jitter = ((seq * 97 + i * 53) % 40) - 20;
    const dist = spread * (0.55 + ((i * 31 + seq * 17) % 45) / 100);
    return {
      id: seq * 100 + i,
      dx: Math.cos(angle) * dist + jitter,
      dy: Math.sin(angle) * dist - 10,
      dur: 380 + ((i * 41 + seq * 13) % 260),
      size: grade === 'miss' ? 2 : 2 + ((i * 7) % 3),
    };
  });
}

export function StrikeEffects({ strikeSeq, grade, color }: StrikeEffectsProps) {
  const [burst, setBurst] = useState<{ seq: number; grade: StrikeGrade; sparks: Spark[] } | null>(
    null,
  );
  const lastSeq = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (strikeSeq === lastSeq.current || strikeSeq === 0 || !grade) return;
    lastSeq.current = strikeSeq;
    setBurst({ seq: strikeSeq, grade, sparks: makeSparks(grade, strikeSeq) });
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setBurst(null), 900);
  }, [strikeSeq, grade]);

  useEffect(() => () => { if (clearTimer.current) clearTimeout(clearTimer.current); }, []);

  if (!burst) return null;
  const warm = burst.grade === 'miss' ? '#8a8a8a' : color;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center" aria-hidden="true">
      {/* Impact flash — brighter for Perfect */}
      {burst.grade !== 'miss' && (
        <div
          key={`flash-${burst.seq}`}
          className="fs-flash absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: '18%',
            width: burst.grade === 'perfect' ? 220 : 140,
            height: burst.grade === 'perfect' ? 220 : 140,
            borderRadius: '9999px',
            background: `radial-gradient(circle, ${warm}cc 0%, ${warm}44 40%, transparent 70%)`,
            filter: 'blur(2px)',
          }}
        />
      )}

      {/* Expanding rune ring — Perfect only */}
      {burst.grade === 'perfect' && (
        <div
          key={`rune-${burst.seq}`}
          className="fs-rune absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: '16%',
            width: 160,
            height: 160,
            borderRadius: '9999px',
            border: `2px solid ${color}`,
            boxShadow: `0 0 18px ${color}aa, inset 0 0 18px ${color}66`,
          }}
        />
      )}

      {/* Spark pool */}
      <div className="absolute left-1/2" style={{ bottom: '19%' }}>
        {burst.sparks.map((s) => (
          <span
            key={s.id}
            className="fs-spark absolute rounded-full"
            style={
              {
                width: s.size,
                height: s.size,
                background: warm,
                boxShadow: `0 0 6px ${warm}`,
                '--dx': `${s.dx}px`,
                '--dy': `${s.dy}px`,
                '--dur': `${s.dur}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
