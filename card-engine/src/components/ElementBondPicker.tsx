import { useCallback, useMemo, useState } from 'react';
import type { ArchetypeName } from '../types/card';
import type {
  ElementBond,
  ElementCompatibility,
  ElementName,
  ElementSelection,
  StoryPillarAnswers,
} from '../types/bible';
import { ELEMENT_BONDS } from '../types/bible';
import {
  BUCKET_WEIGHTS,
  bucketFor,
  elementIsNarrativelyEligible,
  elementsAvailableToArchetype,
} from '../data/elements';

/**
 * Element + bond picker — Bible §Global Element Pillar.
 *
 * Two-step flow:
 *   1. "Which power calls to you?" — shows ~5 elements weighted by
 *      compatibility bucket (Naturally Compatible more often than
 *      Compatible Through Reinterpretation more often than Rare). Rare
 *      elements are gated by narrative eligibility per Bible §Element
 *      rarity — Story Pillar answers must support the element.
 *   2. "What is your bond with this power?" — the ten approved bonds.
 *
 * Refresh reshuffles the element pool. No free-form input.
 */

const OPTIONS_PER_ROUND = 5;

interface ElementBondPickerProps {
  archetype: ArchetypeName;
  answers: StoryPillarAnswers;
  onComplete: (selection: ElementSelection) => void;
}

const COMPATIBILITY_LABEL: Record<ElementCompatibility, string> = {
  naturally_compatible: 'Naturally Compatible',
  compatible_through_reinterpretation: 'Compatible Through Reinterpretation',
  rare: 'Rare',
  not_available: 'Not Available',
};

const COMPATIBILITY_STYLE: Record<ElementCompatibility, { ring: string; text: string; hint: string }> = {
  naturally_compatible: {
    ring: 'border-emerald-500/50',
    text: 'text-emerald-300',
    hint: 'This power fits your kind naturally.',
  },
  compatible_through_reinterpretation: {
    ring: 'border-sky-400/50',
    text: 'text-sky-300',
    hint: 'This power fits when it is reinterpreted through your archetype.',
  },
  rare: {
    ring: 'border-fuchsia-400/60',
    text: 'text-fuchsia-300',
    hint: 'This power rarely finds a home in your kind — but your story allows it.',
  },
  not_available: {
    ring: 'border-slate-dark',
    text: 'text-ash',
    hint: 'This power does not answer to your archetype.',
  },
};

export function ElementBondPicker({ archetype, answers, onComplete }: ElementBondPickerProps) {
  const [chosenElement, setChosenElement] = useState<ElementName | null>(null);
  const [shown, setShown] = useState<ElementName[]>(() =>
    sampleElements(archetype, answers, OPTIONS_PER_ROUND, []),
  );

  const refresh = useCallback(() => {
    setShown((prev) => sampleElements(archetype, answers, OPTIONS_PER_ROUND, prev));
  }, [archetype, answers]);

  const pickElement = useCallback((element: ElementName) => {
    setChosenElement(element);
  }, []);

  const pickBond = useCallback(
    (bond: ElementBond) => {
      if (!chosenElement) return;
      onComplete({
        element: chosenElement,
        bond,
        compatibility: bucketFor(archetype, chosenElement),
      });
    },
    [archetype, chosenElement, onComplete],
  );

  const chosenCompatibility = useMemo(
    () => (chosenElement ? bucketFor(archetype, chosenElement) : null),
    [archetype, chosenElement],
  );

  if (!chosenElement) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h2 className="font-fantasy text-2xl font-bold text-ivory">
            Which power calls to you?
          </h2>
          <p className="text-ash text-sm italic">
            The power you accept will shape their body, environment, materials, and
            how the world responds to them.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shown.map((element) => {
            const bucket = bucketFor(archetype, element);
            const style = COMPATIBILITY_STYLE[bucket];
            return (
              <button
                key={element}
                onClick={() => pickElement(element)}
                className={`rounded-lg border-2 bg-obsidian/60 p-3 text-left transition-all hover:scale-[1.02] ${style.ring}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-fantasy text-lg font-bold text-ivory">
                    {element}
                  </span>
                  <span className={`text-[9px] uppercase tracking-widest ${style.text}`}>
                    {COMPATIBILITY_LABEL[bucket]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-bone/60 italic">{style.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={refresh}
            className="px-5 py-2 rounded-lg border border-slate-dark text-ash hover:text-ivory
              hover:border-ash/60 font-fantasy text-sm transition-colors"
          >
            ↻ Show different powers
          </button>
        </div>
      </div>
    );
  }

  // Bond selection
  const style = chosenCompatibility ? COMPATIBILITY_STYLE[chosenCompatibility] : COMPATIBILITY_STYLE.naturally_compatible;
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <header className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">
          What is your bond with {chosenElement}?
        </h2>
        <p className={`text-xs italic ${style.text}`}>
          {chosenCompatibility ? COMPATIBILITY_LABEL[chosenCompatibility] : ''}
        </p>
      </header>

      <div className="space-y-2">
        {ELEMENT_BONDS.map((bond) => (
          <button
            key={bond}
            onClick={() => pickBond(bond)}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-dark
              bg-obsidian/60 font-fantasy text-sm text-bone/90
              hover:text-ivory hover:border-gold/60 transition-colors"
          >
            {bond}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setChosenElement(null)}
          className="px-4 py-1.5 rounded-lg text-ash hover:text-ivory
            font-fantasy text-xs transition-colors"
        >
          ← Choose a different power
        </button>
      </div>
    </div>
  );
}

// ---------- Element sampling ----------

/**
 * Sample five elements weighted by compatibility bucket, gated by narrative
 * eligibility for Rare per Bible §Element rarity. Avoids repeats where
 * possible so the refresh shows a genuinely different set.
 */
function sampleElements(
  archetype: ArchetypeName,
  answers: StoryPillarAnswers,
  count: number,
  previouslyShown: ElementName[],
): ElementName[] {
  const all = elementsAvailableToArchetype(archetype);
  const eligible = all.filter((e) => elementIsNarrativelyEligible(archetype, e, answers.answers));

  // Build a weighted pool per Bible §Element rarity (weights = discovery
  // frequency, not power).
  const pool: { element: ElementName; weight: number }[] = eligible.map((e) => ({
    element: e,
    weight: BUCKET_WEIGHTS[bucketFor(archetype, e)],
  }));

  const previouslySet = new Set(previouslyShown);
  const preferring = pool.filter((p) => !previouslySet.has(p.element));
  const source = preferring.length >= count ? preferring : pool;

  const chosen: ElementName[] = [];
  const taken = new Set<ElementName>();
  const remaining = [...source];
  while (chosen.length < count && remaining.length > 0) {
    const total = remaining.reduce((sum, p) => sum + p.weight, 0);
    let target = Math.random() * total;
    let idx = 0;
    for (; idx < remaining.length; idx++) {
      target -= remaining[idx].weight;
      if (target <= 0) break;
    }
    const pick = remaining[Math.min(idx, remaining.length - 1)];
    if (!taken.has(pick.element)) {
      taken.add(pick.element);
      chosen.push(pick.element);
    }
    remaining.splice(Math.min(idx, remaining.length - 1), 1);
  }
  return chosen;
}
