import { useMemo } from 'react';

/**
 * The card AS the character.
 *
 * This game's heroes were 32px chibi sprites standing on the arena floor while
 * their real, painted portrait art sat inert in the dock. These are the effects
 * that move the performance onto the card itself — which is both better art and
 * a more honest fiction for a card game.
 *
 * ── The vocabulary is what cards can do that sprites cannot ──────────────
 * Cards overlap, interpose, tilt in perspective, crack, and flip. Everything
 * here is built from those, deliberately — a glow that any sprite could also
 * have is a wasted opportunity.
 */

/* ------------------------------------------------------------------ */
/*  Cracks — the health bar                                            */
/* ------------------------------------------------------------------ */

/**
 * Damage draws cracks across the card face; the cracks ARE the HP readout.
 *
 * Two properties matter more than how it looks:
 *
 * 1. DETERMINISTIC per card. The crack pattern is seeded from the card id, so
 *    a given card always breaks the same way. Random cracks would re-scatter
 *    on every React re-render and the card would appear to shatter and heal
 *    continuously while nothing was happening.
 *
 * 2. MONOTONIC in damage. Cracks are revealed in a fixed order as HP falls, so
 *    healing visibly un-breaks the card by retracting the most recent ones.
 *    That is why healing repairs something you can see rather than floating a
 *    green number.
 */
export function CardCracks({
  hpFraction,
  seed,
  width,
  height,
}: {
  /** 0..1. 1 is untouched. */
  hpFraction: number;
  seed: string;
  width: number;
  height: number;
}) {
  const cracks = useMemo(() => buildCracks(seed), [seed]);

  // Nothing until real damage has landed — a chip should not craze the card.
  const damage = Math.min(1, Math.max(0, 1 - hpFraction));
  if (damage <= 0.06) return null;

  // How many of the (fixed-order) cracks are showing.
  const shown = Math.ceil(damage * cracks.length);

  return (
    <svg
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: '100%', mixBlendMode: 'normal' }}
    >
      {cracks.slice(0, shown).map((c, i) => {
        // The newest crack fades in rather than popping, so a hit reads as
        // "that just broke" instead of the pattern silently changing.
        const isNewest = i === shown - 1;
        return (
          <g key={i} opacity={isNewest ? 0.9 : 1}>
            {/* Dark fracture, then a bright inner line — a single flat stroke
                reads as a scratch drawn on top rather than a break in the
                surface. */}
            <path d={c} stroke="rgba(0,0,0,0.75)" strokeWidth={2.2} fill="none" strokeLinecap="round" />
            <path d={c} stroke="rgba(255,240,220,0.55)" strokeWidth={0.8} fill="none" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

/** Small deterministic PRNG — same card id, same fractures, every render. */
function mulberry(seedNum: number) {
  let a = seedNum;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Eight fractures, in a fixed order, each starting at an edge and forking
 * inward. Edge-origin matters: a crack that begins in open space looks drawn
 * on, whereas one entering from the border reads as the card breaking.
 */
function buildCracks(seed: string): string[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rnd = mulberry(h);

  const W = 100;
  const H = 144;
  const out: string[] = [];

  for (let i = 0; i < 8; i++) {
    // Walk in from a random point on a random edge.
    const edge = Math.floor(rnd() * 4);
    const sx = edge === 0 ? rnd() * W : edge === 1 ? W : edge === 2 ? rnd() * W : 0;
    const sy = edge === 0 ? 0 : edge === 1 ? rnd() * H : edge === 2 ? H : rnd() * H;

    // Aim generally inward, with jitter, so fractures converge on the portrait
    // rather than skating along the frame.
    const baseAng = Math.atan2(H / 2 - sy, W / 2 - sx) + (rnd() - 0.5) * 0.9;

    // SHORT segments with HARD angle changes. The first version used 12-26px
    // steps with gentle turns, which produced long smooth lines that read as
    // scratches drawn on the surface rather than the surface breaking. Glass
    // fractures in short, sharp, erratic runs.
    const walk = (x0: number, y0: number, ang0: number, steps: number, scale: number) => {
      let x = x0;
      let y = y0;
      let ang = ang0;
      let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      for (let s = 0; s < steps; s++) {
        const len = (4 + rnd() * 9) * scale;
        // +-40deg per segment. Small turns look like a curve; big ones look
        // like something snapped.
        ang += (rnd() - 0.5) * 1.4;
        x += Math.cos(ang) * len;
        y += Math.sin(ang) * len;
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return { d, x, y, ang };
    };

    const main = walk(sx, sy, baseAng, 5 + Math.floor(rnd() * 4), 1);
    out.push(main.d);

    // A fork partway along. Branching is most of what separates a fracture
    // from a line — a single unbranched stroke never reads as broken glass.
    if (rnd() > 0.35) {
      const branch = walk(main.x, main.y, main.ang + (rnd() > 0.5 ? 0.9 : -0.9), 3, 0.7);
      out.push(branch.d);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Target mark — aimed at, NOT hurt                                   */
/* ------------------------------------------------------------------ */

/**
 * The boss has named this card for its next attack.
 *
 * Deliberately NOT a red glow. A red wash over a card is the vocabulary of
 * DAMAGE, and this fires during the telegraph — before anything has landed.
 * Saying "hurt" when the card is still untouched trains the player to
 * misread the one warning they get.
 *
 * So it is an instrument instead: brackets closing on the card from its
 * corners, the way a sight acquires something. Nothing is tinted and nothing
 * covers the portrait — the mark sits outside the art entirely.
 */
export function CardTargetMark() {
  return (
    <div aria-hidden className="absolute pointer-events-none card-target-mark" style={{ inset: -6 }}>
      <svg viewBox="0 0 100 144" className="w-full h-full" preserveAspectRatio="none">
        {/* Four corner brackets. Drawn as open right-angles rather than a full
            frame: a closed rectangle reads as a selection box (something the
            PLAYER chose), where brackets read as something being aimed. */}
        {[
          'M 2 18 L 2 2 L 18 2',
          'M 82 2 L 98 2 L 98 18',
          'M 98 126 L 98 142 L 82 142',
          'M 18 142 L 2 142 L 2 126',
        ].map((d, i) => (
          // Two strokes: a heavy dark one underneath, the amber over it. A
          // single bright line vanished against the card's own gilt frame and
          // the lit arena behind the dock — the mark has to hold against ANY
          // backdrop, because it is the only warning the player gets.
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="rgba(20,8,0,0.85)"
              strokeWidth={9}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="square"
            />
            <path
              d={d}
              fill="none"
              stroke="rgba(255,190,90,1)"
              strokeWidth={5}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="square"
            />
          </g>
        ))}
      </svg>
      {/* A single tick above the card, so the mark is legible even when the
          brackets sit against a busy arena edge. */}
      <span
        className="absolute left-1/2 -translate-x-1/2 card-target-tick"
        style={{
          top: -14,
          fontSize: 13,
          color: 'rgba(255,190,90,0.95)',
          textShadow: '0 0 8px rgba(255,150,40,0.9)',
          lineHeight: 1,
        }}
      >
        ▼
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shield — a pane in front of the card, not a glow on it             */
/* ------------------------------------------------------------------ */

/**
 * Absorb rendered as leaded glass suspended in front of the card face.
 *
 * Damage cracks the PANE, not the card, which is the whole readability win: a
 * player can see how much shield is left by how badly the glass is spidered,
 * without reading a number. When the pool is spent the pane shatters.
 *
 * ── The reflection says "shielded". The webbing says "already hit" ───────
 * These are two separate statements and must not be conflated. An INTACT
 * shield shows only the travelling reflection — that alone is the signal for
 * "protected". Cracks are damage the shield has absorbed, so a freshly cast
 * one must show none of them, or the player reads a brand-new shield as
 * already failing and cannot tell a full pool from a nearly-spent one.
 *
 * Hence the threshold below rather than drawing the first crack the instant
 * `integrity` drops under 1: a single point of chip damage should not craze
 * the glass.
 */
/** Fraction of the pool that must be spent before any webbing shows. */
const SHIELD_CRACK_THRESHOLD = 0.15;

export function CardShieldPane({ integrity }: { integrity: number }) {
  const spider = Math.min(1, Math.max(0, 1 - integrity));
  return (
    <div
      aria-hidden
      className="absolute pointer-events-none card-shield-pane"
      style={{
        // Stands PROUD of the card on every side rather than hugging it. A
        // pane inset to the card's own edge just looks like a border on the
        // card; a pane larger than the card looks like a separate object held
        // in front of it, which is the whole read.
        inset: -9,
        borderRadius: 8,
        transform: 'translateZ(18px)',
        // The sheen sweeps from -130% to +130%, so without this it travels
        // clear of the pane and renders as a loose grey band floating in the
        // arena beside the card.
        overflow: 'hidden',
        // Faceted, not flat. The first pass was a faint uniform wash that was
        // easy to miss entirely; the second was strong enough to bury the
        // portrait. Facets solve both — the plate is unmistakably THERE
        // because light breaks across it, while each facet stays transparent
        // enough to read the art through.
        background:
          'linear-gradient(115deg, rgba(150,215,255,0.20) 0%, rgba(150,215,255,0.04) 22%, ' +
          'rgba(190,235,255,0.24) 40%, rgba(120,190,255,0.05) 62%, rgba(200,240,255,0.22) 100%)',
        // A thick bevelled rim is what sells thickness — glass you can see the
        // edge of, rather than a coloured film.
        border: '2px solid rgba(180,230,255,0.95)',
        boxShadow:
          '0 0 22px rgba(120,200,255,0.85), ' +
          '0 0 46px rgba(90,170,255,0.45), ' +
          'inset 0 0 26px rgba(190,235,255,0.5), ' +
          'inset 0 2px 0 rgba(255,255,255,0.6)',
      }}
    >
      {/* A sheen that travels across the plate. Motion is what makes a
          transparent object legible — a still pane competes with the art
          behind it, a moving highlight cannot be mistaken for part of it. */}
      <div
        className="absolute inset-0 card-shield-sheen"
        style={{
          borderRadius: 6,
          background:
            'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
        }}
      />
      {spider > SHIELD_CRACK_THRESHOLD && (
        <svg viewBox="0 0 100 144" className="w-full h-full" preserveAspectRatio="none">
          {SHIELD_CRACKS.slice(0, Math.ceil(spider * SHIELD_CRACKS.length)).map((d, i) => (
            <g key={i}>
              {/* Dark under-stroke, bright over-stroke — the same two-pass
                  trick the card fractures use. A single white line on pale
                  glass disappears against the lighter facets. */}
              <path d={d} stroke="rgba(10,40,70,0.75)" strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
              <path d={d} stroke="rgba(235,250,255,0.95)" strokeWidth={1.2} fill="none" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

/**
 * Fixed pattern — a shield is an abstract construct, not a unique object, so
 * every one cracking identically is correct rather than a shortcut.
 *
 * Radial spokes PLUS concentric webbing. Spokes alone (the first version) drew
 * a clean X across the card, which read as a "no" symbol rather than as damage;
 * it is the rings joining the spokes that make it a spiderweb impact, and the
 * spokes are deliberately uneven so it does not look like a snowflake.
 */
const SHIELD_CRACKS = [
  // Impact point, first spokes.
  'M 50 66 L 36 44 M 50 66 L 68 48 M 50 66 L 58 92',
  // Inner web joining them.
  'M 41 55 L 57 57 M 57 57 L 54 79 M 54 79 L 44 74 M 44 74 L 41 55',
  // Second ring of spokes, uneven lengths.
  'M 36 44 L 24 26 M 68 48 L 82 30 M 58 92 L 66 116 M 50 66 L 26 78',
  // Outer web, reaching the frame.
  'M 24 26 L 10 12 M 82 30 L 94 14 M 66 116 L 74 140 M 26 78 L 8 88',
];

/* ------------------------------------------------------------------ */
/*  Shared stylesheet                                                  */
/* ------------------------------------------------------------------ */

/**
 * One stylesheet for every card-as-character effect.
 *
 * Mounted once by the dock rather than per card: three cards each injecting an
 * identical <style> block is three copies of the same rules in the document,
 * and any future edit would have to keep them in step.
 */
export function CardCombatFxStyles() {
  return (
    <style>{`
      /* The dock is the stage. Perspective lives on the CONTAINER, because a
         perspective set on each card separately gives every card its own
         vanishing point and the fan stops looking like one hand. */
      .dock-stage { perspective: 900px; perspective-origin: 50% 60%; }

      /* ACTING — the card rises out of the fan and leans into the arena.
         rotateX tips its top edge away from the viewer, which is what makes it
         read as standing up off the table rather than merely sliding upward. */
      @keyframes card-step-forward {
        0%   { transform: translateY(0) rotateX(0deg) scale(1); }
        100% { transform: translateY(-18px) rotateX(14deg) scale(1.06); }
      }
      .card-acting {
        animation: card-step-forward 260ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
      }

      /* The border catches light and burns while the card holds the floor. */
      @keyframes card-ignite {
        0%, 100% { box-shadow: 0 0 10px 1px rgba(212,175,55,0.55), 0 10px 20px rgba(0,0,0,0.8); }
        50%      { box-shadow: 0 0 22px 3px rgba(255,205,90,0.95), 0 10px 20px rgba(0,0,0,0.8); }
      }
      .card-ignited { animation: card-ignite 1.5s ease-in-out infinite; border-radius: 6px; }

      /* TARGETED — the boss has named this card. Runs for the whole telegraph,
         which is the window the player has to answer it. Without this, removing
         the hero sprites would leave nothing on screen showing WHO is about to
         be hit.

         The brackets CLOSE IN rather than pulsing in place: something tightening
         on the card reads as being acquired, where a pulse reads as a status
         that is merely switched on. No red anywhere — red is what damage will
         look like, and this fires before any has happened. */
      @keyframes card-target-close {
        0%   { transform: scale(1.10); opacity: 0; }
        35%  { opacity: 1; }
        100% { transform: scale(1);    opacity: 1; }
      }
      .card-target-mark { animation: card-target-close 520ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards; }
      @keyframes card-target-blink {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.35; }
      }
      .card-target-tick { animation: card-target-blink 900ms ease-in-out infinite; }

      /* DEATH — the card turns face-down.
         Flipping is the single most card-native gesture there is, and no other
         genre can use it. rotateY past 90deg hides the face; the backface plate
         underneath is what the player is left looking at. */
      @keyframes card-fall-facedown {
        0%   { transform: translateY(0) rotateY(0deg) rotate(0deg); filter: none; }
        45%  { transform: translateY(-10px) rotateY(90deg) rotate(-4deg); filter: grayscale(0.5) brightness(0.8); }
        100% { transform: translateY(14px) rotateY(180deg) rotate(-9deg); filter: grayscale(1) brightness(0.42); }
      }
      .card-defeated {
        animation: card-fall-facedown 850ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
        transform-style: preserve-3d;
      }

      /* STRUCK — the card RISES to take the blow.
         It does not merely flinch where it sits. Rising to meet an incoming
         attack is what makes a hit look answered rather than suffered, and it
         is the moment the card most clearly stops being a UI element and
         becomes the character standing in the fight.

         THREE SEPARATE BEATS, in this order, and they must not blend:

           1. RISE   (0-26%)  — the card comes up and STOPS. Nothing else
                                happens yet.
           2. HOLD   (26-32%) — a beat parked at the top. This tiny pause is
                                what makes the next beat read as an impact
                                rather than as part of the movement; without
                                it the rise and the flinch smear into one
                                gesture and the hit loses its weight.
           3. FLINCH (32-62%) — contact. Hard recoil and a bright flash.
           4. RETURN (62-100%) — settles back into the fan.

         The card must be UP and STILL before it is struck, or the rise reads
         as a consequence of the damage instead of a response to it. */
      @keyframes card-take-hit {
        /* 1. rise */
        0%   { transform: translateY(0) translateX(0) scale(1); filter: none; }
        26%  { transform: translateY(-24px) translateX(0) scale(1.07); filter: none; }
        /* 2. hold — braced, waiting for it */
        32%  { transform: translateY(-24px) translateX(0) scale(1.07); filter: none; }
        /* 3. flinch */
        38%  { transform: translateY(-21px) translateX(-9px) scale(1.05); filter: brightness(1.9); }
        46%  { transform: translateY(-22px) translateX(7px)  scale(1.05); filter: brightness(1.4); }
        54%  { transform: translateY(-23px) translateX(-4px) scale(1.06); filter: brightness(1.15); }
        62%  { transform: translateY(-24px) translateX(2px)  scale(1.07); filter: none; }
        /* 4. return */
        100% { transform: translateY(0) translateX(0) scale(1); filter: none; }
      }
      .card-struck { animation: card-take-hit 760ms cubic-bezier(0.25, 0.6, 0.35, 1); }

      /* HEALING — cracks knit closed. A brief green-white wash sells the
         repair; the cracks themselves retract because the crack count is
         driven by HP. */
      @keyframes card-mend {
        0%   { filter: none; }
        35%  { filter: brightness(1.5) saturate(1.3) drop-shadow(0 0 14px rgba(140,255,180,0.9)); }
        100% { filter: none; }
      }
      .card-mending { animation: card-mend 700ms ease-out; }

      /* The shield pane hangs in front of the face. */
      .card-shield-pane { animation: card-shield-breathe 2.4s ease-in-out infinite; }
      @keyframes card-shield-breathe {
        0%, 100% { filter: brightness(1); }
        50%      { filter: brightness(1.25); }
      }
      /* The travelling highlight. This is what makes a transparent plate
         readable at a glance — the eye catches the moving band long before it
         registers a static tint. */
      @keyframes card-shield-sweep {
        0%   { transform: translateX(-130%); opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { transform: translateX(130%); opacity: 0; }
      }
      .card-shield-sheen { animation: card-shield-sweep 2.6s ease-in-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .card-acting,
        .card-ignited,
        .card-target-mark,
        .card-target-tick,
        .card-struck,
        .card-defeated,
        .card-mending,
        .card-shield-pane,
        .card-shield-sheen {
          animation: none !important;
        }
        /* Being hit must still be visible without the rise — the cracks change
           anyway, but a flash confirms WHICH card took it. */
        .card-struck { filter: brightness(1.6); }
        /* The brackets and the pane must still be VISIBLE with motion off —
           they carry information, and their entry animations start at opacity
           0, so without this they would never appear at all. */
        .card-target-mark, .card-target-tick { opacity: 1; transform: scale(1); }
        .card-shield-sheen { opacity: 0.35; transform: none; }
        /* Motion is gone; the STATE must not be. Each of these still has to be
           readable as a distinct condition at a glance. */
        .card-acting   { transform: translateY(-18px) scale(1.06); }
        .card-ignited  { box-shadow: 0 0 16px 2px rgba(255,205,90,0.9); border-radius: 6px; }
        .card-marked   { box-shadow: 0 0 16px 3px rgba(255,70,60,0.9); border-radius: 6px; }
        .card-defeated { filter: grayscale(1) brightness(0.42); transform: rotate(-9deg); }
      }
    `}</style>
  );
}
