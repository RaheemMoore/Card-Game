# Combat Art Acquisition and Integration Plan

**Purpose:** Explain exactly where the first boss, Arena, hero sprites, effects, and cards come from and when they enter the implementation.

---

# 1. Art-source summary

| Asset | Initial source | Production role |
|---|---|---|
| Hero cards | Existing live `CardRenderer` and player-card data | Final, canonical |
| Hero Combat Sprites | Approved individual exports from the provided Figma community sprite pack | Initial reusable sprite library |
| Emberborn Wraith boss card | Leonardo using current proxy and approved prompt | Premium pre-combat reveal |
| Emberborn Wraith Combat Sprite | Leonardo isolated pixel-style boss generation | Active-combat boss asset |
| Forbidden Mountain Passage | Leonardo environment generation | First Arena background |
| Ability art | Existing canonical ability-art system | Ability Bar content |
| UI frames and states | Existing Figma files | Rebuilt as live components |
| Projectiles/effects | CSS/SVG first; Leonardo only when needed | Reusable feedback |
| Status icons | Existing icons plus approved reusable SVGs | Combat status display |

---

# 2. Hero cards

No art generation is required.

The game already has:

- Player-card data
- Portraits
- Borders
- Badges
- Icons
- Exact Figma positioning
- `CardRenderer.tsx`

Claude must use live cards.

The supplied Gryndak, Seojin, and Ashvara images are visual references only.

---

# 3. Hero Combat Sprites

## Source

Figma community file:

`https://www.figma.com/design/voPWJtCJFCl3sik8s5ABkc/16-Vector-Pixel-Fantasy-Characters-%E2%80%93-Fully-Scalable-SVG-RPG-Asset-Pack--Community-`

## Process

1. Inspect all 16 characters.
2. Map useful silhouettes to current archetypes.
3. Select three for the base slice.
4. Export only the chosen characters.
5. Prefer PNG for browser runtime unless SVG size is reasonable.
6. Record source and license.
7. Place in the Combat Sprite manifest.
8. Use CSS transforms for idle, hit, and celebration initially.
9. Later add alternate state exports only when needed.

## Important limitation

This pack is primarily useful for humanoid heroes.

It is not the source for the Emberborn Wraith boss.

---

# 4. First Arena background

## Source

Leonardo through the existing project proxy.

The project already has:

- Leonardo API service
- Vercel server-side proxy
- Image polling
- Data URL handling
- Existing canonical-art precedent

## Generation timing

Do not generate the Arena before:

1. C0 confirms the Figma composition.
2. Claude verifies the target aspect ratio and safe areas.
3. Claude displays the final prompt.
4. Raheem approves the paid call.

After approval, generate 2–4 candidates in one controlled batch if the API configuration supports it.

Select one manually.

## Arena prompt

```text
Premium 16-bit dark-fantasy pixel-art battle arena, widescreen 16:9, a forbidden mountain passage opening into an ancient protected sanctuary. Fixed frontal combat-stage composition with a broad cracked-stone platform in the center for one boss, ruined black-stone towers and chained arches in the distance, dim ember fissures, ash drifting through cold mist, faint cyan moonlight behind the ruins and restrained orange firelight near the ground. Keep the lower foreground readable and uncluttered for three large hero cards. Preserve clear negative space in the upper-left for a boss HUD and on the right for no characters or text. Atmospheric depth, premium RPG environment, low-contrast background, crisp pixel clusters, coherent lighting, no boss, no heroes, no creatures, no cards, no UI, no text, no logo, no watermark, no frame.
```

## Output requirements

- 16:9
- No characters
- No text
- No UI
- Lower contrast than cards and boss
- Stable central ground plane
- No bright detail behind the Boss HUD
- Export WebP or optimized PNG
- Keep original generation and approved derivative

## Repository path

```text
public/assets/combat/arenas/forbidden-mountain-passage/base.webp
```

---

# 5. Emberborn Wraith boss card

## Purpose

Shown before battle only.

## Source

Leonardo.

## Prompt

```text
Premium dark-fantasy boss portrait for a collectible card game: the Emberborn Wraith, a tall elemental spirit formed from shrine ash, blackened ceremonial armor fragments and white-hot embers. Humanoid but unmistakably supernatural, hollow furnace-like chest, long clawed arms, charred crown silhouette, smoke and sparks peeling from the body, intelligent predatory face glowing inside a cracked obsidian mask. Front-facing three-quarter full figure, powerful centered silhouette, dramatic fire and ash lighting, ruined forbidden mountain shrine behind it, premium painterly fantasy illustration, intricate materials, no card border, no text, no UI, no logo, no watermark, no duplicate creature, no modern objects.
```

## Integration

- Add as boss-art asset.
- Associate to `BossDefinition.artAssetIds`.
- Use in pre-combat reveal.
- Never show during active combat.

---

# 6. Emberborn Wraith Combat Sprite

## Purpose

The active-combat boss.

## Source

Leonardo, generated separately from the boss card.

## Prompt

```text
Single isolated 16-bit dark-fantasy pixel-art boss sprite, Emberborn Wraith, front-facing toward the player, medium boss scale, full body visible. A tall ash elemental with a cracked obsidian mask, furnace-glow chest, blackened shrine-armor fragments, long ember claws, smoke and sparks rising from its shoulders, red-orange and white-hot core with deep charcoal shadows. Strong readable silhouette at game scale, symmetrical combat stance, feet aligned to one ground anchor, premium classic RPG sprite craftsmanship, crisp pixel clusters, restrained internal glow. Transparent background if supported; otherwise perfectly flat solid chroma background with no texture. No scenery, no floor, no card, no frame, no UI, no text, no logo, no watermark, no extra creatures, no cast shadow beyond a small centered contact shadow.
```

## First-version state strategy

Use one approved base sprite plus:

- Idle: subtle CSS bob
- Attack: short lunge/scale
- Hit: recoil and brightness flash
- Phase/Rage: alternate tint/effect or second generated state
- Kill celebration: small lift/pulse
- Defeat: fade and dissolve

This avoids buying six images before the base direction is proven.

## Alpha fallback

If Leonardo does not return usable transparency:

1. Generate on a flat chroma background.
2. Remove the background in an approved image-edit step.
3. Inspect edge quality.
4. Export transparent PNG.
5. Preserve the original.

## Repository path

```text
public/assets/combat/bosses/emberborn-wraith/idle.png
```

---

# 7. Effects and projectiles

Use code-first assets initially.

### Fire projectile

- Inline SVG or CSS sprite
- Reusable
- Short trail
- No paid generation required

### Impact

- CSS/SVG burst
- Brief
- Behind floating damage
- Does not cover cards

### Rage

- CSS color/tint
- Ember particles
- Posture/scale shift
- No new image required initially

Leonardo should only be used when code-first effects cannot meet the approved benchmark.

---

# 8. Ability art

The current Ability System already supports:

- Placeholder SVGs
- Leonardo canonical art
- Approved/replaced states
- Ability-specific art records

The battle overhaul should read the approved canonical art.

It should not regenerate ability art.

---

# 9. Art approval sequence

## Gate A — Layout

Approve Figma desktop and mobile safe areas.

## Gate B — Prompts

Claude presents:

- Arena prompt
- Boss-card prompt
- Boss-sprite prompt
- Generation settings
- Estimated number of calls

## Gate C — Paid generation

Raheem explicitly approves the calls.

## Gate D — Candidate review

Claude or Raheem imports candidates into Figma.

Raheem selects:

- Approved
- Revise
- Reject

## Gate E — Asset preparation

- Crop
- Background removal
- Optimization
- Naming
- Manifest entry
- Repository placement

## Gate F — Runtime integration

Replace placeholder through manifest.

Do not change layout code just to replace art.

---

# 10. Base-slice art budget

Minimum paid generation target:

- 1 Arena batch
- 1 boss-card batch
- 1 boss-sprite batch

Hero cards and hero sprites do not require Leonardo for the first slice.

This is the cheapest credible route to the requested visible result.

---

# 11. Required asset manifest fields

```ts
interface CombatArtAsset {
  id: string
  kind: 'arena' | 'boss-card' | 'boss-sprite' | 'hero-sprite' | 'effect' | 'projectile'
  ownerId?: string
  state?: string
  path: string
  source: 'figma-community' | 'leonardo' | 'existing-game' | 'code'
  sourceUrl?: string
  promptVersion?: string
  approvalStatus: 'placeholder' | 'candidate' | 'approved' | 'rejected' | 'replaced'
  approvedAt?: string
  license?: string
  figmaNodeUrl?: string
}
```

---

# 12. Final visible proof

The base-slice milestone is not complete until a screenshot or live route shows:

- Forbidden Mountain Passage
- Emberborn Wraith
- Three exact live hero cards
- Three hero sprites
- Boss HUD
- Ability Bar
- Combat Journal
- Floating damage
- Your Turn cue

That proof is part of Claude's completion report.
