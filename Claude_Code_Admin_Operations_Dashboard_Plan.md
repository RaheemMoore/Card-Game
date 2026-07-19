# Card Engine — Admin Operations Dashboard & Prompt Accuracy Lab

**Implementation handoff for Claude Code**  
**Prepared:** 2026-07-19  
**Canonical implementation reviewed:** `Card Game(2).zip` uploaded 2026-07-19  
**Visual evidence reviewed:** mobile admin screenshot supplied by Raheem  
**Approval owner:** Raheem

---

## 1. Mission

Replace the current single-page admin utility with a responsive operations dashboard that supports:

1. Provider balance, spend, usage, and per-game-action cost monitoring.
2. Fast user and card management without exposing low-value aggregate economy totals by default.
3. Full ability-library management, including approved abilities, names, artwork, versions, status, and edit/replacement decisions.
4. A controlled Prompt Accuracy Lab that can run Foundation → Forged → Ascendant image tests, preserve every exact generation input and output, collect structured human judgments, and queue evidence for later archetype-specific review with Claude and the team.
5. A scalable review and permission model suitable for additional team members.

This is an operations product, not a prettier statistics page. Prioritize actionable work, auditability, cost control, responsive layouts, and safe delegation.

---

## 2. Current-state findings

### What exists

- `/admin` is role-gated through `fetchIsAdmin()` and a Supabase `profiles.role` value of `user` or `admin`.
- The page loads `list_users_for_admin()` and `get_system_stats()` RPCs.
- The first screen shows six equal-weight cells: Users, Cards, Transactions, aggregate Premium, aggregate Gameplay, and Refresh.
- Users are searchable and open a drawer containing currency adjustments, cards, and ledger history.
- Ability moderation is embedded beneath the user list rather than treated as a separate workspace.
- Ability proposals can be approved, rejected, merged, or sent directly to Leonardo.
- Supabase already contains ability definitions, versions, discoveries, and canonical art metadata.
- A deterministic combat harness exists. It is unrelated to image/prompt accuracy testing.
- Leonardo generation responses already expose a per-call `cost` value in the generation job response, but the application only logs it to the console.
- The economy catalog contains estimated direct costs for forge, evolution, portrait regeneration, and text regeneration.

### What is missing or weak

- There is no admin information architecture. Users, account operations, ability moderation, analytics, and future testing all compete on one scrolling page.
- Transactions and aggregate currency balances are visually equal to Users and Cards even though they are secondary diagnostics.
- Refresh is styled as a metric card.
- The mobile screenshot is readable but vertically expensive; the background competes with administrative data and the fixed game navigation consumes scarce viewport space.
- Approved abilities are not presented as a manageable visual library. The current UI focuses on proposals and does not show a persistent approved gallery with image + name.
- Ability art generation immediately marks the prior approved asset as `replaced` before the new Leonardo request succeeds, then automatically marks new art `approved`. A failed request can leave no approved asset, and a generated image bypasses human art approval.
- Canonical ability art is saved as a data URL in database metadata. That does not scale.
- There is no prompt-test schema, no structured judgment rubric, no pending-review queue, no review-session export, and no global-change approval gate.
- Provider costs are not persisted as operational telemetry.
- Anthropic is called from the browser using `VITE_ANTHROPIC_API_KEY`. This exposes the key to clients.
- `/api/leonardo` injects the server API key but does not verify the game user, authorization, rate limit, or economy reservation.
- `/api/s3-upload` accepts an arbitrary destination URL and client-provided fields without authentication or hostname allowlisting. Treat this as a server-side request forgery and resource-abuse risk.
- `CLAUDE.md` is stale in places: it describes an older Claude model and client/localStorage architecture while code now uses Claude Haiku, Supabase, server-side Leonardo proxying, abilities, and battles.
- No Figma admin-dashboard specification was present in the reviewed snapshot. Because Figma is the canonical design source, the new responsive shell and components need a Figma checkpoint before final UI implementation.

---

## 3. Target information architecture

Do not keep adding sections to `Admin.tsx`. Create an admin route group and an admin-specific shell.

### Primary destinations

| Destination | Purpose | Default content |
| --- | --- | --- |
| Overview | Operational state and urgent work | Provider runway, Users, Cards, pending review count, failures, alerts |
| Users | Account search and management | Searchable table/cards, user detail drawer, safe account actions |
| Cards | Cross-user card management | Search/filter gallery, owner, archetype, rank, status, detail |
| Abilities | Entire ability library | Approved/proposed/experimental/deprecated tabs with image + name |
| Prompt Lab | Image/prompt accuracy testing | Test batches, tier runs, exact prompts, judgments |
| Review Queue | Team review backlog | Archetype-grouped submissions, assignments, review sessions |
| Costs & System | Secondary diagnostics | Detailed rates, per-action costs, transactions, currencies, provider/API health |

### Responsive navigation

- Desktop/tablet: compact admin sidebar or top sub-navigation inside `AdminShell`.
- Mobile: a labeled destination selector or horizontally scrollable admin tabs below the page title. Do not add seven destinations to the game’s bottom navigation.
- Preserve the existing game navigation for exiting admin, but give the admin workspace an opaque or strongly darkened content surface so data remains legible.
- Use one responsive component system. Do not create separate business logic for mobile and desktop.

**Prompt Lab exception:** Prompt Lab is intentionally not a mobile-phone feature. Support desktop/laptop and iPad-class workspaces only. At phone widths, replace the lab with an explanatory unsupported-device screen and do not expose paid generation controls. Optimize the full three-tier comparison for desktop and iPad landscape. If iPad portrait remains enabled, use a persistent collapsible control rail and a single-column test canvas; never compress three tier images into unreadable thumbnails.

### Overview priority

Above the fold, show only:

1. **Provider funds/runway** — the most visually prominent module.
2. **Users** — total, active trend, new users.
3. **Cards** — total, generated trend, failed generations if any.
4. **Work awaiting action** — prompt-review submissions and ability proposals.

Transactions, aggregate Premium, aggregate Gameplay, raw discovery totals, per-family counts, and system diagnostics belong in expandable secondary sections or Costs & System.

---

## 4. Provider balance and cost monitoring

### Truthfulness rule

Never label a calculated number as a live provider balance. Every value must carry:

- source: `provider`, `calculated`, or `manual_reconciliation`;
- `asOf` timestamp;
- freshness state;
- currency/unit;
- failure/unavailable state.

Only show a balance when it can be fetched live through a supported authenticated provider mechanism. Do not show an estimated balance, manually reconciled balance, or locally reconstructed balance. If Claude cannot establish a reliable live method, show `Live balance unavailable` with provider status and troubleshooting details instead of a number.

### Provider adapters

Create a server-only adapter interface:

```ts
interface ProviderTelemetryAdapter {
  provider: 'anthropic' | 'leonardo';
  getAccountSummary(range: DateRange): Promise<ProviderAccountSummary>;
  getUsageBreakdown(range: DateRange): Promise<ProviderUsageBucket[]>;
}
```

#### Anthropic

- Move all Messages API traffic behind a server endpoint first.
- Use a separate server-only Anthropic Admin API key for usage/cost reporting; never reuse or expose it to clients.
- Pull official Usage and Cost reports where the account supports them.
- During Phase 0, Claude must actively test the authenticated Anthropic administrative/account APIs available to this project and determine whether the current balance can be fetched live. Prefer documented provider APIs. Record the tested endpoints, authentication requirements, response behavior, and conclusion.
- If a supported live balance cannot be obtained, do not calculate or display a substitute balance. Continue to display live/official usage and cost information when available, while marking balance unavailable.
- Record actual model, input tokens, output tokens, cache tokens when applicable, request ID, operation, duration, and calculated/official cost for every game request.

#### Leonardo

- Use the project's authenticated Leonardo Production API access during Phase 0 to test whether a supported account/balance endpoint is available. Claude must investigate the actual API behavior rather than stopping at documentation search.
- Prefer a supported provider endpoint or provider-supported SDK. Do not ship browser scraping or an undocumented endpoint that can silently break. If no safe live mechanism exists, display balance as unavailable and document the blocker for later re-checking.
- Persist the official `cost` object returned by every generation response.
- Do not use manual reconciliation or a calculated substitute for the displayed balance.
- Record generation ID, model ID, dimensions, image count, Alchemy flag, init-image use, status, moderation outcome, duration, and provider-reported cost.

### Internal cost ledger

Add an append-only `api_usage_events` table. One row per external call, never one aggregate row that is repeatedly overwritten.

Minimum columns:

- `id`, `provider`, `operation`, `game_action`, `user_id` (nullable for admin tests), `card_id` (nullable), `test_run_id` (nullable);
- `provider_request_id`, `provider_generation_id`, `model`;
- `input_units`, `output_units`, `unit_type`;
- `cost_amount`, `cost_currency`, `cost_source`;
- `status`, `error_code`, `started_at`, `completed_at`, `duration_ms`;
- `metadata jsonb` for non-secret request settings.

Add indexes on `(provider, started_at)`, `(game_action, started_at)`, and `test_run_id`.

### Overview module

Each provider card should show:

- live provider balance when supported, otherwise a clear unavailable state;
- month-to-date spend;
- spend today;
- projected days remaining based on rolling seven-day spend;
- health/freshness;
- expandable breakdown.

Expanded details should show:

- exact rates or provider-reported costs;
- calls, failures, average cost, and total cost by operation;
- cost per important game function: forge, tier-up, portrait regeneration, ability art, Prompt Lab tier test;
- current catalog estimate versus observed average;
- live-check timestamp, provider response health, and link/instruction for the provider console when no live balance mechanism exists.

Do not hardcode current rates into React components. Keep provider pricing/config in versioned server-side data and show its effective date.

---

## 5. User and card management

### Users

Keep the current search and detail drawer, but move them to `/admin/users`.

Improve with:

- filters for account type, role, activity, card count, and created date;
- sorting and pagination/server-side search before the user base grows;
- clear last activity and account age;
- auditable currency adjustment history;
- confirmation for destructive or financially meaningful actions;
- empty, loading, error, and stale states.

Do not load the full user population and filter only in the browser long term.

### Cards

Create `/admin/cards` as a cross-user card gallery/table with:

- card preview using the existing `CardRenderer`;
- card name, owner, archetype, derived rank, creation date, and generation state;
- search by card name, owner email/UID, and card ID;
- filters for archetype/rank/date/status;
- detail drawer with prompt provenance when available;
- deletion/archive actions gated by confirmation and audit reason.

Card deletion is permitted only after an admin and Claude complete a documented review, address the recorded concerns, and explicitly confirm deletion. The review record must identify the card, concerns, resolution, reviewers, and deletion approval. Do not expose one-click deletion from list views.

---

## 6. Ability management redesign

Move ability management to `/admin/abilities`. Do not limit it to the proposal queue.

### Views

- **Needs review:** proposed and experimental abilities.
- **Approved:** searchable visual library.
- **Deprecated/Merged:** history and redirect context.
- **Art queue/history:** pending, generating, candidate, approved, rejected, replaced.

### Ability card/row

Always show:

- current image thumbnail;
- display name;
- family, rarity, role, slot type, resource type;
- definition status and art status separately;
- version number;
- discovery/ownership counts where useful;
- last updated and reviewer.

Selecting an ability opens a detail workspace with mechanics, versions, art history, prompt provenance, edit actions, merge comparison, and audit trail.

### Correct the art lifecycle

Use this state flow:

`pending → generating → candidate → approved | rejected`

- Keep the currently approved asset active while a replacement generates.
- A successful generation becomes `candidate`, not automatically `approved`.
- Only after an authorized reviewer approves the candidate should the old asset become `replaced` and the candidate become `approved`.
- Store image bytes in a private Supabase Storage bucket, not as a data URL in `canonical_art_assets.data`.
- Preserve prompt version, exact final prompt, negative prompt, provider settings, provider generation ID, cost, and reviewer decision.

---

## 7. Prompt Accuracy Lab

The Prompt Lab is a production-like test runner, not a second forge page.

### Screenshot audit — current harness

The current Prompt Lab screenshots confirm several valuable capabilities that must be preserved:

- Foundation, Forged, and Ascendant images appear side by side for direct progression comparison.
- Multiple archetypes can be selected and submitted to Leonardo as a batch.
- Per-archetype assertions expose prompt/palette failures.
- Identity inputs and tier status are visible within each archetype test.

Current usability problems:

- Global navigation consumes a large portion of the horizontal workspace while the Prompt Lab controls disappear above the viewport during long reviews.
- Batch actions are large, equally weighted buttons with no single queue summary, cost preview, or clear recommended next action.
- Cryptic `F`, `Fg`, and `A` status strings require interpretation instead of scanning.
- Selection depends on a small checkbox and border change; selected scope is easy to lose while scrolling.
- Test identity, assertions, prompts, failures, images, and actions are stacked into the same card without clear layers.
- Two archetype cards per row work on a wide monitor but make comparison dense; the layout needs an intentional desktop/touch-tablet breakpoint rather than general mobile responsiveness.
- The bright parchment global shell and translucent test surfaces compete with the background, reducing technical-text contrast.

### Target Prompt Lab workspace

Use a three-region desktop/iPad workbench:

1. **Compact global admin navigation** — exit to Overview, Users, Cards, Abilities, and Costs without dominating the workspace.
2. **Sticky Prompt Lab control rail** — remains usable while the test canvas scrolls.
3. **Main comparison canvas** — archetype chains, prompts, assertions, judgments, and review details.

Do not place primary generation controls back in the scrolling page header.

### Sticky control rail

The Prompt Lab control rail should include these ordered groups:

1. **Test scope**
   - archetype search/filter;
   - selected count;
   - Select all, clear selection, incomplete only, failed only;
   - persistent summary of which archetypes are selected.
2. **Pipeline stage**
   - Foundation;
   - Foundation → Forged;
   - Forged → Ascendant;
   - complete missing tiers only;
   - prevent invalid tier actions when prerequisite images are absent.
3. **Batch request**
   - planned archetypes, planned Leonardo calls, and live/official cost preview when available;
   - queue action rather than firing immediately;
   - explicit paid-run confirmation;
   - cancel remaining queued work without discarding completed results.
4. **Queue progress**
   - queued, running, completed, failed, and skipped totals;
   - active archetype/tier;
   - retry failed calls;
   - preserve results if the operator scrolls or changes the visible filters.
5. **View and review controls**
   - Grid, Focus Comparison, and Needs Judgment views;
   - status, archetype, element/family, and issue filters;
   - sort by archetype, newest result, failures, or review age.

The rail must be independently scrollable if its content exceeds the viewport, while its batch status and primary action remain pinned within the rail.

### Main comparison canvas

Keep the three-tier sequence as the central visual object:

- Foundation, Forged, and Ascendant always use the same tier order and aligned image stage.
- Replace abbreviations with labeled status badges: `Foundation ready`, `Forged failed`, `Ascendant not run`, and similar.
- Make selection state unmistakable across the full archetype panel, not just the checkbox.
- Keep archetype name, element/family, and chain health in a compact sticky panel header.
- Desktop wide view may show two archetype panels per row only when each three-tier comparison remains comfortably legible.
- iPad and narrower desktop layouts use one archetype panel per row.
- Empty tier slots should explain the next valid action instead of showing only a dash.

Each archetype panel should separate information into layers:

- **Comparison:** three aligned images, tier statuses, identity-continuity indicator, synchronized enlarge/zoom.
- **Test identity:** role, sex, body, skin, hair, clothing/armor, locked features, and lineage inputs in a collapsible summary.
- **Assertions:** pass/fail totals first; expand to individual assertions and failure evidence.
- **Prompt provenance:** final prompt, negative prompt, Claude input/output, Leonardo settings, cost, and copy controls.
- **Judgment:** rubric, issue tags, notes, and review disposition.

Do not allow long identity text or assertion output to push the comparison images out of view by default.

### Focus Comparison mode

Preserve and improve side-by-side tier review with a dedicated focus mode:

- open one archetype chain across the available canvas;
- show all three tiers at equal visual weight;
- synchronized zoom and pan for anatomy, clothing, hair, and identity comparison;
- optional image-only view and image-plus-evidence view;
- tier-to-tier prompt diff, with changed prompt clauses highlighted;
- assertion and judgment summaries aligned beneath the relevant tier;
- previous/next selected archetype navigation without closing focus mode;
- one action to submit the completed chain for later archetype review.

### Batch behavior

Batch Leonardo requests are a first-class retained feature, not a convenience button:

- build an explicit queue from the selected archetypes and chosen stage;
- deduplicate requests for tiers already complete unless `regenerate` is deliberately chosen;
- validate all prerequisites before paid calls begin;
- show the exact planned request count and official/live cost information available to the system;
- use controlled concurrency rather than firing every request simultaneously;
- persist each result independently so partial batch success is safe;
- support retrying only failed items;
- record who launched the batch and the shared batch intent;
- keep the queue visible and controllable throughout scrolling and review.

### Visual cohesion

- Use the fantasy landscape as subdued environmental texture, not as the reading surface for diagnostic text.
- Use opaque or near-opaque obsidian work panels with parchment/gold framing and restrained magical status accents.
- Reserve the fantasy display typeface for page, archetype, and section headings; use the body/technical typeface for prompts, settings, assertions, and metadata.
- Increase technical-text contrast and keep error, warning, running, complete, and selected states tokenized and consistent.
- Use existing archetype colors as identifiers, not as the sole status signal.
- Reduce the visual authority of the global game header inside Prompt Lab so the testing workspace receives the available screen area.

### Test workflow

1. Create a test batch.
2. Select one archetype and test intent.
3. Choose Foundation-only or full Foundation → Forged → Ascendant chain.
4. Set controlled inputs or allow the normal generators to roll them.
5. Preview the planned call count and estimated cost.
6. Require explicit confirmation before paid calls.
7. Run each tier through the same production services used by the game.
8. Persist exact inputs, intermediate prompts/responses, provider settings, costs, outputs, and errors.
9. Present the generated image beside prompt provenance.
10. Collect a structured human judgment.
11. Submit the completed chain to the archetype review queue.

The lab must call shared generation services. Do not copy prompt-building logic into admin components; copied logic would make tests lie about production.

### Exact provenance to capture

For every tier run preserve, without secrets:

- archetype, rank, stats, whisper words, modifier stack, modifier lineage;
- locked character identity and archetype-specific identity data;
- Ascendant narrative/path when present;
- exact Claude request prompt and model settings;
- raw Claude response and parsed result;
- whether any local fallback was used;
- final prompt after fallback, merging, and truncation;
- final negative prompt after truncation;
- prompt template/version identifiers;
- Leonardo request settings, including model, dimensions, image count, Alchemy, init strength, and init-image object reference;
- provider request/generation IDs, cost object, timestamps, duration, status, and moderation result;
- generated image storage object path and thumbnail path;
- parent tier run ID so identity continuity is reviewable.

Never store API keys, authorization headers, presigned upload fields, or permanent signed URLs.

### Judgment rubric

Use 1–5 ratings plus issue tags and notes for:

- overall acceptance;
- archetype fidelity;
- tier fidelity/progression;
- identity continuity across tiers;
- prompt-to-image accuracy;
- body-type representation;
- skin tone/visible complexion accuracy;
- hair texture/style accuracy;
- clothing/cultural/fantasy direction accuracy;
- pose/composition/card crop suitability;
- anatomy/artifacts;
- lore-visible-detail accuracy;
- safety/moderation false positive.

Required final disposition:

- keep as successful evidence;
- regenerate with same prompt;
- archetype prompt change candidate;
- global prompt change candidate;
- model/settings investigation;
- reject as unusable.

Permit notes at the tier level and one chain-level comparison note.

### Storage model

Use relational metadata plus private object storage.

Recommended tables:

- `prompt_test_batches` — owner, archetype, intent, status, planned/actual cost, created/completed timestamps.
- `prompt_test_runs` — one row per tier attempt with parent run, production input snapshot, model/settings, provenance, result, and object paths.
- `prompt_test_judgments` — rubric scores, issue tags, notes, disposition, reviewer, submitted timestamp.
- `prompt_review_items` — queue status, archetype, priority, assignee, batch/run references.
- `prompt_review_sessions` — session scope, participants, generated dossier path/version, outcome.
- `prompt_change_proposals` — scope (`archetype` or `global`), proposed patch, evidence links, status, approvals.
- `admin_audit_log` — actor, action, target, before/after summary, reason, timestamp.

Recommended private bucket layout:

```text
prompt-test-artifacts/{archetype}/{batch_id}/{tier}/{run_id}/
  source.webp
  output.webp
  thumb.webp
```

Use compressed WebP thumbnails for lists and load the full image only in detail/review views.

**Thirty-day image retention rule:**

- An unreviewed Prompt Lab image expires 30 days after generation.
- At expiration, delete the source/output/thumbnail image objects automatically.
- Retain the full textual record: exact prompts, negative prompts, model/settings, tier inputs, costs, admin judgment, ratings, issue tags, notes, disposition, and audit timestamps.
- Mark the run `image_expired` and show that the evidence image was removed under retention policy.
- A review started before expiration may place a temporary retention hold until that review session concludes.
- Evidence attached to an approved or still-active change proposal must not be deleted silently; the retention job must flag the conflict for admin resolution.

### Review dossiers

The database and object storage are the source of truth. Do not maintain one ever-growing Markdown file.

When a review session starts, generate one compact dossier per archetype and session, for example:

`docs/review-sessions/2026-07-19/barbarian.md`

The dossier should contain:

- batch/run IDs and storage object references;
- thumbnails or resolvable review references, never embedded base64;
- tier-by-tier exact final prompts and negative prompts;
- structured scores, issue tags, and human notes;
- frequency summaries and representative failures;
- unresolved questions and candidate changes;
- explicit separation between archetype-specific and global proposals.

The export is a review artifact, not a second database. Regenerate it from structured records when needed.

### Pending-review awareness

The application cannot make Claude Code spontaneously contact Raheem. Implement two reliable signals:

1. Admin Overview banner/badge: “Prompt reviews waiting,” grouped by archetype and age.
2. Repository command or Claude skill that checks pending counts at the beginning of relevant Claude Code sessions and asks Raheem whether to start a review.

Recommend a reusable Claude skill after the database/export workflow is stable and has been used at least three times. Until then, add an explicit script such as `npm run admin:review-status` plus instructions in `CLAUDE.md` to check it when starting prompt/art-direction work.

---

## 8. Approval and team governance

For the current release, only Raheem and his partner will hold the `admin` role. Both receive full operational admin control. Do not build speculative additional roles or partial-permission UI yet.

Keep authorization boundaries centralized so permission-based roles can be added later without rewriting every admin page. The future capabilities below are an extension map, not current roles:

Minimum capabilities:

- view operational dashboard;
- view users/cards;
- adjust currency;
- moderate abilities;
- generate paid art;
- judge prompt tests;
- manage review sessions;
- approve archetype prompt changes;
- approve global prompt changes;
- manage team permissions.

Raheem must remain the only identity able to approve a global prompt change unless he explicitly delegates that specific approval later. Raheem's partner retains full control over all other current admin operations.

Global proposal flow:

`draft → evidence_ready → awaiting_raheem → approved | rejected → implemented → verified`

- A global change may be drafted by the team or Claude.
- It may not modify production prompt templates, global negative prompts, provider defaults, or global diversity rules before Raheem’s recorded approval.
- Store approver ID, timestamp, evidence set, exact proposed diff, and implementation commit/version.
- Archetype-specific changes must still be auditable, but may use a separately delegated approval permission.

Implement only `user` and `admin` now. Store sensitive action checks in centralized authorization helpers so later roles and limited permissions can be introduced through migrations and capability mappings.

---

## 9. Server/API security prerequisites

Complete these before exposing provider telemetry or the Prompt Lab in production:

1. Move Anthropic requests from the browser to a server function; remove `VITE_ANTHROPIC_API_KEY` from client builds and rotate the exposed key.
2. Verify Supabase access tokens server-side for every generation and admin endpoint.
3. Check admin/capability authorization on the server, not only in React.
4. Restrict Leonardo proxy paths and methods to an allowlist; do not provide a general authenticated passthrough.
5. Add per-user/admin rate limits, request size limits, paid-call confirmations, and idempotency keys.
6. Restrict `/api/s3-upload` to Leonardo-owned presigned destinations, validate request shape and decoded image size/type, and require an authorized session; preferably eliminate this relay by moving the complete upload workflow server-side.
7. Keep provider API keys and Anthropic Admin API keys only in server environment variables.
8. Add structured error logging without prompts containing unnecessary personal data or any secrets.
9. Use RLS for test/review tables plus server-side capability checks for sensitive mutations.

---

## 10. Component and design-system plan

Create reusable admin components only after checking existing components/tokens:

- `AdminShell`
- `AdminSectionNav`
- `OperationalSummaryCard`
- `ProviderBalanceCard`
- `ExpandableMetricGroup`
- `StatusBadge`
- `DataTable` with responsive card fallback
- `FilterBar`
- `DetailDrawer`
- `AbilityLibraryCard`
- `PromptTierTimeline`
- `PromptProvenancePanel`
- `JudgmentRubric`
- `ReviewQueueBanner`
- `ConfirmPaidActionDialog`

Use existing Tailwind v4 theme tokens. The current token set does not yet define a complete admin surface, spacing, radius, elevation, semantic status, or data-visualization system. Extend tokens deliberately in Figma first, then mirror them in code. Avoid inline style proliferation.

### Approved visual direction

No external admin template is required. Design a custom, cohesive admin workspace using the game's existing resources and visual language:

- preserve the fantasy landscape as environmental identity, but heavily subdue it behind opaque or near-opaque operational surfaces;
- use the existing parchment, bone, gold, obsidian, and muted magical accent language;
- reuse existing card artwork, currency imagery, ability art, fantasy typography, borders, and icon resources where they improve recognition;
- keep dense operational content calm and legible rather than decorating every surface;
- give provider funds, pending work, and destructive approvals strong hierarchy;
- make Prompt Lab feel visually connected to the Forge while remaining an expert testing workspace;
- create reusable Figma components, Auto Layout, variants, variables, and responsive constraints before final code implementation.

The goal is a purpose-built fantasy operations dashboard that belongs to this game, not a reskinned generic SaaS panel.

Figma deliverables before final UI build:

- mobile Overview;
- desktop Overview;
- desktop Prompt Lab with sticky control rail and two-panel comparison canvas;
- iPad landscape Prompt Lab with sticky control rail and single-panel comparison canvas;
- Prompt Lab Focus Comparison mode;
- unsupported phone screen for Prompt Lab;
- desktop Prompt Lab run/detail;
- approved Ability library and ability detail;
- component variants and states: loading, stale, error, empty, pending, approved, rejected, disabled, destructive confirmation.

Exact dimensions, spacing, colors, typography, and breakpoints must come from the approved Figma design or existing implementation tokens—not estimates in this plan.

---

## 11. Implementation sequence

### Phase 0 — Safety, instrumentation, and decision spike

- Rotate/remove the exposed Anthropic browser key and create the server Messages endpoint.
- Secure/replace Leonardo and S3 proxy behavior.
- Use the authenticated provider APIs to investigate and test supported live balance access; document every viable and rejected approach.
- Add `api_usage_events` and record provider-reported costs.
- Configure only Raheem and his partner as full operational admins; preserve the Raheem-only global prompt approval gate.
- Update `CLAUDE.md` and architecture documentation to current reality.

**Exit:** no provider/admin secret reaches the browser; actual per-call cost events persist; Claude has tested live balance access against the authenticated provider APIs; unsupported balance fields are clearly identified and never estimated.

### Phase 1 — Admin shell and Overview

- Split the route into admin destinations.
- Implement responsive admin navigation.
- Make provider funds/runway, Users, Cards, and pending work the only primary overview modules.
- Move low-value aggregates into expandable diagnostics.

**Exit:** screenshot-sized mobile viewport has clear hierarchy, no metric clutter, and direct access to work queues.

### Phase 2 — Costs & System

- Implement provider adapters, usage aggregation, freshness/error handling, observed per-action costs, and expandable rate details.
- Compare observed costs with `API_COST_CATALOG` estimates without silently overwriting catalog values.

**Exit:** owner can see what remains, what was spent, what each core game action actually costs, and how trustworthy/fresh each number is.

### Phase 3 — Users and Cards

- Move current user tooling into its destination.
- Add server-side search/filter/pagination.
- Build cross-user card management and auditable safe actions.

**Exit:** user/card operations no longer share the Overview or require a long page scan.

### Phase 4 — Ability workspace

- Build approved/proposed/deprecated library views.
- Show image + name everywhere an art decision is made.
- Correct candidate/approval/replacement lifecycle.
- Migrate canonical images from data URLs to private object storage.

**Exit:** an admin can inspect an approved ability after approval, compare replacements, and make a reversible art decision.

### Phase 5 — Prompt Lab foundation

- Add test schema, bucket, service layer, and exact provenance instrumentation.
- Run Foundation-only tests first.
- Add cost preview/confirmation and structured judgment.

**Exit:** a Foundation test can be reproduced from stored inputs and reviewed without consulting console logs.

### Phase 6 — Full tier chains and review workflow

- Add linked Foundation → Forged → Ascendant tests.
- Add identity-continuity comparison and tier timeline.
- Add archetype grouping, queue, assignments, dossiers, and pending banners.
- Add global change proposal gate with Raheem-only approval.

**Exit:** the team can batch evidence, pause for weeks, resume by archetype, and reach an auditable prompt decision without loading giant files.

### Phase 7 — QA and rollout

- Test authorization/RLS, paid-call idempotency, rate limits, and audit events.
- Test mobile, tablet, and desktop layouts against Figma.
- Test failed/blocked/timed-out provider calls and stale telemetry.
- Test thumbnail lazy loading and large review queues.
- Run accessibility checks: keyboard navigation, focus management, labels, contrast, reduced motion.
- Backfill/migrate art references without deleting originals until verified.

**Exit:** production rollout can be enabled by feature flags and reverted without data loss.

---

## 12. Required tests and acceptance criteria

### Security

- No provider or Admin API secret appears in client JavaScript, network responses, logs, or stored prompt provenance.
- Non-admin users cannot access admin data by calling APIs directly.
- Permission checks reject unauthorized paid calls and global approvals.
- Arbitrary outbound URLs cannot be submitted to the S3 relay.

### Cost telemetry

- Every successful and failed provider call creates one idempotent usage event.
- Provider-reported cost is preferred over estimates.
- No estimated or manually reconstructed balance is displayed.
- A balance value renders only after a successful live provider check and includes its check timestamp.
- Stale/unavailable telemetry never silently displays zero.

### Abilities

- Approved gallery shows image and name at minimum.
- Failed replacement generation leaves the current approved art unchanged.
- New art requires candidate approval.
- Art history remains queryable.

### Prompt Lab

- A reviewer can inspect every exact tier input, Claude prompt/response, final Leonardo prompt, negative prompt, settings, cost, and image.
- Tests use the same shared production services as real card generation.
- Judgments are saved by tier and archetype.
- Review items survive logout/deployment and can be resumed later.
- Exports reference images without embedding giant base64 blobs.
- A global proposal cannot be implemented without Raheem’s recorded approval.

### Responsive UX

- Primary actions remain reachable and labeled on narrow mobile screens.
- Data tables have an intentional mobile representation.
- Long prompts wrap/collapse safely and support copy.
- Drawers/dialogs trap focus, close predictably, and do not hide behind the fixed bottom navigation.
- Prompt Lab paid controls are unavailable at phone widths and replaced with an intentional unsupported-device message.
- Prompt Lab controls remain available while its main comparison canvas scrolls.
- iPad landscape and desktop preserve a legible three-tier comparison without horizontal page scrolling.

---

## 13. Documentation synchronization

Update these canonical project sources as part of implementation:

- `CLAUDE.md` — current model, server-side API architecture, admin route map, Prompt Lab status, cost telemetry, security rules.
- `WORKFLOW.md` — review-session workflow, Raheem approval gate, dossier generation, test data retention.
- New `docs/admin-operations-dashboard-spec.md` — information architecture, permissions, telemetry truthfulness rules, acceptance criteria.
- New `docs/prompt-accuracy-lab-spec.md` — data contracts, provenance, rubric, storage/retention, review/export workflow.
- `card-engine-ability-system-spec.md` — corrected candidate art approval/replacement lifecycle and object storage.
- Supabase README/migration index — new tables, bucket, RLS, functions, and operational setup.
- Figma — admin page frames, reusable components, variants, variables, and responsive behavior.

Do not mark a phase complete until its related documentation is synchronized.

---

## 14. Claude Code execution rules

1. Treat this document as an approved direction, not permission to invent exact visual values or team roles.
2. Before each phase, inspect the latest snapshot and relevant Figma frames.
3. Present the Phase 0 provider-capability findings to Raheem before labeling any value “live balance.” Do not implement additional roles during this initiative.
4. Reuse production generation services for Prompt Lab; refactor shared services before building the UI if necessary.
5. Use migrations; do not edit production data manually.
6. Preserve existing approved ability art until replacement approval completes.
7. Never apply a global prompt change without explicit Raheem approval recorded in the change proposal.
8. Verify each phase with automated tests, production build, and responsive visual review.
9. Work in small reviewable commits and keep unrelated game changes out of this initiative.

---

## 15. Resolved decisions and remaining checkpoint

### Resolved decisions

1. Only Raheem and his partner are admins; both have full operational control. Additional roles and limited permissions are deferred.
2. Display provider balances only when they can be checked live. Claude must investigate using the authenticated APIs. Never show an estimated or manual substitute.
3. Unreviewed Prompt Lab image files expire after 30 days; retain all associated text, prompts, settings, judgments, and audit metadata.
4. A card may be deleted only after an admin-and-Claude review is complete, concerns are addressed, and deletion is explicitly confirmed and audited.
5. Build a custom, beautiful, cohesive dashboard from the current game theme and resources. External templates are not required.

### Remaining approval checkpoint

- Figma approval of the admin shell, Overview hierarchy, Ability library, and Prompt Lab review views before final implementation styling.

Everything else above can be developed incrementally behind feature flags once Phase 0 security and data foundations are complete.
