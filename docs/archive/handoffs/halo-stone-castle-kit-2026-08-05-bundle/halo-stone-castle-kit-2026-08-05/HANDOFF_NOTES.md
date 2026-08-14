# Halo Stone Castle Kit — Handoff Notes

This is an organized staging handoff, not a claim that every image is production-approved.
The package contains 29 named PNG assets plus a manifest and human-readable index.

## What is included

- `ground/` — two 32 px Wang tilesheets and four terrain-detail overlays.
- `structures/walls/` — front and side wall runs, inner/outer corners, end cap, and tower connector.
- `structures/towers/` — Gatewatch, Aegis, Starward, and Beacon tower candidates.
- `structures/gate/` — open arch, closed door, raised portcullis, threshold, and steps.
- `nature/` — large/small broadleaf trees, shrubs, and rocks with low scrub.
- `review/` — neutral/day/night ground boards for visual reference only.
- `archive/proofs/` — the original rejected/adjustment-needed tower and gate proofs; do not register these as live assets.
- `castle-kit-manifest.json` — stable IDs, readable paths, provenance, and review status.
- `README.md` — quick visual inventory.

## Camera and environment contract

- Logical terrain grid: 32 px.
- Projection: low three-quarter/top-down.
- No visible sky or horizon; terrain continues outside the walls.
- Source art stays neutrally lit. Day/night, cast shadows, wind, and combat lighting belong in Phaser.
- Upright structures and trees use a bottom-center ground origin after final packaging.
- Raw PixelLab job/frame names remain outside this handoff as generation provenance.

## Required cleanup before production registration

1. Remove the raw two-pixel tile-box borders from both tilesheets while preserving every 32 px cell.
2. Separate the dark timber door and raised portcullis from their narrow stone surrounds.
3. Split large/small tree masters into shared-canvas static trunk/root and movable crown layers.
4. Split the shrub family into static woody base and movable upper foliage where useful.
5. Cut the dense weed image into smaller unclipped decals.
6. Build a composition board proving wall, corner, tower, gate, and connector sockets at native scale.
7. Human-review every asset currently marked `HUMAN REVIEW` before promoting it to a production manifest.

## Explicitly deferred

- Cracked, broken, destroyed, repaired, or reinforced wall states.
- Rubble and scaffolding.
- Generated tree animation.
- Baked day/night variants, long shadows, sky, distant horizon, actors, and combat VFX.

## Integration boundary

Copy approved runtime assets into the repository's final organized asset destination only after
the concurrent cleanup establishes that destination. Preserve this handoff unchanged until the
copy is verified. Do not replace the live painted `/castle` scene during organization.
