import { useMemo, useState } from 'react';
import { useBattle } from '../../services/combat/useBattle';
import type { Card } from '../../types/card';
import { Picker } from './Picker';
import { EncounterScreen } from './EncounterScreen';

/**
 * Boss battle page.
 *
 * Two stages:
 *   1. Picker (Picker.tsx) — pick 1..3 battle-ready hero cards + an active boss.
 *   2. EncounterScreen (EncounterScreen.tsx) — Boss panel, Hero panel,
 *      Ability rail, utility rail, Combat Journal, result modal.
 *
 * Combat reducer / useBattle / battleRewardService are the sources of truth.
 */
export function Battle() {
  const [party, setParty] = useState<Card[] | null>(null);
  const [bossId, setBossId] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));

  const active = useMemo(
    () => (party && bossId ? { heroCards: party, bossId, seed } : null),
    [party, bossId, seed],
  );
  const battle = useBattle(active);

  if (!party || !bossId) {
    return (
      <Picker
        onPick={(cards, boss) => {
          setParty(cards);
          setBossId(boss);
        }}
      />
    );
  }

  return (
    <EncounterScreen
      state={battle.state}
      events={battle.events}
      actingActorId={battle.actingActorId}
      error={battle.error}
      onSubmit={battle.submit}
      onRestart={() => {
        setSeed(Math.floor(Math.random() * 1e9));
        battle.restart();
      }}
      onExit={() => {
        setParty(null);
        setBossId(null);
      }}
    />
  );
}
