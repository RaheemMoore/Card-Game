# Leonardo Playbook

A **living** knowledge store for what actually works when prompting Leonardo (Phoenix) for this game's art. Subagents start cold every session — this file is how learnings compound over time. The **art-prompt-director** agent reads this before any image work and **appends** a dated entry whenever we observe a real result (good or bad), especially via the Prompt Lab regen-verify loop.

> Rule: never delete a learning — supersede it with a newer dated entry. Keep entries concrete (name the element/effect, the exact language, the observed outcome).

---

## Field-impact ranking (element visual language)

When making an element read as a **distinct visible power**, the `ElementVisual` fields matter in this order:

1. **materials** — concrete physical nouns. *By far the biggest lever.* Phoenix anchors on nouns; "molten iron, obsidian" vs "arterial blood, clotting ichor" render as different substances.
2. **lighting** — how light interacts with the material (radiant internal glow vs wet translucent sheen). Sells dry-vs-wet, solid-vs-liquid.
3. **motion** — direction + behavior (rising/dry vs dripping/wet vs crystallizing).
4. **textures** — reinforces the material read (cracked char vs glossy wet).
5. **shapes** — silhouette; recognizability even without color.
6. **colors** — necessary but the *weakest* differentiator alone (color-only = "glowing blobs").

**Excluded from the image on purpose:** `theme` and `symbolism` — these are *emotional identity* ("passion, anger, courage"). They feed the **lore** engine, never the portrait, or the character reads as "angry person" instead of "person wielding fire."

## Core principle — zero-overlap distinctiveness

No two elements may share the same **material + texture + motion** signature. Same color family is fine; same substance is not. Every element sits on a physical axis (dry↔wet, rising↔falling, solid↔liquid↔gas, radiant↔absorptive, smooth↔jagged).

**Exemplar — Fire vs Blood (same red family, opposite substance):**

| | Fire = dry / rising / radiant | Blood = wet / viscous / dripping |
|---|---|---|
| materials | molten iron, magma, glowing coals, charred obsidian | arterial blood, clotting pools, glistening ichor, red crystal |
| textures | blackened cracked crust over glowing veins, flaking char | glossy wet sheen, viscous syrup-thick drips, beading droplets |
| lighting | fierce internal core-glow, heat-shimmer, hard falloff | dark translucent red, subsurface glow, wet specular highlights |
| motion | sparks spiraling UPWARD, flame-tongues, rising smoke | coiling ribbons, spraying arcs, hovering droplets, slow DOWNWARD drip |
| shapes | jagged, explosive, upward, sharp | tendrils, ribbons, spheres, coiling curves |

## Assembler usage (how the image clause is built)

The deterministic assembler (`portraitAssembler.ts`) builds the element clause. Budget is ~1450 chars total for the whole portrait prompt, so the element clause is tight. Include in priority order until budget runs out: **materials → lighting → motion → (textures/shapes) → primaryColors**. Historically it used only colors+motion+lighting+atmosphere (materials/textures/shapes dropped) — the root cause of "every element looks the same."

## Rare elements needing rework

These 9 are classed Rare and their visuals "look terrible" — they need the same distinctiveness treatment as a priority: **Metal, Dream, Psychic, Cosmic, Time, Holy, Void, Spirit, Poison.**

---

## Element differentiation matrix (art-prompt-director, 2026-07-22)

`Element → material | texture | motion-axis` — zero-overlap signatures. Rewrite each element's `materials`/`textures`/`motion` from its line; keep `lighting`/`shapes` consistent with the axis.

- **Fire** → magma/charred obsidian | cracked char over glowing veins | rising, radiant-dry
- **Blood** → arterial blood/red iron | glossy wet syrup-drips | dripping, coiling-wet
- **Water** → ocean/glass/coral | rippled translucent sheen | flowing-lateral, splashing
- **Ice** → frost/crystal/snow | faceted frost-fracture | crystallizing-outward, still
- **Storm** → cloud/rain/lightning | swirling arc-and-streak | spiraling-chaotic, forking-down
- **Earth** → granite/fossil/gem | chunky mineral-vein pits | heaving-up, tremor
- **Nature** → bark/vine/sap/fungus | fibrous leaf-and-grain | growing-branching, unfurling
- **Beast** → fur/tooth/hide/bone | matted fur, wet sinew | crouched-spring, lashing
- **Metal** → forged steel/chains/gears | brushed hammer-marks, engraving | rotating-rigid, sparking
- **Poison** → venom/oil/corroded rot | oil-slick miasma drip | seeping-downward, creeping
- **Spirit** → ectoplasm/veil-cloth | translucent mist-drift | rising-wisps, drifting
- **Shadow** → smoke/ink/obsidian | velvet ink-smoke | tendril-crawling, low-drift
- **Light** → sunbeam/prism-crystal | hard beam-and-ray refraction | radiating-beams, sunburst
- **Sound** → resonance-rings/brass/drum-skin | concentric ripple, vibration-blur | shockwave-outward, pulsing
- **Ash** → ash/spent-coal/burnt-bone | dry cinder-flake, soot-smear | falling-flake, slow-drift
- **Holy** → living-light/gold-leaf/feather | soft feathery gold-glow | halo-burning, descending-shafts
- **Void** → antimatter-shear/torn-reality | non-euclidean warp-fracture | light-eaten-inward, gravity-collapse
- **Time** → sand/hourglass-glass/brass | suspended sand-grain, film-grain | mid-fall-frozen, blur-unspooling
- **Cosmic** → stardust/nebula-gas/meteorite | starfield shimmer, gravity-warp | orbiting-swirl, spiraling
- **Tech** → alloy-panel/fiber-optic/circuitry | hard-edge circuit-line, hologram | projecting-geometric, scanning
- **Psychic** → thought-lattice/floating-objects | prismatic aura-shift ripple | orbiting-levitation, telekinetic-pulse
- **Moon** → moonstone/silver/still-water | soft pearlescent luminance | tidal-pull, calm-still-glow
- **Dream** → dream-fog/memory-ribbon/butterfly | hazy iridescent soft-focus | dissolving-drift, symbol-float
- **Wind** → moving-air/silk-wisp | translucent ribbon-current | curling-gust, lifting-upward
- **Infernal** → obsidian-plate/brimstone/molten-veins | matte-black lava-fissure cracks | contained-cinder-curl, bleeding-up-through-cracks

## Phoenix gotchas (observed)

- **Overuses:** warm ember/orange floodlight on ANY glowing element; "glowing blob" when only color is specified; symmetrical orb-per-fist.
- **Ignores:** `shapes` when late in the prompt (truncated) — put silhouette-critical shapes into the `motion` phrasing. Honors `primaryColors` reliably but `secondary`/`accent` weakly.
- **Wins:** concrete material nouns early = distinct substance; wet-vs-dry sells almost entirely through **texture + lighting** ("wet specular" vs "cracked char"), not color.

## Phoenix gotchas — story-choice visual payloads (art-prompt-director, 2026-07-22)

From formalizing the Lycan pack-role `image` payloads (general, not Lycan-only):
- **Retinue face-cloning:** Phoenix copies the hero's face onto companions/pack. Keep them background/lower-third and phrase as a group ("kin-canines", "ranked formation"), never as portraits.
- **Prop-eats-hero:** big props (cauldron, boundary-stones, memory-cords) will dominate the frame. Keep the hero foreground, props mid-ground.
- **Concealment cropping:** "half in shadow / hooded" makes Phoenix eat the face. Cap concealment at hood + partial-shadow; always keep one eye lit.
- **Abstract-relationship risk:** "defers to an implied leader" renders as nothing. Anchor social staging with a concrete rank prop + a deliberately empty lead-space.
- **Feral-read leak (morphology archetypes):** "glowing eyes / predatory crouch" can flip a Foundation card to full-beast. Pin intensity as *eyeshine + posture*, NEVER snout/fur — and keep the no-wings/no-horns negatives on.

## Open issue — tech-rare family under-differentiated (2026-07-22)

Validated Plasma/Nanite/Quantum on a Mech Pilot (Forged). Archetype rendered great (human pilot + war-mech). BUT the 3 elements came back nearly interchangeable — Phoenix defaulted all three to generic **energy-blue streaks**. The distinguishing hooks did NOT land: Plasma's **magnetic containment rings / caged sphere**, Quantum's **double-exposure phase-ghosting + fractured reality**, Nanite's **reforming silver machine-swarm**. FIX before ship: push each far off "blue energy" — Plasma = contained rings + white-hot core (not free bolts); Quantum = literal doubled/ghosted silhouette + glitch-shatter (make the FIGURE phase, not the background); Nanite = a granular silver swarm visibly assembling plates (chrome dust, not a glow). Same lesson as Fire≠Blood: differentiate on **materials + motion + texture**, never color alone. art-prompt-director to re-tune.

## Archetype-specific element MANIFESTATION (the "vessel", 2026-07-22)

**Big lesson:** the element must manifest through the archetype's VESSEL, not as a generic aura. `portraitAssembler.ts` → `elementVessel()`: **Mech Pilot** = the MECH wields it as weaponry (cannons/blades firing FROM the mech, not a glow on the pilot); **Beastmaster** = the summoned ANIMAL is made of it; everyone else = radiates from the body. Adding this + sharper language took a Mech's Plasma from "chest glows" to a caged plasma-sphere the mech clearly wields. Any future "X wields/summons the element" archetype needs a vessel case here.

Validation round 2 (Mech Pilot × tech elements, post-fix):
- **Plasma → WORKS.** Caged plasma-sphere in visible magnetic containment rings + mech cannons. "contained in rings / caged sphere / cannon" language + the vessel fix nailed it. Distinct from generic energy.
- **Nanite → FIXED (round 3).** Two changes worked: (1) reworded to "a SWARM of MANY small and MEDIUM robots" — Phoenix renders ~10-12 small/medium drones well; "thousands of tiny robots" it will NOT do. (2) The Mech mandatory-mech hook has a **Nanite exception** (no big mech — the swarm IS the machine presence), else the hook forces a gundam even for Nanite. LESSON: when an element replaces the archetype's usual vessel, the archetype hook needs an element exception, not just element language.
- **Quantum → REMOVED** (Raheem): too close to Storm/Lightning (both blue energy). Deleted from the element set. Lesson: an element defined by "energy/glitch" collapses into the existing energy elements on Phoenix — differentiate on MATERIAL/FORM, not energy-type.

## Clothing / armor gotchas (art-prompt-director + validation, 2026-07-23)

- **List-averaging:** >4 clothing items = generic outfit; Phoenix renders the first 1–2 nouns and mushes the rest. ONE dominant silhouette form, early. (Structural fix: `silhouette` field on fashion variants, placed first.)
- **Coverage needs a NOUN:** "chest fully covered" (abstract) lost to Phoenix's shirtless prior 3-for-3 on muscular/heroic men. Fix that WORKED into the assembler: the cue names the actual closed garment — `torso FULLY CLOTHED in {primaryGarment} closed to the collar`.
- **Small nouns vanish:** rings, pouches, clasps almost never render — spend budget on silhouette-scale items only.
- **Fabric motion is free wow:** "streaming / cascading / floor-length" reliably renders; "layered" alone does not.
- **"Ornate/ceremonial" without a noun → gold-trim spam.** Name the ornament (relief-carved gorget, winged pauldron).
- **Rank escalation = deepen, never swap:** more layer-COUNT renders worse; the same silhouette ceremonializing (one earned statement piece at Forged, full-scale regalia at Ascendant) renders grander.
- **Budget interaction:** every added prompt clause evicts the LAST segment (BACKGROUND died when the chest cue grew). After any clause change, check what fell off the end.
- **Twilight/split-palette OPEN ISSUE:** a half-gold/half-obsidian SPLIT figure loses to the element scene-palette flooding the frame (Light washed out the dark half entirely). A split path likely needs to OVERRIDE the element palette clause itself, not just describe split regalia. Unresolved.

## Male-chest coverage — the closed-undergarment-first rule (VALIDATED 2026-07-23)

Barbarian tradition validation (8 gens + 3 confirm) nailed the exact mechanic behind the recurring shirtless-male failure:

- **Symptom:** a barbarian MALE renders a bare muscular chest + six-pack abs under a shoulder-collar/mantle, even with the "torso FULLY CLOTHED" cue AND every anti-shirtless negative. FEMALE rolls of the same tradition render fully clothed — so the culprit is Phoenix's *male-barbarian* prior specifically.
- **Root cause:** whether the chest covers is decided by the FIRST garment noun in the silhouette. Lead with a **full cuirass/closed tunic** (Sand-City: "a closed sand-linen tunic … plate over it") → torso covers. Lead with a **collar / mantle / scale-at-the-throat / hide** (Glacier scale-collar, Canopy jade collar) → Phoenix reads it as sitting on a bare chest.
- **THE FIX (confirmed 3/3):** every silhouette must **lead with an explicit closed full-torso undergarment** — `a closed [material] tunic covering the whole chest and stomach to the collarbone` — and place the statement armor/collar as `... buckled OVER it`. Add `NEVER a bare chest` inside the same clause. After the fix, all three previously-shirtless males rendered fully clothed.
- **Trade-off to watch:** making the closed tunic dominant can MUTE a culture's statement piece (Canopy lost feather/jade pop). Keep the covered tunic first for coverage, but keep the statement piece vivid and scaled right after it.
- **Round-shield / horned-helm drift:** the barbarian prior spawns a runic round Viking shield unprompted. Plain negatives ("Viking") don't catch it; the specific `round wooden Viking shield`, `runic round shield`, `horned helmet` negatives do.

## Rendering a no-element archetype element-less — VALIDATED fix (Human, 2026-07-23)

Making Human render with the element spectacle DISABLED (a gaslamp-steampunk tone instead) was a decisive win — Artificer & Field-Medic rendered as gorgeous brass/copper/gaslamp old-school fantasy steampunk, fully clothed, zero sci-fi/teal/arcane. Implementation (`portraitAssembler.ts`, `isElementless(archetype)` gate on a `ELEMENTLESS_ARCHETYPES` set):
- Branch `buildElementScenePalette` / `buildElementPrefix` / `buildWeaponClause` + the reserved tail to no-magic variants.
- CRITICAL refinement: the elementless SCENE clause must set the render **TONE only** (no-magic, brass/gaslight palette) and must NOT dictate a **SETTING** — the first version said "the character's machines FILL THE SCENE" and wrongly turned the Infiltrator and Pacifist into workshop tinkerers, overriding their coupled environments. Let `buildBackgroundClause` (the coupled env) supply the place.
- The negatives must DROP "no magic / no visible power" (those FORCE magic onto a no-element class) and ADD hard bans: `glowing energy, arcane aura, energy weapon, neon glow, holographic HUD, digital matrix, sci-fi power armor, superhero spandex`.
- Weapon pool is archetype-level, so it hands melee weapons to callings that shouldn't have them — suppress it per-calling for the unarmed Pacifist (done) and, still TODO, make it **calling-aware** (Marksman=rifle, Infiltrator=silenced tools, Scholar/Medic=none). The Infiltrator kept getting a mace + round shield.
- The Infiltrator "camo blends into the background" effect CANNOT come from a fashion string alone (fashion-string-only rendered a generic hooded figure). SOLVED 2026-07-23 by making the SCENE ITSELF a camo field: a dedicated high-priority `buildInfiltratorCamoScene` describing a mottled foliage thicket + a full ghillie suit patterned to match it + "DISAPPEARING into it, only the eyes readable", the coupled env swapped to a foliage thicket, and the pooled melee weapon suppressed. Result: a convincing ghillie-suited operative dissolving into the woodland. Lesson: for a "blend into the background" effect, put the camouflage in the SCENE (highest-priority segment), not just the costume.

## The element palette SMOTHERS a no-element archetype (Human, 2026-07-23)

Validating the Human TECH-Inventor reframe with `resolvedElement: 'Tech'` proved the element-scene palette is loud enough to erase an archetype's whole identity:

- All 4 Human Callings (brass Artificer, unarmed Pacifist, camo Infiltrator, tech Field-Medic) rendered as near-identical **teal digital-matrix sci-fi soldiers**. The steampunk brass/canvas/gear nouns, the "unarmed", and the coupled Calling backgrounds (foundry, sanctuary) were all overwritten by the Tech element spectacle.
- Coverage (closed-undergarment rule) and the gender fix STILL held through the flood — those are robust. But the vocation identity did not survive.
- **Rule:** a no-element archetype MUST render with the element-scene/palette injection DISABLED (a neutral brass/canvas material palette instead), or an element proxy will hijack it. For Human specifically the old element slot becomes the **Craft-discipline tint** (Steamworks/Clockwork/Chemworks/Automata/Munitions — see the plan), which must occupy that slot WITHOUT the arcane-VFX/scene-flood behavior.
- Corollary for the Infiltrator background-blend: a loud element spectacle also kills stealth (it drew glowing rings around a "ghost"). The blend needs BOTH no-element AND the deferred assembler hook that injects the actual environment surface into the camo clause.

## PAINTERLY, GAME-WIDE — no photoreal anywhere (Raheem, 2026-07-23)

The whole game is painterly hand-painted fantasy card art. The old **Druid-photoreal exception is RETIRED** — Raheem: "This is a fantasy card game. I want fantasy art." Enforcement in `portraitAssembler.ts`: `styleLeadFor` returns the painterly `COMPACT_STYLE_LEAD` for every archetype, and `PAINTERLY_NEGATIVES` (photorealistic/photograph/3D render/CGI/octane…) is reserved in the negative lead for all. Keep the positive style lead ~125 chars — a longer lead blew the prompt budget and evicted the wardrobe + background segments (budget-interaction rule).

## Where the per-class image rules live (audit map, 2026-07-23)

To avoid hidden-rule landmines (like the Druid-photoreal surprise), the per-archetype/element rules that silently shape a render live in exactly these spots — check them before new image work:
- **`portrait/archetypeHooks.ts`** — Vampire feral-Foundation pose (~⅓ random), Lycan Ascendant anatomy lock, Seraph three-path anchor, Mech mandatory-mech (+Nanite swarm exception), Android identity anchors.
- **`portraitAssembler.ts` `is*` scene gates** — `isElementless` (Human steampunk), `isHumanInfiltrator` (camo scene), `isMonkAllFourAscendant` (elemental chaos), `isMonkPeaceCosmic` (serene Buddha); `elementVessel` (Mech wields / Beastmaster animal / default radiates); `FIRE_FAMILY_ELEMENTS` (skip anti-warm-glow — Fire/Blood/Holy; `Ash` removed as stale); per-archetype `archetypeBans` (Vampire daylight, Monk no-wings/no-superhero); Human `HUMAN_CALLING_WEAPON` + Pacifist unarmed.
- **`portrait/characterSheetFactory.ts`** — Beastmaster companion ALWAYS present; bare-chest forced false (retired); tradition-coupling (Barbarian/Human/Monk).
- **`data/elementVisualLanguage.ts`** — per-element palette/materials; **Cosmic is Monk-exclusive**.

## Monk cosmic-Buddha + all-four (VALIDATED 2026-07-23)

- **Peace cosmic culmination** kept rendering a muscular caped SUPERHERO (the Dr-Strange trap) from the plain cosmic palette + Ascendant power language. FIX = a dedicated high-priority scene override (`buildMonkPeaceCosmicScene`) forcing a serene robed FANTASY-BUDDHA in lotus meditation + mala + third-eye + galaxy-disc nimbus, plus negatives (superhero/bodysuit/cape/chiseled/power-stance). Result: a perfect serene cosmic Buddha. Lesson: a flagship figure that fights a strong prior needs the figure forced in the SCENE clause (highest priority), not just the fashion.
- **All-four = elemental CHAOS, not a mandala** (Raheem). A tidy quadrant layout felt wrong; the winning render is the four elements raging as a churning maelstrom around a calm monk at the eye. Wind stays the weakest element to render (perennial) — fire/water/earth carry it.

## Weapon-in-hand / no-clip fix + the 1000-char negative limit (2026-07-23)

- **Weapons missing the hand or spearing through the body** (Raheem): fixed with `WEAPON_ANATOMY_NEGATIVES` ("weapon clipping through the body, floating weapon, weapon missing the hand") added to the negative lead ONLY when the card renders a weapon (`hasWeapon(sheet)`). Validated 3/3 across varied bodies — every weapon gripped cleanly, no clipping. The positive prompt body is already at the 1450 API cap, so a positive grip cue would evict the BACKGROUND segment — the fix HAS to be negative-side.
- **HARD LIMIT — Leonardo rejects a `negative_prompt` over 1000 chars** ("Invalid negative_prompt, maximum length of 1000 characters exceeded"). `ASSEMBLER_NEGATIVE_MAX` must stay at 1000; the final `truncateToLimit(..., 1000)` guarantees it. Do NOT raise it. When adding negatives, keep them lean and put non-negotiable anatomy/modesty count-guards (`extra limbs, extra fingers`, `nudity`) in the RESERVED `CRITICAL_NEGATIVES` lead so base-fill truncation can't drop them.
- **Prompt body cap is 1450** (`PORTRAIT_PROMPT_MAX`); the negative cap is 1000. Different limits — don't conflate.

## Vampire form-family — regal vs radical wiring (VALIDATED 2026-07-23)

Wired the 8 element-gated Vampire forms live (element gates the pair; a stable identity-seeded coin-flip picks within it; Forged=manifesting, Ascendant=full). Key lesson on WHERE to inject a form:
- **Regal forms that AGREE with the handsome-vampire prior** (Blood-Sovereign winged, Crimson-Knight, Gothic-Sovereign, Court-Decadent) render great as a **pose-action** string (`buildPosePrefix`, low priority). Blood + Nocturne validated first try.
- **Radical forms that FIGHT the prior** (Shadow → Nosferatu gaunt-horror / Mist-Swarm; Void → Hollow-Sovereign absence / Star-Eater cosmic-maw) LOSE as a pose-action — the first pass rendered handsome winged counts instead. FIX: a high-priority **SCENE override** (`buildVampireRadicalScene`, gated on element ∈ {Shadow, Void}) that owns the frame + explicitly negates the count ("a MONSTER, NOT a handsome count" / "NOT a solid person"). Re-gen: Nosferatu, Hollow-Sovereign, and Star-Eater all rendered distinctly.
- Same rule as Monk/Seraph: **a form that fights a strong Phoenix prior must own the SCENE clause, not a lower segment.** Forms that agree with the prior can ride the cheaper pose-action path.
- Void "pure absence" is inherently hard (Phoenix wants a person) — it lands as a crowned void-king / cosmic-horror rather than a literal empty cloak. Acceptable; distinct from the other forms.

## Druid plant-form family — element-gated scene (VALIDATED 2026-07-23)

Wired the 8 good + 3 corrupted plant-forms live as a SCENE override (`buildDruidFormScene`, all ranks, Foundation subtle → Ascendant full). Element-gated: Poison = the corrupted set (incl. the special Blood+Nature **Bloodmaw**, whose palette bleeds green→crimson across rank), everything else = the good set; a stable identity-seed picks the form.
- **Bloodmaw nailed it** first try (green plant-body gorged and bleeding crimson sap).
- **Antlers drift hard onto Druids** — 2 of 4 first-pass renders sprouted deer-antlers. Added `antlers, deer antlers, horns, wings` to the Druid negative branch.
- **Corrupted forms lost to the healthy-green-druid prior** (Cordyceps rendered a handsome tree-druid). Fix: forceful sickly/hollowed/parasitic language + explicit "NOT a healthy green nature-druid." Re-gen: a gaunt cordyceps-puppeted horror.
- **Male plant-torsos render with visible abs** (bare-plant-flesh). Strengthened the scene coverage ("whole torso FULLY COVERED in plant-matter, NO exposed abs/pecs") — improved but not perfect; a green plant-*creature* torso is a softer call than human nudity.

## Necromancer non-human forms — must own the scene + carry the element (2026-07-23)

Necromancer forms are NON-HUMAN beings MADE OF bone or shadow (Raheem: "Death Knight is made of bone, Lich is made of bone — not the clothing; they sacrifice souls to become MORE than human; Shadow Wraith should also not be human"). Seed-picked (Death Knight / Skeleton Mage / Shadow Wraith / Lich).
- **Pose-action was TOO WEAK** — it rendered living humans with bone/element motifs (living face, human body). The undead/bone transformation fights the living-human identity block and LOSES from a low segment.
- **FIX: a SCENE override** (`buildNecromancerFormScene`) that owns the frame and forces the non-human bone/shadow being ("the being ITSELF is bone", "NOT a human in armor"). Re-gen: full skeletons + a shadow-skull wraith + a crowned skeleton lich (with the character's hair still on the skull — identity preserved). Same rule as radical Vampire/Druid forms.
- **The scene MUST still carry the element** — Necromancer's `makeSheet` default drives the element-dominance tests, and soul-light IS element-tinted. So the scene includes the `${power}` phrase (RESTRAINED/ESCALATING/OVERWHELMING POWER) + `${el} colours ${primaryColors}`. Keep it COMPACT (~240 chars) or it evicts the BACKGROUND segment (1450 prompt budget). Painterly (style lead), no-bare-chest (negatives) and body-preservation (identity block) don't need repeating in the scene.
- **Ancestry variety is a TEST-HARNESS rule, not a pipeline bug** — the live pipeline enforces skin-tone variety ("Pick from FULL range, do NOT bias to light-to-medium"). All-one-ancestry validation batches = hardcoded `skinTone` in the gen script. Vary skin/hair/ancestry + body + sex + age per case (see memory `feedback_validation_varied_bodies`).

## Beastmaster beast-form family — the FORM is the summoned beast, not the human (VALIDATED 2026-07-23)

Beastmaster is the inverse of Vampire/Druid/Necromancer: the character stays fully HUMAN — the "form" is the SUMMONED BEAST, an apex creature whose entire body is COMPOSED OF the element (not a normal animal with a colored glow). Species curated per Beastmaster element (`BEASTMASTER_BEASTS`: Beast / Earth / Wind / Water / Spirit / Ice), seed-picked so a set varies.
- **Owns the SCENE** (`buildBeastmasterScene`) because "an animal literally MADE of water/spirit/ice" fights Phoenix's "normal animal + tint" prior. The scene forces "the beast's ENTIRE BODY is COMPOSED OF ${el} … NOT a normal animal with a glow, the animal IS ${el}". Carries the `${power}` phrase + `${el} colours` so the palette/rank contract holds; ~300 chars keeps BACKGROUND in budget.
- **Rank scaling is size + NUMBER of beasts:** Foundation = one beast prowling at their side; Forged = a huge beast looming; Ascendant = a COLOSSAL apex beast + a whole PACK/HERD massing behind. Validated: Ascendant spirit-owl came with a full menagerie behind; Ascendant storm-raptor came with a flock + warband.
- **Materials are the distinctiveness lever** (same as elements): Earth→cracked-granite rhino hide, Ice→glacier-ice antlers + ice-crystal fur, Spirit→translucent soul-light owl, Water→whitewater body. The species noun (rhino/elk/owl/serpent) + the element material together read unmistakably. Beast element correctly stays raw flesh-and-fur megafauna (Beast IS the animal).
- `elementVessel(Beastmaster)` (the short "the summoned beast IS ${element}" line in `buildElementPrefix`) is kept as compatible reinforcement — the SCENE is the authoritative species/count descriptor.
- Validated 6/6 across all elements with a different person each (Black woman / red-beard white man / ash-blonde woman / East Asian elder / South Asian woman / brown-black man): weapon in hand, painterly, element-embodied beast, ancestry+body all distinct.

## Druid: break human form as a PLANT-BEING in REGALIA (VALIDATED 2026-07-24)

Raheem wanted Druids to genuinely BREAK human form (they were capped as "a person coated in leaves" while Necromancer/Beastmaster got full non-human payoffs). Final design, two lanes, both element-gated as before (Nature/Earth/Water/Spirit good, Poison corrupted):
- **Humanoid lane** (tree-being, antlered flower-druid, moss, bramble, water-plant, succulent + the corrupted cordyceps/carrion/bloodmaw): at Ascendant the body is a **PLANT-BEING of bark/wood/moss/vine — NO human skin** — but **DRESSED IN a closed-front druidic robe/regalia** covering chest+torso+midriff. This "meet in the middle" (Raheem) is the fix: "made entirely of plant-matter" ALONE renders a bare plant-skin torso; regalia ALONE loses the plant-being look. Both together = the beloved antlered-flower-druid / gaunt-cordyceps look, clothed. Validated: female flower-druid (closed gown) and male tree-being (closed robe) both fully covered; the gaunt **cordyceps resists central-chest closure** (its emaciated torso IS the horror silhouette) — lands as woody plant-flesh (no human skin), sexless, acceptable for a monster.
- **Creature lane = BEAR ONLY.** Full-beast wildshape must be a **dense-fur mammal** — the bear covers reliably. Every non-bear beast (wolf, stag, raptor) Phoenix renders as an **upright bare-torso were-creature** that NO coverage cue beats — all three dropped. The antlered-majesty desire is served by the humanoid antlered flower-druid instead.
- **Antler/wing ban is rank-conditional**: banned at Foundation/Forged (where the deer-druid / angel cliché drifted in), LIFTED at Ascendant so the flower-druid/tree-being can grow branch-antlers.
- **Robes are the modesty base at every tier** and match the live DRUID fashion (bark-fiber robe, moss-lined tunic, mantle, cloak). Lower tiers = a robed druid with partial overgrowth (human at Foundation → half at Forged), so they never drift into a shirtless were-beast. Gen-test fashion MUST use the real robed druid variant, not skimpy leaf-wraps (a skimpy test wardrobe was half the bare-torso problem).

## Lycanthrope: Guardians of the Moon Goddess — role × moon-phase × rank-to-full-wolf (VALIDATED 2026-07-24)

Bible-anchored (guardians NOT cursed monsters; identityThrough Duality; role inferable; "not only an animal"). Three levers in `buildLycanScene`:
- **Pack ROLE** (seed-picked via `formSeed`): Hunter / Moonkeeper-Healer / Scout / Lorekeeper / Guardian / Warden — each with visible role tools/emblem (spear, herb-satchel, horn, story-staff, shield, boundary-stakes). Keeps the Bible's "role inferable" true even in wolf-form.
- **MOON PHASE** (rolled via a SECOND seed `moonPhaseSeed`, salted off sex+hair+age so it decorrelates from role): sets WHERE the FOUNDATION card starts on the human→wolf journey (new=human tells → full=already a full wolf at Foundation). Raheem's rule.
- **RANK → full wolf**: ALL Lycans END in full wolf-form by Ascendant (level 4). `level = Ascendant?4 : min(4, moonStart + (Forged?2:0))`. Reconciles with the Bible's "rank ≠ size/muscle/dominance" by framing the Ascendant wolf as a **noble Guardian / lunar apotheosis**, not a brute, and by scaling **pack presence** (leads a pack at Ascendant) = authority, not brute size.
- **MODESTY — the werewolf exception (Raheem):** clothes TEAR on transformation, so a **bare muscular were-torso with TORN CLOTHING remnants is DESIRED** on the shifted forms (levels 2–4) — do NOT ban it (unlike every other archetype). Human/partial forms (0–1) stay CLOTHED (not yet torn). So the Lycan `archetypeBans` only keeps it a FURRED werewolf (not a nude human) + drops the rabid-monster read; it does NOT add the bare-chest/midriff bans the Druid needed. This is the ONE archetype where the bare were-torso is on-brand.
- **Element = STRIKING lunar manifestation** (Raheem): a great moon dominates every card; Moon=silver glow, Lunar (exclusive)=BLAZING silver-fire corona, Blood=blood-moon crimson, Beast=primal amber, Shadow=umbral night. Pulled from `ELEMENT_VISUAL_LANGUAGE`.
- Full form renders as a bipedal werewolf (weapon-holding) OR a great four-legged wolf (both validated, both loved). Quadruped is naturally the most modest; bipedal gets the torn-clothes look.

## Learnings log (append-only, newest last)

- **2026-07-22** — Established this playbook. Diagnosed root cause of same-y elements: assembler dropped materials/textures/shapes; `theme`/`symbolism` (emotional) were leaking into the Claude prompt. Direction: enrich the assembler with materials/textures/shapes, rework each element's fields for zero-overlap, keep emotional fields on the lore side only.
- **2026-07-22** — APPLIED: `buildElementPrefix`/`buildElementScenePalette` now lead with `materials` + `textures` (order materials→textures→motion→lighting→colors). Reworked Fire/Blood/Water/Void content (Blood sharpened to wet/dripping/DOWNWARD to split from Fire's dry/rising). Remaining 21 elements to rewrite from the matrix above (not yet applied).
- **2026-07-22 — VALIDATED in Leonardo (Phoenix 1.0, 768², same Vampire × Fire/Blood/Water).** RESULT: Fire = dry rising flame; Blood = wet crimson (blood-slick blade, spatter, blood-tear, red mist) — clearly distinct from Fire despite identical red family; Water = teal crashing waves. The materials+textures enrichment fixes the Fire≈Blood failure. Identity held across all three (same face/hair/coat/rapier). Confirms: **concrete material nouns + wet-vs-dry texture/lighting are what separate same-color elements** — color alone did not. Proceed with the 21 remaining elements from the matrix.
- **2026-07-22 — Element rework COMPLETE.** Audit found most elements were already richly distinct from a prior "extrapolated elements" pass (Wind/Storm/Beast/Nature/Poison/Spirit/Light/Sound/Ash/Holy/Time/Cosmic/Tech/Psychic/Moon/Dream/Infernal). Only 4 "Bible-verbatim" elements were still generic — **Earth, Ice, Shadow, Metal** — now reworked to matrix quality (Ice→faceted/crystallizing-outward, Shadow→velvet ink-smoke/light-drinking, Metal→bladed/whirling, Earth→adopted Stone's chunky-plate content ahead of the merge). Lightning/Stone left untouched (merging into Storm/Earth). Whole element set now consistent.
