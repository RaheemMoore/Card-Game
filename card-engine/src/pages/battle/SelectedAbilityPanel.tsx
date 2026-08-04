import { useMemo, useState } from 'react';
import type { AbilitySlotType } from '../../types/abilities';
import type { AbilityCombatSnapshot, HeroCombatant, PlayerAction } from '../../types/combat';
import { AbilityCommandStrip } from '../../components/abilities';
import type { AbilityCommandState, AbilityTier } from '../../components/abilities/types';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';
import { NoAbilitiesTurnNotice } from './NoAbilitiesTurnNotice';

interface Props {
  hero: HeroCombatant;
  availableResource: number;
  disabled: boolean;
  pendingId: string | null;
  plannedAction?: PlayerAction;
  noAbilitiesThisTurn: boolean;
  nextHeroName?: string;
  onArm: (definitionId: string | null) => void;
  onWait: () => void;
  onHoverAbility: (ability: AbilityCombatSnapshot | null) => void;
}

const SLOT_ORDER: AbilitySlotType[] = ['core', 'signature', 'ultimate'];

/** Persistent command palette for the selected card. No disclosure click. */
export function SelectedAbilityPanel({
  hero,
  availableResource,
  disabled,
  pendingId,
  plannedAction,
  noAbilitiesThisTurn,
  nextHeroName,
  onArm,
  onWait,
  onHoverAbility,
}: Props) {
  const store = getAbilityStore();
  const plannedAbilityId = plannedAction?.kind === 'ability'
    ? plannedAction.abilityDefinitionId
    : null;
  const slots = useMemo(
    () => SLOT_ORDER.map((slot) => ({
      slot,
      ability: hero.snapshot.abilities.find((ability) => ability.slot === slot),
    })),
    [hero],
  );

  return (
    <section
      aria-label={`${hero.snapshot.displayName} abilities`}
      className="absolute flex flex-col"
      style={{
        left: 0,
        bottom: 'calc(100% + 12px)',
        width: 'clamp(300px, 29vw, 360px)',
        gap: 6,
        zIndex: 5,
        padding: 9,
        borderRadius: 9,
        border: '1px solid rgba(194,132,52,0.72)',
        background: 'linear-gradient(145deg, rgba(25,17,10,0.98), rgba(6,7,8,0.97) 62%)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.76), 0 0 22px rgba(235,150,46,0.16)',
      }}
    >
      <header className="flex items-center justify-between gap-3 px-1 pb-1">
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#ffdb94', font: '700 12px/1.2 Inter, system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hero.snapshot.displayName}
          </div>
          <div style={{ color: '#9f8966', font: '700 8px/1.4 Inter, system-ui, sans-serif', letterSpacing: 1.35 }}>
            CHOOSE ONE ACTION
          </div>
        </div>
        <span style={{ color: plannedAction ? '#8fca83' : '#d6a15a', font: '800 8px/1 Inter, system-ui, sans-serif', letterSpacing: 1 }}>
          {plannedAction ? 'PLANNED' : 'SELECTED'}
        </span>
      </header>

      {noAbilitiesThisTurn && (
        <NoAbilitiesTurnNotice
          heroName={hero.snapshot.displayName}
          completed={plannedAction?.kind === 'wait'}
          nextHeroName={nextHeroName}
          onWait={onWait}
        />
      )}

      {slots.map(({ slot, ability }) => (
        <AbilityRow
          key={slot}
          slot={slot}
          ability={ability}
          hero={hero}
          availableResource={availableResource}
          disabled={disabled}
          pending={ability?.definitionId === pendingId}
          planned={ability?.definitionId === plannedAbilityId}
          artUrl={ability ? artUrl(store, ability) : null}
          onClick={() => {
            if (!ability || isDenied(hero, ability, availableResource, disabled)) return;
            onArm(pendingId === ability.definitionId ? null : ability.definitionId);
          }}
          onHover={(active) => onHoverAbility(active ? ability ?? null : null)}
        />
      ))}
    </section>
  );
}

function AbilityRow({ slot, ability, hero, availableResource, disabled, pending, planned, artUrl: art, onClick, onHover }: {
  slot: AbilitySlotType;
  ability?: AbilityCombatSnapshot;
  hero: HeroCombatant;
  availableResource: number;
  disabled: boolean;
  pending: boolean;
  planned: boolean;
  artUrl: string | null;
  onClick: () => void;
  onHover: (active: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cooldown = ability ? hero.cooldowns.find((entry) => entry.abilityDefinitionId === ability.definitionId) : undefined;
  const short = Boolean(ability && availableResource < ability.resourceCost);
  const uncharged = Boolean(ability && ability.slot === 'ultimate' && hero.ultimateCharge < 100);
  const denied = !ability || disabled || Boolean(cooldown) || short || uncharged;
  const state: AbilityCommandState = pending || planned
    ? 'selected'
    : cooldown
      ? 'cooldown'
      : denied
        ? 'disabled'
        : hovered
          ? 'hover'
          : 'ready';
  const status = !ability
    ? 'EMPTY SLOT'
    : planned
      ? 'PLANNED — SELECT TO REPLACE'
      : cooldown
        ? `COOLDOWN ${cooldown.remainingRounds}`
        : short
          ? `NEEDS ${ability.resourceCost} ${ability.resourceType.toUpperCase()}`
          : uncharged
            ? 'ULTIMATE NOT CHARGED'
            : pending
              ? 'SELECTED'
              : 'READY';

  return (
    <AbilityCommandStrip
      size="compact"
      tier={slot as AbilityTier}
      state={state}
      displayName={ability?.displayName ?? '—'}
      effectText={status}
      iconSlot={art ? (
        <img src={art} alt="" aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'rotate(45deg) scale(1.45)', opacity: denied ? 0.5 : 1 }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3a2612, #15100c)' }} />
      )}
      resource={ability?.resourceType === 'mana' || ability?.resourceType === 'tech' ? ability.resourceType : undefined}
      resourceCost={ability?.resourceCost}
      onActivate={onClick}
      onHoverChange={(active) => {
        setHovered(active);
        if (ability) onHover(active);
      }}
    />
  );
}

function isDenied(hero: HeroCombatant, ability: AbilityCombatSnapshot, availableResource: number, disabled: boolean): boolean {
  return disabled
    || hero.cooldowns.some((entry) => entry.abilityDefinitionId === ability.definitionId)
    || availableResource < ability.resourceCost
    || (ability.slot === 'ultimate' && hero.ultimateCharge < 100);
}

function artUrl(store: ReturnType<typeof getAbilityStore>, ability: AbilityCombatSnapshot): string | null {
  const art = store.getArtForAbility(ability.definitionId);
  return art ? getArtCrops(art).combat.url : null;
}
