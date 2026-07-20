import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CardForge } from './pages/CardForge';
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
import { CodexFamily } from './pages/CodexFamily';
import { CodexAbility } from './pages/CodexAbility';
import { DevAbilities } from './pages/DevAbilities';
import { DevSeedBattle } from './pages/DevSeedBattle';
import { M55Harness } from './pages/M55Harness';
import { PlayerShell } from './layouts/PlayerShell';
import { PersistenceGate } from './components/PersistenceGate';

// Wallet + card-store initialization now happens inside PersistenceGate,
// which awaits Supabase auth + migration + hydrate before the router
// mounts. On the legacy path (no VITE_SUPABASE_URL) PersistenceGate
// falls through immediately with the same initializeWallet() call.

export default function App() {
  return (
    <PersistenceGate>
      <BrowserRouter>
        <Routes>
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
            <Route path="workshop" element={<ArchetypeWorkshop />} />
          </Route>

          {/* Player: fantasy-themed shell (background + NavBar + offset). */}
          <Route element={<PlayerShell />}>
            <Route path="/" element={<CardForge />} />
            <Route path="/forge" element={<CardForge />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/card/:cardId" element={<CardDetail />} />
            <Route path="/codex" element={<Codex />} />
            <Route path="/codex/family/:familyId" element={<CodexFamily />} />
            <Route path="/codex/ability/:abilityId" element={<CodexAbility />} />
            <Route path="/battle" element={<Battle />} />
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
