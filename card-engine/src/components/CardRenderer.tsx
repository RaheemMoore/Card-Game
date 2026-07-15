import type { Card, StatName } from '../types/card';
import type { BorderVariant, Rank } from '../types/card';
import { BORDER_COLORS } from '../data/stats';
import { getOverallRank, getResourceStat, deriveRank } from '../data/powerSystem';

interface CardRendererProps {
  card: Card;
  size?: 'full' | 'thumbnail';
  onClick?: () => void;
}

const BORDER_FRAME_MAP: Record<BorderVariant, string> = {
  Dominance: '/assets/borders/dominance.png',
  Influencing: '/assets/borders/influencing.png',
  Steadiness: '/assets/borders/steadiness.png',
  Conscientiousness: '/assets/borders/conscientiousness.png',
  Default: '/assets/borders/dominance.png',
};

const RANK_GLOW: Record<Rank, number> = {
  Foundation: 0.25,
  Forged: 0.5,
  Ascendant: 1,
};

const STAT_ICON_COLORS: Record<StatName, string> = {
  Atk: '#dc2626',
  Def: '#2563eb',
  Mana: '#7c3aed',
  Tech: '#d97706',
};

export function CardRenderer({ card, size = 'full', onClick }: CardRendererProps) {
  const borderColors = BORDER_COLORS[card.border.baseVariant];
  const borderFrame = BORDER_FRAME_MAP[card.border.baseVariant];
  const overallRank = getOverallRank(card.stats);
  const glowIntensity = RANK_GLOW[overallRank];
  const isThumbnail = size === 'thumbnail';
  const resource = getResourceStat(card.stats);

  const scale = isThumbnail ? 0.42 : 1;
  const cardW = Math.round(326 * scale);
  const cardH = Math.round(470 * scale);

  return (
    <div
      className={`relative select-none ${onClick ? 'cursor-pointer hover:scale-[1.03] transition-transform' : ''} ${
        overallRank === 'Ascendant' ? 'card-shimmer' : ''
      }`}
      style={{ width: cardW, height: cardH }}
      onClick={onClick}
    >
      {/* Outer glow for rank */}
      <div
        className="absolute -inset-2 rounded-2xl blur-lg pointer-events-none"
        style={{
          background: borderColors.primary,
          opacity: glowIntensity * 0.35,
        }}
      />

      {/* Card container */}
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a0f',
          boxShadow: `0 0 ${20 * glowIntensity}px ${borderColors.primary}55`,
        }}
      >
        {/* Portrait art — fills card, frame overlay masks edges */}
        {card.portraitAsset ? (
          <img
            src={card.portraitAsset}
            alt={card.nameAndTitle || card.archetype}
            className="absolute w-full object-cover object-top"
            style={{ zIndex: 1, top: '8%', left: 0, right: 0, bottom: 0 }}
          />
        ) : (
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center"
            style={{
              background: `radial-gradient(ellipse at center top, ${borderColors.primary}33 0%, #0a0a0f 80%)`,
              zIndex: 1,
            }}
          >
            <span
              className="font-fantasy font-bold opacity-20"
              style={{
                fontSize: isThumbnail ? '28px' : '64px',
                color: borderColors.primary,
              }}
            >
              {card.archetype.charAt(0)}
            </span>
          </div>
        )}

        {/* Border frame */}
        <img
          src={borderFrame}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: 'fill', zIndex: 2 }}
          draggable={false}
        />

        {/* Card Name — top banner */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
          style={{
            top: '5.5%',
            height: '3.5%',
            padding: `0 ${isThumbnail ? 18 : 44}px`,
            zIndex: 3,
          }}
        >
          <h3
            className="font-fantasy font-bold text-ivory truncate"
            style={{
              fontSize: isThumbnail ? '7px' : '14px',
              textShadow: '0 2px 4px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)',
              letterSpacing: '0.56px',
            }}
          >
            {card.cardName || 'Card Name'}
          </h3>
        </div>

        {/* Resource cost — top-right crystal */}
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            top: isThumbnail ? '1.5%' : '2%',
            right: isThumbnail ? '4%' : '7.5%',
            width: isThumbnail ? '18px' : '42px',
            height: isThumbnail ? '20px' : '46px',
            zIndex: 3,
          }}
        >
          <span
            className="font-bold tabular-nums"
            style={{
              fontSize: isThumbnail ? '9px' : '22px',
              color: '#fff',
              textShadow: `0 0 10px ${resource.name === 'Tech' ? 'rgba(217,119,6,0.8)' : 'rgba(167,139,250,0.8)'}, 0 2px 4px rgba(0,0,0,0.9)`,
            }}
          >
            {resource.entry.value}
          </span>
        </div>

        {/* Name & Title — parchment banner */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
          style={{
            top: '69%',
            height: '4%',
            padding: `0 ${isThumbnail ? 14 : 36}px`,
            zIndex: 3,
          }}
        >
          <p
            className="font-fantasy font-bold truncate"
            style={{
              fontSize: isThumbnail ? '5px' : '11px',
              color: '#2a1810',
              textShadow: '0 1px 0 rgba(212,165,116,0.4)',
            }}
          >
            {card.nameAndTitle || 'Name & Title Here'}
          </p>
        </div>

        {/* Stat display — full size only */}
        {!isThumbnail && (
          <div
            className="absolute pointer-events-none"
            style={{ top: '75.5%', left: '25.5%', right: '25%', zIndex: 3 }}
          >
            <div className="flex flex-col gap-[12px]">
              <div className="flex items-center gap-2">
                <div className="relative w-[24px] h-[24px] shrink-0 flex items-center justify-center">
                  <img src="/assets/badges/red.png" alt="" className="absolute inset-0 w-full h-full rounded-full" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))' }} />
                  <img src="/assets/icons/fist.png" alt="" className="relative w-[12px] h-[12px]" style={{ filter: 'brightness(2)' }} />
                </div>
                <span className="text-[12px] font-medium tracking-[0.24px]" style={{ color: '#000', textShadow: '0 2px 3px rgba(0,0,0,0.4)' }}>
                  ATK {card.stats.Atk.value}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-[24px] h-[24px] shrink-0 flex items-center justify-center">
                  <img src="/assets/badges/blue.png" alt="" className="absolute inset-0 w-full h-full rounded-full" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
                  <img src="/assets/icons/castle-turret.png" alt="" className="relative w-[12px] h-[12px]" style={{ filter: 'brightness(2)' }} />
                </div>
                <span className="text-[12px] font-medium tracking-[0.24px]" style={{ color: '#000', textShadow: '0 2px 3px rgba(0,0,0,0.4)' }}>
                  DEF {card.stats.Def.value}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Power/Toughness — bottom-right */}
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            top: isThumbnail ? 'auto' : '87.5%',
            bottom: isThumbnail ? '3%' : 'auto',
            right: isThumbnail ? '8%' : '11%',
            left: isThumbnail ? 'auto' : '79%',
            zIndex: 3,
          }}
        >
          <span
            className="font-bold tabular-nums"
            style={{
              fontSize: isThumbnail ? '8px' : '16px',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)',
              letterSpacing: '0.64px',
            }}
          >
            {card.stats.Atk.value}/{card.stats.Def.value}
          </span>
        </div>
      </div>
    </div>
  );
}
