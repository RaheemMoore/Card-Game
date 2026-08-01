import type { RuneHaloSpec } from '../../data/combat/bossSignatureManifest';
import type { MotionLevel } from '../../vfx/types';

/**
 * A rune circle turning behind a boss.
 *
 * ── Why this is not BossWeaponRing ───────────────────────────────────────
 * `bossRingManifest` argues, correctly, that a ring should be individual pieces
 * laid out by code and never one pre-composed image — because the Debt-Bearer's
 * weapons DETACH AND FLY as her moves resolve, and a single image can only ever
 * rotate as a lump. That reasoning is specific to her. A rune circle is supposed
 * to turn as a whole; nothing leaves it. So this is a small separate component
 * rather than a forced reuse, and it borrows the three rules that ring paid for:
 *
 *   - **Baked alpha, never `mix-blend-mode: screen`.** A blend mode composites
 *     against the backdrop WITHIN ITS OWN STACKING CONTEXT, and the boss sprite
 *     box makes one (it is transformed and animated), so the black never drops
 *     out and each plate shows as a grey rectangle. The plates carry alpha
 *     derived from their own luminance instead, which no stacking context can
 *     defeat.
 *   - **Nothing moves in unison.** The two rings counter-rotate on periods that
 *     are not multiples of each other, so they never resynchronise into reading
 *     as one image.
 *   - **Reduced motion stops the MOTION, not the ART.** The circle still hangs
 *     there; it simply stops turning.
 *
 * ── The charge is a STOP ─────────────────────────────────────────────────
 * `act_season_hold`'s telegraph is "The light stops moving across the grove
 * floor." So when it charges, the rings brake to a halt and blaze rather than
 * spinning up. Inverting the resting motion reads much harder than accelerating
 * it — a thing that was moving and has stopped is more alarming than a thing
 * moving faster — and it illustrates the shipped telegraph text literally.
 */
export type HaloPhase = 'idle' | 'charging' | 'firing' | 'defeated' | 'ultimate';

interface Props {
  spec: RuneHaloSpec;
  resolveUrl: (path: string) => string;
  motionLevel: MotionLevel;
  phase?: HaloPhase;
  /** Changes per firing so a repeated flash replays instead of sitting spent. */
  fireKey?: string | number;
}

export function BossRuneHalo({
  spec,
  resolveUrl,
  motionLevel,
  phase = 'idle',
  fireKey = 0,
}: Props) {
  const still = motionLevel === 'off';
  const { scale, centerYOffset, glow } = spec;

  const rings = [
    { path: spec.outer, period: spec.outerPeriodSec, dir: 1, size: 1 },
    { path: spec.inner, period: spec.innerPeriodSec, dir: -1, size: 1 },
  ];

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-visible"
      // Behind the sprite so the figure occludes the circle's lower inner edge.
      // That overlap is the only thing that says "behind him" rather than
      // "painted on the glass in front of the scene".
      style={{ zIndex: 0 }}
      key={phase === 'firing' ? `fire:${fireKey}` : 'halo'}
    >
      {/* THE CORE — the circle FILLS IN.
          Raheem's note on the first assembled version: "his circle just gets
          bigger and nothing happens. I thought it would fill in with light and
          look like it's preparing to shoot a beam." He is right, and it is the
          difference between a UI element and a weapon: a ring that scales reads
          as a widget, a ring whose interior floods with light reads as something
          charging. Sits BEHIND the rings and behind the sprite, so the light
          builds up behind him and he is silhouetted against his own attack. */}
      <div
        className={still ? undefined : `boss-halo-core boss-halo-core-${phase}`}
        style={{
          position: 'absolute',
          left: '50%',
          top: `${50 + centerYOffset * 100}%`,
          width: `${scale * 92}%`,
          aspectRatio: '1',
          translate: '-50% -50%',
          borderRadius: '50%',
          // Hollower than a plain radial: the very centre is where the BOSS is,
          // and a solid bright core there turns him into a silhouette with no
          // readable detail. Peaking at ~40% out puts the brightest light in the
          // ring's interior and leaves his ribcage legible against it.
          background: `radial-gradient(circle, ${glow}0.42) 0%, ${glow}0.72) 40%, ${glow}0.34) 64%, ${glow}0) 80%)`,
          opacity: 0,
        }}
      />
      {rings.map((r, i) => (
        <img
          key={r.path}
          src={resolveUrl(r.path)}
          alt=""
          draggable={false}
          className={
            still
              ? undefined
              : `boss-halo-ring boss-halo-${phase}${r.dir < 0 ? ' boss-halo-ccw' : ''}`
          }
          style={{
            position: 'absolute',
            left: '50%',
            top: `${50 + centerYOffset * 100}%`,
            width: `${scale * 100}%`,
            height: 'auto',
            translate: '-50% -50%',
            filter: `drop-shadow(0 0 14px ${glow}0.55)) drop-shadow(0 0 40px ${glow}0.28))`,
            // Negative delay so the two rings are already out of phase on the
            // very first painted frame rather than easing into it.
            animationDelay: `${i * -7}s`,
            ...({ '--spin-sec': `${r.period}s` } as React.CSSProperties),
          }}
        />
      ))}
      <style>{`
        /* CORE — dark at rest, floods while charging, detonates on fire.
           At rest it is nearly invisible: the fill has to have somewhere to go,
           so a resting glow would spend the whole effect before it starts. */
        .boss-halo-core { opacity: 0; }
        .boss-halo-core-idle {
          animation: boss-core-rest 6s ease-in-out infinite;
        }
        @keyframes boss-core-rest {
          0%, 100% { opacity: 0.06; scale: 0.9; }
          50%      { opacity: 0.12; scale: 0.95; }
        }

        /* CHARGING — this is the "preparing to fire" read.
           It does NOT loop back to empty. It ramps once and HOLDS at full, so a
           telegraph spanning several hero turns keeps looking loaded rather than
           breathing in and out like decoration. The scale grows from a point,
           which is what makes it read as filling rather than fading up. */
        .boss-halo-core-charging {
          animation: boss-core-fill 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards,
                     boss-core-seethe 0.5s ease-in-out 1.5s infinite alternate;
        }
        @keyframes boss-core-fill {
          0%   { opacity: 0.08; scale: 0.35; filter: brightness(1); }
          70%  { opacity: 0.85; scale: 1.02; filter: brightness(1.7); }
          100% { opacity: 1;    scale: 1;    filter: brightness(2); }
        }
        /* Loaded and straining, once full. */
        @keyframes boss-core-seethe {
          from { filter: brightness(1.8) saturate(1.3); scale: 1; }
          to   { filter: brightness(2.7) saturate(1.7); scale: 1.05; }
        }

        /* FIRING — the held light lets go. Blows past the ring and out of the
           frame, which is the discharge the charge was promising. */
        .boss-halo-core-firing {
          animation: boss-core-discharge 520ms cubic-bezier(0.3, 0, 0.7, 1) forwards;
        }
        @keyframes boss-core-discharge {
          0%   { opacity: 1;   scale: 1;   filter: brightness(3); }
          45%  { opacity: 1;   scale: 1.7; filter: brightness(4.5); }
          100% { opacity: 0;   scale: 2.6; filter: brightness(5); }
        }

        /* ULTIMATE — full and boiling, for as long as the scream lasts. */
        .boss-halo-core-ultimate {
          animation: boss-core-boil 1.25s ease-in-out infinite alternate;
        }
        @keyframes boss-core-boil {
          from { opacity: 0.8; scale: 0.95; filter: brightness(2)   saturate(1.4); }
          to   { opacity: 1;   scale: 1.25; filter: brightness(3.4) saturate(1.9); }
        }

        .boss-halo-core-defeated {
          animation: boss-core-out 1400ms ease-out forwards;
        }
        @keyframes boss-core-out {
          to { opacity: 0; scale: 0.6; filter: grayscale(1); }
        }

        .boss-halo-ring {
          animation: boss-halo-spin var(--spin-sec, 40s) linear infinite;
          transform-origin: 50% 50%;
        }
        .boss-halo-ccw { animation-direction: reverse; }
        @keyframes boss-halo-spin {
          from { rotate: 0deg; }
          to   { rotate: 360deg; }
        }

        /* CHARGING — the circle BRAKES. 'The light stops moving across the grove
           floor.' The spin is paused outright and the glyphs burn, so the frame
           the player is looking at is one where a moving thing has gone still. */
        .boss-halo-charging {
          animation-play-state: paused;
        }
        .boss-halo-charging {
          animation:
            boss-halo-spin var(--spin-sec, 40s) linear infinite paused,
            boss-halo-blaze 0.9s ease-in-out infinite alternate;
        }
        @keyframes boss-halo-blaze {
          from { filter: brightness(1)   saturate(1); }
          to   { filter: brightness(2.3) saturate(1.6); }
        }

        /* FIRING — one hard flash out as the hit lands, then back. */
        .boss-halo-firing {
          animation: boss-halo-flash 420ms ease-out forwards;
        }
        @keyframes boss-halo-flash {
          0%   { filter: brightness(2.6) saturate(1.7); scale: 1; }
          100% { filter: brightness(1)   saturate(1);   scale: 1.06; }
        }

        /* ULTIMATE — the circle SWELLS and SWIRLS while he screams.
           The deliberate opposite of the charging state: that one brakes to a
           halt and holds ("the light stops moving"), so the ultimate has to be
           the other extreme, or the fight's biggest moment reads like its
           second-biggest.
           It grows past the frame, spins up hard, and burns. Loops, because the
           ultimate beat runs 3000ms and a one-shot would freeze mid-scream. */
        .boss-halo-ultimate {
          animation:
            boss-halo-spin 1.9s linear infinite,
            boss-halo-swell 1.25s ease-in-out infinite alternate !important;
        }
        /* Swells PAST the frame on purpose. A ring that grows and stays inside
           its box reads as a UI element scaling; one that runs off the edge
           reads as something the room cannot contain. Matched to the sprite's
           1.25s swell so the boss and the circle breathe as one thing. */
        @keyframes boss-halo-swell {
          from { scale: 1;    filter: brightness(1.4) saturate(1.3); }
          to   { scale: 1.75; filter: brightness(3.6) saturate(2); }
        }

        /* DEFEATED — the turn decays to a stop and the green goes cold. Ends
           STOPPED rather than fading out: the circle is the thing he was
           holding open, so it should be left hanging there, dead. */
        .boss-halo-defeated {
          animation: boss-halo-die 1600ms ease-out forwards;
        }
        @keyframes boss-halo-die {
          0%   { rotate: 0deg;  filter: brightness(1) saturate(1); }
          100% { rotate: 14deg; filter: brightness(0.32) saturate(0.15) grayscale(0.8); }
        }

        @media (prefers-reduced-motion: reduce) {
          .boss-halo-ring,
          .boss-halo-charging,
          .boss-halo-ultimate,
          .boss-halo-firing,
          .boss-halo-defeated {
            animation: none !important;
          }
          /* Motion stops, but the CHARGE STILL HAS TO READ — it is a gameplay
             telegraph, not decoration. Held at full instead of ramping. */
          .boss-halo-core { animation: none !important; opacity: 0.08; }
          .boss-halo-core-charging,
          .boss-halo-core-ultimate {
            animation: none !important;
            opacity: 0.9;
            filter: brightness(2);
          }
        }
      `}</style>
    </div>
  );
}
