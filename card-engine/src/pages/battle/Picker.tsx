import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllCards } from '../../services/storage';
import { getAllBossDefinitions } from '../../services/bosses/registry';
import { computeRankSum } from '../../data/powerSystem';
import { PARTY_POWER_BUDGET, MAX_PARTY_SLOTS } from '../../data/bosses/towerCurve';
import { getAbilityStore } from '../../services/abilities/registry';
import { GAMEPLAY_PRICE_CATALOG } from '../../data/economy/gameplayPriceCatalog';
import { reserve, InsufficientFundsError } from '../../services/economy/walletService';
import { CardBench } from '../minigames/CardBench';
import type { Card } from '../../types/card';

// Slots are the HARD cap; the real constraint is power. See
// PARTY_POWER_BUDGET — a party of six Foundation cards and a party of three
// Forged ones cost the same, which is what lets one tower serve every tier.
const MAX_PARTY = MAX_PARTY_SLOTS;
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

  const [partySlots, setPartySlots] = useState<PartySlots>(
    () => Array.from({ length: MAX_PARTY }, () => null),
  );
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
      if (empty < 0) return prev; // slots full — click a picked card to remove first
      // Refuse a pick that would break the budget rather than letting the
      // player assemble an illegal party and be rejected on Start.
      const card = cards.find((c) => c.cardId === cardId);
      const spent = prev.reduce((n, id) => {
        const picked = id ? cards.find((c) => c.cardId === id) : undefined;
        return n + (picked ? computeRankSum(picked.stats) : 0);
      }, 0);
      if (card && spent + computeRankSum(card.stats) > PARTY_POWER_BUDGET) return prev;
      const next = prev.slice();
      next[empty] = cardId;
      return next;
    });
  }

  const picked = partySlots.filter((id): id is string => id !== null);
  const powerSpent = picked.reduce((n, id) => {
    const card = cards.find((c) => c.cardId === id);
    return n + (card ? computeRankSum(card.stats) : 0);
  }, 0);
  const canStart = picked.length >= 1 && !!pickedBossId;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-fantasy text-3xl text-bone mb-2">Choose your party</h1>
      <p className="text-sm text-bone/70 mb-3">
        Every hero costs power — stronger cards cost more. Spend your budget on a few strong
        heroes or a wider band of weaker ones. Lanes resolve left → right.
      </p>

      {/* The budget is the whole mechanic, so it is stated plainly rather than
          discovered by being refused on Start. */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 rounded-full overflow-hidden bg-void/70 border border-gold/25">
          <div
            className="h-full transition-[width] duration-200"
            style={{
              width: `${Math.min(100, (powerSpent / PARTY_POWER_BUDGET) * 100)}%`,
              background:
                powerSpent >= PARTY_POWER_BUDGET
                  ? 'linear-gradient(to right, #8a6a2e, #eb962e)'
                  : 'linear-gradient(to right, #4a6a8a, #7fb2d8)',
            }}
          />
        </div>
        <span
          className="text-sm tabular-nums"
          style={{ color: powerSpent >= PARTY_POWER_BUDGET ? '#eb962e' : '#cbb98f' }}
        >
          {powerSpent} / {PARTY_POWER_BUDGET} power
        </span>
        <span className="text-xs text-bone/50">
          {picked.length}/{MAX_PARTY} slots
        </span>
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
        <div className="mb-8">
          <CardBench
            eligibleCards={eligibleCards}
            laneCount={MAX_PARTY}
            selectedIds={picked}
            onToggle={toggleCard}
            costOf={(card) => computeRankSum(card.stats)}
            unaffordableIds={eligibleCards
              .filter(
                (c) =>
                  !picked.includes(c.cardId) &&
                  powerSpent + computeRankSum(c.stats) > PARTY_POWER_BUDGET,
              )
              .map((c) => c.cardId)}
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
