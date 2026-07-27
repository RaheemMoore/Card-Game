import { useEffect, useState } from 'react';
import type { Card } from '../../types/card';
import type { BattleState, PlayerAction } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { ARENA_MANIFEST, DEFAULT_ARENA_ID } from '../../data/combat/arenaManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { TIMEOUT_ROUND_CAP } from '../../services/combat/reducer';
import { targetRuleNeedsPlayerPick } from '../../services/combat/targeting';
import { BossHUDOverlay } from './BossHUDOverlay';
import { BossStage } from './BossStage';
import { HeroForeground } from './HeroForeground';
import { AbilityCommandBar } from './AbilityCommandBar';
import { BattleControls } from './BattleControls';
import { CombatFrame } from './CombatFrame';
import { AttackVFX } from './AttackVFX';
import { EnergyGauge } from './EnergyGauge';

interface Props {
  state: BattleState;
  actingActorId: string | null;
  partyCards: Card[];
  currentBeat: AnimationBeat | null;
  onSubmit: (action: PlayerAction) => void;
  onSelectActor: (actorId: string) => void;
  onExit: () => void;
}

/**
 * The Arena scene — one continuous visual surface. The Arena itself remains
 * unframed; the shared CombatFrame family (BossHUD, Intent, Journal, Turn
 * Badge, Command Shelf, Utility Tray, Ability Slot) creates the visual shell
 * around it — Figma spec 22:36.
 */
export function CombatScene({
  state,
  actingActorId,
  partyCards,
  currentBeat,
  onSubmit,
  onSelectActor,
  onExit,
}: Props) {
  const arena = ARENA_MANIFEST[DEFAULT_ARENA_ID];
  const arenaUrl = arena ? resolveCombatAssetUrl(arena) : null;

  const boss = state.boss;
  const actingHero =
    (actingActorId ? state.heroes.find((h) => h.actorId === actingActorId) : null) ??
    state.heroes.find((h) => !h.defeated) ??
    state.heroes[0];
  const canAct = state.phase === 'awaiting_player_action';

  // Armed-ability + target-pick state lives here (not inside AbilityCommandBar)
  // so HeroForeground's target-pick mode can share the same source of truth.
  const [pendingAbilityId, setPendingAbilityId] = useState<string | null>(null);
  const [pickedTargetActorId, setPickedTargetActorId] = useState<string | null>(null);

  const armAbility = (definitionId: string | null) => {
    setPendingAbilityId(definitionId);
    setPickedTargetActorId(null);
  };

  // Switching acting hero (or losing the ability to a deny) clears any armed
  // pick — stale cross-hero state would be confusing, not helpful.
  useEffect(() => {
    setPendingAbilityId(null);
    setPickedTargetActorId(null);
  }, [actingHero.actorId]);

  const pendingAbility = pendingAbilityId
    ? actingHero.snapshot.abilities.find((a) => a.definitionId === pendingAbilityId) ?? null
    : null;
  const needsTargetPick = pendingAbility
    ? targetRuleNeedsPlayerPick(pendingAbility.version.targetRule) &&
      state.heroes.some((h) => !h.defeated && h.actorId !== actingHero.actorId)
    : false;
  const pickableActorIds = state.heroes
    .filter((h) => !h.defeated && h.actorId !== actingHero.actorId)
    .map((h) => h.actorId);

  return (
    <div className="absolute inset-0">
      {/* Layer 1 — Arena background */}
      <div
        className="absolute inset-0"
        style={
          arenaUrl
            ? {
                backgroundImage: `url("${arenaUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: 'radial-gradient(ellipse at 50% 30%, #3a1c14 0%, #0a0508 70%)' }
        }
      />
      {/* Layer 2 — subtle atmosphere. Top stays cool-dark for HUD legibility;
          bottom biases warm ember to match the pixel arena's lava veins so
          the foreground reads as illuminated by the arena, not fading to
          neutral black. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, ' +
              'rgba(5,3,8,0.55) 0%, ' +
              'rgba(5,3,8,0.10) 22%, ' +
              'rgba(5,3,8,0.00) 55%, ' +
              'rgba(60,18,8,0.30) 82%, ' +
              'rgba(80,20,10,0.60) 100%)',
        }}
      />

      {/* Layer 3 — Boss HUD (upper-left) — CombatFrame/BossHUD + Intent */}
      <BossHUDOverlay
        boss={boss}
        intent={boss.currentIntent}
        currentBeat={currentBeat}
        state={state}
      />

      {/* Turn Badge (upper-right) — CombatFrame/TurnBadge preset */}
      <div className="absolute top-3 right-3 z-30">
        <CombatFrame preset="turnBadge" style={{ width: 142, height: 66 }}>
          {/* Diamond gem accent — Figma 20:49 */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 12.5,
              top: 0.5,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ transform: 'rotate(-45deg)', width: 20, height: 20 }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: '100%', height: '100%' }}>
                <path d="M19 10L10 19L1 10L10 1L19 10Z" fill="#a86a2a" stroke="#f2ab47" strokeWidth="1" />
                <text x="10" y="13.5" textAnchor="middle" fontSize="10" fill="#faeaca" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700 }}>
                  🜂
                </text>
              </svg>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 46.5,
              top: 11.5,
              color: '#ebd6b0',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 1.2,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            TURN {state.round}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 47.5,
              top: 31.5,
              color: '#9c805c',
              fontSize: 8,
              letterSpacing: 1.28,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            {canAct ? 'PLAYER' : 'RESOLVE'}
          </div>
          {/* Rounds-remaining — the 30-round timeout is otherwise invisible
              to the player; turns amber inside the last 5 rounds. */}
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              top: 47,
              color: TIMEOUT_ROUND_CAP - state.round <= 5 ? '#e6a04a' : '#7a6a52',
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: 0.8,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
            aria-label={`${Math.max(0, TIMEOUT_ROUND_CAP - state.round)} rounds remaining before timeout defeat`}
          >
            {Math.max(0, TIMEOUT_ROUND_CAP - state.round)} ROUNDS LEFT
          </div>
        </CombatFrame>
      </div>

      {/* Layer 4 — Boss stage */}
      <BossStage boss={boss} currentBeat={currentBeat} />

      {/* Layer 5 — Hero foreground */}
      <HeroForeground
        heroes={state.heroes}
        partyCards={partyCards}
        actingActorId={actingHero.actorId}
        canAct={canAct}
        currentBeat={currentBeat}
        onSelectActor={onSelectActor}
        targetPickMode={
          needsTargetPick ? { pickableActorIds, onPick: setPickedTargetActorId } : null
        }
      />

      {/* Layer 6 — Attack VFX (bolt/zap + impact burst on hit) */}
      <AttackVFX state={state} currentBeat={currentBeat} />

      {/* Command Shelf — CombatFrame/CommandShelf preset. Spans the bottom
          and hosts the Ability Command Bar + BattleControls. */}
      <div
        className="absolute inset-x-2 bottom-2"
        style={{ height: '9.5rem', zIndex: 15, pointerEvents: 'none' }}
      >
        <CombatFrame preset="commandShelf" className="h-full w-full">
          <></>
        </CombatFrame>
      </div>

      {/* Energy counter (inside shelf, left of the ability bar) — the acting
          hero's resource. Intrinsically sized (no fixed width) so it can
          never overlap the centered ability bar, unlike the old wide gauge.
          Height-matched + vertically centered against the ability slot row. */}
      <div
        className="absolute left-6 sm:left-10 lg:left-16 flex items-center"
        style={{ bottom: '5.75rem', height: 72, zIndex: 24 }}
      >
        <EnergyGauge
          actorId={actingHero.actorId}
          current={actingHero.resource}
          max={actingHero.snapshot.maxResource}
          resourceLabel={actingHero.snapshot.resourceType === 'tech' ? 'TECH' : 'MANA'}
          currentBeat={currentBeat}
        />
      </div>

      {/* Ability command bar (inside shelf) */}
      <AbilityCommandBar
        hero={actingHero}
        disabled={!canAct}
        state={state}
        pendingId={pendingAbilityId}
        onArm={armAbility}
        pickedTargetActorId={pickedTargetActorId}
        onSubmit={onSubmit}
      />

      {/* Battle controls (inside shelf). pendingCount = heroes still owing a
          command this round; End Party Turn cycles through them in one click. */}
      <BattleControls
        onExit={onExit}
        onSubmit={onSubmit}
        canAct={canAct}
        pendingCount={state.pendingActorIds.length}
      />
    </div>
  );
}
