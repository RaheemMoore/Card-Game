import { Link } from 'react-router-dom';
import { CardRenderer } from '../components/CardRenderer';
import type { Card } from '../types/card';

const DEMO_CARD: Card = {
  cardId: 'demo-001',
  archetype: 'Barbarian',
  rank: 'Ascendant',
  cardName: 'Kael',
  nameAndTitle: 'Kael, the Unbroken',
  portraitAsset: '/portraits/sample/raheem_ascendant.jpg',
  stats: { Power: 88, Speed: 52, Endurance: 71, Stability: 63, Support: 45, Patience: 39 },
  highestStat: 'Power',
  border: { baseVariant: 'Dominance', baseSource: 'Highest stat = Power' },
  lore: 'Born in the volcanic trenches of the Ashlands, Kael earned every scar before his fifteenth winter.',
  whisperWords: ['scarred', 'ancient', 'unbroken'],
  createdAt: new Date().toISOString(),
};

export function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-10">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="font-fantasy text-4xl md:text-5xl font-bold text-ivory tracking-wide">
          Card Engine
        </h1>
        <p className="text-ash text-lg">
          Forge unique fantasy character cards. Roll stats, whisper destiny, and build your collection.
        </p>
      </div>

      <CardRenderer card={DEMO_CARD} />

      <Link
        to="/forge"
        className="px-8 py-3 rounded-lg font-fantasy text-lg font-bold tracking-wide
          bg-gradient-to-r from-power to-endurance text-ivory
          hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-shadow"
      >
        Forge a Card
      </Link>
    </div>
  );
}
