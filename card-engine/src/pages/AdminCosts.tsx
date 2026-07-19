// Placeholder for /admin/costs — the Costs & System dashboard (per-action
// costs, provider rate tables, api_usage_events breakdown) lands in
// Phase 2. Route exists now so the shell nav has a real destination.

export function AdminCosts() {
  return (
    <div className="rounded border border-bone/15 bg-void/40 p-6 text-center">
      <h2 className="font-fantasy text-lg text-bone mb-2">Costs &amp; System</h2>
      <p className="text-sm text-bone/60">
        Per-action costs, provider rate details, and full api_usage_events breakdown land in Phase 2.
      </p>
    </div>
  );
}
