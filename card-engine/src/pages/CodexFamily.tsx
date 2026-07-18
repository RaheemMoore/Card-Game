import { Link, useParams } from 'react-router-dom';
import {
  getFamily,
  getAllDefinitions,
  getCurrentVersion,
  getAllDiscoveries,
  getArtForAbility,
} from '../services/abilities/registry';
import { getArtCrops, type AbilityDefinition, type AbilityFamily } from '../types/abilities';
import {
  AbilityCommandStateOverlay,
  AbilityCommandStrip,
  type AbilityTier,
  type BadgeResource,
} from '../components/abilities';

/**
 * Per-family Codex page. Discovered abilities render as readOnly Command
 * Strips (canonical Gate 7A visual). Undiscovered abilities preserve the
 * strict Stage 0 spoiler rule (decision #7): no name, no silhouette, no
 * description — just family + rarity teaser.
 */
export function CodexFamily() {
  const { familyId } = useParams<{ familyId: string }>();
  const family = familyId ? getFamily(familyId) : undefined;

  if (!family) {
    return (
      <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <p className="text-ash italic">Unknown family.</p>
        <Link to="/codex" className="text-gold hover:underline text-sm">
          ← Back to Codex
        </Link>
      </div>
    );
  }

  const definitions = getAllDefinitions().filter(
    (d) =>
      d.status !== 'merged' &&
      d.status !== 'deprecated' &&
      d.familyIds.includes(family.id),
  );
  const discoveredIds = new Set(getAllDiscoveries().map((d) => d.abilityId));
  const discovered = definitions.filter((d) => discoveredIds.has(d.id));
  const undiscovered = definitions.filter((d) => !discoveredIds.has(d.id));

  discovered.sort(byRarityThenName);

  return (
    <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <Link to="/codex" className="text-gold/70 hover:text-gold text-sm">
        ← Back to Codex
      </Link>
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
          <div className="flex flex-col items-center gap-3">
            {discovered.map((def) => (
              <DiscoveredStrip key={def.id} def={def} family={family} />
            ))}
          </div>
        </section>
      )}

      {undiscovered.length > 0 && (
        <section>
          <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-3">
            Still unknown ({undiscovered.length})
          </h2>
          <div className="flex flex-col items-center gap-3">
            {undiscovered.map((def) => (
              <UndiscoveredStrip key={def.id} def={def} />
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

function byRarityThenName(a: AbilityDefinition, b: AbilityDefinition): number {
  const rDiff = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  return rDiff !== 0 ? rDiff : a.displayName.localeCompare(b.displayName);
}

function rarityArticle(rarity: string): 'A' | 'An' {
  return /^[aeiou]/i.test(rarity) ? 'An' : 'A';
}

/** Discovered ability — clickable Command Strip. */
function DiscoveredStrip({ def, family }: { def: AbilityDefinition; family: AbilityFamily }) {
  const version = getCurrentVersion(def.id);
  const art = getArtForAbility(def.id);
  const iconUrl = art ? getArtCrops(art).combat.url : undefined;

  const tier: AbilityTier = version?.slotType ?? 'core';
  const resource: BadgeResource | undefined =
    version?.resourceType === 'mana' || version?.resourceType === 'tech'
      ? version.resourceType
      : undefined;
  const metaText = `${tier} • ${family.name} • ${def.rarity}`.toUpperCase();

  return (
    <Link
      to={`/codex/ability/${def.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-[10px]"
    >
      <AbilityCommandStrip
        tier={tier}
        state="ready"
        displayName={def.displayName}
        effectText={def.descriptionShort}
        metaText={metaText}
        resource={resource}
        resourceCost={version?.resourceCost}
        readOnly
        iconSlot={
          iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              style={{ transform: 'rotate(45deg)' }}
            />
          ) : null
        }
      />
    </Link>
  );
}

/**
 * Undiscovered ability — Command Strip skeleton with an `undiscovered`
 * overlay that hides the strip's content behind the "???" pill + veil.
 * Spoiler rule: no real name, no icon, no description, no cost.
 */
function UndiscoveredStrip({ def }: { def: AbilityDefinition }) {
  return (
    <div
      aria-label={`Undiscovered ${def.rarity} ability`}
      className="relative"
      style={{ width: 360, height: 92 }}
    >
      <AbilityCommandStrip
        tier="core"
        state="ready"
        displayName=""
        effectText={`${rarityArticle(def.rarity)} ${def.rarity} ability waiting to be discovered.`}
        readOnly
        iconSlot={null}
      >
        <AbilityCommandStateOverlay variant="undiscovered" />
      </AbilityCommandStrip>
    </div>
  );
}
