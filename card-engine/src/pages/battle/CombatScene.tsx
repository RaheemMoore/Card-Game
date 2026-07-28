import { useEffect, useState } from 'react';
import type { Card } from '../../types/card';
import type { BattleState, PlayerAction } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { ARENA_MANIFEST, DEFAULT_ARENA_ID } from '../../data/combat/arenaManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { targetRuleNeedsPlayerPick } from '../../services/combat/targeting';
import { BossHUDOverlay } from './BossHUDOverlay';
import { BossStage } from './BossStage';
import { HeroForeground } from './HeroForeground';
import { AbilityCommandBar } from './AbilityCommandBar';
import { BattleControls } from './BattleControls';
import { AttackVFX } from './AttackVFX';
import { EnergyGauge } from './EnergyGauge';
import { CombatGuideModal } from './CombatGuideModal';
import { PaintedPanel } from './PaintedPanel';

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
 * unframed; a family of painted 9-slice panels (see PaintedPanel.tsx) creates
 * the visual shell around it: Boss HUD, Turn Badge, Combat Journal, and the
 * full-width Command Shelf all share one ring + filigree-corner treatment.
 * The CSS-drawn CombatFrame primitive these grew out of is now mobile-only.
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

  // The boss's in-flight action name, shown as a caption on the command shelf
  // while its turn plays out. (Was the Turn Badge's second line; the badge is
  // gone — round/timeout moved to the journal header, and this moved next to
  // End Turn where the player is already looking.)
  //
  // Keyed off the PRESENTATION beat, not `state.phase`. The reducer resolves
  // the boss synchronously inside the same click that ends the party turn, so
  // `phase` never observably leaves `awaiting_player_action` — the old badge's
  // `RESOLVE · …` line was effectively dead for that reason. The animation
  // queue is the real "boss is acting, wait" window.
  const resolvingIntentName = (() => {
    const beat = currentBeat;
    if (!beat) return null;
    const e = beat.event;
    const isBossBeat =
      e.kind === 'boss_intent_declared' ||
      (e.kind === 'damage_dealt' && e.sourceActorId === boss.actorId);
    if (!isBossBeat) return null;
    const actionId =
      e.kind === 'boss_intent_declared' ? e.intent.actionId : boss.currentIntent?.actionId;
    if (!actionId) return null;
    for (const phase of boss.snapshot.phases) {
      const action = phase.actions.find((a) => a.id === actionId);
      if (action) return action.displayName;
    }
    return null;
  })();
  const [guideOpen, setGuideOpen] = useState(false);

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

      {/* Layer 3 — Boss HUD (upper-left) — CombatFrame/BossHUD. The attached
          Intent panel was removed; boss-intent detail now lives solely in the
          Combat Journal corner box (see CombatJournalRail.tsx). */}
      <BossHUDOverlay boss={boss} currentBeat={currentBeat} />


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

      {/* Command Shelf — ONE composed panel (real painted 9-slice frame,
          see PaintedPanel.tsx) with three internal zones sharing a single
          outer boundary: energy | abilities | utility+end-turn. Previously
          five independently-bordered siblings sitting on top of each other
          in the same band — that's what caused the "edges smear together"
          mess. Ability slots get a heavier border-width than this outer
          frame (see AbilityCommandBar.tsx) so they read as the dominant,
          most-important element, not the empty background box. */}
      <PaintedPanel
        className="absolute inset-x-0 bottom-0 flex items-center gap-5 px-6"
        style={{ height: '9.5rem', zIndex: 15, boxShadow: '0px -8px 24px rgba(0,0,0,0.55)' }}
        borderWidth={10}
        background="#060708"
      >
        {/* Zone 1 — energy counter, height-matched to the ability slot row.
            Pinned left; the shelf is now full-viewport-width, so each zone
            has to hold its own edge or the contents island in the middle. */}
        <div className="flex items-center" style={{ height: 72, flex: '0 0 auto' }}>
          <EnergyGauge
            actorId={actingHero.actorId}
            current={actingHero.resource}
            max={actingHero.snapshot.maxResource}
            resourceLabel={actingHero.snapshot.resourceType === 'tech' ? 'TECH' : 'MANA'}
            currentBeat={currentBeat}
          />
        </div>

        {/* Seam — thin inset rule, same language BattleControls already uses
            between its tray and End Turn, so the wider shelf reads as three
            deliberate bays rather than one empty room. */}
        <ShelfSeam />

        {/* Zone 2 — ability slots, centered in the remaining space */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <AbilityCommandBar
            hero={actingHero}
            disabled={!canAct}
            state={state}
            pendingId={pendingAbilityId}
            onArm={armAbility}
            pickedTargetActorId={pickedTargetActorId}
            onSubmit={onSubmit}
          />
        </div>

        <ShelfSeam />

        {/* Zone 3 — utility tray + End Turn, pinned right */}
        <BattleControls
          onExit={onExit}
          onSubmit={onSubmit}
          canAct={canAct}
          pendingCount={state.pendingActorIds.length}
          resolvingIntentName={resolvingIntentName}
          onOpenGuide={() => setGuideOpen(true)}
        />
      </PaintedPanel>

      {guideOpen && <CombatGuideModal onClose={() => setGuideOpen(false)} />}
    </div>
  );
}

/** Vertical hairline between command-shelf zones — same rule BattleControls
 *  uses internally, so the shelf's seams all read as one system. */
function ShelfSeam() {
  return (
    <div
      aria-hidden
      style={{ flex: '0 0 auto', width: 1, height: 72, background: 'rgba(128,79,33,0.5)' }}
    />
  );
}
