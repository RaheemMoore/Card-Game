import type { ChargeForm } from '../../../services/combat/performance/types';

/**
 * The shapes a material makes while it gathers — the single source for both
 * the live charge tell and the gallery's preview of it.
 *
 * ## Why this is its own module
 *
 * The gallery used to draw its own version of the charge: three ellipses, a
 * pool, for every element regardless of form. So Shadow's charge showed as a
 * puddle on the review page and as motes in the theater, and the two pages
 * disagreed about what the game does. That is the worst kind of review tool —
 * one that confidently shows you something other than the thing being
 * reviewed.
 *
 * Sharing the geometry makes the two physically incapable of drifting. Any new
 * charge form appears in both places at once, or in neither.
 *
 * ## Coordinates
 *
 * Authored in a `0 0 100 60` viewBox with the material's base at y≈50, so a
 * shape can be scaled about its base and grow upward without sinking through
 * the cast point.
 */

export interface ChargeShapeProps {
  form: ChargeForm;
  core: string;
  edge: string;
  accent: string;
  /** Heavy materials sit lower — they collect rather than billow. */
  heavy?: boolean;
}

/**
 * How much each form is scaled about its base.
 *
 * Not uniform, because the forms are not equally dense. A pool is wide and
 * already fills its box; a flame and a cluster of motes are thin shapes that
 * read as too small at the same nominal size — which is exactly the note that
 * produced this table, twice ("make the actual flame bigger", then the same
 * for Shadow). The GLOW is a separate element and is deliberately not scaled
 * with these: it was the right size both times.
 */
export const CHARGE_SHAPE_SCALE: Record<ChargeForm, number> = {
  pool: 1,
  flame: 1.55,
  ground: 1,
  bloom: 1.2,
  halo: 1.15,
  motes: 1.6,
  crystallize: 1.25,
};

/** Wrap a shape in its per-form scale, anchored at the base. */
export function ChargeShapeScaled(props: ChargeShapeProps) {
  const scale = CHARGE_SHAPE_SCALE[props.form] ?? 1;
  return (
    <g transform={scale === 1 ? undefined : `translate(50 50) scale(${scale}) translate(-50 -50)`}>
      <ChargeShape {...props} />
    </g>
  );
}

export function ChargeShape({ form, core, edge, accent, heavy = false }: ChargeShapeProps) {
  switch (form) {
    case 'flame':
      // A tongue that catches and rises — narrow at the base, wide and forked
      // at the top. The opposite proportion to a pool, so the two can never be
      // confused even in silhouette.
      return (
        <>
          <path d="M 50 50 C 38 40 42 30 50 12 C 58 30 62 40 50 50 Z" fill={core} opacity={0.9} />
          <path d="M 50 48 C 43 40 45 32 50 20 C 55 32 57 40 50 48 Z" fill={edge} opacity={0.95} />
          {/* Bright inner core — fire is the one material lit from inside. */}
          <path d="M 50 44 C 47 38 48 34 50 28 C 52 34 53 38 50 44 Z" fill={accent} />
          <path d="M 40 38 C 36 32 38 28 41 24" stroke={edge} strokeWidth={2} fill="none" opacity={0.7} />
          <path d="M 60 40 C 64 34 62 30 59 26" stroke={edge} strokeWidth={2} fill="none" opacity={0.7} />
        </>
      );

    case 'bloom':
      // A plant that grew: stem, uneven leaves, and a flower opening at the
      // top. The delivery reaches out of THIS, so it has to look like a thing
      // with a mouth rather than a puddle or a glow.
      return (
        <>
          <path d="M 50 52 C 49 42 51 36 50 26" stroke={core} strokeWidth={4} fill="none" strokeLinecap="round" />
          <path d="M 50 44 C 40 42 34 36 33 30 C 41 30 48 36 50 44 Z" fill={core} opacity={0.95} />
          <path d="M 50 38 C 60 37 66 32 68 26 C 60 26 52 31 50 38 Z" fill={edge} opacity={0.95} />
          <path d="M 50 26 C 44 22 44 14 50 10 C 56 14 56 22 50 26 Z" fill={edge} />
          <path d="M 50 24 C 43 25 37 21 36 15 C 43 14 49 18 50 24 Z" fill={edge} opacity={0.85} />
          <path d="M 50 24 C 57 25 63 21 64 15 C 57 14 51 18 50 24 Z" fill={edge} opacity={0.85} />
          <circle cx={50} cy={19} r={4} fill={accent} />
        </>
      );

    case 'ground':
      // The floor stirring: a low mound with cracks radiating from it.
      return (
        <>
          <ellipse cx={50} cy={44} rx={40} ry={11} fill={core} opacity={0.8} />
          <path d="M 30 44 L 44 36 M 50 44 L 50 32 M 70 44 L 58 35" stroke={edge} strokeWidth={2.5} fill="none" />
          <ellipse cx={50} cy={44} rx={18} ry={5} fill={accent} opacity={0.5} />
        </>
      );

    case 'halo':
      // Light assembling into a ring — symmetrical, which nothing else is.
      return (
        <>
          <ellipse cx={50} cy={32} rx={34} ry={16} fill="none" stroke={core} strokeWidth={5} opacity={0.85} />
          <ellipse cx={50} cy={32} rx={24} ry={11} fill="none" stroke={edge} strokeWidth={3} opacity={0.9} />
          <ellipse cx={50} cy={32} rx={11} ry={5} fill={accent} opacity={0.7} />
        </>
      );

    case 'crystallize':
      /*
       * Blood that has set. A shallow pool at the base with facets grown up
       * out of it — the only tell here that shows a material MID-CHANGE rather
       * than simply gathered, which is the Sanguine lore beat: a vampire with
       * the strength to harden their own blood.
       *
       * The residual pool at the bottom is load-bearing. Without it these are
       * just crystals; with it, they are visibly blood that turned into
       * crystals.
       */
      return (
        <>
          {/* What is left of the liquid. */}
          <ellipse cx={50} cy={48} rx={32} ry={7} fill={core} opacity={0.75} />
          {/* Facets, deliberately uneven heights and angles — a matched set
              reads as a decoration rather than as something that grew. */}
          <path d="M 50 46 L 42 26 L 50 8 L 58 27 Z" fill={edge} />
          <path d="M 50 46 L 42 26 L 50 8 Z" fill={core} opacity={0.9} />
          <path d="M 34 47 L 29 33 L 36 22 L 41 35 Z" fill={edge} opacity={0.9} />
          <path d="M 34 47 L 29 33 L 36 22 Z" fill={core} opacity={0.85} />
          <path d="M 66 47 L 62 31 L 69 24 L 72 37 Z" fill={edge} opacity={0.85} />
          <path d="M 66 47 L 62 31 L 69 24 Z" fill={core} opacity={0.8} />
          {/* Specular glints on the facet edges — the cue that says HARD.
              Blood's equivalent is a soft wet highlight; these are sharp. */}
          <path d="M 48 20 L 50 12 L 52 21" stroke={accent} strokeWidth={1.6} fill="none" />
          <path d="M 33 30 L 36 25" stroke={accent} strokeWidth={1.3} fill="none" />
          <path d="M 65 29 L 68 26" stroke={accent} strokeWidth={1.3} fill="none" />
        </>
      );

    case 'motes':
      /*
       * Condensing particles — the tell for materials with no body of their
       * own, like Shadow.
       *
       * Deliberately NOT a neat row. An even line of dots reads as a loading
       * indicator; a scatter at mixed sizes reads as something coalescing. The
       * positions are fixed rather than random so the same cast looks the same
       * twice in the theater.
       */
      return (
        <>
          {[
            { x: 26, y: 34, r: 4.5 },
            { x: 40, y: 22, r: 3.2 },
            { x: 50, y: 38, r: 7 },
            { x: 62, y: 24, r: 3.8 },
            { x: 74, y: 36, r: 5 },
            { x: 44, y: 46, r: 2.6 },
            { x: 60, y: 45, r: 3 },
          ].map((m, i) => (
            <circle
              key={i}
              cx={m.x}
              cy={m.y}
              r={m.r}
              fill={i === 2 ? edge : core}
              opacity={i === 2 ? 0.95 : 0.8}
            />
          ))}
          {/* One brighter mote at the centre so the cluster has a focal point
              rather than reading as noise. */}
          <circle cx={50} cy={36} r={2.4} fill={accent} opacity={0.9} />
        </>
      );

    case 'pool':
    default:
      return (
        <>
          <ellipse cx={50} cy={heavy ? 38 : 31} rx={38} ry={heavy ? 15 : 19} fill={core} opacity={0.85} />
          <ellipse cx={50} cy={heavy ? 34 : 28} rx={26} ry={heavy ? 9 : 13} fill={edge} opacity={0.9} />
          {/* Wet highlight — the cue that separates a pool of liquid from a
              coloured blob. */}
          <ellipse cx={40} cy={heavy ? 30 : 24} rx={9} ry={3.5} fill={accent} opacity={0.75} />
        </>
      );
  }
}
