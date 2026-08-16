import { CodexStall } from '../castle/stalls/CodexStall';

/**
 * `/dev/codex-stall` â€” the Codex book over the courtyard, no account needed.
 *
 * It reads shipped element artwork, archetype emblems and Bible prose. No player
 * data, no session, nothing spent â€” so it is free to open and safe to leave
 * ungated, same tier as the other stall previews.
 */
export function CodexStallPreview() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #2b1e3d 0%, #8c4a2f 62%, #d98b45 100%) center/cover fixed',
      }}
    >
      <CodexStall onClose={() => window.location.reload()} />
    </div>
  );
}
