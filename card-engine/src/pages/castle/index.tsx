import { CourtyardViewport } from './CourtyardViewport';

/**
 * The castle courtyard — the game's home surface.
 *
 * YOU SPAWN STRAIGHT IN. There used to be a splash here with a STEP OUTSIDE
 * button, from when the courtyard was a technical spike you opted into. Once
 * signing in lands you at the castle, that page is a door in front of a door:
 * you have already chosen to be here, and being asked again reads as the game
 * failing to load. Raheem: "I want to literally spawn as my pixel character in
 * the court yard."
 *
 * There is no "leave" any more either — the pause menu (Esc) carries the nav
 * and sign-out, which is what leaving a home surface actually means.
 */
export function Castle() {
  return <CourtyardViewport />;
}
