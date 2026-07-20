import type { BossCombatant } from '../../../types/combat';
import { getCurrentBossVersion } from '../../../services/bosses/registry';
import { CombatFrame } from '../CombatFrame';

interface Props {
  boss: BossCombatant;
  round: number;
}

/**
 * Compact top-left boss chip. Small enough not to occlude the boss sprite
 * behind it — occupies ~46% of viewport width and ~62px tall. Contains:
 *   - Boss name + Lv (row 1)
 *   - Compact HP bar with inline HP text
 *   - Small rage bar with status glyphs
 *
 * The turn counter and any status icons that need extra room are rendered
 * separately by MobileCombatScene; this chip stays intentionally lean so the
 * arena breathes.
 */
export function MobileBossHeader({ boss, round }: Props) {
  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const phaseLabel = boss.currentPhaseId.replace(/^phase_fe_/, '').toUpperCase();
  const isRage = phaseLabel === 'RAGE';

  const RAGE_THRESHOLD = 0.25;
  const rageFillPct = Math.max(
    0,
    Math.min(100, ((RAGE_THRESHOLD - hpPct) / RAGE_THRESHOLD) * -100 + 100),
  );

  const version = getCurrentBossVersion(boss.snapshot.bossId);
  const resistances = version?.resistanceProfile ?? { resistant: [], weak: [] };
  const fireResist = resistances.resistant.includes('fire' as never);
  const displayLevel = Math.max(1, Math.round(boss.snapshot.maxHp / 6.8));

  return (
    <CombatFrame
      preset="bossHud"
      tokens={isRage ? { outer: '#c67027', shadow: '0px 4px 12px rgba(255,120,40,0.35)' } : undefined}
      style={{ padding: '5px 8px', width: 188 }}
      role="status"
      ariaLabel={`${boss.snapshot.name}: ${boss.hp} of ${boss.snapshot.maxHp} HP, phase ${phaseLabel}, turn ${round}`}
    >
      <div style={{ position: 'relative', padding: '2px 4px' }}>
        {/* Row 1 — Name + Lv */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          <div
            style={{
              color: '#eddbb5',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.5,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
              flex: 1,
            }}
          >
            {boss.snapshot.name.toUpperCase()}
          </div>
          <div
            style={{
              color: '#c39a4c',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.8,
              fontFamily: 'Inter, system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            LV.{displayLevel}
          </div>
        </div>

        {/* Row 2 — HP bar with in-line HP text */}
        <div style={{ marginTop: 3, position: 'relative' }}>
          <div
            style={{
              width: '100%',
              height: 8,
              background: '#1a0909',
              border: '1px solid #4a1f14',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 1,
                top: 1,
                bottom: 1,
                width: `calc(${Math.max(0, hpPct * 100)}% - 2px)`,
                background: 'linear-gradient(to bottom, #e01a1a, #a51012)',
                borderRadius: 3,
                transition: 'width 300ms',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f4e0b0',
              fontSize: 8,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 700,
              textShadow: '0 1px 2px rgba(0,0,0,0.95)',
              letterSpacing: 0.3,
              pointerEvents: 'none',
            }}
          >
            {boss.hp} / {boss.snapshot.maxHp}
          </div>
        </div>

        {/* Row 3 — Rage + status */}
        <div
          style={{
            marginTop: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {/* Rage bar (label baked into fill start) */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div
              style={{
                width: '100%',
                height: 6,
                background: '#1c140a',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${rageFillPct}%`,
                  background: 'linear-gradient(to right, #ed8c1a, #ffb246)',
                  borderRadius: 2,
                  transition: 'width 500ms',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: 3,
                top: -1,
                color: '#e0912e',
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: 0.6,
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1,
                textShadow: '0 1px 2px rgba(0,0,0,0.95)',
                pointerEvents: 'none',
              }}
            >
              RAGE {Math.round(rageFillPct)}%
            </div>
          </div>

          {/* Compact status pips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {fireResist && <StatusDot glyph="🔥" tone="resist" label="Fire resist" />}
            <StatusDot glyph="🛡" tone="neutral" label="Armor" />
            {isRage && <StatusDot glyph="💀" tone="rage" label="Rage active" />}
          </div>

          <div
            style={{
              color: '#8a7554',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 0.8,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
            aria-label={`Turn ${round}`}
          >
            T{round}
          </div>
        </div>
      </div>
    </CombatFrame>
  );
}

function StatusDot({
  glyph,
  tone,
  label,
}: {
  glyph: string;
  tone: 'resist' | 'neutral' | 'rage';
  label: string;
}) {
  const bg =
    tone === 'resist' ? '#3a1408' : tone === 'rage' ? '#2a0810' : '#141416';
  const border =
    tone === 'resist' ? '#a63414' : tone === 'rage' ? '#8a2540' : '#4f3b24';
  return (
    <div
      aria-label={label}
      title={label}
      style={{
        width: 14,
        height: 14,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 8,
        lineHeight: 1,
      }}
    >
      {glyph}
    </div>
  );
}
