import { useEffect, useMemo, useState } from 'react';
import type { HeroCombatant, PlayerAction, AbilityCombatSnapshot } from '../../types/combat';
import type { AbilitySlotType } from '../../types/abilities';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';
import { CombatFrame } from './CombatFrame';

interface Props {
  hero: HeroCombatant;
  bossActorId: string;
  disabled: boolean;
  onSubmit: (action: PlayerAction) => void;
}

const SLOT_ORDER: AbilitySlotType[] = ['core', 'signature', 'ultimate'];
const SLOT_LABEL: Record<AbilitySlotType, string> = {
  core: 'CORE',
  signature: 'SIGNATURE',
  ultimate: 'ULTIMATE',
};

/**
 * Ability Command Bar — three fixed slots sourced from Figma
 * CombatFrame/AbilitySlot (22:180) and CommandShelf Ability Strip Zone
 * (18:52/56/60). Slot dimensions preserved exactly: 170×72 with icon at
 * left rotated 45°, name + meta text on the right.
 *
 * Selected slot swaps preset from `abilitySlot` → `abilitySlotSelected`
 * (Figma 18:56 tokens: #160f06 bg, #c27826 1.5px border).
 */
export function AbilityCommandBar({ hero, bossActorId, disabled, onSubmit }: Props) {
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

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 flex items-center transition-opacity duration-200 ${
        disabled ? 'opacity-45' : 'opacity-100'
      }`}
      style={{ bottom: '5.75rem', zIndex: 25, gap: 15 }}
      aria-label="Ability command bar"
      aria-hidden={disabled}
    >
      {slots.map(({ slot, ability }) => (
        <AbilitySlot
          key={slot}
          slot={slot}
          ability={ability}
          hero={hero}
          disabled={disabled}
          pending={ability ? pendingId === ability.definitionId : false}
          artUrl={ability ? artUrl(store, ability) : null}
          onClick={() => {
            if (!ability) return;
            if (isDenied(hero, ability, disabled)) return;
            if (pendingId !== ability.definitionId) {
              setPendingId(ability.definitionId);
              return;
            }
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
  );
}

/**
 * A single ability slot — 170×72 per Figma (CommandShelf spec). The 220×82
 * standalone spec from CombatFrame/AbilitySlot is the "detail" variant used
 * for the palette board; the in-shelf variant is more compact.
 */
function AbilitySlot({
  slot,
  ability,
  hero,
  disabled,
  pending,
  onClick,
  artUrl,
}: {
  slot: AbilitySlotType;
  ability: AbilityCombatSnapshot | undefined;
  hero: HeroCombatant;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
  artUrl: string | null;
}) {
  const empty = !ability;
  const onCd =
    !empty && hero.cooldowns.some((c) => c.abilityDefinitionId === ability!.definitionId);
  const short = !empty && hero.resource < ability!.resourceCost;
  const notCharged = !empty && ability!.slot === 'ultimate' && hero.ultimateCharge < 100;
  const denied = disabled || onCd || short || notCharged || empty;
  const preset = pending ? 'abilitySlotSelected' : 'abilitySlot';

  const nameColor = pending ? '#ebd9b2' : '#e8d6b2';
  const metaColor = pending ? '#f09c33' : '#948266';

  const statusText = empty
    ? 'EMPTY'
    : onCd
    ? 'COOLDOWN'
    : short
    ? 'NO RESOURCE'
    : notCharged
    ? 'LOCKED'
    : 'READY';
  const statusColor =
    statusText === 'READY' ? '#8ab87d' : statusText === 'LOCKED' ? '#c88a45' : '#b06062';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={denied}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: denied ? 'not-allowed' : 'pointer' }}
      aria-label={
        empty
          ? `${SLOT_LABEL[slot]} slot — empty`
          : `${SLOT_LABEL[slot]}: ${ability!.displayName}${pending ? ' — click again to confirm' : ''}`
      }
    >
      <CombatFrame
        preset={preset}
        style={{
          width: 170,
          height: 72,
          transform: pending ? 'translateY(-3px)' : 'translateY(0)',
          transition: 'transform 200ms',
        }}
      >
        {/* Diamond icon slot — rotated 45° container, Figma 18:53 pattern */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 12,
            top: -4,
            width: 45,
            height: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              transform: 'rotate(-45deg)',
              width: 32,
              height: 32,
              overflow: 'hidden',
              borderRadius: 4,
              background: '#1a1210',
              border: '1px solid #573b1f',
            }}
          >
            {artUrl ? (
              <img
                src={artUrl}
                alt=""
                draggable={false}
                aria-hidden
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'rotate(45deg) scale(1.4)',
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3a2612 0%, #1a1210 100%)' }} />
            )}
          </div>
        </div>

        {/* Ability name — Figma 18:54: Inter Semi-Bold 12px #e8d6b2 at (57,15) */}
        <div
          style={{
            position: 'absolute',
            left: 57,
            top: 15,
            color: nameColor,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 108,
          }}
        >
          {ability?.displayName ?? '—'}
        </div>

        {/* Meta line: SLOT • COST N — Figma 18:55: Inter Regular 9px */}
        <div
          style={{
            position: 'absolute',
            left: 57,
            top: 38,
            color: metaColor,
            fontSize: 9,
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'pre',
          }}
        >
          {`${SLOT_LABEL[slot]}${ability && ability.resourceCost > 0 ? `  •  COST ${ability.resourceCost}` : ''}`}
        </div>

        {/* Status line: READY / COOLDOWN / etc */}
        <div
          style={{
            position: 'absolute',
            left: 57,
            top: 54,
            color: statusColor,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0.6,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {pending ? 'CONFIRM →' : statusText}
        </div>
      </CombatFrame>
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
