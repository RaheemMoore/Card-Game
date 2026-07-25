import { Link } from 'react-router-dom';
import type { ElementName } from '../types/bible';
import { ARCHETYPES } from '../data/archetypes';
import { getElementImage } from '../data/elementImages';
import { getElementVisual } from '../data/elementVisuals';
import {
  ELEMENT_CATEGORIES,
  ELEMENT_CODEX,
  archetypesForElement,
  essenceTags,
} from '../data/elementCodex';

/**
 * Elemental Codex — an editorial gallery of every element a champion can wield,
 * built around the custom crystal artwork. Each card pairs the art with a lore
 * blurb (data/elementCodex.ts), essence tags drawn from the visual-language
 * Bible, and the archetypes that can wield it.
 *
 * Elements without artwork are skipped (see getElementImage). Styling leans on
 * each element's own hue (data/elementVisuals.ts) so the page reads as a
 * spectrum rather than a uniform grid.
 */

function CodexTabs() {
  return (
    <nav className="flex items-center gap-2 mb-8" aria-label="Codex sections">
      <Link
        to="/codex"
        className="rounded-full border border-gold/30 px-4 py-1.5 text-sm text-bone/80 hover:border-gold/60 hover:text-ivory transition-colors"
      >
        Abilities
      </Link>
      <span
        aria-current="page"
        className="rounded-full border border-gold/70 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold"
      >
        Elements
      </span>
    </nav>
  );
}

function ElementCard({ element }: { element: ElementName }) {
  const image = getElementImage(element);
  const entry = ELEMENT_CODEX[element];
  const { color, glow } = getElementVisual(element);
  const wielders = archetypesForElement(element);
  const tags = essenceTags(element);
  if (!image || !entry) return null;

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border bg-obsidian/70 transition-all duration-200 hover:-translate-y-1"
      style={{ borderColor: `${color}40` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}cc`;
        e.currentTarget.style.boxShadow = `0 12px 34px -12px rgba(${glow},0.55)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${color}40`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Art with name overlaid on a scrim */}
      <div className="relative">
        <img
          src={image}
          alt={`${element} crystal`}
          className="w-full aspect-square object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3
            className="font-fantasy text-2xl font-bold leading-none"
            style={{ color, textShadow: `0 0 18px rgba(${glow},0.55), 0 2px 6px rgba(0,0,0,0.8)` }}
          >
            {element}
          </h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-bone/80">
            {entry.tagline}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm leading-relaxed text-bone/85">{entry.description}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{ background: `${color}1f`, color, border: `1px solid ${color}44` }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {wielders.length > 0 && (
          <div className="mt-auto border-t border-white/5 pt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-widest text-ash">Wielded by</p>
            <div className="flex flex-wrap gap-1.5">
              {wielders.map((arch) => (
                <span
                  key={arch}
                  className="rounded-md bg-slate-dark/70 px-2 py-0.5 text-[11px] text-bone/90"
                  style={{ boxShadow: `inset 0 0 0 1px ${ARCHETYPES[arch].palette.accent}55` }}
                >
                  {arch}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function CodexElements() {
  const total = ELEMENT_CATEGORIES.reduce((n, c) => n + c.elements.length, 0);

  return (
    <div className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="font-fantasy text-3xl font-bold text-ivory">Elemental Codex</h1>
        <p className="mt-1 text-sm text-ash">
          The {total} powers a champion may wield. The element you choose at the forge shapes
          not only your strength, but the very forms you can become.
        </p>
      </header>

      <CodexTabs />

      <div className="space-y-12">
        {ELEMENT_CATEGORIES.map((cat) => (
          <section key={cat.id}>
            <div className="mb-4 border-b border-gold/20 pb-2">
              <h2 className="font-fantasy text-xl font-bold text-gold">{cat.title}</h2>
              <p className="mt-0.5 text-xs italic text-ash">{cat.blurb}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cat.elements.map((el) => (
                <ElementCard key={el} element={el} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
