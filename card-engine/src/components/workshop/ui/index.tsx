import type { ReactNode } from 'react';
import type { Rank } from '../../../types/card';
import type { CuratedStatus, CuratedVariantStatus } from '../../../types/curatedCard';

/**
 * Workshop primitives.
 *
 * Ported from studio-wiki/src/components.tsx rather than reusing the admin UI
 * kit, because the Workshop is a place you work in for hours and the wiki's
 * language is built for that — quieter surfaces, tighter type, panels instead
 * of cards. Styling lives in index.css under the `--wk-*` block; these
 * components carry no inline styles so hover and focus states actually work.
 *
 * Where the admin kit already fits (AdminPreviewPanel's drawer, AdminButton,
 * AdminAlert, AdminUnsupportedDevice) it is used directly instead of re-ported.
 */

// ---------------------------------------------------------------------------
// Panel — the container everything composes from.
// ---------------------------------------------------------------------------

export function WkPanel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `wk-panel ${className}` : 'wk-panel'}>
      <div className="wk-panel-heading">
        {title ? <h2>{title}</h2> : null}
        {action}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page header.
// ---------------------------------------------------------------------------

export function WkPageHeader({
  eyebrow,
  title,
  intro,
  status,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <header className="wk-page-header">
      <div>
        {eyebrow ? <p className="wk-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {intro ? <p>{intro}</p> : null}
      </div>
      {status}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Status pill.
//
// Deliberately reads the workflow state in plain words rather than a colour
// alone — "AWAITING LORE" says who is holding the card, which is the question
// anyone looking at the roster is actually asking.
// ---------------------------------------------------------------------------

export type WkStatusValue = CuratedStatus | CuratedVariantStatus | 'empty';

const STATUS_LABEL: Record<WkStatusValue, string> = {
  empty: 'Empty',
  draft: 'Draft',
  seeded: 'Seeded',
  awaiting_lore: 'Awaiting lore',
  lore_ready: 'Ready for review',
  approved: 'Approved',
  permanent: 'Permanent',
  hidden: 'Hidden',
  retired: 'Retired',
};

export function WkStatus({ value }: { value: WkStatusValue }) {
  const slug = value.replace(/_/g, '-');
  return <span className={`wk-status wk-status-${slug}`}>{STATUS_LABEL[value]}</span>;
}

export function statusLabel(value: WkStatusValue): string {
  return STATUS_LABEL[value];
}

// ---------------------------------------------------------------------------
// Stage rail.
//
// Modeled on studio-wiki's WorkBoardNav: a numbered card row with a
// YOU ARE HERE footer, scroll-snapping horizontally when the screen is narrow.
// A stage can be locked — you cannot read the art before there is art — and a
// locked stage says why rather than simply refusing.
// ---------------------------------------------------------------------------

export interface WkStageDef {
  id: string;
  label: string;
  /** Reason this stage is not reachable yet. Undefined = reachable. */
  lockedReason?: string;
}

export function WkStageNav({
  stages,
  current,
  onSelect,
}: {
  stages: readonly WkStageDef[];
  current: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="wk-stage-nav" aria-label="Workshop stages">
      {stages.map((stage, i) => {
        const isCurrent = stage.id === current;
        const locked = Boolean(stage.lockedReason);
        return (
          <button
            key={stage.id}
            type="button"
            className={isCurrent ? 'wk-stage wk-stage-current' : 'wk-stage'}
            aria-current={isCurrent ? 'step' : undefined}
            disabled={locked && !isCurrent}
            title={stage.lockedReason}
            onClick={() => onSelect(stage.id)}
          >
            <span className="wk-stage-num">{String(i).padStart(2, '0')}</span>
            <span className="wk-stage-label">{stage.label}</span>
            <span className="wk-stage-foot">
              {isCurrent ? 'You are here' : locked ? stage.lockedReason : 'Open'}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Empty state.
//
// studio-wiki treats honesty as a feature — MissingMedia says "no substitute
// artwork used" rather than showing a placeholder that could be mistaken for
// real art. Same principle: an empty Workshop should say it is empty.
// ---------------------------------------------------------------------------

export function WkEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="wk-empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Triptych — Foundation | Forged | Ascendant, side by side.
//
// Raheem: "use that workbench setup that was previously set up to show this is
// the forge, this is the ascended, this is the foundation. Go ahead and display
// them all." It is the review surface for the rest of the pipeline, so it is
// pinned above every stage from the art onward: you are always looking at the
// character while you decide things about them.
//
// A missing rank shows an honest gap rather than a placeholder that could be
// mistaken for art — three panels, one of them visibly empty, is the fastest
// way to see what is still owed.
// ---------------------------------------------------------------------------

export interface TriptychPanel {
  rank: Rank;
  portraitUrl?: string;
  caption?: string;
}

export function WkTriptych({
  panels,
  onSelect,
  selectedRank,
}: {
  panels: readonly TriptychPanel[];
  onSelect?: (rank: Rank) => void;
  selectedRank?: Rank;
}) {
  return (
    <div className="wk-triptych">
      {panels.map((panel) => {
        const interactive = Boolean(onSelect);
        const body = (
          <>
            <span className="wk-triptych-rank">{panel.rank}</span>
            {panel.portraitUrl ? (
              <img src={panel.portraitUrl} alt={`${panel.rank} portrait`} />
            ) : (
              <span className="wk-triptych-gap">Not yet</span>
            )}
            {panel.caption ? <span className="wk-triptych-caption">{panel.caption}</span> : null}
          </>
        );
        return interactive ? (
          <button
            key={panel.rank}
            type="button"
            className={
              panel.rank === selectedRank ? 'wk-triptych-panel is-selected' : 'wk-triptych-panel'
            }
            onClick={() => onSelect?.(panel.rank)}
          >
            {body}
          </button>
        ) : (
          <div key={panel.rank} className="wk-triptych-panel">
            {body}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image drop — the first human-file input in this app.
//
// Nothing uploads until the operator has seen a preview of what they picked.
// Choosing the wrong file is the single most likely mistake here, and it is
// cheap to catch before the bytes leave the browser.
// ---------------------------------------------------------------------------

export function WkImageDrop({
  label,
  currentUrl,
  busy,
  error,
  onFile,
  onClear,
}: {
  label: string;
  currentUrl?: string;
  busy?: boolean;
  error?: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const inputId = `wk-drop-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="wk-drop">
      <span className="wk-field-label">{label}</span>
      <div
        className={currentUrl ? 'wk-drop-zone has-art' : 'wk-drop-zone'}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={`${label} art`} />
        ) : (
          <label htmlFor={inputId} className="wk-drop-prompt">
            {busy ? 'Uploading…' : 'Drop an image, or choose a file'}
          </label>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          className="wk-drop-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            // Clear so re-picking the SAME file still fires a change event.
            e.target.value = '';
          }}
        />
      </div>
      {error ? <p className="wk-error" style={{ marginTop: 6 }}>{error}</p> : null}
      {currentUrl && onClear ? (
        <button type="button" className="wk-tab" style={{ marginTop: 6 }} onClick={onClear}>
          Replace
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save chip — the autosave state, announced politely.
// ---------------------------------------------------------------------------

export type WkSaveState = 'idle' | 'saving' | 'saved' | 'error';

export function WkSaveChip({ state, error }: { state: WkSaveState; error?: string | null }) {
  if (state === 'idle') return null;
  const text =
    state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : (error ?? 'Not saved');
  return (
    <span className="wk-save-chip" data-state={state} aria-live="polite">
      {text}
    </span>
  );
}
