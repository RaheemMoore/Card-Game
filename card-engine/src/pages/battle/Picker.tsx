import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllCards } from '../../services/storage';
import { getAllBossDefinitions } from '../../services/bosses/registry';
import { getAbilityStore } from '../../services/abilities/registry';
import type { Card } from '../../types/card';

const MAX_PARTY = 3;

type PartySlots = readonly (string | null)[];

export function Picker({ onPick }: { onPick: (cards: Card[], bossId: string) => void }) {
  const cards = getAllCards();
  const bosses = getAllBossDefinitions().filter((b) => b.status === 'active');
  const abilityStore = getAbilityStore();

  const eligibleCards = useMemo(
    () => cards.filter((c) => abilityStore.getReferencesForCard(c.cardId).length > 0),
    [cards, abilityStore],
  );

  const [partySlots, setPartySlots] = useState<PartySlots>([null, null, null]);
  const [pickedBossId, setPickedBossId] = useState<string | null>(bosses[0]?.id ?? null);

  function slotFor(cardId: string): number {
    return partySlots.indexOf(cardId);
  }

  function toggleCard(cardId: string) {
    setPartySlots((prev) => {
      const existing = prev.indexOf(cardId);
      if (existing >= 0) {
        // Remove from current slot.
        const next = prev.slice();
        next[existing] = null;
        return next;
      }
      const empty = prev.indexOf(null);
      if (empty < 0) return prev; // party full — click a picked card to remove first
      const next = prev.slice();
      next[empty] = cardId;
      return next;
    });
  }

  const picked = partySlots.filter((id): id is string => id !== null);
  const canStart = picked.length >= 1 && !!pickedBossId;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-fantasy text-3xl text-bone mb-2">Choose your party</h1>
      <p className="text-sm text-bone/70 mb-4">
        Pick up to {MAX_PARTY} forged cards with at least one ability, then step into the boss
        battle. Lanes resolve left → right.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {partySlots.map((cardId, i) => {
          const card = cardId ? cards.find((c) => c.cardId === cardId) ?? null : null;
          return (
            <div
              key={i}
              className={`rounded-md border p-3 min-h-[70px] flex flex-col ${
                card
                  ? 'border-gold/70 bg-gold/10'
                  : 'border-bone/15 border-dashed bg-void/30'
              }`}
            >
              <div className="text-[10px] uppercase tracking-widest text-bone/50 mb-1">
                Lane {i + 1}
              </div>
              {card ? (
                <>
                  <div className="text-sm font-fantasy text-bone truncate">{card.cardName}</div>
                  <div className="text-[10px] text-bone/60 uppercase tracking-widest">
                    {card.archetype}
                  </div>
                </>
              ) : (
                <div className="text-xs text-bone/40 italic mt-auto">empty</div>
              )}
            </div>
          );
        })}
      </div>

      {eligibleCards.length === 0 && (
        <div className="p-4 rounded border border-gold/30 bg-void/60 text-bone/80 text-sm mb-6">
          You don't have any battle-ready cards yet. Forge one first, or tier a card up so it earns
          its Core ability.{' '}
          <Link to="/forge" className="underline text-gold">
            Go to the Forge →
          </Link>
        </div>
      )}

      {eligibleCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {eligibleCards.map((c) => {
            const laneIdx = slotFor(c.cardId);
            const isPicked = laneIdx >= 0;
            return (
              <button
                key={c.cardId}
                type="button"
                onClick={() => toggleCard(c.cardId)}
                aria-pressed={isPicked}
                aria-label={
                  isPicked
                    ? `${c.cardName} — placed in Lane ${laneIdx + 1}. Click to remove.`
                    : `${c.cardName} — click to add to party.`
                }
                className={`rounded-md p-3 text-left border transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  isPicked
                    ? 'border-gold bg-gold/10 shadow-lg shadow-gold/20'
                    : 'border-bone/20 bg-void/40 hover:border-bone/40'
                }`}
              >
                {isPicked && (
                  <span className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-gold">
                    Lane {laneIdx + 1}
                  </span>
                )}
                <div className="text-sm font-fantasy text-bone truncate pr-10">{c.cardName}</div>
                <div className="text-[10px] text-bone/60 uppercase tracking-widest mt-1">
                  {c.archetype}
                </div>
                <div className="mt-2 text-[11px] text-bone/70 flex gap-2">
                  <span>ATK {c.stats.Atk.value}</span>
                  <span>DEF {c.stats.Def.value}</span>
                  <span>
                    {c.stats.Mana ? `MANA ${c.stats.Mana.value}` : `TECH ${c.stats.Tech?.value}`}
                  </span>
                </div>
              </button>
            );
          })}
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
            type="button"
            onClick={() => setPickedBossId(b.id)}
            aria-pressed={pickedBossId === b.id}
            aria-label={`Fight ${b.name}`}
            className={`rounded-md p-4 text-left border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson ${
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
          const partyCards = picked
            .map((id) => cards.find((x) => x.cardId === id))
            .filter((c): c is Card => c !== undefined);
          if (partyCards.length > 0 && pickedBossId) onPick(partyCards, pickedBossId);
        }}
        disabled={!canStart}
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
