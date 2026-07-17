# Task: Add a Reusable Archetype-Emblem Skill to the New `create-archetype` Workflow

## Current project state — read this first

This task will be run **immediately after the currently pending `create-archetype` skill implementation is completed**.

Treat the following as settled project state:

- The **Lycan archetype has already been implemented, reviewed, and approved**.
- Do not redesign, reimplement, roll back, or otherwise modify the Lycan class as part of this task.
- The new `.claude/skills/create-archetype/SKILL.md` is being created by the task immediately before this one.
- When this task begins, treat that newly implemented skill and its supporting edits as the current source of truth, even if the changes are still only in the local working tree and have not yet been pushed.
- Do not replace the new `create-archetype` skill with an older plan or recreate it from scratch.
- Extend and integrate with the version that now exists.
- If the prior `create-archetype` implementation is genuinely absent or incomplete when this task starts, stop and report the dependency instead of creating a competing implementation.

The approved direction is:

> `create-archetype` is the orchestrator. A dedicated `design-archetype-emblem` skill handles selection-emblem design and can also be called independently for revisions to existing archetypes.

The purpose of this task is to teach Claude how to produce a strong, lore-consistent **first emblem concept and Leonardo prompt automatically**, so Raheem should normally need to revise the generated result rather than manually design the emblem from zero.

---

## 1. Inspect the live workspace

Before editing anything, read the current versions of:

- `CLAUDE.md`
- `STUDIO_CHARTER.md`
- `WORKFLOW.md`
- `.claude/agents/art-prompt-director.md`
- `.claude/skills/create-archetype/SKILL.md`
- `.claude/skills/art-pipeline/SKILL.md`
- `.claude/skills/sync-project-knowledge/SKILL.md`
- `card-engine-archetype-prompt-library.md`
- Any newly created archetype-planning or archetype-registry documents
- `card-engine/src/data/archetypes.ts`
- `card-engine/src/types/card.ts`
- `card-engine/src/components/ArchetypeSelector.tsx`
- The prior task's implementation report, if one was produced
- The ten supplied approved archetype-emblem images

Also inspect the working tree before editing. The prior task may have valid uncommitted changes. Preserve them.

Do not assume the ZIP snapshot is newer than the live workspace. The live workspace after the preceding `create-archetype` task is authoritative.

---

## 2. Architecture decision

Create a dedicated reusable skill at:

`.claude/skills/design-archetype-emblem/SKILL.md`

Update the newly implemented `create-archetype` skill so it invokes `design-archetype-emblem` as the emblem-design phase.

Do not duplicate the full emblem workflow inside `create-archetype`. The dedicated skill must remain independently callable because:

1. An existing archetype may need an emblem revision without creating a new archetype.
2. Selection emblems are a different asset type from full character portraits.
3. The emblem workflow has its own lore analysis, prompt constraints, image-review loop, and approval status.
4. The process has now been validated across ten approved emblems.

Do not create a new specialist agent.

Expand the existing `art-prompt-director` only as needed so it can advise on:

- Full character portrait DNA
- Archetype-selection emblem direction
- Leonardo prompt construction
- Set-wide visual consistency
- Targeted image-edit prompts

Keep `.claude/skills/art-pipeline/` focused on character portraits, rank evolution, and portrait continuity. Do not merge selection-emblem generation into that skill.

---

## 3. First-pass autonomy rule

This is the most important behavioral change.

When `create-archetype` reaches the emblem phase, Claude should normally create **one strong recommended emblem direction and one paste-ready Leonardo prompt without first asking Raheem to design the symbol**.

Claude should derive the first pass from:

- The approved lore identity
- Cultural values and origin
- The archetype's established visual DNA
- Existing portrait palette
- A separately proposed emblem palette when needed
- Any reference images Raheem supplied
- The silhouettes and materials already used by the approved emblem set
- The need for visual distinction at thumbnail size

The first pass should be decisive, not a menu of vague possibilities.

Default behavior:

1. State the recommended primary symbol in one sentence.
2. Briefly explain why it fits the lore.
3. Produce one Leonardo-ready prompt under the character limit.
4. Tell Raheem which generation mode to use.
5. Wait for the generated image.
6. Revise through targeted edits whenever most of the image is already successful.

Do **not** require a pre-generation approval gate for the primary symbol unless one of these conditions exists:

- The lore is materially incomplete or contradictory.
- The requested imagery risks copying a real franchise or protected logo.
- The design would rely on a real-world religious, political, military, or occult symbol that requires clarification.
- Two approved project rules directly conflict.
- Raheem explicitly asks to review concepts before a prompt is written.

The goal is a credible first image that needs refinement—not a long questionnaire before any visual progress happens.

Human visual approval is still required after the first generated result and before the asset is marked final.

---

## 4. Create the canonical emblem library

Create:

`card-engine-archetype-emblem-library.md`

This becomes the source of truth for card-forging archetype-selection emblems.

Do not merge it into `card-engine-archetype-prompt-library.md`. That existing library governs full-body character portraits; the new library governs selection emblems. These systems must remain separate.

The emblem library must contain:

1. Purpose and scope
2. Shared visual-system rules
3. Lore-first design method
4. First-pass autonomy rule
5. Leonardo prompt-construction rules
6. New-generation workflow
7. Full-regeneration workflow
8. Targeted-edit workflow
9. Approval and asset-status rules
10. Approved emblem benchmark specifications
11. Approved-asset manifest
12. Set-wide distinctness matrix or checklist
13. Template for future archetypes
14. Revision-history guidance
15. Lycan's current emblem status

### Lycan handling

Lycan is now an approved implemented archetype.

During inspection:

- If an approved Lycan emblem already exists, index it without redesigning it.
- If only a draft exists, record its real status accurately.
- If no Lycan emblem exists, mark the emblem status as `missing` or `not yet approved`.
- Do not automatically create or integrate a Lycan emblem in this task unless Raheem separately requests it.
- Do not alter Lycan gameplay, lore, stats, resource logic, portrait DNA, or implementation code.

The original ten supplied images form the approved benchmark set even though the game now contains Lycan as an additional archetype.

---

## 5. Organize the approved images

The ten supplied images are approved assets and visual references, not loose inspiration.

Inspect each image and map it to the correct archetype before moving or copying anything.

Use or propose this structure:

`Card Images/Archetype Emblems/Approved/`

Standardized filenames:

- `barbarian.jpg`
- `monk.jpg`
- `beastmaster.jpg`
- `druid.jpg`
- `necromancer.jpg`
- `vampire.jpg`
- `mech-pilot.jpg`
- `android.jpg` or `android.png`, preserving the source format when appropriate
- `human.jpg`
- `seraph.jpg`

Requirements:

- Preserve the original uploaded files.
- Do not overwrite or delete originals.
- Do not recompress an approved image merely to force a file extension.
- Prefer standardized copies or aliases while retaining source quality.
- Record source filename, standardized path, archetype, approval status, and approval date if known.
- If metadata is unknown, mark it unknown rather than inventing it.

Do not integrate the images into `ArchetypeSelector.tsx` during this task unless the prior `create-archetype` implementation explicitly created an approved, separate integration step and Raheem has authorized it. Skill creation and asset documentation are the current scope.

---

## 6. Core design principle: lore, not mechanics

An archetype emblem appears during the first stage of card forging. It should communicate:

> Who this group is, what it values, and what visual culture belongs to it.

It should not attempt to explain combat mechanics.

Gameplay identity, stat affinity, resource costs, card effects, and combat behavior are not default inputs to emblem design. They may influence the emblem only when Raheem explicitly makes them part of the lore or visual request.

The emblem must remain separate from the full-body portrait prompt system.

---

## 7. Shared visual system

Every emblem should generally use:

- Square 1:1 composition
- One unified centered emblem
- Front-facing presentation
- Approximately 75% image coverage
- Clear negative space
- Strong readability at roughly 64–128 pixels
- Premium fantasy, dark-fantasy, fantasy-tech, or grounded-medieval materials as appropriate
- Deep relief, engraving, carving, inlay, stitching, or dimensional construction
- Controlled dramatic lighting
- An archetype-specific gradient background
- One primary symbol with supporting lore motifs
- No embedded card frame or application UI

The set must feel related without making every emblem the same shape.

Do not default every archetype to:

- A shield
- A circular medallion
- A weapon
- A floating animal head
- A generic class logo

Each emblem needs a distinct:

- Outer silhouette
- Primary symbol
- Material language
- Construction method
- Accent palette
- Cultural craftsmanship

---

## 8. Lore-first design method

Before writing the first prompt, the skill should internally determine:

1. **Lore identity**  
   Who the archetype is, where it comes from, and what it believes.

2. **Primary symbol**  
   The single object, figure, relic, or silhouette that best expresses that identity.

3. **Supporting motifs**  
   Two to five secondary elements that add history without competing with the primary symbol.

4. **Material language**  
   Materials that logically belong to the archetype's culture.

5. **Shape language**  
   Angular, circular, organic, mechanical, radiant, jagged, symmetrical, asymmetrical, and so on.

6. **Emblem palette**  
   Colors specifically approved or proposed for the selection emblem.

7. **Background gradient**  
   A restrained gradient that supports the emblem without turning into scenery.

8. **Set distinction**  
   How the emblem differs from every approved emblem already in the set.

9. **Thumbnail test**  
   What remains recognizable when details are reduced.

The skill should use this analysis to make one recommendation. It does not need to expose a long internal worksheet unless Raheem asks for it.

---

## 9. Palette rules

Do not blindly copy `archetypes.ts` colors into the emblem prompt.

Portrait palettes and emblem palettes are related but not identical systems.

Approved examples:

- Necromancer moved from spectral green to midnight purple.
- Mech Pilot became strongly cobalt-blue with minimal orange.
- Android uses pearl white, silver, gray, and icy blue.
- Human adds saddle and chocolate-brown leather to its neutral identity.
- Seraph adds controlled crimson hellfire beneath gold, ivory, and pale blue.

Record emblem colors separately in `card-engine-archetype-emblem-library.md`.

Do not silently change portrait palettes, UI tokens, or gameplay data to match an emblem.

---

## 10. Leonardo prompt rules

Leonardo may reject prompts near or above 1,500 characters depending on the selected model.

The skill must:

- Default to a 1,500-character hard limit.
- Target approximately 1,250–1,450 characters for new-generation prompts.
- Prefer shorter edit prompts when possible.
- Count characters before presenting the prompt.
- Never knowingly exceed the active limit.
- Give Raheem one paste-ready main prompt.
- Include exclusions at the end of the main prompt because some Leonardo modes do not expose a negative-prompt field.
- Remove repetition before removing important visual direction.
- Avoid headings and template labels inside the final Leonardo prompt.
- Avoid claiming an exact count unless it was actually measured.

Use direct hierarchy language:

- “Make X the clear main object.”
- “Keep Y secondary.”
- “The emblem must remain recognizable at thumbnail size.”
- “One unified relic, not multiple separate icons.”
- “Keep the entire subject inside the border.”
- “Preserve the existing image exactly…” for targeted edits.

Common exclusions, when relevant:

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

---

## 11. New-generation prompt structure

Use a compressed structure like this:

1. Premium `[fantasy style]` `[Archetype]` emblem for a card-forging selection screen.
2. One unified `[relic/symbol/form]`, front-facing and centered.
3. One sentence establishing lore identity.
4. The primary symbol and its hierarchy.
5. Supporting motifs and arrangement.
6. Materials, engraving, wear, and construction.
7. Archetype-specific palette.
8. Gradient background and lighting.
9. Square format, coverage, readability, and quality.
10. Exclusions.

The final output must be natural prose ready to paste into Leonardo, not a visible fill-in-the-blank template.

---

## 12. Iterative image workflow

The approved set was produced through controlled iteration, not by expecting every first generation to be perfect.

The skill must support three modes:

- `new_generation`
- `full_regeneration`
- `targeted_edit`

### Default decision rule

Use `targeted_edit` whenever most of the image is already approved.

When Raheem requests one change:

1. Do not rewrite the entire concept.
2. Recommend Leonardo image edit, image guidance, or inpainting.
3. State exactly what region should be masked.
4. Begin with “Preserve the existing image exactly…”
5. List the approved elements that must remain unchanged.
6. Describe only the requested modification.
7. Explicitly prohibit changes to the rest of the image.
8. Keep the edit prompt concise.

Examples:

- Change one gemstone color
- Add a HUD to a visor
- Improve face lighting
- Replace only the center symbol
- Remove fire outside a border
- Change an outer silhouette from a circle to an eye
- Refine body proportions while preserving fingerprint texture
- Keep flames inside a gold ring

No paid Leonardo call should happen automatically. The skill produces the prompt and instructions unless Raheem explicitly authorizes an API call.

---

## 13. Approval and progression behavior

Visual judgment belongs to Raheem, but the workflow should not create unnecessary stops.

### Required approval points

1. After the first emblem image is generated
2. After any substantial redesign
3. Before the asset is marked `approved`
4. Before final UI integration

### Not normally required

- Approval of three concept options before a first prompt
- Approval of a long design worksheet
- Approval of every minor prompt wording choice

### Parallel work rule

After the first prompt is delivered, `create-archetype` may continue non-destructive planning and documentation while the emblem is being generated or revised.

However, it must not:

- Mark the archetype fully complete
- Mark the emblem approved
- Integrate a draft image as the final selection asset
- Hide the fact that the emblem is still pending

Use explicit asset states such as:

- `not_started`
- `prompt_ready`
- `draft_generated`
- `revision_requested`
- `approved`
- `integrated`

---

## 14. Approved benchmark outcomes

Use the supplied final images as the visual benchmark set.

### Barbarian

- Blood-Iron ancestral clan crest
- Shield-like forged relic
- Blackened iron, aged silver, blood-red enamel
- Tribal knotwork and horn-like geometry
- Heavy rivets and generational wear
- Lineage, clan memory, ritual, inherited strength

### Monk

- Circular monastery seal
- Dark carved wood and aged bronze
- Crossed staffs with burnt-orange wraps
- Bright gold-brown central medallion
- Clear clenched fist at the center
- Discipline, controlled strength, training, inner mastery

### Beastmaster

- Sacred carved-wood wilderness totem
- Antler-like outer frame
- Bird or owl with spread wings at the top
- Distinct bear and wolf beneath it
- Braided leather, bone, fur, weathered metal, gold, natural brown
- Bonds with multiple animal guardians

### Druid

- Root-woven open hand as the primary symbol
- Hand visibly grown from roots and branches
- Weathered stone and gold circular frame
- Deep greens, bark browns, warm gold
- Tree-born beings and control over plants and roots

### Necromancer

- Ancient skull in a clear side profile
- Large black crescent moon surrounding the skull
- Dense funeral, tomb, soul-binding, chain, and spirit engraving
- Bone ivory, near-black, aged silver, midnight purple
- No floating secondary eye symbol
- Death scholarship, spirit binding, forbidden knowledge, ancient graves

### Vampire

- Circular border of worn castle brick and aged iron
- Blood moon contained inside the emblem
- Fierce bat face, not a horned skull
- Worn leathery scarred bat wings
- Long ancient ceremonial dagger
- Crimson, black, aged silver, garnet
- Immortal bloodlines, predation, old castles, ancient nobility

### Mech Pilot

- Circular techno-arcane forged ring
- Helmet fully contained inside the ring
- Natural human eyes visible behind the visor
- Subtle visor HUD
- Cobalt, midnight blue, gunmetal, silver, restrained warm visor reflections
- No orange background
- A living pilot bonded to fantasy-infused technology

### Android

- Entire outer silhouette shaped like a horizontal mechanical eye
- Pearl-white and polished silver shell
- Icy-blue synthetic iris and dark pupil
- Circuit paths extending outward like artificial nerves
- White-to-gray gradient background
- Synthetic perception, intelligence, identity, awakening

### Human

- Tall lean medieval knight silhouette
- Knight itself formed entirely from fingerprint ridges
- Fingerprint not printed onto realistic armor
- Defined shoulders, waist, arms, hips, and legs
- Stitched leather circular border
- Medieval city skyline in dark chocolate-brown leather
- Individuality, mortality, resilience, potential earned through effort

### Seraph

- Exactly six wings in three symmetrical pairs
- Radiant mask-like face and ornate gold crown
- Strong golden sunrays descending from above
- Gold ring containing the composition
- Large detailed hellfire confined entirely inside the lower half of the ring
- No flame, smoke, ember, or red aura outside the ring
- Red lower gemstone; upper crystals remain pale blue
- Protection, judgment, sacrifice, balance between celestial light and the abyss

---

## 15. Set-wide quality checklist

Before delivering a first prompt, verify:

- The lore can be understood without gameplay mechanics.
- There is one unmistakable primary symbol.
- The silhouette differs from existing approved emblems.
- The design remains recognizable when reduced.
- The palette fits the archetype.
- Supporting motifs reinforce rather than overwhelm.
- Materials make cultural sense.
- The background follows the gradient system.
- The prompt contains no contradictory instructions.
- The prompt is under the Leonardo limit.
- Exclusions are embedded in the main prompt.
- No protected franchise design is being imitated.
- No real-world symbol is copied unintentionally.
- The first pass is decisive enough to generate without another concept-selection meeting.

Before delivering a targeted edit, verify:

- The mask region is stated.
- Approved elements are listed as unchanged.
- Only the requested change is described.
- The prompt does not accidentally trigger a full redesign.

---

## 16. Skill inputs

`design-archetype-emblem` should accept or derive:

- Archetype name
- Approved lore identity
- Cultural origin and values
- Existing portrait palette
- Proposed or approved emblem palette
- Reference images, when available
- Required primary symbol, when Raheem specifies one
- Optional supporting motifs
- Suggested material language
- Must-keep elements
- Must-avoid elements
- Existing approved or draft emblem, when revising
- Current asset status
- Mode: `new_generation`, `full_regeneration`, or `targeted_edit`
- Leonardo character limit, default `1500`

Most inputs should be derived from `create-archetype` context. Do not ask Raheem to repeat data already established in the workflow.

---

## 17. Skill outputs

### For a new emblem

1. One recommended emblem direction
2. A brief lore-to-symbol explanation
3. One paste-ready Leonardo prompt
4. Measured character count
5. Suggested generation mode and model guidance if known
6. A short result-review checklist
7. Asset status set to `prompt_ready`

### For a full regeneration

1. What approved ideas remain
2. What major visual direction changes
3. One paste-ready prompt
4. Measured character count
5. Reason full regeneration is preferable to targeted editing

### For a targeted edit

1. Exact area to mask
2. One paste-ready edit prompt
3. Exact must-preserve list
4. Measured character count
5. Asset status updated appropriately

### After final approval

1. Approved asset path
2. Final visual specification
3. Final prompt or edit prompt used
4. Revision notes
5. Emblem palette
6. Approval date
7. Source-image reference
8. Asset status set to `approved`
9. Canonical-library sync

---

## 18. Integrate with `create-archetype`

Update the current `create-archetype` workflow surgically. Do not rewrite unrelated phases.

Recommended orchestration:

1. Define archetype purpose and lore.
2. Define gameplay identity, stat affinity, and resource rules.
3. Define portrait DNA and rank evolution.
4. Confirm or propose the archetype's visual palette.
5. Invoke `design-archetype-emblem`.
6. Automatically produce the recommended first emblem direction and Leonardo prompt.
7. Continue safe planning while the image is being generated.
8. Review the returned image with Raheem.
9. Use targeted revisions by default.
10. Mark the emblem approved only after Raheem approves it.
11. Integrate the final asset only in an authorized implementation phase.
12. Sync canonical project knowledge.

The emblem skill must not decide gameplay data, and gameplay mechanics must not dictate the emblem by default.

Do not modify Lycan implementation code while adding this integration.

---

## 19. Agent and documentation updates

Update `.claude/agents/art-prompt-director.md` so it:

- Reads `card-engine-archetype-emblem-library.md`
- Advises on portraits and selection emblems as distinct asset types
- Uses the first-pass autonomy rule
- Produces one strong recommendation by default
- Supports targeted-edit prompts
- Remains advisory only
- Flags expected Leonardo costs when recommending multiple test generations

Update documentation and indexes only where needed:

- `CLAUDE.md`
- `STUDIO_CHARTER.md`
- `WORKFLOW.md`
- `.claude/skills/create-archetype/SKILL.md`
- `.claude/skills/sync-project-knowledge/SKILL.md`
- Any canonical skill index created by the preceding task

Add or confirm this sync mapping:

`Archetype emblem specification, prompt, status, or approved asset changed → card-engine-archetype-emblem-library.md`

The preceding `create-archetype` task may already have removed obsolete language claiming that only ten archetypes are allowed. Verify the current state. Do not churn those files if the contradiction is already resolved.

The canonical rule should be:

> New archetypes require Raheem's approval and must use the `create-archetype` workflow. Lycan is already implemented and approved.

Use surgical edits. Do not rewrite unrelated documentation.

---

## 20. Non-goals

Do not:

- Reimplement or alter Lycan
- Replace the newly created `create-archetype` skill
- Make paid Leonardo calls
- Integrate all ten images into the UI automatically
- Change economy values
- Change gameplay mechanics
- Merge portrait and emblem prompt systems
- Add a new specialist agent
- Rewrite approved images
- Treat intermediate failed generations as canonical
- Add every final prompt to application runtime code
- Commit, push, or publish unless explicitly authorized
- Assume a missing Lycan emblem is approval to create one

---

## 21. Verification

Before finishing:

- Confirm the preceding `create-archetype` implementation is present and preserved.
- Confirm `design-archetype-emblem` can be called independently.
- Confirm `create-archetype` invokes it rather than duplicating it.
- Confirm the first-pass autonomy rule is explicit.
- Confirm the workflow normally produces one strong first prompt without unnecessary questions.
- Confirm all ten supplied images are mapped correctly.
- Confirm Lycan is recorded as implemented and approved without changing its code.
- Confirm Lycan's emblem status is recorded honestly.
- Confirm portrait art and emblem art remain separate systems.
- Confirm prompts are measured and remain below the active Leonardo limit.
- Confirm skill links and documentation links resolve.
- Confirm no paid external API call occurred.
- Run the project verification script if code or executable configuration was touched.

---

## 22. Completion report

When finished, report:

1. Files created
2. Files updated
3. Where the ten approved images were stored
4. How `create-archetype` invokes `design-archetype-emblem`
5. How the first-pass autonomy rule works
6. Lycan's recorded emblem status
7. Any contradictions found and resolved
8. Anything still requiring Raheem's approval
9. Confirmation that Lycan implementation code was not changed
10. Confirmation that no paid Leonardo call was made

