interface Props {
  onClose: () => void;
}

interface GuideSection {
  title: string;
  body: string;
}

/**
 * Scoped to what's actually in the game right now — no Focus/Inspect (both
 * removed), no auto-battle (still a stub). Keep this list in sync with the
 * command shelf; a Guide describing a button that doesn't exist is worse
 * than no Guide at all.
 */
const SECTIONS: GuideSection[] = [
  {
    title: 'Energy',
    body: 'The blue number next to your abilities is your mana/tech. Abilities spend it; it refills a little every round.',
  },
  {
    title: 'Abilities',
    body: 'Tap a slot to arm it and see a preview — cost, target, and projected damage. If it needs a specific ally, tap them in the arena. Confirm to fire, or Cancel to back out.',
  },
  {
    title: 'Cooldowns',
    body: 'A slot on cooldown shows "COOLDOWN (N)" — N rounds left before it\'s usable again, ticking down once per round.',
  },
  {
    title: 'Guard',
    body: 'Free — no cost, no cooldown. Grants a shield and a little ultimate charge. Good default when you\'re not sure what else to do.',
  },
  {
    title: 'Rounds left',
    body: 'The fight times out at round 30 — shown on the turn badge, top-right. Running out is a loss, so don\'t stall forever.',
  },
  {
    title: 'Boss intent',
    body: "The boss always telegraphs its next move before it happens, and it cannot change once declared — what you see is exactly what's coming.",
  },
];

export function CombatGuideModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 60, background: 'rgba(4,3,8,0.75)', backdropFilter: 'blur(2px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Combat guide"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[80vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(to bottom, #18110a, #0b0806)',
          border: '1.5px solid #b8862a',
          borderRadius: 8,
          boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 24px rgba(235,150,46,0.2)',
          padding: 20,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              color: '#ebd1a3',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1.2,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            HOW TO FIGHT
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              border: '1px solid #573b1f',
              background: '#0f0e0f',
              color: '#d6c7a8',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <div
                style={{
                  color: '#f0942e',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  marginBottom: 2,
                }}
              >
                {s.title.toUpperCase()}
              </div>
              <div
                style={{
                  color: '#d6c7a8',
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
