import { useEffect, useMemo, useRef, useState } from 'react';
import { useBattle } from '../../services/combat/useBattle';
import type { Card } from '../../types/card';
import { commit, refund, reserve } from '../../services/economy/walletService';
import { GAMEPLAY_PRICE_CATALOG } from '../../data/economy/gameplayPriceCatalog';
import { Picker } from './Picker';
import { CombatViewport } from './CombatViewport';

/**
 * Boss battle route.
 *
 *   /battle — Picker (renders inside the normal app shell)
 *     → user picks 1..3 heroes + boss, we reserve the Gold entry cost
 *   → CombatViewport (renders full-screen via createPortal, hiding the app
 *     shell) drives the actual combat
 *
 * Entry cost lifecycle unchanged from C8: reserve on Start, commit on
 * useBattle success, refund on init failure, forfeit on defeat/abandon.
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
    <CombatViewport
      state={battle.state}
      events={battle.events}
      actingActorId={battle.actingActorId}
      partyCards={party}
      entryTxnId={entryTxnId}
      error={battle.error}
      onSubmit={battle.submit}
      onSelectActor={battle.selectActor}
      onRestart={() => {
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
