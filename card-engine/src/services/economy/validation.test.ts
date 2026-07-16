import { describe, it, expect } from 'vitest';
import { validateCatalogs } from './validation';

describe('validateCatalogs', () => {
  it('passes with the shipped catalogs', () => {
    const result = validateCatalogs();
    if (!result.ok) {
      // Surface the errors in the failure message so CI output is useful.
      console.error(result.errors);
    }
    expect(result.ok).toBe(true);
    expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
  });

  it('flags cost components that do not sum to the declared direct cost', () => {
    // Round-trip check: the shipped catalogs shouldn't emit component-mismatch warnings.
    const result = validateCatalogs();
    const mismatch = result.errors.find((e) => e.code === 'cost_component_mismatch');
    expect(mismatch).toBeUndefined();
  });
});
