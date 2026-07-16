import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArchetypeName, CardStats, Card, ModifierStack } from '../types/card';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { DiceRoll } from '../components/DiceRoll';
import { WhisperWheel } from '../components/WhisperWheel';
import { CardRenderer } from '../components/CardRenderer';
import { buildCardShell } from '../services/cardGenerator';
import { generateCardText } from '../services/claudeApi';
import { generatePortrait } from '../services/leonardoApi';
import { saveCard } from '../services/storage';
import { getOverallRank } from '../data/powerSystem';

type Stage = 'archetype' | 'stats' | 'wheel' | 'forging' | 'reveal';

const FORGING_MESSAGES = [
  'Summoning your champion...',
  'Painting their portrait...',
  'Inscribing their legend...',
  'Binding fate to form...',
  'Sealing the card...',
];

export function CardForge() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('archetype');
  const [archetype, setArchetype] = useState<ArchetypeName | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [forgingMessage, setForgingMessage] = useState(FORGING_MESSAGES[0]);
  const messageInterval = useRef<ReturnType<typeof setInterval>>(null);
  const forgingStarted = useRef(false);

  useEffect(() => {
    if (stage === 'forging') {
      let idx = 0;
      messageInterval.current = setInterval(() => {
        idx = (idx + 1) % FORGING_MESSAGES.length;
        setForgingMessage(FORGING_MESSAGES[idx]);
      }, 3000);
      return () => {
        if (messageInterval.current) clearInterval(messageInterval.current);
      };
    }
  }, [stage]);

  function handleArchetypeSelect(a: ArchetypeName) {
    setArchetype(a);
    setStage('stats');
  }

  function handleStatsComplete(s: CardStats) {
    setStats(s);
    setStage('wheel');
  }

  async function handleWheelComplete(mods: ModifierStack, whisperWords: string[]) {
    if (!archetype || !stats) return;
    if (forgingStarted.current) return;
    forgingStarted.current = true;

    setStage('forging');

    const shell = buildCardShell(archetype, stats, whisperWords);
    const overallRank = getOverallRank(stats);

    // Claude now composes the Leonardo prompt (guaranteed <= 1300 chars) alongside lore,
    // so we call it first, THEN hand its portraitPrompt to Leonardo. Two sequential calls
    // instead of parallel — but Claude Haiku is fast (~1s) and it prevents 1500-char errors.
    const text = await generateCardText(archetype, stats, whisperWords, mods);
    const portrait = await generatePortrait(
      text.portraitPrompt,
      text.negativePrompt,
      archetype,
      overallRank,
    );

    const fullCard: Card = {
      ...shell,
      cardName: text.cardName,
      nameAndTitle: text.nameAndTitle,
      lore: text.lore,
      portraitAsset: portrait,
      modifiers: mods,
      identity: text.identity,
    };

    saveCard(fullCard);
    setCard(fullCard);
    setStage('reveal');
  }

  function handleForgeAnother() {
    forgingStarted.current = false;
    setStage('archetype');
    setArchetype(null);
    setStats(null);
    setCard(null);
  }

  const stages = ['archetype', 'stats', 'wheel', 'reveal'] as const;
  const stageIndex = stages.indexOf(stage === 'forging' ? 'reveal' : (stage as typeof stages[number]));

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-ash">
        {stages.map((s, i) => (
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

      {stage === 'stats' && archetype && (
        <DiceRoll archetype={archetype} onComplete={handleStatsComplete} />
      )}

      {stage === 'wheel' && archetype && stats && (
        <WhisperWheel
          archetype={archetype}
          overallRank={getOverallRank(stats)}
          onComplete={handleWheelComplete}
        />
      )}

      {stage === 'forging' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="font-fantasy text-lg text-gold animate-pulse">
            {forgingMessage}
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
