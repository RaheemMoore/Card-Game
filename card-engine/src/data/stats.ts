import type { BorderVariant } from '../types/card';

export const BORDER_COLORS: Record<BorderVariant, { primary: string; secondary: string }> = {
  Dominance: { primary: '#dc2626', secondary: '#991b1b' },
  Conscientiousness: { primary: '#2563eb', secondary: '#1e40af' },
  Influencing: { primary: '#d97706', secondary: '#92400e' },
  Steadiness: { primary: '#16a34a', secondary: '#166534' },
  Default: { primary: '#6b7280', secondary: '#374151' },
};
