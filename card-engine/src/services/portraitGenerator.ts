import type { ArchetypeName, Rank } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';

const SAMPLE_PORTRAITS: Record<string, string> = {
  'sample-foundation': '/portraits/sample/raheem_foundation.jpg',
  'sample-forged': '/portraits/sample/raheem_forged.jpg',
  'sample-ascendant': '/portraits/sample/raheem_ascendant.jpg',
  'sample-tori': '/portraits/sample/tori_sample.jpg',
};

export function generatePlaceholderPortrait(
  archetype: ArchetypeName,
  rank: Rank,
): string {
  const def = ARCHETYPES[archetype];
  const { primary, secondary, accent } = def.palette;

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 560;
  const ctx = canvas.getContext('2d')!;

  // Background gradient using archetype palette
  const bg = ctx.createLinearGradient(0, 0, 0, 560);
  bg.addColorStop(0, secondary);
  bg.addColorStop(0.5, primary);
  bg.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 400, 560);

  // Rank-based ambient effect
  const rankIntensity = rank === 'Ascendant' ? 0.4 : rank === 'Forged' ? 0.25 : 0.1;
  const glow = ctx.createRadialGradient(200, 200, 0, 200, 280, 300);
  glow.addColorStop(0, accent + Math.round(rankIntensity * 255).toString(16).padStart(2, '0'));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 400, 560);

  // Silhouette circle
  ctx.beginPath();
  ctx.arc(200, 220, 80, 0, Math.PI * 2);
  ctx.fillStyle = `${accent}33`;
  ctx.fill();

  // Archetype icon text
  ctx.font = 'bold 48px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.fillText(archetype.charAt(0), 200, 220);

  // Rank text
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffffff88';
  ctx.fillText(rank.toUpperCase(), 200, 480);

  // Archetype name
  ctx.font = 'bold 20px serif';
  ctx.fillStyle = '#ffffffcc';
  ctx.fillText(archetype, 200, 510);

  return canvas.toDataURL('image/jpeg', 0.85);
}

export function getSamplePortrait(rank: Rank): string {
  const key = `sample-${rank.toLowerCase()}`;
  return SAMPLE_PORTRAITS[key] ?? SAMPLE_PORTRAITS['sample-foundation'];
}
