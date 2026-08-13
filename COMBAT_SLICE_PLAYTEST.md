# Combat Truth Slice — Raheem's playtest script

*2026-08-13. Ten minutes, one recording. Everything below is already verified by
tests and by the command API; what only you can judge is whether it **feels**
right — the tell length, the punish window, the recovery.*

Start the dev server and open **`/castle?combatDev=1`**. The query flag turns on
the mutating dev commands; without it you get the plain game.

## The conversation (record this)

1. **Walk toward the training construct** (brown block, east of the gate). At
   ~260 units it should notice you: a beat of surprise colour, then it turns —
   watch the dark notch on the ground at its feet, that is its facing.
2. **Let it approach.** It closes at 70 units/sec — slower than you. Walk away
   and confirm you can always outpace it.
3. **Stand your ground.** At close range it commits: the body goes hot amber and
   a ring grows on the ground toward where you were standing. That ring is the
   strike. **Walk out of it during the tell** — ordinary walking must be enough,
   there is no dodge and never will be.
4. **Punish.** After it lunges it recovers for ~0.9s. Tap fire (click or F) for
   a quick blast; hold past ~a quarter second and release for a heavy one. The
   HUD slot shows which card is throwing. Hits flinch it; charged hits shove it
   the way the shot was travelling. Its health bar appears once it is hurt.
5. **Kill it.** It dims and collapses, and stops soaking shots.
6. **Revive it** from the console: `__cardEngineDev.combat.reviveConstruct()` —
   or press K for the old dev knockdown at any time.
7. **Get knocked down on purpose.** In the console:
   `__cardEngineDev.combat.setStrongHits(true)` — now its strike knocks you
   down instead of just hurting. Let one land. All four cards scatter; the HUD
   slots go dashed-amber with ▼ markers.
8. **Recover.** Stand up (automatic) and note you cannot be knocked down again
   for ~1.5s — that grace is what stops it chaining you into the floor. Walk
   near each card; they collect by proximity, no key press, and each slot turns
   back solid as its card returns. Fire again the moment the first one is back.
9. **Do the loop twice more** without reloading. It should feel identical each
   time.

## Consoles worth knowing

```
__cardEngineDev.castleCombat()            // everything, one paste
__cardEngineDev.combat.resetConstruct()   // back to its home spot, full hp
__cardEngineDev.combat.setAi(false)       // freeze it to look at it
__cardEngineDev.combat.forceAttack()      // commit a telegraph at your feet
__cardEngineDev.combat.knockdownHero()    // the K key, as a command
```

## What to judge (the tuning knobs, all in `combat/construct.ts`)

- **Is 650ms of tell fair?** It is mathematically walkable-out-of (tested), but
  fair-on-paper and fair-in-the-hands are different facts.
- **Is the 900ms recovery a satisfying punish window?**
- **Does the strong hit read as *strong*** before it lands, or does knockdown
  feel arbitrary?
- **The knockdown sprite** — the "dark spot" report from 2026-08-12. The anchor
  was corrected; nobody has seen it in play since. Does the fall read as a fall?

## What is deliberately NOT here

No dodge (never). No real heavy effects (heavy = charged blast until cards get
their own, by your ruling). No construct sprite (procedural until behaviour is
tuned, by your ruling). No water shape yet — **that one is yours**: a rectangle
in the Editor's `L14_COLLIDERS`, colour `#2f6fdc`, at world x=1859 y=1082
w=275 h=248 makes the pond block walking and card-scatter both.
