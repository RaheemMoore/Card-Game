import { useEffect, useState } from 'react';
import { PixelButton } from '../../components/ui/PixelButton';
import { StallShell } from '../../components/ui/StallShell';
import type { Stage } from '../../components/ui/StageRail';

/**
 * `/dev/stall-shell` — the shared stall case with a stage rail, no account.
 *
 * The Forge's real flow is gated behind sign-in AND spends premium currency at
 * its last step, so the shell it lives in cannot be reviewed through the Forge
 * itself without both a session and money. This exercises the chrome — rail,
 * scroll region, footer, bottom sheet — against filler content, so layout faults
 * surface here rather than in a paid flow.
 *
 * The stage names are the Forge's real ones, because the rail's whole argument
 * is that named steps beat numbered pills and that only holds if the names are
 * the ones a player actually sees.
 */

const FORGE_STAGES: Stage[] = [
  { id: 'archetype', label: 'Archetype' },
  { id: 'stats', label: 'The Roll' },
  { id: 'element', label: 'Element' },
  { id: 'pillars', label: 'Story' },
  { id: 'forge', label: 'Forge' },
];

export function StallShellPreview() {
  const [step, setStep] = useState(0);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 720);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'url(/assets/castle/courtyard.png) center/cover fixed',
      }}
    >
      <StallShell
        title="The Crafting Stall"
        subtitle="Shell preview"
        stages={FORGE_STAGES}
        currentStage={step}
        narrow={narrow}
        onClose={() => window.location.reload()}
        footerNote={`Step ${step + 1} of ${FORGE_STAGES.length} — ${FORGE_STAGES[step].label}`}
        footer={
          <>
            <PixelButton scale={1.2} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </PixelButton>
            <PixelButton
              onClick={() => setStep((s) => Math.min(FORGE_STAGES.length - 1, s + 1))}
            >
              Next step
            </PixelButton>
          </>
        }
      >
        {/* Enough filler to force the scroll region to do its job. */}
        <div style={{ display: 'grid', gap: 12 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              style={{
                padding: 16,
                background: 'rgba(58,44,34,0.55)',
                border: '1px solid rgba(201,162,39,0.25)',
                color: '#cbb9a0',
                fontSize: 13,
              }}
            >
              Filler row {i + 1} — stands in for the archetype grid, the dice, the element
              buckets or the story pillar questions, depending on the step.
            </div>
          ))}
        </div>
      </StallShell>
    </div>
  );
}
