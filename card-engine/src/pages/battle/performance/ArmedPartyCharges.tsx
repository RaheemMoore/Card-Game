import type { Card } from '../../../types/card';
import type { BattleState, PlayerAction } from '../../../types/combat';
import type { MotionLevel } from '../../../vfx/types';
import { resolveCurrentElement } from '../../../services/elementResolver';
import { materialKitFor } from '../../../data/combat/performance/materialKits';
import {
  assetAvailable,
  assetKitIdFor,
  getAssetKit,
  performanceAssetUrl,
} from '../../../data/combat/performance/assetKits';
import { resolveAnchor } from '../combatAnchors';
import { useViewportWidth } from '../useViewportWidth';
import { ChargeTell } from './ChargeTell';

interface Props {
  state: BattleState;
  partyCards: readonly Card[];
  plannedActions: Readonly<Record<string, PlayerAction>>;
  motionLevel: MotionLevel;
  resolvingActorId?: string | null;
}

/** Persistent, card-bound readiness tells for the plan-then-release round. */
export function ArmedPartyCharges({
  state,
  partyCards,
  plannedActions,
  motionLevel,
  resolvingActorId = null,
}: Props) {
  const viewportWidth = useViewportWidth();
  const armed = state.heroes.flatMap((hero, index) => {
    const action = plannedActions[hero.actorId];
    const card = partyCards[index];
    if (!action || !card || hero.defeated) return [];
    const element = resolveCurrentElement(card);
    const material = materialKitFor(element);
    const kit = getAssetKit(assetKitIdFor('lash', element));
    const charge = assetAvailable(kit?.charge) ? kit.charge : undefined;
    const abilityName =
      action.kind === 'ability'
        ? hero.snapshot.abilities.find((ability) => ability.definitionId === action.abilityDefinitionId)
            ?.displayName ?? 'Ability'
        : action.kind === 'strike'
          ? 'Strike'
          : action.kind === 'guard'
            ? 'Guard'
            : 'Focus';
    return [{ hero, index, material, charge, abilityName }];
  });

  if (armed.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 24 }} aria-hidden>
      {armed.map(({ hero, index, material, charge, abilityName }) => {
        const at = resolveAnchor('caster_card_front', { viewportWidth, casterIndex: index });
        const releasing = resolvingActorId === hero.actorId;
        return (
          <div key={hero.actorId}>
            <ChargeTell
              at={at}
              kit={material}
              motionLevel={motionLevel}
              chargeMs={320}
              armed={!releasing}
              firing={releasing}
              flaring={releasing}
              art={
                charge
                  ? {
                      src: performanceAssetUrl(charge),
                      sizePx: Math.round(charge.dimensions.width * 3.2),
                    }
                  : undefined
              }
              intensity="heavy"
              sizeMultiplier={4.5}
              zIndex={24}
            />
            <div
              style={{
                position: 'absolute',
                left: `${at.x}%`,
                top: `calc(${at.y}% + 54px)`,
                transform: 'translateX(-50%)',
                border: '1px solid rgba(235,150,46,0.78)',
                borderRadius: 999,
                background: 'rgba(8,5,8,0.9)',
                color: '#ffdb94',
                padding: '4px 9px',
                font: '700 10px/1 Inter, system-ui, sans-serif',
                letterSpacing: 0.7,
                whiteSpace: 'nowrap',
                boxShadow: '0 0 12px rgba(235,150,46,0.24)',
              }}
            >
              {index + 1} · {releasing ? 'RELEASING' : 'ARMED'} · {abilityName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
