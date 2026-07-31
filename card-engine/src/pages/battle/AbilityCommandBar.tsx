import { useEffect, useMemo, useState } from 'react';
import type { HeroCombatant, AbilityCombatSnapshot } from '../../types/combat';
import type { AbilitySlotType } from '../../types/abilities';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';
import { AbilityCommandStrip } from '../../components/abilities';
import { PaintedPanel } from './PaintedPanel';
import type { AbilityCommandState, AbilityTier } from '../../components/abilities/types';

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
 * Ability Command Bar — ONE framed button that opens the hero's ability list.
 *
 * ── Why a button and not a row of tiles ──────────────────────────────────
 * This was three large tiles side by side: the widest, heaviest thing on the
 * command shelf, while the hero CARDS — which are the characters — were the
 * smallest thing on screen. The shelf is now cards-centre / abilities-left,
 * and abilities pay for that in room.
 *
 * A stacked list was tried first and rejected on sight: three rows crammed
 * into the shelf read as a debug dump, and growing the shelf to fit them
 * wrecked the frame's proportions. So the resting state is a single control
 * wearing the SAME `PaintedPanel` treatment the old tiles had, and the detail
 * opens upward over the arena. The shelf's height never changes.
 *
 * The list rows are `components/abilities/AbilityCommandStrip`, the
 * Figma-canonical (node 11:143) row that already existed and that
 * `CodexFamily` already stacks. Battle used to re-implement the same control
 * with its own tile, its own state ladder, and private copies of
 * `isDenied`/`artUrl` — so a state added to the canonical component never
 * reached combat, and vice versa.
 *
 * The armed-ability preview + Confirm/Cancel still live in the persistent
 * AbilityCodexPanel, which is why the rows here carry a status line rather
 * than a full description.
 */
export function AbilityCommandBar({ hero, disabled, pendingId, onArm, onHoverAbility }: Props) {
  const store = getAbilityStore();
  /** Resting state is the slim list; expanding lifts a fuller list above the
   *  shelf. Collapsed by default so a turn costs no extra click. */
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!pendingId) return;
    const a = hero.snapshot.abilities.find((x) => x.definitionId === pendingId);
    if (!a || isDenied(hero, a, disabled)) onArm(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero, disabled, pendingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape already cancelled an armed ability; it now also closes the
      // expanded list, which is the convention every other disclosure in the
      // battle UI follows.
      onArm(null);
      setExpanded(false);
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

  const rows = () =>
    slots.map(({ slot, ability }) => (
      <AbilityRow
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
    ));

  const armed = pendingId
    ? hero.snapshot.abilities.find((a) => a.definitionId === pendingId) ?? null
    : null;
  const readyCount = hero.snapshot.abilities.filter((a) => !isDenied(hero, a, disabled)).length;
  const armedArt = armed ? artUrl(store, armed) : null;

  return (
    <div
      className={`relative flex items-center transition-opacity duration-200 ${
        disabled ? 'opacity-45' : 'opacity-100'
      }`}
      aria-label="Ability command bar"
      aria-hidden={disabled}
    >
      {/*
        The LIST — an overlay that opens UPWARD out of the shelf rather than
        making the shelf taller. The shelf height is fixed; stretching it to
        fit a list wrecked the frame's proportions.

        Rendered inside the (relative) ability zone rather than as a sibling of
        the shelf: it only has to clear the shelf's own chrome, and the zone is
        on the far left while the dock is centred, so there is nothing above it
        for it to occlude.
      */}
      {expanded && (
        <>
          {/* Click-away. Covers the viewport beneath the panel so choosing
              "not this" costs one click anywhere, which is how every other
              disclosure in this UI behaves. */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 4 }}
            onClick={() => setExpanded(false)}
            aria-hidden
          />
          <div
            id="ability-expanded-list"
            role="dialog"
            aria-label="Abilities"
            className="absolute flex flex-col"
            style={{
              left: 0,
              // Wider than the trigger. The explanations are the point of
              // opening this, and they do not fit the button's width.
              width: 'clamp(300px, 30vw, 380px)',
              bottom: 'calc(100% + 10px)',
              gap: 6,
              zIndex: 5,
              // Opaque backing — this floats over the arena, and the strips are
              // translucent enough that lava read straight through them.
              background: 'rgba(6,7,8,0.94)',
              border: '1px solid rgba(128,79,33,0.55)',
              borderRadius: 8,
              padding: 8,
              boxShadow: '0 -8px 24px rgba(0,0,0,0.7)',
            }}
          >
            {rows()}
          </div>
        </>
      )}

      {/* The trigger — ONE painted frame, the same treatment the three ability
          tiles used to have. Three stacked rows crammed into the shelf looked
          like a debug list; a single framed control reads as part of the
          chrome, and the detail lives behind a click. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="ability-expanded-list"
        aria-haspopup="dialog"
        aria-label={
          armed
            ? `Abilities — ${armed.displayName} selected. Opens the ability list.`
            : `Abilities — ${readyCount} ready. Opens the ability list.`
        }
        onClick={() => setExpanded((v) => !v)}
        disabled={disabled}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <PaintedPanel
          borderWidth={expanded || armed ? 10 : 7}
          background={armed ? '#1b1108' : '#100c08'}
          corners={false}
          style={{
            width: 'clamp(150px, 15vw, 200px)',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 10px',
            // A non-`none` transform is what gives PaintedPanel's absolutely
            // positioned hairline and corners a containing block — it sets no
            // `position` of its own by design. Same trick the old tiles used.
            transform: expanded ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'transform 180ms, border-width 150ms, box-shadow 150ms',
            boxShadow: armed
              ? '0 0 18px rgba(235,150,46,0.5)'
              : expanded
                ? '0 0 12px rgba(235,150,46,0.35)'
                : '0 0 8px rgba(194,120,38,0.22)',
          }}
        >
          <span
            aria-hidden
            style={{
              flex: '0 0 auto',
              width: 34,
              height: 34,
              borderRadius: 5,
              border: '1px solid #7a5530',
              overflow: 'hidden',
              display: 'block',
              background: 'linear-gradient(135deg, #3a2612 0%, #1a1210 100%)',
            }}
          >
            {armedArt && (
              <img
                src={armedArt}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </span>

          <span className="flex flex-col items-start" style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 13,
                color: '#e8d6b2',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {armed ? armed.displayName : 'Abilities'}
            </span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 1.2,
                color: armed ? '#eb962e' : readyCount > 0 ? '#8ab87d' : '#b06062',
              }}
            >
              {armed ? 'SELECTED' : `${readyCount} READY`}
            </span>
          </span>

          <span
            aria-hidden
            style={{
              flex: '0 0 auto',
              fontSize: 10,
              color: '#c9884a',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 180ms',
            }}
          >
            ▲
          </span>
        </PaintedPanel>
      </button>
    </div>
  );
}

function AbilityRow({
  slot,
  ability,
  hero,
  disabled,
  pending,
  onClick,
  onHover,
  artUrl: art,
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
  const [hovered, setHovered] = useState(false);
  const empty = !ability;
  const cooldownEntry = !empty
    ? hero.cooldowns.find((c) => c.abilityDefinitionId === ability!.definitionId)
    : undefined;
  const onCd = cooldownEntry !== undefined;
  const short = !empty && hero.resource < ability!.resourceCost;
  const notCharged = !empty && ability!.slot === 'ultimate' && hero.ultimateCharge < 100;
  const denied = disabled || onCd || short || notCharged || empty;

  // Map combat state onto the canonical strip's state machine. `cooldown` is
  // its own surface in the Figma matrix, distinct from plain `disabled`, so a
  // recharging ability does not read the same as one you simply cannot afford.
  const state: AbilityCommandState = pending
    ? 'selected'
    : onCd
      ? 'cooldown'
      : denied
        ? 'disabled'
        : hovered
          ? 'hover'
          : 'ready';

  const statusText = empty
    ? 'EMPTY'
    : onCd
      ? `COOLDOWN (${cooldownEntry!.remainingRounds})`
      : short
        ? 'NO RESOURCE'
        : notCharged
          ? 'LOCKED'
          : 'READY';


  const label = empty
    ? `${SLOT_LABEL[slot]} slot — empty`
    : `${SLOT_LABEL[slot]}: ${ability!.displayName}${
        pending
          ? ' — selected, use the ability panel to confirm or cancel'
          : notCharged
            ? ' — locked'
            : denied
              ? ` — unavailable: ${statusText}`
              : ''
      }`;

  return (
    <div aria-label={label} className="relative w-full">
      <AbilityCommandStrip
        size="compact"
        tier={slot as AbilityTier}
        state={empty ? 'disabled' : state}
        displayName={empty ? '—' : ability!.displayName}
        // Not rendered at compact density, but the prop is required and the
        // value is the honest one, so switching this list back to the full
        // strip needs no other change.
        effectText={empty ? 'Empty slot' : statusText}
        iconSlot={
          art ? (
            <img
              src={art}
              alt=""
              aria-hidden
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'rotate(45deg) scale(1.45)',
                opacity: denied ? 0.5 : 1,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #3a2612 0%, #1a1210 100%)',
              }}
            />
          )
        }
        resource={
          empty ? undefined : ability!.resourceType === 'mana' ? 'mana' : 'tech'
        }
        resourceCost={empty ? undefined : ability!.resourceCost}
        onActivate={onClick}
        onHoverChange={(h) => {
          setHovered(h);
          if (!empty) onHover(h);
        }}
      />
      {/*
        `AbilityCommandStateOverlay` is deliberately NOT used here.

        It is a full-bleed veil sized for the canonical 360×92 strip, and over a
        52px row it covered the icon and the ability's NAME — so a locked slot
        read as an anonymous "LOCKED" bar and the player could not tell which
        ability they were waiting on. The strip's own `disabled` / `cooldown`
        surfaces already tint the row, and the status line below the name spells
        the reason out in words, so the veil added a colour and removed the
        information.
      */}
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
