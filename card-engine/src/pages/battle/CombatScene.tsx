import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import type { AbilityCombatSnapshot, BattleState, HeroCombatant, PlayerAction } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import type { MotionLevel } from '../../vfx/types';
import { resolveArenaFor, resolveGroundTint } from '../../data/combat/arenaManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { targetRuleNeedsPlayerPick, resolveTargetRule } from '../../services/combat/targeting';
import { previewAbilityDamage } from '../../services/combat/reducer';
import { getAbilityStore } from '../../services/abilities/registry';
import { getArtCrops } from '../../types/abilities';
import { displayNameFor } from './journalNames';
import { BossHUDOverlay } from './BossHUDOverlay';
import { BossStage } from './BossStage';
import { ArenaShakeLayer } from './ArenaShakeLayer';
import { ArenaAmbience } from './ArenaAmbience';
import { ImpactFlash } from './ImpactFlash';
import { HeroSpriteLayer } from './HeroSpriteLayer';
import { PartyDock, computePartyDockWidth } from './PartyDock';
import { useViewportWidth } from './useViewportWidth';
import { AbilityCommandBar } from './AbilityCommandBar';
import { AbilityCodexPanel } from './AbilityCodexPanel';
import { BattleControls } from './BattleControls';
import { AttackVFX } from './AttackVFX';
import { CombatGuideModal } from './CombatGuideModal';
import { PaintedPanel } from './PaintedPanel';
import { CardSheet } from '../../components/CardSheet';
import { buildBattleCardSheetAbilities, buildBattleLiveState } from './cardSheetAdapters';

interface Props {
  state: BattleState;
  actingActorId: string | null;
  partyCards: Card[];
  currentBeat: AnimationBeat | null;
  motionLevel: MotionLevel;
  onChangeMotionLevel: (next: MotionLevel) => void;
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
 *
 * The party's card identity lives in the docked PartyDock, anchored to the
 * shelf's bottom-left corner. The card art rises above the shelf's own top
 * edge into the arena (a hand of cards peeking up from behind the frame) —
 * only the HP/MP/ultimate readout underneath stays inside the shelf band.
 * A separate HeroSpriteLayer stands in the arena floor band above the
 * shelf as the actual combat-reactive presence (shake/lunge/floating-damage/
 * shield-ring/low-HP tint/status pills) — it's purely presentational and
 * echoes the dock's acting/targetable state rather than owning any of it;
 * the dock cards remain the only click targets.
 */
export function CombatScene({
  state,
  actingActorId,
  partyCards,
  currentBeat,
  motionLevel,
  onChangeMotionLevel,
  onSubmit,
  onSelectActor,
  onExit,
}: Props) {
  const viewportWidth = useViewportWidth();
  const partyDockWidth = computePartyDockWidth(viewportWidth);

  const boss = state.boss;
  const arena = resolveArenaFor(boss.snapshot.arenaId);
  const arenaUrl = arena ? resolveCombatAssetUrl(arena) : null;
  const groundTint = resolveGroundTint(boss.snapshot.arenaId);
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

  // The ability preview panel is rendered as a SIBLING of the command shelf,
  // not a child of it — the shelf's own z-index makes it a stacking context,
  // which capped the panel below the hero sprites (z 21) no matter how high
  // its own z-index went, so the sprites drew straight over the preview text.
  // As a sibling it needs the ability zone's center reported up to it; the
  // zone's width is `flex-1` between the dock spacer and the intrinsically
  // sized controls, so it's measured rather than recomputed.
  const abilityZoneRef = useRef<HTMLDivElement>(null);
  const [abilityZoneCenterX, setAbilityZoneCenterX] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = abilityZoneRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setAbilityZoneCenterX(rect.left + rect.width / 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Armed-ability + target-pick state lives here (not inside AbilityCommandBar)
  // so PartyDock's target-pick mode can share the same source of truth.
  const [pendingAbilityId, setPendingAbilityId] = useState<string | null>(null);
  const [pickedTargetActorId, setPickedTargetActorId] = useState<string | null>(null);
  // Hover-preview state for the Ability Codex panel — cleared whenever
  // something is armed so the panel never shows two competing previews.
  const [hoveredAbility, setHoveredAbility] = useState<AbilityCombatSnapshot | null>(null);

  const armAbility = (definitionId: string | null) => {
    setPendingAbilityId(definitionId);
    setPickedTargetActorId(null);
  };

  // Switching acting hero (or losing the ability to a deny) clears any armed
  // pick — stale cross-hero state would be confusing, not helpful.
  useEffect(() => {
    setPendingAbilityId(null);
    setPickedTargetActorId(null);
    setHoveredAbility(null);
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

  const resolvedTargetIds: string[] | null = !pendingAbility
    ? null
    : needsTargetPick
    ? pickedTargetActorId
      ? [pickedTargetActorId]
      : null
    : resolveTargetRule(state, actingHero.actorId, pendingAbility.version.targetRule, []).targetActorIds;
  const targetName = resolvedTargetIds?.[0] ? displayNameFor(state, resolvedTargetIds[0]) : null;
  const projectedDamage = pendingAbility ? previewAbilityDamage(state, actingHero, pendingAbility) : null;
  const abilityStore = getAbilityStore();
  const pendingArtUrl = pendingAbility
    ? (() => {
        const art = abilityStore.getArtForAbility(pendingAbility.definitionId);
        return art ? getArtCrops(art).combat.url : null;
      })()
    : null;

  const [sheetHero, setSheetHero] = useState<{ card: Card; combatant: HeroCombatant } | null>(null);

  return (
    <div className="absolute inset-0">
      {/* Everything DIEGETIC lives inside the shake layer: the arena, its
          atmosphere, the boss, and the party. Chrome (shelf, dock, HUD,
          journal, preview) stays outside it and never moves — translating a
          viewport-anchored frame would open a gap at the screen edge and read
          as a broken render rather than as force. Note the wrapper's own
          z-index is load-bearing; see ArenaShakeLayer's docstring. */}
      <ArenaShakeLayer
        currentBeat={currentBeat}
        motionLevel={motionLevel}
        backdrop={<>
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
              `${groundTint.mid} 82%, ` +
              `${groundTint.low} 100%)`,
        }}
      />
      {/* Layer 3 — ambient life. A plate is a still image and always will be,
          so the motion goes here: embers rising off the arena's own ground
          fire. Zero generations, no extra assets. */}
      <ArenaAmbience motionLevel={motionLevel} />

        {/* Boss stage — inside the shake layer, so it is part of the world
            that moves rather than part of the frame that doesn't. */}
        <BossStage boss={boss} currentBeat={currentBeat} motionLevel={motionLevel} />

        </>}
        foreground={<>
        {/* Hero pixel sprites, standing in the arena floor band above the
            shelf. Purely presentational (see HeroSpriteLayer.tsx docstring) —
            echoes the dock's acting/targetable state, doesn't own it. */}
        <HeroSpriteLayer
          heroes={state.heroes}
          actingActorId={actingHero.actorId}
          canAct={canAct}
          currentBeat={currentBeat}
          targetPickMode={needsTargetPick ? { pickableActorIds } : null}
          motionLevel={motionLevel}
        />

        {/* Attack VFX (bolt + impact burst). Inside the wrapper so beams stay
            welded to the sprites they are anchored to — outside it, a heavy
            hit would shake the fighters out from under their own beam. */}
        <AttackVFX state={state} currentBeat={currentBeat} />
        </>}
      />

      {/* Impact flash — a SIBLING of the shake layer, at z 14, so it never
          translates and never touches the dock's card art. See its docstring:
          the placement is what lets the light read as coming from behind the
          fighters. */}
      <ImpactFlash state={state} currentBeat={currentBeat} motionLevel={motionLevel} />

      {/* Boss HUD (upper-left). Deliberately OUTSIDE the shake layer — it is
          chrome, and its own z-30 keeps it above the world (21) and the
          flash (14) so boss HP stays readable straight through an impact. */}
      <BossHUDOverlay boss={boss} currentBeat={currentBeat} />

      {/* Command Shelf — a real painted 9-slice frame (see PaintedPanel.tsx)
          holding just the ability bar + utility tray. Short on purpose: the
          party dock is a sibling layer (below) that rises above this
          frame's top edge, so it isn't sized to contain the cards. Zone
          widths/paddings are fluid (clamp()-driven) below ~1450px so
          nothing overlaps down to tablet-landscape widths. */}
      <PaintedPanel
        className="absolute inset-x-0 bottom-0 flex items-center"
        style={{ height: '8.5rem', zIndex: 15, boxShadow: '0px -8px 24px rgba(0,0,0,0.55)' }}
        borderWidth={10}
        background="#060708"
      >
        {/* Reserves the horizontal space the (absolutely-positioned) party
            dock occupies, so the ability bar/controls never sit under it.
            MUST use the same computePartyDockWidth() call PartyDock itself
            uses — that's the single source of truth keeping the two in
            sync (see PartyDock.tsx docstring). */}
        <div aria-hidden style={{ flex: `0 0 ${partyDockWidth}px` }} />

        <ShelfSeam />

        {/* Ability slots. The explanation popover floats above this zone but
            is rendered outside the shelf entirely (see abilityZoneRef) so the
            hero sprites can't paint over it. */}
        <div
          ref={abilityZoneRef}
          className="relative flex-1 flex items-center justify-center min-w-0"
          style={{ height: '100%', paddingLeft: 'clamp(8px, 1.8vw, 24px)', paddingRight: 'clamp(8px, 1.8vw, 24px)' }}
        >
          <AbilityCommandBar
            hero={actingHero}
            disabled={!canAct}
            pendingId={pendingAbilityId}
            onArm={armAbility}
            onHoverAbility={setHoveredAbility}
          />
        </div>

        <ShelfSeam />

        {/* Utility tray + End Turn, pinned right */}
        <div style={{ paddingRight: 'clamp(8px, 1.8vw, 24px)' }}>
          <BattleControls
            onExit={onExit}
            onSubmit={onSubmit}
            canAct={canAct}
            pendingCount={state.pendingActorIds.length}
            resolvingIntentName={resolvingIntentName}
            motionLevel={motionLevel}
            onChangeMotionLevel={onChangeMotionLevel}
            onOpenGuide={() => setGuideOpen(true)}
          />
        </div>
      </PaintedPanel>

      {/* Party dock — a sibling of the shelf, not a child, so its card art
          can rise above the shelf's top edge into the arena without being
          clipped by the shelf's own box. */}
      <PartyDock
        heroes={state.heroes}
        partyCards={partyCards}
        actingActorId={actingHero.actorId}
        canAct={canAct}
        currentBeat={currentBeat}
        onSelectActor={onSelectActor}
        onOpenCard={(card, combatant) => setSheetHero({ card, combatant })}
        targetPickMode={
          needsTargetPick ? { pickableActorIds, onPick: setPickedTargetActorId } : null
        }
      />

      {/* Ability preview — a sibling of the shelf so it clears the hero
          sprites (z 21) and the party dock (z 20), horizontally centered on
          the shelf's ability zone via the measured center above. */}
      {(pendingAbility || hoveredAbility) && abilityZoneCenterX !== null && (
        <div
          className="absolute -translate-x-1/2"
          style={{
            left: abilityZoneCenterX,
            bottom: 'calc(8.5rem + 12px)',
            width: '100%',
            maxWidth: 340,
            zIndex: 35,
          }}
        >
          <AbilityCodexPanel
            hero={actingHero}
            pendingAbility={pendingAbility}
            pendingArtUrl={pendingArtUrl}
            projectedDamage={projectedDamage}
            targetName={targetName}
            needsTargetPick={needsTargetPick && !pickedTargetActorId}
            onConfirm={() => {
              if (!resolvedTargetIds || !pendingAbility) return;
              onSubmit({
                kind: 'ability',
                abilityDefinitionId: pendingAbility.definitionId,
                targetActorIds: resolvedTargetIds,
              });
              armAbility(null);
            }}
            onCancel={() => armAbility(null)}
            hoveredAbility={hoveredAbility}
          />
        </div>
      )}

      {guideOpen && <CombatGuideModal onClose={() => setGuideOpen(false)} />}

      {sheetHero && (
        <CardSheet
          card={sheetHero.card}
          abilities={buildBattleCardSheetAbilities(sheetHero.combatant)}
          liveState={buildBattleLiveState(sheetHero.combatant)}
          onClose={() => setSheetHero(null)}
        />
      )}
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
