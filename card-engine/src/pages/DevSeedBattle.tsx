import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCards, saveCard } from '../services/storage';
import * as abilityRegistry from '../services/abilities/registry';
import { SEED_ABILITIES } from '../data/abilities/seedAbilities';
import type { Card } from '../types/card';

/**
 * Dev-only route. Seeds three test cards + their ability references so the
 * battle route can be exercised without going through the paid Forge flow.
 * Idempotent — re-runs on the same session don't duplicate cards.
 *
 * Routed at /dev/seed-battle. NOT for production.
 */

interface SeedSpec {
  name: string;
  archetype: Card['archetype'];
  atk: number;
  def: number;
  mana: number;
  abilityId: string;
  slot: 'signature' | 'core';
}

const SEED_PARTY: SeedSpec[] = [
  { name: 'Test Vanguard', archetype: 'Barbarian', atk: 62, def: 55, mana: 40, abilityId: 'ability_ember_cleave', slot: 'signature' },
  { name: 'Test Warden',   archetype: 'Barbarian', atk: 45, def: 68, mana: 50, abilityId: 'ability_aegis_ward',   slot: 'signature' },
  { name: 'Test Reaver',   archetype: 'Barbarian', atk: 55, def: 45, mana: 60, abilityId: 'ability_soul_drain',   slot: 'core' },
];

function slugId(name: string): string {
  return 'test_' + name.toLowerCase().replace(/\s+/g, '_');
}

function seedCards(): { seeded: number; existing: number } {
  const existingIds = new Set(getAllCards().map((c) => c.cardId));
  let seeded = 0;
  let existing = 0;
  const now = new Date().toISOString();
  for (const spec of SEED_PARTY) {
    const cardId = slugId(spec.name);
    if (existingIds.has(cardId)) {
      existing += 1;
      continue;
    }
    const dominant =
      spec.atk >= spec.def && spec.atk >= spec.mana
        ? ('Atk' as const)
        : spec.def >= spec.mana
        ? ('Def' as const)
        : ('Mana' as const);
    const border =
      dominant === 'Atk'
        ? ('Dominance' as const)
        : dominant === 'Def'
        ? ('Steadiness' as const)
        : ('Conscientiousness' as const);
    saveCard({
      cardId,
      archetype: spec.archetype,
      cardName: spec.name,
      nameAndTitle: `${spec.name}, the Test`,
      portraitAsset: '',
      stats: {
        Atk: { value: spec.atk, bias: 'Mid', hardCap: 100 },
        Def: { value: spec.def, bias: 'Mid', hardCap: 100 },
        Mana: { value: spec.mana, bias: 'Mid', hardCap: 100 },
      },
      dominantStat: dominant,
      border: { baseVariant: border, baseSource: '' },
      lore: 'Injected by /dev/seed-battle for local combat walkthroughs.',
      whisperWords: [],
      evolutionHistory: {},
      createdAt: now,
    });
    const abilityDef = SEED_ABILITIES.find((s) => s.definition.id === spec.abilityId);
    if (abilityDef) {
      abilityRegistry.saveReference({
        cardId,
        abilityId: spec.abilityId,
        abilityVersionId: abilityDef.version.id,
        slotType: spec.slot,
        localTier: 'Forged',
        displayOrder: 0,
      });
    }
    seeded += 1;
  }
  return { seeded, existing };
}

export function DevSeedBattle() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'seeding' }
    | { kind: 'ready'; seeded: number; existing: number }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  useEffect(() => {
    setStatus({ kind: 'seeding' });
    try {
      const result = seedCards();
      setStatus({ kind: 'ready', ...result });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 rounded border border-gold/40 bg-void/70 text-bone">
      <h1 className="font-fantasy text-2xl text-gold mb-2">Dev — Seed Battle</h1>
      <p className="text-sm text-bone/70 mb-4">
        Injects three test Barbarian cards (Vanguard, Warden, Reaver), attaches one seed ability
        each, and drops you into the Picker with a party ready to go. Runs the same wallet /
        combat / journal path as production — the only shortcut is skipping the Forge.
      </p>

      {status.kind === 'seeding' && (
        <div className="text-sm text-bone/60">Seeding party…</div>
      )}

      {status.kind === 'error' && (
        <div className="p-3 rounded border border-crimson/50 bg-crimson/10 text-sm">
          Failed to seed: {status.message}
        </div>
      )}

      {status.kind === 'ready' && (
        <div>
          <div className="text-sm text-bone/80 mb-4">
            {status.seeded > 0 && (
              <div>
                ✓ Seeded <span className="text-gold">{status.seeded}</span> new card
                {status.seeded === 1 ? '' : 's'}.
              </div>
            )}
            {status.existing > 0 && (
              <div>
                • <span className="text-gold">{status.existing}</span> card
                {status.existing === 1 ? ' was' : 's were'} already present (idempotent).
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/battle')}
              className="flex-1 py-2 rounded font-fantasy text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              style={{
                background: 'linear-gradient(to bottom, #b8860b, #8a1c1c)',
                color: '#faeaca',
              }}
            >
              Open Picker →
            </button>
            <button
              type="button"
              onClick={() => navigate('/collection')}
              className="px-4 py-2 rounded text-sm border border-bone/30 text-bone/80 hover:border-bone/60"
            >
              View Collection
            </button>
          </div>
          <p className="text-[10px] text-bone/40 mt-3">
            Costs 50 Gold per battle attempt. Starting balance is 500 Gold.
          </p>
        </div>
      )}
    </div>
  );
}
