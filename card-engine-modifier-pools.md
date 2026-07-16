# Card Engine — Modifier Pools (v1, static)

**Purpose:** the four modifier categories that get layered on top of Archetype + Rank to make every generated card feel distinct. Pulled uniformly at random at generation time (or picked by the user from 3 rolled options).

**Combinatorics:** 25 entries per pool × 4 pools = **390,625 modifier combinations**. Multiplied by 10 archetypes × 3 ranks = **~11.7 million total unique card configurations**. Well past the "1M minimum" target.

**Data structure:** each entry is just a string for now. When rarity is added later (see notes at bottom), entries become objects with a `weight` field.

---

## Pool 1: Setting / Backdrop

Where the character is standing. Feeds the background of the portrait.

1. Ashen wasteland under a bruised sky
2. Moonlit cliffs above a black sea
3. Obsidian cathedral with shattered windows
4. Torchlit crypt lined with old bones
5. Storm-swept mountain peak
6. Sunken temple half-claimed by roots
7. Frozen battlefield still smoking
8. Neon-drenched rain-slick alley
9. Forge-heart chamber glowing orange
10. Ancient library choked with vines
11. Salt-flats under a double moon
12. Ruined coliseum with broken statues
13. Bioluminescent forest at deep night
14. Volcanic shore with black glass sand
15. Frost-shattered pine wood at dawn
16. Bone garden beneath a red sky
17. Derelict starship corridor lit by emergency red
18. Windless desert of mirrored dunes
19. Cathedral of ice, sunlight refracting
20. Hanging gardens over a caldera
21. Rooftop above a sleeping city
22. Rusted scrapyard cathedral
23. Meadow of pale grass under an eclipse
24. Sunken city, kelp swaying through arches
25. Ceremonial stone circle at blue hour

---

## Pool 2: Demeanor

The character's expression and posture — the emotional read of the portrait.

1. Weary but unbroken
2. Coldly defiant
3. Serene and unshakeable
4. Hungry, predator-focused
5. Triumphant, mid-roar
6. Haunted, thousand-yard stare
7. Quietly amused
8. Reverent, head slightly bowed
9. Coiled, about to strike
10. Grieving but standing
11. Regal and dismissive
12. Feral and grinning
13. Meditative, eyes closed
14. Wrathful, teeth bared
15. Curious, head tilted
16. Resigned to what's coming
17. Watchful, scanning the horizon
18. Devout, mid-prayer
19. Contemptuous of the viewer
20. Bloodied but laughing
21. Focused, mid-technique
22. Guarding someone unseen
23. Mourning, holding a token
24. Awakening for the first time
25. Fully at peace

---

## Pool 3: Signature Detail

One striking object, mark, or feature that anchors the character's individuality.

1. Shattered blade held in reverse grip
2. Chained tome floating at the hip
3. Raven perched on the shoulder
4. Prosthetic arm, exposed mechanism
5. Cracked porcelain mask, half-worn
6. Trailing red banner torn at the edge
7. Braided cord of trophies at the belt
8. Single glowing eye, the other scarred shut
9. Wolf skull as a shoulder pauldron
10. Coiled chain wrapped around the forearm
11. Faintly glowing tattoo across the collarbone
12. Broken crown carried in one hand
13. Lantern burning with cold blue flame
14. Threadbare cloak pinned with an old medal
15. Serpent tattoo winding down one arm
16. Feathered fan held closed like a weapon
17. Twin daggers crossed at the small of the back
18. Rosary of black beads at the wrist
19. Shackle still locked around one ankle
20. Painted handprint across the chest
21. Book bound in dark leather, chained shut
22. Antlered helm carried under the arm
23. Silver bell hanging from the belt
24. Living vine growing from a scar
25. Small child's toy tied to the pack

---

## Pool 4: Lighting / Time of Day

Establishes atmosphere and color temperature. Chosen independently of setting so combinations stay varied.

1. Dawn gold, low and warm
2. Eclipse red, everything blood-tinted
3. Blue hour, cool and quiet
4. Forge glow, orange from below
5. Moonlight silver, high contrast
6. Storm-lit, brief lightning flashes
7. Underlit by pale magical fire
8. Overcast noon, flat and gray
9. Candlelit, warm and close
10. Backlit by a shattered sun
11. Aurora green from above
12. Twin-moon light, doubled shadows
13. Torchlight flickering, deep shadow
14. Bioluminescent blue-green ambient
15. Dust-hazed golden hour
16. Snow-reflected daylight, cold white
17. Fire-shadow, dancing on one side
18. Starlight only, near-monochrome
19. Green witchlight from the ground
20. Sunset copper, long shadows
21. Deep cave dark, single point source
22. Sunrise through mist, diffuse
23. Corona of holy light from behind
24. Neon underlight, magenta and cyan
25. Total silhouette, edge-lit only

---

## Prompt Assembly

Final prompt structure once modifiers are rolled:

```
Base Visual Style
+ Archetype DNA block
+ Rank Modifier (Foundation / Forged / Ascendant)
+ Setting: [Pool 1 pick]
+ Demeanor: [Pool 2 pick]
+ Signature Detail: [Pool 3 pick]
+ Lighting: [Pool 4 pick]
+ Negative Prompt Rules
```

The four modifier picks are also passed to the Claude call that generates card name, title, and lore, so the flavor text matches what's in the portrait.

---

## Notes for Later

### Adding rarity (v2)
Convert each entry from a string to an object:
```json
{ "text": "Bioluminescent forest at deep night", "weight": 3, "tier": "uncommon" }
```
Suggested tiers to introduce: `common` (weight 10), `uncommon` (weight 3), `rare` (weight 1). Aim for roughly 60/30/10 distribution across a pool. Reserve `legendary` (weight 0.2) for a handful of entries that could unlock the MultiColor border when rolled.

### Adding more entries (v2+)
Target a next milestone of 40 entries per pool = 2.56M modifier combinations. Add entries in themed batches (e.g. "10 more industrial/mech-friendly settings," "10 more nature-friendly demeanors") rather than one at a time, so tone stays coherent.

### Cross-pollination tags (v3)
Tag entries with archetype affinities (`fits: ["Necromancer", "Vampire"]` or `avoid: ["Seraph"]`) so the roller can skew toward thematically coherent combos without hard-blocking surprising ones. This is where "fallen seraph" and "wandering barbarian" emerge as identifiable sub-types.

### Modifier stack storage
Every card record should store the rolled modifier stack alongside the seed, so evolution generations can reuse the exact same picks and Claude-generated lore stays consistent with the portrait across all three ranks.

### Roll mechanic for the questionnaire
When showing the user 3 options per category, roll 3 without replacement from the pool. The "surprise me" wildcard rolls a 4th hidden pick and uses that instead — this way "surprise me" can genuinely surprise even relative to what the user was just shown.
