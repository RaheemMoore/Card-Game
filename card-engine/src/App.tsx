import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CardForge } from './pages/CardForge';
import { Landing } from './pages/Landing';
import { CardDetail } from './pages/CardDetail';
import { AdminShell } from './components/admin/AdminShell';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminCards } from './pages/admin/AdminCards';
import { AdminCosts } from './pages/admin/AdminCosts';
import { AdminAbilities } from './pages/admin/AdminAbilities';
import { AdminDiagnostics } from './pages/admin/AdminDiagnostics';
import { AdminPromptLab } from './pages/admin/AdminPromptLab';
import { ArchetypeWorkshop } from './pages/admin/ArchetypeWorkshop';
import { Codex } from './pages/Codex';
import { Battle } from './pages/battle';
import { ForgeStrike } from './pages/minigames/forge-strike';
import { MiniGamesHub } from './pages/minigames/MiniGamesHub';
import { Castle } from './pages/castle';
import { CastleV2 } from './pages/castle/v2/CastleV2';
import { CodexFamily } from './pages/CodexFamily';
import { CodexAbility } from './pages/CodexAbility';
import { CodexElements } from './pages/CodexElements';
import { CollectionRoute } from './pages/CollectionRoute';
import { PlayerShell } from './layouts/PlayerShell';
import { PersistenceGate } from './components/PersistenceGate';
import { Login } from './pages/Login';

/**
 * Whether the /dev/* review surfaces are built into this bundle.
 *
 * NOT `import.meta.env.DEV`. That is false for every `vite build`, including
 * Vercel PREVIEW deploys — and preview is where the harnesses actually get used,
 * because the provider secrets are Preview/Prod-only and generation cannot run
 * locally. Gating on DEV would have deleted /dev/boss-readout,
 * /dev/ability-theater, /dev/decision-lab and /dev/ui-kit from the one build
 * they are reviewed on.
 *
 * So it is an explicit flag, and it DEFAULTS TO ON: an unset variable keeps the
 * routes, which means forgetting to configure an environment can never silently
 * remove a review surface. Only a deliberate `VITE_DEV_ROUTES=false` — set on the
 * production environment in Vercel — drops them.
 *
 * Vite statically replaces `import.meta.env.*` at build time, so this folds to a
 * literal and the lazy chunks below are never emitted when it is false. That is
 * what keeps ~290 KB of dev tooling out of the player download.
 */
const DEV_ROUTES = import.meta.env.VITE_DEV_ROUTES !== 'false';

/**
 * Each ternary wraps its own `import()` INLINE rather than going through a helper.
 * That is load-bearing, not style: routing the import through a shared function hid
 * it from static analysis, the bundler could not prove the loader was unreachable,
 * and every chunk was emitted anyway — a verified build with the flag off was byte
 * for byte the same size. Folding the condition must delete the `import()` itself.
 */

const CourtyardSample = DEV_ROUTES
  ? lazy(() => import('./pages/castle/sample').then((m) => ({ default: m.CourtyardSample })))
  : null;
const DevAbilities = DEV_ROUTES
  ? lazy(() => import('./pages/dev/DevAbilities').then((m) => ({ default: m.DevAbilities })))
  : null;
const DevSeedBattle = DEV_ROUTES
  ? lazy(() => import('./pages/dev/DevSeedBattle').then((m) => ({ default: m.DevSeedBattle })))
  : null;
const SpritePreview = DEV_ROUTES
  ? lazy(() => import('./pages/dev/SpritePreview').then((m) => ({ default: m.SpritePreview })))
  : null;
const BossReadout = DEV_ROUTES
  ? lazy(() => import('./pages/dev/BossReadout').then((m) => ({ default: m.BossReadout })))
  : null;
const AbilityTheater = DEV_ROUTES
  ? lazy(() => import('./pages/dev/AbilityTheater').then((m) => ({ default: m.AbilityTheater })))
  : null;
const DecisionLab = DEV_ROUTES
  ? lazy(() => import('./pages/dev/DecisionLab').then((m) => ({ default: m.DecisionLab })))
  : null;
const UiKit = DEV_ROUTES
  ? lazy(() => import('./pages/dev/UiKit').then((m) => ({ default: m.UiKit })))
  : null;
const CollectionStallPreview = DEV_ROUTES
  ? lazy(() => import('./pages/dev/CollectionStallPreview').then((m) => ({ default: m.CollectionStallPreview })))
  : null;
const StallShellPreview = DEV_ROUTES
  ? lazy(() => import('./pages/dev/StallShellPreview').then((m) => ({ default: m.StallShellPreview })))
  : null;
const ForgeStallPreview = DEV_ROUTES
  ? lazy(() => import('./pages/dev/ForgeStallPreview').then((m) => ({ default: m.ForgeStallPreview })))
  : null;
const CodexStallPreview = DEV_ROUTES
  ? lazy(() => import('./pages/dev/CodexStallPreview').then((m) => ({ default: m.CodexStallPreview })))
  : null;
const PauseMenuPreview = DEV_ROUTES
  ? lazy(() => import('./pages/dev/PauseMenuPreview').then((m) => ({ default: m.PauseMenuPreview })))
  : null;
const M55Harness = DEV_ROUTES
  ? lazy(() => import('./pages/dev/M55Harness').then((m) => ({ default: m.M55Harness })))
  : null;
const PhaserSchool = DEV_ROUTES
  ? lazy(() => import('./pages/dev/PhaserSchool').then((m) => ({ default: m.PhaserSchool })))
  : null;
const WildlifeAnimationLab = DEV_ROUTES
  ? lazy(() => import('./pages/dev/WildlifeAnimationLab').then((m) => ({ default: m.WildlifeAnimationLab })))
  : null;
const LightLab = DEV_ROUTES
  ? lazy(() => import('./pages/dev/LightLab').then((m) => ({ default: m.LightLab })))
  : null;
const ScenePreview = DEV_ROUTES
  ? lazy(() => import('./pages/dev/ScenePreview').then((m) => ({ default: m.ScenePreview })))
  : null;

/**
 * The V2 courtyard preview stays on `DEV` rather than the flag above: it pulls in
 * 5.6 MB of dev-preview art, and it is a local walk-through rather than something
 * reviewed on a deploy.
 */
const CourtyardV2Preview = import.meta.env.DEV
  ? lazy(() =>
      import('./pages/castle/v2-preview').then((module) => ({ default: module.CourtyardV2Preview })),
    )
  : null;

// Wallet + card-store initialization now happens inside PersistenceGate,
// which awaits Supabase auth + migration + hydrate before the router
// mounts. On the legacy path (no VITE_SUPABASE_URL) PersistenceGate
// falls through immediately with the same initializeWallet() call.

/**
 * Preserves the query string when the retired /admin/workshop path redirects to
 * /admin/proposals. A bare <Navigate to="/admin/proposals"> would drop
 * ?archetype=&proposal=, so a bookmarked link to one specific proposal would
 * silently land on the page with nothing selected.
 */
function WorkshopRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/admin/proposals', search }} replace />;
}

export default function App() {
  return (
    <PersistenceGate>
      <BrowserRouter>
        <Routes>
          {/* Phaser School — the world-authoring syllabus. Outside PlayerShell
              and the session gate for the same reason as the art tooling: it is
              a studio surface with its own full-viewport chrome, reads no player
              data, and is used with Phaser Editor open beside it. */}
          {PhaserSchool && (
            <Route
              path="/dev/phaser-school"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <PhaserSchool />
                </Suspense>
              }
            />
          )}

          {WildlifeAnimationLab && (
            <Route
              path="/dev/wildlife-animation-lab"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading animation lab…</p>}>
                  <WildlifeAnimationLab />
                </Suspense>
              }
            />
          )}

          {/* Scene Preview — what Phaser Editor's Play button hands off to.
              Generic on purpose: `?start=<SceneName>` is what the Editor's
              Preview Scene command appends, so one route serves every scene. */}
          {ScenePreview && (
            <Route
              path="/dev/scene"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <ScenePreview />
                </Suspense>
              }
            />
          )}

          {/* Light Lab — the runtime half of Phaser School lesson 4. Sits beside
              the school for the same reason: it is a studio surface, reads no
              player data, and lazy-loads Phaser into its own chunk. */}
          {LightLab && (
            <Route
              path="/dev/light-lab"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <LightLab />
                </Suspense>
              }
            />
          )}

          {/* The real login screen. Stays a route so the art can be checked
              directly; the session gate renders the same page when signed out. */}
          <Route path="/login" element={<Login />} />

          {/* Art tooling. Deliberately OUTSIDE PlayerShell and the session
              gate: it reads only manifests and locally-picked PNGs, touches no
              player data, and is used while iterating on generated sprites —
              needing a signed-in session to look at a sprite sheet is friction
              with nothing behind it. */}
          {SpritePreview && (
            <Route
              path="/dev/sprite-preview"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <SpritePreview />
                </Suspense>
              }
            />
          )}

          {/* Boss readout — the fight on paper, for review and for showing
              people. Same reasoning as above: it reads the shipped boss
              definitions and runs the combat reducer in-memory, so it touches
              no player data and gating it behind a login would only add
              friction to sharing it. */}
          {BossReadout && (
            <Route
              path="/dev/boss-readout"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <BossReadout />
                </Suspense>
              }
            />
          )}

          {/* Ability Theater — build and judge ability performances without
              playing a battle. Same tier as the two above: it replays canned
              event fixtures through the real compiler and renderers, reads only
              manifests, and touches no player data. Iterating on a lash by
              fighting to your turn and hoping the RNG cooperates is not a
              workflow, and it is not repeatable enough to review a change. */}
          {AbilityTheater && (
            <Route
              path="/dev/ability-theater"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <AbilityTheater />
                </Suspense>
              }
            />
          )}

          {/* Decision Lab — "can the player understand why this action
              matters?", the companion question to Ability Theater's "how does
              it perform?" Same tier: reads only frozen fixtures built by
              running the real reducer, touches no player data. */}
          {DecisionLab && (
            <Route
              path="/dev/decision-lab"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <DecisionLab />
                </Suspense>
              }
            />
          )}

          {/* Pixel UI kit gallery. Same tier as the four above: it renders four
              PNGs and touches no player data. It exists because the kit's
              premise is that variants come from props rather than new art, and
              the only way to keep that honest is to see every variant at once —
              a `border-image` with a wrong slice compiles fine and renders as
              mush, so a passing build proves nothing about this surface. */}
          {UiKit && (
            <Route
              path="/dev/ui-kit"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <UiKit />
                </Suspense>
              }
            />
          )}

          {/* The Collection case, filled from the real card factory so it can be
              reviewed without an account. Same tier: builds its own cards in
              memory, reads no player data, spends nothing. */}
          {CollectionStallPreview && (
            <Route
              path="/dev/collection-stall"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <CollectionStallPreview />
                </Suspense>
              }
            />
          )}

          {/* The shared stall case + stage rail against filler content. The
              Forge's real flow needs a session AND premium currency at its last
              step, so its shell cannot be reviewed through the Forge itself. */}
          {StallShellPreview && (
            <Route
              path="/dev/stall-shell"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <StallShellPreview />
                </Suspense>
              }
            />
          )}

          {/* Forge DESIGN PREVIEW. `/forge` and pages/CardForge.tsx are the real,
              shipping flow and are deliberately untouched — Raheem: "do not
              remove it until we completely approve this." This drives the real
              stage components from local state and never calls the forge
              controller or the wallet, so it is free to open. */}
          {ForgeStallPreview && (
            <Route
              path="/dev/forge-stall"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <ForgeStallPreview />
                </Suspense>
              }
            />
          )}

          {/* The Codex as a book. Reads shipped element/emblem art and Bible
              prose only — no player data, nothing spent. `/codex` is untouched. */}
          {CodexStallPreview && (
            <Route
              path="/dev/codex-stall"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <CodexStallPreview />
                </Suspense>
              }
            />
          )}

          {/* The castle's pause menu, which otherwise only exists behind
              sign-in — the most-used surface in the game and the one nobody
              could review. Renders the real component. */}
          {PauseMenuPreview && (
            <Route
              path="/dev/pause-menu"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                  <PauseMenuPreview />
                </Suspense>
              }
            />
          )}

          {CourtyardV2Preview && (
            <Route
              path="/dev/courtyard-v2-preview"
              element={
                <Suspense fallback={<p className="p-6 text-white/60">Loading preview…</p>}>
                  <CourtyardV2Preview />
                </Suspense>
              }
            />
          )}

          {/* Admin: full-viewport professional operations surface. Mounts
              outside PlayerShell — no fantasy background, no player NavBar,
              no content offset. AdminShell owns the guard + its own chrome. */}
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="cards" element={<AdminCards />} />
            <Route path="costs" element={<AdminCosts />} />
            <Route path="abilities" element={<AdminAbilities />} />
            <Route path="diagnostics" element={<AdminDiagnostics />} />
            <Route path="prompt-lab" element={<AdminPromptLab />} />
            <Route path="proposals" element={<ArchetypeWorkshop />} />
            {/* Renamed 2026-07-31: the page is a proposal desk, and "Workshop"
                now means a working mode (see PRODUCTION.md §6). Tori has this
                path bookmarked and deep links carry ?archetype=&proposal=, so
                the old route redirects WITH its query string rather than 404ing
                or silently dropping which proposal was being opened. */}
            <Route path="workshop" element={<WorkshopRedirect />} />
          </Route>

          {/* Player: fantasy-themed shell (background + NavBar + offset). */}
          <Route element={<PlayerShell />}>
            {/* `/` resolves to the castle (or the Forge on phone portrait).
                Google SSO redirects to the bare origin, so this is what makes
                signing in land in the courtyard rather than the Forge. */}
            <Route path="/" element={<Landing />} />
            <Route path="/forge" element={<CardForge />} />
            <Route path="/collection" element={<CollectionRoute />} />
            <Route path="/card/:cardId" element={<CardDetail />} />
            <Route path="/codex" element={<Codex />} />
            <Route path="/codex/elements" element={<CodexElements />} />
            <Route path="/codex/family/:familyId" element={<CodexFamily />} />
            <Route path="/codex/ability/:abilityId" element={<CodexAbility />} />
            <Route path="/battle" element={<Battle />} />
            <Route path="/minigames" element={<MiniGamesHub />} />
            <Route path="/minigames/forge-strike" element={<ForgeStrike />} />
            {/* The courtyard Raheem built in the Phaser Editor. It replaced the
                painted-plate castle on 2026-08-08; the old one stays reachable at
                /castle/classic until the new one has been walked in production,
                because deleting the only way to the forge on a hunch is not a
                migration. Phaser is lazy-loaded into its own chunk either way. */}
            <Route path="/castle" element={<CastleV2 />} />
            <Route path="/castle/classic" element={<Castle />} />
            {CourtyardSample && (
              <Route
                path="/dev/courtyard-sample"
                element={
                  <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                    <CourtyardSample />
                  </Suspense>
                }
              />
            )}
            {DevAbilities && (
              <Route
                path="/dev/abilities"
                element={
                  <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                    <DevAbilities />
                  </Suspense>
                }
              />
            )}
            {DevSeedBattle && (
              <Route
                path="/dev/seed-battle"
                element={
                  <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                    <DevSeedBattle />
                  </Suspense>
                }
              />
            )}
            {M55Harness && (
              <Route
                path="/m55harness"
                element={
                  <Suspense fallback={<p className="p-6 text-white/60">Loading…</p>}>
                    <M55Harness />
                  </Suspense>
                }
              />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PersistenceGate>
  );
}
