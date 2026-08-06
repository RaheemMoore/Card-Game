import { useEffect, useState } from 'react';
import type { ArchetypeName, CardStats } from '../../types/card';
import type { ElementSelection, StoryPillarAnswers } from '../../types/bible';
import { archetypeBackgroundFor } from '../../data/archetypeBackgrounds';
import { ArchetypeSelector } from '../../components/ArchetypeSelector';
import { DiceRoll } from '../../components/DiceRoll';
import { ElementPicker } from '../../components/ElementPicker';
import { StoryPillarWizard } from '../../components/StoryPillarWizard';
import { PixelButton } from '../../components/ui/PixelButton';
import { StallShell } from '../../components/ui/StallShell';
import type { Stage } from '../../components/ui/StageRail';

/**
 * `/dev/forge-stall` — a DESIGN PREVIEW of the Forge inside the pixel case.
 *
 * ================= THIS DOES NOT REPLACE THE WEB FORGE =================
 *
 * Raheem, 2026-08-04, emphatically: "Do not get rid of the current forge
 * process, the web browser forge process... The forge process needs to be done
 * through the web as well. I wanna see what your UI looks like to see if we can
 * replace the web with this. But do not remove it until we completely approve
 * this, because this is the most critical aspect of the game."
 *
 * So `/forge` and `pages/CardForge.tsx` are UNTOUCHED and stay the real,
 * shipping flow. This route exists purely so the case-and-rail treatment can be
 * judged side by side against it. Deleting or rerouting the web forge is a
 * decision only Raheem makes, after seeing both.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO — and must not, until it is the real one:
 *
 *   - It never calls `forgeController`. No Claude call, no Leonardo call.
 *   - It never touches the wallet. No reservation, no commit, no refund.
 *   - It reads no session and writes no card.
 *
 * That is why it can be ungated and free to open. The four stage components
 * below are pure UI with callback props, so driving them from local state
 * exercises the REAL archetype grid, dice, element buckets and pillar
 * questions — what is mocked is only the irreversible last step.
 *
 * The final step therefore shows what the real forge WOULD charge and stops.
 * A preview that spends premium currency is not a preview.
 */

const STAGES: Stage[] = [
  { id: 'archetype', label: 'Archetype' },
  { id: 'stats', label: 'The Roll' },
  { id: 'element', label: 'Element' },
  { id: 'pillars', label: 'Story' },
  { id: 'forge', label: 'Forge' },
];

export function ForgeStallPreview() {
  const [step, setStep] = useState(0);
  const [archetype, setArchetype] = useState<ArchetypeName | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [element, setElement] = useState<ElementSelection | null>(null);
  const [answers, setAnswers] = useState<StoryPillarAnswers | null>(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 720);

  // The commissioned archetype plate, once there is an archetype to show one
  // for. Raheem: "we crafted very special backgrounds for each archetype... I
  // wanna make sure that art is still enjoyed." Portrait crop on phone, because
  // the landscape plates put their subject where a phone would crop it out.
  const backdrop = archetypeBackgroundFor(archetype);
  const backdropSrc = backdrop ? (narrow ? backdrop.portrait : backdrop.landscape) : undefined;

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const reset = () => {
    setStep(0);
    setArchetype(null);
    setStats(null);
    setElement(null);
    setAnswers(null);
  };

  // Mirrors the shipped order exactly — archetype, dice, ELEMENT, then pillars.
  // The element comes before the story in the image-first pipeline, and a
  // preview that reorders the ritual is not previewing the ritual.
  const body = (() => {
    if (step === 0) {
      return (
        <ArchetypeSelector
          onSelect={(a) => {
            setArchetype(a);
            setStep(1);
          }}
        />
      );
    }
    if (step === 1 && archetype) {
      return (
        <DiceRoll
          archetype={archetype}
          onComplete={(s) => {
            setStats(s);
            setStep(2);
          }}
        />
      );
    }
    if (step === 2 && archetype) {
      return (
        <ElementPicker
          wide
          archetype={archetype}
          onComplete={(sel) => {
            setElement(sel);
            setStep(3);
          }}
        />
      );
    }
    if (step === 3 && archetype) {
      return (
        <StoryPillarWizard
          archetype={archetype}
          onComplete={(a) => {
            setAnswers(a);
            setStep(4);
          }}
        />
      );
    }
    return (
      <div style={{ display: 'grid', gap: 14, color: '#cbb9a0', fontSize: 14 }}>
        <p style={{ margin: 0, color: '#f3d99b', fontSize: 16 }}>
          This is where the real forge would fire.
        </p>
        <p style={{ margin: 0 }}>
          It would charge premium currency, call Claude for the name, title and lore, then
          Leonardo for the portrait. <strong>This preview stops here on purpose</strong> — a
          preview that spends money is not a preview.
        </p>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', margin: 0 }}>
          <dt style={{ color: '#a08c6e' }}>Archetype</dt>
          <dd style={{ margin: 0 }}>{archetype ?? '—'}</dd>
          <dt style={{ color: '#a08c6e' }}>Element</dt>
          <dd style={{ margin: 0 }}>
            {element ? `${element.element} · ${element.bond}` : '—'}
          </dd>
          <dt style={{ color: '#a08c6e' }}>Stats</dt>
          <dd style={{ margin: 0 }}>
            {stats
              ? `ATK ${stats.Atk.value} · DEF ${stats.Def.value}`
              : '—'}
          </dd>
          <dt style={{ color: '#a08c6e' }}>Story answers</dt>
          <dd style={{ margin: 0 }}>{answers ? Object.keys(answers).length : 0} recorded</dd>
        </dl>
      </div>
    );
  })();

  return (
    // No courtyard plate behind this one: full-bleed covers the viewport, so a
    // second background would only ever be visible for a frame.
    <div style={{ minHeight: '100dvh', background: '#07050b' }}>
      <StallShell
        fullBleed
        backdrop={backdropSrc}
        title="The Crafting Stall"
        subtitle="Design preview — the web forge at /forge is unchanged"
        stages={STAGES}
        currentStage={step}
        // The element step lays out in the space it has instead of scrolling —
        // see StallShell's noScroll note. Every other step is content of
        // unknown length and keeps the scroller.
        noScroll={step === 2}
        narrow={narrow}
        onClose={reset}
        scrollLabel="Forge steps"
        footerNote={
          step === 0
            ? 'Choose who you are forging'
            : `${STAGES[step].label}${archetype ? ` · ${archetype}` : ''}`
        }
        footer={
          <>
            {step > 0 && (
              <PixelButton scale={1.2} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </PixelButton>
            )}
            <PixelButton onClick={reset}>Start over</PixelButton>
          </>
        }
      >
        {body}
      </StallShell>
    </div>
  );
}
