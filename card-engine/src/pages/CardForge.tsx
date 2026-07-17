import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArchetypeName, CardStats, Card, ModifierStack } from '../types/card';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { DiceRoll } from '../components/DiceRoll';
import { WhisperWheel } from '../components/WhisperWheel';
import { CardRenderer } from '../components/CardRenderer';
import { buildCardShell } from '../services/cardGenerator';
import { generateCardText } from '../services/claudeApi';
import { generatePortraitStrict } from '../services/leonardoApi';
import { saveCard } from '../services/storage';
import { getOverallRank } from '../data/powerSystem';
import * as wallet from '../services/economy/walletService';
import { PREMIUM_PRICE_CATALOG } from '../data/economy/premiumPriceCatalog';
import { CurrencyCost } from '../components/economy/CurrencyCost';
import { InsufficientFundsModal } from '../components/economy/InsufficientFundsModal';
import { useBalance } from '../services/economy/useWallet';
import { AuthModal } from '../components/AuthModal';
import { getCurrentUserId, isCurrentUserAnonymous } from '../services/persistence/supabaseClient';

// Dismissed once per uid — never nag again for that guest. Real users
// (with email) never see it.
function signupPromptDismissedKey(uid: string): string {
  return `card-engine-signup-prompt-dismissed:${uid}`;
}
function shouldShowFirstForgePrompt(): boolean {
  if (!isCurrentUserAnonymous()) return false;
  const uid = getCurrentUserId();
  if (!uid) return false;
  return !localStorage.getItem(signupPromptDismissedKey(uid));
}
function markFirstForgePromptDismissed(): void {
  const uid = getCurrentUserId();
  if (!uid) return;
  localStorage.setItem(signupPromptDismissedKey(uid), new Date().toISOString());
}

type Stage = 'archetype' | 'stats' | 'wheel' | 'forging' | 'reveal';

const FORGING_MESSAGES = [
  'Summoning your champion...',
  'Painting their portrait...',
  'Inscribing their legend...',
  'Binding fate to form...',
  'Sealing the card...',
];

const FORGE_PRICE = PREMIUM_PRICE_CATALOG.forge_card.premiumCost;

export function CardForge() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('archetype');
  const [archetype, setArchetype] = useState<ArchetypeName | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [forgingMessage, setForgingMessage] = useState(FORGING_MESSAGES[0]);
  const [forgeError, setForgeError] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const messageInterval = useRef<ReturnType<typeof setInterval>>(null);
  const forgingStarted = useRef(false);
  const premiumBalance = useBalance('premium');

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

    // Reserve premium currency before we spend a single API call. On failure
    // (Leonardo down, moderator block, network drop), refund automatically —
    // per the plan's Section 7.2, no paid card ships without a real portrait.
    let reservation;
    try {
      reservation = wallet.reserve({
        currency: 'premium',
        amount: FORGE_PRICE,
        actionId: 'forge_card',
      });
    } catch (err) {
      if (err instanceof wallet.InsufficientFundsError) {
        setInsufficientFunds(true);
        return;
      }
      throw err;
    }

    forgingStarted.current = true;
    setForgeError(null);
    setStage('forging');

    try {
      const shell = buildCardShell(archetype, stats, whisperWords);

      // Claude first (composes the Leonardo prompt), then Leonardo. Both must
      // succeed or the whole action refunds — no half-forged card gets minted.
      const text = await generateCardText(
        archetype,
        stats,
        whisperWords,
        mods,
        undefined,
        undefined,
        false,
        undefined,
        shell.lycanIdentity,
      );
      const portrait = await generatePortraitStrict(
        text.portraitPrompt,
        text.negativePrompt,
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
      wallet.commit(reservation.transactionId);
      setCard(fullCard);
      setStage('reveal');
      if (shouldShowFirstForgePrompt()) setShowSignupPrompt(true);
    } catch (err) {
      wallet.refund(
        reservation.transactionId,
        err instanceof Error ? err.message : String(err),
      );
      forgingStarted.current = false;
      setForgeError(
        err instanceof Error ? err.message : String(err),
      );
      setStage('wheel');
    }
  }

  function handleForgeAnother() {
    forgingStarted.current = false;
    setStage('archetype');
    setArchetype(null);
    setStats(null);
    setCard(null);
    setForgeError(null);
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
        <div className="w-full flex flex-col items-center gap-3">
          <div className="text-xs text-ash flex items-center gap-2">
            <span>Forging will charge</span>
            <CurrencyCost
              currency="premium"
              amount={FORGE_PRICE}
              insufficient={premiumBalance < FORGE_PRICE}
            />
            {premiumBalance < FORGE_PRICE && (
              <span className="text-power">— insufficient balance</span>
            )}
          </div>
          {forgeError && (
            <div className="max-w-md text-xs text-power border border-power/40 rounded-lg p-2 bg-power/5">
              Forge failed: {forgeError}. Your {FORGE_PRICE} was refunded.
            </div>
          )}
          <WhisperWheel
            archetype={archetype}
            overallRank={getOverallRank(stats)}
            onComplete={handleWheelComplete}
          />
        </div>
      )}

      {stage === 'forging' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="font-fantasy text-lg text-gold animate-pulse">
            {forgingMessage}
          </p>
        </div>
      )}

      {insufficientFunds && (
        <InsufficientFundsModal
          currency="premium"
          required={FORGE_PRICE}
          available={premiumBalance}
          actionLabel="Forging a new card"
          onClose={() => setInsufficientFunds(false)}
        />
      )}

      {showSignupPrompt && (
        <AuthModal
          headline="Your card is saved on this browser only."
          body="Create an account and it lives with you — sign in from any device, never lose your collection. Later this will also unlock rules, leaderboards, and trading."
          defaultMode="sign_up"
          onClose={() => {
            markFirstForgePromptDismissed();
            setShowSignupPrompt(false);
          }}
        />
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
