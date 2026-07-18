import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllCards } from '../../services/storage';
import { getAllBossDefinitions } from '../../services/bosses/registry';
import { getAbilityStore } from '../../services/abilities/registry';
import type { Card } from '../../types/card';

export function Picker({ onPick }: { onPick: (card: Card, bossId: string) => void }) {
  const cards = getAllCards();
  const bosses = getAllBossDefinitions().filter((b) => b.status === 'active');
  const abilityStore = getAbilityStore();

  const eligibleCards = useMemo(
    () => cards.filter((c) => abilityStore.getReferencesForCard(c.cardId).length > 0),
    [cards, abilityStore],
  );

  const [pickedCardId, setPickedCardId] = useState<string | null>(null);
  const [pickedBossId, setPickedBossId] = useState<string | null>(bosses[0]?.id ?? null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-fantasy text-3xl text-bone mb-2">Choose your hero</h1>
      <p className="text-sm text-bone/70 mb-6">
        Pick a forged card with at least one ability, then step into the boss battle.
      </p>

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
