import { useEffect, useMemo, useState } from 'react';
import type { HeroCombatant, PlayerAction, AbilityCombatSnapshot } from '../../types/combat';
import type { AbilitySlotType } from '../../types/abilities';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';

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
 * Compact three-slot horizontal command bar docked at the lower Arena.
 * Slots are always present in a fixed order (Core / Signature / Ultimate),
 * even when the hero doesn't have that slot filled — empty slots stay
 * greyed. The three-slot rhythm anchors the eye instead of morphing per
 * hero.
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

  const slots = useMemo(() => {
    return SLOT_ORDER.map((slot) => {
      const ability = hero.snapshot.abilities.find((a) => a.slot === slot);
      return { slot, ability };
    });
  }, [hero]);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3"
      style={{ bottom: '3.5rem', zIndex: 25 }}
      aria-label="Ability command bar"
    >
      {slots.map(({ slot, ability }) => (
        <AbilitySlot
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
            // Second click = commit
            onSubmit({
              kind: 'ability',
              abilityDefinitionId: ability.definitionId,
              targetActorIds: [bossActorId],
            });
            setPendingId(null);
          }}
          artUrl={ability ? artUrl(store, ability) : null}
        />
      ))}
    </div>
  );
}

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

  const slotAccent =
    slot === 'ultimate'
      ? 'from-amber-500/80 to-amber-800/60'
      : slot === 'signature'
      ? 'from-violet-500/70 to-violet-800/50'
      : 'from-slate-400/60 to-slate-700/40';

  const stateBorder = pending
    ? 'border-gold shadow-[0_0_18px_rgba(212,175,55,0.55)]'
    : onCd || notCharged
    ? 'border-bone/25 opacity-70'
    : short
    ? 'border-crimson/40 opacity-70'
    : empty
    ? 'border-bone/25 border-dashed opacity-70'
    : 'border-bone/50 hover:border-gold/60';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={denied}
      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg border-2 overflow-hidden transition-all ${stateBorder} focus:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
      style={{ background: 'rgba(10,6,14,0.85)' }}
      aria-label={
        empty
          ? `${SLOT_LABEL[slot]} slot — empty`
          : `${SLOT_LABEL[slot]}: ${ability!.displayName}${
              pending ? ' — click again to confirm' : ''
            }`
      }
    >
      {/* Slot color accent bar top */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${slotAccent}`} />

      {artUrl ? (
        <img
          src={artUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-bone/25 font-fantasy text-[10px] uppercase tracking-widest">
            {SLOT_LABEL[slot]}
          </span>
        </div>
      )}

      {/* Bottom overlay: name + cost */}
      {ability && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 pt-3 pb-1 px-1.5"
            style={{
              background: 'linear-gradient(to top, rgba(6,4,10,0.95) 30%, transparent 100%)',
            }}
          >
            <div className="text-[9px] uppercase tracking-widest text-gold/90 leading-none">
              {SLOT_LABEL[slot]}
            </div>
            <div className="text-[10px] text-bone font-fantasy leading-tight truncate">
              {ability.displayName}
            </div>
          </div>
          {/* Resource cost pip top-right */}
          {ability.resourceCost > 0 && (
            <span
              className="absolute top-2 right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-void"
              style={{
                background:
                  ability.resourceType === 'tech'
                    ? 'linear-gradient(180deg, #fbbf24, #d97706)'
                    : 'linear-gradient(180deg, #93c5fd, #1e40af)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.7)',
              }}
              aria-label={`Costs ${ability.resourceCost} ${ability.resourceType}`}
            >
              {ability.resourceCost}
            </span>
          )}
          {/* Denial overlay */}
          {(onCd || short || notCharged) && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(6,4,10,0.55)' }}
            >
              <span className="text-[9px] uppercase tracking-widest text-bone/85 bg-void/80 px-1.5 py-0.5 rounded">
                {onCd ? 'Cooldown' : notCharged ? 'Locked' : 'No resource'}
              </span>
            </div>
          )}
          {/* Pending confirm hint */}
          {pending && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
              <span className="text-[9px] uppercase tracking-widest text-gold bg-void/90 px-1.5 py-0.5 rounded animate-pulse">
                Tap to confirm
              </span>
            </div>
          )}
        </>
      )}
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
