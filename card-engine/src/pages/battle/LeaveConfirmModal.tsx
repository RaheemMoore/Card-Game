import { useEffect } from 'react';

/**
 * Leave confirmation, shared by the desktop (`BattleControls.tsx`) and
 * mobile (`mobile/MobileCombatScene.tsx`) Leave controls — neither had any
 * confirmation step before (Leave called `onExit` directly, instantly
 * forfeiting the battle entry cost). Same overlay language as
 * `ResultModal.tsx` (fixed inset-0 dark backdrop + rounded card) so it
 * doesn't introduce a new modal style. Escape cancels; the Cancel button is
 * focused by default so the safe choice is what Enter/Space activates if a
 * player just mashes a key.
 */
export function LeaveConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="leave-confirm-title"
      className="fixed inset-0 flex items-center justify-center z-50"
    >
      <div
        onClick={onCancel}
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,8,0.8)' }}
      />
      <div
        className="relative max-w-sm mx-4 p-6 rounded-lg border shadow-2xl"
        style={{
          background: 'linear-gradient(to bottom, #2a1010, #1a0808)',
          color: '#faeaca',
          borderColor: 'rgba(220,38,38,0.5)',
        }}
      >
        <h2 id="leave-confirm-title" className="font-fantasy text-xl mb-2">
          Leave battle?
        </h2>
        <p className="text-sm mb-4 opacity-85">
          The entry cost is forfeited and this attempt ends immediately.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="flex-1 py-2 rounded font-fantasy font-bold border focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{ background: 'transparent', color: '#faeaca', borderColor: 'currentColor' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 rounded font-fantasy font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{ background: '#8a1c1c', color: '#faeaca' }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
