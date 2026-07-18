import { Link, useParams } from 'react-router-dom';
import {
  getFamily,
  getAllDefinitions,
  getCurrentVersion,
  getAllDiscoveries,
  getArtForAbility,
} from '../services/abilities/registry';
import type { AbilityDefinition } from '../types/abilities';

/**
 * Per-family Codex page. Discovered abilities show full data (name, tags,
 * short description). Undiscovered abilities show rarity teaser only —
 * per Raheem's spoiler rule (Stage 0 decision #7): no name, no silhouette,
 * no description.
 */
export function CodexFamily() {
  const { familyId } = useParams<{ familyId: string }>();
  const family = familyId ? getFamily(familyId) : undefined;

  if (!family) {
    return (
      <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <p className="text-ash italic">Unknown family.</p>
        <Link to="/codex" className="text-gold hover:underline text-sm">← Back to Codex</Link>
      </div>
    );
  }

  const definitions = getAllDefinitions().filter(
    (d) => d.status !== 'merged' && d.status !== 'deprecated' && d.familyIds.includes(family.id),
  );
  const discoveredIds = new Set(getAllDiscoveries().map((d) => d.abilityId));
  const discovered = definitions.filter((d) => discoveredIds.has(d.id));
  const undiscovered = definitions.filter((d) => !discoveredIds.has(d.id));

  discovered.sort(byRarityThenName);

  return (
    <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <Link to="/codex" className="text-gold/70 hover:text-gold text-sm">← Back to Codex</Link>
      <header className="mb-6 mt-2">
        <h1 className="font-fantasy text-3xl font-bold text-ivory">{family.name}</h1>
        <p className="text-sm text-bone/80 mt-1">{family.description}</p>
        <p className="text-xs text-ash mt-2 tabular-nums">
          {discovered.length} of {definitions.length} discovered
        </p>
      </header>

      {discovered.length > 0 && (
        <section className="mb-8">
          <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-3">
            Discovered
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {discovered.map((def) => (
              <DiscoveredCard key={def.id} def={def} />
            ))}
          </div>
        </section>
      )}

      {undiscovered.length > 0 && (
        <section>
          <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-3">
            Still unknown ({undiscovered.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {undiscovered.map((def) => (
              <UndiscoveredCard key={def.id} def={def} />
            ))}
          </div>
        </section>
      )}

      {definitions.length === 0 && (
        <p className="text-ash italic">No abilities in this family yet.</p>
      )}
    </div>
  );
}

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3, mythic: 4 } as const;

function rarityArticle(rarity: string): 'A' | 'An' {
  return /^[aeiou]/i.test(rarity) ? 'An' : 'A';
}

function byRarityThenName(a: AbilityDefinition, b: AbilityDefinition): number {
  const rDiff = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  return rDiff !== 0 ? rDiff : a.displayName.localeCompare(b.displayName);
}

function DiscoveredCard({ def }: { def: AbilityDefinition }) {
  const version = getCurrentVersion(def.id);
  const art = getArtForAbility(def.id);
  return (
    <Link
      to={`/codex/ability/${def.id}`}
      className="flex gap-3 rounded-md border border-gold/30 bg-slate-dark/60 p-3 hover:border-gold/60 transition-colors"
    >
      {art && (
        <img
          src={art.assetUrl}
          alt=""
          className="w-12 h-12 rounded shrink-0 border border-gold/20"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between mb-1 gap-2">
          <span className="font-fantasy text-sm text-ivory truncate">{def.displayName}</span>
          <span className="text-[10px] uppercase tracking-widest text-gold/70 shrink-0">
            {def.rarity}
          </span>
        </div>
        <p className="text-xs text-bone/70 line-clamp-2">{def.descriptionShort}</p>
        {version && (
          <div className="text-[10px] text-ash/60 mt-1 tabular-nums">
            {version.slotType} · cost {version.resourceCost} {version.resourceType}
          </div>
        )}
      </div>
    </Link>
  );
}

function UndiscoveredCard({ def }: { def: AbilityDefinition }) {
  // Spoiler rule (decision #7): family + rarity teaser only. No name, no
  // silhouette, no description. The card is a placeholder.
  return (
    <div
      className="rounded-md border border-gold/10 bg-slate-dark/30 p-3 opacity-60 select-none"
      aria-label={`Undiscovered ${def.rarity} ability`}
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-fantasy text-sm text-ash/60 italic">???</span>
        <span className="text-[10px] uppercase tracking-widest text-gold/40">{def.rarity}</span>
      </div>
      <p className="text-xs text-ash/40 italic">
        {rarityArticle(def.rarity)} {def.rarity} ability waiting to be discovered.
      </p>
    </div>
  );
}
