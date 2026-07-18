import { Link } from 'react-router-dom';
import {
  getAllFamilies,
  getAllDefinitions,
  getAllDiscoveries,
} from '../services/abilities/registry';

/**
 * Ability Codex home. Shows each ability family with the player's discovery
 * progress ("3 of 12") and total library size. Clicking a family tile opens
 * that family's detail page.
 *
 * Full Figma tile visual language (Relic Presentation etc.) comes at a later
 * polish pass — A7 ships the functional structure.
 */
export function Codex() {
  const families = getAllFamilies();
  const definitions = getAllDefinitions();
  const discoveries = getAllDiscoveries();
  const discoveredIds = new Set(discoveries.map((d) => d.abilityId));

  const totalDiscovered = discoveries.length;
  const totalLibrary = definitions.length;

  families.sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="font-fantasy text-3xl font-bold text-ivory">Ability Codex</h1>
        <p className="text-sm text-ash mt-1">
          Discovered {totalDiscovered} of {totalLibrary} known abilities.
          The library grows as new ones are forged.
        </p>
      </header>

      {families.length === 0 ? (
        <p className="text-ash italic">
          The Codex is still being written. Come back after an admin has seeded the library.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((family) => {
            const inFamily = definitions.filter(
              (d) => d.status !== 'merged' && d.status !== 'deprecated' && d.familyIds.includes(family.id),
            );
            const discoveredInFamily = inFamily.filter((d) => discoveredIds.has(d.id)).length;
            const undiscoveredCount = inFamily.length - discoveredInFamily;
            return (
              <Link
                key={family.id}
                to={`/codex/family/${family.id}`}
                className="block rounded-lg border border-gold/30 bg-slate-dark/60 p-4 hover:border-gold/60 transition-colors"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="font-fantasy text-lg font-bold text-ivory">{family.name}</h2>
                  <span className="text-xs text-ash tabular-nums">
                    {discoveredInFamily}/{inFamily.length}
                  </span>
                </div>
                <p className="text-xs text-bone/70 leading-relaxed line-clamp-3">
                  {family.description}
                </p>
                {undiscoveredCount > 0 && (
                  <p className="text-[10px] uppercase tracking-widest text-gold/60 mt-3">
                    {undiscoveredCount} still unknown
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
