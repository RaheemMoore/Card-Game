import type { ArchetypeName, Rank } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';

type PortraitEntry = { path: string };

const PORTRAIT_POOL: Partial<Record<ArchetypeName, Partial<Record<Rank, PortraitEntry[]>>>> = {
  Barbarian: {
    Foundation: [{ path: '/assets/portraits/barbarian_foundation_1.jpg' }],
    Forged: [{ path: '/assets/portraits/barbarian_forged_1.jpg' }],
    Ascendant: [{ path: '/assets/portraits/barbarian_ascendant_1.jpg' }],
  },
  Druid: {
    Foundation: [{ path: '/assets/portraits/druid_foundation_1.jpg' }],
    Forged: [{ path: '/assets/portraits/druid_forged_1.jpg' }],
    Ascendant: [{ path: '/assets/portraits/druid_ascendant_1.jpg' }],
  },
};

export function getPortrait(archetype: ArchetypeName, rank: Rank): string | null {
  const archetypePool = PORTRAIT_POOL[archetype];
  if (!archetypePool) return null;

  const rankPool = archetypePool[rank];
  if (!rankPool || rankPool.length === 0) return null;

  const entry = rankPool[Math.floor(Math.random() * rankPool.length)];
  return entry.path;
}

export function generatePlaceholderPortrait(
  archetype: ArchetypeName,
  rank: Rank,
): string {
  const portrait = getPortrait(archetype, rank);
  if (portrait) return portrait;

  const def = ARCHETYPES[archetype];
  const { primary, secondary, accent } = def.palette;

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 560;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 560);
  bg.addColorStop(0, secondary);
  bg.addColorStop(0.5, primary);
  bg.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 400, 560);

  const rankIntensity = rank === 'Ascendant' ? 0.4 : rank === 'Forged' ? 0.25 : 0.1;
  const glow = ctx.createRadialGradient(200, 200, 0, 200, 280, 300);
  glow.addColorStop(0, accent + Math.round(rankIntensity * 255).toString(16).padStart(2, '0'));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 400, 560);

  ctx.beginPath();
  ctx.arc(200, 220, 80, 0, Math.PI * 2);
  ctx.fillStyle = `${accent}33`;
  ctx.fill();

  ctx.font = 'bold 48px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.fillText(archetype.charAt(0), 200, 220);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffffff88';
  ctx.fillText(rank.toUpperCase(), 200, 480);

  ctx.font = 'bold 20px serif';
  ctx.fillStyle = '#ffffffcc';
  ctx.fillText(archetype, 200, 510);

  return canvas.toDataURL('image/jpeg', 0.85);
}
