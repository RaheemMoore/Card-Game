---
name: create-boss
description: Ship a new boss end to end — identity intake, reference matting, sprite-lab config with a gated clip run, packing to a shared frame box, signature layers that live outside the sprite, moveset and stats, manifest registration, and the playable clip sheet + /dev/boss-readout review. Use whenever a new boss is being built or an existing boss's clips or moveset are being replaced. Do NOT use for the arena he fights in (that's create-arena), a walkable NPC or hero (that's create-character-sprite), or boss balance numbers in isolation (consult game-systems-designer).
---

# Skill: create-boss


> **Studio V2 contracts:** Before any paid call, follow [PAID_OPERATION_POLICY.md](../../../.claude/studio/PAID_OPERATION_POLICY.md). Final acceptance uses [EVIDENCE_VERDICT_CONTRACT.md](../../../.claude/studio/EVIDENCE_VERDICT_CONTRACT.md). Group expected provider calls into one approved batch with a stop limit; recovery, download, sheet, validation, and local finishing steps are not new paid approval events.

A boss is four separate assets that have to agree: a **sprite** (his body), **clips** (what
his body does), **signature layers** (everything around him, in code), and a **moveset**
(what the clips mean). The recurring failure is baking layers 1 and 3 together.

Read [HARNESS_INDEX.md](../../../HARNESS_INDEX.md) first.

---

## Step 0 — Consult, before any spend

- **`pixel-sprite-director`** — always. Owns gen mode, direction mapping, packing, the gate.
- **`lore-fantasy-director`** — if the boss carries archetype or faction identity.
- **`game-systems-designer`** — for the moveset numbers. Never set damage from vibes.
- **`environment-art-director`** — for the signature layers and his arena.

Use the `consult-specialist` six-field prompt.

---

## Step 1 — Intake

1. **Who is he and what is his one visual signature?** The Still Season: a burning
   yellow-green core in a bone ribcage. The signature is what every clip must name verbatim.
2. **Standing or seated?** This changes everything downstream — see the gate in Step 3.
3. **What does the design source look like?** Raheem often designs in Leonardo/Gemini
   himself. Save the source at `bg-harness/refs/<slug>/source.png`.
4. **Which archetype's champion is he?** Drives arena, palette, moveset flavour.
5. **What must NOT be baked into the sprite?** Answer this now — Step 2 depends on it.

**Terminology is load-bearing.** Raheem corrected "antlers" to "bare tree branches" because
"antler" makes a generator draw a paired symmetrical deer rack. Use his words exactly.

---

## Step 2 — Cut the reference down to the FIGURE ALONE

Matte the source with `rembg` / `lib/nobg.sh` and crop to the body. Then **deliberately
remove everything that is scenery**, because PixelLab's v3 warps everything in frame along
with the skeleton — a carved throne would breathe and redecorate frame to frame.

The Still Season had four things removed, each shipping as its own layer: the throne and
deadwood arcs, the green rune halo, the pink flower ground band, the ember fall. The
Debt-Bearer's first attack returned "a large brown wing-shaped artifact belonging to
nothing" from exactly this mistake.

Kept separate, the halo can rotate, the flowers can pulse, and the throne stays still —
for free, and without risking the character.

Save at `bg-harness/refs/<slug>/character-ref-<N>sq.png`.

---

## Step 3 — Write the config, and gate it

`card-engine/scripts/sprite-lab/configs/boss-<slug>.json`. Copy `boss-still-season.json`.

**Mode is `v3`.** Not `pro` (~186 generations, corrupt mis-facing frames). Not `template`
(lost the south facing entirely, total loss for a frontal boss). If you propose `pro`, say
why *this* time is different.

Set an explicit **`seed`**. Without it the boss cannot be rebuilt.

### The gate

Mark every clip except `idle` with `"skip": true`. Run once, get idle for ~4 generations,
**look at the frames**, then remove the skips.

Frame 0 must come back near-identical to the pinned reference — that is the free exact
check pinning buys. A seated boss's likely failure is not an error; it is a boss that
quietly stands up out of his chair, discovered 28 generations later.

### Clip rules that each cost real money to learn

**Name every re-shot clip uniquely.** `name` becomes `display_name`, animations accumulate,
and names are **not** unique. Frames are pulled by `slug(display_name)`, so a second clip
called `hit` silently returns the *first* one while still charging you. Hence `idle-v2`,
`hit-v2`. The next re-shoot bumps again.

**Never ask a clip to animate a glow.** Asking the core to "brighten and dim" made the model
dim it and never bring it back — by frame 2 the ribcage was plain white bone and the
character's whole signature was gone. Glow is a code layer: an alpha/scale sine costs zero
generations and cannot lose the feature.

**Name every costume noun verbatim in every clip action.** Anything unnamed is treated as
optional — unnamed flowers dissolved into moss blobs by frame 2. The clip prompt is the
model's most recent instruction.

**One action per clip.** If the string contains "and then", it is two clips. The
Debt-Bearer's first attack asked for raise AND smash AND recover and returned no arm motion
at all.

**Small motions, not large ones.** The clips demanding the biggest, fastest displacement are
the ones that hallucinate decoration. A `hit` asking for "recoiling sharply, head snapping
back, arms jerking" came back as a full scream with a crown of flame. "Tipping back a little
and settling" leaves nothing to invent. (That scream was too good to waste — it shipped as
`ultimate` and `rage`. Best accident of the run.)

**Do not widen the silhouette.** A wider reach widens the SHARED union box across every
clip, padding idle with dead space and rendering the boss smaller on a fixed-aspect stage.

**Chain at most one hop.** `startFromFile` off the wind-up's last frame so the cast begins
with hands already raised. Chaining a chain compounds drift. Update `startFromFile` if the
wind-up returns a different frame count.

**`frameCount` is what you ASK for; v3 returns frameCount + 1** (frame 0 is the pinned pose).
Minimum is 4 — 3 is rejected 422 before any spend. Fill `returnedFrames` **from what
actually came back**; do not assume it, or every clip runs one frame longer than the
manifest claims.

**Clip ids must equal `BossSpriteState` names** end to end: `idle`, `windup`, `attack`,
`hit`, `rage`, `defeat`, `ultimate`. `pack_boss_clips.py` finds frames by clip name while
the manifest keys by state — a mismatch is a trap for whoever comes next.

**Time the clips to the NORMAL beat, not the heavy one.** ~7 frames at 11fps = 636ms, inside
`windUpNormal(250) + impact(400)`. Sizing to the heavy beat truncates every ordinary attack.

**`windup` and `attack` are separate states, always.** They were once one clip, so the
telegraph and the blow looked identical. A telegraph the player cannot read is not a
telegraph.

**Give him a real `defeat`.** The Debt-Bearer reuses idle and keeps breathing after you kill
it — the most visible remaining defect in that set. Fold *inward*, never downward:
`pack_boss_clips.py` clips everything below the idle ground line.

**M5.7 applies to monsters.** Bone and bark are structure, not skin — but say so
*positively* in the description ("fully enclosed by ribs over bark plates, no bare flesh
anywhere") rather than hoping. A creature textured like skin is still nude. No pose in any
clip may open the torso; that is standard generator drift for charge and enrage.

---

## Step 4 — Generate and pack

```bash
cd card-engine
node scripts/sprite-lab/sprite-lab.mjs gen boss-<slug>     # gate first, then the rest
python3 scripts/sprite-lab/lib/pack_boss_clips.py scripts/sprite-lab/out/boss-<slug>
```

Packing enforces a shared frame box and ground line across every clip. **Measure the packed
size and record it** — PixelLab overrides the size you ask for (128² requested, 180²
returned, per the playbook). Hardcoding the request reintroduces a scale mismatch.

---

## Step 5 — Review by WATCHING, always

```bash
node scripts/sprite-lab/boss-sheet.mjs scripts/sprite-lab/out/boss-<slug>
```

This plays the **packed strips** at real fps — what the game will actually mount, same frame
box, same ground line, same clipping. Reviewing raw frames would pass a sheet the packer had
broken.

**Stills cannot answer this.** Every defect ever shipped here — the shrinking hero, the
backwards facing, the mid-walk costume change, the teleporting ledger, the vanishing core
glow — was found by watching motion. Three separate automated attempts to measure animation
in a driven browser reported "frozen" when the animation was fine.

Publish the sheet as an Artifact for Raheem. **Images, never markup.**

---

## Step 6 — Signature layers (in code, not in the sprite)

Everything cut in Step 2 comes back here as a React layer under `src/pages/battle/`
(`BossRuneHalo.tsx`, `BossFlowerBed.tsx`, `BossSceneDressing.tsx`), registered in
`src/data/combat/bossSignatureManifest.ts`.

**Bind each layer to a specific `actionId`.** `BossStage` derives one `charging` boolean, so
every heavy intent lights up identically — the player learns *that* something is coming but
not *what*. That is the wind-up problem one level up. Binding the rune circle to
`act_season_hold` and the flower bed to `act_season_root` makes two attacks announce
themselves in different colours in different parts of the screen. No schema work is needed:
`BattleIntent.actionId` is already on `boss_intent_declared` and `damage_dealt` already
carries `sourceActionId`.

If the boss's attack is a **cast** rather than a punch, the sprite renders only the body's
contribution (arms lift, torso leans). The projectile and ground bloom are
`AttackVFX` / `CardCombatFx`'s job.

---

## Step 7 — Moveset and stats

`src/services/bosses/registry.ts` + seed + `boss_*` Supabase tables.

**Numbers come from `game-systems-designer`, not from you.** Check
`card-engine-boss-battle-spec.md` for the contract. Ensure the boss cannot hit one card with
one move where the design says otherwise — that has been a shipped bug.

Reserve the boss's VFX colours against his arena's plate (see `create-arena` Step 1).

---

## Step 8 — Register

| Asset | Location |
|---|---|
| Packed strips | `public/assets/combat/bosses/<slug>/sprite-<clip>.png` |
| Clip geometry | `src/data/combat/bossSpriteManifest.ts` — **measured** sizes, frame counts, fps |
| Signature layers | `src/data/combat/bossSignatureManifest.ts` |
| Arena binding | `src/data/combat/arenaManifest.ts` |
| Stats + moveset | `src/services/bosses/registry.ts` |

---

## Step 9 — Verify in the fight

`preview_start` the dev server (never Bash), then:

- `/dev/sprite-preview` — does he mount at the right scale on the stage?
- `/dev/boss-readout` — does the fight **measure** right? Beats, damage, telegraph timing.
- `/dev/seed-battle` or `/battle` — play it. Watch a wind-up, take a hit, kill him and
  confirm he does not keep breathing.
- iPhone portrait — a launch platform.

Screenshot and show Raheem.

---

## Step 10 — Append to the playbooks

`PIXELLAB_PLAYBOOK.md` — generations spent, what failed, what the failure *looked* like.
Update the `HARNESS_INDEX.md` config table. Run `scripts/sprite-lab/test-validator.sh`; if
this run produced a new class of defect, propose adding it to `fixtures/` as a known-bad.
