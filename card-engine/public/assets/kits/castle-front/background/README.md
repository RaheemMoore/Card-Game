# Castle Front V4 perspective-shift background

This is the editable Phaser background package for the first 2D side-to-side Castle Front scene.
The actual PNG files live in this folder; the review harness is only the workshop used to assemble
and test them.

Open `../kit-pack.json` in Phaser Editor. The section named
`castle-front--v4-perspective-shift--side-view-background` exposes these scene-one texture keys:

- `castle-front-sunset-sky`
- `castle-front-mountains-loop`
- `castle-front-forest-loop`
- `castle-front-cloud-broad-sunset`
- `castle-front-cloud-mound-sunset`
- `castle-front-cloud-puffs-sunset`
- `castle-front-cloud-sweep-sunset`

Use the sky as the fixed back plate. Tile the mountain and forest strips horizontally. Clouds are
transparent actors, not baked into the sky. The locked motion values and every retained cloud
palette are recorded in `background-manifest.json`.
