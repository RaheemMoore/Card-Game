import { useMemo } from 'react';
import type { Card as CardType } from '../../types/card';
import { ARCHETYPE_NAMES } from '../../types/card';
import { buildCardShell, generateStats } from '../../services/cardGenerator';
import { CollectionStall } from '../castle/stalls/CollectionStall';

/**
 * `/dev/collection-stall` — the Collection case, full, without an account.
 *
 * WHY THIS EXISTS: the real surface reads the signed-in player's cards, so it
 * cannot be reviewed at all without logging in — and a half-empty case says
 * nothing about whether the layout works. Raheem asked to "see what the
 * collection stand will look like when you open it, and see all the cards in
 * there." This builds a full case from the real card factory so the grid,
 * scroll, and card scaling are exercised under load.
 *
 * The cards are REAL SHELLS from `buildCardShell` — same stats, same border
 * derivation, same rank maths as a forged card — so the borders and resource
 * pips vary the way a genuine collection does. Only the name, title and lore are
 * stubbed, because those come from a paid Claude call and this page must cost
 * nothing to open.
 *
 * Portraits are deliberately absent: a real collection contains cards whose art
 * has not generated yet, and the placeholder path is part of what the layout has
 * to survive.
 */

const COUNT = 14;

function mockCards(): CardType[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const archetype = ARCHETYPE_NAMES[i % ARCHETYPE_NAMES.length];
    const shell = buildCardShell(archetype, generateStats(archetype));
    return {
      ...shell,
      cardName: `${archetype} ${i + 1}`,
      nameAndTitle: `${archetype} of the Test Case`,
      lore: 'A stand-in used to review the case layout.',
      // Spread the timestamps so the newest-first sort has something to do.
      createdAt: new Date(Date.now() - i * 3_600_000).toISOString(),
    } as CardType;
  });
}

export function CollectionStallPreview() {
  const cards = useMemo(mockCards, []);
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'url(/assets/castle/courtyard.png) center/cover fixed',
      }}
    >
      <CollectionStall cards={cards} onClose={() => window.location.reload()} />
    </div>
  );
}
