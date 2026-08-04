import type { ReactNode } from 'react';
import { Panel } from './Panel';
import { Scrim } from './Scrim';
import { ScrollArea } from './ScrollArea';
import { StageRail, type Stage } from './StageRail';

/**
 * The shared case every stall menu opens into.
 *
 * Extracted from the Collection once a second stall needed the same shape, so
 * the Forge, Battle Tower and Training Yard inherit the parts that were argued
 * over rather than re-deriving them: a definite-height case that does not resize
 * as its contents change, a scroll region that admits it scrolls, a bottom sheet
 * on phone portrait, and one dismiss/focus-trap behaviour.
 *
 * WHY A DEFINITE HEIGHT IS NON-NEGOTIABLE HERE: a flex child with `flex-basis: 0`
 * contributes nothing to a content-sized parent, so a scroller inside a
 * max-height-only case collapses to a few pixels and the case shrinks around it.
 * `Scrim` owns that height. Do not "fix" a short menu by making it content-sized.
 *
 * `stages` is optional — the Collection has no steps, the Forge has five. When
 * present the rail sits under the title, because a ritual should say which step
 * you are on before it shows you the step.
 */

interface Props {
  title: string;
  /** Small line beside the title — a count, a cost, a state. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Right-aligned actions. The caller supplies its own close/back control. */
  footer?: ReactNode;
  /** Left-aligned footer text — selection state, hints, errors. */
  footerNote?: ReactNode;
  stages?: Stage[];
  currentStage?: number;
  /** Fixed-position content between the header and the scroll region. */
  toolbar?: ReactNode;
  onClose: () => void;
  narrow: boolean;
  scrollLabel?: string;
}

export function StallShell({
  title,
  subtitle,
  children,
  footer,
  footerNote,
  stages,
  currentStage = 0,
  toolbar,
  onClose,
  narrow,
  scrollLabel,
}: Props) {
  return (
    <Scrim onClose={onClose} label={title} bottomSheet={narrow}>
      <Panel
        variant="sheet"
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '4px 4px 12px',
            flexWrap: 'wrap',
          }}
        >
          <h2
            className="font-fantasy"
            style={{ fontSize: narrow ? 19 : 22, color: '#f3d99b', letterSpacing: '0.04em', margin: 0 }}
          >
            {title}
          </h2>
          {subtitle && <span style={{ fontSize: 12, color: '#b9a184' }}>{subtitle}</span>}
        </header>

        {stages && (
          <div style={{ paddingBottom: 12 }}>
            <StageRail stages={stages} current={currentStage} compact={narrow} />
          </div>
        )}

        {toolbar}

        <ScrollArea axis="y" label={scrollLabel ?? title} style={{ flex: 1 }} contentStyle={{ padding: 4 }}>
          {children}
        </ScrollArea>

        {(footer || footerNote) && (
          <footer
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingTop: 14,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12, color: '#b9a184', flex: 1, minWidth: '14ch' }}>
              {footerNote}
            </span>
            {footer}
          </footer>
        )}
      </Panel>
    </Scrim>
  );
}
