import type { HeroCombatant, BossCombatant } from '../../../types/combat';

interface Props {
  selectedHero: HeroCombatant;
  boss: BossCombatant;
  /** Actions remaining this round for the party (pending heroes). */
  actionsRemaining: number;
}

/**
 * Mobile Resource Row — compact strip showing meaningful combat resources for
 * the selected hero plus turn-shared state. Reuses established resource
 * colors (blue = mana, gold = tech, red = rage). Never duplicates info that
 * is clearly visible on the card face — the intent is at-a-glance decision
 * support, not redundancy.
 */
export function MobileResourceRow({ selectedHero, boss, actionsRemaining }: Props) {
  const resourceKind = selectedHero.snapshot.resourceType;
  const resourceValue = selectedHero.resource;
  const resourceMax = selectedHero.snapshot.maxResource;
  const resourceLabel = resourceKind === 'tech' ? 'TECH' : 'MANA';
  const resourceColor = resourceKind === 'tech' ? '#f2ab47' : '#4a9cff';
  const resourceGlyph = resourceKind === 'tech' ? '⚡' : '✦';

  const ultPct = Math.max(0, Math.min(1, selectedHero.ultimateCharge / 100));

  // Rage mirror: rage bar reflects the boss's current rage build (same math
  // as MobileBossHeader) so the row can compress the boss threat readout for
  // fast scanning.
  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const RAGE_THRESHOLD = 0.25;
  const rageFillPct = Math.max(0, Math.min(1, ((RAGE_THRESHOLD - hpPct) / RAGE_THRESHOLD) * -1 + 1));

  return (
    <div
      className="grid items-center gap-2 w-full"
      style={{
        gridTemplateColumns: '1fr auto 1fr',
        padding: '4px 6px',
        borderTop: '1px solid rgba(87,59,31,0.5)',
        borderBottom: '1px solid rgba(87,59,31,0.5)',
        background: 'rgba(8,6,10,0.55)',
      }}
      aria-label={`Resources: ${resourceValue}/${resourceMax} ${resourceLabel}, ${actionsRemaining} actions remaining, boss rage ${Math.round(rageFillPct * 100)}%`}
    >
      {/* Left: hero primary resource + ultimate pips */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            background: `radial-gradient(circle at 30% 30%, ${resourceColor}, #0a1220)`,
            border: `1.5px solid ${resourceColor}`,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}
          title={`${resourceValue} / ${resourceMax} ${resourceLabel}`}
        >
          {resourceValue}
        </div>
        <ResourcePipRow value={resourceValue} max={resourceMax} color={resourceColor} />
        <span
          aria-hidden
          style={{ color: resourceColor, fontSize: 12, opacity: 0.7, marginLeft: 2 }}
        >
          {resourceGlyph}
        </span>
      </div>

      {/* Center: turn actions remaining (hourglass badge) */}
      <div
        className="flex items-center gap-1 shrink-0"
        title={`${actionsRemaining} action${actionsRemaining === 1 ? '' : 's'} remaining this round`}
        style={{ minWidth: 40 }}
      >
        <span aria-hidden style={{ fontSize: 12, opacity: 0.8 }}>⧗</span>
        <span
          style={{
            color: '#e8d6b2',
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {actionsRemaining}
        </span>
      </div>

      {/* Right: boss rage pips + ultimate charge marker */}
      <div className="flex items-center gap-2 justify-end min-w-0">
        <UltPips pct={ultPct} />
        <ResourcePipRow value={Math.round(rageFillPct * 8)} max={8} color="#e53a1a" reversed />
        <span aria-hidden style={{ fontSize: 12, opacity: 0.8, marginRight: 2 }}>🔥</span>
      </div>
    </div>
  );
}

function ResourcePipRow({
  value,
  max,
  color,
  reversed,
}: {
  value: number;
  max: number;
  color: string;
  reversed?: boolean;
}) {
  const pipCount = Math.min(8, Math.max(0, max));
  const filled = pipCount === 0 ? 0 : Math.round((value / max) * pipCount);
  const pips = Array.from({ length: pipCount }, (_, i) => {
    const idx = reversed ? pipCount - 1 - i : i;
    return idx < filled;
  });
  return (
    <div className="flex items-center gap-[2px]" aria-hidden>
      {pips.map((on, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 6,
            borderRadius: 1,
            background: on ? color : 'rgba(255,255,255,0.08)',
            boxShadow: on ? `0 0 4px ${color}88` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function UltPips({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-[2px]" aria-label={`Ultimate charge ${Math.round(pct * 100)}%`}>
      {[0.25, 0.5, 0.75, 1.0].map((threshold, idx) => (
        <span
          key={idx}
          aria-hidden
          className="inline-block w-2 h-2 rotate-45 rounded-[1px]"
          style={{
            background:
              pct >= threshold
                ? 'linear-gradient(180deg, #ffe28a, #b8860b)'
                : 'rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </div>
  );
}
