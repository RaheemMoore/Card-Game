import { describe, it, expect } from 'vitest';
import { toInboxRows, type CuratedInboxSource } from './AdminOverview';

/**
 * The Overview Inbox reads the curated roster (2026-08-12).
 *
 * It used to read flagged `prompt_test_judgments`, written only by the Prompt
 * Lab. Retiring that page would have left the studio's one action-demanding
 * module not merely empty but unfillable, since nothing else ever wrote a
 * judgment. These tests pin the replacement's rules.
 */

function row(over: Partial<CuratedInboxSource> = {}): CuratedInboxSource {
  return {
    id: 'char_barbarian_one',
    status: 'awaiting_lore',
    display_name: 'Gryndak',
    data: { archetype: 'Barbarian', proposedAt: '2026-08-10T14:05:00Z' },
    updated_at: '2026-08-12T09:00:00Z',
    ...over,
  };
}

describe('toInboxRows', () => {
  it('sends a character awaiting lore to the Lore Desk', () => {
    const [r] = toInboxRows([row()]);
    expect(r.kind).toBe('lore');
    expect(r.summary).toBe('Gryndak — waiting on lore');
    expect(r.href).toBe('/admin/lore-desk');
  });

  it('sends a confirmed character to the review space, already opened on it', () => {
    const [r] = toInboxRows([
      row({
        id: 'char_monk_two',
        status: 'lore_ready',
        display_name: 'Sajan',
        data: { archetype: 'Monk', loreConfirmedAt: '2026-08-11T10:00:00Z' },
      }),
    ]);
    expect(r.kind).toBe('review');
    expect(r.summary).toContain('needs your review');
    expect(r.href).toBe('/admin/workshop?stage=review&character=char_monk_two');
  });

  it('escapes an id rather than building a broken query string', () => {
    const [r] = toInboxRows([row({ id: 'char a&b', status: 'lore_ready', data: {} })]);
    expect(r.href).toContain('character=char%20a%26b');
  });

  it('ages a card from when it entered the queue, not when the row last changed', () => {
    // An autosave while Tori writes bumps updated_at. If that drove the age,
    // the card she is actively working on would look freshly filed and sink
    // to the bottom of an oldest-first list.
    const [r] = toInboxRows([row({ updated_at: '2026-08-12T23:59:00Z' })]);
    expect(r.createdAt).toBe('2026-08-10T14:05:00Z');
  });

  it('uses loreConfirmedAt for a card in review, not proposedAt', () => {
    const [r] = toInboxRows([
      row({
        status: 'lore_ready',
        data: { proposedAt: '2026-08-01T00:00:00Z', loreConfirmedAt: '2026-08-11T00:00:00Z' },
      }),
    ]);
    expect(r.createdAt).toBe('2026-08-11T00:00:00Z');
  });

  it('falls back to updated_at when the queue timestamp is missing', () => {
    const [r] = toInboxRows([row({ data: { archetype: 'Barbarian' } })]);
    expect(r.createdAt).toBe('2026-08-12T09:00:00Z');
  });

  it('names an unnamed slot by archetype rather than showing a raw id', () => {
    const [r] = toInboxRows([row({ display_name: '   ' })]);
    expect(r.summary).toBe('Barbarian — waiting on lore');
  });

  it('falls back to the id when there is nothing else to call it', () => {
    const [r] = toInboxRows([row({ display_name: null, data: {} })]);
    expect(r.summary).toBe('char_barbarian_one — waiting on lore');
  });

  it('orders oldest first — the thing that has waited longest is the thing to do', () => {
    const rows = toInboxRows([
      row({ id: 'newer', data: { proposedAt: '2026-08-11T00:00:00Z' } }),
      row({ id: 'oldest', data: { proposedAt: '2026-08-01T00:00:00Z' } }),
      row({ id: 'middle', data: { proposedAt: '2026-08-05T00:00:00Z' } }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['oldest', 'middle', 'newer']);
  });

  it('ignores statuses that are nobody\'s turn', () => {
    expect(
      toInboxRows([
        row({ status: 'draft' }),
        row({ status: 'seeded' }),
        row({ status: 'approved' }),
        row({ status: 'retired' }),
      ]),
    ).toEqual([]);
  });

  it('is empty, not broken, when the roster has nothing pending', () => {
    expect(toInboxRows([])).toEqual([]);
  });
});
