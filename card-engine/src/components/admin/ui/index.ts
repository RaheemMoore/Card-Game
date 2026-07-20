// Admin design-system primitives (Phase 2 overhaul). Import from here so page
// code depends on the semantic component layer, not ad hoc Tailwind strings.
export { AdminPage, AdminSection } from './AdminPage';
export { AdminCard } from './AdminCard';
export { AdminMetricCard } from './AdminMetricCard';
export { AdminButton } from './AdminButton';
export { AdminStatusBadge } from './AdminStatusBadge';
export type { BadgeTone } from './AdminStatusBadge';
export { AdminAlert } from './AdminAlert';
export { AdminEmptyState } from './AdminEmptyState';
export { AdminSkeleton } from './AdminSkeleton';
export { AdminField, AdminSelect, AdminTextArea } from './AdminField';
export { AdminFilterBar } from './AdminFilterBar';
export { AdminDataTable } from './AdminDataTable';
export type { AdminColumn } from './AdminDataTable';
export { AdminUnsupportedDevice } from './AdminUnsupportedDevice';
