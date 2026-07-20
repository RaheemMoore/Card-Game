import { MonitorSmartphone } from 'lucide-react';

export interface AdminUnsupportedDeviceProps {
  feature?: string;
}

// Intentional unsupported-device screen for paid-generation workspaces below
// 768px. Rendering this instead of the workspace guarantees paid controls are
// not mounted (not merely hidden), per the handoff's security rule.
export function AdminUnsupportedDevice({ feature = 'This workspace' }: AdminUnsupportedDeviceProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-16" style={{ color: 'var(--admin-text)' }}>
      <MonitorSmartphone size={40} style={{ color: 'var(--admin-text-muted)' }} aria-hidden />
      <h2 className="text-lg font-semibold">Larger screen required</h2>
      <p className="text-sm max-w-sm" style={{ color: 'var(--admin-text-muted)' }}>
        {feature} runs paid AI generation and is built for desktop, laptop, and tablet widths (768px and up).
        Open it on a larger screen to continue.
      </p>
    </div>
  );
}
