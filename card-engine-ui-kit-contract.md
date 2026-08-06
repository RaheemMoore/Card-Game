# Card Engine UI Kit — Phase 0 Contract

**Status:** Phase 0 (contract only — no code, no art generated yet)

> ## REVISED 2026-08-04 — direction shift supersedes the original ruling
>
> Raheem: *"This is a 2D pixel game… the menus are gonna be 2D as a pixelated game… For all
> the current menus that exist — the forge, the collection — those are all gonna be stalls
> you approach within the game. We're not gonna have those menus anymore. It's gonna look
> more like a game rather than a card collection website."*
>
> **Three reversals:**
> 1. **Chrome is PIXEL, not painterly.** The painterly ruling from earlier the same day is
>    withdrawn by Raheem. PixelLab is back in play as the correct tool for chrome — its UI
>    feature (buttons, health bars, menu items, reference-based style consistency) is exactly
>    this job. Leonardo is the wrong tool for true pixel art.
> 2. **The pixel-vs-painterly A/B is CANCELLED.** It existed to answer a question Raheem has
>    now answered. Do not spend on it.
> 3. **Stalls do not route-push to the existing pages.** §2 of the design lock is obsolete.
>    The existing React pages (Forge, Collection, Codex…) are to be *replaced* by in-game
>    pixel menus opened from stalls. This is a re-architecture, not a re-skin.
>
> **The one painterly exception:** the CARD itself — portrait art and the painted Figma frame
> edges — stays painterly. The card is a painted artifact held inside a pixel world. Nothing
> else inherits that exception.
>
> ### The governing rule (Raheem, 2026-08-04)
>
> *"I want beautiful painted backgrounds and scenery with pixelated things moving —
> pixelated air, pixelated dust, characters, and the battling. Imagine the water is Leonardo,
> but the bridge to go over the water is PixelLab. The background is Leonardo, but the lamps
> and things we place on the background are PixelLab."*
>
> **Painted is what you look at. Pixel is what you touch.**
>
> | Painted — Leonardo | Pixel — PixelLab |
> |---|---|
> | Environment plates and backdrops | Characters, NPCs, bosses |
> | Scenery baked *into* the plate | Discrete objects *placed on* the plate (lamps, bridges, crates) |
> | Card portrait art | Moving VFX — dust, air, sparks |
> | The card's painted frame edges | **UI chrome, menus, buttons, bars** |
>
> The rule is not "painted = still." Painted elements may animate (water, banners). The split
> is **baked into the backdrop** vs **a discrete thing placed on top of it**.
>
> **Consequence: the V2 courtyard plate is correct as painted and does NOT need repainting.**
> A concern raised earlier — that the hand-painted Pokémon-overworld plate was off-direction —
> is withdrawn. It is exactly right under this rule. The pixel layer is what gets *added* on
> top of it, not a replacement for it.
>
> Reference frame: this is the Sea of Stars / Eastward lineage, not Octopath's "HD-2D" —
> HD-2D builds pixel sprites over **3D** environments, a different technique. Do not chase it.
>
> The coordinate contract (§2 below) survives all of this unchanged — it is style-agnostic.
> The five primitives survive as *concepts*; their art source moves from Leonardo to PixelLab.

This document is the thing that must be locked **before** any art is sliced or any
component is migrated. Everything downstream — the six-piece art brief, the
`BossHUDOverlay` migration, the stall doorway — is authored against it.

---

## 1. Why a contract comes first

`BossHUDOverlay` declares a 372×196 panel and positions every child at a literal pixel
offset traced from Figma (`9IIvc01ts7LZJ0RaCMGanf`, node `22:39`). That is fine for one
asset. It means that when the painted ring is replaced, **every offset is re-derived by
hand** — and re-derived again for the next re-skin.

`CardRenderer` already solved this for cards: all positions are percentages derived from
the Figma template, so the card renders identically at 326×470 and at 42% thumbnail scale.
The UI kit adopts the same convention.

---

## 2. The coordinate contract

**Reference box.** A `Panel`'s coordinate space is its own **border-box** — the declared
`width`/`height`, ring included. Not the interior. This matters because `borderWidth` is a
render-time prop: the same art renders as a thin 8px HUD ring and a heavy 24px shelf ring,
and children must not move when it changes.

**Rules.**

1. Every child of a `Panel` positions in `%`, never `px`.
2. Percentages are computed against the declared border-box, to **3 decimal places**.
3. Font sizes, letter-spacing, and stroke widths stay in `px` — they are not spatial.
4. A panel that has no fixed declared size (content-sized sheets, modals) uses normal
   flow layout and opts out of the coordinate contract entirely. The contract governs
   **fixed-geometry HUD surfaces only**.
5. Art slices are authored to the *ring*, not the interior. The interior is transparent;
   the element's own `background` shows through (`border-image` without `fill`, the model
   `PaintedPanel` already uses).

**Worked example — the current Boss HUD, unchanged visually:**

| Child | Today | Contract |
|---|---|---|
| Panel box | `372 × 196` | reference box |
| Boss name | `left: 22, top: 18` | `left: 5.914%, top: 9.184%` |
| Subtitle | `left: 22, top: 45` | `left: 5.914%, top: 22.959%` |
| HP bar frame | `left: 22, width: 312` | `left: 5.914%, width: 83.871%` |

The migration is mechanical and must be pixel-identical at 372×196. Any visual change is a
bug, not an improvement — the Figma spec comment says *do not fork*, and it still holds.

---

## 3. Primitive boundaries

Five primitives. Variants come from **props, not new art** — this is what holds the art
order at six pieces.

### `Panel`
The one framed-surface primitive. Generalized from `PaintedPanel`.

| Variant | borderWidth | corners | Used by |
|---|---|---|---|
| `hud` | 8 | 24 | Boss HUD, party status |
| `shelf` | 24 | 30 | Command shelf, journal rail |
| `sheet` | 24 (heavy ring art) | 30 | Stall doorway, result/guide modals |
| `tile` | 8 | off | Ability slots, chips |
| `pill` | 4 | off | Turn badge |

### `Button`
New. Does not exist today — End Turn, ability confirm, Directory rows, and the courtyard
CTA each hand-roll their own styling. Variants: `primary` / `secondary` / `ghost`;
states idle / hover / pressed / disabled driven by CSS on **one** art asset.

### `Bar`
Trough + fill. Currently duplicated inline twice inside `BossHUDOverlay` (HP and RAGE).
Variants: `hp`, `rage`, `resource`.

### `Chip` / `Pip`
Promoted out of `BossHUDOverlay`'s `ResistTile`. Already correctly non-color-only
(diamond pips carry the value, not hue) — that accessibility property is preserved.

### `Scrim` / `Sheet`
One dismiss + focus-trap + Escape behavior. Today the courtyard has its own `Scrim`
(`CourtyardPanels.tsx`) and combat has separate handling in `ResultModal` /
`CombatGuideModal`.

---

## 4. Caller audit — correction to the design ruling

The specialist ruling recommended merging `FantasyPanel` into `PaintedPanel` and flagged
the migration as a risk. **The audit says otherwise, in both directions:**

- **`FantasyPanel.tsx` has zero callers.** It is already dead code. Retiring it is a file
  deletion, not a migration — there is no ornament-drift risk to manage. It still needs
  Raheem's nod before removal (nothing hand-authored gets deleted on my say-so), but it
  costs nothing and blocks nothing.
- **The real second panel language is `CombatFrame.tsx`** — CSS-drawn, explicitly
  **mobile-only**, with two live callers: `mobile/MobileBossHeader.tsx:36` and
  `mobile/MobileCombatJournal.tsx:166`.

This reframes the convergence target. Desktop combat is already fully on painted art
(`PaintedPanel`: 5 callers — CombatScene, BossHUDOverlay, AbilityCommandBar,
CombatJournalRail, ThreatTranslator). **Mobile is the surface with no painted art at all.**
Since iPhone portrait is a launch-blocking platform, mobile adopting the kit is not a
follow-up — it is part of the same pass.

---

## 5. The six art pieces

Authored against §2. One Leonardo batch, for style consistency across the set.

1. **Main ring** — 9-slice, thin/HUD weight
2. **Corner filigree** — single bracket, pointing top-left; other three mirrored in code
3. **Button face** — 9-slice; idle/hover/pressed via CSS on this one asset
4. **Bar trough** — 9-slice
5. **Chip/pip frame** — small, corner-less
6. **Sheet ring** — heavier than #1, so a big commitment reads differently from a HUD ring

Constraint carried from the arena composition contract: chrome sits in **dark, uneventful
top corners** and a **flat low-contrast lower third**. The art must read against those
zones without needing a scrim to rescue it.

---

## 6. Open items

- Return-to-courtyard affordance does not exist on Forge / Collection / Battle. Named here
  so the stall route-push does not smuggle it in as scope creep.
- `ThreatTranslator` has no design spec (PRODUCTION.md). It gets its own pass **before**
  new art extrapolates its geometry into the kit.
- Auto-battle is a disabled stub the mobile UI still shows
  (`mobile/MobileActionControls.tsx:14`) — decide show-or-cut during the mobile pass.
