import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSupabaseClient, fetchMyRole, type SessionRole } from '../services/persistence/supabaseClient';
import {
  createArchetypeProposal,
  listArchetypeProposals,
  getArchetypeProposalPayload,
  sendProposalForApproval,
  approveProposal,
  rejectProposal,
} from '../services/persistence/adminService';
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

const RANK_ORDER: Rank[] = ['Foundation', 'Forged', 'Ascendant'];
const STAT_ORDER: StatName[] = ['Atk', 'Def', 'Mana', 'Tech'];

// Workbench palette — kept in-file so it stays scoped to this page.
const WB = {
  bg: '#0d0b12',
  panel: '#161320',
  panelHi: '#1d1929',
  border: 'rgba(200, 190, 220, 0.14)',
  borderHi: 'rgba(200, 190, 220, 0.28)',
  text: '#eae4f0',
  textDim: 'rgba(234, 228, 240, 0.65)',
  textMuted: 'rgba(234, 228, 240, 0.42)',
  accent: '#b48eff',
};

// Guard + admin sub-nav are provided by AdminShell (parent Outlet).
// This page just renders the workshop surface — opts out of the shell's
// bg-void/80 backdrop by painting its own fully opaque workbench color
// so the fantasy background never bleeds through.

export function ArchetypeWorkshop() {
  const [searchParams] = useSearchParams();
  const initialArchetype = ((): ArchetypeName => {
    const q = searchParams.get('archetype');
    if (q && (ARCHETYPE_NAMES as readonly string[]).includes(q)) {
      return q as ArchetypeName;
    }
    return 'Seraph';
  })();
  const [archetype, setArchetype] = useState<ArchetypeName>(initialArchetype);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ArchetypeProposal[] | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [viewerRole, setViewerRole] = useState<SessionRole>('user');
  const [pending, setPending] = useState<ArchetypeProposal[] | null>(null);

  useEffect(() => {
    void fetchMyRole().then(setViewerRole);
  }, []);

  // Cross-archetype queue of proposals awaiting Raheem's final call.
  // Loaded for every director so Tori can see what's parked, but only
  // admins get the approve/reject controls.
  useEffect(() => {
    let cancelled = false;
    listArchetypeProposals({ status: 'awaiting_approval', limit: 50 })
      .then((rows) => {
        if (!cancelled) setPending(rows);
      })
      .catch((err) => {
        if (!cancelled) console.warn('Failed to load pending approvals', err);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

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
    <div
      style={{ background: WB.bg, color: WB.text }}
      className="-mx-4 -my-6 sm:-mx-6 min-h-[calc(100dvh-8rem)]"
    >
      <WorkshopHeader
        archetype={archetype}
        onArchetypeChange={(a) => {
          setArchetype(a);
          setSelectedCardId(null);
        }}
      />

      {loadError && (
        <div
          className="mx-4 mt-3 rounded p-3 text-sm"
          style={{
            background: 'rgba(176, 106, 112, 0.15)',
            color: '#f9d0d4',
            border: '1px solid rgba(176, 106, 112, 0.4)',
          }}
        >
          {loadError}
        </div>
      )}

      <div className="p-4 pb-0">
        <PendingApprovalPanel
          pending={pending}
          viewerRole={viewerRole}
          onDecided={() => setRefreshTick((t) => t + 1)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 p-4">
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
            onSubmitted={() => setRefreshTick((t) => t + 1)}
          />
        </div>
      </div>

      <div className="p-4">
        <ProposalsList
          proposals={proposals}
          archetype={archetype}
          viewerRole={viewerRole}
          onChanged={() => setRefreshTick((t) => t + 1)}
        />
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────

function WorkshopHeader({
  archetype,
  onArchetypeChange,
}: {
  archetype: ArchetypeName;
  onArchetypeChange: (a: ArchetypeName) => void;
}) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
      style={{ background: WB.panel, borderBottom: `1px solid ${WB.border}` }}
    >
      <h1
        className="font-fantasy text-lg font-bold flex-1"
        style={{ color: WB.text }}
      >
        Archetype Workshop
      </h1>
      <label
        className="flex items-center gap-2 text-xs uppercase tracking-widest"
        style={{ color: WB.textDim }}
      >
        Archetype
        <select
          value={archetype}
          onChange={(e) => onArchetypeChange(e.target.value as ArchetypeName)}
          className="rounded px-2 py-1 text-sm font-fantasy"
          style={{
            background: WB.bg,
            color: WB.text,
            border: `1px solid ${WB.borderHi}`,
          }}
        >
          {ARCHETYPE_NAMES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
    </header>
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
    <section
      className="rounded-lg p-3"
      style={{ background: WB.panel, border: `1px solid ${WB.border}` }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: WB.textDim }}>
          1. Pick a character
        </h2>
        <span className="text-[10px]" style={{ color: WB.textMuted }}>
          {cards === null ? 'loading…' : `${cards.length} cards`}
        </span>
      </div>
      {cards === null && (
        <div className="text-sm" style={{ color: WB.textMuted }}>
          Loading cards for this archetype…
        </div>
      )}
      {cards && cards.length === 0 && (
        <div className="text-sm" style={{ color: WB.textMuted }}>
          No cards of this archetype exist yet. Forge one from{' '}
          <Link to="/forge" className="underline">
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
                    ? `2px solid ${WB.accent}`
                    : `1px solid ${WB.border}`,
                  background: active ? WB.panelHi : WB.bg,
                  boxShadow: active ? `0 0 0 2px rgba(180, 142, 255, 0.2)` : 'none',
                }}
              >
                <div
                  className="aspect-[3/4] bg-cover bg-center"
                  style={{
                    backgroundImage: c.portraitAsset
                      ? `url(${c.portraitAsset})`
                      : 'linear-gradient(135deg, #2a2338, #1a1524)',
                  }}
                />
                <div className="px-1.5 py-1">
                  <div
                    className="text-[10px] truncate font-fantasy"
                    style={{ color: WB.text }}
                    title={c.cardName}
                  >
                    {c.cardName}
                  </div>
                  <div className="text-[9px] uppercase" style={{ color: WB.textMuted }}>
                    {rank}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
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
      <section
        className="rounded-lg p-4 text-sm"
        style={{
          background: WB.panel,
          border: `1px solid ${WB.border}`,
          color: WB.textMuted,
        }}
      >
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: WB.textDim }}>
          2. Character across tiers
        </div>
        Select a card above to see all of its rank snapshots.
      </section>
    );
  }

  const tiers = extractTierSnapshots(card);
  const present = RANK_ORDER.filter((r) => tiers[r]);

  return (
    <section
      className="rounded-lg p-3"
      style={{ background: WB.panel, border: `1px solid ${WB.border}` }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: WB.textDim }}>
          2. Character across tiers
        </h2>
        <span className="text-[10px]" style={{ color: WB.textMuted }}>
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
                background: WB.bg,
                border: `1px solid ${snap ? WB.borderHi : WB.border}`,
                opacity: snap ? 1 : 0.5,
              }}
            >
              <div
                className="aspect-[3/4] bg-cover bg-center"
                style={{
                  backgroundImage: snap?.portraitUrl
                    ? `url(${snap.portraitUrl})`
                    : 'linear-gradient(135deg, #2a2338, #1a1524)',
                }}
              />
              <div className="p-2 space-y-1">
                <div
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: WB.accent }}
                >
                  {rank}
                </div>
                {snap ? (
                  <>
                    <div className="text-xs font-fantasy" style={{ color: WB.text }}>
                      {snap.nameAndTitle}
                    </div>
                    <div className="text-[11px] leading-snug" style={{ color: WB.textDim }}>
                      {snap.lore}
                    </div>
                    {snap.source === 'current' && (
                      <div className="text-[9px] italic" style={{ color: WB.textMuted }}>
                        (current rank — no evolutionHistory entry)
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] italic" style={{ color: WB.textMuted }}>
                    Not reached yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
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

  return (
    <section
      className="rounded-lg p-3"
      style={{ background: WB.panel, border: `1px solid ${WB.border}` }}
    >
      <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: WB.textDim }}>
        Current layer state for {archetype}
      </h2>
      <div className="space-y-2">
        <LayerPanel layer="A">
          <div className="space-y-2 text-xs" style={{ color: WB.textDim }}>
            <div>
              <span style={{ color: WB.textMuted }}>Identity through:</span>{' '}
              {bible.identityThrough}
            </div>
            <div>
              <span style={{ color: WB.textMuted }}>Core fantasy:</span>{' '}
              {bible.coreFantasy}
            </div>
            <div>
              <span style={{ color: WB.textMuted }}>Selection tagline:</span>{' '}
              {bible.selectionScreen.tagline}
            </div>
            <div className="pt-1" style={{ borderTop: `1px dashed ${WB.border}` }}>
              <span style={{ color: WB.textMuted }}>Visual rank progression (legacy summary):</span>
              {RANK_ORDER.map((r) => (
                <div key={r} className="pl-2">
                  <span style={{ color: WB.textMuted }}>{r}:</span>{' '}
                  {arch.rankProgression[r]}
                </div>
              ))}
            </div>
            <div className="italic pt-1" style={{ color: WB.textMuted }}>
              Full canon: [Bible chapter §1–§14 for {archetype}] in data/archetypeBible/{archetype.toLowerCase().replace(' ', '')}.ts
            </div>
          </div>
        </LayerPanel>
        <LayerPanel layer="B">
          <div className="text-xs" style={{ color: WB.textDim }}>
            {card ? (
              <>
                <div>
                  <span style={{ color: WB.textMuted }}>Dominant stat:</span>{' '}
                  {dominant ?? 'tied — no dominant'}
                </div>
                {statVisual && (
                  <div className="mt-1">
                    <span style={{ color: WB.textMuted }}>Visual motif ({dominantRank}):</span>{' '}
                    {statVisual}
                  </div>
                )}
                {specialization && (
                  <div className="mt-1">
                    <span style={{ color: WB.textMuted }}>Specialization suffix:</span>{' '}
                    {specialization}
                  </div>
                )}
                {!statVisual && !specialization && (
                  <div className="italic" style={{ color: WB.textMuted }}>
                    No stat-specific visuals apply — this card has no dominant stat.
                  </div>
                )}
              </>
            ) : (
              <div className="italic" style={{ color: WB.textMuted }}>
                Select a card to see its stat-driven visuals.
              </div>
            )}
          </div>
        </LayerPanel>
        <LayerPanel layer="C">
          <div className="text-xs space-y-2" style={{ color: WB.textDim }}>
            <div>
              <span style={{ color: WB.textMuted }}>Story Pillar questions ({pillarQuestions.length}):</span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {pillarQuestions.slice(0, 6).map((q) => {
                  const opts = getOptionsForQuestion(archetype, q.id);
                  return (
                    <li key={q.id}>
                      {q.prompt}{' '}
                      <span className="text-[10px]" style={{ color: WB.textMuted }}>
                        ({opts.length} seed options)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="pt-1" style={{ borderTop: `1px dashed ${WB.border}` }}>
              <span style={{ color: WB.textMuted }}>Elements available ({elements.length} of 26):</span>
              <div className="mt-1 space-y-0.5">
                <div>
                  <span style={{ color: WB.textMuted }}>Naturally compatible:</span>{' '}
                  {buckets.naturally_compatible.join(', ') || '—'}
                </div>
                <div>
                  <span style={{ color: WB.textMuted }}>Through reinterpretation:</span>{' '}
                  {buckets.compatible_through_reinterpretation.join(', ') || '—'}
                </div>
                <div>
                  <span style={{ color: WB.textMuted }}>Rare (narrative-gated):</span>{' '}
                  {buckets.rare.join(', ') || '—'}
                </div>
                {buckets.not_available && buckets.not_available.length > 0 && (
                  <div>
                    <span style={{ color: WB.textMuted }}>Not available:</span>{' '}
                    {buckets.not_available.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </LayerPanel>
        <LayerPanel layer="D">
          <div className="text-xs whitespace-pre-wrap" style={{ color: WB.textDim }}>
            {metaBlock ? (
              metaBlock
            ) : (
              <span className="italic" style={{ color: WB.textMuted }}>
                No archetype-specific escalation block. This archetype relies on the
                generic prompt template for Forged/Ascendant — which is why the art
                often drifts. Adding a block here is the plan for step B.
              </span>
            )}
          </div>
        </LayerPanel>
      </div>
    </section>
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
        <span className="font-fantasy font-bold text-sm" style={{ color: WB.text }}>
          {copy.name}
        </span>
        <span className="text-[10px] italic" style={{ color: WB.textDim }}>
          {copy.tagline}
        </span>
        <span className="ml-auto text-xs" style={{ color: WB.textDim }}>
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
  onSubmitted,
}: {
  archetype: ArchetypeName;
  selectedCard: Card | null;
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
      if (selectedCard) {
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
      };
      await createArchetypeProposal({
        archetype,
        layer,
        failureType,
        cardId: selectedCard?.cardId ?? null,
        payload,
      });
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
    <section
      className="rounded-lg p-4 space-y-4"
      style={{ background: WB.panel, border: `1px solid ${WB.border}` }}
    >
      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: WB.textDim }}>
          3. What's the failure?
        </div>
        <div className="space-y-1">
          {FAILURE_TYPES.map((f) => (
            <label
              key={f.id}
              className="flex items-start gap-2 p-2 rounded cursor-pointer"
              style={{
                background: failureType === f.id ? WB.panelHi : 'transparent',
                border: `1px solid ${failureType === f.id ? WB.borderHi : 'transparent'}`,
              }}
            >
              <input
                type="radio"
                checked={failureType === f.id}
                onChange={() => setFailureType(f.id)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-fantasy" style={{ color: WB.text }}>
                  {f.label}
                </div>
                <div className="text-[11px] leading-snug" style={{ color: WB.textDim }}>
                  {f.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: WB.textDim }}>
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
                  background: active ? copy.accentBg : WB.bg,
                  border: `2px solid ${active ? copy.color : WB.border}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{ background: copy.color, color: '#111' }}
                  >
                    {id}
                  </span>
                  <span className="font-fantasy font-bold text-sm" style={{ color: WB.text }}>
                    {copy.name}
                  </span>
                </div>
                <div className="text-[10px] italic mb-1" style={{ color: WB.textDim }}>
                  {copy.tagline}
                </div>
                <div className="text-[10px] leading-snug" style={{ color: WB.textDim }}>
                  <span style={{ color: WB.textMuted }}>Controls:</span> {copy.controls}
                </div>
                {active && (
                  <div
                    className="text-[10px] leading-snug mt-1 pt-1"
                    style={{
                      color: WB.textDim,
                      borderTop: `1px dashed ${copy.accentBorder}`,
                    }}
                  >
                    <div>
                      <span style={{ color: WB.textMuted }}>Affects:</span> {copy.affects}
                    </div>
                    <div className="mt-1">
                      <span style={{ color: WB.textMuted }}>Change when:</span> {copy.changeWhen}
                    </div>
                    <div className="mt-1 italic">{copy.example(archetype)}</div>
                    <div className="mt-1" style={{ color: WB.textMuted }}>
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
        <FormField
          label="5. Keep — the one thing that must survive"
          placeholder="e.g. The lycanthrope's identity token carrying across all three tiers."
          value={keep}
          onChange={setKeep}
        />
        <FormField
          label="6. Change — what you want different"
          placeholder="e.g. Add a Seraph-specific Forged/Ascendant block that scales wing count and halo intensity."
          value={change}
          onChange={setChange}
        />
        <FormField
          label="7. Reject if — how we know we failed"
          placeholder="e.g. If the Ascendant Seraph still shows the same wing count as the Foundation."
          value={rejectIf}
          onChange={setRejectIf}
        />
        <FormField
          label="Notes (optional)"
          placeholder="Anything else Claude should know."
          value={notes}
          onChange={setNotes}
          optional
        />
        <FormField
          label="Reference image URL (optional)"
          placeholder="https://…"
          value={referenceImageUrl}
          onChange={setReferenceImageUrl}
          optional
        />
      </div>

      {error && (
        <div
          className="text-xs rounded p-2"
          style={{
            background: 'rgba(176, 106, 112, 0.15)',
            color: '#f9d0d4',
            border: '1px solid rgba(176, 106, 112, 0.4)',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="text-xs rounded p-2"
          style={{
            background: 'rgba(110, 163, 110, 0.15)',
            color: '#c9f9d9',
            border: '1px solid rgba(110, 163, 110, 0.4)',
          }}
        >
          {success}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-2 rounded font-fantasy font-bold text-sm"
        style={{
          background: busy ? WB.panelHi : WB.accent,
          color: '#111',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Filing…' : 'File proposal'}
      </button>
    </section>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  optional,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: WB.textDim }}>
        {label}
        {optional && (
          <span className="ml-1 normal-case italic" style={{ color: WB.textMuted }}>
            optional
          </span>
        )}
      </div>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded px-2 py-1.5 text-sm resize-y"
        style={{
          background: WB.bg,
          color: WB.text,
          border: `1px solid ${WB.borderHi}`,
        }}
      />
    </label>
  );
}

// ─── Proposals list ──────────────────────────────────────────────────

// ─── Pending approval queue (Raheem's console gate) ──────────────────

function PendingApprovalPanel({
  pending,
  viewerRole,
  onDecided,
}: {
  pending: ArchetypeProposal[] | null;
  viewerRole: SessionRole;
  onDecided: () => void;
}) {
  const isAdmin = viewerRole === 'admin';
  const count = pending?.length ?? 0;

  // Nothing parked + a non-admin director → hide entirely to keep the
  // workbench clean. Admins always see the panel so the gate is obvious.
  if (!isAdmin && count === 0) return null;

  return (
    <section
      className="rounded-lg p-3"
      style={{
        background: WB.panelHi,
        border: `1px solid ${count > 0 ? '#c6a358' : WB.border}`,
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest font-bold" style={{ color: '#f0dca0' }}>
          Awaiting your approval
        </h2>
        <span className="text-[10px]" style={{ color: WB.textMuted }}>
          {pending === null ? 'loading…' : `${count} pending`}
        </span>
      </div>

      {!isAdmin && (
        <div className="text-[11px] mb-2" style={{ color: WB.textDim }}>
          These are parked for Raheem's final call. You'll see them clear once he approves or sends them back.
        </div>
      )}

      {count === 0 ? (
        <div className="text-sm italic" style={{ color: WB.textMuted }}>
          Nothing waiting. Worked proposals show up here for the final call.
        </div>
      ) : (
        <ul className="space-y-2">
          {pending!.map((p) => (
            <PendingRow key={p.id} proposal={p} isAdmin={isAdmin} onDecided={onDecided} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PendingRow({
  proposal: p,
  isAdmin,
  onDecided,
}: {
  proposal: ArchetypeProposal;
  isAdmin: boolean;
  onDecided: () => void;
}) {
  const [payload, setPayload] = useState<ArchetypeProposalPayload | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const layer = ARCHETYPE_LAYERS[p.layer];
  const failure = FAILURE_TYPES.find((f) => f.id === p.failureType);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && payload === undefined) {
      getArchetypeProposalPayload(p.id)
        .then(setPayload)
        .catch(() => setPayload(null));
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await approveProposal(p.id);
      onDecided();
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setError('A reason is required to send this back.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await rejectProposal(p.id, reason.trim());
      onDecided();
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded" style={{ background: WB.bg, border: `1px solid ${WB.border}` }}>
      <button onClick={toggle} className="w-full text-left flex items-center gap-2 px-3 py-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
          style={{ background: layer.color, color: '#111' }}
        >
          {p.layer}
        </span>
        <span className="text-xs font-bold shrink-0" style={{ color: WB.text }}>
          {p.archetype}
        </span>
        <span className="text-xs truncate flex-1" style={{ color: WB.textDim }}>
          {failure?.label ?? p.failureType}
        </span>
        <span className="text-[10px] shrink-0" style={{ color: WB.textMuted }}>
          {new Date(p.updatedAt).toLocaleDateString()}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 text-xs" style={{ color: WB.textDim, borderTop: `1px solid ${WB.border}` }}>
          {payload === undefined ? (
            <div style={{ color: WB.textMuted }}>Loading…</div>
          ) : payload === null ? (
            <div style={{ color: WB.textMuted }}>Payload not found.</div>
          ) : (
            <ExpandedPayload payload={payload} />
          )}

          {error && <div style={{ color: '#f9d0d4' }}>{error}</div>}

          {isAdmin && !rejecting && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={approve}
                disabled={busy}
                className="px-3 py-1.5 rounded text-xs font-fantasy font-bold"
                style={{ background: '#2f7d4f', color: '#eafff1', opacity: busy ? 0.6 : 1 }}
              >
                {busy ? 'Working…' : 'Approve — ship it'}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={busy}
                className="px-3 py-1.5 rounded text-xs font-fantasy"
                style={{ color: '#f9d0d4', border: '1px solid rgba(220,38,38,0.4)' }}
              >
                Send back
              </button>
            </div>
          )}

          {isAdmin && rejecting && (
            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason to send back (required)…"
                className="w-full px-2 py-1 rounded text-xs"
                style={{ background: WB.panel, color: WB.text, border: `1px solid ${WB.borderHi}` }}
              />
              <div className="flex gap-2">
                <button
                  onClick={reject}
                  disabled={busy}
                  className="px-3 py-1.5 rounded text-xs font-fantasy font-bold"
                  style={{ background: '#8a1c1c', color: '#faeaca', opacity: busy ? 0.6 : 1 }}
                >
                  Confirm send back
                </button>
                <button
                  onClick={() => { setRejecting(false); setReason(''); setError(null); }}
                  className="px-3 py-1.5 rounded text-xs font-fantasy"
                  style={{ color: WB.textDim, border: `1px solid ${WB.border}` }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ProposalsList({
  proposals,
  archetype,
  viewerRole,
  onChanged,
}: {
  proposals: ArchetypeProposal[] | null;
  archetype: ArchetypeName;
  viewerRole: SessionRole;
  onChanged: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Payloads are omitted from the list (P1: kept the list rows cheap).
  // Fetched on-demand when a row is expanded; cached here per proposal id.
  const [payloads, setPayloads] = useState<Record<string, ArchetypeProposalPayload | null>>({});
  const [payloadErrors, setPayloadErrors] = useState<Record<string, string>>({});

  function togglePayload(id: string) {
    const nowOpen = expandedId !== id;
    setExpandedId(nowOpen ? id : null);
    if (nowOpen && !(id in payloads)) {
      getArchetypeProposalPayload(id)
        .then((p) => setPayloads((prev) => ({ ...prev, [id]: p })))
        .catch((err) => {
          const msg = (err as { message?: string })?.message ?? String(err);
          setPayloadErrors((prev) => ({ ...prev, [id]: msg }));
        });
    }
  }
  return (
    <section
      className="rounded-lg p-3"
      style={{ background: WB.panel, border: `1px solid ${WB.border}` }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: WB.textDim }}>
          Recent {archetype} proposals
        </h2>
        <span className="text-[10px]" style={{ color: WB.textMuted }}>
          {proposals === null ? 'loading…' : `${proposals.length} filed`}
        </span>
      </div>
      {proposals && proposals.length === 0 && (
        <div className="text-sm italic" style={{ color: WB.textMuted }}>
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
                  background: WB.bg,
                  border: `1px solid ${WB.border}`,
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
                  <span className="text-xs truncate flex-1" style={{ color: WB.text }}>
                    {failure?.label ?? p.failureType}
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-widest shrink-0 px-2 py-0.5 rounded"
                    style={{
                      color: WB.textDim,
                      border: `1px solid ${WB.border}`,
                    }}
                  >
                    {p.status}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: WB.textMuted }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="px-3 pb-3 space-y-2 text-xs"
                    style={{ color: WB.textDim, borderTop: `1px solid ${WB.border}` }}
                  >
                    {payloadErrors[p.id] ? (
                      <div style={{ color: '#f9d0d4' }}>Failed to load payload: {payloadErrors[p.id]}</div>
                    ) : payloads[p.id] === undefined ? (
                      <div style={{ color: WB.textMuted }}>Loading…</div>
                    ) : payloads[p.id] === null ? (
                      <div style={{ color: WB.textMuted }}>Payload not found (proposal may be deleted).</div>
                    ) : (
                      <ExpandedPayload payload={payloads[p.id]!} />
                    )}
                    <SendForApproval proposal={p} viewerRole={viewerRole} onChanged={onChanged} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// A worked proposal that isn't yet parked, shipped, or rejected can be
// handed up to Raheem. Shown to any director; the resulting state is the
// admin's gate — a director still can't ship.
function SendForApproval({
  proposal: p,
  viewerRole,
  onChanged,
}: {
  proposal: ArchetypeProposal;
  viewerRole: SessionRole;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSend = p.status === 'draft' || p.status === 'submitted' || p.status === 'awaiting_claude';
  const isDirector = viewerRole === 'admin' || viewerRole === 'lore_director';

  if (p.status === 'awaiting_approval') {
    return <div className="text-[11px] pt-1" style={{ color: '#f0dca0' }}>Parked for Raheem's approval.</div>;
  }
  if (p.status === 'shipped') {
    return <div className="text-[11px] pt-1" style={{ color: '#8fe3a8' }}>Shipped{p.decidedReason ? ` — ${p.decidedReason}` : ''}.</div>;
  }
  if (p.status === 'rejected') {
    return <div className="text-[11px] pt-1" style={{ color: '#f0a0a0' }}>Sent back{p.decidedReason ? ` — ${p.decidedReason}` : ''}.</div>;
  }
  if (!isDirector || !canSend) return null;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await sendProposalForApproval(p.id);
      onChanged();
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-1">
      <button
        onClick={send}
        disabled={busy}
        className="px-3 py-1.5 rounded text-xs font-fantasy font-bold"
        style={{ background: '#c6a358', color: '#1a1206', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Sending…' : 'Send for Raheem’s approval'}
      </button>
      {error && <div className="text-[11px] mt-1" style={{ color: '#f9d0d4' }}>{error}</div>}
    </div>
  );
}

function ExpandedPayload({ payload }: { payload: ArchetypeProposalPayload }) {
  return (
    <>
      <ProposalField label="Keep" value={payload.keep} />
      <ProposalField label="Change" value={payload.change} />
      <ProposalField label="Reject if" value={payload.rejectIf} />
      {payload.notes && <ProposalField label="Notes" value={payload.notes} />}
      {payload.referenceImageUrl && (
        <div>
          <div style={{ color: WB.textMuted }}>Reference:</div>
          <a
            href={payload.referenceImageUrl}
            target="_blank"
            rel="noreferrer"
            className="underline break-all"
            style={{ color: WB.accent }}
          >
            {payload.referenceImageUrl}
          </a>
        </div>
      )}
      {payload.cardLineage && (
        <div>
          <div style={{ color: WB.textMuted }}>Card referenced:</div>
          <div className="font-mono text-[10px]">
            {payload.cardLineage.cardName} · {payload.cardLineage.cardId.slice(0, 8)}…
          </div>
        </div>
      )}
    </>
  );
}

function ProposalField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: WB.textMuted }}>{label}:</div>
      <div>{value}</div>
    </div>
  );
}
