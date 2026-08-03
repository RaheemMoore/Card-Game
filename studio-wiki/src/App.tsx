import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Archive, BookOpen, Boxes, Castle, Check, ChevronDown, CircleHelp, Command, ExternalLink, FileText, FlaskConical, Hammer, Image, Menu, Search, Shield, Sparkles, Swords, Users, Workflow, X } from 'lucide-react';
import { productionMarkdown } from 'virtual:studio-content';
import { MissingMedia, PageHeader, Panel, RepoLink, RouteCard, SpritePlayer, Status } from './components';
import { archetypes, bossStates, elements, navigation, searchEntries } from './content';
import { MarkdownBody, sectionsFromMarkdown } from './markdown';
import { ElementPerformancePlayer } from './ElementPerformancePlayer';
import workshopArena from '../../docs/production/screenshots/workshop-arena.png';
import workshopBoss from '../../docs/production/screenshots/workshop-boss.png';
import workshopSprite from '../../docs/production/screenshots/workshop-sprite.png';
import studioWorkflow from '../../docs/CARD_ENGINE_STUDIO_V2_CURRENT_WORKFLOW.png';
import studioRoster from '../../docs/CARD_ENGINE_STUDIO_V2_CURRENT_AGENTS_SKILLS.png';

const icons = [Command, Users, Swords, Sparkles, Castle, CircleHelp, FileText, Workflow, Image, Hammer, BookOpen, Boxes, Archive];

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
        {navigation.map((group, groupIndex) => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(([itemPath, label], index) => { const Icon = icons[groupIndex * 6 + index]; return <a href={itemPath} className={path === itemPath ? 'active' : ''} key={itemPath} onClick={() => setMenu(false)}><Icon/><span>{label}</span></a>; })}</div>)}
      </nav>
      <div className="sidebar-foot"><span className="live-dot"/>Repository-backed<span>Local build</span></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="menu-button" onClick={() => setMenu(true)} aria-label="Open navigation"><Menu/></button><div className="search"><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the studio…" aria-label="Search the Studio Wiki" onKeyDown={(event) => { if (event.key === 'Enter' && matches[0]) { navigate(matches[0].path); setSearch(''); } }}/>{search && <div className="search-results">{matches.length ? matches.map((entry) => <button key={entry.path} onClick={() => { navigate(entry.path); setSearch(''); }}><strong>{entry.title}</strong><span>{entry.text}</span></button>) : <p>No matching section</p>}</div>}</div><span className="crumb">{searchEntries.find((entry) => entry.path === path)?.title ?? 'Studio Home'}</span></header>
      <main>{({
        '/': <Home/>, '/characters': <Characters/>, '/bosses': <Bosses/>, '/abilities': <Abilities/>,
        '/world': <World/>, '/minigames': <Minigames/>, '/production': <Production/>, '/studio': <StudioHandbook/>, '/assets': <Assets/>,
        '/workshops': <Workshops/>, '/decisions': <Decisions/>, '/technical': <Technical/>, '/archive': <ArchivePage/>,
      } as Record<string, ReactNode>)[path] ?? <Home/>}</main>
    </div>
  </div>;
}

export function App() { return <Shell/>; }

function Home() {
  return <><PageHeader eyebrow="CARD ENGINE · STUDIO CONTROL CENTER" title="Everything we know, somewhere worth exploring." intro="A visual, searchable home for the game’s characters, worlds, production truth, and the tools used to make them." status="IN FLIGHT"/>
    <div className="hero-grid"><Panel className="hero-panel"><div className="hero-art"><img src="/assets/castle/courtyard.png" alt="The Card Engine castle courtyard"/><div className="hero-overlay"><span>THE WORLD</span><h2>The castle is the hub. The Battle Tower is its first great door.</h2><a href="/minigames">Enter the Battle Tower guide →</a></div></div></Panel><Panel title="What needs attention"><div className="attention-list"><div><Status value="IN FLIGHT"/><strong>Studio Wiki foundation</strong><span>Repository-backed implementation</span></div><div><Status value="PLANNED"/><strong>Open the tower gate</strong><span>Castle courtyard → Battle Tower</span></div><div><Status value="IN FLIGHT"/><strong>Battle Tower</strong><span>Main mode · tower length undecided</span></div></div></Panel></div>
    <div className="section-title"><div><p className="eyebrow">EXPLORE THE STUDIO</p><h2>Choose a door</h2></div></div><div className="route-grid"><RouteCard icon={<Castle/>} title="Battle Tower" copy="The primary mode: build a party, read the boss, and climb" path="/minigames"/><RouteCard icon={<Users/>} title="Characters & Archetypes" copy="11 identities, emblems, cards, and rank continuity" path="/characters"/><RouteCard icon={<Swords/>} title="Bosses & Arenas" copy="The Tower’s production art, animation, and floor assets" path="/bosses"/><RouteCard icon={<Sparkles/>} title="Abilities & Elements" copy="Full-art crystals, ability roles, and system rules" path="/abilities"/></div>
    <Panel title="The game in one sentence" className="manifesto"><blockquote>Card Engine is an adventure game with characters you made yourself.</blockquote><p>The card is the format a character comes in. It is not the point.</p></Panel></>;
}

function Characters() {
  const [selected, setSelected] = useState(0); const item = archetypes[selected];
  return <><PageHeader eyebrow="VISUAL WIKI" title="Characters & Archetypes" intro="The eleven collectible identities. Emblems lead to the cards, heroes, and canon that belong to each archetype." status="SHIPPED"/><div className="character-layout"><Panel title="The eleven archetypes" className="emblem-panel"><div className="emblem-grid">{archetypes.map((entry, index) => <button className={selected === index ? 'emblem-card selected' : 'emblem-card'} key={entry[0]} onClick={() => setSelected(index)} aria-pressed={selected === index}><img src={`/assets/archetype-emblems/${entry[1]}`} alt={`${entry[0]} emblem`}/><span>{entry[0]}</span></button>)}</div></Panel><Panel className="archetype-detail"><img className="detail-emblem" src={`/assets/archetype-emblems/${item[1]}`} alt=""/><p className="eyebrow">SELECTED ARCHETYPE</p><h2>{item[0]}</h2><p>{item[3]}</p><dl><div><dt>Primary symbol</dt><dd>{item[2]}</dd></div><div><dt>Progression</dt><dd>Foundation → Forged → Ascendant</dd></div><div><dt>Identity rule</dt><dd>Rank growth preserves the person.</dd></div></dl><RepoLink path="card-engine/src/data/archetypeBible/"/></Panel></div><Panel title="Verified cards & heroes" action={<Status value="MISSING ASSET"/>}><div className="truth-row"><MissingMedia label={`${item[0]} card gallery`}/><div><h3>Emblem complete. Card curation pending.</h3><p>The Wiki will open from this emblem into verified cards and character art once their mappings are approved. Bosses are never used as substitutes.</p></div></div></Panel></>;
}

function Bosses() {
  const [selected, setSelected] = useState(0); const [speed, setSpeed] = useState(1); const clip = bossStates[selected];
  return <><PageHeader eyebrow="VISUAL WIKI" title="Bosses & Arenas" intro="Inspect the actual combat art, its animation states, implementation facts, and honest gaps." status="IN FLIGHT"/><div className="boss-layout"><Panel title="Boss roster"><div className="boss-roster"><button className="boss-tile selected"><img src="/assets/combat/bosses/debt-bearer/sprite-idle.png" alt="Debt-Bearer"/><span><strong>The Debt-Bearer</strong><small>PixelLab · 7 real clips</small></span></button><div className="boss-tile boss-tile-missing"><span className="boss-missing">ART<br/>PENDING</span><span><strong>The Still Season</strong><small>Clips are not committed on this branch</small></span></div></div><div className="arena-thumb"><img src="/assets/combat/arenas/barbarian-moot-ground/base.png" alt="Barbarian moot-ground arena"/><span>Approved arena · actual in-game plate</span></div></Panel><Panel title="Animation inspector" action={<label className="speed">Preview speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label>}><SpritePlayer clip={clip} speed={speed}/><div className="state-tabs" role="tablist" aria-label="Boss animation states">{bossStates.map((state, index) => <button role="tab" aria-selected={selected === index} onClick={() => setSelected(index)} key={state.id}>{state.label}<small>{state.frames}f · {state.fps}fps</small></button>)}</div></Panel></div><Panel title="Seven-state comparison"><div className="comparison-grid">{bossStates.map((state) => <button key={state.id} onClick={() => setSelected(bossStates.indexOf(state))}><span className="comparison-image"><img src={`/assets/combat/bosses/debt-bearer/sprite-${state.file}.png`} alt="" style={{width:`${state.frames * 100}%`}}/></span><strong>{state.label}</strong><small>{state.loop ? 'Loops' : 'One-shot'} · {state.frames} frames</small></button>)}</div></Panel></>;
}

function Abilities() {
  const [selected, setSelected] = useState(0);
  const element = elements[selected];
  return <><PageHeader eyebrow="VISUAL WIKI · ELEMENT CODEX" title="Abilities & Elements" intro="Every element has two lives: the crystal establishes its identity, and the combat performance shows how that material charges, travels, and lands." status="IN FLIGHT"/>
    <Panel title="Choose an element" action={<span className="element-count">29 canonical elements · 27 PixelLab combat kits</span>} className="element-browser">
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
    <Panel title="Ability artwork benchmarks" action={<a className="tower-related" href="/assets">Browse the full asset catalog →</a>}><div className="ability-benchmark-row"><div className="ability-cards"><article><img src="/assets/abilities/approved/ember-cleave/detail.jpg" alt="Ember Cleave ability art"/><strong>Ember Cleave</strong><small>Approved · Mana benchmark</small></article><article><img src="/assets/abilities/approved/aegis-ward/detail.jpg" alt="Aegis Ward ability art"/><strong>Aegis Ward</strong><small>Approved · Tech benchmark</small></article></div><div><p className="eyebrow">THREE DIFFERENT ART JOBS</p><h3>Crystal, performance, and ability art stay distinct.</h3><p className="fine-print">The crystal defines the element. PixelLab performance art shows what the material does in battle. Ability illustrations identify an individual named power. None of these overwrite gameplay values.</p><RepoLink path="card-engine/src/data/combat/performance/assetKits.ts"/></div></div></Panel>
  </>;
}

function World() { return <><PageHeader eyebrow="VISUAL WIKI" title="Game World" intro="The permanent world, its interactive layers, and the boundary between painted truth and runtime behavior." status="IN FLIGHT"/><Panel className="world-hero"><img src="/assets/castle/courtyard.png" alt="Card Engine castle courtyard"/><div className="world-caption"><span>COURTYARD · 1536 × 1152</span><strong>The post-login hub with four unopened doors.</strong></div></Panel><div className="four-col"><Panel title="Leonardo"><p>Ground, architecture, landmarks, and permanent environment plates.</p></Panel><Panel title="PixelLab"><p>Actors, reusable props, shopkeepers, and animated character sprites.</p></Panel><Panel title="Figma"><p>Projection, placement, anchors, colliders, occluders, and physical truth.</p></Panel><Panel title="Phaser"><p>Motion, reactions, audio, depth, atmosphere, camera, and scene state.</p></Panel></div><Panel title="Scene layers"><div className="fact-grid"><div><strong>Base plate</strong><span>Approved and integrated</span></div><div><strong>Occluders</strong><span>Fountain bands, stalls, props</span></div><div><strong>Colliders</strong><span>Feet-origin, traced geometry</span></div><div><strong>Stalls</strong><span>4 placeholders · deliberately unwired</span></div></div></Panel></>; }

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
        <a className="tower-related" href="/abilities">Explore Abilities & Elements →</a>
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

function Assets() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Art & Assets" intro="The web-sized catalog now; a clean bridge to OpenNest full-resolution storage later." status="IN FLIGHT"/><div className="asset-stats"><div><strong>11</strong><span>Integrated emblems</span></div><div><strong>29</strong><span>Element crystals</span></div><div><strong>7</strong><span>Debt-Bearer clips</span></div><div><strong>2</strong><span>Approved arenas</span></div></div><Panel title="Storage contract"><div className="storage-flow"><div><Image/><strong>Studio Wiki</strong><span>Metadata + web previews</span></div><ChevronDown/><div><Boxes/><strong>GitHub repository</strong><span>Canonical docs + optimized assets</span></div><ChevronDown/><div><Castle/><strong>OpenNest at home</strong><span>Full-resolution sources later</span></div></div></Panel><Panel title="Asset truth"><div className="fact-grid"><div><Status value="APPROVED"/><strong>Ready for canonical display</strong></div><div><Status value="IN FLIGHT"/><strong>Visible with status and provenance</strong></div><div><Status value="MISSING ASSET"/><strong>Honest placeholder; no substitution</strong></div><div><Status value="PARKED"/><strong>Preserved without implying commitment</strong></div></div></Panel></>; }

function Workshops() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Workshops" intro="The repeatable harnesses and review surfaces that let the studio see how something is being made." status="IN FLIGHT"/><div className="workshop-grid"><Workshop image={workshopSprite} title="Sprite Lab" copy="Generate, recover, pack, and validate PixelLab characters and bosses." path="card-engine/scripts/sprite-lab"/><Workshop image={workshopArena} title="Background Harness" copy="Prompt, compare, finish, and approve environment plates." path="card-engine/scripts/bg-harness"/><Workshop image={workshopBoss} title="Boss Readout" copy="Review animation states, frame geometry, and combat presentation." path="card-engine/scripts"/></div><Panel title="A harness is a window"><p className="large-copy">A generation run is not complete merely because files exist. The harness exposes the prompt, candidates, provenance, cost, validation, and human approval point so the next person can reproduce the work.</p><RepoLink path="HARNESS_INDEX.md"/></Panel></>; }
function Workshop({image,title,copy,path}:{image:string;title:string;copy:string;path:string}) { return <Panel className="workshop-card"><img src={image} alt="" onError={(event) => { event.currentTarget.style.display='none'; }}/><h2>{title}</h2><p>{copy}</p><RepoLink path={path}/></Panel>; }

function Decisions() { const decisions = sectionsFromMarkdown(productionMarkdown).find((section) => section.heading.includes('Decision log')); return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Decisions" intro="Why the studio works this way, kept beside the implementation instead of stranded in old conversations."/><div className="reading-layout single"><Panel className="article"><h2>Decision log</h2>{decisions ? <MarkdownBody lines={decisions.body}/> : <p>The decision log remains in PRODUCTION.md.</p>}<RepoLink path="PRODUCTION.md"/></Panel><aside className="facts"><div><span>Final product authority</span><strong>Raheem</strong></div><div><span>Creative canon</span><strong>Character Bible</strong></div><div><span>Current status</span><strong>PRODUCTION.md</strong></div></aside></div></>; }

function Technical() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Technical Systems" intro="The major engines and the contracts between them—enough context to navigate the repository without flattening it into a file list."/><div className="system-map"><Panel title="Web application"><h3>React 19 · Vite 8 · TypeScript 6</h3><p>Forge, collection, admin, and battle interfaces.</p><RepoLink path="card-engine/src"/></Panel><Panel title="World runtime"><h3>Phaser 3</h3><p>Lazy-loaded castle scene, collision, depth, motion, and observation.</p><RepoLink path="card-engine/src/pages/castle"/></Panel><Panel title="Persistence"><h3>Supabase</h3><p>Cards, ledger, abilities, bosses, admin RBAC, and provider telemetry.</p><RepoLink path="card-engine/src/services/persistence"/></Panel><Panel title="Art engines"><h3>Leonardo · PixelLab</h3><p>Portraits and places; characters, bosses, animation, and props.</p><RepoLink path="HARNESS_INDEX.md"/></Panel></div></>; }

function ArchivePage() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Archive" intro="Retired systems and replaced concepts remain findable without masquerading as current work."/><Panel className="held-page"><Archive/><h2>History without clutter</h2><p>Legacy six-stat documents, replaced proposals, losing art candidates, and retired experiments stay preserved in their canonical archive locations.</p><RepoLink path="docs/archive"/></Panel></>; }
