---
name: create-character-sprite
description: Design and generate a directional, animated character sprite set (4 directions + walk/idle/attack cycles) via PixelLab, from identity intake through review sheet. Use whenever a new walkable or animated character is needed — castle hub avatars, replacement combat hero sprites, bosses, NPCs. Covers the Bible-compliance intake, the generate-once-then-derive rule, and the direction-mapping traps that cost a full generation round the first time. Do NOT use for card portrait art (that's art-pipeline / Leonardo) or for environment plates (that's bg-harness).
---

# Skill: create-character-sprite

PixelLab is the character pipeline. Leonardo is **not** — it has no concept of a frame sequence, pins identity with reference images and hope, and in practice returned the same character in two different art styles with two failed attempts at a front-facing view. PixelLab models a character as a first-class object you derive from.

Tooling: `card-engine/scripts/sprite-lab/` (`sprite-lab.mjs`, `configs/*.json`, `lib/palette_ref.py`). Key: `PIXELLAB_API_KEY` in `card-engine/.env.local` — build-time only, never in Vercel env, never `VITE_`-prefixed.

## THE ONE RULE

**Create the character once, then derive everything from it.** Rotations and animations must reference the stored `character_id`. Never generate a direction or an animation as an independent prompt — that is precisely what made the Leonardo attempt fail. Identity consistency is structural here, not hoped for.

## 1. Identity intake (do this before spending anything)

Interview Raheem inline — conversational, not a proposal doc (see `design-minigame` for the house style). Settle:

- **Who they are physically.** Locked permanently: sex, age, body type, ancestry, disability, physical condition. Bible §Rank continuity forbids advancement making a character younger, thinner, or less disabled. **Do not default to young/slim/male** — project memory explicitly warns against hardcoding one body type. Offer against-the-grain options.
- **Archetype + chosen path, if the character belongs to one.** Read the archetype's chapter in `card-engine/src/data/archetypeBible/` and honour its `visualDNA.avoid` and `claudeGuidance.recognitionChecklist`.
  - Worked example — **Human**: identity is *Choice*, so the recognition checklist asks "Can the chosen path be identified?" A generic traveller is a canon failure. The Bible bans "generic adventurers, brown leather, swords as default, medieval-soldier shorthand." The shipped `human.png` combat sprite violates all four; it is a placeholder.
- **Proportions**: `chibi` / `cartoon` / `stylized` / `heroic` / `realistic_male` / `realistic_female` / `default`, or custom head/limb multipliers. At ~96px display, big heads read and realistic figures turn to mush.
- **View**: `low top-down` (face visible — what Pokémon actually does) / `high top-down` (mostly scalp) / `side` / `perspective`. Match the scene loosely; matching it exactly costs you the face.
- **Palette**: pass the scene plate as `color_image` for soft harmony; leave `force_colors` off or the character camouflages into the ground.

Write the answers into `configs/<subject>.json` — that file is the character's permanent identity spec, including an explicit `avoid` string and a `bibleNotes` array recording *why*. Everything regenerated later inherits it.

**Always set an explicit `seed`.** It is the difference between "we can rebuild this character" and "that character is gone."

## 2. Generate

```bash
cd card-engine/scripts/sprite-lab
node sprite-lab.mjs gen <subject>     # character + rotations + animations
node sprite-lab.mjs show <subject>    # stored character detail
node sprite-lab.mjs sheet <subject>   # HTML review sheet (pixelated, checkerboard alpha)
```

Re-running skips completed work, so iteration is cheap. Cost is trivial: template-mode animation is **1 generation per direction**, and a Tier-1 subscription carries 2000.

## 3. The traps (all of these cost real time the first run)

- **Animations do not move the character's status.** The character reads `completed` from the rotation pass, so polling *the character* returns instantly and silently skips the animation — you get `animation_count: 0` and no frames. Template mode fans out one background job per direction in `background_job_ids`; **poll those**, via `GET /background-jobs/{id}`. `waitForJobs` in `sprite-lab.mjs` does this.
- **Direction labels are the character's compass, not the screen's.** Verify by eye, never by label:
  - rotation `south` → faces the camera (face visible) ✓
  - animation `west` → faces screen **right**
  - animation `east` → faces screen **left**
  - animation `north` *and* `south` both came back as **back views** in template mode — the skeleton reconstruction lost the front facing
  - So: **map frames to screen directions by appearance**, and confirm a front-facing walk actually exists before wiring anything.
- **Front-facing walk may need `mode: 'v3'`** with `custom_start_frame` set to that direction's rotation image, which pins the facing. Template mode is cheaper but can drop it. Note v3 returns `frame_count + 1` frames — frame 0 is the pinned reference pose, so the cycle proper starts at index 1.
- **Template mode drifts; `pro` mode is the fix.** Template reconstructs each direction independently and produced a rogue frame whose costume sat 43.7 palette units from its own cycle. `mode: 'pro'` generates directions **sequentially, using finished sides as reference** — that mechanism, not a better prompt, is what holds identity. Costs 20–40 generations per direction (~80–160 for four), which is nothing against a 2000-generation allowance. Default to `pro` for anything a player will look at; keep template for throwaway tests.
- **`pro` runs long.** Allow ~30 minutes of polling for four directions.

### How to determine which way a sprite faces — READ THIS BEFORE TRYING TO BE CLEVER

**Convention for this generator: `east` = screen RIGHT, `west` = screen LEFT, `north` = back view, `south` = front.**

That line was previously written here **backwards**, and the wrong version shipped: the hero walked right while facing left until Raheem spotted it in two seconds of play.

Both static methods used to "verify" it failed, in *opposite* directions:

- A **head-vs-body horizontal centroid** heuristic — wrong, because the hair mass on the back of the head outweighs the nose. (It actually gave the right answer, and was overruled.)
- A **4× zoomed crop of the head** — also read wrong by eye. Small pixel-art faces are genuinely ambiguous.

**The only authority is walking the character in the game and looking at him.** Drive each direction, screenshot, and confirm. If unsure, ask Raheem — he has explicitly offered to be the verifier, and a two-second glance beats an hour of pixel arithmetic.

Static analysis is still worth running, but only for **internal consistency**, never absolute facing:
- **Mirror-IoU** — resize two alpha masks to a common box and compare IoU normally vs with one flipped. Higher-when-flipped means opposite facings. Use it to confirm the left and right rows are mirrors of each other, and that rotations agree with animations. It cannot tell you which one is "right".
- **The model overrides your requested size.** Asked for 128×128, got 180×180. Read `size` back off the character detail rather than trusting the config.
- **Response shapes are undocumented.** `sprite-lab.mjs` harvests image URLs by walking the returned JSON, so it survives shape changes. URLs are opaque UUIDs — they carry no direction names, so the array order in `character.json` is the only mapping.
- Frames arrive **already transparent**; `bg-harness/lib/cutout.py` is only needed for Leonardo plates.

## 4. Gate it — `lib/validate.py`, then a human

**Run the validator. It blocks packing on failure.** Every check exists because that exact defect shipped and a human had to catch it:

| Check | Limit | Catches |
|---|---|---|
| Body height per frame vs row median | ±4% | the hero visibly shrank 25% walking left |
| Idle vs walk body height | ±4% | idle taken from a rotation, walk from an animation — sources disagree on scale |
| Feet baseline swing | 8% of body height | floating/sinking (a flat px rule false-positives; legs legitimately lift) |
| Idle ground line vs walk | 4% of body height | popping up when you start walking |
| Per-frame palette vs row **median** | 20 | a rogue frame's costume differing |
| Idle palette vs walk | 20 | changing clothes when he stops |
| left/right mirror | flipped IoU > same | internally inconsistent facing |

Calibration: on real data the sound rows measured 3–15 and the broken frame **43.7**. The gap is wide, so failures are unambiguous.

**Measure drift against the row's MEDIAN palette, never a chosen reference frame.** An earlier version compared against frame 1; when the rogue frame moved into the idle slot the reported drift fell from 51.7 to 16.8 and the check "passed" while the costume change was still plainly visible in game.

Then the human gate, which the validator explicitly cannot cover:
1. Build the review sheet (`sheet` command) and look at every frame — same person throughout? chosen path readable? genuine front view? legs actually changing?
2. Wire it, drive all four directions in the browser, screenshot each.
3. **Get Raheem's confirmation on absolute facing, scale-in-scene, and appeal.** Those are his calls.

Then hand off to `place-character-in-scene`.

## 5. Non-negotiables

- Modesty (M5.7) applies to sprites as much as portraits.
- Log what was generated in the manifest — prompt, seed, style, usage.
- Never commit the API key. Commit the finished frames.
