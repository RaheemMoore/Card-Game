import { Feather, ExternalLink } from 'lucide-react';
import { Panel } from './components';

/**
 * Tori's lore-writing desk MOVED into the admin app (Raheem, 2026-08-11).
 *
 * The provisional editor that lived here got its promised design pass and
 * became /admin/lore-desk in card-engine — its own page below the Workshop,
 * with the character on screen while she writes, an AI suggestion panel, and
 * bespoke selection questions drafted from the finished lore. Moving it onto
 * the game's origin removed the cross-project plumbing this page would have
 * needed (the admin's Anthropic proxy is same-origin there, and card-engine's
 * api/ directory sits at the 12-function Vercel cap, so nothing new could be
 * added here).
 *
 * This page keeps the pointer plus the PRODUCTION.md §1 projection below it —
 * the wiki remains where her priorities live; the writing happens in the
 * admin studio. Exactly one write surface, so the jsonb lost-update race
 * between two editors cannot happen.
 */

const LORE_DESK_URL = 'https://card-engine-sigma.vercel.app/admin/lore-desk';

export function LoreDesk() {
  return (
    <Panel className="lore-moved">
      <Feather aria-hidden="true" />
      <div>
        <p className="eyebrow">THE WRITING DESK HAS MOVED</p>
        <h2>Lore is now written in the admin studio.</h2>
        <p>
          Proposals from the Workshop, the three rank portraits, the identity sheet, the AI
          writing companion, and the question forge all live on one page there. Sign in with
          your Card Engine account — the same one this wiki uses.
        </p>
        <p>
          <a className="lore-moved-link" href={LORE_DESK_URL} target="_blank" rel="noopener noreferrer">
            Open the Lore Desk <ExternalLink aria-hidden="true" size={14} />
          </a>
        </p>
      </div>
    </Panel>
  );
}
