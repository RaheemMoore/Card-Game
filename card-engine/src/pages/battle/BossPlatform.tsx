import type { MotionLevel } from '../../vfx/types';

/**
 * The ground the boss stands on, drawn in code rather than painted into the
 * arena.
 *
 * ── Why this is not part of the background ───────────────────────────────
 * It used to be. Every arena plate had to contain a raised dais whose top
 * surface landed inside a narrow band, because the sprite is positioned at a
 * fixed height and had to appear to stand on it. Nothing enforced that
 * contract: a generated painting puts its dais wherever it likes, at whatever
 * camera angle, so the boss's feet met the platform only by luck and usually
 * floated a little above or sank a little into it.
 *
 * Drawing it here fixes the contract by construction — the platform and the
 * sprite are placed by the same code, against the same box, so contact is
 * guaranteed. Three further things fall out of that, which is why this is the
 * better design rather than merely the easier one:
 *
 *   1. Arena prompts are freed from the composition band that was breaking
 *      them. Backgrounds can just be places.
 *   2. The platform can be themed per boss — stone ring, ash circle, scorched
 *      rune disc — without regenerating any art.
 *   3. It can react. A platform can crack, scorch or pulse as the fight turns,
 *      which a painted one never could.
 */
export interface BossPlatformSpec {
  /** Width as a fraction of the boss sprite box. */
  width: number;
  /** Ellipse height as a fraction of its width — the camera's tilt. */
  flatten: number;
  /** Top face. */
  surface: string;
  /** The riser band below the top face, giving it thickness. */
  rim: string;
  /** Glow bled onto the ground around it. Empty disables. */
  glow: string;
  /** Concentric steps drawn outward. 0 = a plain disc. */
  steps: number;
}

/**
 * Deliberately a SCORCH RING, not an opaque slab.
 *
 * The first version drew a solid stepped dais and it read as a black hole cut
 * out of the arena — the backgrounds already contain their own ground, so an
 * opaque platform fights the art instead of sitting on it. Semi-transparent
 * darkening plus a hot rim reads as "the ground under him has been burned",
 * which grounds the sprite without pretending to be architecture.
 */
export const DEFAULT_PLATFORM: BossPlatformSpec = {
  width: 0.52,
  flatten: 0.26,
  surface: 'rgba(24,20,22,0.55)',
  rim: 'rgba(0,0,0,0.55)',
  glow: 'rgba(255,120,40,0.32)',
  steps: 0,
};

interface Props {
  spec?: BossPlatformSpec;
  motionLevel: MotionLevel;
}

export function BossPlatform({ spec = DEFAULT_PLATFORM, motionLevel }: Props) {
  const { width, flatten, surface, rim, glow, steps } = spec;
  const still = motionLevel === 'off';

  // Drawn outward from the top face, largest first, so each step sits BEHIND
  // the one above it without needing z-index juggling.
  const tiers = Array.from({ length: steps + 1 }, (_, i) => steps - i);

  return (
    <div
      aria-hidden
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{
        // Anchored to the BOTTOM of the sprite box, which is where the sprite's
        // feet are: the shipped PNG is cropped to the figure's alpha bounds, so
        // its lowest opaque pixel is its lowest pixel.
        bottom: 0,
        width: `${width * 100}%`,
        zIndex: 1,
      }}
    >
      {glow && (
        <div
          className={still ? undefined : 'boss-platform-glow'}
          style={{
            position: 'absolute',
            left: '-14%',
            bottom: `-${flatten * 40}%`,
            width: '128%',
            aspectRatio: `1 / ${flatten * 0.9}`,
            background: `radial-gradient(ellipse at center, ${glow} 0%, transparent 70%)`,
          }}
        />
      )}
      {tiers.map((tier) => {
        const w = 100 + tier * 13;
        const drop = tier * 5;
        return (
          <div
            key={tier}
            style={{
              position: 'absolute',
              left: `${(100 - w) / 2}%`,
              bottom: `${-drop}%`,
              width: `${w}%`,
              aspectRatio: `1 / ${flatten}`,
              borderRadius: '50%',
              background: tier === 0 ? surface : rim,
              // A hard lower edge reads as the riser's thickness; a soft one
              // reads as a shadow on the floor, which is not what this is.
              boxShadow:
                tier === 0
                  ? `0 3px 10px ${rim}, 0 0 18px 4px rgba(255,120,40,0.22)`
                  : `0 3px 0 rgba(0,0,0,0.4)`,
            }}
          />
        );
      })}
      <style>{`
        .boss-platform-glow { animation: boss-platform-breathe 3.6s ease-in-out infinite; }
        @keyframes boss-platform-breathe {
          0%, 100% { opacity: 0.75; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .boss-platform-glow { animation: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * Per-boss platform themes. A boss with no entry gets the default, so a new
 * boss is never left standing on nothing.
 */
const PLATFORM_BY_BOSS: Record<string, BossPlatformSpec> = {
  // The Debt-Bearer: scorched dark stone, heat bleeding out from under her.
  boss_champion_barbarian: {
    width: 0.54,
    flatten: 0.24,
    surface: 'rgba(26,18,16,0.58)',
    rim: 'rgba(0,0,0,0.5)',
    glow: 'rgba(255,110,35,0.5)',
    steps: 0,
  },
};

export function getBossPlatform(bossId: string): BossPlatformSpec {
  return PLATFORM_BY_BOSS[bossId] ?? DEFAULT_PLATFORM;
}
