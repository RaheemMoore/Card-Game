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
  const narrow = window.matchMedia(
    '(max-width: 767px), (orientation: portrait) and (max-width: 900px)',
  ).matches;
  return narrow ? '/forge' : '/castle';
}

export function Landing() {
  // `replace` so Back does not bounce between `/` and the castle forever.
  return <Navigate to={landingRoute()} replace />;
}
