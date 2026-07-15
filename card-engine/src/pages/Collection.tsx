import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArchetypeName } from '../types/card';
import { ARCHETYPE_NAMES, RANKS } from '../types/card';
import type { Rank } from '../types/card';
import { getAllCards, deleteCard } from '../services/storage';
import { CardRenderer } from '../components/CardRenderer';
import { getOverallRank } from '../data/powerSystem';

type SortOption = 'newest' | 'oldest' | 'highest-atk' | 'by-rank' | 'total-stats';

export function Collection() {
  const navigate = useNavigate();
  const [cards, setCards] = useState(() => getAllCards());
  const [filterArchetype, setFilterArchetype] = useState<ArchetypeName | ''>('');
  const [filterRank, setFilterRank] = useState<Rank | ''>('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...cards];
    if (filterArchetype) result = result.filter((c) => c.archetype === filterArchetype);
    if (filterRank) result = result.filter((c) => getOverallRank(c.stats) === filterRank);

    switch (sort) {
      case 'newest':
        result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'highest-atk':
        result.sort((a, b) => b.stats.Atk.value - a.stats.Atk.value);
        break;
      case 'by-rank': {
        const rankOrder: Record<Rank, number> = { Ascendant: 0, Forged: 1, Foundation: 2 };
        result.sort((a, b) => rankOrder[getOverallRank(a.stats)] - rankOrder[getOverallRank(b.stats)]);
        break;
      }
      case 'total-stats': {
        const total = (c: typeof cards[0]) => {
          let sum = c.stats.Atk.value + c.stats.Def.value;
          if (c.stats.Mana) sum += c.stats.Mana.value;
          if (c.stats.Tech) sum += c.stats.Tech.value;
          return sum;
        };
        result.sort((a, b) => total(b) - total(a));
        break;
      }
    }
    return result;
  }, [cards, filterArchetype, filterRank, sort]);

  function handleDelete(cardId: string) {
    deleteCard(cardId);
    setCards(getAllCards());
    setDeleteConfirm(null);
  }

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-6">
        <h1 className="font-fantasy text-3xl font-bold text-ivory">Your Collection</h1>
        <p className="text-ash text-lg">No cards forged yet.</p>
        <button
          onClick={() => navigate('/forge')}
          className="px-8 py-3 rounded-lg font-fantasy text-lg font-bold
            bg-gradient-to-r from-power to-endurance text-ivory
            hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-shadow"
        >
          Forge Your First Card
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-fantasy text-2xl font-bold text-ivory">Your Collection</h1>
          <p className="text-ash text-sm">{cards.length} card{cards.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/forge')}
          className="px-4 py-2 rounded-lg font-fantasy text-sm font-bold
            bg-gradient-to-r from-power to-endurance text-ivory
            hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-shadow"
        >
          Forge New Card
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <select
          value={filterArchetype}
          onChange={(e) => setFilterArchetype(e.target.value as ArchetypeName | '')}
          className="px-3 py-1.5 rounded-lg bg-obsidian border border-slate-dark text-bone
            focus:outline-none focus:border-gold/50"
        >
          <option value="">All Archetypes</option>
          {ARCHETYPE_NAMES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filterRank}
          onChange={(e) => setFilterRank(e.target.value as Rank | '')}
          className="px-3 py-1.5 rounded-lg bg-obsidian border border-slate-dark text-bone
            focus:outline-none focus:border-gold/50"
        >
          <option value="">All Ranks</option>
          {RANKS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-1.5 rounded-lg bg-obsidian border border-slate-dark text-bone
            focus:outline-none focus:border-gold/50"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest-atk">Highest ATK</option>
          <option value="total-stats">Total Stats</option>
          <option value="by-rank">By Rank</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
        {filtered.map((card) => (
          <div key={card.cardId} className="relative group">
            <CardRenderer
              card={card}
              size="thumbnail"
              onClick={() => navigate(`/card/${card.cardId}`)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(card.cardId);
              }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-abyss/80 text-ash
                hover:bg-power hover:text-ivory text-xs opacity-0 group-hover:opacity-100
                transition-opacity flex items-center justify-center"
              title="Delete card"
            >
              x
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-ash py-8">No cards match the current filters.</p>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
          <div className="bg-abyss border border-slate-dark rounded-xl p-6 max-w-sm mx-4 space-y-4">
            <h3 className="font-fantasy text-lg font-bold text-ivory">Destroy this card?</h3>
            <p className="text-ash text-sm">This action cannot be undone. The card will be lost forever.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory text-sm transition-colors"
              >
                Keep
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg bg-power text-ivory text-sm font-bold
                  hover:bg-power-glow transition-colors"
              >
                Destroy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
