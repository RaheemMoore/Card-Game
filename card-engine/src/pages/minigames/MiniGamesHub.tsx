import { Link } from 'react-router-dom';

/**
 * Mini Games hub — the landing page reached from the "Mini Games" nav item.
 * Lists the games we've built; each tile routes into that game's own
 * pre-game character-select screen. Default styling for now — visuals will
 * follow once we design them.
 */

interface GameEntry {
  to: string;
  title: string;
  icon: string;
  blurb: string;
}

const GAMES: GameEntry[] = [
  {
    to: '/minigames/forge-strike',
    title: 'Forge Strike',
    icon: '🔥',
    blurb: 'Temper a single card at the forge — pick a card and a stat, then strike.',
  },
  {
    to: '/battle',
    title: 'Boss Battle',
    icon: '⚔',
    blurb: 'Take a party of three into turn-based combat against a boss.',
  },
];

export function MiniGamesHub() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-fantasy text-3xl text-bone mb-2">Mini Games</h1>
      <p className="text-sm text-bone/70 mb-6">Choose a game to play.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES.map((game) => (
          <Link
            key={game.to}
            to={game.to}
            className="rounded-lg border border-bone/20 bg-void/40 p-6 transition-colors hover:border-gold/60 hover:bg-gold/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <div className="text-4xl mb-3" aria-hidden>
              {game.icon}
            </div>
            <div className="font-fantasy text-xl text-bone mb-1">{game.title}</div>
            <div className="text-sm text-bone/60">{game.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
