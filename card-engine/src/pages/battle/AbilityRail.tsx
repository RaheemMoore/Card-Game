import { useEffect, useMemo, useState } from 'react';
import {
  AbilityCommandStateOverlay,
  AbilityCommandStrip,
  type AbilityCommandState,
  type AbilityTier,
  type BadgeResource,
} from '../../components/abilities';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';
import type { HeroCombatant, PlayerAction } from '../../types/combat';

interface Props {
  hero: HeroCombatant;
  bossActorId: string;
  disabled: boolean;
  onSubmit: (action: PlayerAction) => void;
}

/**
 * Command Strip rail replacing the old rectangular button grid. Wires the
 * approved select-then-confirm interaction:
 *
 *   Tap 1 → sets the ability as `selected`, lays the CHOOSE TARGET overlay
 *   Tap 2 → commits the ability against the boss (single-target encounter,
 *           so the target is implicit)
 *   Esc / tap another strip → clears the pending selection
 *
 * Utility actions (Guard / Focus / Inspect) stay as small buttons in a
 * separate rail — the approved Command Strip system covers only ability
 * actions per ATS §17.
 */
export function AbilityRail({ hero, bossActorId, disabled, onSubmit }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const store = getAbilityStore();

  // Clear the pending selection whenever it becomes unusable — the round
  // may have ended, the resource may have dropped, etc.
  useEffect(() => {
    if (!pendingId) return;
    const a = hero.snapshot.abilities.find((x) => x.definitionId === pendingId);
    if (!a) {
      setPendingId(null);
      return;
    }
    if (isAbilityDenied(hero, a, disabled)) setPendingId(null);
  }, [hero, disabled, pendingId]);

  // Global Esc handler to cancel a pending selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const strips = useMemo(
    () =>
      hero.snapshot.abilities.map((a) => {
        const art = store.getArtForAbility(a.definitionId);
        const iconUrl = art ? getArtCrops(art).combat.url : undefined;
        const family = a.def.familyIds[0]
          ? store.getFamily(a.def.familyIds[0])
          : undefined;
        const denied = isAbilityDenied(hero, a, disabled);
        const onCd = hero.cooldowns.some((c) => c.abilityDefinitionId === a.definitionId);
        const short = hero.resource < a.resourceCost;
        const notCharged = a.slot === 'ultimate' && hero.ultimateCharge < 100;

        // Resolve the visual state per Command Strip contract (ATS §17).
        // Selected wins over Cooldown/Disabled because the whole "denied ->
        // clear pending" effect above guarantees you can't stay selected on
        // a denied ability.
        const isSelected = pendingId === a.definitionId;
        let state: AbilityCommandState;
        if (isSelected) state = 'selected';
        else if (onCd) state = 'cooldown';
        else if (denied) state = 'disabled';
        else state = 'ready';

        const tier: AbilityTier = a.slot;
        const resource: BadgeResource | undefined =
          a.resourceType === 'mana' || a.resourceType === 'tech' ? a.resourceType : undefined;

        const metaText = [tier, family?.name].filter(Boolean).join(' • ').toUpperCase();

        return { a, iconUrl, state, tier, resource, metaText, denied, onCd, short, notCharged, isSelected };
      }),
    [hero, pendingId, disabled, store],
  );

  return (
    <div
      className="rounded-lg border p-3 mb-3"
      style={{ borderColor: 'rgba(196,196,212,0.15)', background: 'rgba(10,10,15,0.55)' }}
    >
      <div className="flex flex-col items-center gap-3">
        {strips.map(({ a, iconUrl, state, tier, resource, metaText, denied, onCd, short, notCharged, isSelected }) => {
          const overlay = pickOverlay({ isSelected, onCd, short, notCharged });
          return (
            <AbilityCommandStrip
              key={a.definitionId}
              tier={tier}
              state={state}
              displayName={a.displayName}
              effectText={a.def.descriptionShort}
              metaText={metaText}
              resource={resource}
              resourceCost={a.resourceCost}
              iconSlot={
                iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                    style={{ transform: 'rotate(45deg)' /* undo the well's -45° so art reads upright */ }}
                  />
                ) : null
              }
              onActivate={() => {
                if (denied) return;
                if (!isSelected) {
                  setPendingId(a.definitionId);
                  return;
                }
                // Second tap = commit
                onSubmit({
                  kind: 'ability',
                  abilityDefinitionId: a.definitionId,
                  targetActorIds: [bossActorId],
                });
                setPendingId(null);
              }}
            >
              {overlay && <AbilityCommandStateOverlay variant={overlay} />}
            </AbilityCommandStrip>
          );
        })}
      </div>
    </div>
  );
}

function isAbilityDenied(
  hero: HeroCombatant,
  a: HeroCombatant['snapshot']['abilities'][number],
  disabled: boolean,
): boolean {
  if (disabled) return true;
  if (hero.cooldowns.some((c) => c.abilityDefinitionId === a.definitionId)) return true;
  if (hero.resource < a.resourceCost) return true;
  if (a.slot === 'ultimate' && hero.ultimateCharge < 100) return true;
  return false;
}

function pickOverlay({
  isSelected,
  onCd,
  short,
  notCharged,
}: {
  isSelected: boolean;
  onCd: boolean;
  short: boolean;
  notCharged: boolean;
}) {
  if (isSelected) return 'targeting' as const;
  if (onCd) return undefined; // strip's Cooldown surface carries the signal
  if (short) return 'insufficient' as const;
  if (notCharged) return 'locked' as const;
  return undefined;
}
