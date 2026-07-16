import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CardForge } from './pages/CardForge';
import { Collection } from './pages/Collection';
import { CardDetail } from './pages/CardDetail';
import { NavBar } from './components/NavBar';
import { initialize as initializeWallet } from './services/economy/walletService';

initializeWallet();

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh flex flex-col text-bone relative">
        {/* Fantasy background */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/backgrounds/fantasy-landscape.jpg')" }}
        />
        <div className="fixed inset-0 bg-void/70" />

        <div className="relative z-10 min-h-dvh flex flex-col">
        <NavBar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<CardForge />} />
            <Route path="/forge" element={<CardForge />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/card/:cardId" element={<CardDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
