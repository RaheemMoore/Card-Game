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
  /** Edge-to-edge, for surfaces whose background art IS the experience. */
  fullBleed?: boolean;
  /**
   * Painted plate shown behind the content, full-bleed only. The Forge passes
   * the chosen archetype's commissioned background here.
   */
  backdrop?: string;
  /**
   * Render the body in the available space with NO scroller.
   *
   * Raheem, on the element step: "There should be no scroll... it makes it look
   * dirty, runs damage in the background." The scroll fades are right for a
   * collection of unknown length and wrong for a step whose whole content is
   * meant to be seen at once — the fade reads as grime over the painting.
   */
  noScroll?: boolean;
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
  fullBleed = false,
  backdrop,
  noScroll = false,
}: Props) {
  // Full-bleed puts the frame ON the screen edge, so content needs its own
  // inset or it collides with the art of the frame. Raheem: "the archetype
  // checkbox is smashed up against the frame — let me get a little bit of
  // padding over there to the left."
  const inset = fullBleed ? (narrow ? 16 : 30) : 4;
  return (
    <Scrim onClose={onClose} label={title} bottomSheet={narrow} fullBleed={fullBleed}>
      <Panel
        variant="sheet"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flex: 1,
          position: 'relative',
          // Full-bleed keeps the frame as a border on the screen edge rather
          // than a floating box, so the art reads as the room you are standing
          // in instead of a picture hung on a wall.
          //
          // SPREAD THE KEY ONLY WHEN THERE IS A BACKDROP. `background: undefined`
          // is not the same as omitting it — Panel spreads `style` AFTER its own
          // computed background, so an explicit undefined ERASES the default
          // instead of falling back to it. That made the Card Detail surface
          // fully transparent, with the Collection showing through its text.
          ...(backdrop ? { background: 'transparent' } : null),
        }}
      >
        {backdrop && (
          <>
            <img
              src={backdrop}
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0,
              }}
            />
            {/* Readability over ELEVEN different paintings, without flattening
                any of them. Two layers, deliberately:
                  - a vertical gradient anchoring the header and footer bands;
                  - a centre-column wash behind where the questions actually sit.
                The second one is what the Druid plate proved necessary: its
                bright sky sits exactly mid-screen, and the sub-heading and
                "show different options" link both vanished into it. The wash is
                an ellipse rather than a band so the art stays fully visible down
                the left and right of the screen, which is where these plates put
                their trees, architecture and silhouettes. */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background:
                  'linear-gradient(180deg, rgba(10,6,14,0.88) 0%, rgba(10,6,14,0.34) 34%, rgba(10,6,14,0.38) 64%, rgba(10,6,14,0.90) 100%)',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background:
                  'radial-gradient(ellipse 46% 62% at 50% 48%, rgba(8,5,12,0.72) 0%, rgba(8,5,12,0.45) 55%, rgba(8,5,12,0) 100%)',
              }}
            />
          </>
        )}
        <header
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: `4px ${inset}px 12px`,
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
          <div
            style={{
              padding: `0 ${inset}px 12px`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <StageRail stages={stages} current={currentStage} compact={narrow} />
          </div>
        )}

        {toolbar && (
          <div style={{ position: 'relative', zIndex: 1, padding: `0 ${inset}px` }}>{toolbar}</div>
        )}

        {noScroll ? (
          // Centred in whatever room is left, rather than pinned to the top of a
          // scroller. A step that fits should look composed, not truncated.
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              zIndex: 1,
              padding: `0 ${inset}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {children}
          </div>
        ) : (
          <ScrollArea
            axis="y"
            label={scrollLabel ?? title}
            style={{ flex: 1, position: 'relative', zIndex: 1 }}
            contentStyle={{ padding: `0 ${inset}px` }}
          >
            {children}
          </ScrollArea>
        )}

        {(footer || footerNote) && (
          <footer
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: `14px ${inset}px 0`,
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
