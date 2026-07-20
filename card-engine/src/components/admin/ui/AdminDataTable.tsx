import type { ReactNode } from 'react';
import { AdminSkeleton } from './AdminSkeleton';
import { AdminEmptyState } from './AdminEmptyState';

export interface AdminColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Hidden on tablet; surfaced in the expandable row detail instead. */
  secondary?: boolean;
  widthClass?: string;
}

export interface AdminDataTableProps<T> {
  columns: AdminColumn<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
}

// One responsive table system for Users/Cards/Abilities. Desktop: full table.
// Tablet: secondary columns collapse into an expandable detail row (callers
// mark columns secondary). No uncontrolled page-level horizontal scroll.
export function AdminDataTable<T>({
  columns, rows, rowKey, onRowClick, selectedKey, loading, error, emptyTitle = 'Nothing here yet', emptyDescription,
}: AdminDataTableProps<T>) {
  if (error) {
    return (
      <div role="alert" style={{ background: 'rgba(240,97,109,0.12)', border: '1px solid rgba(240,97,109,0.4)', color: 'var(--admin-danger)', borderRadius: 'var(--admin-radius-control)' }} className="p-3 text-sm">
        {error}
      </div>
    );
  }
  if (loading || rows === null) {
    return (
      <div style={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-control)' }} className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <AdminSkeleton key={i} className="h-9" />)}
      </div>
    );
  }
  if (rows.length === 0) return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;

  const primary = columns.filter((c) => !c.secondary);
  const secondary = columns.filter((c) => c.secondary);

  return (
    <div style={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-control)' }} className="overflow-hidden">
      <table className="w-full text-sm" style={{ color: 'var(--admin-text)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-[11px] uppercase tracking-wide font-semibold ${c.secondary ? 'hidden lg:table-cell' : ''} ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'} ${c.widthClass ?? ''}`}
                style={{ color: 'var(--admin-text-muted)' }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = key === selectedKey;
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ borderTop: '1px solid var(--admin-border)', background: selected ? 'var(--admin-active-wash)' : undefined, cursor: onRowClick ? 'pointer' : undefined }}
                className={onRowClick ? 'hover:bg-white/[0.03]' : ''}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 align-top ${c.secondary ? 'hidden lg:table-cell' : ''} ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}
                    style={c.align === 'right' ? { fontVariantNumeric: 'tabular-nums' } : undefined}
                  >
                    {c.render(row)}
                    {/* Tablet: fold secondary columns into the primary cell of the first column. */}
                    {c.key === primary[0]?.key && secondary.length > 0 && (
                      <div className="lg:hidden mt-1 space-y-0.5">
                        {secondary.map((s) => (
                          <div key={s.key} className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                            <span className="uppercase tracking-wide mr-1">{s.header}:</span>{s.render(row)}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
