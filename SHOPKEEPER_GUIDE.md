# Shopkeeper Generation Guide

How to design and generate a courtyard shopkeeper. Written so Raheem can drive this directly.

---

## THE QUALITY BAR IS THE DWARF, NOT THE HERO

The first keeper (character `93941297-2772-4a36-b473-b8b7d7a22711` — dark-skinned dwarf, beaded dreads, split braided beard, fur shoulders) is **the standard every future character matches**. Measured against the current hero he is a much richer sprite: **64 colours vs 33, and 2.7× the edge detail**.

That is not a defect. **The chibi hero is temporary** and will be regenerated at this fidelity later. Shop owners and bosses are meant to be cooler than the placeholder protagonist.

So: **do not tone new characters down to match the hero.** Match the dwarf.

Recipe that produced him — reuse it:

```
Pipeline ............. Pixen character creator (style_settings: pixen_v3)
Native canvas ........ 244 x 244        <- the new standard
View ................. low top-down
Body template ........ mannequin
Directions ........... 8  (use 4 next time — see below)
```

**Characters should pop.** Palette cohesion is achieved with a *lighting grade* after generation (`scripts/sprite-lab/lib/harmonize.py`), never by dulling the art. On the dwarf that grade raised saturation 0.295 → 0.393 and left contrast unchanged at 47.6 — he sits in the courtyard's light and reads *louder*, not quieter.

---

Companion docs: [PIXELLAB_PLAYBOOK.md](PIXELLAB_PLAYBOOK.md) (what works and what it cost), [create-character-sprite](.claude/skills/create-character-sprite/SKILL.md) (the full workflow).

---

## What a shopkeeper actually needs — and doesn't

A shopkeeper **stands at a stall**. They never walk. That makes them **dramatically cheaper than the hero**, because the walk cycle was the expensive, fragile part — four pinned passes, and every defect we hit lived there.

| | Hero (walker) | Shopkeeper (stationary) |
|---|---|---|
| Directions | 4 | **1** — facing out from their stall |
| Walk cycle | Yes, 4 pinned passes | **None** |
| Idle animation | frame 0 of the walk | `breathing-idle` template |
| Dialogue portrait | Yes | Yes |
| Cost | ~25 generations | **~10–15 generations** |

So: one direction, one `breathing-idle`, one portrait. That's it.

## Step 1 — Decide who they are (this is the real work)

The generation is trivial; the *design* is what makes them memorable. For each shopkeeper settle:

**a) Which stall they run.** Four exist today:
- **The Crafting Stall** — where cards are forged
- **The Collection** — where your gathered characters are kept
- **The Training Yard** — training and games
- **The Battle Tower gate** — the way to boss battles

**b) Locked physical identity.** Permanent — Bible §Rank continuity forbids ever making a character younger, thinner, or less disabled. Pick deliberately:
- age, sex, body type, ancestry, disability / physical condition, distinguishing features

> **Vary these on purpose.** Four shopkeepers who are all able-bodied men in their thirties is a failure of imagination and the project has explicitly pushed back on that default before. Consider: an elderly woman with a cane who runs the Collection; a broad-shouldered young woman who runs the Training Yard; someone with one arm who forges anyway.

**c) Their trade, made visible.** This is the single most important art decision. A shopkeeper must be identifiable **at ~100px, from a silhouette**. Ask: *if you covered the stall, would you still know what they sell?* Give them:
- one **signature tool** held or worn (not a sword — see below)
- **profession-specific garment** (apron, bracers, archivist's over-sleeves, gate-warden's tabard)
- **one memorable detail** (spectacles pushed up, ink-stained hands, a tally-stick necklace)

**d) One line of personality.** Not for the art — for the dialogue you'll write later. "Impatient, thinks you're wasting good steel." That line will shape their pose and expression more than any adjective about clothing.

## Step 2 — Bible compliance (non-negotiable if they're archetype-linked)

If a shopkeeper belongs to an archetype, read its chapter in `card-engine/src/data/archetypeBible/` and honour `visualDNA.avoid`.

**Worked example — Human**, whose identity is *Choice*: the recognition checklist asks *"Can the chosen path be identified?"* so a generic traveller is a **canon failure**, not just a dull design. The Bible bans **"generic adventurers, brown leather, swords as default, medieval-soldier shorthand."**

Note the shipped `human.png` combat sprite violates all four. It is a placeholder. Don't copy it.

**Modesty (M5.7) applies to sprites exactly as to portraits** — armour, robes, coats, aprons, regalia. Never lingerie, cleavage cutouts, bare-midriff battlefield gear.

## Step 3 — Every field you must set

This is the **complete** list of character-creation choices, with the value to use and why. Values are calibrated from what actually worked on the hero; matching them is what makes the cast look like one game rather than four.

### Size and camera — the two that matter most

| Field | Use | Notes |
|---|---|---|
| **Character size** (`image_size`) | leave at the **Pixen default (→ 244²)** | ⚠️ **The model overrides this** — 128² requested gave the hero 180² and the dwarf 244². Don't chase the number: keep the PIPELINE constant (Pixen) so every character lands at the same native size, then choose apparent height in code. See "Size" above. |
| **Camera view** (`view`) | **`low top-down`** | The four options are `side`, `low top-down`, `high top-down`, `perspective`. `low top-down` is what Pokémon uses — angled enough to read as top-down, but the **face stays visible**. `high top-down` gives you a scalp and kills the character's personality; `side` and `perspective` don't sit on our map at all. |
| **Isometric** (`isometric`) | **`false`** | Our courtyard is top-down, not isometric. Leave off. |

### Body

| Field | Use | Options |
|---|---|---|
| **Proportions** (`proportions`) | **preset → `chibi`** | `default`, `chibi`, `cartoon`, `stylized`, `realistic_male`, `realistic_female`, `heroic` — or custom head/limb multipliers (head max ~1.7). Set it as the FIELD, not as words in the description — the dwarf had "Chibi proportions" typed into his prompt, which is less reliable than the parameter. |
| **Template / body type** (`template_id`) | **`mannequin`** | `mannequin` for humanoids. Quadrupeds available: `bear`, `cat`, `dog`, `horse`, `lion` — worth remembering if a stall ever has an animal companion or a beast-keeper. |

### Art style — match these exactly across the cast

| Field | Use | All options |
|---|---|---|
| **Outline** (`outline`) | **`single color black outline`** | `single color black outline`, `single color outline`, `selective outline`, `lineless` |
| **Shading** (`shading`) | **`basic shading`** | `flat shading`, `basic shading`, `medium shading`, `detailed shading` |
| **Detail** (`detail`) | **`medium detail`** | `low detail`, `medium detail`, `high detail` |

These are *soft guidance* — the model may not follow them exactly. Don't fight it; regenerate with a different seed instead.

### Colour

| Field | Use | Why |
|---|---|---|
| **Colour reference** (`color_image`) | **none** | Passing the courtyard plate as a palette reference dragged the chibi hero toward dark stone tones and cost him face contrast. **Readability beats palette cohesion** for anything the player needs to pick out. |
| **Force colours** (`force_colors`) | **`false`** | Only meaningful with a colour reference, and it would make the camouflage problem worse. |

### Direction and prompt fidelity

| Field | Use | Notes |
|---|---|---|
| **Directions** | **one — `south`** | `south` = facing the camera, `north` = away, `east` = screen **RIGHT**, `west` = screen **LEFT**. Most shopkeepers want `south`, facing out of the stall at the approaching player. ⚠️ The east/west mapping shipped **backwards** once — verify by looking, never by reasoning. |
| **Reference images per direction** (`directions`) | **leave empty** | Advanced: you can supply your own art per direction and the AI fills the rest. If you supply any, bipedal templates **require** `south`, and each image must match `image_size` exactly. |
| **Text guidance** (`text_guidance_scale`) | **8.0** (default) | Higher = follows your description more literally. Raise it if the trade details keep getting dropped; lower it if the result looks stiff. |
| **Seed** (`seed`) | **always an explicit number** | Non-negotiable. Without it the character can **never be rebuilt**. Write it down. |

### Animation

| Field | Use | Notes |
|---|---|---|
| Mode | **`template`** | |
| Template | **`breathing-idle`** | 1 generation per direction. Template-mode drift ruined a *walk* cycle, but across a subtle idle it doesn't matter. |
| Directions | **`south`** only | |

Other templates exist if a keeper needs personality: `angry`, `attack`, `attack-left/right/back`, `cross-punch`, `backflip`, `bark`, `crouched-walking`. (The API truncates the full list; a deliberately invalid template id returns the valid ones for free.)

## Directions: how to stop wasting generations

**There is no 1-direction *character* endpoint.** Character creation comes in 4-direction and 8-direction flavours only. So:

- **Choose 4 directions, not 8.** The first keeper used 8, which doubled the rotation cost for four views a stationary vendor will never show.
- **The bigger waste is animation, not rotation.** Animation costs **1 generation per direction**, so a breathing idle across 8 directions is 8 generations instead of 1. **Restrict the animation to `south` only.** That single setting saves more than the rotation choice does.
- **Truly one image and nothing else?** Skip the character creator and use the plain **Pixen single-image generator** with `direction: south` and `no_background: true`. One image, no rotations, no animation. But then he can never breathe or be animated later — only do this for background dressing, not a keeper the player talks to.

Recommended for a keeper: **4 directions + `breathing-idle` on `south` only.**

## Size: why it drifted, and how to fix it

**You cannot fully control the output size.** PixelLab picks it. We asked for 128² and the hero came back **180²**; the dwarf came back **244²**. So the size field is a hint, not an instruction.

Two things actually fix this:

1. **Freeze one pipeline and one requested size for the whole cast.** Native size follows the pipeline — the hero's 180 came from the 4-direction creator, the dwarf's 244 from Pixen. Mixing pipelines guarantees mismatched sizes. **Standard is now the dwarf's: Pixen, 244².** Always read the returned size back and confirm it.

2. **Control apparent height in the game, not in the generator.** Every character declares an intended world height, and the packer normalizes to it on the feet baseline. That is why the dwarf being 119px tall against the hero's 146px is *fine* — a dwarf **should** be shorter. What matters is that it's a decision, not an accident.

So the rule: **native size consistent by pipeline; apparent size chosen per character in code.** Tell me the intended height in words ("waist-high to the hero", "a head taller") and I'll set the number.

## Step 4 — Generate

Reproducible path (preferred — the config becomes the permanent record):

```bash
cd card-engine/scripts/sprite-lab
# author configs/keeper-<name>.json, then:
node sprite-lab.mjs gen keeper-<name>
node sprite-lab.mjs portrait keeper-<name>   # dialogue bust, ~25 generations
node sprite-lab.mjs sheet keeper-<name>      # review sheet
```

A config carries the identity spec, the `avoid` string, `bibleNotes`, and the seed — so a regeneration months from now produces the same person. If you generate in the PixelLab web app instead, **send me the prompt, seed, and parameters** so I can write the config retroactively; otherwise that character is unreproducible.

## Quick copy-paste settings card

For every shopkeeper, unless you have a reason to differ:

```
Pipeline ............. Pixen character creator  (matches the dwarf — the bar)
Character size ....... leave default (returns ~244²; do not chase the number)
Camera view .......... low top-down
Isometric ............ off
Proportions .......... preset: chibi
Body template ........ mannequin
Outline .............. single color black outline
Shading .............. basic shading
Detail ............... medium detail
Colour reference ..... none
Force colours ........ off
Directions ........... 4  (NOT 8 — the dwarf's 8 doubled cost for unused views)
Facing ............... south  (toward the player)
Text guidance ........ 8.0
Seed ................. <write down an explicit number — the dwarf has none>
Animation ............ breathing-idle, restricted to SOUTH ONLY
                       (1 generation instead of 4 or 8)
Then ................. harmonize.py to seat him in the courtyard light
```

## Step 5 — Review before it goes in

- Same person in every frame?
- Trade readable at final size — not at 180px?
- Face visible and expressive?
- Does the silhouette read against honey-coloured flagstone, or vanish into it?
- Modesty holds?
- Distinct from the other shopkeepers at a glance?

Then the dialogue portrait: `POST /portrait-character-pro` with `direction: character_to_portrait` derives the bust **from that character's own sprite**, so the face in the chat window is provably the same person standing at the stall. (`POST /characters/{id}/portrait` is a *setter*, not a generator.)

## What I need from you to wire one in

1. The **stall** they belong to (`forge`, `collection`, `minigames`, `battles`)
2. Roughly where they stand relative to that stall — behind the counter, beside it, in front
3. Their **name** and that one line of personality

Their collider and proximity ribbon hook into the existing `stalls.ts` config, so placement is a couple of lines once the art exists.

## Known gap, stated honestly

`lib/validate.py` gates **four-row directional walk sheets**. It cannot currently gate a single-direction idle-only sprite — the row/mirror checks don't apply. Until I extend it, shopkeeper sprites get **human review only**, which means your eye is the gate. I'd rather tell you that than let you assume a check is running.

## Budget

~10–15 generations per shopkeeper including the portrait. Four shopkeepers ≈ **50–60 generations** of the 1765 remaining. Cost is not the constraint here; design quality is.
