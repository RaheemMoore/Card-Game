import type { Card } from '../../types/card';
import type { BattleState, PlayerAction } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { ARENA_MANIFEST, DEFAULT_ARENA_ID } from '../../data/combat/arenaManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { BossHUDOverlay } from './BossHUDOverlay';
import { BossStage } from './BossStage';
import { HeroForeground } from './HeroForeground';
import { AbilityCommandBar } from './AbilityCommandBar';
import { BattleControls } from './BattleControls';
import { FantasyPanel } from './FantasyPanel';

interface Props {
  state: BattleState;
  actingActorId: string | null;
  partyCards: Card[];
  currentBeat: AnimationBeat | null;
  onSubmit: (action: PlayerAction) => void;
  onExit: () => void;
}

/**
 * The Arena scene — one continuous visual surface, not a stack of panels.
 * Arena background fills the whole column; boss + HUD + heroes + abilities
 * layer directly into it via absolute positioning.
 */
export function CombatScene({
  state,
  actingActorId,
  partyCards,
  currentBeat,
  onSubmit,
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
      {/* Layer 2 — subtle atmosphere: darken upper HUD zone + bottom foreground for legibility */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,3,8,0.55) 0%, rgba(5,3,8,0.1) 22%, rgba(5,3,8,0) 55%, rgba(5,3,8,0.35) 82%, rgba(5,3,8,0.75) 100%)',
        }}
      />

      {/* Layer 3 — Boss HUD (upper-left overlay) */}
      <BossHUDOverlay boss={boss} intent={boss.currentIntent} currentBeat={currentBeat} state={state} />

      {/* Turn pill — upper-right, matches HUD frame language */}
      <TurnPill round={state.round} />

      {/* Layer 4 — Boss stage (center-upper of arena) */}
      <BossStage boss={boss} currentBeat={currentBeat} />

      {/* Layer 5 — Hero foreground (bottom-anchored) */}
      <HeroForeground
        heroes={state.heroes}
        partyCards={partyCards}
        actingActorId={actingHero.actorId}
        canAct={canAct}
        currentBeat={currentBeat}
      />

      {/* Command shelf — visually unifies abilities + controls into one
          bottom band. Individual widgets remain absolute-positioned within
          the scene; this gradient just ties them together. */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '11rem',
          background:
            'linear-gradient(to top, rgba(3,2,6,0.95) 0%, rgba(3,2,6,0.85) 45%, rgba(3,2,6,0.45) 80%, rgba(3,2,6,0) 100%)',
          zIndex: 15,
        }}
        aria-hidden
      />

      {/* Layer 6 — Ability command bar (docked lower-mid) */}
      <AbilityCommandBar
        hero={actingHero}
        bossActorId={boss.actorId}
        disabled={!canAct}
        onSubmit={onSubmit}
      />

      {/* Layer 7 — Battle controls (Leave / auxiliary + END TURN) */}
      <BattleControls onExit={onExit} onSubmit={onSubmit} canAct={canAct} />
    </div>
  );
}

function TurnPill({ round }: { round: number }) {
  return (
    <div className="absolute top-3 right-3 z-30">
      <FantasyPanel ornaments={false} className="rounded-md">
        <div className="px-3 py-1.5 flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-bone/60 font-fantasy">
            Turn
          </span>
          <span className="text-sm font-fantasy text-gold tabular-nums">{round}</span>
          <span aria-hidden className="text-orange-400 text-xs">🜂</span>
        </div>
      </FantasyPanel>
    </div>
  );
}
