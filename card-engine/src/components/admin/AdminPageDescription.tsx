// Collapsible "what is this?" strip that sits at the top of every
// admin destination. Body copy is intentionally long-form so the
// panel doubles as the built-in admin help — no separate /admin/help
// route needed.

export function AdminPageDescription({ title, body }: { title: string; body: string }) {
  return (
    <details className="mb-4 rounded border border-bone/15 bg-void/40">
      <summary className="cursor-pointer px-3 py-2 text-xs text-bone/70 flex items-center justify-between">
        <span className="font-fantasy uppercase tracking-wider">{title}</span>
        <span className="text-bone/40 text-[10px]">what is this?</span>
      </summary>
      <p className="text-xs text-bone/70 px-3 py-2 border-t border-bone/10 whitespace-pre-wrap">{body}</p>
    </details>
  );
}
