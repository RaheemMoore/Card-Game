/**
 * Portable VFX module — public types.
 *
 * PORTABILITY CONTRACT: nothing under `src/vfx/` may import from
 * `types/combat`, `services/combat`, or `types/bible`. This module takes a
 * config and a DOM node and returns visuals; it never learns what a battle,
 * an ability, or an archetype is. That is what lets it be lifted into the
 * next game wholesale. The one legal seam is TYPE-ONLY and one-way: game
 * code may import `MotionLevel` from here, never the reverse.
 */

/**
 * How much motion the player has consented to.
 *
 * 'off'    — no motion at all. Effects still render, statically, for their
 *            full duration; the player must never lose INFORMATION to this
 *            setting, only movement. Forced by `prefers-reduced-motion`.
 * 'subtle' — sprite-level only: hitstop, flashes, lunges. No screen-space
 *            effects, no arena shake.
 * 'full'   — everything.
 */
export type MotionLevel = 'off' | 'subtle' | 'full';
