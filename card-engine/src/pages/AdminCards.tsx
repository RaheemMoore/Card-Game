// Placeholder for /admin/cards — the cross-user card gallery lands in
// Phase 3. The route exists now so the shell's sub-nav has a real
// destination and future work slots in without another routing change.

export function AdminCards() {
  return (
    <div className="rounded border border-bone/15 bg-void/40 p-6 text-center">
      <h2 className="font-fantasy text-lg text-bone mb-2">Cards</h2>
      <p className="text-sm text-bone/60">
        Cross-user card management lands in Phase 3. For now, use the Users tab and drill
        into a specific user's cards from their detail drawer.
      </p>
    </div>
  );
}
