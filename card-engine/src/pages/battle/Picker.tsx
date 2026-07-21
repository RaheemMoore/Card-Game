import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllCards } from '../../services/storage';
import { getAllBossDefinitions } from '../../services/bosses/registry';
import { getAbilityStore } from '../../services/abilities/registry';
import { GAMEPLAY_PRICE_CATALOG } from '../../data/economy/gameplayPriceCatalog';
import { reserve, InsufficientFundsError } from '../../services/economy/walletService';
import { CardBench } from '../minigames/CardBench';
import type { Card } from '../../types/card';

const MAX_PARTY = 3;
const ENTRY_PRICE = GAMEPLAY_PRICE_CATALOG.battle_run_entry;

type PartySlots = readonly (string | null)[];

interface PickerProps {
  onPick: (cards: Card[], bossId: string, entryTxnId: string) => void;
}

export function Picker({ onPick }: PickerProps) {
  const cards = getAllCards();
  const bosses = getAllBossDefinitions().filter((b) => b.status === 'active');
  const abilityStore = getAbilityStore();
  const [entryError, setEntryError] = useState<string | null>(null);

  const eligibleCards = useMemo(
    () => cards.filter((c) => abilityStore.getReferencesForCard(c.cardId).length > 0),
    [cards, abilityStore],
  );

  const [partySlots, setPartySlots] = useState<PartySlots>([null, null, null]);
  const [pickedBossId, setPickedBossId] = useState<string | null>(bosses[0]?.id ?? null);

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
        <div className="mb-8">
          <CardBench
            eligibleCards={eligibleCards}
            laneCount={MAX_PARTY}
            selectedIds={picked}
            onToggle={toggleCard}
          />
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

      {entryError && (
        <div
          role="alert"
          className="mb-3 p-3 rounded border border-crimson/50 bg-crimson/10 text-sm text-bone"
        >
          {entryError}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setEntryError(null);
          const partyCards = picked
            .map((id) => cards.find((x) => x.cardId === id))
            .filter((c): c is Card => c !== undefined);
          if (partyCards.length === 0 || !pickedBossId) return;
          try {
            const txn = reserve({
              currency: 'gameplay',
              amount: ENTRY_PRICE.gameplayCost,
              actionId: ENTRY_PRICE.actionId,
              metadata: {
                partyCardIds: partyCards.map((c) => c.cardId).join(','),
                bossId: pickedBossId,
              },
            });
            onPick(partyCards, pickedBossId, txn.transactionId);
          } catch (err) {
            if (err instanceof InsufficientFundsError) {
              setEntryError(
                `You need ${err.required} Gold to enter this battle (you have ${err.available}).`,
              );
              return;
            }
            setEntryError(err instanceof Error ? err.message : String(err));
          }
        }}
        disabled={!canStart}
        aria-label={`Enter Battle — costs ${ENTRY_PRICE.gameplayCost} Gold, forfeited on defeat`}
        className="w-full py-3 rounded font-fantasy text-lg font-bold transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{
          background: 'linear-gradient(to bottom, #b8860b, #8a1c1c)',
          color: '#faeaca',
        }}
      >
        Enter Battle · {ENTRY_PRICE.gameplayCost} Gold
      </button>
      <p className="text-[10px] text-bone/50 mt-2 text-center">
        Entry cost is forfeited on defeat or abandon.
      </p>
    </div>
  );
}
