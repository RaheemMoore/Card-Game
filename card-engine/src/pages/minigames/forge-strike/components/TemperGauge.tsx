import { CrystalGem } from './ForgeFrames';

/**
 * Persistent Temper Gauge — a tall, ornate, side-mounted meter that fills a
 * little each successful run and bursts when full. Same forged-metal + gold +
 * crystal family as the rail and pips. Presentation only; the fill value comes
 * from the card's persisted temperProgress. The molten fill transitions
 * (height) so an end-of-run pour visibly rises.
 */

interface TemperGaugeProps {
  /** 0..1 persisted fill. */
  fill: number;
  /** Lifetime burst count, shown as a small tally. */
  bursts: number;
  /** Stat identity color for the crystal cap accent. */
  accent: string;
  /** Pulses the gauge when a burst just happened. */
  justBurst?: boolean;
}

export function TemperGauge({ fill, bursts, accent, justBurst = false }: TemperGaugeProps) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <div className="flex flex-col items-center gap-2 select-none" aria-hidden="true">
      <CrystalGem color={accent} size={16} />
      <div
        className={`relative rounded-md p-[3px] ${justBurst ? 'fs-flash' : ''}`}
        style={{
          width: 34,
          height: 'min(46vh, 340px)',
          background: 'linear-gradient(to bottom, #5a4c3c, #241c14)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(201,162,110,0.5)',
        }}
      >
        {/* Inner track */}
        <div
          className="relative w-full h-full rounded-[4px] overflow-hidden"
          style={{ background: '#140f0a', border: '1px solid rgba(201,162,110,0.5)' }}
        >
          {/* Molten fill rising from the bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out"
            style={{
              height: `${pct}%`,
              background: 'linear-gradient(to top, #7a1e05 0%, #d9741a 45%, #f4c04a 80%, #fff2c8 100%)',
              boxShadow: '0 0 14px 2px rgba(244,160,40,0.7)',
            }}
          >
            {/* bright crest line at the top of the molten column */}
            <div className="absolute -top-[1px] left-0 right-0 h-[2px]" style={{ background: '#fff2c8', boxShadow: '0 0 8px #fff2c8' }} />
          </div>

          {/* Tick marks every 25% */}
          {[25, 50, 75].map((t) => (
            <div key={t} className="absolute left-0 right-0 h-px" style={{ bottom: `${t}%`, background: 'rgba(201,162,110,0.35)' }} />
          ))}
        </div>
      </div>
      <div className="text-[10px] font-fantasy tracking-widest text-amber-100/70 text-center leading-tight">
        TEMPER
        {bursts > 0 && <div style={{ color: accent }}>⚒ ×{bursts}</div>}
      </div>
    </div>
  );
}
