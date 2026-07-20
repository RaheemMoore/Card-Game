import { useEffect, useMemo, useRef, useState } from 'react';
import { useBattle } from '../../services/combat/useBattle';
import type { Card } from '../../types/card';
import { commit, refund, reserve } from '../../services/economy/walletService';
import { GAMEPLAY_PRICE_CATALOG } from '../../data/economy/gameplayPriceCatalog';
import { Picker } from './Picker';
import { EncounterScreen } from './EncounterScreen';

/**
 * Boss battle page.
 *
 * Two stages:
 *   1. Picker (Picker.tsx) — pick 1..3 battle-ready hero cards + an active
 *      boss. Picker reserves the Gold entry cost inside its Start handler and
 *      hands the pending transaction id up to us.
 *   2. EncounterScreen (EncounterScreen.tsx) — Boss panel, Hero lanes,
 *      Ability rail, utility rail, Combat Journal, result modal.
 *
 * Entry cost lifecycle (plan §15.4, forfeit-on-defeat):
 *   - Picker → reserve (pending)                            [Start click]
 *   - Battle init succeeds → commit (pending → committed)   [snap here]
 *   - Battle init fails    → refund (pending → refunded)
 *   - Defeat / victory / abandon → nothing; entry stays committed
 *   - Restart → fresh reserve, same lifecycle again
 */

const ENTRY_PRICE = GAMEPLAY_PRICE_CATALOG.battle_run_entry;

export function Battle() {
  const [party, setParty] = useState<Card[] | null>(null);
  const [bossId, setBossId] = useState<string | null>(null);
  const [entryTxnId, setEntryTxnId] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));

  const active = useMemo(
    () => (party && bossId ? { heroCards: party, bossId, seed } : null),
    [party, bossId, seed],
  );
  const battle = useBattle(active);

  // Commit / refund the entry cost once we know whether the reducer accepted
  // the party. Guarded by lastResolvedTxnId so a rerender doesn't double-fire.
  const lastResolvedTxnId = useRef<string | null>(null);
  useEffect(() => {
    if (!entryTxnId || entryTxnId === lastResolvedTxnId.current) return;
    if (!active) return;
    if (battle.state) {
      commit(entryTxnId);
      lastResolvedTxnId.current = entryTxnId;
    } else if (battle.error) {
      refund(entryTxnId, `battle_init_failed: ${battle.error}`);
      lastResolvedTxnId.current = entryTxnId;
    }
  }, [entryTxnId, active, battle.state, battle.error]);

  if (!party || !bossId) {
    return (
      <Picker
        onPick={(cards, boss, txnId) => {
          setParty(cards);
          setBossId(boss);
          setEntryTxnId(txnId);
          lastResolvedTxnId.current = null;
        }}
      />
    );
  }

  return (
    <EncounterScreen
      state={battle.state}
      events={battle.events}
      actingActorId={battle.actingActorId}
      partyCards={party}
      entryTxnId={entryTxnId}
      error={battle.error}
      onSubmit={battle.submit}
      onRestart={() => {
        // New run — fresh reserve at the same price. If wallet is empty
        // now, surface it on the Picker rather than leaving the user stuck.
        try {
          const txn = reserve({
            currency: 'gameplay',
            amount: ENTRY_PRICE.gameplayCost,
            actionId: ENTRY_PRICE.actionId,
            metadata: {
              partyCardIds: party.map((c) => c.cardId).join(','),
              bossId,
            },
          });
          setEntryTxnId(txn.transactionId);
          lastResolvedTxnId.current = null;
          setSeed(Math.floor(Math.random() * 1e9));
          battle.restart();
        } catch {
          // Out of gold — bounce back to Picker so the user sees the error.
          setParty(null);
          setBossId(null);
          setEntryTxnId(null);
        }
      }}
      onExit={() => {
        setParty(null);
        setBossId(null);
        setEntryTxnId(null);
      }}
    />
  );
}
