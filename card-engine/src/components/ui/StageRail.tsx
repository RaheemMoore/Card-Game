import { Slot } from './Slot';

/**
 * A named, pixel stage rail for multi-step stall flows.
 *
 * Replaces the Forge's old progress indicator, which was five numbered pills —
 * "1 2 3 4 5" tells you how far along you are and nothing about where you are.
 * In a ritual whose whole point is that it is a ritual, the steps have names:
 * you are choosing an archetype, then rolling, then answering, then binding an
 * element. Naming them is most of what makes this read as a rite rather than a
 * form wizard.
 *
 * Done steps stay legible rather than greying out. Looking back at what you have
 * already committed to is part of the experience, and it is also how you notice
 * that a choice is now locked.
 */

export interface Stage {
  id: string;
  label: string;
}

interface Props {
  stages: Stage[];
  /** Index of the stage the player is on. */
  current: number;
  compact?: boolean;
}

export function StageRail({ stages, current, compact = false }: Props) {
  return (
    <ol
      aria-label="Progress"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 4 : 8,
        listStyle: 'none',
        margin: 0,
        padding: 0,
        flexWrap: 'wrap',
      }}
    >
      {stages.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 8 }}>
            {i > 0 && (
              <span
                aria-hidden
                style={{
                  width: compact ? 10 : 18,
                  height: 2,
                  background: done || active ? '#c9a227' : '#4a3a2c',
                }}
              />
            )}
            <Slot
              framed
              frameWidth={5}
              selected={active}
              // A step is not a button: jumping back would rewind decisions the
              // forge treats as immutable generation facts.
              style={{
                width: compact ? 26 : 30,
                height: compact ? 26 : 30,
                opacity: done || active ? 1 : 0.5,
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '100%',
                  height: '100%',
                  fontSize: 11,
                  color: active ? '#f3d99b' : done ? '#c9a227' : '#8d7a5e',
                }}
              >
                {done ? '✓' : i + 1}
              </span>
            </Slot>
            {!compact && (
              <span
                aria-current={active ? 'step' : undefined}
                className="font-fantasy"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  color: active ? '#f3d99b' : done ? '#c9a227' : '#8d7a5e',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
