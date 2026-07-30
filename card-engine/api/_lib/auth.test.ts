import { describe, expect, it } from 'vitest';
import { isPrivilegedRole, type ProfileRole } from './auth';

/**
 * `isPrivilegedRole` is NOT the spend gate — the crystal balance is (see
 * api/_lib/spendGate.ts). This flag only exists so the two operators cannot
 * lock themselves out of their own tools by running their balance to zero.
 *
 * Gating spend on role instead would bar an ordinary player from ever forging
 * even after being granted crystals, which inverts what the grant is for.
 */
describe('isPrivilegedRole', () => {
  it('admin bypasses the balance check', () => {
    expect(isPrivilegedRole('admin')).toBe(true);
  });

  it('lore_director bypasses too — they forge cards to do lore work', () => {
    expect(isPrivilegedRole('lore_director')).toBe(true);
  });

  it('an ordinary user does NOT bypass — they spend their crystals', () => {
    // Not a lockout: with crystals they spend, without them they cannot.
    expect(isPrivilegedRole('user')).toBe(false);
  });

  it('null does not bypass — no profiles row, or no service-role key', () => {
    expect(isPrivilegedRole(null)).toBe(false);
  });

  it('denies anything unrecognised', () => {
    // Allowlist, not a !== check, so a future role added to the DB constraint
    // cannot silently inherit the operator bypass.
    expect(isPrivilegedRole('moderator' as ProfileRole)).toBe(false);
    expect(isPrivilegedRole('' as ProfileRole)).toBe(false);
  });
});
