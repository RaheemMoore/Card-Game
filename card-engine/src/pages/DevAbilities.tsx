import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchIsAdmin } from '../services/persistence/supabaseClient';
import {
  AbilityCommandStateOverlay,
  AbilityCommandStrip,
  AbilityDetailCard,
  AbilityRelicPresentation,
  AbilityResourceBadge,
  type AbilityCommandState,
  type AbilityOverlayVariant,
  type AbilityTier,
  type RelicMoment,
} from '../components/abilities';
import { APPROVED_ABILITY_ART } from '../data/abilities/visualManifest';

type Guard = 'checking' | 'allowed' | 'denied';

/**
 * Admin-only visual harness for the Ability Tile primitives — every state,
 * overlay, tier, and Relic moment in one page for quick review against the
 * canonical Figma nodes. Reachable via `/dev/abilities` or
 * `/dev/abilities?dev_admin=1` in dev.
 */
export function DevAbilities() {
  const [guard, setGuard] = useState<Guard>('checking');

  useEffect(() => {
    if (
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('dev_admin') === '1'
    ) {
      setGuard('allowed');
      return;
    }
    void fetchIsAdmin().then((ok) => setGuard(ok ? 'allowed' : 'denied'));
  }, []);

  if (guard === 'checking') {
    return <div className="p-8 text-bone/60 font-fantasy">Checking access…</div>;
  }
  if (guard === 'denied') return <Navigate to="/" replace />;

  return <Harness />;
}

const emberCombat = APPROVED_ABILITY_ART['ember-cleave'].combat.url;
const emberDetail = APPROVED_ABILITY_ART['ember-cleave'].detail.url;
const emberRelic = APPROVED_ABILITY_ART['ember-cleave'].relic.url;
const aegisCombat = APPROVED_ABILITY_ART['aegis-ward'].combat.url;
const aegisDetail = APPROVED_ABILITY_ART['aegis-ward'].detail.url;
const aegisRelic = APPROVED_ABILITY_ART['aegis-ward'].relic.url;

const COMMAND_STATES: AbilityCommandState[] = [
  'ready',
  'hover',
  'selected',
  'disabled',
  'cooldown',
];

const OVERLAYS: AbilityOverlayVariant[] = [
  'insufficient',
  'locked',
  'undiscovered',
  'effective',
  'resisted',
  'targeting',
  'focus',
];

const TIERS: AbilityTier[] = ['core', 'signature', 'ultimate'];
const MOMENTS: RelicMoment[] = ['discovery', 'evolution', 'ultimate'];

function Harness() {
  const [selected, setSelected] = useState(false);

  const emberIcon = useMemo(
    () => <img src={emberCombat} alt="" className="w-full h-full object-cover" />,
    [],
  );
  const aegisIcon = useMemo(
    () => <img src={aegisCombat} alt="" className="w-full h-full object-cover" />,
    [],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <header>
        <h1 className="font-fantasy text-3xl text-bone">Ability Visual Harness</h1>
        <p className="text-sm text-bone/70 mt-1">
          Gate 7A primitives (Figma-faithful) — every state, overlay, tier, and
          Relic moment on one page. Not user-facing.
        </p>
      </header>

      <Section title="Command Strip · states (Signature tier)">
        <div className="flex flex-col gap-3">
          {COMMAND_STATES.map((s) => (
            <AbilityCommandStrip
              key={s}
              tier="signature"
              state={s}
              displayName="EMBER CLEAVE"
              effectText="Deal 12 damage. Apply Burn 2."
              metaText={`SIGNATURE • MARTIAL · ${s}`}
              iconSlot={emberIcon}
              resource="mana"
              resourceCost={3}
              onActivate={() => {}}
            />
          ))}
        </div>
      </Section>

      <Section title="Command Strip · tiers (ready)">
        <div className="flex flex-col gap-3">
          {TIERS.map((t) => (
            <AbilityCommandStrip
              key={t}
              tier={t}
              state="ready"
              displayName="AEGIS WARD"
              effectText="Shield 20% of DEF for 2 rounds."
              metaText={`${t.toUpperCase()} • DEFENSE`}
              iconSlot={aegisIcon}
              resource="tech"
              resourceCost={2}
              onActivate={() => {}}
            />
          ))}
        </div>
      </Section>

      <Section title="Command State Overlays (full-veil, canonical copy)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {OVERLAYS.map((v) => (
            <AbilityCommandStrip
              key={v}
              tier="core"
              state="ready"
              displayName="EMBER CLEAVE"
              effectText="Deal 12 damage. Apply Burn 2."
              metaText="CORE • MARTIAL"
              iconSlot={emberIcon}
              resource="mana"
              resourceCost={3}
            >
              <AbilityCommandStateOverlay variant={v} />
            </AbilityCommandStrip>
          ))}
        </div>
      </Section>

      <Section title="Select-then-confirm interaction (tap 1 → CHOOSE TARGET, tap 2 → confirm)">
        <AbilityCommandStrip
          tier="signature"
          state={selected ? 'selected' : 'ready'}
          displayName="EMBER CLEAVE"
          effectText="Tap once to select. Tap again to confirm."
          metaText="SIGNATURE • MARTIAL"
          iconSlot={emberIcon}
          resource="mana"
          resourceCost={3}
          onActivate={() => {
            if (!selected) {
              setSelected(true);
              return;
            }
            // eslint-disable-next-line no-alert
            alert('Ember Cleave confirmed (harness)');
            setSelected(false);
          }}
        >
          {selected && <AbilityCommandStateOverlay variant="targeting" />}
        </AbilityCommandStrip>
      </Section>

      <Section title="Detail Cards (Core / Signature / Ultimate)">
        <div className="flex flex-wrap gap-6">
          {TIERS.map((t) => (
            <AbilityDetailCard
              key={t}
              tier={t}
              abilityName="EMBER CLEAVE"
              artworkUrl={emberDetail}
              primaryRules="Deal 12 physical damage to all enemies. Apply Burn 2."
              secondaryRules="A sweeping strike of molten steel that turns momentum into a ring of flame."
              metaLeft="MARTIAL • AOE"
              metaRight="BURN 2"
              caption="Artwork has room to breathe without taking control away from mechanics."
              resource="mana"
              resourceCost={3}
            />
          ))}
        </div>
      </Section>

      <Section title="Detail Card — Aegis Ward (Tech resource)">
        <AbilityDetailCard
          tier="core"
          abilityName="AEGIS WARD"
          artworkUrl={aegisDetail}
          primaryRules="Gain shield equal to 40% of your DEF for 2 rounds."
          secondaryRules="A layered sigil of forged intent — the ward remembers every blow it soaks."
          metaLeft="DEFENSE • SELF"
          metaRight="SHIELD 2R"
          caption="Approved Aegis Ward detail crop · Gate 7A"
          resource="tech"
          resourceCost={2}
        />
      </Section>

      <Section title="Relic Presentation (three moments)">
        <div className="flex flex-wrap gap-6">
          {MOMENTS.map((m) => (
            <AbilityRelicPresentation
              key={m}
              moment={m}
              abilityName={m === 'ultimate' ? 'AEGIS WARD' : 'EMBER CLEAVE'}
              artworkUrl={m === 'ultimate' ? aegisRelic : emberRelic}
              lore={
                m === 'discovery'
                  ? '“Let the embers sing where steel has passed.”'
                  : m === 'evolution'
                  ? '“The cleave deepens; the flame remembers every strike.”'
                  : '“The ward answers only to those who have carried it to the brink.”'
              }
              resourceAccent={m === 'ultimate' ? 'tech' : 'mana'}
            />
          ))}
        </div>
      </Section>

      <Section title="Resource Badges">
        <div className="flex items-end gap-6 flex-wrap">
          <BadgeSample label="Mana · combat · ready">
            <AbilityResourceBadge resource="mana" size="combat" cost={3} />
          </BadgeSample>
          <BadgeSample label="Mana · combat · insufficient">
            <AbilityResourceBadge resource="mana" size="combat" cost={3} state="insufficient" />
          </BadgeSample>
          <BadgeSample label="Mana · compact">
            <AbilityResourceBadge resource="mana" size="compact" cost={3} />
          </BadgeSample>
          <BadgeSample label="Mana · compact · insufficient">
            <AbilityResourceBadge resource="mana" size="compact" cost={3} state="insufficient" />
          </BadgeSample>
          <BadgeSample label="Tech · combat">
            <AbilityResourceBadge resource="tech" size="combat" cost={2} />
          </BadgeSample>
          <BadgeSample label="Tech · combat · insufficient">
            <AbilityResourceBadge resource="tech" size="combat" cost={2} state="insufficient" />
          </BadgeSample>
          <BadgeSample label="Tech · compact">
            <AbilityResourceBadge resource="tech" size="compact" cost={2} />
          </BadgeSample>
          <BadgeSample label="Mana · relic accent">
            <AbilityResourceBadge resource="mana" size="relicAccent" />
          </BadgeSample>
          <BadgeSample label="Tech · relic accent">
            <AbilityResourceBadge resource="tech" size="relicAccent" />
          </BadgeSample>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-fantasy text-lg text-bone/90 border-b border-bone/15 pb-1">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BadgeSample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <span className="text-[9px] uppercase tracking-widest text-bone/50 text-center max-w-[100px]">
        {label}
      </span>
    </div>
  );
}
