# Card Engine — Economy & Currency System Planning Brief

**Status:** Planning only — do not implement yet  
**Audience:** Claude Code  
**Project:** Card Engine — Fantasy TCG  
**Owner / final economy authority:** Raheem  
**Purpose:** Define the goals, constraints, architecture, design direction, and implementation phases for a major economy system before any code changes begin.

---

## 1. Executive Summary

The Card Engine is evolving from a card-generation prototype into a game with a sustainable economy.

The economy must accomplish four goals at once:

1. **Fund paid API usage and future operating costs**
   - Card creation, portrait regeneration, and card evolution call paid APIs.
   - Player-facing prices should include enough overhead to support hosting, failed generations, future development, support, and people working on the project.
   - Prices should not mirror raw API costs exactly.

2. **Remain generous and player-friendly**
   - Players may buy premium currency bundles with real money.
   - Dedicated players must also be able to earn the ability to create and evolve cards without spending money.
   - The free path should require meaningful time, skill, achievement, difficulty, rarity, or luck—not mindless repetition.

3. **Support future gameplay**
   - A common gameplay currency will be earned through minigames, battles, bosses, chests, quests, and other play.
   - A rarer premium currency will have much greater buying power and will be the primary currency for actions that trigger paid APIs.
   - Future minigames must plug into a centralized reward catalog rather than inventing their own rewards.

4. **Stay controllable as the game grows**
   - API cost estimates, player prices, rewards, and economy rules must be maintained separately.
   - Claude Code must never silently change player-facing prices, reward values, bundle values, exchange rules, or starting balances.
   - All economy changes require Raheem's explicit approval and a documented reason.

This is a large foundational system. The first deliverable is a reviewed plan, not code.

---

## 2. Current Project State Relevant to This Plan

The current snapshot is a React/Vite/TypeScript application using localStorage.

Implemented paid-generation flows include:

- **New card forge**
  - Claude generates name, lore, identity, portrait prompt, and negative prompt.
  - Leonardo generates the portrait.
- **Portrait regeneration**
  - Claude rebuilds the prompt.
  - Leonardo generates a replacement portrait.
- **Tier-up / evolution**
  - Claude evolves modifiers, lore, and prompt.
  - Leonardo generates evolved artwork.
- **Local card persistence**
  - Cards are stored in localStorage.
- **No backend authority**
  - There are currently no user accounts, server-owned wallets, secure transaction records, or payment processing.

Important consequences:

- A localStorage wallet can be useful for UI prototyping, but it is not secure enough for real-money currency.
- Any real-money bundle sales, authoritative balances, or anti-fraud enforcement must wait for a backend and authenticated users.
- The current project contains active work and TypeScript build errors. Economy implementation must not begin until the existing baseline is buildable or the economy work is isolated on top of a known stable state.

Known provisional cost assumption from current discussion:

- Leonardo image generation: approximately **$0.036**
- Full card creation pipeline: approximately **$0.04**

These are estimates, not permanent constants and not player-facing prices.

---

## 3. Product Philosophy

### 3.1 Core principle

> Money buys speed and convenience. Time, skill, persistence, achievement, and luck can reach the same creation opportunities more slowly.

The game must not become strictly pay-to-create.

A non-paying but highly engaged player must be able to earn new card creation and evolution opportunities. That path should feel rewarding and aspirational.

### 3.2 What premium currency represents

Premium currency is not an exact reflection of API cost. It represents:

- Paid generation cost
- Retry and failure reserve
- Hosting and storage
- Payment-platform fees
- Customer support
- Future development
- Art and design work
- Business overhead
- Sustainable profit

### 3.3 What gameplay currency represents

Gameplay currency represents ordinary progress earned through play.

It should be common enough to reward regular participation but have less direct power over expensive AI-generation actions.

### 3.4 Currency should gate expensive creation, not basic fun

Normal gameplay should remain broadly accessible.

The economy should not make players pay for:

- Viewing cards
- Managing a collection
- Practicing minigames
- Inspecting evolution history
- Browsing game content
- Standard navigation

Paid or scarce resources should primarily govern:

- New AI-generated cards
- New AI-generated artwork
- Evolution artwork
- Portrait regeneration
- Premium cosmetic generation
- Other future paid API actions

---

## 4. Two-Currency Model

Use stable internal identifiers and configurable display names.

```ts
type CurrencyId = 'premium' | 'gameplay';
```

Do not bake final fantasy names into business logic.

### 4.1 Premium Currency

**Working name only:** Forge Crystals  
**Internal ID:** `premium`

Premium currency:

- Is sold in bundles for real money.
- Can also be earned slowly through difficult, rare, milestone-based, or luck-based rewards.
- Has high buying power.
- Primarily pays for actions that trigger paid APIs.
- May occasionally be given through promotions, achievements, seasonal events, or first-time rewards.

Possible premium uses:

- Forge a new card
- Evolve a card with new artwork
- Regenerate a portrait
- Generate alternate art
- Generate premium cosmetic variants
- Future high-value creation actions

### 4.2 Gameplay Currency

**Working name only:** Gold  
**Internal ID:** `gameplay`

Gameplay currency:

- Is earned commonly through play.
- Is not the main direct funding mechanism for paid API calls.
- Supports progression, upgrades, entries, crafting, and other game systems.
- Has much lower buying power than premium currency.

Possible gameplay uses:

- Card stat progression
- Non-API upgrades
- Practice rewards and challenge rewards
- Tournament or event entry
- Crafting
- Temporary boosts
- Collection upgrades
- Future gameplay consumables

### 4.3 Free path to card creation

The free path must exist from the beginning of the economy design, even if minigames are implemented later.

Preferred methods:

1. **Rare direct premium-currency rewards**
   - Difficult boss clears
   - Weekly challenge completion
   - Rare chest results
   - Collection milestones
   - Seasonal achievements
   - High-risk randomized minigame rewards

2. **Guaranteed milestone rewards**
   - Long-term progress should not depend entirely on luck.
   - Dedicated players should eventually earn a card even during bad RNG streaks.

3. **Optional future Forge Ticket**
   - A non-currency reward item granting one card forge.
   - Could be earned from difficult milestones or purchased with a very large amount of gameplay currency under strict limits.
   - Do not add this in v1 unless needed.

Avoid a simple unlimited gameplay-to-premium exchange at launch. It is difficult to balance and can make farming dominate the economy.

---

## 5. Economy Architecture

The economy must be divided into separate catalogs and services.

### 5.1 API Cost Catalog — developer-facing only

Tracks estimated real-world costs.

Purpose:

- Estimate the direct cost of each paid action.
- Support price reviews when providers, models, or features change.
- Keep raw costs invisible to players.

Suggested action IDs:

```ts
type PaidActionId =
  | 'forge_card'
  | 'evolve_card_art'
  | 'regenerate_portrait'
  | 'regenerate_text'
  | 'generate_alternate_art';
```

Suggested entry shape:

```ts
interface ApiCostEntry {
  actionId: PaidActionId;
  version: number;
  enabled: boolean;
  components: Array<{
    provider: 'anthropic' | 'leonardo' | 'storage' | 'other';
    operation: string;
    estimatedCostUsd: number;
    notes?: string;
  }>;
  estimatedDirectCostUsd: number;
  lastReviewedAt: string;
  reviewedBy: string;
  confidence: 'low' | 'medium' | 'high';
  notes?: string;
}
```

Rules:

- This catalog records estimates, not invoices.
- Every new paid API action must add or update an entry.
- Costs must be reviewed before production release when a paid provider, model, image count, quality setting, or workflow changes.
- Historical versions should be retained in the economy changelog.

### 5.2 Premium Price Catalog — player-facing prices

Maps approved paid actions to premium currency prices.

```ts
interface PremiumPriceEntry {
  actionId: PaidActionId;
  premiumCost: number;
  approvedBy: 'Raheem';
  approvedAt: string;
  pricingVersion: number;
  notes?: string;
}
```

Rules:

- Player prices do not change automatically when API costs change.
- Claude Code may calculate and propose a new price.
- Claude Code must never apply a new player price without Raheem's explicit approval.
- Use clean, readable price points.
- Prices should include sustainable overhead rather than raw-cost parity.
- UI reads prices from this catalog; no component may hardcode economy values.

### 5.3 Gameplay Economy Catalog

Defines uses of common gameplay currency.

```ts
interface GameplayPriceEntry {
  actionId: string;
  gameplayCost: number;
  approvedBy: 'Raheem';
  approvedAt: string;
  version: number;
  notes?: string;
}
```

This catalog is intentionally separate from premium prices.

### 5.4 Reward Catalog

Defines rewards independently from minigame code.

```ts
interface RewardDefinition {
  rewardId: string;
  mode: 'practice' | 'challenge' | 'boss' | 'chest' | 'milestone' | 'event';
  guaranteed: RewardItem[];
  randomPool?: WeightedReward[];
  limits?: {
    daily?: number;
    weekly?: number;
    firstClearOnly?: boolean;
  };
  approvedBy: 'Raheem';
  version: number;
}
```

Future gameplay systems must reference a `rewardId`.

They must not directly say:

```ts
wallet.add('gameplay', 50);
```

They should say:

```ts
grantReward('candy_match_challenge_v1');
```

This keeps balance centralized.

### 5.5 Wallet

Represents current balances.

```ts
interface Wallet {
  premium: number;
  gameplay: number;
  updatedAt: string;
}
```

In the prototype, this may use localStorage.

In production, this must be server-authoritative.

### 5.6 Transaction Ledger

Every earn, spend, reserve, refund, purchase, reward, and adjustment must produce a transaction.

```ts
type TransactionStatus =
  | 'pending'
  | 'committed'
  | 'refunded'
  | 'failed'
  | 'cancelled';

interface EconomyTransaction {
  transactionId: string;
  currency: CurrencyId;
  amount: number; // positive earn, negative spend
  type:
    | 'purchase'
    | 'reward'
    | 'spend'
    | 'refund'
    | 'admin_adjustment'
    | 'migration';
  actionId?: string;
  rewardId?: string;
  cardId?: string;
  status: TransactionStatus;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, string | number | boolean>;
}
```

The ledger is required for:

- Player trust
- Refund debugging
- Purchase support
- Economy analytics
- Fraud investigation
- Migration to backend storage

Balances should be derivable or auditable from ledger activity.

---

## 6. Cost and Pricing Math

### 6.1 Do not use exact pass-through pricing

Player price must not be:

```text
API cost × exact currency conversion
```

Instead, calculate a recommended revenue floor.

Conceptual formula:

```text
Estimated action cost
= paid API cost
+ storage/bandwidth allocation
+ expected retry/failure cost
+ support/operations allocation
```

Then:

```text
Required gross revenue
= Estimated action cost
÷ (1 - payment fees - target contribution margin)
```

Then convert gross revenue into premium currency and round to an approved player-friendly price.

All variables must be configurable.

Suggested configuration categories:

```ts
interface EconomyAssumptions {
  paymentFeeRate: number;
  targetContributionMarginRate: number;
  retryReserveRate: number;
  infrastructureAllocationUsd: number;
  supportAllocationUsd: number;
  currencyUnitsPerUsd: number;
}
```

These values are planning inputs. They are not to be chosen silently by Claude Code.

### 6.2 Bundle economics

Premium currency should be sold in bundles.

Bundle pricing must consider:

- Web payment fees
- Future mobile-store fees
- Bonus currency in larger bundles
- Minimum useful purchase
- Number of card forges per bundle
- Psychological clarity
- Refund and chargeback risk
- Promotions

Suggested bundle model:

```ts
interface CurrencyBundle {
  bundleId: string;
  priceUsd: number;
  basePremiumAmount: number;
  bonusPremiumAmount: number;
  displayOrder: number;
  approvedBy: 'Raheem';
  enabled: boolean;
}
```

Do not choose final bundle prices in this planning document.

### 6.3 Price review output

When costs change, Claude Code should produce a report:

```text
Action:
Current estimated direct cost:
Previous estimated direct cost:
Percent change:
Current premium price:
Current estimated gross margin:
Recommended action:
- No price change
- Monitor
- Propose price increase
- Propose price decrease
Reason:
```

A cost change does not automatically require a player-price change.

---

## 7. Paid Action Transaction Flow

Paid generation must use a reservation-and-settlement pattern.

### 7.1 Standard flow

1. Read approved action price.
2. Confirm wallet balance.
3. Show cost clearly to the player.
4. Create a `pending` transaction and reserve the amount.
5. Begin API workflow.
6. If the complete player-facing action succeeds:
   - Commit the transaction.
   - Save the result.
   - Update wallet and UI.
7. If the action fails:
   - Refund/release the reservation automatically.
   - Mark the transaction `refunded` or `failed`.
   - Show a useful error.
8. Never charge twice for a retry caused by the system.

### 7.2 Card-forge success definition

A paid card forge is successful only when the promised deliverable exists.

The current flow can fall back to a placeholder portrait when Leonardo fails. That is acceptable for a free prototype but not automatically acceptable for a paid action.

Before monetization, choose one production rule:

**Recommended rule:**
- Do not finalize a premium card charge unless the full card and valid AI portrait are produced.
- On portrait failure, preserve the generated text as a temporary draft if useful.
- Give the player a no-cost retry.
- Do not mint a paid placeholder card unless the player explicitly accepts a discounted or free fallback.

### 7.3 Evolution failure

If text generation succeeds but evolved portrait generation fails:

- Preserve the original card.
- Do not consume the premium charge.
- Do not silently complete only part of the evolution.
- Allow retry without another charge.

### 7.4 Portrait-regeneration failure

If the replacement portrait fails:

- Keep the original portrait.
- Refund automatically.
- Record the failure reason in metadata where safe.
- Do not expose provider secrets or unsafe prompt details to players.

---

## 8. Practice, Challenge, Risk, and Future Minigames

This section is context only. Do not design or implement minigames during the currency phase.

Planned future minigame direction:

- Mario Party-inspired randomized selection screen
- Players can practice any available minigame
- The randomizer selects the reward-bearing challenge
- Challenge mode carries meaningful rewards and possibly risk
- Initial minigames:
  1. Match-3 game using elemental/card/coin icons
  2. Boss battle using three player cards
  3. Chest shuffle / card-location guessing game

Economy implications:

### Practice mode

- Always available
- Low or no meaningful economy rewards
- Never drops premium currency in the initial design
- Useful for learning and fun
- Should not become the optimal farming method

### Randomized challenge mode

- Selected by the future game randomizer
- Uses centralized reward definitions
- Offers higher gameplay-currency rewards
- May offer rare premium currency
- May include streaks, difficulty, risk, or limited attempts
- Reward odds and limits must be visible enough to avoid feeling deceptive

### Boss and milestone rewards

Bosses and long-term milestones are strong candidates for:

- Guaranteed small premium rewards
- First-clear premium rewards
- Rare large drops
- Forge Tickets in a later version

### Anti-frustration rule

The free path cannot depend entirely on random chance.

Use a combination of:

- Rare drops for excitement
- Guaranteed milestones for fairness
- Pity/progress systems if randomness becomes central

---

## 9. Security and Production Constraints

### 9.1 localStorage prototype limitations

A localStorage wallet can be edited by the player.

Therefore, a local prototype must be labeled and treated as:

- Demo economy
- UI prototype
- Non-monetized
- Non-authoritative

Do not connect real payments to localStorage balances.

### 9.2 Production requirements

Before selling premium bundles, implement:

- Authentication
- Server-authoritative wallet
- Server-authoritative transaction ledger
- Server-side price lookup
- Server-side API calls
- Idempotency keys
- Purchase receipt verification
- Secure webhook processing
- Refund handling
- Audit logs
- Rate limits
- Fraud controls
- Database transactions / atomic balance updates

The client may display balances and initiate requests, but it must not decide whether currency exists or whether a paid action is authorized.

### 9.3 API-key concern

Current paid API calls are client-side.

Before production monetization, paid provider keys and generation requests must move behind a secure server or serverless backend.

---

## 10. Proposed Repository Structure

This is a proposal for later implementation.

```text
card-engine/
├── docs/
│   └── economy/
│       ├── POLICY.md
│       ├── DECISIONS.md
│       └── CHANGELOG.md
└── src/
    ├── data/
    │   └── economy/
    │       ├── apiCostCatalog.ts
    │       ├── premiumPriceCatalog.ts
    │       ├── gameplayPriceCatalog.ts
    │       ├── rewardCatalog.ts
    │       ├── bundles.ts
    │       └── assumptions.ts
    ├── types/
    │   └── economy.ts
    ├── services/
    │   ├── economyService.ts
    │   ├── walletService.ts
    │   ├── transactionLedger.ts
    │   └── rewardService.ts
    └── components/
        └── economy/
            ├── CurrencyBalance.tsx
            ├── CurrencyCost.tsx
            ├── CurrencyGainToast.tsx
            ├── CurrencySpendAnimation.tsx
            ├── InsufficientFundsModal.tsx
            ├── PurchaseBundleModal.tsx
            └── TransactionStatus.tsx
```

Avoid duplicating live numeric values in Markdown.

- TypeScript/data catalogs are the machine-readable source of truth.
- `POLICY.md` explains governance and philosophy.
- `DECISIONS.md` records approved decisions and rationale.
- `CHANGELOG.md` records actual economy changes.

---

## 11. UI and UX Requirements

### 11.1 Global display

The navigation should eventually show:

- Premium balance
- Gameplay balance
- Distinct icons
- Tooltips or labels
- Click/tap access to a wallet or economy panel

The currencies must not rely on color alone.

### 11.2 Cost display

Every priced action must show its cost before activation.

Examples:

- Forge button with premium cost
- Evolve button with premium cost
- Regenerate portrait button with premium cost
- Disabled state with required and current balance

### 11.3 Confirmation

Use confirmations for:

- High-value spends
- Permanent regeneration
- Actions that overwrite canonical art
- Purchases involving real money

Avoid repetitive confirmations for tiny routine spends.

### 11.4 Feedback states

Required feedback:

- Pending/reserved
- Successful spend
- Successful reward
- Refunded
- Insufficient funds
- Provider failure
- Retry available

### 11.5 Accessibility

- Support reduced motion
- Do not communicate currency type only through color
- Keep icons readable at small sizes
- Use clear numeric formatting
- Make balance changes understandable
- Sound effects must be optional

---

## 12. Figma and Leonardo Design Plan

The visual system should match the current fantasy UI:

- Dark atmospheric backgrounds
- Elegant borders
- Parchment and paper textures
- Gold accents
- Cinzel/fantasy typography
- Existing Figma card-frame language

### 12.1 Figma deliverables

Before coding polished currency UI, design:

1. Premium currency icon
2. Gameplay currency icon
3. Navbar balance pill
4. Cost badge
5. Reward toast
6. Spend toast
7. Insufficient-funds modal
8. Purchase-bundle modal
9. Pending-generation state
10. Small, medium, and large icon variants
11. Light/dark contrast checks
12. Reduced-motion alternative states

Raheem should provide the relevant Figma file/page/frame references when this design phase begins.

Claude must ask for Figma examples or screenshots when layout intent is unclear rather than inventing a disconnected visual language.

### 12.2 Leonardo use

Leonardo can generate:

- Large fantasy coin or crystal concept art
- Embossed symbols
- Minted crest ideas
- Material references
- Promotional currency illustrations
- Shop/banner artwork

Leonardo should not be trusted as the final source for tiny UI icons without cleanup.

Workflow:

1. Generate concept variants in Leonardo.
2. Select a strong silhouette.
3. Simplify/redraw in Figma.
4. Test at 16 px, 24 px, 32 px, and 64 px.
5. Export optimized assets.
6. Store source and export references.

### 12.3 Animation direction

Potential animations:

**Spend animation**
- Coin/crystal flips or rotates
- Travels toward the forge/evolve action
- Balance counts down
- Forge effect begins

**Earn animation**
- Coins burst from reward source
- Travel into the wallet counter
- Counter ticks upward
- Rare premium reward receives a stronger effect

**Cash-in / bundle animation**
- Currency stack lands
- Brief glow
- Counter increments
- Optional sound

Animations must be short and must not block the player from continuing.

---

## 13. Governance Rules for Claude Code

These rules are mandatory.

### 13.1 Approval

Claude Code must not change any of the following without explicit discussion and approval from Raheem:

- Player-facing prices
- Currency conversion assumptions
- Bundle values
- Starting balances
- Reward values
- Reward probabilities
- Drop rates
- Exchange rules
- Daily/weekly caps
- Refund rules
- Free premium-currency rates
- Paid action definitions
- Which features consume currency

### 13.2 Required question rule

If any economy requirement is ambiguous, Claude Code must ask Raheem before implementing it.

Do not guess because a value “seems reasonable.”

### 13.3 New paid feature rule

Any new feature that calls a paid API must declare:

- Provider and operation
- Number of expected calls
- Estimated cost
- Failure/retry behavior
- Proposed paid action ID
- Proposed premium price impact
- Whether a refund is required on failure

### 13.4 New reward feature rule

Any new feature that grants currency must declare:

- Reward ID
- Mode
- Guaranteed rewards
- Random rewards
- Odds
- Limits
- Farming risk
- Intended player behavior

### 13.5 No silent rebalance

Economy changes must:

1. Be proposed.
2. Explain the reason.
3. Show old and new values.
4. Describe player impact.
5. Receive approval.
6. Update the economy changelog.
7. Be included in release notes when appropriate.

---

## 14. Production Release Checklist

Any production change affecting paid APIs or the economy must include this checklist.

### Cost review

- [ ] Did any paid API provider, model, size, quality, or call count change?
- [ ] Was the API Cost Catalog reviewed?
- [ ] Were retry and failure costs considered?
- [ ] Does the current premium price still meet the approved sustainability target?

### Economy review

- [ ] Did any action price change?
- [ ] Did any reward value or probability change?
- [ ] Did Raheem explicitly approve the change?
- [ ] Was the change logged with rationale?
- [ ] Are UI prices sourced from the catalog?
- [ ] Are analytics/event names updated?

### Transaction review

- [ ] Is the spend idempotent?
- [ ] Is the balance update atomic?
- [ ] Is failure refunded correctly?
- [ ] Can duplicate clicks double-charge?
- [ ] Is the ledger entry complete?
- [ ] Are support/debug details available?

### Design review

- [ ] Does the action show its price before use?
- [ ] Are success, failure, and refund states clear?
- [ ] Is reduced motion supported?
- [ ] Are both currencies visually distinct and readable?

---

## 15. Recommended Implementation Phases

### Phase 0 — Stabilize and confirm decisions

Do not begin economy code until:

- Current TypeScript build errors are resolved or intentionally isolated.
- Current forge, regenerate, and tier-up flows are verified.
- Working names or neutral labels are approved.
- Initial paid action list is approved.
- Starting demo balances are approved.
- Initial prototype prices are approved.
- Failure/refund behavior is approved.

Deliverable:
- Claude reports questions, risks, and proposed task breakdown.
- No economy code yet.

### Phase 1 — Catalogs and pure economy logic

Build:

- Economy types
- API Cost Catalog
- Premium Price Catalog
- Gameplay Price Catalog
- Reward Catalog
- Calculation utilities
- Validation utilities
- Unit tests for pure logic

No UI and no real payments.

Deliverable:
- Catalogs are centralized.
- No price is hardcoded in a feature component.
- Calculation report can compare cost and approved price.

### Phase 2 — Local demo wallet and ledger

Build a localStorage prototype:

- Wallet
- Transaction ledger
- Reserve / commit / refund flow
- Demo balances
- Developer reset controls
- Migration/version handling

Clearly mark as non-secure and non-production.

Deliverable:
- Economy interactions can be tested without real money.
- Reloads preserve demo balances and transaction history.

### Phase 3 — Integrate existing paid actions

Integrate in this order:

1. Forge card
2. Regenerate portrait
3. Tier-up / evolution art

For each:

- Show approved price
- Check balance
- Reserve currency
- Execute the full action
- Commit on complete success
- Refund on failure
- Prevent duplicate charges

Deliverable:
- Existing generation flows use one economy service.
- All failures produce correct refunds.

### Phase 4 — Figma-led visual implementation

After Figma concepts are approved:

- Currency icons
- Navbar balances
- Cost badges
- Reward/spend feedback
- Insufficient-funds modal
- Animations
- Reduced-motion behavior

Deliverable:
- Economy feels native to the current fantasy design.

### Phase 5 — Secure backend and payments

Only after backend/auth planning:

- Server wallet
- Server ledger
- Server-side generation calls
- Payment provider
- Bundle purchase verification
- Webhooks
- Idempotency
- Refund tooling
- Fraud controls

Deliverable:
- Safe real-money premium-currency purchase.

### Phase 6 — Gameplay rewards

After the currency system is stable:

- Connect future randomized challenge selector
- Add practice/challenge reward distinction
- Integrate match-3, bosses, and chests through Reward IDs
- Add rare premium rewards and guaranteed milestone paths
- Instrument economy balance

This phase is explicitly deferred.

---

## 16. Analytics Needed Later

Do not optimize only for revenue.

Track:

- Premium purchased
- Premium earned free
- Premium spent by action
- Gameplay currency earned and spent
- Forge attempts
- Successful generations
- Refunded generations
- Provider failure rates
- Average cards created per player
- Time to earn a free card
- Reward-mode participation
- Practice-mode participation
- Currency hoarding
- Insufficient-funds exits
- Purchase conversion
- Player retention after spending
- Free-player progression

Key fairness metric:

> How long does an active non-paying player need to earn one complete new card?

This must be measured and tuned later.

---

## 17. Open Decisions Requiring Raheem's Approval

Claude Code should gather these decisions before implementation:

1. Final currency display names
2. Icon concepts
3. Initial demo wallet balances
4. Initial premium prices for:
   - New card
   - Portrait regeneration
   - Evolution art
5. Whether text-only regeneration costs premium currency
6. Whether initial card rerolls cost anything after the current free allowance
7. Whether failed Leonardo generation blocks minting or offers a fallback
8. Whether partial generation drafts are saved
9. Initial premium bundle structure
10. Initial free premium reward philosophy:
    - Rare drops only
    - Milestones only
    - Both
11. Whether gameplay currency can ever buy a Forge Ticket
12. Daily/weekly caps on premium rewards
13. Whether challenge mode can lose gameplay currency or only forego rewards
14. Whether player-facing reward probabilities are displayed
15. Figma frames/assets to reuse for the wallet and shop

---

## 18. Claude's Required Response Before Coding

Claude Code must not begin implementation immediately after reading this file.

First, it must respond with:

1. Its understanding of the economy goals
2. Conflicts or risks in the current codebase
3. Questions requiring Raheem's decision
4. A proposed file-by-file implementation sequence
5. A test strategy
6. A migration strategy for existing localStorage users
7. A clear separation between:
   - Local demo economy
   - Secure production economy
8. Any recommendation it disagrees with and why

Only after discussion and approval should implementation begin.

---

## 19. Definition of Success

The economy plan succeeds when:

- The project can recover paid generation costs with sustainable overhead.
- Players understand how many creation actions they can afford.
- Prices remain simple and stable even when provider costs change.
- Dedicated free players can slowly earn new-card opportunities.
- Common gameplay rewards remain meaningful without undermining premium currency.
- Minigames plug into a centralized reward system later.
- Failed generations do not unfairly consume currency.
- All balance changes are traceable.
- Claude Code cannot silently rebalance the economy.
- Real-money balances are never trusted to localStorage.
- The currency art and UI feel like part of the existing fantasy card game.

---

**Final instruction:** This document defines direction, not final numeric balance. Do not fill in missing prices, rewards, odds, bundles, or exchange rates without asking Raheem.
