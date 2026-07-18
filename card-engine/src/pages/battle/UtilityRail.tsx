import type { PlayerAction } from '../../types/combat';

interface Props {
  onSubmit: (a: PlayerAction) => void;
  disabled: boolean;
}

/**
 * Guard / Focus / Inspect. Kept as small utility buttons — the approved
 * Command Strip visual system applies to abilities only per ATS §17. These
 * three actions don't consume the ability tier accent, so wrapping them in
 * strips would misrepresent the visual language.
 */
export function UtilityRail({ onSubmit, disabled }: Props) {
  return (
    <div className="rounded-lg border border-bone/15 bg-void/40 p-3 mb-3 flex flex-wrap gap-2 justify-center">
      <Button label="Guard" hint="+shield, +5 ult" onClick={() => onSubmit({ kind: 'guard' })} disabled={disabled} />
      <Button label="Focus" hint="+2 resource, +3 ult" onClick={() => onSubmit({ kind: 'focus' })} disabled={disabled} />
      <Button label="Inspect" hint="reveal (no effect at B4)" onClick={() => onSubmit({ kind: 'inspect' })} disabled={disabled} />
    </div>
  );
}

function Button({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-3 py-2 text-left border disabled:opacity-40 min-w-[110px]"
      style={{ background: 'rgba(155,182,179,0.10)', borderColor: 'rgba(155,182,179,0.35)' }}
    >
      <div className="text-xs font-fantasy text-bone">{label}</div>
      <div className="text-[10px] text-bone/60 mt-0.5">{hint}</div>
    </button>
  );
}
