import { Navigate } from 'react-router-dom';

/**
 * Where `/` sends a signed-in player.
 *
 * WHY THIS EXISTS: `/` used to render the Forge directly. That is fine until
 * the castle becomes home — and it broke the login flow in a way that is easy
 * to miss, because Google SSO redirects back to `window.location.origin`, which
 * is `/`. Signing in with Google therefore landed on the Forge no matter what
 * the login page's own post-sign-in navigation said. Raheem: "Just logged in
 * and got sent straight to the forge."
 *
 * Resolving it here rather than in the login page covers every route into `/` —
 * OAuth redirect, a bookmark, someone typing the bare domain — instead of only
 * the one path that happened to be tested.
 *
 * PHONE PORTRAIT STILL GOES TO THE FORGE. The courtyard's cover-scale shows
 * roughly 530 of its 1536 world width at that aspect, so two of the four stalls
 * are permanently off screen. That is a broken castle, not a small one. Phone
 * gets its own treatment as a single piece of work later.
 */
export function landingRoute(): string {
  // THE STUDIO'S FRONT DOOR IS THE STUDIO. The same codebase deploys as three
  // products, and on the Studio deployment `/` landing in the courtyard meant
  // the operator link and the player link opened the identical page — Raheem,
  // 2026-08-12: "the studio link and the game link both take you to the castle."
  //
  // Set by `vite build --mode studio` (see vite.config.ts), so it travels with
  // the build rather than with dashboard configuration. Unset — local `npm run
  // dev`, and any build that is not the studio — keeps the courtyard, because
  // that is what you want open while working on the game.
  //
  // Width is not consulted here: the admin shell has its own responsive
  // treatment (compact rail, tablet drawer), so there is no narrow fallback to
  // make.
  if (import.meta.env.VITE_HOME_SURFACE === 'admin') return '/admin';

  const narrow = window.matchMedia(
    '(max-width: 767px), (orientation: portrait) and (max-width: 900px)',
  ).matches;
  return narrow ? '/forge' : '/castle';
}

export function Landing() {
  // `replace` so Back does not bounce between `/` and the castle forever.
  return <Navigate to={landingRoute()} replace />;
}
