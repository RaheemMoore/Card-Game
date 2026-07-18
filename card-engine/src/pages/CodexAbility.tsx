import { Link, useParams } from 'react-router-dom';
import {
  getDefinition,
  getCurrentVersion,
  getFamily,
  getDiscovery,
  getReferencesForCard,
  getArtForAbility,
} from '../services/abilities/registry';
import { getAllCards } from '../services/storage';
import { EFFECT_CATALOG } from '../data/abilities/effects';
import { STATUS_CATALOG } from '../data/abilities/statuses';
import type { AbilityEffect } from '../types/abilities';

/**
 * Single-ability Codex detail. Discovered abilities show full mechanics +
 * lore + which of the player's cards currently reference it. Undiscovered
 * abilities bounce back to the family page (spoiler rule).
 */
export function CodexAbility() {
  const { abilityId } = useParams<{ abilityId: string }>();
  const def = abilityId ? getDefinition(abilityId) : undefined;
  const disc = abilityId ? getDiscovery(abilityId) : undefined;

  if (!def) {
    return (
      <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <p className="text-ash italic">Unknown ability.</p>
        <Link to="/codex" className="text-gold hover:underline text-sm">← Back to Codex</Link>
      </div>
    );
  }

  const version = getCurrentVersion(def.id);
  const families = def.familyIds.map((id) => getFamily(id)).filter(Boolean);
  const primaryFamilyId = def.familyIds[0];

  // If the player hasn't discovered it, spoiler rule sends them back.
  if (!disc) {
    return (
      <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <p className="text-ash italic">You haven't discovered this ability yet.</p>
        <Link
          to={primaryFamilyId ? `/codex/family/${primaryFamilyId}` : '/codex'}
          className="text-gold hover:underline text-sm"
        >
          ← Back to family
        </Link>
      </div>
    );
  }

  // Cards currently owning this ability. Live references (backfill + forge)
  // are authoritative; abilityHistory catches the historical trail on cards
  // that have since evolved past this ability.
  const owningCards = getAllCards().filter((card) => {
    const refs = getReferencesForCard(card.cardId);
    if (refs.some((r) => r.abilityId === def.id)) return true;
    const history = card.abilityHistory ?? {};
    for (const rank of Object.keys(history) as Array<keyof typeof history>) {
      const snaps = history[rank] ?? [];
      if (snaps.some((s) => s.abilityId === def.id)) return true;
    }
    return false;
  });

  return (
    <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <Link
        to={primaryFamilyId ? `/codex/family/${primaryFamilyId}` : '/codex'}
        className="text-gold/70 hover:text-gold text-sm"
      >
        ← Back to family
      </Link>

      <header className="mb-6 mt-2 flex gap-4 items-start">
        {(() => {
          const art = getArtForAbility(def.id);
          if (!art) return null;
          return (
            <img
              src={art.assetUrl}
              alt=""
              className="w-24 h-24 rounded-lg border border-gold/30 shrink-0"
            />
          );
        })()}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-3 mb-2">
            <h1 className="font-fantasy text-3xl font-bold text-ivory">{def.displayName}</h1>
            <span className="px-2 py-0.5 rounded bg-slate-dark text-ash text-xs uppercase tracking-widest">
              {def.rarity}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-dark text-ash text-xs uppercase tracking-widest">
              {def.role}
            </span>
          </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {families.map((f) =>
            f ? (
              <span key={f.id} className="px-2 py-0.5 rounded bg-gold/10 text-gold/80">
                {f.name}
              </span>
            ) : null,
          )}
        </div>
          {def.descriptionShort && (
            <p className="mt-3 text-bone/80 italic">"{def.descriptionShort}"</p>
          )}
        </div>
      </header>

      {def.descriptionLong && (
        <section className="mb-6 border-l-2 border-gold/30 pl-4">
          <p className="text-bone/80 leading-relaxed">{def.descriptionLong}</p>
        </section>
      )}

      {def.lore && (
        <section className="mb-6">
          <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-2">Lore</h2>
          <p className="text-bone/70 italic leading-relaxed">"{def.lore}"</p>
        </section>
      )}

      {version && (
        <section className="mb-6">
          <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-2">
            Mechanics
          </h2>
          <div className="rounded-md border border-gold/20 bg-slate-dark/60 p-3 space-y-1 text-sm">
            <div className="text-bone/80 tabular-nums">
              <strong className="text-ivory">Slot:</strong> {version.slotType} · <strong className="text-ivory">Cost:</strong>{' '}
              {version.resourceCost} {version.resourceType}
              {version.cooldownRounds ? ` · cd ${version.cooldownRounds}` : ''}
            </div>
            <div className="text-bone/80">
              <strong className="text-ivory">Target:</strong> {version.targetRule.type}
            </div>
            <div>
              <strong className="text-ivory text-sm">Effects:</strong>
              <ul className="mt-1 space-y-1 text-xs text-bone/80">
                {version.effects.map((eff, idx) => (
                  <li key={idx}>· {formatEffect(eff)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-2">
          Your discovery
        </h2>
        <p className="text-xs text-bone/70">
          First seen {new Date(disc.discoveredAt).toLocaleDateString()} ·
          {disc.firstDiscoveredGlobally ? ' first globally' : ' already known to others'} ·
          {disc.rewardGranted ? ' reward granted' : ' reward pending'}
        </p>
      </section>

      <section>
        <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-2">
          On your cards ({owningCards.length})
        </h2>
        {owningCards.length === 0 ? (
          <p className="text-xs text-ash/70 italic">
            None of your cards carry this ability at their current rank.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {owningCards.map((card) => (
              <Link
                key={card.cardId}
                to={`/card/${card.cardId}`}
                className="block rounded-md border border-gold/20 bg-slate-dark/60 p-2 hover:border-gold/50 transition-colors"
              >
                <div className="text-sm text-ivory font-fantasy">{card.cardName}</div>
                <div className="text-[10px] text-ash">{card.archetype}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatEffect(effect: AbilityEffect): string {
  const entry = EFFECT_CATALOG[effect.type];
  const name = entry?.displayName ?? effect.type;
  switch (effect.type) {
    case 'direct_damage':
      return `${name}: ${effect.amount}${effect.scaling ? ` + ${effect.scaling.coefficient}× ${effect.scaling.stat.toUpperCase()}` : ''}${effect.damageType ? ` (${effect.damageType})` : ''}`;
    case 'damage_over_time': {
      const status = STATUS_CATALOG[effect.statusId]?.displayName ?? effect.statusId;
      return `${name}: ${status} — ${effect.amountPerTick}/round for ${effect.duration}`;
    }
    case 'healing':
      return `${name}: ${effect.amount}${effect.scaling ? ` + ${effect.scaling.coefficient}× ${effect.scaling.stat.toUpperCase()}` : ''}`;
    case 'shielding':
      return `${name}: ${effect.amount}${effect.duration ? ` for ${effect.duration} rounds` : ''}`;
    case 'apply_status': {
      const status = STATUS_CATALOG[effect.status.statusId]?.displayName ?? effect.status.statusId;
      return `${name}: ${status} for ${effect.status.duration}`;
    }
    case 'guard':
      return `${name}: reduce ${Math.round(effect.reductionPercent * 100)}% for ${effect.duration}`;
    case 'lifesteal':
      return `${name}: heal ${Math.round(effect.percentOfDamage * 100)}% of damage dealt`;
    case 'multi_hit':
      return `${name}: ${effect.hitCount}× ${effect.amountPerHit}`;
    case 'ultimate_charge_gain':
      return `${name}: +${effect.amount}`;
    case 'taunt':
      return `${name}: ${effect.duration} rounds`;
    case 'summon':
      return `${name}: ${effect.unitId}${effect.count ? ` ×${effect.count}` : ''}`;
    default:
      return name;
  }
}
