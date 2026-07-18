import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllCards } from '../services/storage';
import { getAllBossDefinitions } from '../services/bosses/registry';
import { useBattle } from '../services/combat/useBattle';
import { getAbilityStore } from '../services/abilities/registry';
import {
  grantBattleReward,
  type BattleRewardOutcome,
  type GrantedItem,
} from '../services/combat/battleRewardService';
import type { Card } from '../types/card';
import type { HeroCombatant, BossCombatant, BattleState, PlayerAction } from '../types/combat';

/**
 * Boss battle page — B4 vertical slice.
 *
 * Two stages:
 *   1. Pick a hero card (must have at least one ability) and a boss.
 *   2. Encounter screen with boss art panel, hero panel, action bar,
 *      intent banner, and event log.
 *
 * No animations beyond the built-in Tailwind transitions and a CSS bob.
 * Boss art is a colored block placeholder (pixel-art asset lands in B7).
 */
export function Battle() {
  const [heroCard, setHeroCard] = useState<Card | null>(null);
  const [bossId, setBossId] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));

  const active = useMemo(
    () =>
      heroCard && bossId
        ? { heroCardId: heroCard.cardId, heroCard, bossId, seed }
        : null,
    [heroCard, bossId, seed],
  );
  const battle = useBattle(active);

  if (!heroCard || !bossId) {
    return <Picker onPick={(card, boss) => { setHeroCard(card); setBossId(boss); }} />;
  }

  return (
    <EncounterScreen
      state={battle.state}
      error={battle.error}
      onSubmit={battle.submit}
      onRestart={() => {
        setSeed(Math.floor(Math.random() * 1e9));
        battle.restart();
      }}
      onExit={() => {
        setHeroCard(null);
        setBossId(null);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Picker                                                             */
/* ------------------------------------------------------------------ */

function Picker({ onPick }: { onPick: (card: Card, bossId: string) => void }) {
  const cards = getAllCards();
  const bosses = getAllBossDefinitions().filter((b) => b.status === 'active');
  const abilityStore = getAbilityStore();

  const eligibleCards = useMemo(
    () => cards.filter((c) => abilityStore.getReferencesForCard(c.cardId).length > 0),
    [cards, abilityStore],
  );

  const [pickedCardId, setPickedCardId] = useState<string | null>(null);
  const [pickedBossId, setPickedBossId] = useState<string | null>(
    bosses[0]?.id ?? null,
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-fantasy text-3xl text-bone mb-2">Choose your hero</h1>
      <p className="text-sm text-bone/70 mb-6">
        Pick a forged card with at least one ability, then step into the boss battle.
      </p>

      {eligibleCards.length === 0 && (
        <div className="p-4 rounded border border-gold/30 bg-void/60 text-bone/80 text-sm mb-6">
          You don't have any battle-ready cards yet. Forge one first, or tier a card up so it earns its
          Core ability. <Link to="/forge" className="underline text-gold">Go to the Forge →</Link>
        </div>
      )}

      {eligibleCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {eligibleCards.map((c) => (
            <button
              key={c.cardId}
              onClick={() => setPickedCardId(c.cardId)}
              className={`rounded-md p-3 text-left border transition-colors ${
                pickedCardId === c.cardId
                  ? 'border-gold bg-gold/10 shadow-lg shadow-gold/20'
                  : 'border-bone/20 bg-void/40 hover:border-bone/40'
              }`}
            >
              <div className="text-sm font-fantasy text-bone truncate">{c.cardName}</div>
              <div className="text-[10px] text-bone/60 uppercase tracking-widest mt-1">{c.archetype}</div>
              <div className="mt-2 text-[11px] text-bone/70 flex gap-2">
                <span>ATK {c.stats.Atk.value}</span>
                <span>DEF {c.stats.Def.value}</span>
                <span>{c.stats.Mana ? `MANA ${c.stats.Mana.value}` : `TECH ${c.stats.Tech?.value}`}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <h2 className="font-fantasy text-xl text-bone mb-3">Choose your foe</h2>
      {bosses.length === 0 && (
        <div className="p-4 rounded border border-gold/30 bg-void/60 text-bone/80 text-sm">
          No active bosses in the library yet. Sign in as an admin, reload, and try again.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {bosses.map((b) => (
          <button
            key={b.id}
            onClick={() => setPickedBossId(b.id)}
            className={`rounded-md p-4 text-left border transition-colors ${
              pickedBossId === b.id
                ? 'border-crimson bg-crimson/10 shadow-lg shadow-crimson/20'
                : 'border-bone/20 bg-void/40 hover:border-bone/40'
            }`}
          >
            <div className="font-fantasy text-lg text-bone">{b.name}</div>
            <div className="text-[11px] text-bone/70 mt-2">{b.lore}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          const c = cards.find((x) => x.cardId === pickedCardId);
          if (c && pickedBossId) onPick(c, pickedBossId);
        }}
        disabled={!pickedCardId || !pickedBossId}
        className="w-full py-3 rounded font-fantasy text-lg font-bold transition-colors disabled:opacity-40"
        style={{
          background: 'linear-gradient(to bottom, #b8860b, #8a1c1c)',
          color: '#faeaca',
        }}
      >
        Enter Battle
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Encounter Screen                                                   */
/* ------------------------------------------------------------------ */

function EncounterScreen({
  state,
  error,
  onSubmit,
  onRestart,
  onExit,
}: {
  state: BattleState | null;
  error: string | null;
  onSubmit: (action: PlayerAction) => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const [rewardOutcome, setRewardOutcome] = useState<BattleRewardOutcome | null>(null);

  useEffect(() => {
    if (!state || !state.result || state.phase !== 'battle_over') {
      setRewardOutcome(null);
      return;
    }
    const outcome = grantBattleReward({
      battleId: state.snapshot.battleId,
      bossId: state.snapshot.boss.bossId,
      outcome: state.result.outcome,
      roundsElapsed: state.result.roundsElapsed,
    });
    setRewardOutcome(outcome);
  }, [state]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 rounded border border-crimson/40 bg-void/70 text-bone">
        <h2 className="font-fantasy text-xl text-crimson mb-2">Cannot start battle</h2>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded font-fantasy text-sm font-bold"
          style={{ background: '#8a1c1c', color: '#faeaca' }}
        >
          Back
        </button>
      </div>
    );
  }
  if (!state) {
    return <div className="text-center pt-20 text-bone/60 font-fantasy">Preparing the arena…</div>;
  }

  const hero = state.heroes[0];
  const boss = state.boss;
  const isOver = state.phase === 'battle_over';
  const canAct = state.phase === 'awaiting_player_action';

  return (
    <div className="max-w-4xl mx-auto px-3 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <button onClick={onExit} className="text-xs text-bone/60 hover:text-bone underline">
          ← Leave
        </button>
        <span className="text-[10px] uppercase tracking-widest text-bone/50">
          Round {state.round}
        </span>
      </div>

      <BossPanel boss={boss} intentText={boss.currentIntent?.telegraphText ?? null} lastEvent={state.log[state.log.length - 1]} />
      <HeroPanel hero={hero} />
      <ActionBar hero={hero} onSubmit={onSubmit} disabled={!canAct} bossId={boss.actorId} />
      <EventLog state={state} />

      {isOver && (
        <ResultModal
          outcome={state.result!.outcome}
          roundsElapsed={state.result!.roundsElapsed}
          reward={rewardOutcome}
          onRestart={onRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}

function BossPanel({
  boss,
  intentText,
  lastEvent,
}: {
  boss: BossCombatant;
  intentText: string | null;
  lastEvent: BattleState['log'][number] | undefined;
}) {
  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const [shakeKey, setShakeKey] = useState(0);
  const prevEventIndex = useRef(-1);

  // Trigger hit-shake when a damage_dealt event targeting the boss lands.
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.kind !== 'damage_dealt') return;
    if (lastEvent.targetActorId !== boss.actorId) return;
    prevEventIndex.current += 1;
    setShakeKey((n) => n + 1);
  }, [lastEvent, boss.actorId]);

  return (
    <div className="rounded-lg border border-crimson/30 bg-void/60 p-4 mb-3">
      <div className="flex items-start gap-4">
        <div
          key={shakeKey}
          className="shrink-0 rounded-md relative overflow-hidden boss-portrait flex items-center justify-center"
          style={{
            width: 148,
            height: 148,
            background:
              'radial-gradient(ellipse at 50% 55%, #f0a24a 0%, #c04010 32%, #5a1006 68%, #1a0300 100%)',
            border: '2px solid rgba(184, 134, 11, 0.5)',
            boxShadow:
              'inset 0 0 32px rgba(0,0,0,0.55), 0 0 18px rgba(216,76,13,0.35)',
          }}
          aria-label={`${boss.snapshot.name} — placeholder portrait, final Leonardo art pending`}
        >
          <span className="font-fantasy text-[10px] uppercase tracking-widest text-bone/50 absolute top-1 left-2">
            Boss
          </span>
          <div className="font-fantasy text-center text-bone px-2" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
            <div className="text-2xl leading-tight">🜂</div>
            <div className="text-[11px] mt-1 opacity-90">Emberborn</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-fantasy text-xl text-bone truncate">{boss.snapshot.name}</div>
          <div className="mt-2 h-3 rounded-full bg-void/80 overflow-hidden border border-bone/20">
            <div className="h-full bg-gradient-to-r from-crimson to-red-500 transition-all duration-300" style={{ width: `${hpPct * 100}%` }} />
          </div>
          <div className="text-[10px] text-bone/60 mt-1 tabular-nums">
            {boss.hp} / {boss.snapshot.maxHp} HP · Phase {boss.currentPhaseId.replace(/^phase_fe_/, '')}
          </div>
          {intentText && (
            <div className="mt-3 p-2 rounded bg-crimson/15 border border-crimson/30 text-sm text-bone">
              <span className="text-[10px] uppercase tracking-widest text-crimson/80 mr-2">
                Intent
              </span>
              {intentText}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes boss-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes boss-hit-shake {
          0% { transform: translate(0, 0); }
          15% { transform: translate(-3px, 1px); filter: brightness(1.6); }
          30% { transform: translate(3px, -1px); filter: brightness(1.6); }
          45% { transform: translate(-2px, 0); }
          60% { transform: translate(2px, 0); }
          75% { transform: translate(-1px, 1px); }
          100% { transform: translate(0, 0); filter: brightness(1); }
        }
        .boss-portrait {
          animation: boss-bob 3s ease-in-out infinite, boss-hit-shake 0.35s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .boss-portrait {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function HeroPanel({ hero }: { hero: HeroCombatant }) {
  const hpPct = Math.max(0, hero.hp / hero.snapshot.maxHp);
  const rPct = hero.snapshot.maxResource === 0 ? 0 : hero.resource / hero.snapshot.maxResource;
  const uPct = hero.ultimateCharge / 100;
  return (
    <div className="rounded-lg border border-gold/30 bg-void/60 p-4 mb-3">
      <div className="flex items-baseline justify-between">
        <div className="font-fantasy text-lg text-bone">{hero.snapshot.displayName}</div>
        <div className="text-[10px] uppercase tracking-widest text-bone/50">
          {hero.snapshot.archetype} · {hero.snapshot.rank}
        </div>
      </div>
      <Bar label="HP" value={hero.hp} max={hero.snapshot.maxHp} pct={hpPct} color="from-emerald-400 to-emerald-700" />
      <Bar
        label={hero.snapshot.resourceType === 'mana' ? 'Mana' : 'Tech'}
        value={hero.resource}
        max={hero.snapshot.maxResource}
        pct={rPct}
        color="from-sky-400 to-sky-700"
      />
      <Bar label="Ult" value={hero.ultimateCharge} max={100} pct={uPct} color="from-amber-400 to-amber-700" />
      {hero.shields.length > 0 && (
        <div className="text-[11px] text-bone/70 mt-1">
          🛡 Shield: {hero.shields.reduce((sum, s) => sum + s.amount, 0)}
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, max, pct, color }: { label: string; value: number; max: number; pct: number; color: string }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-bone/60 mb-0.5">
        <span>{label}</span>
        <span className="tabular-nums">{value} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-void/80 overflow-hidden border border-bone/20">
        <div className={`h-full bg-gradient-to-r ${color} transition-all duration-300`} style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} />
      </div>
    </div>
  );
}

function ActionBar({ hero, onSubmit, disabled, bossId }: { hero: HeroCombatant; onSubmit: (a: PlayerAction) => void; disabled: boolean; bossId: string }) {
  return (
    <div className="rounded-lg border border-bone/20 bg-void/60 p-3 mb-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {hero.snapshot.abilities.map((a) => {
          const onCd = hero.cooldowns.some((c) => c.abilityDefinitionId === a.definitionId);
          const short = hero.resource < a.resourceCost;
          const notCharged = a.slot === 'ultimate' && hero.ultimateCharge < 100;
          const denied = disabled || onCd || short || notCharged;
          return (
            <button
              key={a.definitionId}
              onClick={() => onSubmit({ kind: 'ability', abilityDefinitionId: a.definitionId, targetActorIds: [bossId] })}
              disabled={denied}
              className="rounded-md p-2 text-left border disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(184,134,11,0.10)',
                borderColor: 'rgba(184,134,11,0.35)',
              }}
              title={a.def.descriptionShort}
            >
              <div className="text-xs font-fantasy text-bone truncate">{a.displayName}</div>
              <div className="text-[10px] text-bone/60 mt-0.5">
                {a.slot} · cost {a.resourceCost}
                {a.cooldownRounds > 0 && ` · cd ${a.cooldownRounds}`}
              </div>
              {onCd && <div className="text-[10px] text-crimson mt-0.5">On cooldown</div>}
              {short && !onCd && <div className="text-[10px] text-crimson mt-0.5">Not enough resource</div>}
              {notCharged && !onCd && !short && <div className="text-[10px] text-crimson mt-0.5">Ult not charged</div>}
            </button>
          );
        })}
        <UtilityButton label="Guard" hint="+shield, +5 ult" onClick={() => onSubmit({ kind: 'guard' })} disabled={disabled} />
        <UtilityButton label="Focus" hint="+2 resource, +3 ult" onClick={() => onSubmit({ kind: 'focus' })} disabled={disabled} />
        <UtilityButton label="Inspect" hint="reveal (no effect at B4)" onClick={() => onSubmit({ kind: 'inspect' })} disabled={disabled} />
      </div>
    </div>
  );
}

function UtilityButton({ label, hint, onClick, disabled }: { label: string; hint: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-2 text-left border disabled:opacity-40"
      style={{ background: 'rgba(155,182,179,0.10)', borderColor: 'rgba(155,182,179,0.35)' }}
    >
      <div className="text-xs font-fantasy text-bone">{label}</div>
      <div className="text-[10px] text-bone/60 mt-0.5">{hint}</div>
    </button>
  );
}

function EventLog({ state }: { state: BattleState }) {
  const lastEvents = state.log.slice(-8);
  return (
    <div className="rounded-lg border border-bone/15 bg-void/40 p-3 mb-6 max-h-40 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-bone/50 mb-1">Combat log</div>
      {lastEvents.map((e, i) => (
        <div key={i} className="text-[11px] text-bone/70 font-mono">
          {formatEvent(e)}
        </div>
      ))}
    </div>
  );
}

function formatEvent(e: BattleState['log'][number]): string {
  switch (e.kind) {
    case 'battle_started': return `⚔ battle begins`;
    case 'round_started': return `— Round ${e.round} —`;
    case 'boss_intent_declared': return `boss intends: ${e.intent.telegraphText}`;
    case 'player_action_selected': return `you chose: ${e.action.kind === 'ability' ? 'ability' : e.action.kind}`;
    case 'damage_dealt': return `${e.sourceActorId} hits ${e.targetActorId} for ${e.amount} ${e.damageType}${e.blockedByShield ? ` (shield -${e.blockedByShield})` : ''}`;
    case 'healing_applied': return `${e.targetActorId} healed ${e.amount}${e.overheal ? ` (over ${e.overheal})` : ''}`;
    case 'shield_gained': return `${e.targetActorId} gains shield ${e.amount}`;
    case 'status_applied': return `${e.statusId} applied to ${e.targetActorId} (${e.duration})`;
    case 'status_removed': return `status expired on ${e.targetActorId}`;
    case 'resource_changed': return `resource ${e.delta > 0 ? '+' : ''}${e.delta} (${e.source})`;
    case 'ultimate_charge_changed': return `ult +${e.delta} (${e.source})`;
    case 'cooldown_started': return `cooldown started`;
    case 'phase_transition': return `⚡ boss enters ${e.toPhaseId}`;
    case 'actor_defeated': return `☠ ${e.actorId} defeated`;
    case 'action_denied': return `⛔ ${e.reason}`;
    case 'battle_ended': return `▮ battle ends: ${e.result.outcome}`;
    default: return e.kind;
  }
}

function ResultModal({ outcome, roundsElapsed, reward, onRestart, onExit }: {
  outcome: string;
  roundsElapsed: number;
  reward: BattleRewardOutcome | null;
  onRestart: () => void;
  onExit: () => void;
}) {
  const isWin = outcome === 'victory';
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-void/80 z-30">
      <div className="max-w-md mx-4 p-6 rounded-lg border shadow-2xl" style={{
        background: isWin ? 'linear-gradient(to bottom, #faeaca, #efcfa4)' : 'linear-gradient(to bottom, #2a1010, #1a0808)',
        color: isWin ? '#4a3211' : '#faeaca',
        borderColor: isWin ? 'rgba(184,134,11,0.6)' : 'rgba(220,38,38,0.5)',
      }}>
        <h2 className="font-fantasy text-3xl mb-2">{isWin ? 'Victory' : 'Defeat'}</h2>
        <p className="text-sm mb-4">
          {isWin
            ? `The Emberborn Wraith falls in ${roundsElapsed} rounds.`
            : `You fell after ${roundsElapsed} rounds. The ash still smoulders.`}
        </p>
        {isWin && reward && <RewardSummary outcome={reward} />}
        <div className="flex gap-2 mt-4">
          <button onClick={onRestart} className="flex-1 py-2 rounded font-fantasy font-bold" style={{ background: isWin ? '#8a1c1c' : '#b8860b', color: '#faeaca' }}>
            Rematch
          </button>
          <button onClick={onExit} className="flex-1 py-2 rounded font-fantasy font-bold border" style={{ background: 'transparent', color: isWin ? '#4a3211' : '#faeaca', borderColor: 'currentColor' }}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardSummary({ outcome }: { outcome: BattleRewardOutcome }) {
  if (outcome.kind === 'no_reward') {
    return <div className="text-xs italic opacity-70">No reward this battle.</div>;
  }
  const items: GrantedItem[] = outcome.items;
  const isFirst = outcome.tier === 'first_clear';
  const isAlready = outcome.kind === 'already_granted';
  return (
    <div className="rounded p-3 border" style={{ background: 'rgba(74,50,17,0.08)', borderColor: 'rgba(74,50,17,0.3)' }}>
      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">
        {isFirst ? '★ First Clear' : 'Repeat Clear'}
        {isAlready && ' · already granted'}
      </div>
      <ul className="text-sm space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="tabular-nums">
            +{item.amount} {item.currency === 'gameplay' ? 'Gold' : 'Forge Crystals'}
          </li>
        ))}
      </ul>
    </div>
  );
}
