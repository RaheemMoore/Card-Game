/**
 * Phaser School — lesson content for `/dev/phaser-school`.
 *
 * Content is data, the harness is a renderer. Adding a lesson never touches UI.
 *
 * Written for a visual learner and a first-time Phaser Editor user, so three
 * rules hold throughout:
 *
 *  1. **Bullets over prose.** No paragraph runs longer than two lines.
 *  2. **Show the actual asset.** Images point at real files in `public/`, so a
 *     lesson cannot drift from the art it describes without visibly breaking.
 *  3. **Every claim gets a `try` block** — something to do that proves it.
 *
 * Panels are always named by screen position ("bottom-middle panel (Blocks)"),
 * because that is findable without already knowing the layout.
 */

export type Actor = 'claude' | 'raheem' | 'both';
export type LessonStatus = 'live' | 'draft';

export type Block =
  | { kind: 'bullets'; items: string[] }
  | { kind: 'terms'; items: { term: string; plain: string; where?: string }[] }
  | {
      kind: 'image';
      src: string;
      caption: string;
      /** Render with image-rendering: pixelated + a size boost. For 32px art. */
      pixel?: boolean;
      maxWidth?: number;
    }
  | {
      kind: 'gallery';
      caption?: string;
      pixel?: boolean;
      items: { src: string; label: string; sub?: string }[];
    }
  | { kind: 'steps'; items: { who: Actor; do: string; see?: string }[] }
  | {
      kind: 'try';
      title: string;
      steps: string[];
      /** What the experiment demonstrates. The reason it is worth doing. */
      proves: string;
    }
  | { kind: 'callout'; tone: 'key' | 'tip' | 'warn'; title?: string; text: string }
  | {
      kind: 'compare';
      left: { title: string; points: string[] };
      right: { title: string; points: string[] };
    }
  | { kind: 'table'; head: string[]; rows: string[][] }
  /**
   * Interactive: drag the origin of a real sprite and watch it move against a
   * ground line. Origin is the single most-explained-badly concept in 2D — it
   * is spatial, so it gets a spatial widget instead of a paragraph.
   */
  | { kind: 'originLab'; src: string }
  /**
   * Interactive: the real 16-tile Wang sheet, sliced live via CSS background
   * position, each tile labelled with its index and its four corner types.
   * Reads the actual PNG, so it cannot drift from the art.
   */
  | { kind: 'wangLab'; src: string; a: string; b: string }
  /**
   * A link out to a real, tweakable tool on its own /dev route.
   *
   * Raheem, 2026-08-07: "It'd be nice if all the other sections could have little
   * labs. Remember, we learn about doing." Reading that a light spot drifts is
   * nothing; dragging the slider until it looks like leaves moving is the lesson.
   *
   * These are separate ROUTES, not embedded canvases, because a lesson page that
   * boots three Phaser games scrolls like treacle and one crash takes the page
   * with it.
   */
  | { kind: 'lab'; route: string; title: string; blurb: string; learn: string[] };

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  status: LessonStatus;
  /** Verified teaching material. Do not revise unless the user explicitly reopens it. */
  locked?: boolean;
  /** One line: what you can do afterwards. */
  outcome: string;
  minutes: number;
  sections: Section[];
  /** Objective end state. Checkable, not "it looks nice". */
  checkpoint: string[];
}

const KIT = '/assets/kits/halo-stone-castle';

export const LESSONS: Lesson[] = [
  /* ------------------------------------------------------------------ 0 */
  {
    id: 'orientation',
    number: 0,
    title: 'Orientation',
    status: 'live',
    outcome: 'Name every panel on screen and know where your work is saved.',
    minutes: 10,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Phaser Editor is a placement tool, not a drawing tool.',
            text:
              'Everything you do writes plain JSON into a file in the repo. Nothing is hidden, nothing is unrecoverable, and git can undo all of it.',
          },
          {
            kind: 'bullets',
            items: [
              'You **place** art here. You do not **make** art here.',
              'Art is made elsewhere — PixelLab for sprites, Leonardo for plates.',
              'Two file types matter: `.scene` (what is placed) and asset packs (what exists).',
            ],
          },
        ],
      },
      {
        id: 'how',
        title: 'How we work — the 75 / 25 rule',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Claude builds about 75%. Raheem finishes the last 25%.',
            text:
              'Agreed 2026-08-06. I do the bulk of the work so you can watch what is happening, then hand you the final stretch with instructions so you actually get your hands on it. Learning by watching, then doing.',
          },
          {
            kind: 'bullets',
            items: [
              'I do the **setup and the repetitive bulk** — scene creation, pack wiring, flood-fills, seam math, bulk placement.',
              'You do the **judgement work** — where the path bends, where the trees look right, the piece that needs nudging.',
              'Every lesson\'s step list is already split this way. Purple `Claude`, green `You`.',
              '**The escape hatch is always open.** If a handoff is too fiddly or you just want to keep moving, say "finish it" and I will. No lesson is worth stalling the build.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The point of the 25%',
            text:
              'Not ceremony. The better you can picture what the editor is doing, the better your instructions to me get — and vague instructions are the single biggest cost in this kind of work.',
          },
        ],
      },
      {
        id: 'panels',
        title: 'The four panels',
        blocks: [
          {
            kind: 'table',
            head: ['Where on screen', 'Official name', 'What it is for'],
            rows: [
              ['**Top-left**', 'Outline', 'Every object in the scene as a list. How you select things you cannot click.'],
              ['**Bottom-left**', 'Files', 'The folder tree. Double-click a `.scene` to open it.'],
              ['Middle (big)', 'Scene Editor', 'The canvas. Drag, place, paint.'],
              ['Bottom-middle', 'Blocks', 'The palette. Every asset this scene is allowed to use.'],
              ['**Right (full height)**', 'Inspector', 'Properties of whatever is selected: x, y, scale, depth, origin.'],
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Panel positions are Raheem\'s actual layout, verified 2026-08-06.',
            text:
              'Phaser Editor panels are draggable, so no layout is universal — but these are the positions in the editor we are really working in. Outline is TOP-LEFT, not top-right. Corrected after I described it wrong three times running.',
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Empty Blocks panel = no asset pack attached.',
            text:
              'This is the single most common "why can I not place anything" moment. It is not broken — the scene simply has no catalogue yet.',
          },
        ],
      },
      {
        id: 'vocab',
        title: 'Five words',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Asset Pack',
                plain: 'The catalogue of art. Not listed = does not exist.',
                where: 'public/asset-pack.json, public/assets/**/*-pack.json',
              },
              {
                term: 'Scene',
                plain: 'One area of the game. A list of placed objects.',
                where: 'Bottom-left panel (Files) — anything ending in .scene',
              },
              {
                term: 'Depth',
                plain: 'Draw order. Higher number draws on top.',
                where: 'Right panel (Inspector)',
              },
              {
                term: 'Origin',
                plain: 'The sprite\'s anchor point. Gets its own section below.',
                where: 'Right panel (Inspector) → Transform',
              },
            ],
          },
        ],
      },
      {
        id: 'origin',
        title: 'Origin, properly',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Origin answers one question: which point of the picture is "the object"?',
            text:
              'A sprite is a rectangle of pixels. Its x/y has to mean SOMETHING — but which pixel? Origin is how you answer that. It is not a position; it is the handle you hold the picture by.',
          },
          {
            kind: 'bullets',
            items: [
              'Origin is **two numbers, each 0 to 1** — a fraction across the image, not pixels.',
              '`originX = 0` is the left edge, `0.5` the middle, `1` the right edge.',
              '`originY = 0` is the top edge, `0.5` the middle, `1` the bottom edge.',
              'Change the origin and **the sprite moves on screen, but x/y never changes** — because you moved the handle, not the object.',
            ],
          },
          {
            kind: 'originLab',
            src: '/assets/kits/halo-stone-castle/nature/trees/castle-tree-broadleaf-large.png',
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Why 0.5 / 1 is the answer for almost everything in a top-down game',
            text:
              'It puts the handle at the bottom-centre — where the trunk meets the ground. Then "where is this tree standing?" and "what is this tree\'s y?" become the same question. That is what makes depth sorting work: sort by y, and you are really sorting by where things touch the floor.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Origin 0.5 / 0.5 (default)',
              points: [
                'Handle at the centre of the picture',
                'y = the tree\'s waist, roughly',
                'Taller trees sink into the ground',
                'Depth sorting goes wrong — a big tree and a small one at the same y do not touch the floor at the same place',
                'Fine for: bullets, sparks, UI, anything with no feet',
              ],
            },
            right: {
              title: 'Origin 0.5 / 1 (what we use)',
              points: [
                'Handle at bottom-centre — the base',
                'y = exactly where it meets the ground',
                'Swap a small tree for a large one and it stays planted',
                'Depth sorting is just `depth = y`',
                'Use for: trees, walls, characters, props, anything standing',
              ],
            },
          },
        ],
      },
      {
        id: 'try',
        title: 'Try it',
        blocks: [
          {
            kind: 'try',
            title: 'Prove a scene is just text — works on an empty scene',
            steps: [
              'Ask me to place a single tree in the scene. **One object is enough** — an empty scene has nothing to show you, which is exactly what you hit.',
              'Ask me to print the `.scene` file. Find the `"x"` and `"y"` numbers.',
              'Drag the tree in the Scene Editor and save (**Ctrl+S** on Windows, Cmd+S on Mac).',
              'Ask me to print it again — the same two numbers, changed.',
            ],
            proves:
              'The editor is a front-end for a JSON file. Dragging with a mouse and me editing text are the same operation. That is why you can always ask me to fix a scene you cannot fix by clicking.',
          },
          {
            kind: 'try',
            title: 'Feel the difference between origin and position',
            steps: [
              'In the widget above, set origin to `0.5 / 0.5` and note the x/y readout.',
              'Now set it to `0.5 / 1`. Watch the tree jump up.',
              'Look at the x/y readout again — **it did not change.**',
            ],
            proves:
              'Origin and position are independent. The tree moved without moving. Once that clicks, "my sprite is in the wrong place and I did not move it" stops being mysterious.',
          },
        ],
      },
    ],
    checkpoint: [
      'You can point at four panels and name them.',
      'You can say why an asset must be in an asset pack.',
      'You can explain origin as "which pixel is the handle" and say why 0.5 / 1 is the top-down default.',
      'You know depth = draw order.',
    ],
  },

  /* ------------------------------------------------------------------ 1 */
  {
    id: 'ground',
    number: 1,
    title: 'The Ground',
    status: 'live',
    outcome:
      'Create a tilemap, attach the tilesets, and paint grass, dirt and paving by hand.',
    minutes: 45,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Ground is a grid, not a picture.',
            text:
              'Two small PNGs cover an unlimited area and can be edited forever, tile by tile. A painted plate cannot be changed at all without regenerating it.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Painted plate (what we had)',
              points: [
                '1536 × 1152 pixels, one file',
                'Beautiful immediately',
                'Cannot widen a path',
                'Cannot crack a wall',
                'Any change = a new generation',
              ],
            },
            right: {
              title: 'Tilemap (what we are building)',
              points: [
                '2 × 128px PNGs — 32 tiles total',
                'Needs assembly',
                'Path widens by painting',
                'Ground state can change at runtime',
                'Any change = free',
              ],
            },
          },
        ],
      },
      {
        id: 'tilesets',
        title: 'Our two tilesets',
        blocks: [
          {
            kind: 'gallery',
            pixel: true,
            caption:
              'Each sheet is 128 × 128 px = a 4 × 4 grid of 32px tiles. Sixteen tiles per sheet, numbered 0–15 left-to-right, top-to-bottom.',
            items: [
              {
                src: `${KIT}/ground/tilesets/castle-ground-grass-dirt-wang-32.png`,
                label: 'grass → dirt',
                sub: 'the base layer and its worn edges',
              },
              {
                src: `${KIT}/ground/tilesets/castle-ground-dirt-paving-wang-32.png`,
                label: 'dirt → paving',
                sub: 'the approach to the gate',
              },
            ],
          },
          {
            kind: 'bullets',
            items: [
              'A **tile index** is just its position in the sheet, counting from 0.',
              'Same PNG, two readings: a *spritesheet* to the asset pack, a *tileset* to the tilemap.',
            ],
          },
        ],
      },
      {
        id: 'wang',
        title: 'What "Wang" actually means',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A Wang tile is defined by its four CORNERS, not by its picture.',
            text:
              'Forget "edge tiles" and "corner tiles" as a list to memorise. There is one rule: each corner of a tile is either material A or material B. Four corners, two choices each = 2×2×2×2 = 16 combinations. That is why the sheet has exactly 16 tiles. Not 15, not 20. Sixteen, always.',
          },
          {
            kind: 'bullets',
            items: [
              'Two tiles fit together **when their touching corners agree.** That is the whole system.',
              'The tile\'s index is the four corners read as a binary number: **TL=8, TR=4, BL=2, BR=1**.',
              'So index 0 = all dirt. Index 15 = all grass. Index 12 = both top corners grass.',
              'You never have to memorise which tile is "the top-left corner piece" — you count corners.',
            ],
          },
          {
            kind: 'wangLab',
            src: `${KIT}/ground/tilesets/castle-ground-grass-dirt-wang-32.png`,
            a: 'dirt',
            b: 'grass',
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Do we have one, or do we need to make one?',
            text:
              'We have one. This was verified, not assumed — I decoded all 16 tiles of the sheet above by sampling their corner pixels, and every combination appears exactly once, in correct binary order. It is a textbook 2-corner Wang set. Both our tilesets are.',
          },
          {
            kind: 'try',
            title: 'Predict a tile before you look at it',
            steps: [
              'Cover the labels in the widget above (or just look away from them).',
              'Ask yourself: which tile has grass on the LEFT half only? Left half = TL + BL = 8 + 2 = **index 10**.',
              'Now check tile 10. Grass on the left, dirt on the right.',
              'One more: grass in the bottom-right corner only = BR = **index 1**.',
            ],
            proves:
              'You can now name any tile in the sheet by arithmetic instead of by hunting. When I say "fill with 15 and edge with 10", you know exactly what the ground will look like before it renders.',
          },
        ],
      },
      {
        id: 'boring',
        title: 'But one tile repeated is boring — isn\'t it?',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Yes. And that is correct. The ground layer is SUPPOSED to be boring.',
            text:
              'Raheem asked this on 2026-08-06 and it is the right question. If the whole sheet gives you plaid and one tile gives you a flat brown stripe, where does the interest come from? Answer: not from the tile grid. Interest is added in three later passes, and every one of them sits ON TOP of a boring, uniform base.',
          },
          {
            kind: 'bullets',
            items: [
              'Look at the grass you already have: **one tile, ID 16, repeated 3,780 times.** It reads fine, because nothing draws the eye to the repeat.',
              'A flat interior is the *canvas*. If the ground itself is busy, everything you place on it fights for attention.',
              'The plaid was ugly not because it was varied, but because it was **regularly** varied. A visible 4×4 rhythm is worse than no variation at all.',
            ],
          },
          {
            kind: 'table',
            head: ['Where interest actually comes from', 'What it is', 'Cost'],
            rows: [
              ['**1. The edge shape**', 'A path that bends, narrows and widens. The Wang edges make the boundary irregular — this does most of the work.', 'Free, just painting'],
              ['**2. Overlays**', 'Loose sprites scattered on top — pebbles, cart ruts, clover. No grid, so no rhythm.', 'Free, we already have 4'],
              ['**3. Props & shadows**', 'Barrels, carts, trees, and the shadows they cast across the path.', 'Free, kit already has them'],
              ['4. Variant tiles', 'A second "solid dirt" tile with a different scuff, dropped in at random. We do NOT have these.', '~2 generations if we ever want them'],
            ],
          },
          {
            kind: 'callout',
            tone: 'key',
            title: 'The order matters, and it is the opposite of instinct.',
            text:
              'Flat base → irregular edges → overlays → props. Trying to make the base interesting first is the classic beginner move, and it makes every later pass harder because the ground is already noisy.',
          },
          {
            kind: 'compare',
            left: {
              title: 'What NOT to do',
              points: [
                'Drag the whole tileset as a brush → plaid',
                'Hand-vary interior tiles to "mix it up" → visible noise',
                'Judge the ground before overlays exist',
                'Generate more tiles to fix a composition problem',
              ],
            },
            right: {
              title: 'What to do',
              points: [
                'One solid tile for the whole interior',
                'Wang tiles ONLY where dirt meets grass',
                'Make the path bend and change width',
                'Then scatter overlays, then place props',
              ],
            },
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The honest test',
            text:
              'A tilemap always looks like a tilemap right up until the moment something irregular sits on it. Judge the ground after the overlay pass, never before. If it still reads as a grid then, that is when variant tiles are worth paying for.',
          },
          {
            kind: 'try',
            title: 'See that flatness is not the problem',
            steps: [
              'Look at the grass in the editor. One tile, thousands of times.',
              'Now ask: does the *grass* look repetitive, or does it just look like grass?',
              'Compare against the plaid path. Same map, same tile size.',
            ],
            proves:
              'That the eye notices RHYTHM, not repetition. Uniform reads as texture; patterned reads as a mistake. This is why the fix is fewer tiles, not more.',
          },
        ],
      },
      {
        id: 'overlays',
        title: 'Overlays — the anti-repetition trick',
        blocks: [
          {
            kind: 'gallery',
            items: [
              { src: `${KIT}/ground/overlays/castle-ground-overlay-grass-clover.png`, label: 'clover' },
              { src: `${KIT}/ground/overlays/castle-ground-overlay-pebbles-scuffs.png`, label: 'pebbles' },
              { src: `${KIT}/ground/overlays/castle-ground-overlay-cart-ruts.png`, label: 'cart ruts' },
            ],
            caption:
              'These are NOT tiles. They are loose sprites you scatter on top of the grid to break up the repetition.',
          },
          {
            kind: 'callout',
            tone: 'tip',
            text:
              'A tilemap always looks like a tilemap until something irregular sits on it. Overlays are the cheapest fix — three PNGs, placed by hand, no grid.',
          },
        ],
      },
      {
        id: 'driving',
        title: 'Driving the editor',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A tilemap is not edited by clicking it. You enter a mode.',
            text:
              'This is the thing that makes the editor feel broken on day one. Selecting the map in the canvas does nothing useful — you select it in the top-left panel (Outline), which switches the whole editor into tile-painting mode. Until you do, there is no palette and no brush.',
          },
          {
            kind: 'bullets',
            items: [
              'Select **`courtyardGround`** under `Tile Map` in the top-left panel (Outline).',
              'The right panel (Inspector) changes — you get **TILE SETS**, **LAYERS** and **Tilemap Palette** sections.',
              'The layer you are painting on shows an **orange border and a grid overlay** in the canvas. No orange border = you are not painting anything.',
              'There is also an **Edit Map** button, and the **`P`** key, for entering the mode directly.',
            ],
          },
          {
            kind: 'table',
            head: ['To do this', 'Do this', 'Notes'],
            rows: [
              ['Zoom in / out', 'Mouse wheel over the canvas', 'Works in the scene and in the tileset palette'],
              ['Pan the view', '**Alt** + drag, or middle-mouse drag', 'Also works inside the palette'],
              ['Pan (tool mode)', '**Space**, then drag', 'Same as the ✋ hand icon, top toolbar far right'],
              ['Enter tile-edit mode', 'Select the tilemap in Outline, or press **`P`**', 'The mode, not a tool'],
              ['Save', '**Ctrl + S**', 'The `•` on the tab means unsaved'],
              ['Preview the scene', '**Ctrl + 0**', 'Runs it for real'],
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'There is no "zoom to fit" key.',
            text:
              'I told Raheem to press F on 2026-08-06. That is not a Phaser Editor binding and it did nothing. Recorded here so the lesson carries the correction rather than repeating it. Use the mouse wheel.',
          },
          {
            kind: 'bullets',
            items: [
              '**Pick a brush:** in the Inspector\'s **Tilemap Palette**, choose the tileset and the target layer, then **drag across the tileset** from top-left to bottom-right. Dragging is how you get a multi-tile brush; a single click is a 1×1 brush.',
              '**Tiles are always drawn on a specific layer.** Wrong layer selected is the second-most-common "nothing is happening".',
            ],
          },
          {
            kind: 'table',
            head: ['Tool', 'What it does', 'Trick'],
            rows: [
              ['**Stamp**', 'Click to place the brush; drag to paint a stroke', 'Your default. Use it for paths.'],
              ['**Bucket Fill**', 'Floods connected cells sharing one tile ID', 'How the grass got there'],
              ['**Rectangle Fill**', 'Fills a dragged rectangle', 'Best for plazas and paving slabs'],
              ['**Eraser**', 'Drag to delete cells', '**Shift + click** erases all connected matching tiles'],
              ['**Rectangular Selection**', 'Select an area', '**Ctrl + C** copies it as a Stamp brush — clone a bend you liked'],
              ['**Tileset Info**', 'Shows each tile\'s index', 'Use it to confirm the Wang numbering above'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The single best tip on this page',
            text:
              'Rectangular Selection + Ctrl+C turns any patch you have already painted into a brush. Paint one good grass-to-dirt transition by hand, copy it, and stamp it everywhere else. You never paint the same corner twice.',
          },
          {
            kind: 'try',
            title: 'Get the palette to appear',
            steps: [
              'Top-left panel (Outline) → `Tile Map` → click **`courtyardGround`**.',
              'Look at the right panel (Inspector). **TILE SETS**, **LAYERS**, **Tilemap Palette** should now be there.',
              'Look at the canvas — the `ground` layer should have an orange border.',
              'In **Tilemap Palette**, pick tileset `grass-dirt` and layer `ground`.',
              'Click a tile in the palette, choose **Stamp**, and click once on the map.',
            ],
            proves:
              'That the editor is modal. Nothing about tile painting is reachable until the map is selected in the Outline — which is why the canvas felt dead.',
          },
        ],
      },
      {
        id: 'plaid',
        title: 'The plaid path — a real mistake, diagnosed',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A repeating checkerboard means your brush was the whole tileset.',
            text:
              'Raheem painted the first path on 2026-08-06 and it came out as a woven plaid. Nothing was broken. The brush was a 4×4 selection — all sixteen Wang tiles — so every stamp laid down the entire sheet as a pattern, over and over.',
          },
          {
            kind: 'bullets',
            items: [
              'Remember: you pick a brush by **dragging across the tileset**. Drag the whole sheet and your brush *is* the whole sheet.',
              'The interior of a path is **one tile repeated** — the solid one. Wang tiles are for the *edges only*.',
              'Rule of thumb: **click** a single tile for fills, **drag** only when you deliberately want a multi-tile stamp.',
            ],
          },
          {
            kind: 'callout',
            tone: 'key',
            title: 'Tile IDs in the scene are NOT sheet indexes.',
            text:
              'This trips everyone once. Each tileset is offset by where it starts in the map. In CourtyardV2, grass-dirt occupies IDs 1–16 and dirt-paving occupies IDs 17–32. So sheet index 15 of grass-dirt (all grass) is stored as ID 16 — which is why the flood fill was "16".',
          },
          {
            kind: 'table',
            head: ['You want', 'Tileset', 'Sheet index', 'ID in the scene file'],
            rows: [
              ['Solid grass', 'grass-dirt', '15', '**16**'],
              ['Solid dirt', 'grass-dirt', '0', '**1**'],
              ['Solid dirt (paving sheet)', 'dirt-paving', '0', '**17**'],
              ['Solid paving', 'dirt-paving', '15', '**32**'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Formula',
            text:
              'ID = sheet index + firstgid. grass-dirt firstgid = 1, dirt-paving firstgid = 17. The Tileset Info tool shows you this in the editor without any arithmetic.',
          },
          {
            kind: 'callout',
            tone: 'key',
            title: 'How to know Ctrl+S worked.',
            text:
              'Look at the scene TAB at the top of the canvas. `CourtyardV2.scene •` — that bullet means unsaved changes. Save and the bullet disappears. That dot is the only save indicator; there is no toast, no flash, no status bar message.',
          },
          {
            kind: 'try',
            title: 'Make the dot appear and vanish',
            steps: [
              'Paint a single tile anywhere. Look at the tab — the `•` appears.',
              'Press **Ctrl + S**. The `•` disappears.',
              'Ask me to read the file from disk. The tile is there.',
            ],
            proves:
              'That saving is real and observable, and that "did it save?" is answerable in half a second by looking at one character on the tab.',
          },
        ],
      },
      {
        id: 'doing',
        title: 'The build — who does what',
        blocks: [
          {
            kind: 'steps',
            items: [
              {
                who: 'claude',
                do: 'Delete the throwaway `ForestGreeting` scene, create a properly-named one.',
                see: 'A new .scene appears in the left panel.',
              },
              {
                who: 'claude',
                do: 'Attach the halo-stone-castle kit pack to the scene.',
                see: 'The bottom-middle panel (Blocks) fills with towers, walls, trees, tilesets.',
              },
              { who: 'both', do: 'Agree the map size in tiles — before painting anything.' },
              {
                who: 'claude',
                do: 'Add an editable tilemap at 32×32, attach both tilesets, add a base layer.',
                see: 'A Tilemap object appears in the top-left panel (Outline).',
              },
              { who: 'claude', do: 'Flood-fill the base layer with plain grass.' },
              {
                who: 'raheem',
                do: 'Select the layer in the Outline, pick a tile from Blocks, and paint the path by hand.',
                see: 'Tiles change under your cursor as you drag.',
              },
              { who: 'claude', do: 'Screenshot the scene over MCP, then fix seams and wrong edge tiles.' },
              { who: 'claude', do: 'Save and commit.' },
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Always flood-fill a base first.',
            text:
              'Painting onto empty space leaves transparent holes. They are nearly invisible in the editor and obvious the moment the game runs.',
          },
        ],
      },
      {
        id: 'try',
        title: 'Try it',
        blocks: [
          {
            kind: 'try',
            title: 'Break it on purpose, then fix it',
            steps: [
              'Paint a small square of dirt using ONLY the plain centre tile.',
              'Look at the border — a hard rectangular line.',
              'Now redo the border using the edge and corner tiles.',
            ],
            proves:
              'What a Wang tileset actually buys you. The corner pieces are not decoration; they are the entire reason the sheet has 16 tiles instead of 1.',
          },
          {
            kind: 'try',
            title: 'Find the invisible hole',
            steps: [
              'Erase one tile in the middle of your grass.',
              'Look for it in the editor — hard to see against the dark background.',
              'Ask me to screenshot it. It reads instantly against the scene.',
            ],
            proves:
              'Why I screenshot every build step instead of trusting the canvas. My eyes and yours catch different faults.',
          },
        ],
      },
    ],
    checkpoint: [
      'Scene contains one tilemap, at least one layer, no transparent holes.',
      'Both tilesets attached.',
      'You painted at least one path segment by hand.',
      'Scene saved and committed to git.',
    ],
  },

  /* ------------------------------------------------------------------ 2 */

  /* ------------------------------------------------------------------ 2 */
  {
    id: 'castle',
    number: 2,
    title: 'The Castle',
    status: 'live',
    outcome: 'Place walls, towers and a gate that line up and belong to each other.',
    minutes: 25,
    sections: [
      {
        id: 'datum',
        title: 'The datum — the one table that stops everything drifting',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Every castle piece stands on ONE line: y = 1216.',
            text:
              'Pick the ground line once, size every piece as a whole number of tiles, and things snap together without nudging. Improvise it and you spend the session dragging pieces a few pixels at a time.',
          },
          {
            kind: 'table',
            head: ['Piece', 'Size', 'In tiles', 'Top row'],
            rows: [
              ['Wall', '384 x 288', '12 x 9', '29'],
              ['Gate', '288 x 320', '9 x 10', '28'],
              ['**Tower**', '288 x **384**', '9 x **12**', '**27**'],
              ['Corner', '192 x 288', '6 x 9', '29'],
            ],
          },
          {
            kind: 'bullets',
            items: [
              'Three different top rows — 29, 28, 27 — give the **stepped silhouette**. Wall lowest, gate above it, tower above that.',
              'Every dimension divides by 32. A piece 287px tall will **never** line up again.',
              '**Camera is 2x**, so one screen is 960 x 540 = 30 x 17 tiles. Size everything against that.',
            ],
          },
        ],
      },
      {
        id: 'scale',
        title: 'Scale — the mistake that hid for weeks',
        blocks: [
          {
            kind: 'callout',
            tone: 'warn',
            title: 'The first castle was shorter than the staircase.',
            text:
              'Walls were 0.93x the hero and towers 1.29x — a defensive wall the height of the man standing at it. Nobody spotted it until the hero was placed beside one, which is why a hero now goes into every art review.',
          },
          {
            kind: 'table',
            head: ['', 'Old kit', 'Now'],
            rows: [
              ['Wall vs hero', '0.93x', '**2.88x**'],
              ['Tower vs hero', '1.29x', '**3.84x**'],
              ['Cliff vs hero', '1.28x', '**2.56x**'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Put the hero in every review sheet.',
            text:
              'Scale is invisible in isolation and obvious next to a character. It costs one line of code and it is the cheapest bug-catcher in the project.',
          },
        ],
      },
      {
        id: 'projection',
        title: 'Projection — pick one and never mix',
        blocks: [
          {
            kind: 'image',
            src: '/assets/review/castle-kit/filter-proof.png',
            caption:
              'Same PNGs at 3x. Left NEAREST, right LINEAR. Blurry pixel art is almost always a render setting, not the art.',
            maxWidth: 860,
          },
          {
            kind: 'bullets',
            items: [
              '**Lean** is the measurement: how far a silhouette drifts from top to bottom. **0 = true elevation.**',
              'The old wall kit measured **-96.5px lean** on straight walls and **0** on towers — two incompatible projections in one kit.',
              '**Root cause:** the diagonal pieces came from a different endpoint. **One endpoint per structural family.**',
              'South walls face you, so they are **flat elevation**. East, west and north runs are seen from above, so they are **top-down**. Different art — not the same art rotated.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Check the transparent area, not just the art.',
            text:
              'The side walls shipped with the editor’s own transparency CHECKERBOARD baked into the PNG — 10,028 grey pixels — and the watch tower with 1,183 black speckles floating beside it. Both invisible on a dark review background, both obvious in the map. The test is connectivity, not colour: junk does not touch the sprite, and comes in two or three flat shades. Real detached art (waterfall spray, loose scree) has 30+ shades — which is how `lib/despeckle.py` tells them apart instead of eating them.',
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'NEAREST, not LINEAR.',
            text:
              'Phaser defaults to LINEAR, which blends neighbouring pixels and turns pixel art to mush the moment you zoom in. Set NEAREST on every kit texture — not just the hero, which is the trap the old courtyard fell into.',
          },
        ],
      },
      {
        id: 'palette',
        title: 'Colour — when to match, and when to leave alone',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Match like material to like material. Never across families.',
            text:
              'Two cliff faces of the same rock: match them. A carved pillar onto natural cliff: never — it vanishes into the rock. Art that is already right: leave it alone.',
          },
          {
            kind: 'compare',
            left: {
              title: 'What went wrong',
              points: [
                'Matched a pillar to the cliff — it disappeared',
                'Matched good art to a small reference — washed out, the gold died',
                'Matched by nearest colour — kept the wrong hue entirely',
                'Compared averages while the hues were 120 degrees apart',
              ],
            },
            right: {
              title: 'What works',
              points: [
                'Map by **luminance rank** — darkest onto darkest',
                'Split by material first: stone, foliage, gold, timber',
                'Protect what must not change (54,989 timber pixels)',
                '**Always show the palette bar**, never just a number',
              ],
            },
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Generate as a set.',
            text:
              'Raheem worked this out: pieces generated in ONE batch with identical style wording agree with each other. A piece generated alone later does not — and no amount of colour correction fully fixes it.',
          },
        ],
      },
      {
        id: 'try',
        title: 'Try it',
        blocks: [
          {
            kind: 'try',
            title: 'Prove the datum',
            steps: [
              'Drop a wall at any x that divides by 32, base on y = 1216.',
              'Drop a tower beside it, base on the same line.',
              'They butt exactly, and the tower stands three tiles proud. No nudging.',
            ],
            proves:
              'That alignment is arithmetic, not eyeballing. Once the datum exists, placement stops being fiddly.',
          },
        ],
      },
    ],
    checkpoint: [
      'You can name the ground line and why it matters.',
      'You can say why towers are 384 and walls 288.',
      'You know lean 0 means true elevation.',
      'You know when NOT to colour-match.',
    ],
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: 'forest',
    number: 3,
    title: 'The Forest',
    status: 'live',
    outcome: 'Make ground and trees belong to each other instead of competing.',
    minutes: 20,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'In a forest the ground is the floor of a room, not the subject.',
            text:
              'Bright saturated grass makes a Pokemon lawn. A deep forest has a DARK, COOL floor so the canopy is the brightest thing in frame — that is what makes it somewhere an ogre could step out of.',
          },
          {
            kind: 'gallery',
            caption: 'Eight trees. Family A is warm, family B is cool — they are for different moods.',
            items: [
              { src: `${KIT}/recovered/castle-trees-a-0.png`, label: 'Honeycloud Poplar' },
              { src: `${KIT}/recovered/castle-trees-a-1.png`, label: 'Apricot Fanmaple' },
              { src: `${KIT}/recovered/castle-trees-a-2.png`, label: 'Mellowbell Willow' },
              { src: `${KIT}/recovered/castle-trees-a-3.png`, label: 'Sunsketch Acacia' },
              { src: `${KIT}/recovered/castle-trees-b-0.png`, label: 'blue pine' },
              { src: `${KIT}/recovered/castle-trees-b-1.png`, label: 'teal willow' },
              { src: `${KIT}/recovered/castle-trees-b-2.png`, label: 'green bare' },
              { src: `${KIT}/recovered/castle-trees-b-3.png`, label: 'pale bare' },
            ],
          },
        ],
      },
      {
        id: 'colour',
        title: 'Why the ground fights the trees',
        blocks: [
          {
            kind: 'table',
            head: ['', 'Hue', 'Reads as'],
            rows: [
              ['Grass now', '~100 deg, sat 0.55', 'loud pure green'],
              ['Family A canopies', '35-65 deg', 'yellow, apricot, honey'],
              ['Family B canopies', '177-223 deg', 'teal, blue'],
              ['**Target ground**', '**~140 deg, darker**', '**cool shade**'],
            ],
          },
          {
            kind: 'bullets',
            items: [
              'Nothing in the picture is **darker** than anything else, so the ground competes instead of receding.',
              'Push the ground **cooler and darker**: warm canopies glow, cool ones sink into shade.',
              '**Colour is a post-process.** Never re-roll art for hue — a ramp recolour is exact, free and reversible.',
            ],
          },
          {
            kind: 'image',
            src: `${KIT}/review/ground/ground-tone-compare.png`,
            caption:
              'The two greens we own, then four proposed forest floors — under the trees ACTUALLY planted in the map, with a hero for scale. Green/red under each name is the test that matters: is this floor quieter and darker than the canopy standing on it? Built free by scripts/sprite-lab/lib/ground_tone_sheet.py.',
            maxWidth: 980,
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'A forest floor and a courtyard lawn are two different places.',
            text:
              'The temptation is to find one green that works everywhere. Do not — the open courtyard should stay bright, and the forest should be somewhere else. Two tilesets, painted where each belongs, costs nothing extra.',
          },
          {
            kind: 'callout',
            tone: 'key',
            title: 'DECIDED 2026-08-07 — the forest floor is “mossdark”.',
            text:
              'Cooler, much darker, and far less saturated than the lawn. 1,163 tiles painted around the north, east and west of the castle; the courtyard keeps the bright green. The rule it came from: a floor must be QUIETER and DARKER than whatever stands on it.',
          },
          {
            kind: 'table',
            head: ['', 'hue', 'sat', 'val', 'verdict'],
            rows: [
              ['Canopy', '114°', '0.34', '0.45', 'the thing that must stand out'],
              ['Lawn (before)', '127°', '**0.49**', '**0.45**', '**as bright, and louder**'],
              ['Every other green we had', '108-129°', '0.31-0.50', '0.40-0.53', 'all fail the same way'],
              ['**Forest floor (now)**', '**114°**', '**0.27**', '**0.28**', '**quieter + darker**'],
            ],
          },
          {
            kind: 'bullets',
            items: [
              'The defect was never "not green enough". The floor was **exactly as bright as the canopy**, so the trees had nothing to stand against.',
              'Eight grass variants existed and **all eight failed** — every one sat between 0.31 and 0.50 saturation against a 0.34 canopy. More greens would not have helped.',
              'The fix was a **recolour, not a generation** — free, exact, reversible, identical across all 16 tiles. `lib/tint_ground.py`.',
              '**Only the grass side was retinted.** The dirt keeps its hue and just drops into shade, so the transition tiles stay continuous with the dirt outside the forest.',
              'Measure the thing that has to stand out FIRST, then pick the floor against it. Judging two greens side by side tells you nothing about whether a tree reads.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'What a recolour cannot do.',
            text:
              'This floor is still grass texture — blades and clover speckles, darkened. It is not leaf litter, roots or twigs. Colour is a post-process; STRUCTURE has to be generated. A true forest-floor Wang set is ~20 generations, and mossdark is the colour brief for it.',
          },
        ],
      },
      {
        id: 'life',
        title: 'Four free things that make it alive',
        blocks: [
          {
            kind: 'bullets',
            items: [
              '**Dappled light** — big soft patches of brighter ground where sun breaks the canopy. The strongest forest cue there is.',
              '**Leaf litter** under each tree, tinted to that tree own canopy colour. Ties trunk to ground and kills the sticker look.',
              '**Contact shadows** — generated from each sprite own alpha. Squash, blur, darken. Zero art cost.',
              '**Undergrowth** — ferns, moss, a fallen log. A bare floor says nothing lives here.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Watch for baked captions.',
            text:
              'PixelLab writes the item name INTO the frame when you generate a set. Four of the eight trees arrived with text under the roots — invisible in a thumbnail, and it renders in-game. Always check the bottom rows.',
          },
          {
            kind: 'lab',
            route: '/dev/light-lab',
            title: 'Light Lab',
            blurb:
              'Same grass and the same trees, with sliders. Drop the ambient strength and watch the floor recede behind the canopy — that is the whole fix, and it costs no generations.',
            learn: [
              'What a darker, cooler floor does to the trees',
              'How much dapple a forest actually needs',
            ],
          },
        ],
      },
    ],
    checkpoint: [
      'You can say why a forest floor should be darker than the canopy.',
      'You can name two free ways to add life to flat ground.',
      'You know colour is fixed after generation, never by re-rolling.',
    ],
  },

  /* ------------------------------------------------------------------ 4 */
  {
    id: 'light',
    number: 4,
    title: 'Light',
    status: 'live',
    outcome: 'Understand how 2D light is faked, and tune a forest canopy yourself.',
    minutes: 20,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: '2D lighting is three tricks, and none of them are real light.',
            text:
              'A dark rectangle over the world is the time of day. Holes erased in that darkness are light. Moving the holes slowly is life. That is the whole mechanism — everything else is tuning.',
          },
          {
            kind: 'table',
            head: ['Trick', 'What it does', 'Cost'],
            rows: [
              ['**Ambient layer**', 'Full-screen colour on MULTIPLY = the hour of the day', 'free'],
              ['**Erased holes**', 'Soft blobs cut out of the darkness = sun through leaves', 'free'],
              ['**Slow drift**', 'Tween those holes = leaves moving', 'free'],
              ['Additive glows', 'ADD blend sprites = torches, crystals, fireflies', 'free'],
              ['Light2D + normal maps', 'Real per-pixel lighting', 'heavy, often worse for pixel art'],
            ],
          },
        ],
      },
      {
        id: 'shadows',
        title: 'Shadows are authored, never computed',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A 2D engine will not work out where a shadow falls. You draw it.',
            text:
              'But not by hand: take the sprite own alpha, squash it to about 30%, blur it, darken it. It matches the silhouette exactly because it IS the silhouette. Every tree and prop in one batch, no generations.',
          },
          {
            kind: 'bullets',
            items: [
              'Place the shadow **at the feet**, under the sprite, origin 0.5 / 1.',
              'Stretch it away from the sun — the direction tells the player where the light is.',
              'Soft and weak beats hard and black. **Contact shadows sell weight**, not drama.',
            ],
          },
        ],
      },
      {
        id: 'lab',
        title: 'The lab',
        blocks: [
          {
            kind: 'lab',
            route: '/dev/light-lab',
            title: 'Light Lab',
            blurb:
              'Your real grass, your real trees, and a slider for every value. Tune until it looks right, then those exact numbers get baked into the scene.',
            learn: [
              'How ambient colour changes the hour',
              'How many light spots read as canopy, and how big they need to be',
              'How slow the drift has to be before it feels like leaves',
              'Why the editor can never show you this — lighting is runtime, not placement',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Fixed mood beats a live clock.',
            text:
              'A courtyard that is always warm afternoon and a forest that is always green twilight is cheaper and usually better than a running day/night cycle — a live cycle means every asset has to read at every hour. Walk first.',
          },
        ],
      },
    ],
    checkpoint: [
      'You can name the three tricks that make 2D light.',
      'You know shadows are authored, and can be generated from alpha.',
      'You have opened the Light Lab and moved a slider.',
    ],
  },

  /* ------------------------------------------------------------------ 5 */
  {
    id: 'collision',
    number: 5,
    title: 'The Collision Layer',
    status: 'live',
    outcome: 'Draw the walls the hero cannot walk through, yourself, in the Editor.',
    minutes: 25,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Collision is a SECOND map, drawn on top of the first one.',
            text:
              'The art says what the courtyard looks like. The collision layer says where the floor is. They are separate on purpose — a wall you can see and a wall you can walk into are two different pieces of information, and the game only reads the second one.',
          },
          {
            kind: 'bullets',
            items: [
              'You draw plain rectangles in a layer called **L14_COLLIDERS**.',
              'Nothing about them is code. They are shapes, the same as everything else you place.',
              'The game hides them and turns them into walls when it runs.',
              'They are invisible in play — add `?colliders=show` to the URL to see them again.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Why not just block the pictures?',
            text:
              'Because in a top-down game you walk on the floor, not on the picture. A tower is 300px tall in the art and stands on maybe 90px of ground. Blocking its picture would stop you a whole tower short of it.',
          },
        ],
      },
      {
        id: 'where',
        title: 'Where the layer is',
        blocks: [
          {
            kind: 'steps',
            items: [
              {
                who: 'raheem',
                do: 'Open **CourtyardV2** and look at the top-left panel (Outline).',
                see: 'A layer named `L14_COLLIDERS`, at the bottom of the list.',
              },
              {
                who: 'raheem',
                do: 'Expand it.',
                see: '33 shapes, named by what they block: `BLOCK_mapEdge_*`, `BLOCK_castleWall_*`, `BLOCK_cliff_*`, `BLOCK_forestEdge_*`, `BLOCK_prop_*`, and one blue `ZONE_castleGate_passage`.',
              },
              {
                who: 'raheem',
                do: 'Click `BLOCK_castleWall_southWest` and look at the right panel (Inspector).',
                see: 'x, y, width, height, and a red fill. That is the entire definition of a wall.',
              },
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The four map-edge shapes are already correct — leave them alone.',
            text:
              'They sit just outside the 2560 × 1920 map and stop you walking off the world. They are the one part of collision that is pure arithmetic, so I did them.',
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Everything else is a FIRST PASS. Expect to move it.',
            text:
              'The castle, cliff, forest and prop shapes were measured off a scene screenshot, not traced by hand. They are close enough to walk around and judge, which is the point — it is far easier to drag a wall that is 30px out than to place one from nothing.',
          },
        ],
      },
      {
        id: 'colour',
        title: 'Colour is the meaning',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A collider says what it is with its FILL COLOUR, not its name.',
            text:
              'The Editor turns a label into a variable name and nothing else — the game never sees the words you type. So the meaning had to be carried by something the game can read, and colour is the one that is also legible at a glance on the canvas.',
          },
          {
            kind: 'table',
            head: ['Fill colour', 'Prefix to use in the label', 'What it does'],
            rows: [
              ['`#ff3355` red', '`BLOCK_`', 'Solid. The hero cannot enter it.'],
              ['`#33ccff` blue', '`ZONE_`', 'Passable. Fires an event on enter and on leave.'],
              ['anything else', '(your choice)', 'Ignored. Useful for a shape you are still positioning.'],
            ],
          },
          {
            kind: 'bullets',
            items: [
              'Set **fillAlpha to about 0.35** so you can see the art underneath while you trace.',
              'The label still matters — for you, and for me, and for git diffs. Name it what it blocks.',
              'A colour nudged slightly off still counts. There is a tolerance, so fiddling with the picker cannot silently break a wall.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The fastest way to make a new collider',
            text:
              'Select an existing one, Ctrl+C, Ctrl+V, then drag and resize. It arrives with the right colour and alpha already set, so you never touch the colour picker.',
          },
        ],
      },
      {
        id: 'angled',
        title: 'Angled walls — the thing most engines get wrong',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'When the art leans, rotate the rectangle — do not build a staircase of little boxes.',
            text:
              'Our castle walls lean with the perspective. Rotation is fully supported, so trace the lean with one long rotated rectangle and it will be exact. (This applies to a wall that LEANS. Art that genuinely steps is a different case — see the next section.)',
          },
          {
            kind: 'compare',
            left: {
              title: 'Staircase of upright boxes (what we did before)',
              points: [
                'Six rectangles per wall',
                'Each jogs ~24px sideways against 34px-wide feet',
                'Walking the wall diagonally snags on every step',
                'Reads as a bug, not as a stone wall',
              ],
            },
            right: {
              title: 'One rotated rectangle',
              points: [
                'One shape, matching the lean exactly',
                'No steps to catch on',
                'The hero slides along the face smoothly',
                'You trace the way the perspective actually runs',
              ],
            },
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Why this is possible at all',
            text:
              'Standard Phaser physics bodies cannot rotate — a leaning wall would seal off ~80px of open paving at each end. The courtyard has one walker, no projectiles and no bouncing, so it does not run physics at all. It asks one question per step: may the feet go here? That question does not care about angles.',
          },
        ],
      },
      {
        id: 'steps-or-lean',
        title: 'Steps or a lean? Read the material first',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Match the collider to HOW THE ART WAS MADE, not to how the edge looks from far away.',
            text:
              'Two things in this courtyard both read as "a diagonal edge" and they want opposite treatments. Getting this backwards is the difference between an edge that feels solid and one that snags.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Painted art that LEANS → one rotated rectangle',
              points: [
                'Castle walls, the rock-face bands, anything drawn as a single image',
                'The edge is a smooth continuous line',
                'A staircase would jog sideways against 34px feet and catch on every step',
                'One rotated shape is exact and less work to draw',
              ],
            },
            right: {
              title: 'Tilemap art that STEPS → a staircase of boxes',
              points: [
                'Ground edges built from 32px Wang tiles — they are literally stepped',
                'A rotated shape would cut corners off the steps and hang over others',
                'The staircase IS the shape; it is not an approximation of one',
                'Snap the boxes to the 32px grid the tiles already live on',
              ],
            },
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'How to tell them apart in one move',
            text:
              'Zoom in. If the edge is made of 32×32 squares, it is a tilemap and it steps. If it is a smooth line at any angle, it is a painted image and it leans. Your eye at normal zoom cannot tell — both look like a diagonal.',
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'A staircase must OVERLAP, or you build a row of small holes.',
            text:
              'Each box has to reach past its neighbours in both directions. A box that stops exactly where the next one starts leaves a notch, and a notch narrower than the feet still lets a corner sample slip through on some approach angles. Overlap by a tile; it costs nothing.',
          },
          {
            kind: 'bullets',
            items: [
              'The **west cliff end** is tilemap, so it is a staircase — `BLOCK_cliffStep_westLowerEnd_1..4`.',
              'The **rock-face bands** are painted images, so they are long single rectangles — `BLOCK_cliff_*`.',
              'Both are correct. They are different materials, not different opinions.',
            ],
          },
          {
            kind: 'try',
            title: 'Feel the notch',
            steps: [
              'Walk down the west cliff edge diagonally, hugging the steps.',
              'Now stretch each step box 16px taller so they overlap, save, and walk it again.',
              'Then try the opposite: shrink them until small gaps open, and walk it a third time.',
            ],
            proves:
              'That overlap, not box count, is what makes a stepped edge feel solid. The same four boxes can read as a cliff or as a broken fence depending only on whether they touch.',
          },
        ],
      },
      {
        id: 'walkable-tops',
        title: 'Leaving the top of a wall walkable',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A wall is not one solid slab — it is a face you cannot cross and a top you might stand on.',
            text:
              'Blocking the whole painted wall is the safe default. Pulling the collider DOWN to the base of the battlements turns the walkway into a place, which is most of what makes a castle feel like a castle rather than a fence.',
          },
          {
            kind: 'bullets',
            items: [
              'Block from the **bottom of the battlements** down, not from the top of the art down.',
              'Leave the walkway strip open and check you can still get on and off it.',
              'Make sure the strip is not a trap — it must connect back to somewhere.',
              'Keep the two side walls blocking, so the walkway has ends.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Walking BEHIND something is a depth problem, not a collision one.',
            text:
              'Colliders decide where the feet may go. They have no say in what draws on top of what. The hero currently renders above every Editor layer, so he will pass behind a wall geometrically and still be painted over it. Depth sorting is its own job and its own lesson.',
          },
        ],
      },
      {
        id: 'how',
        title: 'How to draw one, step by step',
        blocks: [
          {
            kind: 'steps',
            items: [
              { who: 'raheem', do: 'Select the `L14_COLLIDERS` layer in the Outline first, so the new shape lands inside it.' },
              { who: 'raheem', do: 'Copy an existing `BLOCK_` rectangle and paste it.' },
              {
                who: 'raheem',
                do: 'Drag and resize it over the FOOT of the object — the band that actually touches the ground.',
                see: 'A translucent red patch sitting on the floor, not covering the artwork.',
              },
              { who: 'raheem', do: 'If the object leans, set `angle` in the Inspector to match it.' },
              { who: 'raheem', do: 'Rename the label to `BLOCK_<what it is>`, e.g. `BLOCK_northTower_base`.' },
              { who: 'raheem', do: 'Ctrl+S.', see: 'The dot on the tab disappears.' },
              {
                who: 'raheem',
                do: 'Refresh `/dev/scene?start=CourtyardV2&colliders=show` and walk into it.',
                see: 'The hero stops at the red edge.',
              },
              { who: 'claude', do: 'Screenshot the walk, check nothing got sealed off, and commit.' },
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'The save-and-refresh loop is the whole loop.',
            text:
              'The browser reads the file the Editor writes on save. If a new wall does nothing, you almost certainly did not press Ctrl+S.',
          },
        ],
      },
      {
        id: 'goal',
        title: 'What we are actually aiming for',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'The goal is not "block everything". It is "the courtyard reads as a place".',
            text:
              'Walking should tell you where you are without a map. Walls hold you in, buildings push you around, and the open middle stays open. Over-blocking makes a corridor; under-blocking makes a photograph you happen to be standing on.',
          },
          {
            kind: 'bullets',
            items: [
              '**Block:** walls, tower bases, building footprints, the outer boundary.',
              '**Block tight:** a brazier stands on a slim tripod — block the tripod, not the flame.',
              '**Leave open:** the paved centre, every path, the space in front of a door.',
              '**Do not block:** anything you should be able to walk BEHIND. That is a depth problem, not a collision one.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The clearance number to keep in your head',
            text:
              'The hero\'s feet are 34px wide. A gap needs to be comfortably more than that or it reads as a wall with a bug in it. Aim for 80px+ for anywhere you expect people to walk regularly.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Too much collision',
              points: [
                'Every sprite boxed',
                'The courtyard becomes a maze of invisible furniture',
                'Diagonal walking snags constantly',
              ],
            },
            right: {
              title: 'Enough collision',
              points: [
                'The boundary is solid',
                'Big architecture pushes you around it',
                'Small props are either tight or ignored',
                'You can cross the courtyard in a straight line',
              ],
            },
          },
        ],
      },
      {
        id: 'zones',
        title: 'Blue zones — doors, and everything else later',
        blocks: [
          {
            kind: 'bullets',
            items: [
              'A blue `ZONE_` rectangle does not block. You walk straight through it.',
              'It fires `zone-enter` when your feet go in and `zone-leave` when they come out — once each, not every frame.',
              'Today nothing listens. That is fine: the shape is the durable part, the behaviour is a day of code later.',
              'This is how doors into the tower, the mine and the board game will be marked.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Place zones now, even with nothing wired to them.',
            text:
              'Deciding where a door is, is a design decision and yours. Making it open something is plumbing and mine. They do not have to happen in the same week.',
          },
        ],
      },
      {
        id: 'try',
        title: 'Try it',
        blocks: [
          {
            kind: 'try',
            title: 'See the second map',
            steps: [
              'Open `/dev/scene?start=CourtyardV2&colliders=show`.',
              'Walk the whole boundary. Note where you are stopped and where you fall off the edge of the art.',
              'Now drop `&colliders=show` and walk the same route.',
            ],
            proves:
              'How little collision is actually in the scene right now, and that the shapes are an authoring aid rather than part of the game world.',
          },
          {
            kind: 'try',
            title: 'Feel the difference between a rotated wall and a staircase',
            steps: [
              'Draw one long rectangle across a leaning wall and set its `angle` to match.',
              'Save, refresh, and walk into it diagonally. Note the slide.',
              'Now delete it and cover the same wall with four upright boxes instead.',
              'Walk it diagonally again.',
            ],
            proves:
              'Why the whole system is built on rotated shapes. The staircase catches; the single angled shape does not — and it was less work to draw.',
          },
          {
            kind: 'try',
            title: 'Break it on purpose',
            steps: [
              'Draw a `BLOCK_` rectangle around the whole picture of a tower, not just its base.',
              'Save, refresh, and try to walk past it on the far side.',
              'Shrink it down to the ground band and walk the same line.',
            ],
            proves:
              'That a collider is the floor an object stands on. The oversized version blocks paving that is visibly empty, which is the single most common collision fault in a top-down game.',
          },
        ],
      },
    ],
    checkpoint: [
      'You can find `L14_COLLIDERS` in the Outline without help.',
      'You can say what red and blue mean without looking it up.',
      'You have drawn at least one `BLOCK_` rectangle and been stopped by it in play.',
      'You have rotated one collider to match a leaning wall.',
      'You can name one thing that should NOT be blocked, and why.',
      'The scene is saved and committed.',
    ],
  },

  /* ------------------------------------------------------------------ 6 */
  {
    id: 'depth',
    number: 6,
    title: 'Depth — who draws in front',
    status: 'live',
    outcome: 'Know why you stand behind the castle wall inside and in front of it outside.',
    minutes: 15,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'An object\'s depth is the Y where it touches the ground.',
            text:
              'Not its layer. Not its position in a list. The single line where it meets the floor. Sort everything by that number and a top-down world composes itself.',
          },
          {
            kind: 'table',
            head: ['Where you stand', 'Your feet Y', 'South wall base', 'What you see'],
            rows: [
              ['In the courtyard', '900', '1216', '900 < 1216 → you are **behind** the wall'],
              ['Outside the gate', '1300', '1216', '1300 > 1216 → you are **in front** of it'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Nothing was written about the castle to make that work.',
            text:
              'One rule, applied to everything, every frame. It also puts you behind a tower, in front of a shrub, and behind a tree you walk above — including objects placed months from now that no code has ever heard of.',
          },
        ],
      },
      {
        id: 'not-layers',
        title: 'Why your layers could never have done this',
        blocks: [
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Phaser sorts by depth WITHIN a parent. Editor layers are parents.',
            text:
              'A wall in `L3_CASTLE` and a hero in the scene root can never sort against each other, whatever depths they carry. That is why walking around the castle looked like standing on top of it.',
          },
          {
            kind: 'bullets',
            items: [
              'At runtime every object that stands on the floor is moved into ONE band and sorted there.',
              'Your Editor layers keep doing what they are good at — grouping work for a human.',
              'They stop deciding draw order, which they were never able to do correctly.',
              'Three layers stay out: `L1_GROUND`, `L11_MARKERS`, `L14_COLLIDERS`.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Why the ground layer is excluded',
            text:
              'Paving and its pebble decals are floor. Sorted into the band, a decal would draw over your head every time you stood north of it.',
          },
        ],
      },
      {
        id: 'scenes',
        title: 'When to use a separate scene instead',
        blocks: [
          {
            kind: 'compare',
            left: {
              title: 'One scene + y-sort',
              points: [
                'The courtyard and the field outside it',
                'One continuous space you can see across',
                'Crossing your own front wall should not cut',
              ],
            },
            right: {
              title: 'A separate scene',
              points: [
                'Through a door into a room, a tower, the mine',
                'The view changes completely',
                'You cannot see the courtyard any more',
                'This is what the blue `ZONE_` shapes are for',
              ],
            },
          },
        ],
      },
      {
        id: 'limit',
        title: 'The known limit — north/south walls',
        blocks: [
          {
            kind: 'callout',
            tone: 'warn',
            title: 'One sprite gets one depth.',
            text:
              'That is exact for a horizontal wall, whose base is a single line. A wall running north-south has a base spanning hundreds of pixels of Y, and you can stand level with its middle, where there is no right answer.',
          },
          {
            kind: 'bullets',
            items: [
              'The fix is Editor work: cut each side wall into stacked segments.',
              'Each segment then has its own base line, and each sorts correctly.',
              'Until then, the west and east walls will be wrong in the middle.',
            ],
          },
        ],
      },
      {
        id: 'try',
        title: 'Try it',
        blocks: [
          {
            kind: 'try',
            title: 'Cross the line',
            steps: [
              'Stand in the courtyard against the south wall. You are behind it.',
              'Walk out through the gate and turn around.',
              'Step north and south across the wall base and watch the flip.',
            ],
            proves:
              'That the flip happens at the wall\'s ground line and nowhere else — the same place your feet would actually pass it.',
          },
          {
            kind: 'try',
            title: 'Find the side-wall fault on purpose',
            steps: [
              'Walk to the middle of the west wall and stand level with it.',
              'Note that it is drawn either wholly in front of you or wholly behind.',
              'Now do the same at the south wall, where it is correct.',
            ],
            proves:
              'Why long north-south sprites have to be cut into segments. It is not a bug in the sorting; it is a question the sorting cannot be asked.',
          },
        ],
      },
    ],
    checkpoint: [
      'You can state the depth rule in one sentence.',
      'You can say why layers alone could not do it.',
      'You can name one case that SHOULD be a separate scene.',
      'You have crossed the south wall line and seen the flip.',
      'You can explain why the side walls are still wrong.',
    ],
  },


  /* ------------------------------------------------------------------ 7 */
  {
    id: 'elevation',
    number: 7,
    title: 'Elevation',
    status: 'live',
    outcome: 'Author high ground and low ground, and know why the climb is the point.',
    minutes: 25,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Height is how the courtyard says who is safe.',
            text:
              'The castle is on high ground. The monsters are on the low ground. Getting home means climbing. Elevation is not a movement toy in this game \u2014 it is the reason the castle feels like somewhere you want to reach.',
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'What the game was missing, exactly.',
            text:
              'Until 2026-08-07 the world was one flat floor plus impassable walls, which made a cliff and a castle wall literally the same object. A collider is a 2D floor shape and carries no height, so there was nothing to ask "could I clear that?" about. A jump button in that world would have been a button that did nothing.',
          },
          {
            kind: 'bullets',
            items: [
              'The missing piece was **levels**, not jumping.',
              'Jumping is what levels make possible \u2014 it is the second thing, not the first.',
              'Pok\u00e9mon, for the record, has ledges you hop DOWN and can never climb. What you asked for is Zelda.',
            ],
          },
        ],
      },
      {
        id: 'authoring',
        title: 'How you author it — one layer per height',
        blocks: [
          {
            kind: 'table',
            head: ['Editor layer', 'What goes in it'],
            rows: [
              ['`L20_GROUND_L0`', 'Floor at the bottom. Monster country.'],
              ['`L21_GROUND_L1`', 'Floor one step up. The castle plateau.'],
              ['`L22_GROUND_L2`', 'A third height, when you want one.'],
              ['`L23_RAMPS`', 'Walkable connections between heights \u2014 the stairs.'],
            ],
          },
          {
            kind: 'callout',
            tone: 'key',
            title: 'Plates OVERLAP, and the highest one wins.',
            text:
              'Draw one big rectangle over the whole walkable world at level 0, then lay terraces on top of it. You never cut holes and you never tile precisely. Where two plates cover the same spot, the higher one is the floor.',
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Why layers and not colours this time',
            text:
              'Colour carries meaning in `L14_COLLIDERS` because a wall and a trigger sit side by side in one layer. A level is an ORDERED quantity, and encoding an ordinal as a hue is how you end up with a terrace that is silently one step too high. The layer name says the number out loud.',
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'A cliff needs NO collider.',
            text:
              'The plates block by themselves \u2014 a cliff is just where the floor stops being that high. Never draw a red BLOCK along a terrace lip. If you do, the two can disagree about where the edge is, and one of them will be wrong.',
          },
        ],
      },
      {
        id: 'rules',
        title: 'The three movement rules',
        blocks: [
          {
            kind: 'table',
            head: ['You try to move...', 'What happens', 'Why'],
            rows: [
              ['Within your level', 'Free', 'Flat ground'],
              ['Onto a LOWER level', 'Free \u2014 you drop', 'Falling is never the hard part'],
              ['Onto a HIGHER level', '**Blocked**, unless on a ramp', 'This is the cliff'],
              ['Onto no plate at all', 'Allowed, level unchanged', 'See the warning below'],
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Void fails OPEN, on purpose \u2014 and that hides your mistakes.',
            text:
              'Somewhere no plate covers lets you walk straight through. Failing closed would turn every unplated seam into an invisible wall in open grass, which is far harder to diagnose than a missing ledge. The cost is that a gap in your plates is silent. `?levels=show` is how you find them.',
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The stair is one line of code.',
            text:
              'While your feet are inside a ramp rectangle, climbing is permitted. No slope maths, no interpolation, no height blending. That is the entire implementation of walkable stairs.',
          },
        ],
      },
      {
        id: 'jump',
        title: 'The jump',
        blocks: [
          {
            kind: 'bullets',
            items: [
              '**SPACE**, in the direction you are holding \u2014 or the way you are facing if standing still.',
              'Reach is **109px**; the cliff band is ~96px, so a terrace clears with 13px to spare.',
              'No mid-air steering. Velocity is fixed at takeoff, which is what makes a failed jump the ledge\u2019s answer rather than a twitch of your thumb.',
              'You can never gain more than **one level per jump**. That cap is the whole difficulty of the climb.',
              'You may LAND lower than you started \u2014 leaping off a terrace just works.',
            ],
          },
          {
            kind: 'compare',
            left: {
              title: 'Checked in mid-air',
              points: ['Red BLOCK shapes \u2014 you cannot jump through a tree'],
            },
            right: {
              title: 'NOT checked in mid-air',
              points: [
                'Elevation \u2014 that is the entire point',
                'Void \u2014 you are allowed to be over nothing while airborne',
                'Both are decided once, at the landing',
              ],
            },
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'A failed jump still plays.',
            text:
              'He lunges, does not reach, and drops back to where he started. All three failure modes \u2014 wall, void, too high \u2014 use that one animation. Silently refusing to move would read as a dead key rather than as a hard ledge.',
          },
        ],
      },
      {
        id: 'shadow',
        title: 'Why the shadow is not optional',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'The shadow is the only thing that says the ground did not move.',
            text:
              'A sprite that lifts with nothing left behind on the floor reads as sliding, not jumping. The contact patch stays pinned at the feet Y while the body arcs above it, shrinking and fading with height. It is what sells the jump \u2014 far more than the pose does.',
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'The hero has no jump animation yet.',
            text:
              'Walk and idle only. He freezes on a mid-stride frame and rides an arc. That is deliberate: the shape of a jump should be proven in play before generations are spent on a pose whose timing might have to change.',
          },
        ],
      },
      {
        id: 'depth',
        title: 'Depth had to learn about height too',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Depth is now `level x 100000 + ground contact Y`.',
            text:
              'Standing on top of a cliff and standing at its foot are almost the same Y. No amount of Y-sorting can tell those apart \u2014 that is what the level stride is for. See lesson 6 for the half of the rule that came first.',
          },
          {
            kind: 'bullets',
            items: [
              'A cliff face belongs to the **lower** level and sorts on its bottom edge.',
              'So everything on the terrace below draws over it \u2014 correct, because it is a wall seen from down there.',
              'A hero on top is one level up, so he sorts above it regardless of Y.',
            ],
          },
        ],
      },
      {
        id: 'try',
        title: 'Try it',
        blocks: [
          {
            kind: 'try',
            title: 'See the two worlds',
            steps: [
              'Open `/dev/scene?start=CourtyardV2&levels=show`.',
              'Green is the low ground. Yellow is the castle plateau. Purple is the stair.',
              'Walk south off the cliff \u2014 you drop.',
              'Walk back north at the cliff \u2014 nothing. Take the stair \u2014 you climb.',
              'Go back to the cliff and press SPACE.',
            ],
            proves:
              'That the cliff blocks with no collider drawn on it, and that the stair and the jump are two different answers to the same wall.',
          },
          {
            kind: 'try',
            title: 'Make a plate gap on purpose',
            steps: [
              'Shrink the level-0 plate so it no longer touches the cliff base.',
              'Save, refresh, and walk into the gap.',
              'Note that nothing stops you and nothing complains.',
              'Now turn on `?levels=show` and look at the same spot.',
            ],
            proves:
              'Why fail-open is a trade rather than a free choice \u2014 and why the overlay is the only tool that finds the mistakes it hides.',
          },
        ],
      },
    ],
    checkpoint: [
      'You can say why levels had to come before jumping.',
      'You can name the layer a piece of floor goes in.',
      'You know plates overlap and the highest wins.',
      'You can explain why a cliff needs no BLOCK rectangle.',
      'You have dropped off a ledge, climbed the stair, and jumped a cliff.',
      'You can say what fails open, and what that costs.',
    ],
  },

];

/**
 * Lessons authored during the ChatGPT teaching sessions. They use the same
 * renderer as the original Claude syllabus, but remain a separate track so
 * neither teacher has to rewrite or renumber the other's material.
 */
export const CHATGPT_LESSONS: Lesson[] = [
  {
    id: 'chatgpt-cropping',
    number: 1,
    title: 'Cropping Assets',
    status: 'live',
    locked: true,
    outcome: 'Trim a wall with Phaser Editor tools—no hand-written object code.',
    minutes: 10,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A TileSprite has a resizable window over its texture.',
            text:
              'Convert the wall from an Image to a TileSprite, then resize its box with the `Z` tool. The box gets shorter while the stones keep their original proportions. Phaser Editor writes the resulting scene code for you.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Scale Tool — S',
              points: [
                'Keeps the entire wall visible',
                'Stretches or squeezes its pixels',
                'Wrong tool when you want to remove part of the picture',
              ],
            },
            right: {
              title: 'TileSprite Resize Tool — Z',
              points: [
                'Makes the visible window shorter or narrower',
                'Keeps the visible stones at their original proportions',
                'The editor generates everything—no object code from you',
              ],
            },
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Why not the Phaser `setCrop()` method?',
            text:
              'That method is real, but it is a code-side Phaser feature rather than a documented Image control in the Scene Editor. For your visual workflow, TileSprite + Resize is the practical editor tool for a rectangular wall cut.',
          },
        ],
      },
      {
        id: 'convert',
        title: 'Convert the wall to a TileSprite',
        blocks: [
          {
            kind: 'steps',
            items: [
              {
                who: 'raheem',
                do: 'Select the wall in the canvas or in the top-left panel (Outline).',
                see: 'The right panel (Inspector) shows that object’s properties.',
              },
              {
                who: 'raheem',
                do: 'In the Inspector’s Variable section, click the object’s **Type**. You can also right-click the wall and use **Type → Replace Type**.',
                see: 'The Replace Type dialog opens.',
              },
              {
                who: 'raheem',
                do: 'Choose **TileSprite** and press **Replace**.',
                see: 'The wall keeps its texture and placement, and the Inspector gains Size and Tile Sprite properties.',
              },
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Do not change Scale X or Scale Y for this job.',
            text:
              'Leave texture scale and object scale at `1` while learning this. You are changing the TileSprite’s Size, not scaling the wall art.',
          },
        ],
      },
      {
        id: 'resize',
        title: 'Trim it with the Resize Tool',
        blocks: [
          {
            kind: 'steps',
            items: [
              {
                who: 'raheem',
                do: 'Keep the new TileSprite selected and press **`Z`**. The same command is available from the scene context menu under **Tools → Resize Tool**.',
                see: 'Resize handles appear around the wall.',
              },
              {
                who: 'raheem',
                do: 'Drag a side handle inward until only the amount of wall you want remains.',
                see: 'The wall’s box becomes shorter, but the individual stones do not get squeezed.',
              },
              {
                who: 'raheem',
                do: 'For an exact cut, type the desired **Width** and **Height** in the Inspector’s Size section.',
                see: 'The handles and visible window update to those exact dimensions.',
              },
            ],
          },
          {
            kind: 'bullets',
            items: [
              'Use **tilePositionX** to slide the wall texture left or right behind the window.',
              'Use **tilePositionY** to slide it up or down.',
              'Adjust those values in the Inspector while watching the canvas—choose the part by eye.',
              'If the resized TileSprite becomes larger than the source texture, the texture starts repeating. Keep it smaller when your goal is a single cut piece.',
              'After trimming, use the normal Translate tool (`T`) to place the piece where it belongs.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Think “window,” not “scissors.”',
            text:
              'Width and Height change the window. tilePositionX and tilePositionY slide the artwork behind it. Together, those four visual controls let you choose the wall piece without editing the PNG.',
          },
        ],
      },
      {
        id: 'collision',
        title: 'Match the collision visually',
        blocks: [
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Only do this part if the wall already has an Arcade Physics body.',
            text:
              'Select the wall and press `B` to open the Arcade Physics Body tool. Drag the body’s size and offset handles until the body covers only the solid part of the shortened wall.',
          },
          {
            kind: 'bullets',
            items: [
              'No physics body on the wall? Skip this entire section.',
              '`B` edits body size and offset; it does not change the artwork.',
              'Use **Ctrl+0** to preview and walk into both ends of the wall before calling it finished.',
            ],
          },
        ],
      },
      {
        id: 'try',
        title: 'Try it',
        blocks: [
          {
            kind: 'try',
            title: 'Make one short wall entirely in the editor',
            steps: [
              'Place a wall from the bottom-middle panel (Blocks).',
              'Replace its type with **TileSprite**.',
              'Press **`Z`** and drag one side inward until roughly half the wall remains.',
              'Change **tilePositionX** in the Inspector until the half you like is inside the window.',
              'Check that Scale X, Scale Y, tileScaleX and tileScaleY are still `1`.',
              'If it has a physics body, press **`B`** and fit the body to the visible solid area.',
              'Save with **Ctrl+S**, then preview with **Ctrl+0**.',
            ],
            proves:
              'You can create a shorter wall segment by converting, resizing and repositioning a texture—all through Phaser Editor, with no object code written by you.',
          },
        ],
      },
    ],
    checkpoint: [
      'You converted an Image wall to a TileSprite using Replace Type.',
      'You shortened it with the Resize Tool (`Z`), not the Scale Tool.',
      'You used tilePositionX or tilePositionY to choose the visible part by eye.',
      'The wall’s stones kept their original proportions.',
    ],
  },
  {
    id: 'chatgpt-creating-life-animation-review',
    number: 2,
    title: 'Creating Life: Animations, Brain and Behaviour',
    status: 'live',
    outcome:
      'Explain how a living animal is built, and add or adjust one yourself without writing code.',
    minutes: 25,
    sections: [
      {
        id: 'the-shape',
        title: 'The shape of a living thing',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'One class per animal, with its jobs kept in separate boxes.',
            text:
              'This is the diagram Raheem drew before any of it existed: a **Mob class** with **Movement**, **Attacking**, **AI**, **Animation** and **Events** hanging off it. The wildlife system is that diagram, built. Each box is a real file, and each one can be replaced without touching the others.',
          },
          {
            kind: 'table',
            head: ['Box in the diagram', 'What it is here', 'The one question it answers'],
            rows: [
              ['**Mob class**', '`WildlifeAgent.ts`', 'Ties one sprite to everything below'],
              ['**AI**', '`WildlifeBrain.ts`', '“What should I do next?”'],
              ['**Movement**', '`movement.ts` + the scene’s walk resolver', '“How do I get there, and may I?”'],
              ['**Animation**', '`ANIMATION_SETS` in `wildlifeShared.ts`', '“What does that decision look like?”'],
              ['**Events**', 'Not built yet — the seed is the brain’s `reason` field', '“What just happened, so others can react?”'],
              ['**Attacking**', 'Not built yet — wildlife does not fight', 'A boss mob would fill this slot'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Two empty boxes is a good sign, not a gap.',
            text:
              'Attacking and Events have nowhere to live in a forest, so they were not written. The diagram still shows where they go, which is why adding a boss later is a new file rather than a rewrite.',
          },
          {
            kind: 'terms',
            items: [
              {
                term: 'WildlifeManager',
                plain: 'The park ranger. Owns every animal, updates them each frame, tells them all to stand still when the player has reduced motion switched on.',
                where: 'One per scene, above the mobs',
              },
              {
                term: 'WildlifeAgent',
                plain: 'One animal. The Mob class from the diagram.',
                where: 'One per fox, rabbit or tortoise on screen',
              },
              {
                term: 'WildlifeBrain',
                plain: 'The AI box. Knows nothing about pictures — it only ever answers with one of five words.',
                where: 'One per agent, private to it',
              },
            ],
          },
        ],
      },
      {
        id: 'three-mobs-one-class',
        title: 'Mob 1, Mob 2, Mob 3',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'The three animals are the same class with different numbers.',
            text:
              'The second half of the diagram shows **Mob 1**, **Mob 2** and **Mob 3** under the Mob class. The obvious way to build that is three classes. We did not — there is one class, and a sheet of numbers per species in `profiles.ts`.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Three classes (not what we did)',
              points: [
                'Fox, Rabbit and Tortoise each get their own file',
                'A bug in “flee” must be fixed three times',
                'A fourth animal means writing a fourth brain',
                'The three slowly stop behaving like each other',
              ],
            },
            right: {
              title: 'One class, three profiles (what we did)',
              points: [
                'One brain, one agent, three rows of numbers',
                'A bug in “flee” is fixed once, everywhere',
                'A chicken is a new row, not a new system',
                'They cannot drift apart, because there is only one of them',
              ],
            },
          },
          {
            kind: 'table',
            head: ['', 'Fox', 'Rabbit', 'Tortoise'],
            rows: [
              ['Walking speed', '48', '58', '20'],
              ['Running speed', '104', '126', '— never runs'],
              ['Notices you at', '150px', '175px', '105px'],
              ['Reacts hard at', '82px', '108px', '58px'],
              ['When you get close', 'Runs', 'Runs sooner, further', 'Stops and watches'],
              ['Favourite thing', 'Roaming', 'Roaming', 'Resting'],
              ['Its own action', 'Sniff the ground', 'Nibble and groom', 'Tuck in and hold still'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'That whole table is one file you can edit.',
            text:
              'Everything that makes the rabbit timid and the tortoise calm is in `profiles.ts`. Nothing about personality is hidden in the brain.',
          },
        ],
      },
      {
        id: 'animation-vs-behavior',
        title: 'Animation is the vocabulary',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'The animation does not decide what the animal wants.',
            text:
              'A **clip** is one visible action, such as trot or sniff. Later, the wildlife brain chooses when to use that action. Keeping those jobs separate lets us improve the artwork without rewriting the animal’s decisions.',
          },
          {
            kind: 'table',
            head: ['Animal', 'Movement', 'Daily-life action', 'First personality'],
            rows: [
              ['Fox', 'Trot', 'Sniff · sit & listen', 'Curious and observant'],
              ['Rabbit', 'Hop', 'Nibble & groom', 'Timid and busy'],
              ['Glowcap tortoise', 'Slow walk', 'Keep simple for now', 'Peaceful and faintly magical'],
            ],
          },
        ],
      },
      {
        id: 'review-lab',
        title: 'Open the animation review lab',
        blocks: [
          {
            kind: 'lab',
            route: '/dev/wildlife-animation-lab',
            title: 'Wildlife Animation Review Lab',
            blurb:
              'Choose an animal, action and direction. Play it, pause it, step through every frame, or let **Review all animations** carry you through the complete set.',
            learn: [
              'The purple box is one real Phaser frame cell.',
              'Frame buttons let you stop on the exact drawing that needs attention.',
              'Speed changes the preview only; it does not alter the source art.',
              'The fox, rabbit and simple glowcap tortoise all use their actual game sheets.',
            ],
          },
          {
            kind: 'try',
            title: 'Give each clip a visual approval pass',
            steps: [
              'Play the clip once at its designed speed.',
              'Pause and use the frame buttons to look for detached pixels or a moving ground line.',
              'Check all four directions.',
              'Ask whether the action is understandable without reading its label.',
              'Use **Review all animations** for one uninterrupted final pass.',
            ],
            proves:
              'The art is technically safe and readable before behavior code begins combining the clips into believable daily life.',
          },
        ],
      },
      {
        id: 'safe-cells',
        title: 'Why the extra nose appeared',
        blocks: [
          {
            kind: 'compare',
            left: {
              title: 'Too-tight frame cell',
              points: [
                'The fox was centered on its feet',
                'Its long nose crossed into the next cell',
                'Phaser displayed those neighbouring pixels during the walk',
              ],
            },
            right: {
              title: 'Safe quadruped cell',
              points: [
                'The whole body is centered inside the cell',
                'Transparent padding protects every edge',
                'An automatic check rejects sheets with edge pixels',
              ],
            },
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'This is a sheet-packing issue, not a bad animation.',
            text:
              'The fox drawings were intact. Repacking them into safer cells fixes the stray nose without generating or repainting any frames.',
          },
        ],
      },
      {
        id: 'the-brain',
        title: 'Inside the AI box',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'The brain only ever says one of five words.',
            text:
              '`idle` · `roam` · `signature` · `observe` · `flee`. It knows nothing about sprites, sheets or frames. That is exactly why all three animals can share it — and why new artwork never means new decisions.',
          },
          {
            kind: 'bullets',
            items: [
              '**Layer 1 — reflex.** Are you close? Fox and rabbit run, tortoise watches. This interrupts whatever was happening.',
              '**Layer 2 — ordinary life.** Only runs when you are not a factor and the current activity has finished its time.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Randomness is the tie-breaker, not the system.',
            text:
              'Each choice is scored: **weight × need × memory × a little wobble**. The wobble is only 0.9–1.1, so it separates two close options and nothing more. Changing needs do the real choosing.',
          },
          {
            kind: 'table',
            head: ['Drive', 'Goes up when', 'Goes down when', 'What it pushes toward'],
            rows: [
              ['Energy', 'Resting', 'Running hardest, roaming a little', 'Resting when tired'],
              ['Curiosity', 'Resting', 'Roaming or watching', 'Wandering when bored'],
              ['Its own urge', 'Always, slowly', 'Reset to zero the moment it acts', 'Sniff · nibble · tuck, on a rising itch'],
            ],
          },
          {
            kind: 'bullets',
            items: [
              'It cannot repeat the activity it just finished.',
              'The last two are scored down to about a third.',
              'Each activity waits a cooldown before it can come round again — the fox’s sniff waits 4.5 seconds.',
              'So a fox trots until curiosity drains, rests until energy returns, and sniffs on a rising itch. Never the same order twice.',
            ],
          },
          {
            kind: 'try',
            title: 'Watch the brain think',
            steps: [
              'Open the Wildlife Lab below.',
              'Read the panel top-left: each animal’s current activity and its three drive bars.',
              'Watch the fox’s energy bar fall while it roams and climb while it rests.',
              'Walk at the rabbit and watch its activity change to `flee (you)`.',
              'Back off and wait for it to settle into ordinary life again.',
            ],
            proves:
              'The behaviour is driven by changing needs rather than a fixed loop — you can watch the numbers that caused each choice.',
          },
          {
            kind: 'lab',
            route: '/dev/scene?start=WildlifeLab',
            title: 'Wildlife Lab — the behaviour bench',
            blurb:
              'One flat floor, no walls, three animals and a live readout. Behaviour with nothing to hide behind. **WASD** to walk.',
            learn: [
              'The readout shows activity plus the three drives, per animal.',
              '`(you)` after an activity means the reflex layer interrupted.',
              'The fox stops about 82px away and turns to watch; the rabbit goes further.',
              'The tortoise does not run. It never will — that is its profile, not a bug.',
            ],
          },
        ],
      },
      {
        id: 'where-they-live',
        title: 'Where an animal lives',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'The green box is territory. The texture is personality.',
            text:
              'A fox dropped in the tortoise’s box is still a fox — same speed, same 82px flight, same trot-and-sniff. It just does all of that over there. **Where** and **who** never mix.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Comes from the sprite’s texture',
              points: [
                'Speed, walking and running',
                'How near you get before it reacts',
                'Whether it runs or watches',
                'Which clips play',
              ],
            },
            right: {
              title: 'Comes from the green box',
              points: ['Where it wanders.', 'That is the whole list.'],
            },
          },
          {
            kind: 'callout',
            tone: 'key',
            title: 'There are two ways to say where. You are not choosing one for the whole scene.',
            text:
              'Every animal picks its own, by one rule and nothing else: **am I standing inside a green box right now?** In a scene, some animals can be on one method and some on the other, at the same time.',
          },
          {
            kind: 'compare',
            left: {
              title: 'Drop-anywhere — the default',
              points: [
                'Drag an animal in. Do not draw anything.',
                'It gets a home range centred on where you dropped it',
                'Sized from its own speed: rabbit 464×319, fox 384×264, tortoise 160×110',
                'Shown in AMBER when `?wildlife=show` is on',
                'Best for: trying an idea, one animal that lives in one spot',
              ],
            },
            right: {
              title: 'Boundary — when you want to be specific',
              points: [
                'Draw a green **#33ff88** rectangle in `L15_WILDLIFE`',
                'Drop the animal inside it',
                'It roams exactly that shape, however big or odd',
                'Shown in GREEN when `?wildlife=show` is on',
                'Best for: several animals sharing a territory, or a hard edge you care about',
              ],
            },
          },
          {
            kind: 'table',
            head: ['You want…', 'Do this', 'It switches when'],
            rows: [
              ['Drop-anywhere → boundary', 'Draw a green box around the animal', 'You save and refresh'],
              ['Boundary → drop-anywhere', 'Drag the animal out of every green box', 'You save and refresh'],
              ['A bigger drop-anywhere patch', 'You cannot resize it — draw a green box instead', '—'],
              ['Two animals in one territory', 'Draw one green box, drop both inside', 'You save and refresh'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Green means you drew it. Amber means the system made one up.',
            text:
              'Open Courtyard V2 with **`?wildlife=show`** and you see both at once. The green rectangles are yours, from the Editor. The amber ones do not exist in any file — they are drawn at run time around animals that are in no box, so that nothing about this system is invisible.',
          },
          {
            kind: 'try',
            title: 'Switch one animal between the two methods',
            steps: [
              'Open `/dev/scene?start=CourtyardV2&wildlife=show` and note the three green boxes. Every animal is currently on the boundary method.',
              'In Phaser Editor, drag one animal well outside every green box.',
              'Save with Ctrl+S, then refresh the browser.',
              'An AMBER rectangle now appears around it. That animal switched to drop-anywhere.',
              'Drag it back inside a green box, save, refresh — the amber box is gone.',
            ],
            proves:
              'The two methods are per animal and automatic. You never set a mode; you move the animal, and the rule decides.',
          },
          {
            kind: 'bullets',
            items: [
              'Boxes may overlap walls freely. Collision decides every step anyway, so draw them generously.',
              'A drop-anywhere range can also overlap walls — the animal simply stops at the face.',
              'The range is made once, when the scene starts. Moving an animal at run time does not move its range.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Two things an animal does need.',
            text:
              'It must sit in the **`L15_WILDLIFE`** layer, and it must use its **movement sheet** as its texture — `wildlife-fox-trot`, `wildlife-rabbit-hop` or `wildlife-tortoise-toddle`. That texture is how the code knows which animal it is. A fox placed on the sniff sheet is not recognised.',
          },
          {
            kind: 'lab',
            route: '/dev/scene?start=CourtyardV2&wildlife=show',
            title: 'Courtyard V2 — the real world',
            blurb:
              'The same brain, given the castle’s traced walls instead of a flat floor. **`?wildlife=show`** draws the green boxes; add **`&colliders=show`** for the red walls.',
            learn: [
              'GREEN rectangle = a territory you drew. AMBER = a range made up around a dropped animal.',
              'Animals never enter a red shape — they stop at the face and slide along it.',
              'They sort behind trees and in front of them, using the same ground-contact rule as the hero.',
              'Swapping the flat floor for real walls was one function, not a second physics system.',
              'All five animals here are currently inside green boxes, so all five are on the boundary method.',
            ],
          },
        ],
      },
      {
        id: 'adjusting',
        title: 'Adjusting the life',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Everything you are likely to change is in the Editor.',
            text:
              'Placement, size, territory and how many animals there are are all scene values. Save in Phaser Editor, refresh the browser, done.',
          },
          {
            kind: 'table',
            head: ['To change…', 'Do this', 'Where'],
            rows: [
              ['Where an animal starts', 'Drag the sprite', 'Phaser Editor'],
              ['How big it is', 'Set its scale', 'Phaser Editor'],
              ['Where it wanders', 'Move or resize its green box', 'Phaser Editor'],
              ['How many there are', 'Copy-paste a sprite', 'Phaser Editor'],
              ['A new territory', 'Draw another green **#33ff88** rectangle', 'Phaser Editor'],
              ['Where it may walk', 'Edit the red shapes in `L14_COLLIDERS`', 'Phaser Editor'],
              ['How timid or fast it is', 'Edit its row of numbers', '`profiles.ts`'],
              ['Which clip an activity plays', 'Edit `ANIMATION_SETS`', '`wildlifeShared.ts`'],
              ['How it decides at all', 'The scoring rules', '`WildlifeBrain.ts` — rarely'],
            ],
          },
          {
            kind: 'steps',
            items: [
              { who: 'raheem', do: 'Copy an existing animal sprite in the Outline and paste it.', see: 'A second fox appears, still inside `L15_WILDLIFE`.' },
              { who: 'raheem', do: 'Drag it somewhere far from every green box.', see: 'Nothing yet — the scene has not been saved.' },
              { who: 'raheem', do: 'Press Ctrl+S.', see: 'Phaser Editor rewrites `CourtyardV2.js`.' },
              { who: 'raheem', do: 'Refresh the browser tab.', see: 'The new fox is alive, roaming a patch centred on where you dropped it.' },
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'If an animal will not move, check these three first.',
            text:
              'It is outside `L15_WILDLIFE`; or it is on the wrong texture; or it was dropped **inside a red collision shape**, where no step is legal. The last one prints its name and position to the browser console.',
          },
          {
            kind: 'try',
            title: 'Give the tortoise a bigger world',
            steps: [
              'Open Courtyard V2 in Phaser Editor.',
              'Select `ROAM_castleFront` in the `L15_WILDLIFE` layer.',
              'Widen it with the Resize Tool (`Z`).',
              'Save, then refresh `/dev/scene?start=CourtyardV2&wildlife=show`.',
              'Watch the tortoise wander further than it did before.',
            ],
            proves:
              'Territory is authored, not coded. The box you can see on screen is the box the animal actually obeys.',
          },
        ],
      },
      {
        id: 'adding-an-animal',
        title: 'What a brand-new animal costs',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'A chicken is four small edits and no new system.',
            text:
              'Because “where” and “who” never mixed, and because there is one class rather than three, adding a species does not touch the brain, the manager, the movement code or the boxes.',
          },
          {
            kind: 'bullets',
            items: [
              'Generate its sheets — a movement clip and one action of its own.',
              'Add a row to `profiles.ts`: speeds, reaction distances, what it does when you approach.',
              'Add its texture to `SPECIES_BY_TEXTURE` so the code can recognise it.',
              'Add its clips to `ANIMATION_SETS`.',
              'Then drop it in the scene like any other animal.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'This is what the diagram was for.',
            text:
              'Splitting a mob into Movement, AI, Animation and Events before writing any of it is why the fifth animal costs the same as the fourth.',
          },
        ],
      },
    ],
    checkpoint: [
      'You reviewed at least one clip in all four directions.',
      'You paused and stepped through individual frames.',
      'You can explain the difference between an animation clip and a behavior choice.',
      'No animal pixels cross the purple frame-cell border.',
      'You can name what lives in each box of the Mob diagram, and which two are still empty.',
      'You can state the one rule that decides drop-anywhere versus boundary, per animal.',
      'You switched one animal between the two methods and saw the amber box appear and vanish.',
      'You can say why the three animals are one class and not three.',
      'You watched a drive bar rise and fall in the Wildlife Lab readout.',
      'You added or moved an animal, saved, refreshed, and saw it living where you put it.',
      'You can list the three reasons an animal might refuse to move.',
    ],
  },
];
