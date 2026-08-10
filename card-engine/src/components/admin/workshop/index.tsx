import { useState, type ReactNode } from 'react';
import { RANKS, type Rank } from '../../../types/card';
import { AdminCard, AdminButton, AdminStatusBadge, type BadgeTone } from '../ui';
import type { CuratedStatus, CuratedVariantStatus } from '../../../types/curatedCard';

/**
 * The four pieces the admin kit does not already have.
 *
 * Everything else the Workshop needs — page frame, cards, buttons, fields,
 * badges, empty states, tables, drawers — comes from `components/admin/ui`.
 * These four are genuinely new shapes, so they are built in the SAME idiom:
 * `--admin-*` tokens, Tailwind for layout, inline style only for token reads.
 * No new palette and no new token namespace.
 *
 * (An earlier version of the Workshop shipped a parallel `--wk-*` primitives
 * layer copied from the studio wiki. It was built without looking at the
 * deployed admin, looked foreign inside it, and was deleted. See CLAUDE.md.)
 */

// ---------------------------------------------------------------------------
// Status → badge tone. One mapping so a status can never read as two colours.
// ---------------------------------------------------------------------------

export type WorkshopStatus = CuratedStatus | CuratedVariantStatus | 'empty';

const STATUS_LABEL: Record<WorkshopStatus, string> = {
  empty: 'Empty',
  draft: 'Draft',
  seeded: 'Seeded',
  awaiting_lore: 'With Tori',
  lore_ready: 'Ready for review',
  approved: 'Approved',
  permanent: 'Permanent',
  hidden: 'Hidden',
  retired: 'Retired',
};

const STATUS_TONE: Record<WorkshopStatus, BadgeTone> = {
  empty: 'neutral',
  draft: 'neutral',
  seeded: 'accent',
  awaiting_lore: 'warning',
  lore_ready: 'accent',
  approved: 'success',
  permanent: 'success',
  hidden: 'neutral',
  retired: 'danger',
};

export function StatusBadge({ status }: { status: WorkshopStatus }) {
  return <AdminStatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</AdminStatusBadge>;
}

export function statusLabel(status: WorkshopStatus): string {
  return STATUS_LABEL[status];
}

// ---------------------------------------------------------------------------
// StageRail — the numbered stage switcher.
//
// A locked stage says WHY it is locked rather than just refusing; "Read the art"
// before there is art is a sequencing fact, not an error.
// ---------------------------------------------------------------------------

export interface StageDef {
  id: string;
  label: string;
  /** Reason this stage cannot be opened yet. Undefined = open. */
  lockedReason?: string;
}

export function StageRail({
  stages,
  current,
  onSelect,
}: {
  stages: readonly StageDef[];
  current: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Workshop stages"
      className="flex gap-2 overflow-x-auto pb-1 mb-5"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {stages.map((stage, i) => {
        const isCurrent = stage.id === current;
        const locked = Boolean(stage.lockedReason) && !isCurrent;
        return (
          <button
            key={stage.id}
            type="button"
            disabled={locked}
            title={stage.lockedReason}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => onSelect(stage.id)}
            style={{
              background: isCurrent ? 'var(--admin-active-wash)' : 'var(--admin-surface-strong)',
              border: `1px solid ${isCurrent ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              borderRadius: 'var(--admin-radius-control)',
              opacity: locked ? 0.45 : 1,
              cursor: locked ? 'not-allowed' : 'pointer',
              scrollSnapAlign: 'start',
            }}
            className="shrink-0 min-w-[9.5rem] text-left px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
          >
            <span
              className="block text-[10px] font-bold tracking-[0.1em] tabular-nums"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              {String(i).padStart(2, '0')}
            </span>
            <span
              className="block text-sm font-semibold truncate"
              style={{ color: 'var(--admin-text)' }}
            >
              {stage.label}
            </span>
            <span
              className="block text-[10px] uppercase tracking-wide mt-0.5 truncate"
              style={{ color: isCurrent ? 'var(--admin-accent-alt)' : 'var(--admin-text-muted)' }}
            >
              {isCurrent ? 'You are here' : (stage.lockedReason ?? 'Open')}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Triptych — Foundation | Forged | Ascendant.
//
// A rank with no art shows a dashed gap saying so. It is never filled with a
// placeholder image: three panels with one visibly empty is the fastest way to
// see what a character still owes.
// ---------------------------------------------------------------------------

export function Triptych({
  art,
  onZoom,
}: {
  art: Partial<Record<Rank, { portraitUrl?: string } | undefined>>;
  onZoom?: (rank: Rank, url: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {RANKS.map((rank) => {
        const url = art[rank]?.portraitUrl;
        return (
          <figure key={rank} className="m-0">
            {url ? (
              <button
                type="button"
                onClick={() => onZoom?.(rank, url)}
                className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                style={{ borderRadius: 'var(--admin-radius-control)', cursor: onZoom ? 'zoom-in' : 'default' }}
              >
                <img
                  src={url}
                  alt={`${rank} portrait`}
                  className="w-full block"
                  style={{
                    borderRadius: 'var(--admin-radius-control)',
                    border: '1px solid var(--admin-border)',
                  }}
                />
              </button>
            ) : (
              <div
                className="grid place-items-center text-xs italic"
                style={{
                  aspectRatio: '3 / 4',
                  border: '1px dashed var(--admin-border)',
                  borderRadius: 'var(--admin-radius-control)',
                  color: 'var(--admin-text-muted)',
                  background: 'var(--admin-surface-subtle)',
                }}
              >
                Not supplied
              </div>
            )}
            <figcaption
              className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              {rank}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Full-screen zoom for a triptych panel. Escape or backdrop closes. */
export function ImageZoom({
  url,
  caption,
  onClose,
}: {
  url: string;
  caption?: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption ?? 'Portrait'}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
      ref={(el) => el?.focus()}
      className="fixed inset-0 z-50 grid place-items-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <figure className="m-0 max-h-full">
        <img src={url} alt={caption ?? ''} className="max-h-[80vh] w-auto block mx-auto"
          style={{ borderRadius: 'var(--admin-radius-control)' }} />
        {caption && (
          <figcaption className="mt-2 text-center text-xs" style={{ color: '#fff' }}>{caption}</figcaption>
        )}
      </figure>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImageDrop — the first human-file input in this app.
//
// Nothing uploads until the operator has seen a preview of what they picked.
// Choosing the wrong file is the likeliest mistake here and the cheapest to
// catch before the bytes leave the browser.
// ---------------------------------------------------------------------------

export function ImageDrop({
  label,
  currentUrl,
  busy,
  error,
  onFile,
  onReplace,
}: {
  label: string;
  currentUrl?: string;
  busy?: boolean;
  error?: string | null;
  onFile: (file: File) => void;
  onReplace?: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputId = `drop-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="min-w-0">
      <span className="block mb-1 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </span>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className="relative grid place-items-center overflow-hidden"
        style={{
          aspectRatio: '3 / 4',
          border: `1px ${currentUrl ? 'solid' : 'dashed'} ${dragging ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
          borderRadius: 'var(--admin-radius-control)',
          background: dragging ? 'var(--admin-active-wash)' : 'var(--admin-surface-subtle)',
        }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={`${label} art`} className="w-full h-full object-contain block" />
        ) : (
          <label
            htmlFor={inputId}
            className="p-4 text-center text-xs cursor-pointer leading-relaxed"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            {busy ? 'Uploading…' : 'Drop an image, or choose a file'}
          </label>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ pointerEvents: currentUrl ? 'none' : undefined }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            // Reset so re-picking the SAME file still fires a change event.
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-[11px]" style={{ color: 'var(--admin-danger)' }}>{error}</p>
      )}
      {currentUrl && onReplace && (
        <AdminButton size="sm" variant="ghost" className="mt-1.5" onClick={onReplace}>
          Replace
        </AdminButton>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldDiff — proposed | accepted, side by side.
//
// The two columns never merge. Once a model's proposal is folded silently into
// a sheet, nobody can tell afterwards which parts were observed in the art and
// which a person typed — and a reviewer accepts these one at a time.
// ---------------------------------------------------------------------------

const CONFIDENCE_TONE: Record<string, BadgeTone> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
};

export function FieldDiffHeader() {
  return (
    <div
      className="hidden md:grid gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
      style={{
        gridTemplateColumns: 'minmax(120px, 0.7fr) minmax(0, 1.3fr) minmax(0, 1.3fr)',
        color: 'var(--admin-text-muted)',
        background: 'var(--admin-surface-subtle)',
        borderBottom: '1px solid var(--admin-border)',
      }}
    >
      <span>Field</span>
      <span>What the art shows</span>
      <span>Accepted</span>
    </div>
  );
}

export function FieldDiffRow({
  label,
  proposed,
  confidence,
  children,
  onAccept,
}: {
  label: string;
  proposed?: string;
  confidence?: string;
  children: ReactNode;
  onAccept?: () => void;
}) {
  return (
    <div
      className="grid gap-3 px-3 py-3"
      style={{
        gridTemplateColumns: 'minmax(120px, 0.7fr) minmax(0, 1.3fr) minmax(0, 1.3fr)',
        borderBottom: '1px solid var(--admin-border)',
      }}
    >
      <div className="min-w-0">
        <span className="block text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
          {label}
        </span>
        {confidence && (
          <span className="inline-block mt-1">
            <AdminStatusBadge tone={CONFIDENCE_TONE[confidence] ?? 'neutral'}>
              {confidence}
            </AdminStatusBadge>
          </span>
        )}
      </div>
      <div className="min-w-0">
        {proposed ? (
          <>
            <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
              {proposed}
            </p>
            {onAccept && (
              <AdminButton size="sm" variant="ghost" className="mt-1.5" onClick={onAccept}>
                Accept
              </AdminButton>
            )}
          </>
        ) : (
          <p className="text-xs italic m-0" style={{ color: 'var(--admin-text-muted)' }}>
            Not described
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist — a gate rendered as reasons, not a disabled button with no cause.
// ---------------------------------------------------------------------------

export function Checklist({
  items,
}: {
  items: readonly { id: string; label: string; ok: boolean; detail?: string }[];
}) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.id} className="grid gap-2.5 items-start" style={{ gridTemplateColumns: '18px minmax(0, 1fr)' }}>
          <span
            aria-hidden="true"
            className="text-sm font-bold leading-6"
            style={{ color: item.ok ? 'var(--admin-success)' : 'var(--admin-text-muted)' }}
          >
            {item.ok ? '✓' : '○'}
          </span>
          <div className="min-w-0">
            <p
              className="text-xs m-0 leading-6"
              style={{ color: item.ok ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}
            >
              {item.label}
            </p>
            {item.detail && (
              <p className="text-[11px] m-0" style={{ color: 'var(--admin-text-muted)' }}>
                {item.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// SaveChip — autosave state, announced politely.
// ---------------------------------------------------------------------------

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function SaveChip({ state, error }: { state: SaveState; error?: string | null }) {
  if (state === 'idle') return null;
  const colour =
    state === 'saved' ? 'var(--admin-success)'
    : state === 'error' ? 'var(--admin-danger)'
    : 'var(--admin-text-muted)';
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colour }} aria-live="polite">
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : (error ?? 'Not saved')}
    </span>
  );
}

export { AdminCard };
