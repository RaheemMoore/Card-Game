interface Props {
  heroName: string;
  completed: boolean;
  nextHeroName?: string;
  onWait: () => void;
  compact?: boolean;
}

/** Plain-language lockout state used by both desktop and mobile combat. */
export function NoAbilitiesTurnNotice({
  heroName,
  completed,
  nextHeroName,
  onWait,
  compact = false,
}: Props) {
  return (
    <div
      role="status"
      aria-label={`${heroName} has no abilities available this turn`}
      style={{
        padding: compact ? '7px 9px' : '9px 10px',
        borderRadius: 7,
        border: `1px solid ${completed ? 'rgba(91,165,112,0.72)' : 'rgba(211,88,73,0.82)'}`,
        background: completed
          ? 'linear-gradient(135deg, rgba(20,61,39,0.96), rgba(8,22,17,0.98))'
          : 'linear-gradient(135deg, rgba(91,25,22,0.97), rgba(28,9,10,0.98))',
        boxShadow: completed
          ? '0 0 18px rgba(72,160,101,0.16)'
          : '0 0 20px rgba(210,65,48,0.2)',
      }}
    >
      <div style={{ color: completed ? '#a9e2b5' : '#ffb19f', font: `900 ${compact ? 9 : 10}px/1.2 Inter, system-ui, sans-serif`, letterSpacing: 1.35 }}>
        {completed ? 'WAIT LOCKED · CHOICE COMPLETE' : 'NO ABILITIES THIS TURN'}
      </div>
      <div style={{ marginTop: 3, color: '#ead9bd', font: `600 ${compact ? 9 : 10}px/1.35 Inter, system-ui, sans-serif` }}>
        {completed
          ? `${heroName} will not attack. ${nextHeroName ? `Continue with ${nextHeroName}.` : 'The party is ready.'}`
          : 'Cooldown, charge, and Mana/Tech locks are shown below. This card cannot attack.'}
      </div>
      {!completed && (
        <button
          type="button"
          onClick={onWait}
          style={{
            width: '100%',
            marginTop: compact ? 5 : 7,
            minHeight: compact ? 27 : 31,
            borderRadius: 5,
            border: '1px solid rgba(255,190,118,0.85)',
            background: 'linear-gradient(to bottom, #d07831, #7a321e)',
            color: '#fff5df',
            font: `900 ${compact ? 9 : 10}px/1 Inter, system-ui, sans-serif`,
            letterSpacing: 1.2,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          WAIT &amp; CONTINUE TO NEXT CARD
        </button>
      )}
    </div>
  );
}
