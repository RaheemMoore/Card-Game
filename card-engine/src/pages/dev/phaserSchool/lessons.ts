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
 * Panels are always named by screen position ("bottom-left panel (Blocks)"),
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
  | { kind: 'wangLab'; src: string; a: string; b: string };

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
              ['Left', 'Files / Project', 'The folder tree. Double-click a `.scene` to open it.'],
              ['Middle (big)', 'Scene Editor', 'The canvas. Drag, place, paint.'],
              ['Right — top', 'Outline', 'Every object as a list. How you select things you cannot click.'],
              ['Right — bottom', 'Inspector', 'Properties of whatever is selected: x, y, scale, depth, origin.'],
              ['Bottom-left', 'Blocks', 'The palette. Every asset this scene is allowed to use.'],
            ],
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
                where: 'Left panel — anything ending in .scene',
              },
              {
                term: 'Depth',
                plain: 'Draw order. Higher number draws on top.',
                where: 'Right-bottom panel (Inspector)',
              },
              {
                term: 'Origin',
                plain: 'The sprite\'s anchor point. Gets its own section below.',
                where: 'Right-bottom panel (Inspector) → Transform',
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
              'Drag the tree in the Scene Editor and save (Cmd+S).',
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
                see: 'The bottom-left panel (Blocks) fills with towers, walls, trees, tilesets.',
              },
              { who: 'both', do: 'Agree the map size in tiles — before painting anything.' },
              {
                who: 'claude',
                do: 'Add an editable tilemap at 32×32, attach both tilesets, add a base layer.',
                see: 'A Tilemap object appears in the right-top panel (Outline).',
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
  {
    id: 'castle',
    number: 2,
    title: 'The Castle',
    status: 'draft',
    outcome: 'Assemble walls, corners, towers and a gate the player can walk behind.',
    minutes: 60,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Anything that stands up is a sprite, not a tile.',
            text:
              'A wall is not something you walk on — it is something you walk behind. That one requirement is why the castle is placed piece by piece with per-object depth.',
          },
        ],
      },
      {
        id: 'kit',
        title: 'The pieces we have',
        blocks: [
          {
            kind: 'gallery',
            caption: 'Walls — 7 interlocking pieces.',
            items: [
              { src: `${KIT}/structures/walls/castle-wall-straight-front-healthy.png`, label: 'straight front' },
              { src: `${KIT}/structures/walls/castle-wall-straight-side-healthy.png`, label: 'straight side' },
              { src: `${KIT}/structures/walls/castle-wall-corner-outer-healthy.png`, label: 'corner outer' },
              { src: `${KIT}/structures/walls/castle-wall-corner-inner-healthy.png`, label: 'corner inner' },
              { src: `${KIT}/structures/walls/castle-wall-endcap-buttressed-healthy.png`, label: 'endcap' },
              { src: `${KIT}/structures/walls/castle-wall-connector-tower-healthy.png`, label: 'connector tower' },
            ],
          },
          {
            kind: 'gallery',
            caption: 'Towers — 4 distinct silhouettes.',
            items: [
              { src: `${KIT}/structures/towers/castle-tower-gatewatch-healthy.png`, label: 'gatewatch' },
              { src: `${KIT}/structures/towers/castle-tower-aegis-healthy.png`, label: 'aegis' },
              { src: `${KIT}/structures/towers/castle-tower-beacon-healthy.png`, label: 'beacon' },
              { src: `${KIT}/structures/towers/castle-tower-starward-healthy.png`, label: 'starward' },
            ],
          },
          {
            kind: 'gallery',
            caption: 'The gate.',
            items: [
              { src: `${KIT}/structures/gate/castle-gate-arch-open-healthy.png`, label: 'arch (open)' },
              { src: `${KIT}/structures/gate/castle-gate-threshold-steps.png`, label: 'threshold steps' },
            ],
          },
          {
            kind: 'callout',
            tone: 'warn',
            title: 'Known in advance',
            text:
              'Kit pieces are 85–130 px each — built for a small world. Scale must be settled before placement, or every piece moves twice. The door and portcullis PNGs are still marked "needs-separation" and are not final art.',
          },
        ],
      },
      {
        id: 'draft',
        title: 'Status',
        blocks: [
          {
            kind: 'callout',
            tone: 'tip',
            text:
              'Drafted, not taught. This lesson gets written from what we actually hit in Lesson 1 — writing it now would mean guessing.',
          },
        ],
      },
    ],
    checkpoint: ['Written after Lesson 1 lands.'],
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: 'forest',
    number: 3,
    title: 'The Forest',
    status: 'draft',
    outcome: 'Place trees so the player walks convincingly behind and in front of them.',
    minutes: 30,
    sections: [
      {
        id: 'idea',
        title: 'The one idea',
        blocks: [
          {
            kind: 'callout',
            tone: 'key',
            title: 'Repetition is only visible when spacing is regular.',
            text:
              'A convincing forest is four pieces used at varied scale, flip and depth. The lesson is about breaking regularity, not about having more art.',
          },
          {
            kind: 'gallery',
            caption: 'All four nature pieces. This is the entire forest kit.',
            items: [
              { src: `${KIT}/nature/trees/castle-tree-broadleaf-large.png`, label: 'broadleaf large' },
              { src: `${KIT}/nature/trees/castle-tree-broadleaf-small.png`, label: 'broadleaf small' },
              { src: `${KIT}/nature/shrubs/castle-shrub-young-tree-cluster.png`, label: 'young-tree cluster' },
              { src: `${KIT}/nature/rocks/castle-rock-low-scrub-cluster.png`, label: 'rock + scrub' },
            ],
          },
          {
            kind: 'bullets',
            items: [
              '**Flip X** mirrors a sprite. Free, instant, doubles apparent variety.',
              '**Scale** between 0.8 and 1.3 breaks the "same tree" read.',
              '**Origin 0.5 / 1** anchors at the trunk base so depth sorting works.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text:
              'There is no separate forest kit — these shipped inside the castle kit. The packaging was misleading, not incomplete.',
          },
        ],
      },
    ],
    checkpoint: ['Written after Lesson 2 lands.'],
  },
];
