import type { AnimationBeat } from '../../services/combat/presentation/types';

interface Props {
  currentBeat: AnimationBeat | null;
  actorId: string;
}

/**
 * Rises + fades over its parent for the beat's duration. Rendered as an
 * absolutely-positioned overlay; parent must be `position: relative`.
 * The `key` prop off beat.id means React re-mounts on every new beat so
 * the CSS animation always replays from the start.
 */
export function FloatingDamage({ currentBeat, actorId }: Props) {
  if (!currentBeat) return null;
  const info = describe(currentBeat, actorId);
  if (!info) return null;

  return (
    <div
      key={currentBeat.id}
      className="absolute inset-0 pointer-events-none flex items-start justify-center z-20"
      aria-hidden
    >
      <span
        className="font-fantasy font-bold text-2xl select-none floating-damage"
        style={{
          color: info.color,
          textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.55)',
        }}
      >
        {info.text}
      </span>
      <style>{`
        @keyframes float-damage {
          0%   { opacity: 0;   transform: translateY(24px) scale(0.85); }
          15%  { opacity: 1;   transform: translateY(0)    scale(1.05); }
          75%  { opacity: 1;   transform: translateY(-28px) scale(1); }
          100% { opacity: 0;   transform: translateY(-48px) scale(0.9); }
        }
        .floating-damage {
          animation: float-damage 800ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .floating-damage {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function describe(
  beat: AnimationBeat,
  actorId: string,
): { text: string; color: string } | null {
  const e = beat.event;
  switch (e.kind) {
    case 'damage_dealt':
      if (e.targetActorId !== actorId) return null;
      return { text: `-${e.amount}`, color: '#ff6b6b' };
    case 'healing_applied':
      if (e.targetActorId !== actorId) return null;
      return { text: `+${e.amount}`, color: '#5adf85' };
    case 'shield_gained':
      if (e.targetActorId !== actorId) return null;
      return { text: `🛡 +${e.amount}`, color: '#8ec5ff' };
    default:
      return null;
  }
}
