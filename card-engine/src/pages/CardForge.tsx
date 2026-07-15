import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArchetypeName, Rank, CombatStats, Card } from '../types/card';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { DiceRoll } from '../components/DiceRoll';
import { WhisperWords } from '../components/WhisperWords';
import { CardRenderer } from '../components/CardRenderer';
import { buildCardShell } from '../services/cardGenerator';
import { generateCardText } from '../services/claudeApi';
import { generatePlaceholderPortrait } from '../services/portraitGenerator';
import { saveCard } from '../services/storage';

type Stage = 'archetype' | 'stats' | 'whisper' | 'forging' | 'reveal';

export function CardForge() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('archetype');
  const [archetype, setArchetype] = useState<ArchetypeName | null>(null);
  const [rank, setRank] = useState<Rank | null>(null);
  const [stats, setStats] = useState<CombatStats | null>(null);
  const [manaCost, setManaCost] = useState<number>(0);
  const [card, setCard] = useState<Card | null>(null);

  function handleArchetypeSelect(a: ArchetypeName, r: Rank) {
    setArchetype(a);
    setRank(r);
    setStage('stats');
  }

  function handleStatsComplete(s: CombatStats, mana: number) {
    setStats(s);
    setManaCost(mana);
    setStage('whisper');
  }

  async function handleWhisperComplete(words: string[]) {
    if (!archetype || !rank || !stats) return;

    setStage('forging');

    const shell = buildCardShell(archetype, rank, stats, manaCost, words);
    const portrait = generatePlaceholderPortrait(archetype, rank);

    const text = await generateCardText(
      archetype,
      rank,
      stats,
      manaCost,
      words,
    );

    const fullCard: Card = {
      ...shell,
      cardName: text.cardName,
      nameAndTitle: text.nameAndTitle,
      lore: text.lore,
      portraitAsset: portrait,
    };

    saveCard(fullCard);
    setCard(fullCard);
    setStage('reveal');
  }

  function handleForgeAnother() {
    setStage('archetype');
    setArchetype(null);
    setRank(null);
    setStats(null);
    setManaCost(0);
    setCard(null);
  }

  const stageIndex = ['archetype', 'stats', 'whisper', 'forging', 'reveal'].indexOf(stage);

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-ash">
        {(['archetype', 'stats', 'whisper', 'reveal'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-slate-dark" />}
            <span
              className={`px-2 py-0.5 rounded-full font-fantasy transition-colors ${
                stage === s || stageIndex > i
                  ? 'bg-gold/20 text-gold'
                  : 'bg-slate-dark text-ash'
              }`}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {stage === 'archetype' && (
        <ArchetypeSelector onSelect={handleArchetypeSelect} />
      )}

      {stage === 'stats' && rank && (
        <DiceRoll rank={rank} onComplete={handleStatsComplete} />
      )}

      {stage === 'whisper' && (
        <WhisperWords onComplete={handleWhisperComplete} />
      )}

      {stage === 'forging' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="font-fantasy text-lg text-gold animate-pulse">
            Forging your champion...
          </p>
        </div>
      )}

      {stage === 'reveal' && card && (
        <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.8s_ease-out]">
          <CardRenderer card={card} />

          {card.lore && (
            <div className="max-w-sm text-center">
              <p className="text-ash italic text-sm leading-relaxed">
                "{card.lore}"
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/card/${card.cardId}`)}
              className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
                font-fantasy text-sm transition-colors border border-slate-dark hover:border-ash"
            >
              View Card
            </button>
            <button
              onClick={handleForgeAnother}
              className="px-6 py-2 rounded-lg font-fantasy text-sm font-bold transition-all
                bg-gradient-to-r from-power to-endurance text-ivory
                hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              Forge Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
