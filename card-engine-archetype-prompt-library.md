# Character Forge — Archetype Prompt Library (v1)

**Purpose:** a reusable prompt-generation system for the 10 confirmed archetypes, so generating a new character means picking an Archetype + Rank, not writing a fresh prompt from scratch each time. This directly implements the roadmap's Prompt Generation Architecture:

`Base Visual Style + Character DNA + Rank Evolution + Negative Prompt Rules → final prompt`

Stat-affinity is intentionally **not** an input here — that's a Figma-side accent only (color + icon badge), decided earlier, so it never touches the actual generated artwork. Only Archetype and Rank vary the art.

---

## Shared: Base Visual Style (applies to every archetype)

Use in every generation, regardless of archetype:

- **Framing:** full-body, front-facing, standing portrait — head to feet in frame
- **Format:** "character portrait" or "illustration" — never "trading card illustration" (baking a border into the artwork is the mistake that cost real rework earlier; the frame is built separately in Figma)
- **Background:** simple, atmospheric, thematically consistent with the archetype (not busy/detailed enough to compete with the character)
- **Lighting:** dramatic, directional, matching the archetype's mood (see per-archetype palette below)
- **Consistency technique:** Leonardo AI Character Reference at Mid strength (~60–70%), fixed seed, when generating multiple ranks of the *same* character

## Shared: Negative Prompt Rules (applies to every archetype)

- No baked-in card border, frame, ornamentation, or vignette
- No text, logos, watermarks, or signatures
- Explicit corrective language against default skin-tone bias — don't let the model default to a single skin tone; specify deliberately
- Explicit corrective language against sexualized default female armor/proportions — specify practical, non-sexualized armor and coverage regardless of character gender

## Shared: Rank Evolution Modifiers (applies to every archetype)

| Rank | Meaning | Visual modifier |
|---|---|---|
| **Foundation** | Beginning of the journey | Minimal/plain version of the archetype's signature look, subtle or absent thematic effect, simple materials |
| **Forged** | Transformation through consistency | Partial equipment/armor, moderate effect intensity, visibly more detail than Foundation |
| **Ascendant** | Mastery | Full regalia, maximum effect intensity, legendary/elite presence |

This 3-stage modifier is archetype-agnostic — it's the same instruction set regardless of which of the 10 archetypes it's applied to; only the *content* of "signature look" and "thematic effect" changes per archetype (below).

---

## The 11 Archetype DNA Blocks

Each block is the only thing that needs to change per archetype — drop it into the Base Visual Style + Rank Modifier formula above to get a complete prompt.

### 1. Barbarian
- **Identity:** raw physical power, primal warrior
- **Palette:** earthy browns, iron gray, deep red war-paint accents
- **Motifs:** fur/hide pieces, tribal scarification or war paint, crude iron weapons
- **Body/posture:** heavily muscled, imposing, wide stance
- **Foundation → Ascendant:** minimal furs/wraps → partial hide-and-bone armor → full war-regalia with trophies and totems

### 2. Monk
- **Identity:** discipline, inner control, martial mastery
- **Palette:** muted earth tones, deep red or saffron sash accent, stone gray
- **Motifs:** simple robes, wrapped hands/forearms, prayer beads, subtle energy around the hands
- **Body/posture:** lean, defined, controlled and centered stance
- **Foundation → Ascendant:** simple robe → reinforced wraps and sash → ornate ceremonial robe with visible chi/energy manifestation

### 3. Beastmaster
- **Identity:** wild, feral, bonded to nature/animal companionship
- **Palette:** forest green, brown, tawny fur tones
- **Motifs:** animal pelts, claw markings, feather/fang jewelry, leather straps
- **Body/posture:** agile, athletic, alert stance
- **Foundation → Ascendant:** simple leathers → animal-hide armor with trophies → full beast-totem regalia with a spectral animal companion silhouette

### 4. Druid
- **Identity:** nature magic, balance, restoration
- **Palette:** deep green, brown, warm gold (sunlight) accents
- **Motifs:** living vines, wooden staff, leaf/floral patterning, antlers
- **Body/posture:** grounded, average/toned build, calm stance
- **Foundation → Ascendant:** simple robe with basic staff → vine-wrapped armor → living armor fused with bloom and antlers, glowing nature energy

### 5. Necromancer
- **Identity:** dark magic, death, forbidden knowledge
- **Palette:** black, bone white, sickly green or purple energy
- **Motifs:** skulls, tattered robes, dark runes, ghostly energy wisps
- **Body/posture:** gaunt, lean, posture shifting from hunched (Foundation) to commanding (Ascendant)
- **Foundation → Ascendant:** tattered robe → bone-adorned robe with dark energy → full death-lord regalia with spectral effects

### 6. Vampire
- **Identity:** dark charisma, aristocratic predator
- **Palette:** deep red, black, silver accents
- **Motifs:** ornate gothic/Victorian clothing, cape, fangs, pale skin, red eyes
- **Body/posture:** elegant, lean/toned, poised stance
- **Foundation → Ascendant:** simple dark attire → ornate gothic coat → full regal vampiric regalia with blood-mist effects

### 7. Mech Pilot
- **Identity:** armored technology, heavy combat suit
- **Palette:** metallic gray, blue, warning-orange accents
- **Motifs:** exposed hydraulics, glowing tech panels, HUD visor, heavy plating
- **Body/posture:** bulky suit silhouette, physique obscured by armor
- **Foundation → Ascendant:** partial exosuit frame → more complete armored suit → full heavy mech-suit with glowing core and integrated weapons

### 8. Android
- **Identity:** synthetic being, post-human precision
- **Palette:** white/chrome, cyan energy accents
- **Motifs:** visible seams/joints, glowing circuit lines, sleek minimal design
- **Body/posture:** precise, symmetrical, idealized proportions
- **Foundation → Ascendant:** exposed basic chassis → partial synthetic-skin plating → fully realized sleek synthetic form with a glowing core

### 9. Seraph
- **Identity:** radiant holy power, righteous protector
- **Palette:** gold, white, soft blue-white glow
- **Motifs:** feathered wings, halo, ornate golden armor, light rays
- **Body/posture:** idealized, upright, noble stance
- **Foundation → Ascendant:** simple white garb with small wings → partial golden armor with larger wings → full radiant regalia with complete wingspan and halo

### 10. Human
- **Identity:** grounded, no fantasy embellishment — the "premium athlete" option for users who don't want fantasy framing at all
- **Palette:** natural, realistic tones
- **Motifs:** none supernatural — realistic athletic wear, minimal accessories
- **Body/posture:** realistic athletic physique, matching real training results
- **Foundation → Ascendant:** basic athletic wear → performance gear → premium elite athletic gear (still no fantasy elements at any rank — "elite," not "magical")

### 11. Lycanthrope
- **Identity:** shape-shifting hunter blessed by the Moon Goddess — man and wolf are two forms of the same devotion. The transformation IS the character, becoming MORE lupine at higher ranks, never more human. The lycan form is a gift, not a curse.
- **Palette:** slate gray or fur-color-matched primary (Black / Brown / Gray / White — rolled per card), bone white, cold moonlight silver, eye-glow matching the card's moon phase (silver-white for Crescent/Half, silver-gold for Full, red-orange for Blood, black-corona for Eclipse)
- **Motifs:** escalating wolf anatomy (mane → snout → full lupine head → digitigrade legs), scarred human skin fading under fur, torn practical clothing that survives the shift, twin curved blades or extending claws, an identity token (dog-tags, cord pendant, scar pattern) preserved across every form, progressive moon presence (subtle pendant/scar → sky-visible moon → moonlight aura + moon-sigil in armor filigree)
- **Body/posture:** athletic-to-powerful build, low center of gravity, weight forward on the balls of the feet — hunter's stance, never a soldier's parade rest
- **Foundation → Ascendant:** near-human primal warrior with subtle wolfish tells (elongated canines, glowing eyes matching moon phase), primitive leather kilt + twin blades, small moon-token → wolf-headed **mid-shift hybrid** — fur spreading down shoulders and forearms, visible **claws replacing fingernails**, human torso broken up by patches of fur (NOT clean gym abs), torn clothing splitting at the seams, moon visible in sky → **fully anthropomorphic wolf-lord** with **digitigrade legs**, visible **wolf tail**, full-body fur (no exposed human abs), pawed hands with **talons**, articulated dark plate with silver moon-sigil filigree, moonlight aura, moon dominating composition

**Fur-as-battle-record:** at Forged and Ascendant, the fur pattern is a living record of the character's journey — silver moonlight veins, scarred patches where fur grows back lighter or darker, silver streaks at the temples, matted ruff. Not generic "battle-worn"; specific marks tied to what the lore says they survived.

**Lore-reflected-in-portrait (Ascendant only, Lycanthrope pilot):** every meaningful story beat committed to the Ascendant lore MUST appear as a visual detail in the portrait — a named battle becomes a scar or notched plate, a bond becomes a background silhouette, a sacrifice becomes a missing/silver-marked piece. (A broader cross-archetype rollout of this pattern is a planned follow-up feature.)

**Lycanthrope pipeline deviation:** Character Reference `init_strength` drops from the default 0.45 to **0.30** so the model can morph face geometry across ranks. Identity is carried instead by four locked textual anchors persisted on the card: **furColor** (rolled at forge), **moonPhase** (rolled at forge), **eyeColor** (Claude picks at forge, written into `CharacterIdentity.eyes`), and **identityToken** (Claude picks at forge, written into `CharacterIdentity.distinctiveFeatures`). All four anchors are re-injected verbatim into every regeneration prompt.

---

## Worked Example: Assembling a Full Prompt

**Archetype:** Barbarian **Rank:** Ascendant

> Full-body, front-facing character portrait illustration of a heavily muscled, imposing barbarian warrior in a wide battle stance. Earthy brown and iron-gray palette with deep red war-paint accents. Wearing full war-regalia — bone-and-hide armor adorned with battle trophies and tribal totems, tribal scarification visible on exposed skin. Dramatic, directional lighting matching a primal/earthy mood. Simple atmospheric battlefield backdrop, not competing with the character for detail. [Insert deliberate, non-default skin tone specification]. No card border, frame, text, logo, or watermark. No sexualized armor or proportions — practical, full-coverage battle gear.

This same formula — swap only the Archetype block and Rank modifier — produces all 30 combinations (10 archetypes × 3 ranks) without writing each one from scratch.

---

## Open Items

1. **All 10 Archetype DNA blocks approved for now** (confirmed with Raheem) — not polished individually beyond Barbarian and Monk, which were explicitly reviewed. The plan is to revise a block only if its actual generated art comes out boring/off, rather than refining all 10 speculatively before any real image exists.
2. **Gender/likeness handling not yet specified** — these blocks are written gender-neutral/generic. If archetypes are meant to apply to a specific person's likeness (like Raheem's or Tori's), each generation would still need the person-specific corrective language (skin tone, build) layered in, same as the original Raheem/Tori prompts.
3. **No art has been generated yet** — this is a prompt library only. Actual image generation still happens externally (Leonardo/Gemini), same as before.

---

*This file lives at `/mnt/user-data/outputs/archetype-prompt-library.md`.*
