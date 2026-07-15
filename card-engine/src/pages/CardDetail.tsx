import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCard, deleteCard } from '../services/storage';
import { CardRenderer } from '../components/CardRenderer';
import { BORDER_COLORS } from '../data/stats';

export function CardDetail() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const card = cardId ? getCard(cardId) : null;

  if (!card) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-4">
        <h1 className="font-fantasy text-2xl font-bold text-ivory">Card Not Found</h1>
        <button
          onClick={() => navigate('/collection')}
          className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
            font-fantasy text-sm transition-colors"
        >
          Back to Collection
        </button>
      </div>
    );
  }

  function handleDelete() {
    if (!cardId) return;
    deleteCard(cardId);
    navigate('/collection');
  }

  const borderColor = BORDER_COLORS[card.border.baseVariant];

  return (
    <div className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
      <button
        onClick={() => navigate('/collection')}
        className="text-ash hover:text-ivory text-sm mb-6 transition-colors"
      >
        &larr; Back to Collection
      </button>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Card */}
        <div className="shrink-0 mx-auto md:mx-0">
          <CardRenderer card={card} />
        </div>

        {/* Details panel */}
        <div className="flex-1 space-y-6 min-w-0">
          <div>
            <h1 className="font-fantasy text-3xl font-bold text-ivory">{card.nameAndTitle}</h1>
            <div className="flex gap-3 mt-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-slate-dark text-ash">{card.archetype}</span>
              <span
                className="px-2 py-0.5 rounded font-fantasy"
                style={{
                  background: `${borderColor.primary}20`,
                  color: borderColor.primary,
                }}
              >
                {card.rank}
              </span>
            </div>
          </div>

          {/* Lore */}
          {card.lore && (
            <div className="border-l-2 pl-4" style={{ borderColor: `${borderColor.primary}44` }}>
              <p className="text-bone/80 italic leading-relaxed">"{card.lore}"</p>
            </div>
          )}

          {/* Combat Stats */}
          <div className="space-y-3">
            <h3 className="font-fantasy text-sm font-bold text-ivory">Combat Stats</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center border"
                  style={{
                    background: 'rgba(220,38,38,0.1)',
                    borderColor: '#dc2626',
                  }}
                >
                  <span className="text-xl font-bold" style={{ color: '#ef4444' }}>
                    {card.stats.atk}
                  </span>
                </div>
                <span className="font-fantasy text-sm font-bold" style={{ color: '#dc2626' }}>ATK</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center border"
                  style={{
                    background: 'rgba(37,99,235,0.1)',
                    borderColor: '#2563eb',
                  }}
                >
                  <span className="text-xl font-bold" style={{ color: '#60a5fa' }}>
                    {card.stats.def}
                  </span>
                </div>
                <span className="font-fantasy text-sm font-bold" style={{ color: '#2563eb' }}>DEF</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center border"
                  style={{
                    background: 'rgba(124,58,237,0.1)',
                    borderColor: '#7c3aed',
                  }}
                >
                  <span className="text-xl font-bold" style={{ color: '#a78bfa' }}>
                    {card.manaCost}
                  </span>
                </div>
                <span className="font-fantasy text-sm font-bold" style={{ color: '#7c3aed' }}>MANA</span>
              </div>
            </div>
          </div>

          {/* Whisper words */}
          {card.whisperWords.length > 0 && (
            <div>
              <h3 className="font-fantasy text-sm font-bold text-ivory mb-1">Whisper Words</h3>
              <div className="flex gap-2">
                {card.whisperWords.map((w, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs italic"
                    style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-ash/60 space-y-1">
            <p>Border: {card.border.baseVariant} — {card.border.baseSource}</p>
            <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
            <p>ID: {card.cardId}</p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg text-sm text-ash hover:text-power
                  border border-slate-dark hover:border-power/50 transition-colors"
              >
                Destroy Card
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-power">Destroy this card forever?</span>
                <button
                  onClick={handleDelete}
                  className="px-4 py-1.5 rounded-lg bg-power text-ivory text-sm font-bold
                    hover:bg-power-glow transition-colors"
                >
                  Yes, destroy
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-dark text-ash text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
