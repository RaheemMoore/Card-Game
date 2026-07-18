import type { HeroCombatant } from '../../types/combat';

export function HeroPanel({ hero }: { hero: HeroCombatant }) {
  const hpPct = Math.max(0, hero.hp / hero.snapshot.maxHp);
  const rPct = hero.snapshot.maxResource === 0 ? 0 : hero.resource / hero.snapshot.maxResource;
  const uPct = hero.ultimateCharge / 100;
  return (
    <div className="rounded-lg border border-gold/30 bg-void/60 p-4 mb-3">
      <div className="flex items-baseline justify-between">
        <div className="font-fantasy text-lg text-bone">{hero.snapshot.displayName}</div>
        <div className="text-[10px] uppercase tracking-widest text-bone/50">
          {hero.snapshot.archetype} · {hero.snapshot.rank}
        </div>
      </div>
      <Bar
        label="HP"
        value={hero.hp}
        max={hero.snapshot.maxHp}
        pct={hpPct}
        color="from-emerald-400 to-emerald-700"
      />
      <Bar
        label={hero.snapshot.resourceType === 'mana' ? 'Mana' : 'Tech'}
        value={hero.resource}
        max={hero.snapshot.maxResource}
        pct={rPct}
        color="from-sky-400 to-sky-700"
      />
      <Bar
        label="Ult"
        value={hero.ultimateCharge}
        max={100}
        pct={uPct}
        color="from-amber-400 to-amber-700"
      />
      {hero.shields.length > 0 && (
        <div className="text-[11px] text-bone/70 mt-1">
          🛡 Shield: {hero.shields.reduce((sum, s) => sum + s.amount, 0)}
        </div>
      )}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  pct,
  color,
}: {
  label: string;
  value: number;
  max: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-bone/60 mb-0.5">
        <span>{label}</span>
        <span className="tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-void/80 overflow-hidden border border-bone/20">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
        />
      </div>
    </div>
  );
}
