import { useEffect, useMemo, useState } from 'react';
import type { HeroCombatant, PlayerAction, AbilityCombatSnapshot, BattleState } from '../../../types/combat';
import type { AbilitySlotType } from '../../../types/abilities';
import { getAbilityStore } from '../../../services/abilities/registry';
import { getArtCrops } from '../../../types/abilities';
import { previewAbilityDamage } from '../../../services/combat/reducer';
import { AbilityPreviewCard } from '../AbilityPreviewCard';

interface Props {
  hero: HeroCombatant;
  bossActorId: string;
  disabled: boolean;
  state: BattleState;
  onSubmit: (action: PlayerAction) => void;
}

const SLOT_ORDER: AbilitySlotType[] = ['core', 'signature', 'ultimate'];
const SLOT_LABEL: Record<AbilitySlotType, string> = {
  core: 'CORE',
  signature: 'SIG',
  ultimate: 'ULT',
};
const SLOT_INDEX: Record<AbilitySlotType, number> = {
  core: 1,
  signature: 2,
  ultimate: 3,
};

/**
 * Mobile Ability Row — a compact 3-tile strip (~46px tall). Each tile shows
 * only the essentials: number badge, ability name, cost, and a status color.
 * No art in the strip itself — art + full description live in a popover that
 * appears above the strip when a tile is tapped (first tap = pending, second
 * tap = confirm, per the desktop two-tap contract).
 *
 * This keeps the cards + boss as the visual stars while still surfacing
 * every gameplay-relevant field.
 */
export function MobileAbilityRow({ hero, bossActorId, disabled, state, onSubmit }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const store = getAbilityStore();

  useEffect(() => {
    if (!pendingId) return;
    const a = hero.snapshot.abilities.find((x) => x.definitionId === pendingId);
    if (!a || isDenied(hero, a, disabled)) setPendingId(null);
  }, [hero, disabled, pendingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const slots = useMemo(
    () =>
      SLOT_ORDER.map((slot) => ({
        slot,
        ability: hero.snapshot.abilities.find((a) => a.slot === slot),
      })),
    [hero],
  );

  const pendingAbility = pendingId
    ? hero.snapshot.abilities.find((a) => a.definitionId === pendingId) ?? null
    : null;
  const pendingArtUrl = pendingAbility ? artUrl(store, pendingAbility) : null;
  const pendingSlot = pendingAbility?.slot;
  const pendingProjectedDamage = pendingAbility
    ? previewAbilityDamage(state, hero, pendingAbility)
    : null;

  return (
    <div className="relative w-full" aria-label={`Abilities for ${hero.snapshot.displayName}`}>
      {/* Preview card — appears above the strip when an ability is pending */}
      {pendingAbility && (
        <div className="absolute left-1 right-1 z-30" style={{ bottom: 'calc(100% + 6px)' }}>
          <AbilityPreviewCard
            ability={pendingAbility}
            slot={pendingSlot!}
            artUrl={pendingArtUrl}
            projectedDamage={pendingProjectedDamage}
            onConfirm={() => {
              onSubmit({
                kind: 'ability',
                abilityDefinitionId: pendingAbility.definitionId,
                targetActorIds: [bossActorId],
              });
              setPendingId(null);
            }}
            onCancel={() => setPendingId(null)}
          />
        </div>
      )}

      <div
        className="grid gap-1.5 w-full"
        style={{
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          opacity: disabled ? 0.55 : 1,
          transition: 'opacity 200ms',
        }}
        aria-hidden={disabled}
      >
        {slots.map(({ slot, ability }) => (
          <MobileAbilityTile
            key={slot}
            slot={slot}
            ability={ability}
            hero={hero}
            disabled={disabled}
            pending={ability ? pendingId === ability.definitionId : false}
            onClick={() => {
              if (!ability) return;
              if (isDenied(hero, ability, disabled)) return;
              if (pendingId !== ability.definitionId) {
                setPendingId(ability.definitionId);
                return;
              }
              // Second tap on the same tile — confirm via the popover's
              // handler for consistency (also fires here for keyboard users).
              onSubmit({
                kind: 'ability',
                abilityDefinitionId: ability.definitionId,
                targetActorIds: [bossActorId],
              });
              setPendingId(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MobileAbilityTile({
  slot,
  ability,
  hero,
  disabled,
  pending,
  onClick,
}: {
  slot: AbilitySlotType;
  ability: AbilityCombatSnapshot | undefined;
  hero: HeroCombatant;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  const empty = !ability;
  const onCd =
    !empty && hero.cooldowns.some((c) => c.abilityDefinitionId === ability!.definitionId);
  const short = !empty && hero.resource < ability!.resourceCost;
  const notCharged = !empty && ability!.slot === 'ultimate' && hero.ultimateCharge < 100;
  const denied = disabled || onCd || short || notCharged || empty;

  const statusText = empty
    ? 'EMPTY'
    : onCd
    ? 'CD'
    : short
    ? 'NO MP'
    : notCharged
    ? 'LOCK'
    : pending
    ? 'CONFIRM'
    : 'READY';
  const statusColor =
    statusText === 'READY'
      ? '#8ab87d'
      : statusText === 'CONFIRM'
      ? '#f0942e'
      : statusText === 'LOCK'
      ? '#c88a45'
      : '#b06062';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={denied}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold text-left"
      style={{
        height: 44,
        borderRadius: 5,
        border: pending ? '1.5px solid #eb962e' : '1px solid #573b1f',
        background: pending
          ? 'linear-gradient(to bottom, #22140a, #120a05)'
          : denied
          ? 'rgba(15,14,15,0.75)'
          : '#0f0e0f',
        color: '#e8d6b2',
        padding: '4px 6px',
        cursor: denied ? 'not-allowed' : 'pointer',
        boxShadow: pending ? '0 0 12px rgba(235,150,46,0.4)' : 'none',
        transition: 'box-shadow 180ms, transform 180ms, border-color 180ms',
        transform: pending ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
      aria-label={
        empty
          ? `${SLOT_LABEL[slot]} slot — empty`
          : `${SLOT_LABEL[slot]}: ${ability!.displayName}${
              pending ? ' — tap again to confirm' : ''
            }`
      }
    >
      {/* Top row: number badge + name */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          aria-hidden
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            background: pending ? '#eb962e' : '#0a0605',
            border: pending ? '1px solid #ffcc63' : '1px solid #6b4319',
            color: pending ? '#1a0f05' : '#e0b878',
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'Inter, system-ui, sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {SLOT_INDEX[slot]}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1.1,
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flex: 1,
          }}
        >
          {ability?.displayName ?? '—'}
        </span>
      </div>

      {/* Bottom row: slot tag + status + cost */}
      <div
        className="flex items-center justify-between gap-1"
        style={{
          fontSize: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: 0.5,
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#8a7554' }}>{SLOT_LABEL[slot]}</span>
        <span style={{ color: statusColor }}>{statusText}</span>
        {ability && ability.resourceCost > 0 && (
          <span
            style={{
              color: '#c8a86a',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {ability.resourceCost}
          </span>
        )}
      </div>
    </button>
  );
}

function isDenied(hero: HeroCombatant, a: AbilityCombatSnapshot, disabled: boolean): boolean {
  if (disabled) return true;
  if (hero.cooldowns.some((c) => c.abilityDefinitionId === a.definitionId)) return true;
  if (hero.resource < a.resourceCost) return true;
  if (a.slot === 'ultimate' && hero.ultimateCharge < 100) return true;
  return false;
}

function artUrl(store: ReturnType<typeof getAbilityStore>, ability: AbilityCombatSnapshot): string | null {
  const art = store.getArtForAbility(ability.definitionId);
  if (!art) return null;
  return getArtCrops(art).combat.url;
}
