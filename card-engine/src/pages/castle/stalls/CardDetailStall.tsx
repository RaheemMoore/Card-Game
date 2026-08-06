import { useEffect, useState } from 'react';
import type { Card as CardType } from '../../../types/card';
import { getOverallRank, getResourceStat } from '../../../data/powerSystem';
import { buildStaticCardSheetAbilities } from '../../../services/abilities/cardSheetAdapter';
import { getElementImage } from '../../../data/elementImages';
import { CardRenderer } from '../../../components/CardRenderer';
import { PixelButton } from '../../../components/ui/PixelButton';
import { Slot } from '../../../components/ui/Slot';
import { StallShell } from '../../../components/ui/StallShell';

/**
 * One character, looked at properly — the Collection's detail view.
 *
 * WHY NOT JUST RE-SKIN CardSheet: that component is also used by
 * `battle/CombatScene` and `battle/mobile/MobileCombatScene`, and Raheem has
 * explicitly deferred the boss-battle UI. Re-skinning the shared sheet would
 * have changed the battle surface as a side effect of a Collection change,
 * which is the kind of quiet spillover that makes a deferral meaningless.
 * `CardSheet` is therefore untouched and still serves battle.
 *
 * READ-ONLY, deliberately. Tier-up and portrait regeneration live on
 * `/card/:cardId` and both SPEND premium currency. Putting a paid, irreversible
 * action inside a surface built for looking at things is how someone evolves a
 * character by mis-tapping. The route keeps those; this shows the character.
 *
 * The card renders at full size rather than as a thumbnail — this is the one
 * place in the game whose entire job is to let you look at the art you paid for.
 */

export function CardDetailStall({ card, onClose }: { card: CardType; onClose: () => void }) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 900);

  useEffect(() => {
    // 900, not the usual 720: this surface puts a full-size card BESIDE its
    // details, and a 326px card plus a readable column needs more room than a
    // grid of thumbnails does.
    const onResize = () => setNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const rank = getOverallRank(card.stats);
  const resource = getResourceStat(card.stats);
  const abilities = buildStaticCardSheetAbilities(card);
  const element = card.elementSelection;
  const elementArt = element ? getElementImage(element.element) : undefined;
  const pillars = card.storyPillars ? Object.entries(card.storyPillars) : [];

  return (
    <StallShell
      title={card.cardName}
      subtitle={`${card.archetype} · ${rank}`}
      narrow={narrow}
      onClose={onClose}
      scrollLabel="Character details"
      footerNote={card.nameAndTitle}
      footer={<PixelButton onClick={onClose}>Back to the case</PixelButton>}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : '326px minmax(0, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div style={{ justifySelf: narrow ? 'center' : 'start' }}>
          <CardRenderer card={card} />
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <Section title="Standing">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Stat label="ATK" value={card.stats.Atk.value} />
              <Stat label="DEF" value={card.stats.Def.value} />
              {resource && <Stat label={resource.name.toUpperCase()} value={resource.entry.value} />}
            </div>
          </Section>

          {element && (
            <Section title="Element and bond">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Slot framed frameWidth={6} style={{ width: 74, height: 74, flex: '0 0 auto' }}>
                  {elementArt && (
                    <img
                      src={elementArt}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                </Slot>
                <div>
                  <p style={{ margin: 0, color: '#f3d99b', fontSize: 15 }}>{element.element}</p>
                  <p style={{ margin: '2px 0 0', color: '#b9a184', fontSize: 12 }}>
                    Bonded through {element.bond}
                  </p>
                </div>
              </div>
            </Section>
          )}

          <Section title={`Abilities · ${abilities.length}`}>
            {abilities.length === 0 ? (
              <p style={{ margin: 0, color: '#9b8f7e', fontSize: 13, fontStyle: 'italic' }}>
                None at this rank yet.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {abilities.map((a) => (
                  <div
                    key={a.displayName}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'baseline',
                      borderLeft: '2px solid rgba(201,162,39,0.45)',
                      paddingLeft: 10,
                    }}
                  >
                    <span style={{ color: '#f3d99b', fontSize: 14 }}>{a.displayName}</span>
                    <span style={{ color: '#8d7a5e', fontSize: 11, letterSpacing: '0.1em' }}>
                      {a.resourceLabel === 'NONE' ? a.slot.toUpperCase() : `${a.resourceCost} ${a.resourceLabel}`}
                    </span>
                    {a.descriptionShort && (
                      <span style={{ color: '#cbb9a0', fontSize: 12 }}>{a.descriptionShort}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {pillars.length > 0 && (
            <Section title="Their story">
              {/* Story Pillar answers are immutable generation facts — the
                  reason this character looks and reads the way it does. Showing
                  them is most of what makes a card feel authored rather than
                  rolled. */}
              <div style={{ display: 'grid', gap: 8 }}>
                {pillars.map(([q, a]) => (
                  <p key={q} style={{ margin: 0, fontSize: 13, color: '#cbb9a0', lineHeight: 1.55 }}>
                    {String(a)}
                  </p>
                ))}
              </div>
            </Section>
          )}

          {card.lore && (
            <Section title="Lore">
              <p style={{ margin: 0, fontSize: 13, color: '#cbb9a0', lineHeight: 1.65 }}>
                {card.lore}
              </p>
            </Section>
          )}
        </div>
      </div>
    </StallShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#a08c6e',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid rgba(201,162,39,0.35)',
        background: 'rgba(28,20,15,0.6)',
        padding: '6px 12px',
        minWidth: 74,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#a08c6e' }}>{label}</div>
      <div style={{ fontSize: 20, color: '#f3d99b', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}
