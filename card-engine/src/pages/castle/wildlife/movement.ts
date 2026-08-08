import type {
  WildlifeBounds,
  WildlifeFacing,
  WildlifePoint,
  WildlifeRandom,
} from './types';

export function distanceBetween(a: WildlifePoint, b: WildlifePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function randomPointInBounds(
  bounds: WildlifeBounds,
  random: WildlifeRandom = Math.random,
  margin = 0,
): WildlifePoint {
  const usableWidth = Math.max(0, bounds.width - margin * 2);
  const usableHeight = Math.max(0, bounds.height - margin * 2);
  return {
    x: bounds.x + margin + usableWidth * random(),
    y: bounds.y + margin + usableHeight * random(),
  };
}

export function pointAwayFrom(
  current: WildlifePoint,
  threat: WildlifePoint,
  bounds: WildlifeBounds,
  distance: number,
): WildlifePoint {
  const dx = current.x - threat.x;
  const dy = current.y - threat.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: Math.min(bounds.x + bounds.width, Math.max(bounds.x, current.x + (dx / length) * distance)),
    y: Math.min(bounds.y + bounds.height, Math.max(bounds.y, current.y + (dy / length) * distance)),
  };
}

export interface WildlifeStep {
  position: WildlifePoint;
  facing: WildlifeFacing;
  arrived: boolean;
}

export function stepToward(
  current: WildlifePoint,
  target: WildlifePoint,
  speed: number,
  deltaMs: number,
  arrivalRadius: number,
): WildlifeStep {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  const facing: WildlifeFacing =
    Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';

  if (distance <= arrivalRadius) return { position: current, facing, arrived: true };

  const step = Math.min(distance, speed * (deltaMs / 1_000));
  return {
    position: {
      x: current.x + (dx / distance) * step,
      y: current.y + (dy / distance) * step,
    },
    facing,
    arrived: step >= distance || distance - step <= arrivalRadius,
  };
}
