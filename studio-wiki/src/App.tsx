import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Archive, BookOpen, Boxes, Castle, Check, ChevronDown, ChevronRight, CircleAlert, CircleCheck, CircleDashed, CircleHelp, Command, ExternalLink, Eye, Feather, FileText, FlaskConical, Gem, Hammer, Image, Layers, Lightbulb, ListChecks, LogIn, Menu, NotebookPen, Plus, RefreshCw, Save, Search, Shield, Sparkles, Swords, TriangleAlert, Users, Workflow, X } from 'lucide-react';
import { buildStamp, productionMarkdown } from 'virtual:studio-content';
import { MissingMedia, PageHeader, Panel, RepoLink, RouteCard, SpritePlayer, Status } from './components';
import { archetypes, bossStates, developmentCards, elements, navigation, permanentCards, searchEntries } from './content';
import type { CardEvidenceState, DevelopmentCardRecord } from './content';
import { MarkdownBody, sectionsFromMarkdown } from './markdown';
import { ElementPerformancePlayer } from './ElementPerformancePlayer';
import workshopArena from './assets/workshop-arena.png';
import workshopBoss from './assets/workshop-boss.png';
import workshopSprite from './assets/workshop-sprite.png';
import studioWorkflow from '../../docs/CARD_ENGINE_STUDIO_V2_CURRENT_WORKFLOW.png';
import studioRoster from '../../docs/CARD_ENGINE_STUDIO_V2_CURRENT_AGENTS_SKILLS.png';
import { SEED_ABILITIES } from '../../card-engine/src/data/abilities/seedAbilities';
import { getApprovedArt } from '../../card-engine/src/data/abilities/visualManifest';
import { createStudioIdea, getStudioSession, isStudioDataConfigured, isStudioPartnerRole, listLiveReviewCards, listStudioIdeas, recordCardReview, restoreStudioSession, signInToStudio, signOutOfStudio, subscribeStudioSession, updateStudioIdea } from './studioApi';
import type { LiveReviewCard, ReviewStatus, StudioIdea, StudioSession } from './studioApi';

const iconsByPath = {
  '/': Command, '/characters': Users, '/bosses': Swords, '/characters/cards': Layers, '/elements': Gem, '/abilities': Sparkles, '/world': Castle, '/minigames': CircleHelp,
  '/production': FileText, '/studio': Workflow, '/assets': Image, '/workshops': Hammer, '/decisions': BookOpen, '/technical': Boxes, '/archive': Archive,
  '/work/advice': Lightbulb, '/work/active': ListChecks, '/work/required': TriangleAlert, '/work/tori': Feather, '/work/raheem': NotebookPen,
} as const;

const studioStages = [
  ['01', 'Idea', 'Raheem and the team decide what should become part of the game.'],
  ['02', 'Plan', 'The Studio Lead turns direction into the smallest safe plan and chooses FAST, STANDARD, or FULL mode.'],
  ['03', 'Create', 'Figma, Leonardo, PixelLab, and the AI tools produce the design, art, sprites, and implementation inputs.'],
  ['04', 'Build', 'React, TypeScript, and Phaser turn approved inputs into the playable experience.'],
  ['05', 'Connect', 'Supabase and secure Vercel functions connect game data, accounts, and provider calls.'],
  ['06', 'Prove', 'Checks, named scenarios, screenshots, and live evidence return PASS, FAIL, or HUMAN REVIEW.'],
  ['07', 'Release', 'A human approves the push and deployment. Release is never automatic.'],
] as const;

const studioAgents = ['art-prompt-director', 'environment-art-director', 'game-systems-designer', 'lore-fantasy-director', 'minigame-designer', 'phaser-runtime-director', 'pixel-sprite-director', 'technical-architect', 'ui-ux-director'];
const studioSkills = ['art-pipeline', 'audit-project-knowledge', 'balance-playtest · inactive', 'build-phaser-feature', 'consult-specialist', 'create-archetype', 'create-arena', 'create-boss', 'create-character-sprite', 'create-prop', 'design-archetype-emblem', 'design-feature', 'design-minigame', 'extract-fullscreen-shell · retired', 'place-character-in-scene', 'production-log', 'ship-approved-plan', 'ship-minigame · retired', 'studio-health', 'sync-project-knowledge', 'trace-environment', 'visual-playtest', 'work-proposal'];

function Shell() {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [path, setPath] = useState(window.location.pathname);
  const navigate = (nextPath: string) => {
    if (nextPath !== window.location.pathname) window.history.pushState({}, '', nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const pop = () => setPath(window.location.pathname);
    const links = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor || anchor.target || anchor.origin !== window.location.origin) return;
      event.preventDefault();
      navigate(anchor.pathname);
    };
    window.addEventListener('popstate', pop);
    document.addEventListener('click', links);
    return () => { window.removeEventListener('popstate', pop); document.removeEventListener('click', links); };
  }, []);
  const matches = search.trim() ? searchEntries.filter((entry) => `${entry.title} ${entry.text}`.toLowerCase().includes(search.toLowerCase())) : [];
  return <div className="app-shell">
    <aside className={menu ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><Shield/></div><div><strong>Card Engine</strong><span>Studio Wiki</span></div><button className="mobile-close" onClick={() => setMenu(false)} aria-label="Close navigation"><X/></button></div>
      <nav aria-label="Studio Wiki">
        {navigation.map((group) => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(([itemPath, label]) => { const Icon = iconsByPath[itemPath]; return <a href={itemPath} className={path === itemPath ? 'active' : ''} aria-current={path === itemPath ? 'page' : undefined} key={itemPath} onClick={() => setMenu(false)}><Icon/><span>{label}</span></a>; })}</div>)}
      </nav>
      <BuildStamp/>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="menu-button" onClick={() => setMenu(true)} aria-label="Open navigation"><Menu/></button><div className="search"><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the studio…" aria-label="Search the Studio Wiki" onKeyDown={(event) => { if (event.key === 'Enter' && matches[0]) { navigate(matches[0].path); setSearch(''); } }}/>{search && <div className="search-results">{matches.length ? matches.map((entry) => <button key={entry.path} onClick={() => { navigate(entry.path); setSearch(''); }}><strong>{entry.title}</strong><span>{entry.text}</span></button>) : <p>No matching section</p>}</div>}</div><span className="crumb">{searchEntries.find((entry) => entry.path === path)?.title ?? 'Studio Home'}</span></header>
      <main>{({
        '/': <Home/>, '/characters': <Characters/>, '/characters/cards': <Cards/>, '/bosses': <Bosses/>, '/elements': <Elements/>, '/abilities': <Abilities/>,
        '/world': <World/>, '/minigames': <Minigames/>, '/production': <Production/>, '/studio': <StudioHandbook/>, '/assets': <Assets/>,
        '/workshops': <Workshops/>, '/decisions': <Decisions/>, '/technical': <Technical/>, '/archive': <ArchivePage/>,
        '/work/advice': <WorkBoardPage kind="advice"/>, '/work/active': <WorkBoardPage kind="active"/>, '/work/required': <WorkBoardPage kind="required"/>, '/work/tori': <WorkBoardPage kind="tori"/>, '/work/raheem': <RaheemDesk/>,
      } as Record<string, ReactNode>)[path] ?? <Home/>}</main>
    </div>
  </div>;
}

export function App() { return <Shell/>; }

/**
 * How current is this page?
 *
 * PRODUCTION.md is read at build time, so a deployed Wiki is a snapshot. Without a
 * stamp, a deploy from three weeks ago is indistinguishable from one from an hour
 * ago — and a wiki nobody can date is a wiki nobody trusts. This shows the commit
 * the content came from and goes amber once the snapshot is over a week old.
 */
function BuildStamp() {
  const { commit, commitDate, subject, dev } = buildStamp;
  const ageDays = commitDate ? (Date.now() - new Date(commitDate).getTime()) / 86_400_000 : null;
  const stale = ageDays !== null && ageDays > 7;
  const when = commitDate
    ? new Date(commitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  if (dev) {
    return <div className="sidebar-foot"><span className="live-dot"/>Repository-backed<span>Live from your working tree</span></div>;
  }
  return (
    <div className={stale ? 'sidebar-foot sidebar-foot-stale' : 'sidebar-foot'}>
      <span className={stale ? 'live-dot live-dot-stale' : 'live-dot'}/>
      Repository-backed
      <span title={subject ?? undefined}>
        {commit ? <>Built from <code>{commit}</code></> : 'Build source unknown'}
        {when && ` · ${when}`}
        {stale && ` · ${Math.floor(ageDays)} days old`}
      </span>
    </div>
  );
}

function Home() {
  return <><PageHeader eyebrow="CARD ENGINE · STUDIO CONTROL CENTER" title="Everything we know, somewhere worth exploring." intro="A visual, searchable home for the game’s characters, worlds, production truth, and the tools used to make them." status="IN FLIGHT"/>
    <div className="hero-grid"><Panel className="hero-panel"><div className="hero-art"><img src="/assets/castle/courtyard.png" alt="The current Card Engine castle courtyard"/><div className="hero-overlay"><span>THE LIVE WORLD</span><h2>The current courtyard remains in production while V2 is built safely beside it.</h2><a href="/world">See the Courtyard V2 project →</a></div></div></Panel><Panel title="What needs attention"><div className="attention-list"><div><Status value="IN FLIGHT"/><strong>Courtyard V2</strong><span>Forge quadrant playable · production unchanged</span></div><div><Status value="PLANNED"/><strong>Open the tower gate</strong><span>Current courtyard → Battle Tower</span></div><div><Status value="IN FLIGHT"/><strong>Battle Tower</strong><span>Main mode · tower length undecided</span></div></div></Panel></div>
    <div className="section-title"><div><p className="eyebrow">EXPLORE THE STUDIO</p><h2>Choose a door</h2></div></div><div className="route-grid route-grid-five"><RouteCard icon={<Castle/>} title="Battle Tower" copy="The primary mode: build a party, read the boss, and climb" path="/minigames"/><RouteCard icon={<Users/>} title="Characters & Archetypes" copy="11 identities, emblems, cards, and rank continuity" path="/characters"/><RouteCard icon={<Swords/>} title="Bosses & Arenas" copy="The Tower’s production art, animation, and floor assets" path="/bosses"/><RouteCard icon={<Gem/>} title="Elements" copy="Crystals, combat expression, charge, travel, and impact" path="/elements"/><RouteCard icon={<Sparkles/>} title="Abilities" copy="The live ability roster, roles, versions, and canonical artwork" path="/abilities"/></div>
    <Panel title="The game in one sentence" className="manifesto"><blockquote>Card Engine is an adventure game with characters you made yourself.</blockquote><p>The card is the format a character comes in. It is not the point.</p></Panel></>;
}

function Characters() {
  const [selected, setSelected] = useState(0); const item = archetypes[selected];
  const acceptedCards = permanentCards.filter((card) => card.archetype === item[0]);
  return <><PageHeader eyebrow="VISUAL WIKI" title="Characters & Archetypes" intro="The eleven collectible identities. Select an emblem to inspect its canon and the permanent cards accepted for that archetype." status="SHIPPED"/><div className="character-layout"><Panel title="The eleven archetypes" className="emblem-panel"><div className="emblem-grid">{archetypes.map((entry, index) => <button className={selected === index ? 'emblem-card selected' : 'emblem-card'} key={entry[0]} onClick={() => setSelected(index)} aria-pressed={selected === index}><img src={`/assets/archetype-emblems/${entry[1]}`} alt={`${entry[0]} emblem`}/><span>{entry[0]}</span></button>)}</div></Panel><Panel className="archetype-detail"><img className="detail-emblem" src={`/assets/archetype-emblems/${item[1]}`} alt=""/><p className="eyebrow">SELECTED ARCHETYPE</p><h2>{item[0]}</h2><p>{item[3]}</p><dl><div><dt>Primary symbol</dt><dd>{item[2]}</dd></div><div><dt>Progression</dt><dd>Foundation → Forged → Ascendant</dd></div><div><dt>Identity rule</dt><dd>Rank growth preserves the person.</dd></div></dl><RepoLink path="card-engine/src/data/archetypeBible/"/></Panel></div><Panel title={`${item[0]} permanent cards`} action={<span className="card-section-state card-section-empty">{acceptedCards.length} ACCEPTED</span>}><div className="archetype-card-roster" aria-live="polite">{acceptedCards.length === 0 ? <><img src={`/assets/archetype-emblems/${item[1]}`} alt=""/><div><p className="eyebrow">HUMAN-ACCEPTED PERMANENT</p><h3>No {item[0]} cards have been accepted into the game.</h3><p>Select another emblem to inspect its permanent roster. Development cards live on the first-class Cards page and never appear here unless they receive explicit human acceptance.</p></div></> : acceptedCards.map((card) => <article key={card.name}><img src={card.image} alt={`${card.title} permanent card`}/><h3>{card.title}</h3></article>)}</div></Panel></>;
}

function useStudioSession() {
  const [session, setSession] = useState<StudioSession | null>(() => getStudioSession());
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const sync = () => setSession(getStudioSession());
    const unsubscribe = subscribeStudioSession(sync);
    restoreStudioSession().finally(() => { sync(); setChecking(false); });
    return unsubscribe;
  }, []);
  return { session, checking };
}

function StudioSignIn({ purpose }: { purpose: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const configured = isStudioDataConfigured();
  return <Panel className="studio-signin">
    <LogIn/><div><p className="eyebrow">TEAM ACCESS</p><h2>Sign in with your Card Engine account</h2><p>{purpose} This uses the same account as the game; the Wiki never stores your password.</p>
      {!configured ? <div className="studio-service-note"><TriangleAlert/><span>The live workspace will activate after Supabase environment configuration is added to this Wiki deployment.</span></div> : <form onSubmit={async (event) => { event.preventDefault(); setWorking(true); setError(''); try { await signInToStudio(email, password); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.'); } finally { setWorking(false); } }}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}/></label><button disabled={working}>{working ? <RefreshCw className="spin"/> : <LogIn/>}{working ? 'Signing in…' : 'Open the Studio'}</button>{error && <p className="studio-form-error" role="alert">{error}</p>}</form>}
    </div>
  </Panel>;
}

function cardStatEntries(card: LiveReviewCard) {
  return Object.entries(card.card.stats ?? {}).filter((entry): entry is [string, { value: number }] => Boolean(entry[1] && typeof entry[1] === 'object' && 'value' in entry[1]));
}

function WikiCard({ record }: { record: LiveReviewCard }) {
  const card = record.card;
  const resource = card.stats?.Mana ?? card.stats?.Tech;
  return <div className="wiki-card" aria-label={`${record.title} full card`}>
    <img className="wiki-card-portrait" src={record.portraitUrl ?? card.portraitAsset} alt={`${record.title} portrait`}/>
    {card.border?.baseSource && <img className="wiki-card-border" src={card.border.baseSource} alt=""/>}
    <strong className="wiki-card-name">{card.cardName || record.cardName}</strong>
    {resource && <strong className="wiki-card-resource">{resource.value}</strong>}
    <span className="wiki-card-title">{card.nameAndTitle || record.title}</span>
    <span className="wiki-card-power">{card.stats?.Atk?.value ?? '–'} / {card.stats?.Def?.value ?? '–'}</span>
  </div>;
}

function objectLines(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => [key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' '), typeof item === 'string' ? item : Array.isArray(item) ? item.join(', ') : JSON.stringify(item)]);
}

function LiveCardDossier({ record, onVerdict, working }: { record: LiveReviewCard; onVerdict: (status: ReviewStatus) => void; working: boolean }) {
  const card = record.card;
  const history = Object.entries(card.evolutionHistory ?? {}).flatMap(([stat, ranks]) => Object.entries(ranks ?? {}).flatMap(([rank, snapshot]) => snapshot ? [{ stat, rank, ...snapshot }] : []));
  const pillars = objectLines(card.storyPillars);
  const identity = objectLines(card.identity);
  return <article className="live-card-dossier">
    <header><div><p className="eyebrow">SELECTED DEVELOPMENT CARD</p><h2>{record.title}</h2><p>Forged by {record.creatorName} · {new Date(record.createdAt).toLocaleDateString()}</p></div><span className={`review-status review-status-${record.reviewStatus}`}>{record.reviewStatus === 'needs_review' ? 'NEEDS REVIEW' : record.reviewStatus === 'keep' ? 'KEEP IN ALPHA' : 'X’D OUT'}</span></header>
    <div className="live-card-hero"><WikiCard record={record}/><div><p className="eyebrow">WHY THIS RECORD IS HERE</p><h3>Every alpha card enters this shared room automatically.</h3><p>Keep means this card remains worth developing. X out means the team is setting it aside. Neither action deletes the character or makes it permanent.</p><dl><div><dt>Archetype</dt><dd>{record.archetype}</dd></div><div><dt>Dominant trait</dt><dd>{card.dominantStat ?? 'Tie / default'}</dd></div><div><dt>Element</dt><dd>{card.currentElement ?? card.elementSelection?.element ?? 'Not recorded'}</dd></div></dl></div></div>
    <div className="live-card-sections">
      <details open><summary><BookOpen/>Lore and identity<ChevronDown/></summary><div><blockquote>{card.lore || 'No lore is attached to this development card yet.'}</blockquote>{identity.length ? <dl className="live-fact-list">{identity.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p className="missing-copy">No locked identity record is attached.</p>}</div></details>
      <details open><summary><Swords/>Stats and current abilities<ChevronDown/></summary><div><div className="live-stat-grid">{cardStatEntries(record).map(([name, stat]) => <article key={name}><span>{name}</span><strong>{stat.value}</strong><i><b style={{ width: `${stat.value}%` }}/></i></article>)}</div>{record.abilities?.length ? <div className="live-ability-grid">{record.abilities.map((ability) => <article key={`${ability.abilityId}-${ability.slotType}`}><span>{ability.slotType} · {ability.localTier}</span><h3>{ability.displayName}</h3><p>{ability.description}</p></article>)}</div> : <p className="missing-copy">No current ability loadout is attached to this card.</p>}</div></details>
      <details><summary><Sparkles/>Story Pillars and elemental bond<ChevronDown/></summary><div>{pillars.length ? <dl className="live-fact-list">{pillars.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p className="missing-copy">No Story Pillar answers are attached.</p>}<p className="element-line"><Gem/> {card.elementSelection ? `${card.elementSelection.element} · ${card.elementSelection.bond}` : 'No element and bond recorded'}</p></div></details>
      <details><summary><Layers/>Rank history<ChevronDown/></summary><div>{history.length ? <div className="live-rank-grid">{history.map((snapshot, index) => <article key={`${snapshot.stat}-${snapshot.rank}-${index}`}><img src={snapshot.portraitUrl} alt={`${snapshot.rank} portrait`}/><span>{snapshot.rank} · {snapshot.stat}</span><strong>{snapshot.nameAndTitle}</strong></article>)}</div> : <p className="missing-copy">This card has no recorded tier-up snapshots yet.</p>}</div></details>
    </div>
    <div className="review-action-bar"><div><strong>Shared alpha verdict</strong><span>The latest decision becomes the team view. You can change it at any time.</span></div><button disabled={working || record.reviewStatus === 'keep'} className="keep" onClick={() => onVerdict('keep')}><Check/>Keep in alpha</button><button disabled={working || record.reviewStatus === 'x_out'} className="xout" onClick={() => onVerdict('x_out')}><X/>X out</button></div>
  </article>;
}

function Cards() {
  const { session, checking } = useStudioSession();
  const [status, setStatus] = useState<ReviewStatus | 'all'>('needs_review');
  const [archetype, setArchetype] = useState('all');
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<LiveReviewCard[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const selected = cards.find((card) => card.cardId === selectedId) ?? cards[0];
  const load = async () => { if (!session) return; setLoading(true); setError(''); try { const result = await listLiveReviewCards({ status, archetype, search, limit: 100 }); setCards(result.cards); setTotal(result.totalCount); setSelectedId((current) => result.cards.some((card) => card.cardId === current) ? current : result.cards[0]?.cardId ?? ''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load cards.'); } finally { setLoading(false); } };
  useEffect(() => { const timer = window.setTimeout(load, search ? 300 : 0); return () => window.clearTimeout(timer); }, [session?.userId, status, archetype, search]);
  const verdict = async (next: ReviewStatus) => { if (!selected) return; const previous = selected.reviewStatus; setWorking(true); setError(''); try { await recordCardReview(selected.cardId, next); await load(); if (status !== 'all' && status !== next) setError(`Saved. ${selected.title} moved to ${next === 'keep' ? 'Keep in alpha' : next === 'x_out' ? 'X’d out' : 'Needs review'}.`); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the verdict.'); setCards((current) => current.map((card) => card.cardId === selected.cardId ? { ...card, reviewStatus: previous } : card)); } finally { setWorking(false); } };
  const archetypeNames = archetypes.map(([name]) => name);
  return <><PageHeader eyebrow="CHARACTERS & ARCHETYPES · SHARED ALPHA REVIEW" title="Cards" intro="The team’s live card evaluation room: inspect every development character, understand its evidence, and decide together what deserves another pass." status="IN FLIGHT"/>
    <div className="card-truth-banner"><Layers/><div><p className="eyebrow">THE ALPHA RULE</p><h2>Every card is development work until Raheem explicitly accepts it.</h2><p>Keep and X-out organize the shared review pool. They do not delete cards and they do not promote cards into the permanent game.</p></div><span>0 PERMANENT</span></div>
    <section className="review-how"><article><span>01</span><strong>Cards arrive automatically</strong><p>Every current production card and every new alpha card appears here.</p></article><article><span>02</span><strong>Investigate the whole character</strong><p>Open the full card, lore, identity, stats, abilities, pillars, and rank evidence.</p></article><article><span>03</span><strong>Share one verdict</strong><p>The newest Keep or X-out decision becomes the team’s current view.</p></article><article><span>04</span><strong>Promotion comes later</strong><p>The permanent roster remains empty until its acceptance workflow is designed.</p></article></section>
    {checking ? <Panel className="review-loading"><RefreshCw className="spin"/>Opening the Studio session…</Panel> : !session ? <StudioSignIn purpose="Sign in to see the shared alpha pool and record team verdicts."/> : <Panel title="Live Alpha Card Pool" action={<button className="studio-signout" onClick={signOutOfStudio}>Sign out · {session.email}</button>} className="live-review-room">
      <div className="live-review-controls"><div className="review-tabs" role="tablist">{([['needs_review','Needs review'],['keep','Kept'],['x_out','X’d out'],['all','All cards']] as const).map(([value,label]) => <button role="tab" aria-selected={status === value} className={status === value ? 'selected' : ''} onClick={() => setStatus(value)} key={value}>{label}</button>)}</div><label>Archetype<select value={archetype} onChange={(event) => setArchetype(event.target.value)}><option value="all">All archetypes</option>{archetypeNames.map((name) => <option key={name}>{name}</option>)}</select></label><label className="live-card-search"><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, creator, archetype…" aria-label="Search live cards"/></label></div>
      {error && <div className={error.startsWith('Saved.') ? 'review-message saved' : 'review-message'} role="status">{error}</div>}
      {loading ? <div className="review-loading"><RefreshCw className="spin"/>Loading the shared pool…</div> : cards.length ? <div className="live-review-layout"><aside className="live-card-roster"><header><strong>{total} cards</strong><span>Select one to investigate</span></header>{cards.map((card) => <button className={selected?.cardId === card.cardId ? 'selected' : ''} onClick={() => setSelectedId(card.cardId)} key={card.cardId}><img src={card.portraitUrl ?? card.card.portraitAsset} alt=""/><span><small>{card.archetype} · {card.creatorName}</small><strong>{card.title}</strong><em className={`review-status-${card.reviewStatus}`}>{card.reviewStatus.replace('_',' ')}</em></span></button>)}</aside>{selected && <LiveCardDossier record={selected} onVerdict={verdict} working={working}/>}</div> : <div className="review-empty"><CircleDashed/><h2>No cards match this view.</h2><p>Try another status, archetype, or search. New alpha cards will appear automatically when the live review migration is active.</p></div>}
    </Panel>}
    <details className="fixture-evidence"><summary>Open repository fixtures used to design this room <ChevronDown/></summary><p>These five local examples prove layout and tier presentation only. They are not the live team roster and do not affect review counts.</p><RepositoryCards/></details>
    <Panel title="Permanent Archetype Cards" action={<span className="card-section-state card-section-empty">0 ACCEPTED</span>} className="permanent-card-section"><div className="permanent-empty"><div className="permanent-seal"><Shield/><span>NONE<br/>ACCEPTED</span></div><div><p className="eyebrow">PERMANENT ROSTER</p><h2>No cards have been accepted into the permanent game roster.</h2><p>This space stays empty until the studio designs and approves a separate promotion workflow. A Keep verdict is not permanent acceptance.</p></div></div></Panel>
  </>;
}

function RepositoryCards() {
  const [kind, setKind] = useState<'all' | 'candidate' | 'study'>('all');
  const [archetype, setArchetype] = useState('all');
  const [cardSearch, setCardSearch] = useState('');
  const [selectedId, setSelectedId] = useState(developmentCards[0].id);
  const [selectedRank, setSelectedRank] = useState<'Foundation' | 'Forged' | 'Ascendant'>('Foundation');
  const availableArchetypes = [...new Set(developmentCards.map((card) => card.archetype))];
  const visibleCards = developmentCards.filter((card) => {
    if (kind !== 'all' && card.kind !== kind) return false;
    if (archetype !== 'all' && card.archetype !== archetype) return false;
    return `${card.name} ${card.title} ${card.archetype} ${card.fixture}`.toLowerCase().includes(cardSearch.trim().toLowerCase());
  });
  const selected = developmentCards.find((card) => card.id === selectedId) ?? developmentCards[0];
  const selectedTier = selected.tiers.find((tier) => tier.rank === selectedRank && tier.image);
  useEffect(() => {
    if (visibleCards.length && !visibleCards.some((card) => card.id === selectedId)) {
      setSelectedId(visibleCards[0].id);
      setSelectedRank(visibleCards[0].tiers.find((tier) => tier.image)?.rank ?? 'Foundation');
    }
  }, [kind, archetype, cardSearch, selectedId]);
  const selectCard = (card: DevelopmentCardRecord) => {
    setSelectedId(card.id);
    setSelectedRank(card.tiers.find((tier) => tier.image)?.rank ?? 'Foundation');
  };

  return <><PageHeader eyebrow="CHARACTERS & ARCHETYPES · CARD EVALUATION" title="Cards" intro="Investigate every repository-backed development card, understand what it does, and see exactly what remains before permanent acceptance." status="IN FLIGHT"/>
    <div className="card-truth-banner"><Layers/><div><p className="eyebrow">THE GOVERNING RULE</p><h2>A card becomes permanent only through explicit human acceptance.</h2><p>Assets, database rows, generated portraits, and successful playtests never promote a card on their own.</p></div><span>0 ACCEPTED INTO GAME</span></div>
    <div className="card-room-summary" aria-label="Card evidence summary"><article><strong>{developmentCards.filter((card) => card.kind === 'candidate').length}</strong><span>character candidates</span></article><article><strong>{developmentCards.filter((card) => card.kind === 'study').length}</strong><span>tier art studies</span></article><article><strong>{developmentCards.filter((card) => card.tiers.every((tier) => tier.image)).length}</strong><span>complete art progressions</span></article><article><strong>0</strong><span>human accepted</span></article></div>
    <Panel title="Card Evaluation Room" action={<span className="card-section-state">READ-ONLY EVIDENCE</span>} className="card-evaluation-room">
      <div className="card-room-intro"><div><p className="eyebrow">INVESTIGATE BEFORE ACCEPTING</p><h2>Understand what a card does, what it proves, and what it still lacks.</h2><p>This room inventories meaningful repository-backed card fixtures and progression studies. Private player collections and unit-test fakes are intentionally not published here.</p></div><FlaskConical/></div>
      <div className="card-room-filters" aria-label="Filter development card records">
        <div className="card-kind-filter" role="group" aria-label="Evidence type">{([['all', 'All evidence'], ['candidate', 'Character candidates'], ['study', 'Tier art studies']] as const).map(([value, label]) => <button key={value} className={kind === value ? 'selected' : ''} aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}</div>
        <label className="card-archetype-filter"><span>Archetype</span><select value={archetype} onChange={(event) => setArchetype(event.target.value)}><option value="all">All archetypes</option>{availableArchetypes.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="card-record-search"><Search/><input value={cardSearch} onChange={(event) => setCardSearch(event.target.value)} placeholder="Find a card…" aria-label="Find a development card"/></label>
      </div>
      <div className="card-room-layout">
        <section className="card-evidence-roster" aria-label="Development card evidence roster"><div className="card-roster-heading"><span>{visibleCards.length} records</span><small>Select a record to inspect it</small></div>{visibleCards.length ? visibleCards.map((card) => <button key={card.id} className={selected.id === card.id ? 'card-roster-record selected' : 'card-roster-record'} onClick={() => selectCard(card)} aria-pressed={selected.id === card.id}><span className="card-roster-image"><img src={card.heroImage} alt=""/></span><span className="card-roster-copy"><small>{card.archetype} · {card.fixture}</small><strong>{card.title}</strong><em>{card.kind === 'candidate' ? <><Eye/>CHARACTER CANDIDATE · DEVELOPMENT</> : <><Layers/>TIER ART STUDY · NOT A CARD</>}</em>{selected.id === card.id && <b><Check/>Selected</b>}</span></button>) : <div className="card-roster-empty"><Search/><strong>No matching evidence</strong><span>Try another archetype or evidence type.</span></div>}</section>
        {visibleCards.length > 0 && <CardDossier card={selected} selectedRank={selectedRank} selectedTierImage={selectedTier?.image} onRank={setSelectedRank}/>}
      </div>
    </Panel>
    <Panel title="Permanent Archetype Cards" action={<span className="card-section-state card-section-empty">0 ACCEPTED</span>} className="permanent-card-section">
      {permanentCards.length === 0 && <div className="permanent-empty"><div className="permanent-seal"><Shield/><span>NONE<br/>ACCEPTED</span></div><div><p className="eyebrow">PERMANENT ROSTER</p><h2>No cards have been accepted into the permanent game roster.</h2><p>This space is intentionally empty. A card will appear here only after its identity, art, rendering, and production provenance meet the game standard and Raheem explicitly accepts it into the game.</p><div className="acceptance-gates"><span>Identity holds across ranks</span><span>Art meets the game standard</span><span>Generation is reproducible</span><span>Human acceptance is recorded</span></div></div></div>}
    </Panel>
  </>;
}

function EvidenceState({ state }: { state: CardEvidenceState }) {
  const Icon = state === 'present' ? CircleCheck : state === 'review' ? CircleAlert : CircleDashed;
  return <span className={`card-evidence-state ${state}`}><Icon/>{state === 'present' ? 'Evidence present' : state === 'review' ? 'Needs human review' : 'No repository evidence'}</span>;
}

function CardDossier({ card, selectedRank, selectedTierImage, onRank }: { card: DevelopmentCardRecord; selectedRank: 'Foundation' | 'Forged' | 'Ascendant'; selectedTierImage?: string; onRank: (rank: 'Foundation' | 'Forged' | 'Ascendant') => void }) {
  const stats = card.stats ? Object.entries(card.stats).filter(([name]) => name !== 'resourceBias') as [string, number][] : [];
  return <article className="card-dossier" id={`card-dossier-${card.id}`} aria-labelledby={`card-dossier-title-${card.id}`}>
    <div className="card-dossier-heading"><div><p className="eyebrow">SELECTED RECORD · {card.fixture.toUpperCase()}</p><h2 id={`card-dossier-title-${card.id}`}>{card.title}</h2><span className={card.kind === 'candidate' ? 'card-record-class candidate' : 'card-record-class study'}>{card.kind === 'candidate' ? <><Eye/>CHARACTER CANDIDATE · DEVELOPMENT</> : <><Layers/>TIER ART STUDY · NOT A CARD</>}</span></div><img src={`/assets/archetype-emblems/${archetypes.find(([name]) => name === card.archetype)?.[1]}`} alt={`${card.archetype} emblem`}/></div>
    <div className="card-art-stage"><div className={card.heroKind === 'complete-card' && !selectedTierImage ? 'card-art-frame complete-card' : 'card-art-frame portrait-art'}><img src={selectedTierImage ?? card.heroImage} alt={selectedTierImage ? `${card.title} ${selectedRank} portrait evidence` : `${card.title} ${card.heroKind === 'complete-card' ? 'complete development card' : 'development portrait'}`}/></div><div className="card-art-caption"><span>{selectedTierImage ? `${selectedRank} evidence` : card.heroKind === 'complete-card' ? 'Complete rendered artifact' : 'Selected development portrait'}</span><small>Uncropped repository asset</small></div></div>
    <p className="card-dossier-summary">{card.summary}</p>
    <div className="card-rank-selector" aria-label={`${card.title} rank evidence`}>{card.tiers.map((tier) => <button key={tier.rank} disabled={!tier.image} className={selectedRank === tier.rank && tier.image ? 'selected' : ''} aria-pressed={selectedRank === tier.rank && Boolean(tier.image)} onClick={() => tier.image && onRank(tier.rank)}><span>{tier.rank}</span><small>{tier.image ? 'View evidence' : 'No repository evidence'}</small></button>)}</div>
    <div className="card-dossier-sections">
      <details open><summary><BookOpen/><span>Known identity and lore</span><ChevronDown/></summary><div className="card-detail-content">{card.lore ? <blockquote>“{card.lore}”</blockquote> : <div className="card-data-missing"><CircleDashed/><span><strong>No card lore is attached.</strong>This is a visual continuity study, not a named character record.</span></div>}<dl className="card-identity-facts"><div><dt>Archetype</dt><dd>{card.archetype}</dd></div><div><dt>Repository role</dt><dd>{card.fixture}</dd></div><div><dt>Record class</dt><dd>{card.kind === 'candidate' ? 'Development candidate' : 'Art study · not a card'}</dd></div></dl></div></details>
      <details open={Boolean(card.stats)}><summary><Swords/><span>Stats and abilities</span><ChevronDown/></summary><div className="card-detail-content">{card.stats ? <><div className="card-stat-grid">{stats.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong><i><b style={{width: `${value}%`}}/></i></div>)}</div>{card.stats.resourceBias && <p className="card-resource-note">Resource bias: <strong>{card.stats.resourceBias}</strong></p>}</> : <div className="card-data-missing"><CircleDashed/><span><strong>No card stats are attached.</strong>Do not infer mechanics from artwork.</span></div>}{card.abilitySlots?.length ? <div className="card-loadout">{card.abilitySlots.map(({ abilityId, fixtureSlot }) => { const ability = SEED_ABILITIES.find((entry) => entry.definition.id === abilityId); return <article key={abilityId}><span>{fixtureSlot}</span><h3>{ability?.definition.displayName ?? abilityId}</h3><p>{ability?.definition.descriptionShort ?? 'Ability record unavailable.'}</p><small>Canonical slot: {ability?.version.slotType ?? 'unknown'} · {ability?.definition.role ?? 'unknown role'} · {ability?.version.resourceCost ?? '?'} {ability?.version.resourceType ?? 'resource'}</small></article>; })}</div> : <div className="card-data-missing"><CircleDashed/><span><strong>No ability loadout is attached.</strong>This record cannot yet explain how the character plays.</span></div>}</div></details>
      <details open><summary><Layers/><span>{card.kind === 'study' ? 'Visual continuity study' : 'Tier evidence'}</span><ChevronDown/></summary><div className="card-detail-content"><div className="card-tier-evidence">{card.tiers.map((tier) => <article className={tier.image ? 'has-evidence' : 'missing-evidence'} key={tier.rank}>{tier.image ? <img src={tier.image} alt={`${card.title} ${tier.rank} evidence`}/> : <div><FileText/><span>NO REPOSITORY<br/>EVIDENCE</span></div>}<h3>{tier.rank}</h3><p>{tier.note}</p></article>)}</div>{card.kind === 'study' && <p className="card-study-warning"><TriangleAlert/>No card metadata is attached to this study. It cannot be evaluated as a permanent card.</p>}</div></details>
      <details open><summary><Shield/><span>Permanent-readiness evidence</span><ChevronDown/></summary><div className="card-detail-content"><p className="card-detail-preface">Evidence is descriptive, not a score. Only a recorded human decision can accept a permanent card.</p><div className="card-readiness-list">{card.readiness.map((item) => <div key={item.label}><span><strong>{item.label}</strong><EvidenceState state={item.state}/></span><p>{item.note}</p></div>)}</div></div></details>
      <details><summary><Lightbulb/><span>Investigation notes</span><ChevronDown/></summary><div className="card-detail-content"><p className="card-detail-preface">Editorial observations for the next investigation—not automatic approval requirements.</p><ol className="card-investigation-notes">{card.notes.map((note) => <li key={note}>{note}</li>)}</ol></div></details>
      <details><summary><FileText/><span>Repository evidence</span><ChevronDown/></summary><div className="card-detail-content card-source-list">{card.sources.map((source) => <RepoLink path={source} key={source}/>)}</div></details>
    </div>
    <div className="card-promotion-future"><Shield/><div><p className="eyebrow">FUTURE WORKFLOW</p><h3>Permanent promotion is not implemented yet.</h3><p>This room supports investigation only. The studio will design the explicit acceptance record, provenance gate, and promotion action later.</p></div></div>
  </article>;
}

function Bosses() {
  const [selected, setSelected] = useState(0); const [speed, setSpeed] = useState(1); const clip = bossStates[selected];
  return <><PageHeader eyebrow="VISUAL WIKI" title="Bosses & Arenas" intro="Inspect the actual combat art, its animation states, implementation facts, and honest gaps." status="IN FLIGHT"/><div className="boss-layout"><Panel title="Boss roster"><div className="boss-roster"><button className="boss-tile selected"><img src="/assets/combat/bosses/debt-bearer/sprite-idle.png" alt="Debt-Bearer"/><span><strong>The Debt-Bearer</strong><small>PixelLab · 7 real clips</small></span></button><div className="boss-tile boss-tile-missing"><span className="boss-missing">ART<br/>PENDING</span><span><strong>The Still Season</strong><small>Clips are not committed on this branch</small></span></div></div><div className="arena-thumb"><img src="/assets/combat/arenas/barbarian-moot-ground/base.png" alt="Barbarian moot-ground arena"/><span>Approved arena · actual in-game plate</span></div></Panel><Panel title="Animation inspector" action={<label className="speed">Preview speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label>}><SpritePlayer clip={clip} speed={speed}/><div className="state-tabs" role="tablist" aria-label="Boss animation states">{bossStates.map((state, index) => <button role="tab" aria-selected={selected === index} onClick={() => setSelected(index)} key={state.id}>{state.label}<small>{state.frames}f · {state.fps}fps</small></button>)}</div></Panel></div><Panel title="Seven-state comparison"><div className="comparison-grid">{bossStates.map((state) => <button key={state.id} onClick={() => setSelected(bossStates.indexOf(state))}><span className="comparison-image"><img src={`/assets/combat/bosses/debt-bearer/sprite-${state.file}.png`} alt="" style={{width:`${state.frames * 100}%`}}/></span><strong>{state.label}</strong><small>{state.loop ? 'Loops' : 'One-shot'} · {state.frames} frames</small></button>)}</div></Panel></>;
}

function Elements() {
  const [selected, setSelected] = useState(0);
  const element = elements[selected];
  return <><PageHeader eyebrow="VISUAL WIKI · ELEMENT CODEX" title="Elements" intro="Every element has two lives: the crystal establishes its identity, and the combat performance shows how that material charges, travels, and lands." status="IN FLIGHT"/>
    <Panel title="Choose an element" action={<span className="element-count">{elements.length} canonical elements · {elements.filter(({ artStatus }) => artStatus === 'candidate').length} PixelLab combat kits</span>} className="element-browser">
      <div className="crystal-grid" role="listbox" aria-label="Element library">
        {elements.map((item, index) => <button className={selected === index ? 'selected' : ''} onClick={() => setSelected(index)} key={item.slug} role="option" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onKeyDown={(event) => {
          const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
          if (!buttons) return;
          let next = index;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % elements.length;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + elements.length) % elements.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = elements.length - 1;
          else return;
          event.preventDefault(); setSelected(next); buttons[next]?.focus();
        }}>
          <span className="element-thumb">{item.crystal ? <img src={item.crystal} alt=""/> : <Sparkles/>}</span><span>{item.name}</span>{selected === index && <Check className="element-check"/>}<small>{item.artStatus === 'candidate' ? 'PixelLab kit' : item.artStatus === 'procedural' ? 'Procedural' : 'Unmapped'}</small>
        </button>)}
      </div>
    </Panel>
    <div className="element-codex-layout">
      <Panel className="crystal-identity">
        <div className="identity-status"><p className="eyebrow">CRYSTAL IDENTITY</p><Status value={element.crystal ? 'APPROVED' : 'MISSING ASSET'}/></div>
        {element.crystal ? <img src={element.crystal} alt={`${element.name} element crystal`}/> : <MissingMedia label="Time crystal"/>}
        <div className="crystal-copy"><h2>{element.name}</h2><p>The crystal is the complete identity artwork. Combat expression adds motion and material behavior without replacing it.</p><div className="material-signature"><span>Charge<strong>{element.charge}</strong></span><span>Delivery<strong>{element.delivery}</strong></span><span>Impact<strong>{element.impact}</strong></span></div></div>
      </Panel>
      <ElementPerformancePlayer element={element}/>
    </div>
    <Panel title="Where elements end and abilities begin" action={<a className="tower-related" href="/abilities">Open the Ability Codex →</a>}><div className="ability-boundary"><Gem/><div><h3>An element is a material language, not a named move.</h3><p className="fine-print">The crystal defines elemental identity. PixelLab performance art shows how that material behaves in battle. An ability combines rules, a role, a slot, and its own named identity—and now has a separate repository-backed catalog.</p></div></div></Panel>
  </>;
}

function Abilities() {
  const [slot, setSlot] = useState<'all' | 'core' | 'signature' | 'ultimate'>('all');
  const visible = SEED_ABILITIES.filter(({ version }) => slot === 'all' || version.slotType === slot);
  const [selectedId, setSelectedId] = useState(() => SEED_ABILITIES.find(({ definition }) => getApprovedArt(definition.slug))?.definition.id ?? SEED_ABILITIES[0].definition.id);
  const selected = visible.find(({ definition }) => definition.id === selectedId) ?? visible[0];
  const art = getApprovedArt(selected.definition.slug);
  const approvedArtCount = SEED_ABILITIES.filter(({ definition }) => getApprovedArt(definition.slug)).length;
  return <><PageHeader eyebrow="VISUAL WIKI · ABILITY CODEX" title="Abilities" intro="The live canonical roster: what each named power does, where it belongs, how it is versioned, and which abilities have approved artwork." status="IN FLIGHT"/>
    <div className="ability-summary-grid">
      <Panel><strong>{SEED_ABILITIES.length}</strong><span>canonical seed abilities</span></Panel>
      <Panel><strong>3</strong><span>slot tiers · core, signature, ultimate</span></Panel>
      <Panel><strong>{approvedArtCount}</strong><span>current abilities with canonical art</span></Panel>
      <Panel><strong>1 → many</strong><span>permanent identity to balance versions</span></Panel>
    </div>
    <div className="ability-filter" role="group" aria-label="Filter abilities by slot">{(['all','core','signature','ultimate'] as const).map((value) => <button key={value} className={slot === value ? 'selected' : ''} aria-pressed={slot === value} onClick={() => setSlot(value)}>{value === 'all' ? 'All abilities' : value}</button>)}</div>
    <div className="ability-codex-layout">
      <Panel title={`${visible.length} ${slot === 'all' ? 'abilities' : `${slot} abilities`}`} className="ability-roster"><div className="ability-roster-list">{visible.map(({ definition, version }) => <button key={definition.id} className={selected.definition.id === definition.id ? 'selected' : ''} aria-pressed={selected.definition.id === definition.id} onClick={() => setSelectedId(definition.id)}><span className={`ability-rarity ability-rarity-${definition.rarity}`}/><span><strong>{definition.displayName}</strong><small>{definition.familyIds.join(' · ')} · {version.resourceType}</small></span><ChevronRight/></button>)}</div></Panel>
      <Panel className="ability-detail">
        <div className="ability-detail-head"><div><p className="eyebrow">{selected.version.slotType.toUpperCase()} · {selected.definition.rarity.toUpperCase()}</p><h2>{selected.definition.displayName}</h2><p>{selected.definition.descriptionShort}</p></div><Status value={art ? 'APPROVED' : 'MISSING ASSET'}/></div>
        <div className="ability-detail-body"><div className="ability-art-frame">{art ? <img src={art.detail.url} alt={`${selected.definition.displayName} canonical ability art`}/> : <MissingMedia label="Canonical ability art"/>}</div><dl>
          <div><dt>Role</dt><dd>{selected.definition.role}</dd></div><div><dt>Family</dt><dd>{selected.definition.familyIds.join(', ')}</dd></div><div><dt>Resource</dt><dd>{selected.version.resourceType} · cost {selected.version.resourceCost}</dd></div><div><dt>Target</dt><dd>{selected.version.targetRule.type.replaceAll('_',' ')}</dd></div><div><dt>Effects</dt><dd>{selected.version.effects.map((effect) => effect.type.replaceAll('_',' ')).join(', ')}</dd></div><div><dt>Version</dt><dd>v{selected.version.versionNumber} · {selected.version.status}</dd></div>
        </dl></div>
        <div className="ability-detail-foot"><p>Gameplay identity and artwork stay attached to the permanent ability. Balance changes create a new version instead of rewriting its discovery history.</p><RepoLink path="card-engine/src/data/abilities/seedAbilities.ts"/></div>
      </Panel>
    </div>
    <div className="ability-principles"><Panel title="Identity"><p>One named ability remains recognizable across balance passes, cards, and discoveries.</p></Panel><Panel title="Progression"><p>Core abilities establish the kit. Signature and ultimate slots expand as the character advances.</p></Panel><Panel title="Artwork"><p>Leonardo art is generated once for a genuinely new permanent ability—not per card and not per tier.</p></Panel></div>
    <Panel className="ability-next-pass"><div><p className="eyebrow">NEXT PRODUCTION PASS</p><h2>{SEED_ABILITIES.length - approvedArtCount} abilities still need canonical art.</h2><p>The catalog is ready for the deeper ability-generation and picture workflow you plan to develop next. Missing art stays explicit instead of borrowing retired paintings from the old roster.</p></div><div><a className="tower-related" href="/elements">Looking for elemental charge and blast art? Open Elements →</a><RepoLink path="card-engine/src/data/abilities/visualManifest.ts"/></div></Panel>
  </>;
}

function World() { return <><PageHeader eyebrow="VISUAL WIKI" title="Game World" intro="The permanent world, its interactive layers, and the boundary between painted truth and runtime behavior." status="IN FLIGHT"/><Panel className="world-hero"><img src="/assets/castle/courtyard.png" alt="The current production Card Engine courtyard"/><div className="world-caption"><span>CURRENT COURTYARD · PRODUCTION</span><strong>The post-login hub stays live while its V2 replacement is built separately.</strong></div></Panel><Panel title="Courtyard V2 — pending replacement" action={<Status value="IN FLIGHT"/>}><p>The new courtyard is being designed one purposeful quadrant at a time. Today’s verified checkpoint makes the forge quadrant playable without changing the production courtyard.</p><div className="fact-grid"><div><strong>Playable now</strong><span>Controllable chibi with soft white heel dust</span></div><div><strong>Forge life</strong><span>Surge, smoke, heat, and moving energy</span></div><div><strong>Physical space</strong><span>Figma-traced forge, counter, and bench colliders</span></div><div><strong>Walk-behind depth</strong><span>Counter and bench occlusion tested in Phaser</span></div></div><p><strong>Still pending:</strong> the other three quadrants, full-map collision and occlusion, counter/bench shadow cleanup, and final production integration. The preview is preserved on <code>codex/courtyard-forge-vfx</code>; it is not a production replacement yet.</p></Panel><div className="four-col"><Panel title="Leonardo"><p>Ground, architecture, landmarks, and permanent environment plates.</p></Panel><Panel title="PixelLab"><p>Actors, reusable props, shopkeepers, and animated character sprites.</p></Panel><Panel title="Figma"><p>Projection, placement, anchors, colliders, occluders, and physical truth.</p></Panel><Panel title="Phaser"><p>Motion, reactions, audio, depth, atmosphere, camera, and scene state.</p></Panel></div><Panel title="Scene layers"><div className="fact-grid"><div><strong>Base plate</strong><span>V2 layout in active quadrant design</span></div><div><strong>Occluders</strong><span>Forge quadrant verified; remaining map pending</span></div><div><strong>Colliders</strong><span>Forge passages verified; full map pending</span></div><div><strong>Production switch</strong><span>Blocked until the whole courtyard passes review</span></div></div></Panel></>; }

function Minigames() {
  return <>
    <PageHeader eyebrow="PRIMARY PLAYABLE MODE · THE CASTLE’S FIRST DOOR" title="Battle Tower" intro="Build a party from the characters you forged, read what the boss is about to do, and solve each encounter one floor at a time." status="IN FLIGHT"/>
    <div className="tower-hero-grid">
      <Panel className="tower-stage">
        <img className="tower-arena" src="/assets/combat/arenas/barbarian-moot-ground/base.png" alt="The approved Barbarian moot-ground Battle Tower arena"/>
        <div className="tower-boss"><img src="/assets/combat/bosses/debt-bearer/sprite-idle.png" alt="The Debt-Bearer waiting on a Battle Tower floor"/></div>
        <div className="tower-party" aria-label="Example three-card party">
          {['barbarian','druid','mech-pilot'].map((hero) => <img key={hero} src={`/assets/combat/heroes/archetypes/${hero}.png`} alt={`${hero.replace('-', ' ')} battle card`}/>) }
        </div>
        <div className="tower-stage-copy"><span>BATTLE TOWER · VERIFIED ENCOUNTER</span><strong>Your cards are the characters on the field.</strong></div>
      </Panel>
      <Panel title="The promise" className="tower-promise">
        <p className="tower-lede">The Tower is the main feature and the gate.</p>
        <p>You prepare in the castle, choose the cards that belong together, and enter a sequence of boss floors. Winning grows your characters and opens the rest of the game.</p>
        <div className="tower-link-pair"><a href="/bosses">Inspect boss & arena assets →</a><RepoLink path="card-engine/src/pages/battle"/></div>
        <div className="tower-caution"><Status value="PLANNED"/><span>The total number of floors is not decided yet.</span></div>
      </Panel>
    </div>

    <div className="section-title"><div><p className="eyebrow">THE ROUND</p><h2>Read first. Commit second.</h2></div></div>
    <div className="tower-round" aria-label="Battle round sequence">
      <article><span>01</span><Swords/><strong>Boss declares</strong><p>Its intent, target, and telegraph are chosen and locked.</p></article>
      <article><span>02</span><BookOpen/><strong>You read</strong><p>See who is threatened, what kind of hit is coming, and whether it can be interrupted.</p></article>
      <article><span>03</span><Users/><strong>Your party acts</strong><p>Living cards take actions from left to right: strike, guard, or use an ability.</p></article>
      <article><span>04</span><Shield/><strong>The boss resolves</strong><p>The declared action lands, the round ends, and statuses, cooldowns, and resources tick.</p></article>
    </div>

    <div className="tower-system-grid">
      <Panel title="Build the party" className="tower-system">
        <div className="power-budget"><div><span style={{width:'72%'}}/></div><strong>18 power</strong><small>3 field slots</small></div>
        <p>Each card costs the sum of its three stat ranks. Up to three heroes take the field, but stronger cards consume more of the fixed power budget. Lanes resolve left to right.</p>
        <div className="tower-rule"><strong>Why it matters</strong><span>The boss does not scale down to your party. Climbing is answered by building a better composition.</span></div>
      </Panel>
      <Panel title="Read a battle card" className="tower-system">
        <div className="stat-explainer"><div><b>ATK</b><span>Sets the free Strike’s damage and scales offensive abilities.</span></div><div><b>DEF</b><span>Builds HP, reduces incoming damage, and strengthens Guard.</span></div><div><b>MANA<br/>TECH</b><span>Sets resource capacity and which shared chamber pays for abilities.</span></div></div>
      </Panel>
      <Panel title="The resource rhythm" className="tower-system">
        <div className="chambers"><div className="mana"><span>Mana chamber</span><i/><i/><i/><i/></div><div className="tech"><span>Tech chamber</span><i/><i/><i/></div></div>
        <p>Mana and Tech are separate party resources. Androids and Mech Pilots spend Tech; the other archetypes spend Mana. A free Strike deals light kinetic damage and adds <strong>2</strong> to the matching chamber. Abilities spend from that shared chamber.</p>
        <small>Each living contributor also restores 1 to its matching chamber at round end.</small>
      </Panel>
      <Panel title="Elements, damage & defense" className="tower-system">
        <div className="damage-pipeline"><span>Base + stat scaling</span><b>→</b><span>Weakness / resistance</span><b>→</b><span>DEF mitigation</span><b>→</b><span>Shields, then HP</span></div>
        <p>Damage types are the tactical expression of elements. A resisted type deals half; a weakness deals one-and-a-half times. Guard creates a one-round shield. Damage always has a minimum floor of 1.</p>
        <a className="tower-related" href="/elements">Explore Elements →</a>
      </Panel>
    </div>

    <Panel title="Known Tower encounters" action={<a className="tower-related" href="/bosses">Open production inspector →</a>}>
      <div className="tower-floors">
        <article className="tower-floor verified"><img src="/assets/combat/arenas/barbarian-moot-ground/base.png" alt=""/><div><Status value="APPROVED"/><h3>The Debt-Bearer</h3><p>Barbarian Moot-Ground · seven real PixelLab animation states</p></div></article>
        <article className="tower-floor pending"><div className="floor-pending"><FlaskConical/></div><div><Status value="IN FLIGHT"/><h3>The Still Season</h3><p>Encounter code exists; its current art is not committed on this branch.</p></div></article>
        <article className="tower-floor open"><div className="floor-number">?</div><div><Status value="PLANNED"/><h3>Higher floors</h3><p>No invented count, boss, or reward. Tower length still needs Raheem’s ruling.</p></div></article>
      </div>
    </Panel>
  </>;
}

function IdeaNote({ idea, onSaved, canEdit }: { idea: StudioIdea; onSaved: (idea: StudioIdea) => void; canEdit: boolean }) {
  const [body, setBody] = useState(idea.body);
  const [state, setState] = useState<'saved' | 'saving' | 'error'>('saved');
  useEffect(() => { setBody(idea.body); }, [idea.id, idea.body]);
  useEffect(() => {
    if (!canEdit || body === idea.body || !body.trim()) return;
    setState('saving');
    const timer = window.setTimeout(async () => { try { const saved = await updateStudioIdea(idea.id, body); onSaved(saved); setState('saved'); } catch { setState('error'); } }, 700);
    return () => window.clearTimeout(timer);
  }, [body, canEdit, idea.id, idea.body, onSaved]);
  return <article className="idea-note"><header><span>{canEdit ? 'YOUR NOTE' : 'STUDIO PARTNER'} · {new Date(idea.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>{canEdit && <span className={`idea-save-state ${state}`} aria-live="polite">{state === 'saving' ? <><RefreshCw className="spin"/>Saving…</> : state === 'error' ? <><TriangleAlert/>Could not save</> : <><Check/>Saved</>}</span>}</header><textarea aria-label={`Idea from ${new Date(idea.createdAt).toLocaleDateString()}`} value={body} readOnly={!canEdit} onChange={(event) => setBody(event.target.value)} onBlur={async () => { if (canEdit && body.trim() && body !== idea.body) { setState('saving'); try { const saved = await updateStudioIdea(idea.id, body); onSaved(saved); setState('saved'); } catch { setState('error'); } } }}/><footer>{canEdit ? 'Editable note' : 'Shared read-only note'} · no task status · no delete action</footer></article>;
}

function RaheemDesk() {
  const { session, checking } = useStudioSession();
  const [ideas, setIdeas] = useState<StudioIdea[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setIdeas(await listStudioIdeas()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the notebook.'); } finally { setLoading(false); } };
  useEffect(() => { if (isStudioPartnerRole(session?.role)) load(); }, [session?.userId, session?.role]);
  const add = async () => { if (!draft.trim() || saving) return; setSaving(true); setError(''); try { const idea = await createStudioIdea(draft); setIdeas((current) => [idea, ...current]); setDraft(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the idea.'); } finally { setSaving(false); } };
  const update = (saved: StudioIdea) => setIdeas((current) => current.map((idea) => idea.id === saved.id ? saved : idea));
  return <><PageHeader eyebrow="WORK BOARD · STUDIO LEAD" title="Raheem’s Desk" intro="A quiet place to capture ideas without letting them interrupt the work already in motion." status="IN FLIGHT"/><WorkBoardNav current="raheem"/>
    <section className="desk-how"><div><NotebookPen/><p className="eyebrow">HOW THIS DESK WORKS</p><h2>Write it down. Keep your focus. Return when the time is right.</h2><p>Ideas here are durable shared Studio notes—not tasks, promises, priorities, or automatic instructions for Codex and Claude. Raheem and Tori can read the notebook together; each person edits only the notes they authored.</p></div><ol><li><span>1</span>Capture the thought in plain language.</li><li><span>2</span>Keep working on today’s goal.</li><li><span>3</span>Revisit and edit your note later.</li></ol></section>
    {checking ? <Panel className="review-loading"><RefreshCw className="spin"/>Opening Raheem’s desk…</Panel> : !session ? <StudioSignIn purpose="The shared Studio notebook follows Raheem and Tori across devices."/> : !isStudioPartnerRole(session.role) ? <Panel className="desk-locked"><Shield/><h2>This is a Studio partner space.</h2><p>You are signed in as {session.email}, but this notebook is limited to the admin and lore-director roles.</p><button className="studio-signout" onClick={signOutOfStudio}>Sign out</button></Panel> : <>
      <Panel className="idea-composer" title="Capture an idea" action={<span>SHARED · DURABLE · NOT A TASK</span>}><label htmlFor="idea-draft">What do you want to remember?</label><textarea id="idea-draft" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder="Write the idea before it pulls you away from the current goal…"/><div><p><Command/>Ctrl/Cmd + Enter to save</p><button disabled={!draft.trim() || saving} onClick={add}>{saving ? <RefreshCw className="spin"/> : <Plus/>}{saving ? 'Saving…' : 'Add idea'}</button></div>{error && <p className="studio-form-error" role="alert">{error}</p>}</Panel>
      <div className="idea-notebook-heading"><div><p className="eyebrow">THE NOTEBOOK</p><h2>{ideas.length} saved {ideas.length === 1 ? 'idea' : 'ideas'}</h2></div><button className="studio-signout" onClick={signOutOfStudio}>Sign out · {session.email}</button></div>
      {loading ? <Panel className="review-loading"><RefreshCw className="spin"/>Opening the notebook…</Panel> : ideas.length ? <div className="idea-notebook">{ideas.map((idea) => <IdeaNote key={idea.id} idea={idea} onSaved={update} canEdit={idea.ownerId === session.userId}/>)}</div> : <Panel className="review-empty"><Feather/><h2>The first page is blank.</h2><p>Capture an idea above. It will remain here until you decide what, if anything, it should become.</p></Panel>}
    </>}
  </>;
}

type WorkBoardKind = 'advice' | 'active' | 'required' | 'tori' | 'raheem';

function productionSectionGroup(heading: string) {
  const sections = sectionsFromMarkdown(productionMarkdown);
  const start = sections.findIndex((section) => section.heading.toLowerCase().includes(heading.toLowerCase()));
  if (start < 0) return [];
  const rootLevel = sections[start].level;
  let end = start + 1;
  while (end < sections.length && sections[end].level > rootLevel) end += 1;
  return sections.slice(start, end);
}

function inFlightOnly(lines: string[]) {
  const hasStatusTable = lines.some((line) => line.startsWith('| State |'));
  if (!hasStatusTable) return lines;
  return lines.filter((line) => !line.startsWith('|') || line.startsWith('| State |') || /^\|[-:| ]+\|$/.test(line) || line.includes('| IN FLIGHT |'));
}

function WorkBoardNav({ current }: { current: WorkBoardKind }) {
  const items: Array<[WorkBoardKind, string, string, string, typeof Lightbulb]> = [
    ['advice', '/work/advice', 'AI Advice', 'Ranked recommendations', Lightbulb],
    ['active', '/work/active', 'Active Work', 'What is in motion', ListChecks],
    ['required', '/work/required', 'Required & Deferred', 'Necessary and delayed', TriangleAlert],
    ['tori', '/work/tori', "Tori's Desk", 'Lore assignments', Feather],
    ['raheem', '/work/raheem', "Raheem's Desk", 'Private ideas notebook', NotebookPen],
  ];
  return <section className="work-board-navigation" aria-labelledby="work-board-navigation-title">
    <div className="work-board-navigation-heading">
      <div><p className="eyebrow">NAVIGATE THE WORK BOARD</p><h2 id="work-board-navigation-title">Choose a work view</h2></div>
      <p>Five linked pages · select one to open</p>
    </div>
    <nav className="work-board-switcher" aria-label="Work Board pages">{items.map(([kind, path, label, description, Icon], index) => {
      const selected = current === kind;
      return <a key={path} href={path} data-kind={kind} aria-label={`Open ${label}: ${description}`} aria-current={selected ? 'page' : undefined}>
        <span className="work-board-switcher-index">{String(index + 1).padStart(2,'0')}</span>
        <span className="work-board-switcher-icon"><Icon aria-hidden="true"/></span>
        <span className="work-board-switcher-copy"><strong>{label}</strong><small>{description}</small></span>
        <span className="work-board-switcher-action">{selected ? 'YOU ARE HERE' : 'OPEN PAGE'}<ChevronRight aria-hidden="true"/></span>
      </a>;
    })}</nav>
  </section>;
}

function WorkBoardPage({ kind }: { kind: Exclude<WorkBoardKind, 'raheem'> }) {
  const configs = {
    advice: { eyebrow: 'WORK BOARD · STUDIO LEAD RECOMMENDATIONS', title: 'AI Advice', intro: 'What Codex and Claude think will most improve the game next—ranked, explained, and always yours to overrule.', heading: "0. What I'd work on next", source: 'PRODUCTION.md §0', icon: <Lightbulb/> },
    active: { eyebrow: 'WORK BOARD · CURRENT EXECUTION', title: 'Active Work', intro: 'The work that is genuinely in motion now, including its current state and the branches carrying it.', heading: '3. Status board', source: 'PRODUCTION.md §3', icon: <ListChecks/> },
    required: { eyebrow: 'WORK BOARD · UNFINISHED OBLIGATIONS', title: 'Required & Deferred', intro: 'Necessary gaps, conscious deferrals, and stranded work—visible so “later” never quietly becomes “forgotten.”', heading: '4. Open threads', source: 'PRODUCTION.md §4', icon: <TriangleAlert/> },
    tori: { eyebrow: 'WORK BOARD · LORE DIRECTOR', title: "Tori's Desk", intro: 'Lore work waiting for Tori: what is provisional, what needs review, and where her judgment changes the game most.', heading: "1. Tori's desk", source: 'PRODUCTION.md · Lore §1', icon: <Feather/> },
  } as const;
  const config = configs[kind];
  const sourceSections = productionSectionGroup(config.heading).map((section, index) => kind === 'active' && index === 0 ? { ...section, body: inFlightOnly(section.body) } : section);
  const updated = /\*\*Last updated:\*\*\s*([^·\n]+)/.exec(productionMarkdown)?.[1]?.trim() ?? 'repository source';
  return <>
    <PageHeader eyebrow={config.eyebrow} title={config.title} intro={config.intro} status="IN FLIGHT"/>
    <WorkBoardNav current={kind}/>
    <Panel className={`work-board-ledger work-board-ledger-${kind}`}>
      <div className="work-ledger-mark">{config.icon}</div>
      <div><p className="eyebrow">LIVE REPOSITORY PROJECTION</p><h2>{config.source}</h2><p>Last sourced {updated}. Update the owning section through the <strong>production-log</strong> workflow; this page never keeps a separate browser-only task list.</p></div>
      <RepoLink path="PRODUCTION.md"/>
    </Panel>
    {sourceSections.length ? <div className={`work-source-grid work-source-grid-${kind}`}>{sourceSections.map((section, index) => {
      const classification = kind === 'required' ? (section.heading.toLowerCase().includes('deferred') ? 'DEFERRED' : section.heading.toLowerCase().includes('stranded') ? 'BLOCKED' : index === 0 ? 'OPEN LEDGER' : 'REQUIRED') : undefined;
      return <Panel className={index === 0 ? 'work-source-card work-source-intro' : 'work-source-card'} title={section.heading.replace(/\s*\{#[^}]+\}/, '')} action={classification ? <span className={`work-class work-class-${classification.toLowerCase().replace(' ','-')}`}>{classification}</span> : undefined} key={`${section.heading}-${index}`}><MarkdownBody lines={section.body} limit={80}/></Panel>;
    })}</div> : <Panel className="work-parse-error"><TriangleAlert/><h2>Source section unavailable</h2><p>The expected {config.source} heading could not be parsed. Nothing has been substituted.</p></Panel>}
    <Panel className="work-lock-note"><strong>Locking a goal means writing it down.</strong><p>Ask Codex or Claude to make a recommendation the current goal. It becomes active only when the production ledger records its owner, state, next checkpoint, and blocker.</p></Panel>
  </>;
}

function Production() {
  const sections = useMemo(() => sectionsFromMarkdown(productionMarkdown), []); const [selected, setSelected] = useState(Math.max(0, sections.findIndex((section) => section.heading.includes('What I')))); const section = sections[selected];
  return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Current Build" intro="A readable window into PRODUCTION.md. The Markdown file stays canonical; this page adapts it at build time." status="IN FLIGHT"/><div className="reading-layout"><aside className="toc"><p>IN THIS SOURCE</p>{sections.filter((item) => item.level <= 2).slice(0, 18).map((item) => { const index = sections.indexOf(item); return <button className={index === selected ? 'active' : ''} key={`${item.heading}-${index}`} onClick={() => setSelected(index)}>{item.heading}</button>; })}</aside><Panel className="article"><p className="eyebrow">PRODUCTION.MD · BUILD-TIME SOURCE</p><h2>{section?.heading}</h2>{section && <MarkdownBody lines={section.body}/>}<RepoLink path="PRODUCTION.md"/></Panel><aside className="facts"><div><span>Source of truth</span><strong>PRODUCTION.md</strong></div><div><span>Operational metrics</span><strong>Admin dashboard</strong></div><div><span>Update path</span><strong>production-log skill</strong></div></aside></div></>;
}

function StudioHandbook() {
  return <>
    <PageHeader eyebrow="COWORKER HANDBOOK · CARD ENGINE AI STUDIO V2" title="The workflow is the studio." intro="A practical handoff for collaborators: how an idea becomes art, code, evidence, and a human-approved release without losing the reasoning that made it work." status="IN FLIGHT"/>

    <div className="studio-purpose-grid">
      <Panel className="studio-purpose">
        <p className="eyebrow">WHAT WE ARE HANDING OFF</p>
        <h2>Not a box of agents. A way of making games together.</h2>
        <p>Card Engine is the proving ground for a reusable AI-native 2D game studio. The valuable part is the repeatable process Raheem developed: decide clearly, create with the right tool, integrate into the real game, prove the result, and preserve what the team learned.</p>
        <div className="studio-principle"><Workflow/><span><strong>One visible path</strong> from idea to release, with an owner and evidence at every handoff.</span></div>
      </Panel>
      <Panel className="studio-authority">
        <Shield/>
        <p className="eyebrow">HUMAN AUTHORITY</p>
        <h2>People decide. Tools assist.</h2>
        <p>Raheem and approved teammates keep the final say on creative direction, product, economy, spending, destructive actions, subjective review, push, and deployment.</p>
        <strong>Release is never automatic.</strong>
      </Panel>
    </div>

    <Panel title="Before a new collaborator starts" action={<span className="studio-kicker">PERSONAL ACCOUNTS · SHARED WORKSPACES</span>}>
      <div className="studio-onboarding-grid">
        <article><span>01</span><strong>Create your own tool spaces</strong><p>Set up your own Figma and Leonardo accounts. Personal credentials and provider keys are never handed from one developer to another.</p></article>
        <article><span>02</span><strong>Join the shared work</strong><p>Once your accounts exist, the team can connect shared Figma and Leonardo workspaces where collaboration belongs.</p></article>
        <article><span>03</span><strong>Read the current truth</strong><p>Start with the production record and Studio architecture—not an old conversation—so you know what exists, what is in flight, and why.</p></article>
        <article><span>04</span><strong>Work through evidence</strong><p>Use the repository workflow, keep secrets local, and finish with checks plus human review at the gates that require judgment.</p></article>
      </div>
    </Panel>

    <Panel title="How we make the game" action={<a className="studio-full-link" href={studioWorkflow} target="_blank" rel="noreferrer">Open full-size map <ExternalLink/></a>} className="studio-diagram-panel">
      <p className="studio-section-lede">This is the framework a new developer inherits: responsibility first, a seven-stage production path, clear tool boundaries, and evidence before release.</p>
      <figure className="studio-figure">
        <div className="studio-diagram-scroll" tabIndex={0} aria-label="Scrollable overview of the Card Engine AI Studio V2 workflow">
          <img src={studioWorkflow} alt="Card Engine AI Studio V2 workflow showing human responsibility, seven production stages, tool responsibilities, and current status"/>
        </div>
        <figcaption>People decide. One Studio Lead coordinates. Tools do specific jobs. Evidence proves the result.</figcaption>
      </figure>
      <details className="studio-transcript"><summary>Read the workflow as text</summary><div className="studio-stage-grid">{studioStages.map(([number, title, copy]) => <article key={number}><span>{number}</span><strong>{title}</strong><p>{copy}</p></article>)}</div></details>
    </Panel>

    <div className="section-title"><div><p className="eyebrow">THE HANDOFFS</p><h2>Each tool has a job. None of them is the studio.</h2></div></div>
    <div className="studio-tool-grid">
      <Panel title="Design + creation"><p><strong>Figma</strong> shapes screens and scene geometry. <strong>Leonardo</strong> creates portraits, emblems, and painted places. <strong>PixelLab and Pixelorama</strong> create and repair sprites and animation.</p></Panel>
      <Panel title="Frontend + game engine"><p><strong>React and TypeScript</strong> build menus and product surfaces. <strong>Phaser</strong> runs the playable 2D world. The Studio Lead integrates the work.</p></Panel>
      <Panel title="Backend + secure AI"><p><strong>Supabase</strong> stores accounts and game data. <strong>Vercel Functions</strong> protect provider calls. AI providers help with names, lore, prompts, and production work.</p></Panel>
      <Panel title="Evidence + memory"><p>Tests, named scenarios, screenshots, and consoles prove behavior. Canonical documents, registries, and playbooks preserve what worked for the next collaborator.</p></Panel>
    </div>

    <Panel title="The supporting studio system" action={<a className="studio-full-link" href={studioRoster} target="_blank" rel="noreferrer">Open full-size index <ExternalLink/></a>} className="studio-diagram-panel">
      <p className="studio-section-lede">Specialist agents advise when judgment is needed. Skills hold repeatable workflows. The active Studio Lead still owns integration, verification, reporting, and documentation.</p>
      <figure className="studio-figure">
        <div className="studio-diagram-scroll" tabIndex={0} aria-label="Scrollable index of installed Studio V2 specialist agents and production skills">
          <img src={studioRoster} alt="Index of nine read-only specialist agents and twenty-three installed production workflow skills, including retired and inactive statuses"/>
        </div>
        <figcaption>The roster supports the workflow; it does not replace human direction or the Studio Lead.</figcaption>
      </figure>
      <details className="studio-transcript"><summary>Read the installed roster as text</summary><div className="studio-roster-text"><section><h3>9 read-only specialists</h3><ul>{studioAgents.map((agent) => <li key={agent}>{agent}</li>)}</ul></section><section><h3>23 installed skills</h3><ul>{studioSkills.map((skill) => <li key={skill}>{skill}</li>)}</ul></section></div></details>
    </Panel>

    <Panel title="Where the living instructions live" className="studio-reference-panel">
      <div><RepoLink path="AI_STUDIO_ARCHITECTURE.md"/><p>The plain-language operating model and coworker-ready studio layers.</p></div>
      <div><RepoLink path="STUDIO_CHARTER.md"/><p>Authority, approval gates, specialist rules, and the long-term vision.</p></div>
      <div><RepoLink path=".claude/studio/STUDIO_CAPABILITY_REGISTRY.json"/><p>The machine-readable index of current agents, skills, triggers, status, and verification.</p></div>
      <div><RepoLink path="PRODUCTION.md"/><p>What is true today, what is unfinished, and why decisions were made.</p></div>
    </Panel>
  </>;
}

function Assets() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Art & Assets" intro="The web-sized catalog now; a clean bridge to OpenNest full-resolution storage later." status="IN FLIGHT"/>{/* Counted, never typed. These tiles read as authoritative, so a stale number
    here is a lie the page tells confidently. Only the arena count is literal —
    there is no arena registry for the Wiki to count yet. */}
<div className="asset-stats"><div><strong>{archetypes.length}</strong><span>Integrated emblems</span></div><div><strong>{elements.filter(({ crystal }) => crystal).length}</strong><span>Element crystals</span></div><div><strong>{bossStates.length}</strong><span>Debt-Bearer clips</span></div><div><strong>2</strong><span>Approved arenas</span></div></div><Panel title="Storage contract"><div className="storage-flow"><div><Image/><strong>Studio Wiki</strong><span>Metadata + web previews</span></div><ChevronDown/><div><Boxes/><strong>GitHub repository</strong><span>Canonical docs + optimized assets</span></div><ChevronDown/><div><Castle/><strong>OpenNest at home</strong><span>Full-resolution sources later</span></div></div></Panel><Panel title="Asset truth"><div className="fact-grid"><div><Status value="APPROVED"/><strong>Ready for canonical display</strong></div><div><Status value="IN FLIGHT"/><strong>Visible with status and provenance</strong></div><div><Status value="MISSING ASSET"/><strong>Honest placeholder; no substitution</strong></div><div><Status value="PARKED"/><strong>Preserved without implying commitment</strong></div></div></Panel></>; }

function Workshops() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Workshops" intro="The repeatable harnesses and review surfaces that let the studio see how something is being made." status="IN FLIGHT"/><div className="workshop-grid"><Workshop image={workshopSprite} title="Sprite Lab" copy="Generate, recover, pack, and validate PixelLab characters and bosses." path="card-engine/scripts/sprite-lab"/><Workshop image={workshopArena} title="Background Harness" copy="Prompt, compare, finish, and approve environment plates." path="card-engine/scripts/bg-harness"/><Workshop image={workshopBoss} title="Boss Readout" copy="Review animation states, frame geometry, and combat presentation." path="card-engine/scripts"/></div><Panel title="A harness is a window"><p className="large-copy">A generation run is not complete merely because files exist. The harness exposes the prompt, candidates, provenance, cost, validation, and human approval point so the next person can reproduce the work.</p><RepoLink path="HARNESS_INDEX.md"/></Panel></>; }
function Workshop({image,title,copy,path}:{image:string;title:string;copy:string;path:string}) { return <Panel className="workshop-card"><img src={image} alt="" onError={(event) => { event.currentTarget.style.display='none'; }}/><h2>{title}</h2><p>{copy}</p><RepoLink path={path}/></Panel>; }

function Decisions() {
  const [introduction, ...entries] = productionSectionGroup('8. Decision log');
  return <><PageHeader eyebrow="PRODUCTION LIBRARY · STUDIO MEMORY" title="Decision Log" intro="The append-only record of why the studio chose a direction. This is historical rationale—not a list of current tasks."/><div className="decision-boundary"><Panel><BookOpen/><div><p className="eyebrow">DECISION LOG</p><h2>Why did we choose this?</h2><p>Settled choices, reversals, and their consequences remain readable here in newest-first order.</p></div></Panel><RouteCard icon={<ListChecks/>} title="Looking for current work?" copy="Advice, active work, required debt, and Tori's desk live on the Work Board" path="/work/advice"/></div>
    {introduction ? <Panel className="decision-intro"><MarkdownBody lines={introduction.body}/><RepoLink path="PRODUCTION.md"/></Panel> : <Panel><p>The decision log remains in PRODUCTION.md.</p></Panel>}
    <div className="decision-layout"><section className="decision-list" aria-label="Decision history">{entries.map((entry, index) => <details className="decision-entry" open={index < 3} key={entry.heading}><summary><span>{String(index + 1).padStart(2,'0')}</span><strong>{entry.heading}</strong><ChevronDown/></summary><MarkdownBody lines={entry.body} limit={80}/></details>)}</section><aside className="facts"><div><span>Final product authority</span><strong>Raheem</strong></div><div><span>Answers</span><strong>Why it was decided</strong></div><div><span>Current tasks live in</span><strong>Work Board</strong></div><div><span>Record rule</span><strong>Newest first · append-only</strong></div></aside></div>
  </>;
}

function Technical() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Technical Systems" intro="The major engines and the contracts between them—enough context to navigate the repository without flattening it into a file list."/><div className="system-map"><Panel title="Web application"><h3>React 19 · Vite 8 · TypeScript 6</h3><p>Forge, collection, admin, and battle interfaces.</p><RepoLink path="card-engine/src"/></Panel><Panel title="World runtime"><h3>Phaser 3</h3><p>Lazy-loaded castle scene, collision, depth, motion, and observation.</p><RepoLink path="card-engine/src/pages/castle"/></Panel><Panel title="Persistence"><h3>Supabase</h3><p>Cards, ledger, abilities, bosses, admin RBAC, and provider telemetry.</p><RepoLink path="card-engine/src/services/persistence"/></Panel><Panel title="Art engines"><h3>Leonardo · PixelLab</h3><p>Portraits and places; characters, bosses, animation, and props.</p><RepoLink path="HARNESS_INDEX.md"/></Panel></div></>; }

function ArchivePage() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Archive" intro="Retired systems and replaced concepts remain findable without masquerading as current work."/><Panel className="held-page"><Archive/><h2>History without clutter</h2><p>Legacy six-stat documents, replaced proposals, losing art candidates, and retired experiments stay preserved in their canonical archive locations.</p><RepoLink path="docs/archive"/></Panel></>; }
