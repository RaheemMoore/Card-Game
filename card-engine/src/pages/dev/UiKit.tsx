import { useState } from 'react';
import { Bar } from '../../components/ui/Bar';
import { Panel, type PanelVariant } from '../../components/ui/Panel';
import { PixelButton } from '../../components/ui/PixelButton';
import { Slot } from '../../components/ui/Slot';

/**
 * The pixel UI kit, every primitive and every variant, on one page.
 *
 * WHY THIS EXISTS: the kit's whole premise is that variants come from PROPS and
 * not from new art — one frame asset serving a 40px pill and an 860px menu. The
 * only way to know that premise still holds is to see every variant rendered at
 * once. A build passing proves nothing here: `border-image` with a wrong slice
 * compiles perfectly and renders as smeared mush.
 *
 * It sits OUTSIDE the session gate, in the same tier as `/dev/sprite-preview`
 * and `/dev/boss-readout`: it reads four PNGs and touches no player data, so
 * requiring a login to look at a button would be friction with nothing behind
 * it.
 *
 * The dark strip and the plate strip both exist because chrome approved on one
 * ground ships broken on the other — round 1 of this art looked fine loose and
 * disappeared against the courtyard's light paving.
 */

const VARIANTS: PanelVariant[] = ['pill', 'tile', 'hud', 'shelf', 'sheet'];

export function UiKit() {
  const [ground, setGround] = useState<'dark' | 'plate'>('plate');
  const [hp, setHp] = useState(0.62);
  const [selected, setSelected] = useState(2);

  return (
    <div style={{ minHeight: '100dvh', background: '#0b0910', color: '#e8dcc4', padding: 24 }}>
      <header style={{ maxWidth: 1100, margin: '0 auto 20px' }}>
        <h1 className="font-fantasy" style={{ fontSize: 26, color: '#f3d99b', margin: 0 }}>
          Pixel UI kit
        </h1>
        <p style={{ color: '#9b8f7e', fontSize: 14, maxWidth: '60ch' }}>
          PixelLab Round 3, approved 2026-08-04. Every variant below uses the{' '}
          <strong>same four art files</strong> — only render size changes.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <PixelButton onClick={() => setGround('plate')}>On the plate</PixelButton>
          <PixelButton onClick={() => setGround('dark')}>On dark</PixelButton>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 24,
          borderRadius: 8,
          background:
            ground === 'plate'
              ? 'url(/assets/castle/courtyard.png) center/cover'
              : '#161119',
        }}
      >
        <Section title="Panel — five variants, one asset">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
            {VARIANTS.map((v) => (
              <Panel key={v} variant={v} style={{ width: 180, height: 110, padding: 10 }}>
                <span style={{ fontSize: 12, color: '#f3d99b' }}>{v}</span>
              </Panel>
            ))}
          </div>
        </Section>

        <Section title="Panel — stretched, to prove the 9-slice tiles">
          <Panel variant="sheet" style={{ height: 150, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#cbb9a0', margin: 0 }}>
              Full-width at 32px corner slices. The ornaments stay in the corners; the
              middle of each edge repeats. If you see a smeared or doubled ornament here,
              the slice value is wrong — not the art.
            </p>
          </Panel>
        </Section>

        <Section title="Button">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <PixelButton scale={1.2}>Small</PixelButton>
            <PixelButton>Enter the stall</PixelButton>
            <PixelButton scale={2.2}>Large</PixelButton>
            <PixelButton disabled>Disabled</PixelButton>
          </div>
        </Section>

        <Section title="Bar — one trough, three tones, drawn inside the channel">
          <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
            <Bar value={hp} tone="hp" label="Health" scale={2} />
            <Bar value={0.35} tone="rage" label="Rage" scale={2} />
            <Bar value={0.8} tone="resource" label="Mana" scale={2} />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hp * 100)}
              onChange={(e) => setHp(Number(e.target.value) / 100)}
              aria-label="Health fill"
              style={{ width: 360 }}
            />
          </div>
        </Section>

        <Section title="Slot — empty is framed, a card is not">
          <p style={{ fontSize: 13, color: '#cbb9a0', maxWidth: '58ch', marginTop: -4 }}>
            An EMPTY slot wears the gem frame, to mark a place a character can go. A
            FILLED one drops the frame entirely — the card is the star of this game and
            chrome around it competes with the art you paid to generate.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const filled = i < 3;
              return (
                <Slot
                  key={i}
                  onClick={() => setSelected(i)}
                  selected={selected === i}
                  label={filled ? `Character ${i + 1}` : 'Empty slot'}
                  style={{ width: 104, aspectRatio: '326 / 470' }}
                >
                  {filled && (
                    // Stand-in for a real card — this page touches no player
                    // data, so it cannot read the collection.
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(160deg,#5d4a7a 0%,#37507a 55%,#243046 100%)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#e8dcc4',
                        fontSize: 11,
                      }}
                    >
                      card
                    </span>
                  )}
                </Slot>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#d6b45a',
          margin: '0 0 10px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
