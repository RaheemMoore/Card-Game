import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CardForge } from './pages/CardForge';
import { Landing } from './pages/Landing';
import { Collection } from './pages/Collection';
import { CardDetail } from './pages/CardDetail';
import { AdminShell } from './components/admin/AdminShell';
import { AdminOverview } from './pages/AdminOverview';
import { AdminUsers } from './pages/AdminUsers';
import { AdminCards } from './pages/AdminCards';
import { AdminCosts } from './pages/AdminCosts';
import { AdminAbilities } from './pages/AdminAbilities';
import { AdminDiagnostics } from './pages/AdminDiagnostics';
import { AdminPromptLab } from './pages/AdminPromptLab';
import { ArchetypeWorkshop } from './pages/ArchetypeWorkshop';
import { Codex } from './pages/Codex';
import { Battle } from './pages/battle';
import { ForgeStrike } from './pages/minigames/forge-strike';
import { MiniGamesHub } from './pages/minigames/MiniGamesHub';
import { Castle } from './pages/castle';
import { CourtyardSample } from './pages/castle/sample';
import { TowerViewport } from './pages/castle/TowerViewport';
import { CodexFamily } from './pages/CodexFamily';
import { CodexAbility } from './pages/CodexAbility';
import { CodexElements } from './pages/CodexElements';
import { DevAbilities } from './pages/DevAbilities';
import { DevSeedBattle } from './pages/DevSeedBattle';
import { SpritePreview } from './pages/dev/SpritePreview';
import { BossReadout } from './pages/dev/BossReadout';
import { M55Harness } from './pages/M55Harness';
import { PlayerShell } from './layouts/PlayerShell';
import { PersistenceGate } from './components/PersistenceGate';
import { Login } from './pages/Login';

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
          {/* The real login screen. Stays a route so the art can be checked
              directly; the session gate renders the same page when signed out. */}
          <Route path="/login" element={<Login />} />

          {/* Art tooling. Deliberately OUTSIDE PlayerShell and the session
              gate: it reads only manifests and locally-picked PNGs, touches no
              player data, and is used while iterating on generated sprites —
              needing a signed-in session to look at a sprite sheet is friction
              with nothing behind it. */}
          <Route path="/dev/sprite-preview" element={<SpritePreview />} />

          {/* Boss readout — the fight on paper, for review and for showing
              people. Same reasoning as above: it reads the shipped boss
              definitions and runs the combat reducer in-memory, so it touches
              no player data and gating it behind a login would only add
              friction to sharing it. */}
          <Route path="/dev/boss-readout" element={<BossReadout />} />

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
            <Route path="/collection" element={<Collection />} />
            <Route path="/card/:cardId" element={<CardDetail />} />
            <Route path="/codex" element={<Codex />} />
            <Route path="/codex/elements" element={<CodexElements />} />
            <Route path="/codex/family/:familyId" element={<CodexFamily />} />
            <Route path="/codex/ability/:abilityId" element={<CodexAbility />} />
            <Route path="/battle" element={<Battle />} />
            <Route path="/minigames" element={<MiniGamesHub />} />
            <Route path="/minigames/forge-strike" element={<ForgeStrike />} />
            <Route path="/castle" element={<Castle />} />
            <Route path="/castle/tower/:floor" element={<TowerViewport />} />
            <Route path="/dev/courtyard-sample" element={<CourtyardSample />} />
            <Route path="/dev/abilities" element={<DevAbilities />} />
            <Route path="/dev/seed-battle" element={<DevSeedBattle />} />
            <Route path="/m55harness" element={<M55Harness />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PersistenceGate>
  );
}
