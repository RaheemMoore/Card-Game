import { useEffect, useMemo, useState } from 'react';
import type { HeroCombatant, PlayerAction, AbilityCombatSnapshot } from '../../../types/combat';
import type { AbilitySlotType } from '../../../types/abilities';
import { getAbilityStore } from '../../../services/abilities/registry';
import { getArtCrops } from '../../../types/abilities';

interface Props {
  hero: HeroCombatant;
  bossActorId: string;
  disabled: boolean;
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
export function MobileAbilityRow({ hero, bossActorId, disabled, onSubmit }: Props) {
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

  return (
    <div className="relative w-full" aria-label={`Abilities for ${hero.snapshot.displayName}`}>
      {/* Popover — appears above the strip when an ability is pending */}
      {pendingAbility && (
        <AbilityPopover
          ability={pendingAbility}
          slot={pendingSlot!}
          artUrl={pendingArtUrl}
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

/**
 * Popover above the ability strip that surfaces art + full description +
 * cost details when an ability is pending. Reuses the compact combat-frame
 * material language (dark bg, gold border) without wrapping in a heavy
 * CombatFrame preset — this is a transient tooltip, not a canonical surface.
 */
function AbilityPopover({
  ability,
  slot,
  artUrl,
  onConfirm,
  onCancel,
}: {
  ability: AbilityCombatSnapshot;
  slot: AbilitySlotType;
  artUrl: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={`Confirm ${ability.displayName}`}
      className="absolute left-1 right-1 z-30"
      style={{
        bottom: 'calc(100% + 6px)',
        background: 'linear-gradient(to bottom, #18110a, #0b0806)',
        border: '1.5px solid #b8862a',
        borderRadius: 6,
        boxShadow: '0 -6px 22px rgba(0,0,0,0.65), 0 0 22px rgba(235,150,46,0.3)',
        padding: 8,
        pointerEvents: 'auto',
        display: 'flex',
        gap: 8,
      }}
    >
      {/* Art crop */}
      <div
        style={{
          width: 60,
          height: 60,
          flexShrink: 0,
          borderRadius: 4,
          overflow: 'hidden',
          background: '#1a1210',
          border: '1px solid #573b1f',
        }}
      >
        {artUrl ? (
          <img
            src={artUrl}
            alt=""
            aria-hidden
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #3a2612 0%, #1a1210 100%)',
            }}
          />
        )}
      </div>

      {/* Text column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div
              style={{
                color: '#f0942e',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.2,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {SLOT_LABEL[slot]}
              {ability.resourceCost > 0 && (
                <span style={{ color: '#c8a86a', marginLeft: 4, letterSpacing: 0.4 }}>
                  · COST {ability.resourceCost}
                </span>
              )}
            </div>
            <div
              style={{
                color: '#ebd9b2',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ability.displayName}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel ability selection"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{
              width: 20,
              height: 20,
              borderRadius: 3,
              border: '1px solid #573b1f',
              background: '#0f0e0f',
              color: '#d6c7a8',
              fontSize: 10,
              lineHeight: 1,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            color: '#c8b895',
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ability.def.descriptionShort || ability.def.descriptionLong || 'Deal damage to the target.'}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          style={{
            marginTop: 2,
            height: 26,
            borderRadius: 4,
            border: '1.5px solid #eb962e',
            background: 'linear-gradient(to right, #592b09, #1a1412)',
            color: '#ffdb94',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.4,
            fontFamily: 'Inter, system-ui, sans-serif',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(235,150,46,0.35)',
          }}
        >
          CONFIRM →
        </button>
      </div>
    </div>
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
