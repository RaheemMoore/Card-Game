import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArchetypeName, CardStats, Card, AbilityHistorySnapshot } from '../types/card';
import type { CardAbilityReference } from '../types/abilities';
import type { ElementName, ElementSelection, StoryPillarAnswers } from '../types/bible';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { DiceRoll } from '../components/DiceRoll';
import { StoryPillarWizard } from '../components/StoryPillarWizard';
import { BondPicker } from '../components/BondPicker';
import { rollElement } from '../services/elementRoller';
import { CardRenderer } from '../components/CardRenderer';
import { buildCardShell } from '../services/cardGenerator';
import { generateCardText } from '../services/claudeApi';
import { generatePortraitStrict } from '../services/leonardoApi';
import { saveCard } from '../services/storage';
import { proposeAbility } from '../services/abilities/proposalService';
import { getAbilityStore, saveReference } from '../services/abilities/registry';
import { grantDiscoveryReward } from '../services/abilities/discoveryLedger';
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
 * Whisper wheel and modifier pool are retired. Story Pillar answers and the
 * element + bond are the ONLY player-provided inputs to the Bible pipeline.
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

type Stage = 'archetype' | 'stats' | 'pillars' | 'element' | 'forging' | 'reveal';

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
  const [storyPillars, setStoryPillars] = useState<StoryPillarAnswers | null>(null);
  const [rolledElement, setRolledElement] = useState<ElementName | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [relicDiscovery, setRelicDiscovery] = useState<
    { abilityId: string; resource?: BadgeResource } | null
  >(null);
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
    setStage('pillars');
  }

  function handlePillarsComplete(answers: StoryPillarAnswers) {
    if (!archetype) return;
    setStoryPillars(answers);
    // Bible §Element rarity gates + BUCKET_WEIGHTS — auto-roll the element
    // now that the Story Pillar answers are locked in. Player only chooses
    // the bond in the next stage. See services/elementRoller.ts.
    setRolledElement(rollElement(archetype, answers));
    setStage('element');
  }

  async function handleElementComplete(element: ElementSelection) {
    if (!archetype || !stats || !storyPillars) return;
    if (forgingStarted.current) return;

    // Reserve premium currency before we spend an API call. On failure
    // (Leonardo down, moderator block, network drop) we refund.
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
      // Whisper words is a legacy field on the Card shell; keep it as a
      // short derived list from Story Pillar answers so old renderers
      // (Codex search) still have something to key on.
      const whisperWords = storyPillars.answers
        .slice(0, 3)
        .map((a) => a.answer.split(/\s+/).slice(0, 3).join(' '));
      const shell = buildCardShell(archetype, stats, whisperWords);

      const text = await generateCardText({
        archetype,
        stats,
        answers: storyPillars,
        element,
        abilitySlotToFill: 'core',
      });

      const portrait = await generatePortraitStrict(
        text.portraitPrompt,
        text.negativePrompt,
      );

      let abilityHistorySnapshot: AbilityHistorySnapshot[] = [];
      if (text.abilityCandidate) {
        try {
          const outcome = proposeAbility(getAbilityStore(), {
            candidate: text.abilityCandidate,
            userId: getCurrentUserId() ?? 'anon',
          });
          if (outcome.kind === 'attached') {
            const ref: CardAbilityReference = {
              cardId: shell.cardId,
              abilityId: outcome.abilityId,
              abilityVersionId: outcome.abilityVersionId,
              slotType: 'core',
              localTier: 'Foundation',
              displayOrder: 0,
            };
            saveReference(ref);
            abilityHistorySnapshot = [{
              abilityId: outcome.abilityId,
              abilityVersionId: outcome.abilityVersionId,
              slotType: 'core',
            }];
            if (outcome.firstDiscoveryForPlayer) {
              const reward = grantDiscoveryReward(getAbilityStore(), outcome.abilityId);
              if (reward.kind === 'granted') {
                const summary = reward.items.map((i) => `+${i.amount} ${i.currency}`).join(', ');
                if (import.meta.env.DEV) console.debug(`[forge] discovery reward granted: ${summary}`);
              }
              const version = getAbilityStore().getCurrentVersion(outcome.abilityId);
              const resource: BadgeResource | undefined =
                version?.resourceType === 'mana' || version?.resourceType === 'tech'
                  ? version.resourceType
                  : undefined;
              setRelicDiscovery({ abilityId: outcome.abilityId, resource });
            }
          } else if (outcome.kind === 'rejected') {
            console.warn('[forge] ability candidate rejected:', outcome.errors);
          }
        } catch (err) {
          console.warn('[forge] ability proposal failed, card ships without ability:', err);
        }
      }

      const fullCard: Card = {
        ...shell,
        cardName: text.cardName,
        nameAndTitle: text.nameAndTitle,
        lore: text.lore,
        portraitAsset: portrait,
        storyPillars,
        elementSelection: element,
        hiddenFate: text.hiddenFate,
        abilityHistory: abilityHistorySnapshot.length > 0
          ? { Foundation: abilityHistorySnapshot }
          : undefined,
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
      setForgeError(err instanceof Error ? err.message : String(err));
      setStage('element');
    }
  }

  function handleForgeAnother() {
    forgingStarted.current = false;
    setStage('archetype');
    setArchetype(null);
    setStats(null);
    setStoryPillars(null);
    setRolledElement(null);
    setCard(null);
    setForgeError(null);
  }

  const stages = ['archetype', 'stats', 'pillars', 'element', 'reveal'] as const;
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

      {stage === 'pillars' && archetype && (
        <StoryPillarWizard archetype={archetype} onComplete={handlePillarsComplete} />
      )}

      {stage === 'element' && archetype && storyPillars && rolledElement && (
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

      {stage === 'reveal' && card && relicDiscovery && (
        <RelicDiscoveryModal
          abilityId={relicDiscovery.abilityId}
          moment="discovery"
          resourceAccent={relicDiscovery.resource}
          onClose={() => setRelicDiscovery(null)}
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
