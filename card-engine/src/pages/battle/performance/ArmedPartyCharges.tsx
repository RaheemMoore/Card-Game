import { useEffect, useState } from 'react';
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
  partyChargeActive?: boolean;
}

/** Persistent, card-bound readiness tells for the plan-then-release round. */
export function ArmedPartyCharges({
  state,
  partyCards,
  plannedActions,
  motionLevel,
  resolvingActorId = null,
  partyChargeActive = false,
}: Props) {
  const viewportWidth = useViewportWidth();
  const [releaseThroughIndex, setReleaseThroughIndex] = useState(-1);

  useEffect(() => {
    if (Object.keys(plannedActions).length === 0) setReleaseThroughIndex(-1);
  }, [plannedActions]);

  useEffect(() => {
    if (!resolvingActorId) return;
    const index = state.heroes.findIndex((hero) => hero.actorId === resolvingActorId);
    if (index >= 0) setReleaseThroughIndex((current) => Math.max(current, index));
  }, [resolvingActorId, state.heroes]);

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
          : action.kind === 'wait'
            ? 'Wait'
          : action.kind === 'guard'
            ? 'Guard'
            : 'Focus';
    return [{ hero, index, material, charge, abilityName, waiting: action.kind === 'wait' }];
  });

  if (armed.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 24 }} aria-hidden>
      {armed.map(({ hero, index, material, charge, abilityName, waiting }) => {
        const at = resolveAnchor('caster_charge_lane', { viewportWidth, casterIndex: index });
        const releasing = resolvingActorId === hero.actorId;
        if (index <= releaseThroughIndex && !releasing) return null;
        return (
          <div key={hero.actorId}>
            {waiting ? (
              <div
                style={{
                  position: 'absolute',
                  left: `${at.x}%`,
                  top: `${at.y}%`,
                  width: 54,
                  height: 54,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  border: '2px solid rgba(185,170,145,0.72)',
                  background: 'radial-gradient(circle, rgba(65,59,51,0.72), rgba(7,7,8,0.92) 70%)',
                  color: '#d6c8b3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: '700 24px/1 Georgia, serif',
                  boxShadow: '0 0 16px rgba(185,170,145,0.2)',
                }}
              >
                ○
              </div>
            ) : (
              <ChargeTell
                at={at}
                kit={material}
                motionLevel={motionLevel}
                chargeMs={320}
                armed={!releasing}
                firing={releasing}
                flaring={releasing || partyChargeActive}
                art={
                  charge
                    ? {
                        src: performanceAssetUrl(charge),
                        sizePx: Math.round(charge.dimensions.width * 2.5),
                      }
                    : undefined
                }
                intensity="heavy"
                sizeMultiplier={2.75}
                zIndex={24}
              />
            )}
            <div
              style={{
                position: 'absolute',
                left: `${at.x}%`,
                top: `calc(${at.y}% + 42px)`,
                transform: 'translateX(-50%)',
                border: '1px solid rgba(235,150,46,0.78)',
                borderRadius: 999,
                background: 'rgba(8,5,8,0.9)',
                color: '#ffdb94',
                padding: '3px 6px',
                font: '700 9px/1 Inter, system-ui, sans-serif',
                letterSpacing: 0.7,
                whiteSpace: 'nowrap',
                boxShadow: '0 0 12px rgba(235,150,46,0.24)',
              }}
            >
              {index + 1} · {partyChargeActive ? 'CHARGING' : releasing ? 'RELEASING' : 'ARMED'} · {abilityName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
