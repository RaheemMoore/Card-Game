import { useState } from 'react';
import { CardRenderer } from '../../../components/CardRenderer';
import { getAllCards } from '../../../services/storage';
import { getStatNames } from '../../../data/powerSystem';
import type { Card, StatName } from '../../../types/card';
import { ForgeStrikeViewport } from './ForgeStrikeViewport';

/**
 * Forge Strike entry — card + stat selection, rendered inside the normal
 * app shell. Active play mounts ForgeStrikeViewport, which portals to a
 * full-screen surface (same pattern as pages/battle). Reached by direct
 * route only (/minigames/forge-strike) — no nav item in the first slice.
 */

const STAT_LABEL: Record<StatName, string> = {
  Atk: 'ATK — the striking arm',
  Def: 'DEF — the enduring frame',
  Mana: 'MANA — the inner well',
  Tech: 'TECH — the integrated system',
};

export function ForgeStrike() {
  const cards = getAllCards();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedStat, setSelectedStat] = useState<StatName | null>(null);
  const [inForge, setInForge] = useState(false);

  if (inForge && selectedCard && selectedStat) {
    return (
      <ForgeStrikeViewport
        card={selectedCard}
        stat={selectedStat}
        onExit={() => setInForge(false)}
        onChangeStat={() => {
          setSelectedStat(null);
          setInForge(false);
        }}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      <header className="text-center">
        <h1 className="font-fantasy text-3xl font-bold text-amber-200 tracking-wider">Forge Strike</h1>
        <p className="text-sm text-white/60 mt-1">
          Choose a card, choose a stat, and temper it at the forge. Practice mode — no rewards, no stat
          changes.
        </p>
        {import.meta.env.DEV && (
          <p className="text-[10px] text-white/30 mt-1">dev route · config v1 · playtest tuning</p>
        )}
      </header>

      {cards.length === 0 ? (
        <p className="text-center text-white/60">
          No cards yet — forge a character first, then return here to train it.
        </p>
      ) : (
        <>
          <section>
            <h2 className="font-fantasy text-lg text-white/80 mb-3">1 · Choose your card</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {cards.map((card) => (
                <div
                  key={card.cardId}
                  className={`rounded-xl transition-shadow ${
                    selectedCard?.cardId === card.cardId ? 'ring-2 ring-amber-400 shadow-lg' : ''
                  }`}
                >
                  <CardRenderer
                    card={card}
                    size="thumbnail"
                    onClick={() => {
                      setSelectedCard(card);
                      setSelectedStat(null);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          {selectedCard && (
            <section>
              <h2 className="font-fantasy text-lg text-white/80 mb-3">2 · Choose the stat to train</h2>
              <div className="flex flex-wrap gap-3 justify-center">
                {getStatNames(selectedCard.archetype).map((stat) => {
                  const entry = selectedCard.stats[stat]!;
                  return (
                    <button
                      key={stat}
                      onClick={() => setSelectedStat(stat)}
                      className={`px-4 py-3 rounded-lg border text-left ${
                        selectedStat === stat
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                    >
                      <span className="block font-bold text-sm text-white/90">{STAT_LABEL[stat]}</span>
                      <span className="block text-xs text-white/50 mt-0.5">
                        Current {entry.value} · {entry.bias} affinity · cap {entry.hardCap}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {selectedCard && selectedStat && (
            <div className="text-center">
              <button
                onClick={() => setInForge(true)}
                className="px-8 py-3 rounded-lg font-fantasy font-bold tracking-widest text-lg"
                style={{ background: '#b45309', color: '#0b0709' }}
              >
                ENTER THE FORGE
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
