import type { BossCombatant, BattleIntent, BattleState } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { getCurrentBossVersion } from '../../services/bosses/registry';
import { CombatFrame } from './CombatFrame';

interface Props {
  boss: BossCombatant;
  intent: BattleIntent | null;
  currentBeat: AnimationBeat | null;
  state: BattleState;
}

/**
 * Upper-left Boss HUD + attached Intent panel.
 *
 * Both surfaces render through the shared CombatFrame primitive using the
 * canonical Figma presets (`bossHud` and `intent`). Layout, stroke, and
 * typography values follow the Figma Combat Frame System spec
 * (file 9IIvc01ts7LZJ0RaCMGanf, nodes 22:39 + 22:76). Do not fork.
 */
export function BossHUDOverlay({ boss, intent, currentBeat, state }: Props) {
  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const phaseLabel = boss.currentPhaseId.replace(/^phase_fe_/, '').toUpperCase();
  const isRage = phaseLabel === 'RAGE';
  const isWindingUp =
    currentBeat?.event.kind === 'boss_intent_declared' &&
    ['heavy_attack', 'area_attack', 'ultimate', 'execute'].includes(
      currentBeat.event.intent.intentType,
    );

  const RAGE_THRESHOLD = 0.25;
  const rageFillPct = Math.max(
    0,
    Math.min(100, ((RAGE_THRESHOLD - hpPct) / RAGE_THRESHOLD) * -100 + 100),
  );

  const version = getCurrentBossVersion(boss.snapshot.bossId);
  const resistances = version?.resistanceProfile ?? { resistant: [], weak: [] };

  const currentPhase = boss.snapshot.phases.find((p) => p.id === boss.currentPhaseId);
  const intentAction = intent ? currentPhase?.actions.find((a) => a.id === intent.actionId) : null;
  const projectedDamage = intentAction
    ? intentAction.baseDamage + Math.floor(intentAction.scalingPerRound * state.round)
    : 0;

  const targetHero = intent
    ? state.heroes.find((h) => h.actorId === intent.targetActorIds[0])
    : null;
  const targetLabel = targetHero
    ? targetHero.snapshot.displayName.toUpperCase()
    : intent && intent.targetActorIds.length > 1
    ? 'ALL HEROES'
    : '—';

  return (
    <div className="absolute top-3 left-3 z-30" style={{ width: 360 }}>
      {/* Localized dark radial for legibility over arena */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-lg"
        style={{
          top: '-12px',
          left: '-14px',
          right: '-14px',
          bottom: '-12px',
          background: 'radial-gradient(ellipse at 30% 45%, rgba(4,2,8,0.7) 0%, rgba(4,2,8,0) 78%)',
        }}
      />

      {/* Primary HUD frame — 360×184 per Figma 22:39 */}
      <CombatFrame
        preset="bossHud"
        style={{ height: 184 }}
        tokens={
          isRage
            ? { outer: '#c67027', shadow: '0px 8px 22px rgba(255,120,40,0.35)' }
            : undefined
        }
        role="status"
        ariaLabel={`${boss.snapshot.name}: ${boss.hp} of ${boss.snapshot.maxHp} HP, phase ${phaseLabel}`}
      >
        {/* Boss name — Figma: Inter Semi-Bold 18px #eddbb5 at (22,18) */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 18,
            color: '#eddbb5',
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: 0.4,
            lineHeight: 'normal',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {boss.snapshot.name.toUpperCase()}
        </div>

        {/* Subtitle — Figma: Inter Regular 10px #8c7d63 tracking 1.2px at (22,45) */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 45,
            color: '#8c7d63',
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: 1.2,
            whiteSpace: 'pre',
          }}
        >
          {`BOSS  •  ${phaseLabel}`}
        </div>

        {/* HP bar — Figma: frame 312×14, fill 276-scaled by pct */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 68,
            width: 312,
            height: 14,
            background: '#1a0909',
            border: '1px solid #4a1f14',
            borderRadius: 7,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 2,
              top: 2,
              width: `${Math.max(0, hpPct * 308)}px`,
              height: 10,
              background: '#c71412',
              borderRadius: 5,
              transition: 'width 300ms',
            }}
          />
        </div>

        {/* HP text — Figma: Inter Regular 11px #d9c7a6 at (22,89) */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 89,
            color: '#d9c7a6',
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {boss.hp} / {boss.snapshot.maxHp} HP
        </div>

        {/* RAGE label + bar — Figma: label Inter Semi-Bold 10px #e0912e at (22,110);
            bar frame 126×8 at (88,113); fill scaled by pct */}
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 110,
            color: '#e0912e',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'pre',
          }}
        >
          {`RAGE  ${Math.round(rageFillPct)}%`}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 113,
            width: 126,
            height: 8,
            background: '#1c140a',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 1,
              top: 1,
              width: `${(rageFillPct / 100) * 124}px`,
              height: 6,
              background: '#ed8c1a',
              borderRadius: 3,
              transition: 'width 500ms',
            }}
          />
        </div>

        {/* Resistance tiles — Figma: 3 chips at y=140, 24px tall */}
        <ResistTile
          x={22}
          w={58}
          label={`FIRE ${resistances.resistant.includes('fire' as never) ? '−' : ' '}`}
          active={resistances.resistant.includes('fire' as never)}
        />
        <ResistTile
          x={87}
          w={76}
          label={`ARMOR ${resistances.resistant.length}`}
          active={false}
        />
        <ResistTile
          x={170}
          w={58}
          label={isRage ? 'RAGE ⚡' : 'RAGE'}
          active={isRage}
        />
      </CombatFrame>

      {/* Intent panel — 360×112, attached below with matching visual language */}
      {intent && (
        <div style={{ marginTop: 6 }}>
          <CombatFrame
            preset="intent"
            style={{
              height: 112,
              ...(isWindingUp
                ? { boxShadow: '0px 6px 20px rgba(255,120,40,0.5)' }
                : {}),
            }}
          >
            {/* Small diamond gem accent — Figma left corner at y=33 */}
            <div
              aria-hidden
              style={{ position: 'absolute', left: 6, top: 33, width: 20, height: 20 }}
            >
              <svg viewBox="0 0 14 14" style={{ width: '100%', height: '100%' }} fill="none">
                <path
                  d="M13 7L7 13L1 7L7 1L13 7Z"
                  fill="#ed9133"
                  stroke="#f5b95a"
                  strokeWidth="0.75"
                />
              </svg>
            </div>

            {/* INTENT label */}
            <div
              style={{
                position: 'absolute',
                left: 22,
                top: 14,
                color: '#ed9133',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1.8,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {isWindingUp ? 'WINDING UP' : 'INTENT'}
            </div>

            {/* Big label centered vertically */}
            <div
              style={{
                position: 'absolute',
                left: 22,
                top: 36,
                color: '#f0dbb5',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              {intentAction?.displayName?.toUpperCase() ?? 'ATTACK'}
            </div>

            {/* Telegraph */}
            <div
              style={{
                position: 'absolute',
                left: 22,
                top: 59,
                right: 22,
                color: '#b5a387',
                fontSize: 11,
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.35,
              }}
            >
              {intent.telegraphText}
            </div>

            {/* Target label — Figma: right column at (230,23) */}
            <div
              style={{
                position: 'absolute',
                left: 220,
                top: 23,
                color: '#d1bd9c',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1,
                fontFamily: 'Inter, system-ui, sans-serif',
                whiteSpace: 'pre',
              }}
            >
              {`TARGET  ${targetLabel}`}
            </div>

            {/* Damage number — Figma: right column at (244,49), Inter Semi-Bold 19px #ff571f */}
            {projectedDamage > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 220,
                  top: 49,
                  color: '#ff571f',
                  fontSize: 19,
                  fontWeight: 600,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                }}
              >
                {projectedDamage} {intent.targetActorIds.length > 1 ? 'EACH' : ''}
              </div>
            )}
          </CombatFrame>
        </div>
      )}
    </div>
  );
}

/** Resist tile matches Figma nodes 15:33/15:35/15:37 — 24px tall chip, 4px radius. */
function ResistTile({
  x,
  w,
  label,
  active,
}: {
  x: number;
  w: number;
  label: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 140,
        width: w,
        height: 24,
        background: active ? '#330d06' : '#121214',
        border: `1px solid ${active ? '#a62e0f' : '#4f3b24'}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
      aria-label={label}
    >
      <div
        style={{
          position: 'absolute',
          left: 7,
          top: 5,
          color: '#d9c7a3',
          fontSize: 9,
          fontWeight: 600,
          fontFamily: 'Inter, system-ui, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
}

