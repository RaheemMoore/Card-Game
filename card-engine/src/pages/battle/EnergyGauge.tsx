import { useEffect, useRef, useState } from 'react';
import type { AnimationBeat } from '../../services/combat/presentation/types';

interface Props {
  actorId: string;
  current: number;
  max: number;
  resourceLabel: 'MANA' | 'TECH';
  currentBeat: AnimationBeat | null;
}

/**
 * Compact energy counter for the acting hero — a blue number, not a bar.
 * The earlier wide liquid-fill gauge had a fixed 260px width regardless of
 * viewport, which collided with the centered ability bar below ~1150px;
 * this is intrinsically sized to its content so it can't structurally
 * overlap anything. No rolling/odometer effect — nothing else in this
 * codebase does that (confirmed no tween pattern exists), so it sticks to
 * the established norm: a static tabular-nums number plus a color flash.
 *
 * Self-contained: watches `currentBeat` for resource_changed events
 * targeting this actor and pulses a recolored `.fs-flash` overlay — cool
 * cyan-white on gain (regen/focus/ability_gain), hot amber on spend
 * (ability_cost).
 */
export function EnergyGauge({ actorId, current, max, resourceLabel, currentBeat }: Props) {
  const [pulse, setPulse] = useState<{ key: number; kind: 'gain' | 'spend' } | null>(null);
  const lastBeatId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastBeatId.current) return;
    const e = currentBeat.event;
    if (e.kind !== 'resource_changed' || e.actorId !== actorId) return;
    lastBeatId.current = currentBeat.id;
    setPulse((cur) => ({ key: (cur?.key ?? 0) + 1, kind: e.delta > 0 ? 'gain' : 'spend' }));
  }, [currentBeat, actorId]);

  const pulseColor = pulse?.kind === 'gain' ? '#bfe8ff' : '#ff9d4a';

  return (
    <div
      className="relative inline-flex items-center gap-1.5 rounded-md overflow-hidden"
      style={{
        padding: '6px 12px',
        background: 'linear-gradient(to bottom, #14202a, #0a1218)',
        border: '1px solid rgba(80,160,200,0.45)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
      }}
      role="status"
      aria-label={`${resourceLabel === 'MANA' ? 'Mana' : 'Tech'}: ${current} of ${max}`}
    >
      {pulse && (
        <div
          key={pulse.key}
          aria-hidden
          className="absolute inset-0 fs-flash"
          style={{ background: pulseColor }}
        />
      )}
      <span
        style={{
          color: '#6cd0f4',
          fontSize: 18,
          fontWeight: 700,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 8px rgba(108,208,244,0.6)',
        }}
      >
        {current}
        <span style={{ color: '#4a7a90', fontWeight: 600 }}>/{max}</span>
      </span>
      <span
        style={{
          color: '#5a90a8',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.4,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {resourceLabel}
      </span>
    </div>
  );
}
