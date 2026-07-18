import { useState } from 'react';
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
import { getArtCrops, type AbilityEffect } from '../types/abilities';
import { AbilityDetailCard, type AbilityTier, type BadgeResource } from '../components/abilities';
import { RelicDiscoveryModal } from '../components/RelicDiscoveryModal';

/**
 * Single-ability Codex detail (Gate 7A). Discovered → AbilityDetailCard +
 * Reveal Relic modal + mechanics / discovery / owning-cards panels beside
 * it. Undiscovered → spoiler bounce back to the family page.
 */
export function CodexAbility() {
  const { abilityId } = useParams<{ abilityId: string }>();
  const def = abilityId ? getDefinition(abilityId) : undefined;
  const disc = abilityId ? getDiscovery(abilityId) : undefined;
  const [showRelic, setShowRelic] = useState(false);

  if (!def) {
    return (
      <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <p className="text-ash italic">Unknown ability.</p>
        <Link to="/codex" className="text-gold hover:underline text-sm">
          ← Back to Codex
        </Link>
      </div>
    );
  }

  const version = getCurrentVersion(def.id);
  const primaryFamilyId = def.familyIds[0];
  const primaryFamily = primaryFamilyId ? getFamily(primaryFamilyId) : undefined;

  // Spoiler rule — undiscovered bounces back.
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

  const art = getArtForAbility(def.id);
  const crops = art ? getArtCrops(art) : undefined;

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

  const tier: AbilityTier = version?.slotType ?? 'core';
  const resource: BadgeResource | undefined =
    version?.resourceType === 'mana' || version?.resourceType === 'tech'
      ? version.resourceType
      : undefined;

  const metaLeft = primaryFamily
    ? `${primaryFamily.name.toUpperCase()} • ${def.role.toUpperCase()}`
    : def.role.toUpperCase();
  const metaRight = def.rarity.toUpperCase();

  return (
    <div className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
      <Link
        to={primaryFamilyId ? `/codex/family/${primaryFamilyId}` : '/codex'}
        className="text-gold/70 hover:text-gold text-sm"
      >
        ← Back to family
      </Link>

      <div className="mt-4 flex flex-wrap gap-6 items-start">
        {/* Detail card on the left. */}
        {crops && (
          <div className="shrink-0">
            <AbilityDetailCard
              tier={tier}
              abilityName={def.displayName.toUpperCase()}
              artworkUrl={crops.detail.url}
              primaryRules={def.descriptionShort}
              secondaryRules={def.descriptionLong ?? def.lore}
              metaLeft={metaLeft}
              metaRight={metaRight}
              caption="Approved canonical artwork · Ability Codex"
              resource={resource}
              resourceCost={version?.resourceCost}
            />
            <button
              onClick={() => setShowRelic(true)}
              className="mt-3 w-full py-2 rounded font-fantasy text-sm font-bold border transition-colors"
              style={{
                borderColor: 'rgba(251,191,36,0.6)',
                background: 'rgba(251,191,36,0.12)',
                color: 'var(--text-primary, #f4e8d2)',
              }}
            >
              Reveal Relic
            </button>
          </div>
        )}

        {/* Side panels — mechanics, discovery, owning cards. */}
        <div className="flex-1 min-w-[240px] space-y-6">
          {version && (
            <section>
              <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-2">
                Mechanics
              </h2>
              <div className="rounded-md border border-gold/20 bg-slate-dark/60 p-3 space-y-1 text-sm">
                <div className="text-bone/80 tabular-nums">
                  <strong className="text-ivory">Slot:</strong> {version.slotType} ·{' '}
                  <strong className="text-ivory">Cost:</strong> {version.resourceCost}{' '}
                  {version.resourceType}
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

          {def.lore && (
            <section>
              <h2 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-2">
                Lore
              </h2>
              <p className="text-bone/70 italic leading-relaxed">"{def.lore}"</p>
            </section>
          )}

          <section>
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
      </div>

      {showRelic && (
        <RelicDiscoveryModal
          abilityId={def.id}
          moment="discovery"
          resourceAccent={resource}
          onClose={() => setShowRelic(false)}
        />
      )}
    </div>
  );
}

function formatEffect(effect: AbilityEffect): string {
  const entry = EFFECT_CATALOG[effect.type];
  const name = entry?.displayName ?? effect.type;
  switch (effect.type) {
    case 'direct_damage':
      return `${name}: ${effect.amount}${
        effect.scaling
          ? ` + ${effect.scaling.coefficient}× ${effect.scaling.stat.toUpperCase()}`
          : ''
      }${effect.damageType ? ` (${effect.damageType})` : ''}`;
    case 'damage_over_time': {
      const status = STATUS_CATALOG[effect.statusId]?.displayName ?? effect.statusId;
      return `${name}: ${status} — ${effect.amountPerTick}/round for ${effect.duration}`;
    }
    case 'healing':
      return `${name}: ${effect.amount}${
        effect.scaling
          ? ` + ${effect.scaling.coefficient}× ${effect.scaling.stat.toUpperCase()}`
          : ''
      }`;
    case 'shielding':
      return `${name}: ${effect.amount}${
        effect.duration ? ` for ${effect.duration} rounds` : ''
      }`;
    case 'apply_status': {
      const status =
        STATUS_CATALOG[effect.status.statusId]?.displayName ?? effect.status.statusId;
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
