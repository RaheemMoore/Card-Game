import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArchetypeName, CardStats, Card } from '../types/card';
import type { ElementName, ElementSelection, StoryPillarAnswers } from '../types/bible';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { DiceRoll } from '../components/DiceRoll';
import { StoryPillarWizard } from '../components/StoryPillarWizard';
import { BondPicker } from '../components/BondPicker';
import { rollElement } from '../services/elementRoller';
import { CardRenderer } from '../components/CardRenderer';
import * as forgeController from '../services/forge/forgeController';
import { useForgeJob } from '../services/forge/useForgeJob';
import * as wallet from '../services/economy/walletService';
import { PREMIUM_PRICE_CATALOG } from '../data/economy/premiumPriceCatalog';
import { CurrencyCost } from '../components/economy/CurrencyCost';
import { InsufficientFundsModal } from '../components/economy/InsufficientFundsModal';
import { useBalance } from '../services/economy/useWallet';
import { AuthModal } from '../components/AuthModal';
import { RelicDiscoveryModal } from '../components/RelicDiscoveryModal';
import { getCurrentUserId, isCurrentUserAnonymous } from '../services/persistence/supabaseClient';
import type { BadgeResource } from '../components/abilities';

/**
 * Card Forge — Bible-driven flow.
 *
 * Stages: archetype → stats (dice) → story pillars → element + bond → forge → reveal.
 *
 * The forge itself (Claude → Leonardo, 20–60s) does NOT run in this component.
 * It runs in the forgeController singleton so it survives navigation and reload
 * and can never orphan a premium reservation. This page just drives the wizard,
 * hands the inputs to the controller, and renders the forging/reveal states off
 * the observed job.
 */

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

type WizardStage = 'archetype' | 'stats' | 'pillars' | 'element';

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
  const job = useForgeJob();

  const [stage, setStage] = useState<WizardStage>('archetype');
  const [archetype, setArchetype] = useState<ArchetypeName | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [storyPillars, setStoryPillars] = useState<StoryPillarAnswers | null>(null);
  const [rolledElement, setRolledElement] = useState<ElementName | null>(null);

  // The reveal is copied out of the job the moment it succeeds, then the job is
  // acknowledged — this clears the persisted record + the global indicator while
  // keeping the ceremony on screen. Card is already saved to the collection.
  const [revealCard, setRevealCard] = useState<Card | null>(null);
  const [revealRelic, setRevealRelic] = useState<{ abilityId: string; resource?: BadgeResource } | null>(null);

  const [forgingMessage, setForgingMessage] = useState(FORGING_MESSAGES[0]);
  const [forgeError, setForgeError] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const messageInterval = useRef<ReturnType<typeof setInterval>>(null);
  const premiumBalance = useBalance('premium');

  const isForging = job?.status === 'running';
  const showReveal = revealCard !== null;

  // Rotate the reassuring forge copy while a job runs.
  useEffect(() => {
    if (!isForging) return;
    let idx = 0;
    messageInterval.current = setInterval(() => {
      idx = (idx + 1) % FORGING_MESSAGES.length;
      setForgingMessage(FORGING_MESSAGES[idx]);
    }, 3000);
    return () => {
      if (messageInterval.current) clearInterval(messageInterval.current);
    };
  }, [isForging]);

  // React to job completion. Runs whether the forge finished here or in the
  // background while the player was on another page and returned.
  useEffect(() => {
    if (!job) return;
    if (job.status === 'succeeded' && job.card) {
      setRevealCard(job.card);
      setRevealRelic(
        job.relicDiscovery
          ? { abilityId: job.relicDiscovery.abilityId, resource: job.relicDiscovery.resource }
          : null,
      );
      setForgeError(null);
      if (shouldShowFirstForgePrompt()) setShowSignupPrompt(true);
      forgeController.acknowledge();
    } else if (job.status === 'failed') {
      setForgeError(job.error ?? 'The forge failed.');
      forgeController.acknowledge();
      // Return the player to the bond picker to retry when the wizard inputs
      // are still around (no reload happened); otherwise send them to the start.
      if (archetype && stats && storyPillars && rolledElement) {
        setStage('element');
      } else {
        resetWizard();
        setStage('archetype');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  function resetWizard() {
    setArchetype(null);
    setStats(null);
    setStoryPillars(null);
    setRolledElement(null);
  }

  function handleArchetypeSelect(a: ArchetypeName) {
    setArchetype(a);
    setStage('stats');
  }

  function handleStatsComplete(s: CardStats) {
    setStats(s);
    setStage('pillars');
  }

  function handlePillarsComplete(answers: StoryPillarAnswers) {
    if (!archetype) return;
    setStoryPillars(answers);
    // Bible §Element rarity gates + BUCKET_WEIGHTS — auto-roll the element now
    // that the Story Pillar answers are locked in. Player only chooses the bond
    // in the next stage. See services/elementRoller.ts.
    setRolledElement(rollElement(archetype, answers));
    setStage('element');
  }

  function handleElementComplete(element: ElementSelection) {
    if (!archetype || !stats || !storyPillars) return;
    setForgeError(null);
    try {
      forgeController.startForge({ archetype, stats, storyPillars, element });
    } catch (err) {
      if (err instanceof wallet.InsufficientFundsError) {
        setInsufficientFunds(true);
        return;
      }
      throw err;
    }
  }

  function handleForgeAnother() {
    setRevealCard(null);
    setRevealRelic(null);
    setForgeError(null);
    resetWizard();
    setStage('archetype');
  }

  const stages = ['archetype', 'stats', 'pillars', 'element', 'reveal'] as const;
  const activeKey: typeof stages[number] = isForging || showReveal ? 'reveal' : stage;
  const stageIndex = stages.indexOf(activeKey);

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-ash">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-slate-dark" />}
            <span
              className={`px-2 py-0.5 rounded-full font-fantasy transition-colors ${
                activeKey === s || stageIndex > i
                  ? 'bg-gold/20 text-gold'
                  : 'bg-slate-dark text-ash'
              }`}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {!isForging && !showReveal && stage === 'archetype' && (
        <ArchetypeSelector onSelect={handleArchetypeSelect} />
      )}

      {!isForging && !showReveal && stage === 'stats' && archetype && (
        <DiceRoll archetype={archetype} onComplete={handleStatsComplete} />
      )}

      {!isForging && !showReveal && stage === 'pillars' && archetype && (
        <StoryPillarWizard archetype={archetype} onComplete={handlePillarsComplete} />
      )}

      {!isForging && !showReveal && stage === 'element' && archetype && storyPillars && rolledElement && (
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
          <BondPicker
            archetype={archetype}
            element={rolledElement}
            onComplete={handleElementComplete}
          />
        </div>
      )}

      {isForging && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="font-fantasy text-lg text-gold animate-pulse">
            {forgingMessage}
          </p>
          <p className="text-xs text-ash max-w-xs text-center">
            Your card is in the forge — this takes a moment. You can leave this page;
            the forge keeps working and we'll flag it when your card is ready.
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

      {showReveal && revealCard && revealRelic && (
        <RelicDiscoveryModal
          abilityId={revealRelic.abilityId}
          moment="discovery"
          resourceAccent={revealRelic.resource}
          onClose={() => setRevealRelic(null)}
        />
      )}

      {showReveal && revealCard && (
        <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.8s_ease-out]">
          <CardRenderer card={revealCard} />

          {revealCard.lore && (
            <div className="max-w-sm text-center">
              <p className="text-ash italic text-sm leading-relaxed">
                "{revealCard.lore}"
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/card/${revealCard.cardId}`)}
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
