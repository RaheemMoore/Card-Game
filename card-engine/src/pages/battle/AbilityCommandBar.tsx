import { useEffect, useMemo, useState } from 'react';
import type { HeroCombatant, AbilityCombatSnapshot } from '../../types/combat';
import type { AbilitySlotType } from '../../types/abilities';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';
import { PaintedPanel } from './PaintedPanel';

interface Props {
  hero: HeroCombatant;
  disabled: boolean;
  /** Controlled — CombatScene owns this so HeroForeground's target-pick mode
   *  can be driven from the same source of truth. */
  pendingId: string | null;
  onArm: (definitionId: string | null) => void;
  /** Hover preview — CombatScene forwards this into the Ability Codex panel
   *  so hovering a slot previews the ability without arming it. */
  onHoverAbility: (ability: AbilityCombatSnapshot | null) => void;
}

const SLOT_ORDER: AbilitySlotType[] = ['core', 'signature', 'ultimate'];
const SLOT_LABEL: Record<AbilitySlotType, string> = {
  core: 'CORE',
  signature: 'SIGNATURE',
  ultimate: 'ULTIMATE',
};

/**
 * Ability Command Bar — three fixed slots, 170×72, rendered through
 * `PaintedPanel.tsx`'s painted 9-slice frame. Selected state is driven by
 * `pending` (border width, lift, glow) rather than a preset swap.
 *
 * The armed-ability preview + Confirm/Cancel used to expand as a popover
 * above the clicked slot; that content now lives in the persistent
 * AbilityCodexPanel (a shelf zone of its own) so it never occludes the
 * arena and stays visible even while just hovering, not arming.
 */
export function AbilityCommandBar({ hero, disabled, pendingId, onArm, onHoverAbility }: Props) {
  const store = getAbilityStore();

  useEffect(() => {
    if (!pendingId) return;
    const a = hero.snapshot.abilities.find((x) => x.definitionId === pendingId);
    if (!a || isDenied(hero, a, disabled)) onArm(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero, disabled, pendingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onArm(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="relative" style={{ zIndex: 25 }}>
      <div
        className={`flex items-center transition-opacity duration-200 ${
          disabled ? 'opacity-45' : 'opacity-100'
        }`}
        style={{ gap: 'clamp(10px, 2.2vw, 24px)' }}
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
              onArm(pendingId === ability.definitionId ? null : ability.definitionId);
            }}
            onHover={(hovered) => onHoverAbility(hovered ? ability ?? null : null)}
          />
        ))}
      </div>
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
  onHover,
  artUrl,
}: {
  slot: AbilitySlotType;
  ability: AbilityCombatSnapshot | undefined;
  hero: HeroCombatant;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  artUrl: string | null;
}) {
  const empty = !ability;
  const cooldownEntry = !empty
    ? hero.cooldowns.find((c) => c.abilityDefinitionId === ability!.definitionId)
    : undefined;
  const onCd = cooldownEntry !== undefined;
  const short = !empty && hero.resource < ability!.resourceCost;
  const notCharged = !empty && ability!.slot === 'ultimate' && hero.ultimateCharge < 100;
  const denied = disabled || onCd || short || notCharged || empty;
  const [hovered, setHovered] = useState(false);

  const nameColor = pending ? '#ebd9b2' : '#e8d6b2';

  const statusText = empty
    ? 'EMPTY'
    : onCd
    ? `COOLDOWN (${cooldownEntry!.remainingRounds})`
    : short
    ? 'NO RESOURCE'
    : notCharged
    ? 'LOCKED'
    : 'READY';
  const statusColor =
    statusText === 'READY' ? '#8ab87d' : statusText === 'LOCKED' ? '#c88a45' : '#b06062';
  const slotBadge = { core: 'C', signature: 'S', ultimate: 'U' }[slot];

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => {
        setHovered(true);
        if (!empty) onHover(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHover(false);
      }}
      onFocus={() => {
        if (!empty) onHover(true);
      }}
      onBlur={() => onHover(false)}
      disabled={denied}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: denied ? 'not-allowed' : 'pointer' }}
      aria-label={
        empty
          ? `${SLOT_LABEL[slot]} slot — empty`
          : `${SLOT_LABEL[slot]}: ${ability!.displayName}${pending ? ' — selected, use the ability panel to confirm or cancel' : notCharged ? ' — locked' : denied ? ` — unavailable: ${statusText}` : ''}`
      }
    >
      {/* Thinner border (was 14/18px — too heavy for a 170×72 tile, it was
          visually eating into the icon/text area) and a flex layout instead
          of hand-tuned absolute offsets, so content can never sit under the
          painted ring or spill past the tile regardless of border width. */}
      <PaintedPanel
        borderWidth={pending ? 10 : hovered && !denied ? 8 : 7}
        background={pending ? '#1b1108' : '#100c08'}
        style={{
          width: 'clamp(112px, 16vw, 170px)',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 10px',
          transform: pending ? 'translateY(-3px)' : 'translateY(0)',
          transition: 'transform 200ms, border-width 150ms, box-shadow 150ms',
          filter: empty
            ? 'grayscale(0.6) brightness(0.7)'
            : denied
            ? 'brightness(0.75) saturate(0.7)'
            : 'none',
          boxShadow: pending
            ? '0 0 18px rgba(235,150,46,0.5)'
            : hovered && !denied
            ? '0 0 12px rgba(235,150,46,0.35)'
            : !denied
            ? '0 0 8px rgba(194,120,38,0.22)'
            : 'none',
        }}
      >
        {/* Icon tile — fixed size, own dark frame, sits fully inside the
            padded interior so it never overlaps the border ring. Slot type
            and cost live here as small badges instead of a third text row,
            which is what was cramming/overflowing the text column before. */}
        <div aria-hidden style={{ position: 'relative', flex: '0 0 auto', width: 42, height: 42 }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 5,
              overflow: 'hidden',
              background: '#1a1210',
              border: '1px solid #7a5530',
              // Icon dims on its own opacity, not only the tile-wide filter —
              // "do not rely on color alone" means the shape/brightness change
              // has to read even if the amber/gray hue shift doesn't.
              opacity: denied && !empty ? 0.5 : 1,
            }}
          >
            {artUrl ? (
              <img
                src={artUrl}
                alt=""
                draggable={false}
                aria-hidden
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3a2612 0%, #1a1210 100%)' }} />
            )}
          </div>
          {/* Locked overlay — a real padlock glyph over the icon, not just a
              text label, so "locked" reads as a distinct blocked state at a
              glance rather than a dimmer flavor of "unavailable." */}
          {notCharged && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 5,
                background: 'rgba(10,6,3,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              🔒
            </div>
          )}
          {/* Slot-type tag */}
          <div
            style={{
              position: 'absolute',
              top: -6,
              left: -6,
              width: 15,
              height: 15,
              borderRadius: '50%',
              background: '#2c1c10',
              border: '1px solid #c9a15a',
              color: '#e8d6b2',
              fontSize: 8,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {slotBadge}
          </div>
          {/* Cooldown badge — shape-based signal (a distinct amber ring with
              the round count) instead of leaving cooldown to the status text
              and color shift alone. */}
          {onCd && (
            <div
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: '#2c1c0c',
                border: '1px solid #b5792a',
                color: '#f0c07a',
                fontSize: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cooldownEntry!.remainingRounds}
            </div>
          )}
          {/* Cost pip */}
          {!empty && ability!.resourceCost > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                minWidth: 15,
                height: 15,
                padding: '0 3px',
                borderRadius: 8,
                background: '#0f2b3a',
                border: '1px solid #4fa8c9',
                color: '#bfe6f5',
                fontSize: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {ability!.resourceCost}
            </div>
          )}
        </div>

        {/* Text column — name + status only. Flex, not absolute-positioned,
            so it can't spill past the tile no matter how long the name is. */}
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div
            style={{
              color: nameColor,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {ability?.displayName ?? '—'}
          </div>
          <div
            style={{
              color: statusColor,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.6,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {pending ? 'SELECTED' : statusText}
          </div>
        </div>
      </PaintedPanel>
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
