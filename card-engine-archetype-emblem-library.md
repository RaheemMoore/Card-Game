# Archetype Emblem Library

**Canonical spec** for the archetype-selection emblems shown during the first stage of the card-forging flow (`ArchetypeSelector.tsx`).

Companion to [card-engine-archetype-prompt-library.md](card-engine-archetype-prompt-library.md), which governs full-body character portraits. **The two systems remain separate** — palettes, workflow, prompts, and status flow are all tracked independently here.

---

## 1. Purpose and scope

An archetype emblem is a **1:1 square selection asset** displayed at ~64–128 px in `ArchetypeSelector.tsx`. Its job is to communicate at a glance:

> Who this group is, what it values, and what visual culture belongs to it.

It is **not** a full character portrait, **not** a UI icon, and **not** a mechanical explainer. Combat mechanics, stat affinity, resource costs, and card effects are not default inputs to emblem design — they only influence the emblem when Raheem explicitly makes them part of the lore request.

**In scope**
- Design rules for every archetype's selection emblem.
- Final approved Leonardo prompts, palettes, and asset paths.
- The three-mode iteration workflow (`new_generation` / `full_regeneration` / `targeted_edit`).
- Approval status and asset-state definitions.

**Out of scope**
- Full-body portrait art direction — that's [card-engine-archetype-prompt-library.md](card-engine-archetype-prompt-library.md).
- Rank evolution — emblems do not evolve with rank.
- Runtime application prompts — emblem prompts live here, not in `services/`.

---

## 2. Shared visual system

Every emblem should generally use:

- **Square 1:1 composition**, ~1024×1024 rendered
- **One unified centered emblem**, front-facing
- **~75% image coverage** with clean negative space
- Strong readability at **64–128 px**
- **Deep relief**: engraving, carving, inlay, stitching, or dimensional construction
- **Premium fantasy / dark-fantasy / fantasy-tech / grounded-medieval** materials as appropriate to the archetype's culture
- Controlled dramatic lighting
- An archetype-specific gradient background (no scenery)
- One primary symbol + supporting lore motifs
- **No embedded card frame, application UI, text, banners, watermarks, or logos**

The set must feel related without every emblem being the same shape.

### Do not default every archetype to
- A shield
- A circular medallion
- A weapon
- A floating animal head
- A generic class logo

### Each emblem must have a distinct
- Outer silhouette
- Primary symbol
- Material language
- Construction method
- Accent palette
- Cultural craftsmanship

---

## 3. Lore-first design method

Before writing the first prompt, work through this internally:

1. **Lore identity** — Who is the archetype? Where do they come from? What do they believe?
2. **Primary symbol** — The single object, figure, relic, or silhouette that best expresses that identity.
3. **Supporting motifs** — Two to five secondary elements that add history without competing.
4. **Material language** — Materials that logically belong to the archetype's culture.
5. **Shape language** — Angular, circular, organic, mechanical, radiant, jagged, symmetrical, asymmetrical.
6. **Emblem palette** — Colors specifically approved or proposed for the selection emblem (see §9).
7. **Background gradient** — A restrained gradient that supports the emblem without becoming scenery.
8. **Set distinction** — How the emblem differs from every approved emblem already in the set (§13).
9. **Thumbnail test** — What remains recognizable when reduced to 64 px.

Use the analysis to make **one recommendation**. Do not expose the full worksheet unless Raheem asks.

---

## 4. First-pass autonomy rule

When `design-archetype-emblem` runs (either standalone or invoked from `create-archetype`), produce **one strong recommended emblem direction and one paste-ready Leonardo prompt without first asking Raheem to design the symbol.**

Default behavior:

1. State the recommended primary symbol in one sentence.
2. Briefly explain why it fits the lore.
3. Produce one Leonardo-ready prompt under the character limit (§5).
4. State the generation mode.
5. Fire the Leonardo API call (see `services/leonardoEmblemApi.ts`).
6. Save the returned image to `Card Images/Archetype Emblems/Drafts/<archetype>/gen-<timestamp>.jpg` and set status to `draft_generated`.
7. Wire the draft into `ArchetypeSelector.tsx` so Raheem can review it live.
8. On revision request, prefer **targeted edits** over full regenerations whenever most of the image already works.

### Only require a pre-generation approval gate when
- The lore is materially incomplete or contradictory.
- The requested imagery risks copying a real franchise or protected logo.
- The design would rely on a real-world religious, political, military, or occult symbol that needs clarification.
- Two approved project rules directly conflict.
- Raheem explicitly asks to review concepts before a prompt is written.

Human visual approval is still required to promote a draft to `approved`.

---

## 5. Leonardo prompt-construction rules

- **Default hard limit: 1,500 characters.** Some Leonardo models reject prompts near or above this.
- Target **1,250–1,450 characters** for new-generation prompts.
- Prefer **shorter edit prompts** where possible.
- **Count characters before delivery**; never claim an exact count without measuring.
- Give Raheem **one paste-ready main prompt**, no headings or template labels inside it.
- **Include exclusions at the end of the main prompt** — some Leonardo modes do not expose a negative-prompt field.
- Remove repetition before removing important visual direction.
- Use direct hierarchy language:
  - "Make X the clear main object."
  - "Keep Y secondary."
  - "The emblem must remain recognizable at thumbnail size."
  - "One unified relic, not multiple separate icons."
  - "Keep the entire subject inside the border."
  - "Preserve the existing image exactly…" (for targeted edits).

### Common exclusions, when relevant

- Text, letters, banners, labels, or typography
- Card frames and application UI
- Watermarks and logos
- Multiple separate emblems
- Unrequested characters or bodies
- Real-world religious or occult symbols
- Recognizable franchise designs
- Sexualized anatomy or armor
- Modern objects
- Rejected colors
- Unrequested scenery

### New-generation prompt structure

1. `Premium [fantasy style] [Archetype] emblem for a card-forging selection screen.`
2. `One unified [relic/symbol/form], front-facing and centered.`
3. One sentence establishing lore identity.
4. Primary symbol + hierarchy.
5. Supporting motifs + arrangement.
6. Materials, engraving, wear, construction.
7. Archetype-specific palette.
8. Gradient background + lighting.
9. Square format, coverage, readability, quality.
10. Exclusions.

The final output must be natural prose, not a visible fill-in-the-blank template.

---

## 6. New-generation workflow

**When to use:** No approved emblem exists, OR Raheem requested a total redesign.

1. Run the lore-first method (§3).
2. Draft the prompt using §5 structure.
3. Measure character count. Trim if over 1,450.
4. Fire the Leonardo API call via `generateEmblem(prompt)`.
5. Save the returned image data URL to `Card Images/Archetype Emblems/Drafts/<archetype>/gen-<ISO-timestamp>.jpg`.
6. Set status to `draft_generated`.
7. Update `card-engine/src/data/archetypeEmblems.ts` with the draft path.
8. Wait for Raheem's review. Default to a targeted edit for revisions.

---

## 7. Full-regeneration workflow

**When to use:** Most of the current draft is wrong (silhouette, palette, primary symbol, or shape language). Targeted editing would produce a Frankenstein result.

1. Explicitly list what remains from the approved direction and what changes.
2. State the reason full regeneration beats targeted editing.
3. Draft the new prompt using §5.
4. Fire the API call.
5. Save alongside the prior draft with a new timestamp. **Do not overwrite prior drafts.**
6. Status transitions to `draft_generated`; the prior draft moves to `revision_requested` for archival purposes.

---

## 8. Targeted-edit workflow

**Default revision mode.** Use whenever most of the image is already approved.

1. Do not rewrite the entire concept.
2. Recommend Leonardo image edit, image guidance, or inpainting.
3. State exactly which region should be masked.
4. Begin the prompt with `Preserve the existing image exactly…`
5. List the approved elements that must remain unchanged.
6. Describe only the requested modification.
7. Explicitly prohibit changes to the rest of the image.
8. Keep the edit prompt concise (often under 500 chars).

**Examples of appropriate targeted edits:**
- Change one gemstone color
- Add a HUD to a visor
- Improve face lighting
- Replace only the center symbol
- Remove fire outside a border
- Change an outer silhouette from a circle to an eye
- Refine body proportions while preserving fingerprint texture
- Keep flames inside a gold ring

**Constraint:** No paid Leonardo call happens without Raheem's authorization when the skill is running **outside** the `create-archetype` orchestrator. Inside `create-archetype`, new-generation calls fire automatically (see §4) — targeted-edit calls still respect the "wait for review" state.

---

## 9. Approval and asset-status rules

### Required approval points
1. After the first emblem image is generated.
2. After any substantial redesign.
3. Before the asset is marked `approved`.
4. Before final UI integration (already done for the shipped set of 10; applies to future new-archetype emblems).

### Not normally required
- Approval of three concept options before a first prompt.
- Approval of a long design worksheet.
- Approval of every minor prompt wording choice.

### Asset states

Track per archetype in `card-engine/src/data/archetypeEmblems.ts` and mirror here in §11:

| State | Meaning |
|---|---|
| `not_started` | No design work has begun. |
| `prompt_ready` | Prompt drafted; no image generated yet. |
| `draft_generated` | Leonardo has returned an image; wired into UI for review. |
| `revision_requested` | Raheem flagged issues; awaiting new draft. |
| `approved` | Visually cleared by Raheem; source of truth for the set. |
| `integrated` | Approved AND wired into `ArchetypeSelector.tsx` as the live asset. |

### Parallel work rule
After the first prompt fires, `create-archetype` may continue non-destructive planning while the emblem generates. It must **not**:
- Mark the archetype fully complete.
- Mark the emblem `approved`.
- Hide the fact that the emblem is still pending.

---

## 10. Approved emblem benchmark specifications

The following ten emblems are the **canonical benchmark set**. When the image and the recorded prompt diverge slightly, the **image is authoritative**.

Emblem palettes below are **extracted from the final approved prompts** (not proposed guesses).

### 10.1 Barbarian

- **Primary symbol:** Blood-Iron ancestral clan crest — vertical clan relic, shield-like but unique
- **Silhouette:** Bold symmetrical, broad armored top with tapered lower point
- **Supporting motifs:** Angular interlocking tribal knotwork suggesting horned warrior, rising flame, split mountain, back-to-back guardians; interwoven bands; carved notches; horn/fang forms
- **Materials:** Blackened iron, aged silver edges, thick rivets, red enamel, carved bone accents, worn leather, ceremonial wear
- **Palette:** Blackened iron, aged silver, red enamel/crimson, bone ivory, worn leather
- **Background:** Dark smoky with faint crimson light
- **Lore themes:** Lineage, clan memory, ritual, inherited strength, oral tradition, ceremonial scars
- **Mode used:** `new_generation` (Lucid Origin model)
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/barbarian.jpg](Card%20Images/Archetype%20Emblems/Approved/barbarian.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/barbarian.jpg`

### 10.2 Monk

- **Primary symbol:** Circular monastery seal with clenched fist medallion at center
- **Silhouette:** Layered round or octagonal (not shield)
- **Supporting motifs:** Four crossed staffs wrapped in orange cloth and capped with bronze; concentric rings; sacred geometry; meditation beads; symmetrical carvings
- **Materials:** Dark carved wood, aged bronze, ivory stone, wrapped cloth, burnt-orange amber, warm gold-brown medallion
- **Palette:** Burnt orange, deep amber, dark brown, charcoal, warm gold-brown, aged bronze, ivory
- **Background:** Dark smoky with soft orange light
- **Lore themes:** Discipline, controlled strength, training, inner mastery, meditation, generations of practice
- **Mode used:** `new_generation` (Gemini 2.5 Flash Image)
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/monk.jpg](Card%20Images/Archetype%20Emblems/Approved/monk.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/monk.jpg`

### 10.3 Beastmaster

- **Primary symbol:** Ceremonial beast totem with three vertically arranged animals — owl (top), bear (center), wolf (bottom)
- **Silhouette:** Round carved-wood and antler frame
- **Supporting motifs:** Branching antlers; bone points; braided leather; fur trim; weathered bronze; emerald-green enamel or stone; tribal geometry
- **Materials:** Layered brown timber, engraved metal, carved wood, bone ivory
- **Palette:** Walnut, bark brown, leather brown, aged bronze, bone ivory, forest green, polished gold
- **Background:** Dark smoky woodland with subtle green-gold light
- **Lore themes:** Bonds with multiple animal guardians (sky/vision, strength/protection, instinct/loyalty)
- **Mode used:** `new_generation` (Lucid Origin)
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/beastmaster.jpg](Card%20Images/Archetype%20Emblems/Approved/beastmaster.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/beastmaster.jpg`

### 10.4 Druid

- **Primary symbol:** Rootweaver relic — one large open hand formed entirely from intertwined roots and branches
- **Silhouette:** Circular
- **Supporting motifs:** Layered bark grain; braided woody fibers; small offshoots; moss; leaves; faint green energy through natural cracks; weathered stone rings; aged bronze fittings; carved knotwork; warm gold trim
- **Materials:** Woody roots, weathered stone, aged bronze, warm gold
- **Palette:** Deep forest green, moss green, rich bark brown, weathered stone, aged bronze, warm gold
- **Background:** Dark misty forest with subtle green-gold illumination
- **Lore themes:** Tree-born beings; control over plants and roots; life energy through the natural world
- **Mode used:** `new_generation` (Lucid Origin)
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/druid.jpg](Card%20Images/Archetype%20Emblems/Approved/druid.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/druid.jpg`

### 10.5 Necromancer

- **Primary symbol:** Ancient bone skull in **left-facing side profile**, enclosed by a large black crescent moon
- **Silhouette:** Skull + crescent lunar halo — not a shield or medallion
- **Supporting motifs:** Layered funeral filigree; spirit-binding chains; grave seals; bone-carved patterns; soul-vessel markings; tomb-arch motifs; tiny etched scenes of hands raising from earth, hooded mourners, and drifting spirits; aged silver edging; dark purple enamel; polished violet crystal inlays; **no floating secondary eye symbol**
- **Materials:** Bone ivory, blackened iron, aged silver, violet crystal
- **Palette:** Bone ivory, near-black, aged silver, midnight purple
- **Background:** Dark smoky background with faint purple mist and dim spectral wisps
- **Lore themes:** Death scholarship, spirit binding, forbidden knowledge, ancient graves
- **Mode used:** `new_generation` (Lucid Origin)
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/necromancer.jpg](Card%20Images/Archetype%20Emblems/Approved/necromancer.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/necromancer.jpg`

### 10.6 Vampire

- **Primary symbol:** Circular bloodline relic — fierce bat face with wings above an ancient ceremonial dagger, backed by a blood moon
- **Silhouette:** Circular, thick border of ancient black castle bricks and aged iron braces
- **Supporting motifs:** Blood moon partly hidden behind central crest; long ancient dagger with aged silver edges, blackened steel, crimson enamel, garnet inlays; restrained engraving of blood drops, coffin arches, thorned vines, lunar phases, ancestral crests, branching bloodlines; **fierce bat face — not a horned skull**
- **Materials:** Ancient black castle brick, cracked mortar, worn stone, aged iron, leathery bat-wing membranes
- **Palette:** Blood red, deep crimson, near-black, charcoal, aged silver, bone ivory, garnet
- **Background:** Dark red-to-black gradient with crimson mist, no scenery
- **Lore themes:** Immortal bloodlines, predation, old castles, ancient nobility
- **Mode used:** `new_generation` (Lucid Origin)
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/vampire.jpg](Card%20Images/Archetype%20Emblems/Approved/vampire.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/vampire.jpg`

### 10.7 Mech Pilot

- **Primary symbol:** Techno-arcane pilot crest — visor helmet with **natural human eyes** behind a transparent smoked visor
- **Silhouette:** Circular forged mechanical ring; helmet and pilot fully contained inside the ring, no shoulders or body beyond it
- **Supporting motifs:** Layered gear segments; rune-engraved circuitry; cobalt crystal nodes; aged silver trim; blue energy channels; compact cobalt/midnight-blue armor; dark lower-face fabric; vents, cables, brass seals; knightly plate geometry; subtle cyan-blue HUD across the visor (targeting brackets, minimal status indicators, faint arcane-tech glyphs, restrained reticle near one eye)
- **Materials:** Forged metal, aged silver, cobalt crystal, smoked transparent visor glass
- **Palette:** Cobalt, midnight blue, gunmetal silver, restrained warm visor reflections (amber), **no orange background, no blue-tinted skin**
- **Background:** Blue-to-black gradient with soft blue mist only
- **Lore themes:** A living pilot bonded to fantasy-infused technology
- **Mode used:** `new_generation` (Gemini 2.5 Flash Image)
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/mech-pilot.jpg](Card%20Images/Archetype%20Emblems/Approved/mech-pilot.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/mech-pilot.jpg`

### 10.8 Android

- **Primary symbol:** Synthetic-eye relic — one large horizontal mechanical eye with circular iris
- **Silhouette:** **The entire emblem IS the eye** — pointed inner/outer corners, smooth curved lids, symmetrical almond shape. **No circular outer frame, no medallion silhouette**
- **Supporting motifs:** Layered glass iris rings; radial mechanisms; delicate circuitry; luminous cerulean segments; fine circuit paths extending outward like artificial nerves ending in small silver nodes; engraved geometric filigree; crystal lens layers; arcane circuit runes
- **Materials:** Pearl-white shell, polished silver edges, glass, silver mechanisms
- **Palette:** Pearl white, pale silver, soft gray, icy cyan, luminous cerulean, restrained violet-blue highlights
- **Background:** White-to-light-gray gradient (white upper, neutral gray lower + outer edges) — the only emblem with a light background
- **Lore themes:** Artificial identity, memory, perception, awakening
- **Mode used:** `new_generation`
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/android.png](Card%20Images/Archetype%20Emblems/Approved/android.png)
- **App asset:** `card-engine/public/assets/archetype-emblems/android.png`

### 10.9 Human

- **Primary symbol:** Forged Identity crest — tall, lean medieval knight silhouette formed **entirely from continuous silver-gray human fingerprint ridges**
- **Silhouette:** Circular border of aged saddle leather with stitched seams
- **Supporting motifs:** Fingerprint ridge lines defining helmet, neck, shoulders, narrow waist, chest, separated arms and forearms, hands, hips, two distinct legs; upright balanced heroic stance; medieval city skyline in dark chocolate-brown leather (towers, rooftops, arches, chimneys, distant walls); braided straps, iron buckles, small rivets on the border
- **Materials:** Aged saddle leather, stitched seams, iron rivets. **No solid armor plates, no realistic metal body surfaces**
- **Palette:** Charcoal, warm gray, silver-gray, saddle brown, dark chocolate-brown, worn tan, restrained steel accents
- **Background:** Warm leather-to-charcoal gradient with soft neutral lighting
- **Lore themes:** Individuality, mortality, resilience, human potential earned through effort
- **Mode used:** `targeted_edit` (Gemini 2.5 Flash Image — filename begins "Preserve the existing Human emblem's circular leather border stitched details…")
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/human.jpg](Card%20Images/Archetype%20Emblems/Approved/human.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/human.jpg`

### 10.10 Seraph

- **Primary symbol:** Six-winged celestial guardian seal — radiant celestial mask/faceless armored core (not a human portrait) surrounded by **exactly six feathered wings in three symmetrical pairs** (one rising up, one spreading out, one folding down)
- **Silhouette:** Ornate circular halo-ring of aged gold containing the composition
- **Supporting motifs:** Ivory feathers with gold-edged plates and pale-blue crystal inlays; star-forged engraving; strong warm sunrays descending from above through soft clouds; celestial geometry, constellations, oath marks, sunbursts, protective filigree on the halo-ring; large detailed hellfire inside the lower half of the ring (bright orange cores, deep crimson edges, layered fantasy filigree, dramatic upward movement behind a polished red gemstone at bottom center); **all fire contained within the gold ring — no flame outside**; **upper crystals remain pale blue**
- **Materials:** Aged gold, ivory-feathered plate, pale blue crystal, polished red gemstone
- **Palette:** Radiant gold, ivory-white, pale celestial blue, aged silver, deep charcoal, crimson, restrained orange
- **Background:** Dark charcoal-to-black gradient outside the ring
- **Lore themes:** Protection, judgment, sacrifice, balance between celestial light and the abyss
- **Mode used:** `targeted_edit` (Gemini 2.5 Flash Image — filename begins "Preserve the existing Seraph emblem exactly same celestial face crown six wings…")
- **Status:** `integrated`
- **Approved asset:** [Card Images/Archetype Emblems/Approved/seraph.jpg](Card%20Images/Archetype%20Emblems/Approved/seraph.jpg)
- **App asset:** `card-engine/public/assets/archetype-emblems/seraph.jpg`

---

## 11. Approved-asset manifest

| Archetype | Status | Format | Approved path | App path |
|---|---|---|---|---|
| Barbarian | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/barbarian.jpg` | `public/assets/archetype-emblems/barbarian.jpg` |
| Monk | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/monk.jpg` | `public/assets/archetype-emblems/monk.jpg` |
| Beastmaster | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/beastmaster.jpg` | `public/assets/archetype-emblems/beastmaster.jpg` |
| Druid | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/druid.jpg` | `public/assets/archetype-emblems/druid.jpg` |
| Necromancer | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/necromancer.jpg` | `public/assets/archetype-emblems/necromancer.jpg` |
| Vampire | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/vampire.jpg` | `public/assets/archetype-emblems/vampire.jpg` |
| Mech Pilot | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/mech-pilot.jpg` | `public/assets/archetype-emblems/mech-pilot.jpg` |
| Android | `integrated` | PNG | `Card Images/Archetype Emblems/Approved/android.png` | `public/assets/archetype-emblems/android.png` |
| Human | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/human.jpg` | `public/assets/archetype-emblems/human.jpg` |
| Seraph | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/seraph.jpg` | `public/assets/archetype-emblems/seraph.jpg` |
| Lycanthrope | `integrated` | JPG | `Card Images/Archetype Emblems/Approved/lycanthrope.jpg` | `public/assets/archetype-emblems/lycanthrope.jpg` |

Approval date for the shipped ten: **unknown** (assets pre-date this library). Original source files preserved in `Card Images/Archetype Cards/`.

---

## 12. Set-wide distinctness checklist

Verify a new emblem against every approved emblem before generation:

| Dimension | How the set differs today |
|---|---|
| **Outer silhouette** | Barbarian: tapered shield · Monk: octagonal · Beastmaster: antlered round · Druid: circular stone-ring · Necromancer: skull+crescent · Vampire: brick circle · Mech Pilot: mechanical ring · Android: horizontal eye · Human: leather circle · Seraph: gold ring |
| **Primary symbol** | Clan rune · Fist medallion · Owl+bear+wolf totem · Root hand · Profile skull · Bat-dagger · Visored helm · Synthetic eye · Fingerprint knight · Six-winged mask |
| **Dominant palette** | Iron+crimson · Amber+bronze · Wood+forest-green · Forest-green+gold · Purple+ivory · Crimson+black · Cobalt+silver · Pearl+cyan · Leather+charcoal · Gold+ivory+crimson |
| **Background** | Smoky crimson · Soft orange · Green-gold · Green-gold · Purple mist · Red-to-black · Blue-to-black · **White-to-gray (only light bg)** · Leather-to-charcoal · Charcoal-to-black |
| **Shape language** | Angular · Symmetrical circular · Antlered organic · Rooted organic · Skeletal+lunar · Winged+bladed · Techno-symmetrical · Almond-eye · Humanoid-linear · Radiant winged |

**New emblem must break new ground on at least two of these dimensions.**

---

## 13. Template for future archetypes

When designing an emblem for a new archetype (Lycanthrope or beyond), fill in a §10 entry using this template:

```markdown
### 10.N <Archetype>

- **Primary symbol:** <one sentence>
- **Silhouette:** <shape, distinctness note>
- **Supporting motifs:** <2–5 motifs>
- **Materials:** <material list>
- **Palette:** <colors — recorded from the final prompt>
- **Background:** <gradient description>
- **Lore themes:** <what the emblem communicates>
- **Mode used:** `new_generation` | `full_regeneration` | `targeted_edit`
- **Status:** `<state>`
- **Approved asset:** `Card Images/Archetype Emblems/Approved/<archetype>.<ext>`
- **App asset:** `card-engine/public/assets/archetype-emblems/<archetype>.<ext>`

**Final prompt used** (`<char-count>` chars):

    <verbatim Leonardo prompt>
```

---

## 14. Revision-history guidance

- Every substantive edit to §10 or §15 (a status change, a palette change, a symbol reinterpretation) should be committed with a `docs: emblem library — <archetype>: <change>` message.
- Do **not** silently overwrite an `approved` entry. If a redesign is happening, record the new draft alongside and update status to `revision_requested`.
- When a draft is promoted to `approved`, move the source file from `Drafts/<archetype>/gen-<timestamp>.jpg` to `Approved/<archetype>.jpg` and update the app-asset copy in `public/assets/archetype-emblems/`.
- The full prompt used to produce the approved image is required in §10.N. If prompt history was not captured, mark the prompt field `not recorded`.

---

## 15. Lycanthrope emblem history

**Status:** `integrated` (approved by Raheem 2026-07-17 on first-pass generation)

- Lycanthrope was added to the game as the 11th archetype ([commit `6877006`](https://github.com/) — moon-blessed archetype) prior to this library existing.
- The archetype has approved lore, DNA, palette, escalation rule, and a special portrait-pipeline exception (`init_strength = 0.15`, four locked textual anchors, front-loaded silhouette-break mandate).
- **First emblem generation was the inaugural production use of `design-archetype-emblem`.** Prompt in §16.11 below. Cost: $0.0359 (Kino XL, 1024², Alchemy). Model chose a circular carved-stone frame with crescent-at-base instead of the requested vertical oval — Raheem approved the deviation.
- Approved image at `Card Images/Archetype Emblems/Approved/lycanthrope.jpg`; app copy at `public/assets/archetype-emblems/lycanthrope.jpg`. Original timestamped draft preserved in `Drafts/Lycanthrope/`.

---

## 16. Final approved prompts

These are the **canonical prompt strings** that produced (or targeted-edited) each approved image. Preserve verbatim.

### 16.1 Barbarian (new_generation, 892 chars)

```
Premium dark-fantasy Barbarian emblem for a card-forging selection screen. Create one unified vertical clan crest, front-facing and centered, representing an ancient warrior culture built on ancestry, tribal rites, inherited relics, ceremonial scars, and oral tradition.

Forge it from blackened iron with aged silver edges, thick rivets, red enamel, carved bone accents, worn leather, dents, scratches, and ceremonial wear.

At the center, place an original ancestral rune of angular interlocking tribal knotwork. It should suggest a horned warrior, rising flame, split mountain, and two guardians standing back-to-back, without becoming a literal person, creature, or weapon. Interwoven bands represent generations; carved notches honor ancestors and victories; horn and fang forms symbolize survival and strength; red enamel represents bloodline, war paint, courage, sacrifice, and inherited duty.

Use a bold symmetrical silhouette with a broad armored top and tapered lower point, inspired by a ceremonial shield but clearly a unique clan relic. Ancient, brutal, noble, expertly crafted. Realistic forged metal, intricate engraving, deep relief, crisp edges, dramatic lighting and strong contrast.

Square image, emblem fills 75%, clean negative space, dark smoky background with faint crimson light. Exclude characters, faces, skulls, hands, text, numbers, banners, card frames, UI, watermarks, weapons, multiple emblems, real-world symbols, and scenery.
```

### 16.2 Monk (new_generation, 963 chars)

```
Premium dark-fantasy Monk emblem for a card-forging selection screen. Create one unified circular monastery seal, front-facing and centered, representing discipline, balance, restraint, inner strength, and mastery of body and spirit.

Build it from dark carved wood, aged bronze, ivory stone, wrapped cloth, and burnt-orange amber. Use a layered round or octagonal silhouette, not a shield. Four wooden staffs cross behind the center, wrapped in orange cloth and capped with bronze.

At the center, place a large raised medallion of warm gold-brown metal: aged brass, dark gold, and polished bronze highlights. Make it brighter than the surrounding wood. Emboss a bold, simplified, front-facing clenched fist into the medallion. The fist represents disciplined strength, focus, endurance, and controlled power, and must be the clear focal point.

Surround it with concentric rings, sacred geometry, meditation beads, and symmetrical carvings suggesting generations of training. Calm, powerful, spiritual, handcrafted, and ceremonial. Strong symmetry, smooth curves, controlled detail.

Palette: burnt orange, deep amber, dark brown, charcoal, warm gold-brown, aged bronze, and ivory. Square image, emblem fills 75%, clean negative space, dark smoky background with soft orange light. Realistic materials, deep relief, crisp edges, dramatic lighting.

Exclude characters, faces, bodies, text, card frames, UI, watermarks, shields, multiple emblems, real-world religious symbols, and scenery.
```

### 16.3 Beastmaster (new_generation, 1163 chars)

```
Premium dark-fantasy Beastmaster emblem for a card-forging selection screen. Create one unified ceremonial beast totem, front-facing and centered, with no human hand.

Use a round carved-wood and antler frame inspired by a sacred wilderness crest: layered brown timber, branching antlers, bone points, braided leather, fur trim, weathered bronze, and emerald-green enamel or stone behind the totem. Add warm gold accents and engraved tribal geometry.

Build the central totem from three clearly distinct animals arranged vertically as one connected relic. At the top, an owl-like bird with a sharp beak and wide symmetrical wings spread across the upper frame, representing vision and the sky. In the center, a broad bear face with rounded ears, heavy brow, and powerful muzzle, representing strength and protection. At the bottom, a lean wolf face with pointed ears, narrow muzzle, and alert expression, representing instinct and loyalty. Each animal must be immediately recognizable and visually different.

Use rich natural browns rather than black: walnut, bark brown, leather brown, aged bronze, bone ivory, forest green, and polished gold. Realistic carved wood, engraved metal, deep relief, crisp edges, dramatic lighting, premium fantasy game icon.

Square image, emblem fills 75%, clean negative space, dark smoky woodland background with subtle green-gold light. Exclude hands, characters, text, card frames, UI, shields, separate emblems, modern objects, and repeated wolf faces.
```

### 16.4 Druid (new_generation, 1183 chars)

```
Premium dark-fantasy Druid emblem for a card-forging archetype selection screen. Create one unified circular Rootweaver relic, front-facing and centered, representing tree-born druids who command roots, vines, and living plants.

Make the primary symbol one large open hand formed entirely from thick intertwined roots and branches. The wrist grows upward from a mass of twisting roots; five clear wooden fingers curve gently around an empty center as if guiding unseen plant life. Preserve the beautiful root-like anatomy: layered bark grain, braided woody fibers, small offshoots, moss, leaves, and faint green energy flowing through natural cracks. The hand must be symbolic and sculptural, not human skin and not attached to a body.

Surround it with the established circular Druid frame: layered weathered stone rings, aged bronze fittings, carved knotwork, warm gold trim and medallion accents. Let a few roots weave through and over the frame so the relic feels alive, while keeping the silhouette clean and readable.

Palette matched to the game: deep forest green, moss green, rich bark brown, weathered stone, aged bronze, and warm gold. Dark misty forest background with subtle green-gold illumination. Square image, emblem fills 75%, realistic materials, deep relief, crisp edges, premium fantasy game icon.

Exclude tree face, humanoid torso, skin, character portrait, animals, text, card frame, UI, shields, multiple emblems, buildings, and modern objects.
```

### 16.5 Necromancer (new_generation, 1236 chars)

```
Premium dark-fantasy Necromancer emblem for a card-forging archetype selection screen. Create one unified death-moon relic, front-facing and centered.

Keep the centerpiece as an ancient bone skull in a clear left-facing side profile, enclosed by a large black crescent moon that curves around it like a ritual blade and lunar halo. Preserve this silhouette. The skull should be elegant, weathered, cracked, and ritualistic, with subtle midnight-purple light inside the eye socket and deep seams.

Increase the visual richness with intricate necromancer lore engraving. Cover the crescent and skull with layered funeral filigree, spirit-binding chains, grave seals, bone-carved patterns, soul-vessel markings, tomb-arch motifs, and tiny etched scenes of hands raising from earth, hooded mourners, and drifting spirits. Keep all symbols original and decorative, not real-world occult signs. Add aged silver edging, dark purple enamel, blackened iron, bone ivory, and polished violet crystal inlays.

Behind the skull, use only faint purple mist and dim spectral wisps. Remove the small floating eye symbol entirely. The skull and crescent must remain the clear focus.

Square image, emblem fills 75%, dark smoky background, realistic materials, deep relief, crisp edges, dramatic lighting, premium fantasy game icon.

Exclude front-facing skull, extra symbols beside the head, characters, blood, gore, text, card frames, UI, multiple skulls, bright orange, green glow, and modern objects.
```

### 16.6 Vampire (new_generation, 1263 chars)

```
Premium dark-fantasy Vampire emblem for a card-forging selection screen. Create one unified circular bloodline relic, front-facing and centered.

Build a thick border from ancient black castle bricks, cracked mortar, worn stone, and aged iron braces. Place a glowing blood moon inside the border as part of the emblem, partly hidden behind the central crest instead of filling the background.

Create a worn bat-dagger symbol in front of the moon. Use a fierce bat face at the center with pointed ears, narrow predatory eyes, short muzzle, and visible fangs—no skull or horns. Extend large symmetrical bat wings with layered leathery membranes, torn edges, cracks, scars, and weathered engraving. The wings should feel ancient, brutal, and ceremonial, not elegant or cute.

Below the bat face, form a long ancient dagger with a sharp blade, aged silver edges, blackened steel, crimson enamel, and garnet inlays. Add restrained vampire-lore engraving: blood drops, coffin arches, thorned vines, lunar phases, ancestral crests, and branching bloodlines.

Palette: blood red, deep crimson, near-black, charcoal, aged silver, bone ivory, and garnet. Use the same dark red-to-black gradient background style as the other class emblems, with crimson mist and no scenery.

Square image, emblem fills 75%, strong silhouette, realistic materials, deep relief, crisp edges, dramatic lighting. Exclude skulls, horns, text, banners, characters, card frames, UI, castles, trees, bright blue, green, or purple.
```

### 16.7 Mech Pilot (new_generation, 1450 chars)

```
Premium dark-fantasy Mech Pilot emblem for a card-forging selection screen. Create one unified circular techno-arcane pilot crest, front-facing and centered.

Keep the forged mechanical ring exactly as the dominant border: layered gear segments, rune-engraved circuitry, cobalt crystal nodes, aged silver trim, and blue energy channels. Keep the entire helmet and pilot fully inside the ring, with no shoulders or body extending beyond it.

At the center, show an original visor-style pilot helmet with a clear pair of natural human eyes behind a transparent smoked visor. Preserve the compact cobalt and midnight-blue armor, dark lower-face fabric, vents, cables, brass seals, and knightly plate geometry.

Improve facial readability with balanced cinematic lighting: a soft warm-neutral key light across the eyes and upper face, subtle amber reflections inside the visor, gentle silver highlights on the cheek plates, and deeper shadows around the helmet edges. Keep the blue rim light on the armor and ring, but prevent blue light from washing over the skin. The face should remain natural, focused, and clearly human.

Add a subtle transparent holographic HUD across the inside surface of the visor: thin cyan-blue interface lines, small targeting brackets, minimal status indicators, faint arcane-tech glyphs, and a restrained circular reticle near one eye. The HUD should follow the visor's curvature without covering the eyes.

Use a blue-to-black gradient background with soft blue mist only. Square image, emblem fills 75%, realistic materials, deep relief, crisp edges, dramatic lighting.

Exclude robotic eyes, glowing skin, blue-tinted skin, orange background, exposed face, body outside the ring, text, numbers, UI panels, weapons, spacecraft, franchise designs, and logos.
```

### 16.8 Android (new_generation, 1150 chars)

```
Premium fantasy-tech Android emblem for a card-forging selection screen. Create one unified synthetic-eye relic, front-facing and centered, representing artificial identity, memory, perception, and awakening.

Shape the entire emblem as one large horizontal mechanical eye with pointed inner and outer corners, smooth curved upper and lower lids, and a symmetrical almond-shaped pearl-white shell with polished silver edges.

At the center, place a circular synthetic iris with layered glass rings, icy-blue light, radial mechanisms, delicate circuitry, luminous cerulean segments, and a dark central pupil. Extend fine circuit paths outward from the iris across the inner eye surface like artificial nerves, ending in small silver nodes.

Add fantasy character through engraved geometric filigree, crystal lens layers, arcane circuit runes, and precise silver mechanisms. Keep the design elegant, intelligent, refined, mysterious, and non-military.

Palette: pearl white, pale silver, soft gray, icy cyan, luminous cerulean, and restrained violet-blue highlights. Use a smooth white-to-light-gray gradient background, white behind the upper portion and soft neutral gray toward the lower portion and outer edges, with restrained natural shadowing beneath the emblem.

Square image, emblem fills 75%, clean negative space, realistic glass and metal, deep relief, crisp edges, premium fantasy game icon.

Exclude circular outer frame, round medallion silhouette, skin, eyelashes, human anatomy, multiple eyes, helmets, faces, bodies, text, UI, logos, weapons, blue background, and dark background.
```

### 16.9 Human (targeted_edit — final wording, 1223 chars)

```
Premium dark-fantasy Human emblem for a card-forging selection screen. Create one unified circular Forged Identity crest, front-facing and centered, representing individuality, mortality, resilience, and human potential earned through effort.

Make the clear primary symbol a tall, lean, realistically proportioned medieval knight silhouette formed entirely from continuous silver-gray human fingerprint ridges. The fingerprint pattern must be the knight itself, not printed over armor. Use the flowing ridge lines to define a helmet, neck, shoulders, narrow waist, chest, separated arms and forearms, hands, hips, and two distinct legs. Keep the stance upright, balanced, heroic, and readable at thumbnail size. No solid armor plates or realistic metal body surfaces.

Surround the knight with a thick circular border made from aged saddle leather, stitched seams, braided straps, worn edges, iron buckles, and small rivets. Behind the knight, create a subtle medieval city skyline silhouette made from dark chocolate-brown leather: towers, rooftops, arches, chimneys, and distant walls. The city must remain darker than the warm leather field but lighter and warmer than the charcoal knight.

Palette: charcoal, warm gray, silver-gray, saddle brown, dark chocolate-brown, worn tan, and restrained steel accents. Use a warm leather-to-charcoal gradient background with soft neutral lighting.

Square image, emblem fills 75%, realistic leather texture, crisp fingerprint lines, deep relief, premium fantasy game icon. Exclude bulky proportions, rounded torso, realistic armor surfaces, separate fingerprint symbols, black city silhouette, magic, glowing eyes, text, UI, and modern buildings.
```

### 16.10 Seraph (targeted_edit — final wording, 1265 chars)

```
Premium dark-fantasy Seraph emblem for a card-forging selection screen. Create one unified six-winged celestial guardian seal, front-facing and centered, representing protection, judgment, sacrifice, and balance between heaven and the abyss.

Use an original radiant celestial mask or faceless armored core, not a human portrait. Surround it with exactly six feathered wings in three symmetrical pairs: one rising upward, one spreading outward, and one folding downward. The wings should feel ancient and powerful, with ivory feathers, gold-edged plates, pale-blue crystal inlays, and star-forged engraving.

Above the emblem, cast strong warm sunrays downward through soft clouds, lighting the upper wings in gold and ivory. Surround the composition with an ornate circular halo-ring of aged gold, celestial geometry, constellations, oath marks, sunbursts, and protective filigree.

Inside the lower half of the gold ring, place large detailed hellfire with bright orange cores, deep crimson edges, layered fantasy filigree shapes, and dramatic upward movement behind a polished red gemstone at the bottom center. Keep all flames, aura, smoke, embers, and fiery glow entirely contained within the gold ring. No fire may extend outside it. Keep the upper crystals pale blue.

Palette: radiant gold, ivory-white, pale celestial blue, aged silver, deep charcoal, crimson, and restrained orange. Use a dark charcoal-to-black gradient background outside the ring.

Square image, emblem fills 75%, realistic materials, deep relief, crisp edges, dramatic lighting, premium fantasy game icon. Exclude crosses, scripture, church imagery, realistic angels, exposed human faces, text, card frames, UI, multiple emblems, and modern objects.
```

*Character counts are indicative. Original source file with the ten prompts preserved at [Card Images/Archetype Cards/Final_Archetype_Emblem_Prompts.txt](Card%20Images/Archetype%20Cards/Final_Archetype_Emblem_Prompts.txt).*

### 16.11 Lycanthrope (new_generation, 1494 chars)

```
Premium dark-fantasy Lycanthrope emblem for a card-forging selection screen. One unified lunar-devotion sigil, front-facing and centered — hunters blessed by the Moon Goddess whose wolf form is a gift, not a curse.

Center on a bold snarling front-facing wolf head with parted jaws and visible fangs — never a skull. Place it in front of a large full silver moon disc that halos the head. Wolf is the main object; moon is secondary.

The outer silhouette is two mirrored curved bands of dark carved stone meeting at top and bottom to form a vertical oval — not a circle or shield. Inlay the bands with silver lunar-cycle relief: waxing crescent top, half moons sides, eclipse corona bottom. Wrap a braided leather identity-cord where the bands meet at the bottom.

Silver moonlight veins run through the wolf's mane; silver hunter-rune engraving on the stone.

Palette: cold moonlight silver, bone white, slate gray fur, deep charcoal stone, cool blue-silver highlights; silver-gold only on the central full moon.

Midnight-blue-to-black gradient background with silver moonlight mist, no scenery. Square image, emblem fills 75%, clean negative space, realistic carved stone and fur, deep relief, crisp edges, dramatic lighting, premium fantasy game icon.

Exclude skulls, lone crescents, castle bricks, bat wings, human faces or hands, text, banners, card frames, UI, watermarks, multiple emblems, real-world religious or occult symbols, franchise designs, gore, and orange or red backgrounds.
```

*Model: Leonardo Kino XL. Cost: $0.0359. Generation ID: `2741e6a8-147c-479e-8155-14fc87c95abd`. Status: `integrated` — approved on first pass. Model interpreted "vertical oval" as a circular frame with crescent-at-base; Raheem approved the deviation.*

---

## 17. Related documents

- [`.claude/skills/design-archetype-emblem/SKILL.md`](.claude/skills/design-archetype-emblem/SKILL.md) — the workflow that produces new emblems
- [`.claude/skills/create-archetype/SKILL.md`](.claude/skills/create-archetype/SKILL.md) — orchestrator that invokes the emblem skill during new-archetype creation
- [`.claude/agents/art-prompt-director.md`](.claude/agents/art-prompt-director.md) — advisory agent for both portrait and emblem art
- [card-engine-archetype-prompt-library.md](card-engine-archetype-prompt-library.md) — sibling system for full-body character portraits
