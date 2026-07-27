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
 * Horizontal liquid-fill energy gauge for the acting hero — the same
 * molten-vessel visual language as Forge Strike's TemperGauge, rotated to
 * fill left→right instead of rising bottom→top. Lives in the command shelf
 * to the left of AbilityCommandBar (per Raheem's screenshot annotation) so
 * the resource you're about to spend is impossible to miss.
 *
 * Self-contained: watches `currentBeat` for resource_changed events
 * targeting this actor and pulses a recolored `.fs-flash` overlay — cool
 * cyan-white on gain (regen/focus/ability_gain), hot amber on spend
 * (ability_cost) — same base pulse, different tint, so it reads as one
 * gauge reacting two ways rather than two different widgets.
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

  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) * 100 : 0;
  const pulseColor = pulse?.kind === 'gain' ? '#bfe8ff' : '#ff9d4a';

  return (
    <div
      className="relative w-full"
      style={{ height: 72 }}
      role="status"
      aria-label={`${resourceLabel === 'MANA' ? 'Mana' : 'Tech'}: ${current} of ${max}`}
    >
      <div
        className="relative w-full h-full rounded-md p-[3px]"
        style={{
          background: 'linear-gradient(to bottom, #5a4c3c, #241c14)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(201,162,110,0.5)',
        }}
      >
        <div
          className="relative w-full h-full rounded-[4px] overflow-hidden"
          style={{ background: '#140f0a', border: '1px solid rgba(201,162,110,0.5)' }}
        >
          {/* Molten fill rising left to right */}
          <div
            className="absolute top-0 bottom-0 left-0 transition-[width] duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(to right, #0b5a7a 0%, #1a9ad9 45%, #6cd0f4 80%, #dff6ff 100%)',
              boxShadow: '0 0 14px 2px rgba(40,160,220,0.6)',
            }}
          >
            {/* Bright crest line at the leading edge of the fill */}
            <div
              className="absolute top-0 bottom-0 -right-[1px] w-[2px]"
              style={{ background: '#dff6ff', boxShadow: '0 0 8px #dff6ff' }}
            />
          </div>

          {/* Tick marks every 25% */}
          {[25, 50, 75].map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${t}%`, background: 'rgba(201,162,110,0.35)' }}
            />
          ))}

          {/* Gain/spend pulse overlay — reuses .fs-flash, recolored per direction */}
          {pulse && (
            <div
              key={pulse.key}
              aria-hidden
              className="absolute inset-0 fs-flash"
              style={{ background: pulseColor }}
            />
          )}

          {/* Label */}
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            <span
              style={{
                color: '#dff6ff',
                fontSize: 16,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {current} / {max}
            </span>
            <span style={{ color: '#8fc7de', fontSize: 10, fontWeight: 700, letterSpacing: 1.5 }}>
              {resourceLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
