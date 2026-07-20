import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import {
  createArchetypeProposal,
  listArchetypeProposals,
  getArchetypeProposalPayload,
} from '../services/persistence/adminService';
import { readLabHandoff, clearLabHandoff, type LabHandoff } from '../services/labWorkshopHandoff';
import type {
  ArchetypeProposal,
  ArchetypeProposalPayload,
  CardLineageRef,
  LayerSnapshot,
  ProposalFailureType,
  ProposalLayer,
} from '../types/archetypeProposal';
import type { ArchetypeName, Card, Rank, StatName } from '../types/card';
import { ARCHETYPE_NAMES } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';
import { ARCHETYPE_BIBLE } from '../data/archetypeBible';
import { getQuestionsForArchetype, getOptionsForQuestion } from '../data/storyPillars';
import { ELEMENT_COMPATIBILITY, elementsAvailableToArchetype } from '../data/elements';
import {
  ARCHETYPE_LAYERS,
  FAILURE_TYPES,
  LAYER_ORDER,
} from '../data/archetypeLayers';
import { getMetaPromptBlock } from '../data/metaPromptBlocks';
import {
  getDominantStat,
  getOverallRank,
  getVisualMotif,
  getSpecializationSuffix,
  deriveStatRanks,
} from '../data/powerSystem';
import {
  AdminPage,
  AdminSection,
  AdminCard,
  AdminButton,
  AdminStatusBadge,
  AdminAlert,
  AdminSelect,
  AdminTextArea,
} from '../components/admin/ui';

const RANK_ORDER: Rank[] = ['Foundation', 'Forged', 'Ascendant'];
const STAT_ORDER: StatName[] = ['Atk', 'Def', 'Mana', 'Tech'];

const GITHUB_COMMIT_BASE = 'https://github.com/RaheemMoore/Card-Game/commit/';

// Placeholder gradient for cards/tiers with no portrait yet.
const PORTRAIT_PLACEHOLDER = 'linear-gradient(135deg, var(--admin-surface-strong), var(--admin-canvas))';

// Plain-text relative age ("3d ago") — no color-only urgency.
function relativeAge(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function ArchetypeWorkshop() {
  const [searchParams] = useSearchParams();
  const initialArchetype = ((): ArchetypeName => {
    const q = searchParams.get('archetype');
    if (q && (ARCHETYPE_NAMES as readonly string[]).includes(q)) {
      return q as ArchetypeName;
    }
    return 'Seraph';
  })();
  // Prompt Lab handoff (from "Send to Workshop"). Read once; if present it
  // pre-selects the archetype and becomes the critique subject.
  const [labHandoff] = useState<LabHandoff | null>(() =>
    searchParams.get('from') === 'lab' ? readLabHandoff() : null,
  );
  const [archetype, setArchetype] = useState<ArchetypeName>(labHandoff?.archetype ?? initialArchetype);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ArchetypeProposal[] | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Pull all cards of the selected archetype visible to this admin (RLS
  // widens SELECT for admins). Big single query — fine at studio scale.
  useEffect(() => {
    let cancelled = false;
    setCards(null);
    setLoadError(null);
    const supa = getSupabaseClient();
    if (!supa) {
      setLoadError(
        'Supabase not configured (VITE_SUPABASE_URL missing). The workshop needs a live database to load cards and store proposals.',
      );
      setCards([]);
      return;
    }
    void supa
      .from('cards')
      .select('data')
      .eq('archetype', archetype)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          setCards([]);
          return;
        }
        setCards((data ?? []).map((row) => (row as { data: Card }).data));
      });
    return () => {
      cancelled = true;
    };
  }, [archetype]);

  useEffect(() => {
    let cancelled = false;
    listArchetypeProposals({ archetype, limit: 20 })
      .then((rows) => {
        if (!cancelled) setProposals(rows);
      })
      .catch((err) => {
        if (!cancelled) console.warn('Failed to load proposals', err);
      });
    return () => {
      cancelled = true;
    };
  }, [archetype, refreshTick]);

  const selectedCard = useMemo(() => {
    if (!cards || !selectedCardId) return null;
    return cards.find((c) => c.cardId === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

  return (
    <AdminPage
      title="Archetype Workshop"
      description="File lore/art change proposals against a specific archetype and card, mapped to the layer where change actually happens (A Canon / B Rank & Stat Visuals / C Story Pillars & Elements / D Meta-Prompt & Escalation)."
      actions={
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          Archetype
          <AdminSelect
            aria-label="Archetype"
            value={archetype}
            onChange={(e) => {
              setArchetype(e.target.value as ArchetypeName);
              setSelectedCardId(null);
            }}
            className="min-w-[10rem]"
          >
            {ARCHETYPE_NAMES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </AdminSelect>
        </label>
      }
    >
      {loadError && (
        <AdminAlert tone="danger" className="mb-4">
          {loadError}
        </AdminAlert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
        {/* LEFT column: card picker + tiers + layer state */}
        <div className="space-y-4">
          <CardPickerRail
            cards={cards}
            selectedCardId={selectedCardId}
            onSelect={setSelectedCardId}
          />
          <TierSnapshotPanel card={selectedCard} />
          <LayerStatePanels archetype={archetype} card={selectedCard} />
        </div>

        {/* RIGHT column: triage form */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TriageForm
            archetype={archetype}
            selectedCard={selectedCard}
            labHandoff={selectedCardId ? null : labHandoff}
            onSubmitted={() => setRefreshTick((t) => t + 1)}
          />
        </div>
      </div>

      <div className="mt-4">
        <ProposalsList proposals={proposals} archetype={archetype} />
      </div>
    </AdminPage>
  );
}

// ─── Card picker rail ────────────────────────────────────────────────

function CardPickerRail({
  cards,
  selectedCardId,
  onSelect,
}: {
  cards: Card[] | null;
  selectedCardId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <AdminCard>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          1. Pick a character
        </h2>
        <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          {cards === null ? 'loading…' : `${cards.length} cards`}
        </span>
      </div>
      {cards === null && (
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Loading cards for this archetype…
        </div>
      )}
      {cards && cards.length === 0 && (
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          No cards of this archetype exist yet. Forge one from{' '}
          <Link to="/forge" className="underline" style={{ color: 'var(--admin-accent)' }}>
            /forge
          </Link>{' '}
          to have something to critique.
        </div>
      )}
      {cards && cards.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
          {cards.map((c) => {
            const active = c.cardId === selectedCardId;
            const rank = getOverallRank(c.stats);
            return (
              <button
                key={c.cardId}
                onClick={() => onSelect(c.cardId)}
                className="text-left rounded overflow-hidden transition-all"
                style={{
                  border: active
                    ? '2px solid var(--admin-accent)'
                    : '1px solid var(--admin-border)',
                  background: active ? 'var(--admin-active-wash)' : 'var(--admin-canvas)',
                }}
              >
                <div
                  className="aspect-[3/4] bg-cover bg-center"
                  style={{
                    backgroundImage: c.portraitAsset
                      ? `url(${c.portraitAsset})`
                      : PORTRAIT_PLACEHOLDER,
                  }}
                />
                <div className="px-1.5 py-1">
                  <div
                    className="text-[10px] truncate font-medium"
                    style={{ color: 'var(--admin-text)' }}
                    title={c.cardName}
                  >
                    {c.cardName}
                  </div>
                  <div className="text-[9px] uppercase" style={{ color: 'var(--admin-text-muted)' }}>
                    {rank}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}

// ─── Tier snapshot loader ────────────────────────────────────────────

interface TierSnap {
  portraitUrl: string;
  nameAndTitle: string;
  lore: string;
  source: 'evolutionHistory' | 'current';
}

function extractTierSnapshots(card: Card): Partial<Record<Rank, TierSnap>> {
  const result: Partial<Record<Rank, TierSnap>> = {};
  for (const rank of RANK_ORDER) {
    for (const stat of STAT_ORDER) {
      const snap = card.evolutionHistory?.[stat]?.[rank];
      if (snap) {
        result[rank] = {
          portraitUrl: snap.portraitUrl,
          nameAndTitle: snap.nameAndTitle,
          lore: snap.lore,
          source: 'evolutionHistory',
        };
        break;
      }
    }
  }
  const currentRank = getOverallRank(card.stats);
  if (!result[currentRank]) {
    result[currentRank] = {
      portraitUrl: card.portraitAsset,
      nameAndTitle: card.nameAndTitle,
      lore: card.lore,
      source: 'current',
    };
  }
  return result;
}

function TierSnapshotPanel({ card }: { card: Card | null }) {
  if (!card) {
    return (
      <AdminCard>
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-muted)' }}>
          2. Character across tiers
        </div>
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Select a card above to see all of its rank snapshots.
        </div>
      </AdminCard>
    );
  }

  const tiers = extractTierSnapshots(card);
  const present = RANK_ORDER.filter((r) => tiers[r]);

  return (
    <AdminCard>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          2. Character across tiers
        </h2>
        <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          {present.length} of 3 tiers
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {RANK_ORDER.map((rank) => {
          const snap = tiers[rank];
          return (
            <div
              key={rank}
              className="rounded overflow-hidden"
              style={{
                background: 'var(--admin-canvas)',
                border: '1px solid var(--admin-border)',
                opacity: snap ? 1 : 0.5,
              }}
            >
              <div
                className="aspect-[3/4] bg-cover bg-center"
                style={{
                  backgroundImage: snap?.portraitUrl
                    ? `url(${snap.portraitUrl})`
                    : PORTRAIT_PLACEHOLDER,
                }}
              />
              <div className="p-2 space-y-1">
                <div
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  {rank}
                </div>
                {snap ? (
                  <>
                    <div className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                      {snap.nameAndTitle}
                    </div>
                    <div className="text-[11px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                      {snap.lore}
                    </div>
                    {snap.source === 'current' && (
                      <div className="text-[9px] italic" style={{ color: 'var(--admin-text-muted)' }}>
                        (current rank — no evolutionHistory entry)
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
                    Not reached yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}

// ─── Layer state readonly panels ─────────────────────────────────────

function LayerStatePanels({
  archetype,
  card,
}: {
  archetype: ArchetypeName;
  card: Card | null;
}) {
  const arch = ARCHETYPES[archetype];
  const bible = ARCHETYPE_BIBLE[archetype];
  const dominant = card ? getDominantStat(card.stats) : null;
  const rank = card ? getOverallRank(card.stats) : 'Foundation';
  const ranks = card ? deriveStatRanks(card.stats) : {};
  const dominantRank = dominant ? ranks[dominant] ?? rank : rank;

  const statVisual =
    dominant && card ? getVisualMotif(dominant, dominantRank) : null;
  const specialization =
    dominant && card
      ? getSpecializationSuffix(archetype, dominant, dominantRank)
      : null;
  const pillarQuestions = getQuestionsForArchetype(archetype);
  const elements = elementsAvailableToArchetype(archetype);
  const buckets = ELEMENT_COMPATIBILITY[archetype];
  const metaBlock = getMetaPromptBlock(archetype);

  const dashBorder = '1px dashed var(--admin-border)';

  return (
    <AdminCard>
      <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-muted)' }}>
        Current layer state for {archetype}
      </h2>
      <div className="space-y-2">
        <LayerPanel layer="A">
          <div className="space-y-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Identity through:</span>{' '}
              <span style={{ color: 'var(--admin-text)' }}>{bible.identityThrough}</span>
            </div>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Core fantasy:</span>{' '}
              <span style={{ color: 'var(--admin-text)' }}>{bible.coreFantasy}</span>
            </div>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Selection tagline:</span>{' '}
              <span style={{ color: 'var(--admin-text)' }}>{bible.selectionScreen.tagline}</span>
            </div>
            <div className="pt-1" style={{ borderTop: dashBorder }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Visual rank progression (legacy summary):</span>
              {RANK_ORDER.map((r) => (
                <div key={r} className="pl-2">
                  <span style={{ color: 'var(--admin-text-muted)' }}>{r}:</span>{' '}
                  <span style={{ color: 'var(--admin-text)' }}>{arch.rankProgression[r]}</span>
                </div>
              ))}
            </div>
            <div className="italic pt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Full canon: [Bible chapter §1–§14 for {archetype}] in data/archetypeBible/{archetype.toLowerCase().replace(' ', '')}.ts
            </div>
          </div>
        </LayerPanel>
        <LayerPanel layer="B">
          <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {card ? (
              <>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Dominant stat:</span>{' '}
                  <span style={{ color: 'var(--admin-text)' }}>{dominant ?? 'tied — no dominant'}</span>
                </div>
                {statVisual && (
                  <div className="mt-1">
                    <span style={{ color: 'var(--admin-text-muted)' }}>Visual motif ({dominantRank}):</span>{' '}
                    <span style={{ color: 'var(--admin-text)' }}>{statVisual}</span>
                  </div>
                )}
                {specialization && (
                  <div className="mt-1">
                    <span style={{ color: 'var(--admin-text-muted)' }}>Specialization suffix:</span>{' '}
                    <span style={{ color: 'var(--admin-text)' }}>{specialization}</span>
                  </div>
                )}
                {!statVisual && !specialization && (
                  <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
                    No stat-specific visuals apply — this card has no dominant stat.
                  </div>
                )}
              </>
            ) : (
              <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
                Select a card to see its stat-driven visuals.
              </div>
            )}
          </div>
        </LayerPanel>
        <LayerPanel layer="C">
          <div className="text-xs space-y-2" style={{ color: 'var(--admin-text-muted)' }}>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Story Pillar questions ({pillarQuestions.length}):</span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5" style={{ color: 'var(--admin-text)' }}>
                {pillarQuestions.slice(0, 6).map((q) => {
                  const opts = getOptionsForQuestion(archetype, q.id);
                  return (
                    <li key={q.id}>
                      {q.prompt}{' '}
                      <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                        ({opts.length} seed options)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="pt-1" style={{ borderTop: dashBorder }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Elements available ({elements.length} of 26):</span>
              <div className="mt-1 space-y-0.5" style={{ color: 'var(--admin-text)' }}>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Naturally compatible:</span>{' '}
                  {buckets.naturally_compatible.join(', ') || '—'}
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Through reinterpretation:</span>{' '}
                  {buckets.compatible_through_reinterpretation.join(', ') || '—'}
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Rare (narrative-gated):</span>{' '}
                  {buckets.rare.join(', ') || '—'}
                </div>
                {buckets.not_available && buckets.not_available.length > 0 && (
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)' }}>Not available:</span>{' '}
                    {buckets.not_available.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </LayerPanel>
        <LayerPanel layer="D">
          <div className="text-xs whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>
            {metaBlock ? (
              metaBlock
            ) : (
              <span className="italic" style={{ color: 'var(--admin-text-muted)' }}>
                No archetype-specific escalation block. This archetype relies on the
                generic prompt template for Forged/Ascendant — which is why the art
                often drifts. Adding a block here is the plan for step B.
              </span>
            )}
          </div>
        </LayerPanel>
      </div>
    </AdminCard>
  );
}

function LayerPanel({
  layer,
  children,
}: {
  layer: ProposalLayer;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(layer === 'A' || layer === 'D');
  const copy = ARCHETYPE_LAYERS[layer];
  return (
    <div
      className="rounded"
      style={{
        background: copy.accentBg,
        border: `1px solid ${copy.accentBorder}`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
          style={{ background: copy.color, color: '#111' }}
        >
          {layer}
        </span>
        <span className="font-bold text-sm" style={{ color: 'var(--admin-text)' }}>
          {copy.name}
        </span>
        <span className="text-[10px] italic" style={{ color: 'var(--admin-text-muted)' }}>
          {copy.tagline}
        </span>
        <span className="ml-auto text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ─── Triage form ─────────────────────────────────────────────────────

function TriageForm({
  archetype,
  selectedCard,
  labHandoff,
  onSubmitted,
}: {
  archetype: ArchetypeName;
  selectedCard: Card | null;
  labHandoff: LabHandoff | null;
  onSubmitted: () => void;
}) {
  const [failureType, setFailureType] = useState<ProposalFailureType>('lore_portrait_misaligned');
  const [layer, setLayer] = useState<ProposalLayer>('D');
  const [keep, setKeep] = useState('');
  const [change, setChange] = useState('');
  const [rejectIf, setRejectIf] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-align layer to whatever the failure hint suggests, but let the
  // user override — the hint doesn't lock the picker.
  useEffect(() => {
    const hint = FAILURE_TYPES.find((f) => f.id === failureType)?.hintLayer;
    if (hint) setLayer(hint);
  }, [failureType]);

  async function submit() {
    setError(null);
    setSuccess(null);
    if (!keep.trim() || !change.trim() || !rejectIf.trim()) {
      setError('Keep, Change, and Reject-if are all required.');
      return;
    }
    setBusy(true);
    try {
      const arch = ARCHETYPES[archetype];
      const bible = ARCHETYPE_BIBLE[archetype];
      const questions = getQuestionsForArchetype(archetype);
      const buckets = ELEMENT_COMPATIBILITY[archetype];
      const metaBlock = getMetaPromptBlock(archetype);
      const snapshot: LayerSnapshot = {
        canonIdentity: `${bible.identityThrough} — ${bible.coreFantasy}`,
        canonMotifs: arch.motifs,
        canonRankProgression: arch.rankProgression,
        statVisualsForCard: selectedCard
          ? (() => {
              const dom = getDominantStat(selectedCard.stats);
              const r = dom ? deriveStatRanks(selectedCard.stats)[dom] : undefined;
              return dom && r ? getVisualMotif(dom, r) : undefined;
            })()
          : undefined,
        classSignaturePoolSample: [
          `Story Pillar questions (${questions.length}): ${questions
            .slice(0, 4)
            .map((q) => q.prompt)
            .join(' | ')}`,
          `Naturally compatible elements: ${buckets.naturally_compatible.join(', ') || '—'}`,
          `Rare elements: ${buckets.rare.join(', ') || '—'}`,
        ],
        metaPromptBlock: metaBlock ?? '(none — archetype has no escalation block)',
      };
      let cardLineage: CardLineageRef | undefined;
      // Lab handoff wins as the subject when no real player card is picked:
      // the critique is about the Prompt Lab test the director just generated.
      if (!selectedCard && labHandoff) {
        cardLineage = {
          cardId: `lab:${labHandoff.runId}`,
          cardName: labHandoff.cardName ?? `Lab test (${labHandoff.tier})`,
          archetype: labHandoff.archetype,
          tiers: {
            [labHandoff.tier]: {
              nameAndTitle: labHandoff.nameAndTitle ?? '',
              lore: labHandoff.lore ?? '',
            },
          } as CardLineageRef['tiers'],
        };
      } else if (selectedCard) {
        const tiers = extractTierSnapshots(selectedCard);
        // Store text-only tier metadata. Portrait URLs are omitted here
        // (per P1) and looked up on-demand from the cards table when a
        // reviewer expands this proposal — otherwise every proposal row
        // is 1MB+ from three base64 data URLs.
        cardLineage = {
          cardId: selectedCard.cardId,
          cardName: selectedCard.cardName,
          archetype: selectedCard.archetype,
          tiers: {
            Foundation: tiers.Foundation && {
              nameAndTitle: tiers.Foundation.nameAndTitle,
              lore: tiers.Foundation.lore,
            },
            Forged: tiers.Forged && {
              nameAndTitle: tiers.Forged.nameAndTitle,
              lore: tiers.Forged.lore,
            },
            Ascendant: tiers.Ascendant && {
              nameAndTitle: tiers.Ascendant.nameAndTitle,
              lore: tiers.Ascendant.lore,
            },
          },
        };
      }
      const payload: ArchetypeProposalPayload = {
        keep: keep.trim(),
        change: change.trim(),
        rejectIf: rejectIf.trim(),
        notes: notes.trim() || undefined,
        referenceImageUrl: referenceImageUrl.trim() || undefined,
        layerSnapshot: snapshot,
        cardLineage,
        labRunId: !selectedCard && labHandoff ? labHandoff.runId : undefined,
      };
      await createArchetypeProposal({
        archetype,
        layer,
        failureType,
        cardId: selectedCard?.cardId ?? null,
        payload,
      });
      // The handoff is consumed — clear it so a later plain visit to the
      // Workshop doesn't resurrect this test as the subject.
      if (labHandoff) clearLabHandoff();
      setSuccess(
        `Proposal filed. Tell Claude "look at the latest ${archetype} proposal" in your next session.`,
      );
      setKeep('');
      setChange('');
      setRejectIf('');
      setNotes('');
      setReferenceImageUrl('');
      onSubmitted();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminCard className="space-y-4">
      {labHandoff && !selectedCard && (
        <AdminAlert tone="info">
          Critiquing a Prompt Lab test — <strong>{labHandoff.archetype} · {labHandoff.tier}</strong>
          {labHandoff.cardName ? ` · ${labHandoff.cardName}` : ''}. This proposal will reference the test run
          so the fix can be regenerated against it. (Pick a card above to critique a real card instead.)
        </AdminAlert>
      )}
      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-muted)' }}>
          3. What's the failure?
        </div>
        <div className="space-y-1">
          {FAILURE_TYPES.map((f) => {
            const active = failureType === f.id;
            return (
              <label
                key={f.id}
                className="flex items-start gap-2 p-2 rounded cursor-pointer"
                style={{
                  background: active ? 'var(--admin-active-wash)' : 'transparent',
                  border: `1px solid ${active ? 'var(--admin-border)' : 'transparent'}`,
                }}
              >
                <input
                  type="radio"
                  checked={active}
                  onChange={() => setFailureType(f.id)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                    {f.label}
                  </div>
                  <div className="text-[11px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                    {f.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-muted)' }}>
          4. Which layer to change?
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LAYER_ORDER.map((id) => {
            const copy = ARCHETYPE_LAYERS[id];
            const active = id === layer;
            return (
              <button
                key={id}
                onClick={() => setLayer(id)}
                className="text-left rounded p-2 transition-all"
                style={{
                  background: active ? copy.accentBg : 'var(--admin-canvas)',
                  border: `2px solid ${active ? copy.color : 'var(--admin-border)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{ background: copy.color, color: '#111' }}
                  >
                    {id}
                  </span>
                  <span className="font-bold text-sm" style={{ color: 'var(--admin-text)' }}>
                    {copy.name}
                  </span>
                </div>
                <div className="text-[10px] italic mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                  {copy.tagline}
                </div>
                <div className="text-[10px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Controls:</span> {copy.controls}
                </div>
                {active && (
                  <div
                    className="text-[10px] leading-snug mt-1 pt-1"
                    style={{
                      color: 'var(--admin-text-muted)',
                      borderTop: `1px dashed ${copy.accentBorder}`,
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--admin-text-muted)' }}>Affects:</span> {copy.affects}
                    </div>
                    <div className="mt-1">
                      <span style={{ color: 'var(--admin-text-muted)' }}>Change when:</span> {copy.changeWhen}
                    </div>
                    <div className="mt-1 italic">{copy.example(archetype)}</div>
                    <div className="mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                      Lives in: {copy.whereItLives}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <AdminTextArea
          label="5. Keep — the one thing that must survive"
          placeholder="e.g. The lycanthrope's identity token carrying across all three tiers."
          value={keep}
          rows={2}
          onChange={(e) => setKeep(e.target.value)}
        />
        <AdminTextArea
          label="6. Change — what you want different"
          placeholder="e.g. Add a Seraph-specific Forged/Ascendant block that scales wing count and halo intensity."
          value={change}
          rows={2}
          onChange={(e) => setChange(e.target.value)}
        />
        <AdminTextArea
          label="7. Reject if — how we know we failed"
          placeholder="e.g. If the Ascendant Seraph still shows the same wing count as the Foundation."
          value={rejectIf}
          rows={2}
          onChange={(e) => setRejectIf(e.target.value)}
        />
        <AdminTextArea
          label="Notes (optional)"
          placeholder="Anything else Claude should know."
          value={notes}
          rows={2}
          onChange={(e) => setNotes(e.target.value)}
        />
        <AdminTextArea
          label="Reference image URL (optional)"
          placeholder="https://…"
          value={referenceImageUrl}
          rows={2}
          onChange={(e) => setReferenceImageUrl(e.target.value)}
        />
      </div>

      {error && <AdminAlert tone="danger">{error}</AdminAlert>}
      {success && <AdminAlert tone="success">{success}</AdminAlert>}

      <AdminButton
        variant="primary"
        onClick={submit}
        disabled={busy}
        className="w-full"
      >
        {busy ? 'Filing…' : 'File proposal'}
      </AdminButton>
    </AdminCard>
  );
}

// ─── Proposals list ──────────────────────────────────────────────────

function ProposalsList({
  proposals,
  archetype,
}: {
  proposals: ArchetypeProposal[] | null;
  archetype: ArchetypeName;
}) {
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('proposal');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Payloads are omitted from the list (P1: kept the list rows cheap).
  // Fetched on-demand when a row is expanded; cached here per proposal id.
  const [payloads, setPayloads] = useState<Record<string, ArchetypeProposalPayload | null>>({});
  const [payloadErrors, setPayloadErrors] = useState<Record<string, string>>({});

  function fetchPayload(id: string) {
    if (id in payloads || id in payloadErrors) return;
    getArchetypeProposalPayload(id)
      .then((p) => setPayloads((prev) => ({ ...prev, [id]: p })))
      .catch((err) => {
        const msg = (err as { message?: string })?.message ?? String(err);
        setPayloadErrors((prev) => ({ ...prev, [id]: msg }));
      });
  }

  function togglePayload(id: string) {
    const nowOpen = expandedId !== id;
    setExpandedId(nowOpen ? id : null);
    if (nowOpen) fetchPayload(id);
  }

  // Deep-link support: /admin/workshop?...&proposal=<id> auto-expands that
  // row once the proposals for this archetype have loaded (the archetype
  // filter is already applied upstream via the ?archetype= param).
  useEffect(() => {
    if (!deepLinkId || !proposals) return;
    if (!proposals.some((p) => p.id === deepLinkId)) return;
    setExpandedId(deepLinkId);
    fetchPayload(deepLinkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId, proposals]);

  return (
    <AdminSection
      title={`Recent ${archetype} proposals`}
      subtitle={proposals === null ? 'loading…' : `${proposals.length} filed`}
    >
      <AdminCard>
        {proposals && proposals.length === 0 && (
          <div className="text-sm italic" style={{ color: 'var(--admin-text-muted)' }}>
            No proposals filed for {archetype} yet.
          </div>
        )}
        {proposals && proposals.length > 0 && (
          <ul className="space-y-1">
            {proposals.map((p) => {
              const isOpen = expandedId === p.id;
              const layer = ARCHETYPE_LAYERS[p.layer];
              const failure = FAILURE_TYPES.find((f) => f.id === p.failureType);
              return (
                <li
                  key={p.id}
                  className="rounded"
                  style={{
                    background: 'var(--admin-canvas)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <button
                    onClick={() => togglePayload(p.id)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2"
                  >
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
                      style={{ background: layer.color, color: '#111' }}
                    >
                      {p.layer}
                    </span>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--admin-text)' }}>
                      {failure?.label ?? p.failureType}
                    </span>
                    <OutcomeChip proposal={p} />
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      className="px-3 pb-3 text-xs"
                      style={{ color: 'var(--admin-text-muted)', borderTop: '1px solid var(--admin-border)' }}
                    >
                      <LifecycleTimeline
                        proposal={p}
                        payload={payloads[p.id]}
                        payloadError={payloadErrors[p.id]}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </AdminSection>
  );
}

// Collapsed-row outcome chip. Surfaces the lifecycle result inline so a
// reviewer scanning the list sees "shipped · a1b2c3d" / "rejected" /
// "awaiting Claude · 3d ago" without expanding. Tone carries the state so
// urgency never rides on color alone.
function OutcomeChip({ proposal }: { proposal: ArchetypeProposal }) {
  if (proposal.status === 'shipped') {
    return (
      <AdminStatusBadge tone="success" className="shrink-0 uppercase tracking-widest">
        {proposal.commitSha ? `shipped · ${proposal.commitSha.slice(0, 7)}` : 'shipped'}
      </AdminStatusBadge>
    );
  }
  if (proposal.status === 'rejected') {
    return (
      <AdminStatusBadge tone="danger" className="shrink-0 uppercase tracking-widest">
        rejected
      </AdminStatusBadge>
    );
  }
  return (
    <AdminStatusBadge tone="neutral" className="shrink-0 uppercase tracking-widest">
      awaiting Claude · {relativeAge(proposal.createdAt)}
    </AdminStatusBadge>
  );
}

// Vertical lifecycle timeline for an expanded proposal. Completed steps are
// solid with their timestamp + content; steps not yet reached are dimmed so
// an open proposal visibly shows "what happens next".
function LifecycleTimeline({
  proposal,
  payload,
  payloadError,
}: {
  proposal: ArchetypeProposal;
  payload: ArchetypeProposalPayload | null | undefined;
  payloadError?: string;
}) {
  const [showText, setShowText] = useState(false);
  const decided = proposal.status === 'shipped' || proposal.status === 'rejected';
  const shipped = proposal.status === 'shipped';

  // Proposal text (Keep/Change/Reject-if + extras). Inline before a decision;
  // tucked behind a toggle once the proposal is decided so the timeline reads
  // decision-first.
  const proposalText =
    payloadError !== undefined ? (
      <div style={{ color: 'var(--admin-danger)' }}>Failed to load payload: {payloadError}</div>
    ) : payload === undefined ? (
      <div style={{ color: 'var(--admin-text-muted)' }}>Loading…</div>
    ) : payload === null ? (
      <div style={{ color: 'var(--admin-text-muted)' }}>Payload not found (proposal may be deleted).</div>
    ) : (
      <div className="space-y-2 mt-1">
        <ProposalField label="Keep" value={payload.keep} />
        <ProposalField label="Change" value={payload.change} />
        <ProposalField label="Reject if" value={payload.rejectIf} />
        {payload.notes && <ProposalField label="Notes" value={payload.notes} />}
        {payload.referenceImageUrl && (
          <div>
            <div style={{ color: 'var(--admin-text-muted)' }}>Reference:</div>
            <a
              href={payload.referenceImageUrl}
              target="_blank"
              rel="noreferrer"
              className="underline break-all"
              style={{ color: 'var(--admin-accent)' }}
            >
              {payload.referenceImageUrl}
            </a>
          </div>
        )}
        {payload.cardLineage && (
          <div>
            <div style={{ color: 'var(--admin-text-muted)' }}>Card referenced:</div>
            <div className="font-mono text-[10px]" style={{ color: 'var(--admin-text)' }}>
              {payload.cardLineage.cardName} · {payload.cardLineage.cardId.slice(0, 8)}…
            </div>
          </div>
        )}
      </div>
    );

  return (
    <ol className="mt-2 space-y-0">
      <TimelineStep
        label="Filed"
        done
        timestamp={new Date(proposal.createdAt).toLocaleString()}
        last={false}
      >
        {decided ? (
          <>
            <button
              onClick={() => setShowText((s) => !s)}
              className="text-[10px] uppercase tracking-widest underline"
              style={{ color: 'var(--admin-accent)' }}
            >
              {showText ? 'Hide proposal text' : 'Proposal text'}
            </button>
            {showText && proposalText}
          </>
        ) : (
          proposalText
        )}
      </TimelineStep>

      <TimelineStep
        label="Decided"
        done={decided}
        timestamp={proposal.decidedAt ? new Date(proposal.decidedAt).toLocaleString() : undefined}
        last={false}
      >
        {decided ? (
          <div className="mt-1">
            <span style={{ color: 'var(--admin-text-muted)' }}>
              {shipped ? 'Approved' : 'Rejected'}
              {proposal.decidedReason ? ':' : ''}
            </span>{' '}
            {proposal.decidedReason || <span className="italic">no reason recorded</span>}
          </div>
        ) : (
          <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
            Waiting on Claude's decision (keep / change / reject).
          </div>
        )}
      </TimelineStep>

      <TimelineStep
        label="Shipped"
        done={shipped && !!proposal.commitSha}
        last={false}
      >
        {shipped && proposal.commitSha ? (
          <a
            href={`${GITHUB_COMMIT_BASE}${proposal.commitSha}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] underline"
            style={{ color: 'var(--admin-accent)' }}
          >
            {proposal.commitSha.slice(0, 7)}
          </a>
        ) : proposal.status === 'rejected' ? (
          <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
            Not shipped — proposal was rejected.
          </div>
        ) : (
          <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
            Pending — no commit landed yet.
          </div>
        )}
      </TimelineStep>

      <TimelineStep label="Verified" done={false} last>
        <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
          pending — no regen evidence attached
        </div>
      </TimelineStep>
    </ol>
  );
}

function TimelineStep({
  label,
  done,
  timestamp,
  last,
  children,
}: {
  label: string;
  done: boolean;
  timestamp?: string;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3" style={{ opacity: done ? 1 : 0.5 }}>
      {/* Rail: dot + connector line */}
      <div className="flex flex-col items-center shrink-0">
        <span
          className="w-2.5 h-2.5 rounded-full mt-1"
          style={{
            background: done ? 'var(--admin-accent)' : 'transparent',
            border: `1px solid ${done ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
          }}
        />
        {!last && (
          <span className="flex-1 w-px my-1" style={{ background: 'var(--admin-border)', minHeight: 12 }} />
        )}
      </div>
      <div className="pb-3 flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: done ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}
          >
            {label}
          </span>
          {timestamp && (
            <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
              {timestamp}
            </span>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

function ProposalField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--admin-text-muted)' }}>{label}:</div>
      <div style={{ color: 'var(--admin-text)' }}>{value}</div>
    </div>
  );
}
