// The Game deployment's copy of the Leonardo proxy route. See the note in
// anthropic-messages.ts — the implementation deliberately stays shared.
//
// vercel.json rewrites /api/leonardo/<path> onto this route's ?leonardoPath=
// query parameter, exactly as the Studio's own vercel.json does. The handler's
// method + sub-path allowlist is what keeps this from being an open proxy to a
// paid account, so the two configs must not drift.
export { default, config } from '../../card-engine/api/leonardo.js';
