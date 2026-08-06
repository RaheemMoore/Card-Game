import { CodexStall } from '../castle/stalls/CodexStall';

/**
 * `/dev/codex-stall` — the Codex book over the courtyard, no account needed.
 *
 * It reads shipped element artwork, archetype emblems and Bible prose. No player
 * data, no session, nothing spent — so it is free to open and safe to leave
 * ungated, same tier as the other stall previews.
 */
export function CodexStallPreview() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'url(/assets/castle/courtyard.png) center/cover fixed',
      }}
    >
      <CodexStall onClose={() => window.location.reload()} />
    </div>
  );
}
