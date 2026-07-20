import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/NavBar';

// Player-facing layout: fantasy landscape background, player NavBar, and the
// content offset/padding the player nav requires. Everything the game player
// sees renders through here via <Outlet />.
//
// Admin routes (/admin/*) intentionally do NOT render through this shell —
// they mount AdminShell directly for a full-viewport professional operations
// surface with no fantasy chrome. See App.tsx route structure.
export function PlayerShell() {
  return (
    <div className="min-h-dvh flex flex-col text-bone relative">
      {/* Fantasy background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/backgrounds/fantasy-landscape.jpg')" }}
      />
      <div className="fixed inset-0 bg-void/70" />

      <div className="relative z-10 min-h-dvh flex flex-col">
        <NavBar />
        <main className="flex-1 flex flex-col lg:pl-56 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
