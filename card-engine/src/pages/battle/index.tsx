import { useMemo, useState } from 'react';
import { useBattle } from '../../services/combat/useBattle';
import type { Card } from '../../types/card';
import { Picker } from './Picker';
import { EncounterScreen } from './EncounterScreen';

/**
 * Boss battle page — B4 vertical slice, Gate 7A visual pass.
 *
 * Two stages:
 *   1. Picker (Picker.tsx) — pick a battle-ready hero card + an active boss.
 *   2. EncounterScreen (EncounterScreen.tsx) — Boss panel, Hero panel,
 *      Ability Command Strip rail with select-then-confirm, utility rail,
 *      event log, result modal.
 *
 * Combat reducer / useBattle / battleRewardService are untouched.
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
    return (
      <Picker
        onPick={(card, boss) => {
          setHeroCard(card);
          setBossId(boss);
        }}
      />
    );
  }

  return (
    <EncounterScreen
      state={battle.state}
      events={battle.events}
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
