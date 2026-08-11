import { describe, expect, it } from 'vitest';
import { collectTags, filterNotes, otherPerson, sortNotes, unreadCount } from './deskApi';
import type { DeskNote, DeskPerson, DeskReply } from './deskApi';

function note(input: Partial<DeskNote> & { id: string }): DeskNote {
  return {
    desk: 'raheem',
    author: 'raheem',
    body: '',
    pinned: false,
    tags: [],
    needsCallFrom: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...input,
  };
}

function reply(input: Partial<DeskReply> & { id: string; noteId: string }): DeskReply {
  return {
    author: 'tori',
    body: '',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...input,
  };
}

describe('sortNotes', () => {
  it('puts pinned notes above newer unpinned ones', () => {
    const ordered = sortNotes([
      note({ id: 'new', createdAt: '2026-08-09T00:00:00.000Z' }),
      note({ id: 'old-pinned', createdAt: '2026-07-01T00:00:00.000Z', pinned: true }),
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual(['old-pinned', 'new']);
  });

  it('orders newest first within a pin group', () => {
    const ordered = sortNotes([
      note({ id: 'older', createdAt: '2026-08-01T00:00:00.000Z' }),
      note({ id: 'newer', createdAt: '2026-08-05T00:00:00.000Z' }),
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual(['newer', 'older']);
  });

  it('breaks exact ties on id so the order never flickers between renders', () => {
    const same = '2026-08-05T00:00:00.000Z';
    const first = sortNotes([note({ id: 'b', createdAt: same }), note({ id: 'a', createdAt: same })]);
    const second = sortNotes([note({ id: 'a', createdAt: same }), note({ id: 'b', createdAt: same })]);
    expect(first.map((entry) => entry.id)).toEqual(second.map((entry) => entry.id));
  });

  it('does not mutate the array it was given', () => {
    const input = [note({ id: 'a' }), note({ id: 'b', pinned: true })];
    sortNotes(input);
    expect(input.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('filterNotes', () => {
  const notes = [
    note({ id: 'lore', body: 'The Seraph fall needs a name', tags: ['lore', 'urgent'] }),
    note({ id: 'art', body: 'Redraw the forge skirt', tags: ['art'] }),
    note({ id: 'both', body: 'Boss telegraph wording', tags: ['lore', 'art'] }),
  ];

  it('matches note bodies case-insensitively', () => {
    expect(filterNotes(notes, { search: 'SERAPH' }).map((entry) => entry.id)).toEqual(['lore']);
  });

  it('narrows as more tags are selected — every tag must be present', () => {
    expect(filterNotes(notes, { tags: ['lore'] }).map((entry) => entry.id)).toEqual(['lore', 'both']);
    expect(filterNotes(notes, { tags: ['lore', 'art'] }).map((entry) => entry.id)).toEqual(['both']);
  });

  it('applies search and tags together', () => {
    expect(filterNotes(notes, { search: 'telegraph', tags: ['lore'] }).map((entry) => entry.id)).toEqual(['both']);
    expect(filterNotes(notes, { search: 'telegraph', tags: ['urgent'] })).toEqual([]);
  });

  it('reaches into the conversation, because a reply is part of the note', () => {
    const replies = [reply({ id: 'r1', noteId: 'art', body: 'Agreed — the dirt row is wrong' })];
    expect(filterNotes(notes, { search: 'dirt row', replies }).map((entry) => entry.id)).toEqual(['art']);
  });

  it('returns everything when nothing is asked of it', () => {
    expect(filterNotes(notes)).toHaveLength(3);
  });
});

describe('unreadCount', () => {
  const seen = '2026-08-05T00:00:00.000Z';
  const viewer: DeskPerson = 'raheem';

  it('counts only what the other person wrote after the stamp', () => {
    const notes = [
      note({ id: 'theirs-new', author: 'tori', createdAt: '2026-08-06T00:00:00.000Z' }),
      note({ id: 'theirs-old', author: 'tori', createdAt: '2026-08-04T00:00:00.000Z' }),
      note({ id: 'mine-new', author: 'raheem', createdAt: '2026-08-07T00:00:00.000Z' }),
    ];
    expect(unreadCount(notes, [], seen, viewer)).toBe(1);
  });

  it('counts replies as well as notes', () => {
    const replies = [
      reply({ id: 'r1', noteId: 'n', author: 'tori', createdAt: '2026-08-06T00:00:00.000Z' }),
      reply({ id: 'r2', noteId: 'n', author: 'raheem', createdAt: '2026-08-06T00:00:00.000Z' }),
    ];
    expect(unreadCount([], replies, seen, viewer)).toBe(1);
  });

  it('excludes an item written at exactly the stamp, so marking seen clears fully', () => {
    const notes = [note({ id: 'boundary', author: 'tori', createdAt: seen })];
    expect(unreadCount(notes, [], seen, viewer)).toBe(0);
  });

  it('treats a missing stamp as never-looked rather than everything-read', () => {
    const notes = [note({ id: 'theirs', author: 'tori', createdAt: '2026-01-01T00:00:00.000Z' })];
    expect(unreadCount(notes, [], undefined, viewer)).toBe(1);
  });
});

describe('the desks are symmetric', () => {
  it('has no notion of a person who may edit less than the other', () => {
    expect(otherPerson('raheem')).toBe('tori');
    expect(otherPerson('tori')).toBe('raheem');
  });

  it('lists every tag in use once, alphabetically', () => {
    expect(collectTags([
      note({ id: 'a', tags: ['lore', 'art'] }),
      note({ id: 'b', tags: ['art', 'combat'] }),
    ])).toEqual(['art', 'combat', 'lore']);
  });
});
