import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Archive, BookOpen, Boxes, Castle, ChevronDown, CircleHelp, Command, FileText, FlaskConical, Hammer, Image, Menu, Search, Shield, Sparkles, Swords, Users, X } from 'lucide-react';
import { productionMarkdown } from 'virtual:studio-content';
import { MissingMedia, PageHeader, Panel, RepoLink, RouteCard, SpritePlayer, Status } from './components';
import { archetypes, bossStates, elements, navigation, searchEntries } from './content';
import { MarkdownBody, sectionsFromMarkdown } from './markdown';
import workshopArena from '../../docs/production/screenshots/workshop-arena.png';
import workshopBoss from '../../docs/production/screenshots/workshop-boss.png';
import workshopSprite from '../../docs/production/screenshots/workshop-sprite.png';

const icons = [Command, Users, Swords, Sparkles, Castle, CircleHelp, FileText, Image, Hammer, BookOpen, Boxes, Archive];

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
        '/world': <World/>, '/minigames': <Minigames/>, '/production': <Production/>, '/assets': <Assets/>,
        '/workshops': <Workshops/>, '/decisions': <Decisions/>, '/technical': <Technical/>, '/archive': <ArchivePage/>,
      } as Record<string, ReactNode>)[path] ?? <Home/>}</main>
    </div>
  </div>;
}

export function App() { return <Shell/>; }

function Home() {
  return <><PageHeader eyebrow="CARD ENGINE · STUDIO CONTROL CENTER" title="Everything we know, somewhere worth exploring." intro="A visual, searchable home for the game’s characters, worlds, production truth, and the tools used to make them." status="IN FLIGHT"/>
    <div className="hero-grid"><Panel className="hero-panel"><div className="hero-art"><img src="/assets/castle/courtyard.png" alt="The Card Engine castle courtyard"/><div className="hero-overlay"><span>THE WORLD</span><h2>The castle is the hub. Every mode is a door.</h2><a href="/world">Explore the game world →</a></div></div></Panel><Panel title="What needs attention"><div className="attention-list"><div><Status value="IN FLIGHT"/><strong>Studio Wiki foundation</strong><span>Repository-backed implementation</span></div><div><Status value="PLANNED"/><strong>Open the first castle stall</strong><span>Tower gate → boss battle</span></div><div><Status value="PARKED"/><strong>Minigames</strong><span>No confirmed active minigame</span></div></div></Panel></div>
    <div className="section-title"><div><p className="eyebrow">EXPLORE THE STUDIO</p><h2>Choose a door</h2></div></div><div className="route-grid"><RouteCard icon={<Users/>} title="Characters & Archetypes" copy="11 identities, emblems, cards, and rank continuity" path="/characters"/><RouteCard icon={<Swords/>} title="Bosses & Arenas" copy="Combat champions, seven-state animation, and arena truth" path="/bosses"/><RouteCard icon={<Sparkles/>} title="Abilities & Elements" copy="Full-art crystals, ability roles, and system rules" path="/abilities"/><RouteCard icon={<Hammer/>} title="Workshops" copy="The harnesses that turn ideas into reproducible work" path="/workshops"/></div>
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
  const [element, setElement] = useState<(typeof elements)[number]>('fire');
  return <><PageHeader eyebrow="VISUAL WIKI" title="Abilities & Elements" intro="Element crystals are hero artwork: complete silhouettes, full glow fields, and no destructive cropping." status="SHIPPED"/><div className="ability-layout"><Panel className="crystal-hero"><img src={`/assets/elements/${element}.jpg`} alt={`${element} element crystal`}/><div><p className="eyebrow">SELECTED ELEMENT</p><h2>{element[0].toUpperCase()+element.slice(1)}</h2><p>Full-resolution inspection · FIT presentation</p></div></Panel><Panel title="Ability benchmarks"><div className="ability-cards"><article><img src="/assets/abilities/approved/ember-cleave/detail.jpg" alt="Ember Cleave ability art"/><strong>Ember Cleave</strong><small>Approved · Mana benchmark</small></article><article><img src="/assets/abilities/approved/aegis-ward/detail.jpg" alt="Aegis Ward ability art"/><strong>Aegis Ward</strong><small>Approved · Tech benchmark</small></article></div><p className="fine-print">Artwork never overwrites gameplay values. Combat, detail, and relic roles remain separate.</p></Panel></div><Panel title="Element library"><div className="crystal-grid">{elements.map((name) => <button className={element === name ? 'selected' : ''} onClick={() => setElement(name)} key={name}><img src={`/assets/elements/${name}.jpg`} alt=""/><span>{name}</span></button>)}</div></Panel></>;
}

function World() { return <><PageHeader eyebrow="VISUAL WIKI" title="Game World" intro="The permanent world, its interactive layers, and the boundary between painted truth and runtime behavior." status="IN FLIGHT"/><Panel className="world-hero"><img src="/assets/castle/courtyard.png" alt="Card Engine castle courtyard"/><div className="world-caption"><span>COURTYARD · 1536 × 1152</span><strong>The post-login hub with four unopened doors.</strong></div></Panel><div className="four-col"><Panel title="Leonardo"><p>Ground, architecture, landmarks, and permanent environment plates.</p></Panel><Panel title="PixelLab"><p>Actors, reusable props, shopkeepers, and animated character sprites.</p></Panel><Panel title="Figma"><p>Projection, placement, anchors, colliders, occluders, and physical truth.</p></Panel><Panel title="Phaser"><p>Motion, reactions, audio, depth, atmosphere, camera, and scene state.</p></Panel></div><Panel title="Scene layers"><div className="fact-grid"><div><strong>Base plate</strong><span>Approved and integrated</span></div><div><strong>Occluders</strong><span>Fountain bands, stalls, props</span></div><div><strong>Colliders</strong><span>Feet-origin, traced geometry</span></div><div><strong>Stalls</strong><span>4 placeholders · deliberately unwired</span></div></div></Panel></>; }

function Minigames() { return <><PageHeader eyebrow="VISUAL WIKI" title="Minigames" intro="This room is intentionally quiet until the game has a confirmed minigame worth documenting." status="PARKED"/><Panel className="held-page"><FlaskConical/><h2>No active minigame</h2><p>Forge Strike is excluded. Nothing has been invented to fill the space. When a minigame is approved and built, this page will document its loop, assets, harness, status, and decisions.</p></Panel></>; }

function Production() {
  const sections = useMemo(() => sectionsFromMarkdown(productionMarkdown), []); const [selected, setSelected] = useState(Math.max(0, sections.findIndex((section) => section.heading.includes('What I')))); const section = sections[selected];
  return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Current Build" intro="A readable window into PRODUCTION.md. The Markdown file stays canonical; this page adapts it at build time." status="IN FLIGHT"/><div className="reading-layout"><aside className="toc"><p>IN THIS SOURCE</p>{sections.filter((item) => item.level <= 2).slice(0, 18).map((item) => { const index = sections.indexOf(item); return <button className={index === selected ? 'active' : ''} key={`${item.heading}-${index}`} onClick={() => setSelected(index)}>{item.heading}</button>; })}</aside><Panel className="article"><p className="eyebrow">PRODUCTION.MD · BUILD-TIME SOURCE</p><h2>{section?.heading}</h2>{section && <MarkdownBody lines={section.body}/>}<RepoLink path="PRODUCTION.md"/></Panel><aside className="facts"><div><span>Source of truth</span><strong>PRODUCTION.md</strong></div><div><span>Operational metrics</span><strong>Admin dashboard</strong></div><div><span>Update path</span><strong>production-log skill</strong></div></aside></div></>;
}

function Assets() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Art & Assets" intro="The web-sized catalog now; a clean bridge to OpenNest full-resolution storage later." status="IN FLIGHT"/><div className="asset-stats"><div><strong>11</strong><span>Integrated emblems</span></div><div><strong>29</strong><span>Element crystals</span></div><div><strong>7</strong><span>Debt-Bearer clips</span></div><div><strong>2</strong><span>Approved arenas</span></div></div><Panel title="Storage contract"><div className="storage-flow"><div><Image/><strong>Studio Wiki</strong><span>Metadata + web previews</span></div><ChevronDown/><div><Boxes/><strong>GitHub repository</strong><span>Canonical docs + optimized assets</span></div><ChevronDown/><div><Castle/><strong>OpenNest at home</strong><span>Full-resolution sources later</span></div></div></Panel><Panel title="Asset truth"><div className="fact-grid"><div><Status value="APPROVED"/><strong>Ready for canonical display</strong></div><div><Status value="IN FLIGHT"/><strong>Visible with status and provenance</strong></div><div><Status value="MISSING ASSET"/><strong>Honest placeholder; no substitution</strong></div><div><Status value="PARKED"/><strong>Preserved without implying commitment</strong></div></div></Panel></>; }

function Workshops() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Workshops" intro="The repeatable harnesses and review surfaces that let the studio see how something is being made." status="IN FLIGHT"/><div className="workshop-grid"><Workshop image={workshopSprite} title="Sprite Lab" copy="Generate, recover, pack, and validate PixelLab characters and bosses." path="card-engine/scripts/sprite-lab"/><Workshop image={workshopArena} title="Background Harness" copy="Prompt, compare, finish, and approve environment plates." path="card-engine/scripts/bg-harness"/><Workshop image={workshopBoss} title="Boss Readout" copy="Review animation states, frame geometry, and combat presentation." path="card-engine/scripts"/></div><Panel title="A harness is a window"><p className="large-copy">A generation run is not complete merely because files exist. The harness exposes the prompt, candidates, provenance, cost, validation, and human approval point so the next person can reproduce the work.</p><RepoLink path="HARNESS_INDEX.md"/></Panel></>; }
function Workshop({image,title,copy,path}:{image:string;title:string;copy:string;path:string}) { return <Panel className="workshop-card"><img src={image} alt="" onError={(event) => { event.currentTarget.style.display='none'; }}/><h2>{title}</h2><p>{copy}</p><RepoLink path={path}/></Panel>; }

function Decisions() { const decisions = sectionsFromMarkdown(productionMarkdown).find((section) => section.heading.includes('Decision log')); return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Decisions" intro="Why the studio works this way, kept beside the implementation instead of stranded in old conversations."/><div className="reading-layout single"><Panel className="article"><h2>Decision log</h2>{decisions ? <MarkdownBody lines={decisions.body}/> : <p>The decision log remains in PRODUCTION.md.</p>}<RepoLink path="PRODUCTION.md"/></Panel><aside className="facts"><div><span>Final product authority</span><strong>Raheem</strong></div><div><span>Creative canon</span><strong>Character Bible</strong></div><div><span>Current status</span><strong>PRODUCTION.md</strong></div></aside></div></>; }

function Technical() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Technical Systems" intro="The major engines and the contracts between them—enough context to navigate the repository without flattening it into a file list."/><div className="system-map"><Panel title="Web application"><h3>React 19 · Vite 8 · TypeScript 6</h3><p>Forge, collection, admin, and battle interfaces.</p><RepoLink path="card-engine/src"/></Panel><Panel title="World runtime"><h3>Phaser 3</h3><p>Lazy-loaded castle scene, collision, depth, motion, and observation.</p><RepoLink path="card-engine/src/pages/castle"/></Panel><Panel title="Persistence"><h3>Supabase</h3><p>Cards, ledger, abilities, bosses, admin RBAC, and provider telemetry.</p><RepoLink path="card-engine/src/services/persistence"/></Panel><Panel title="Art engines"><h3>Leonardo · PixelLab</h3><p>Portraits and places; characters, bosses, animation, and props.</p><RepoLink path="HARNESS_INDEX.md"/></Panel></div></>; }

function ArchivePage() { return <><PageHeader eyebrow="PRODUCTION LIBRARY" title="Archive" intro="Retired systems and replaced concepts remain findable without masquerading as current work."/><Panel className="held-page"><Archive/><h2>History without clutter</h2><p>Legacy six-stat documents, replaced proposals, losing art candidates, and retired experiments stay preserved in their canonical archive locations.</p><RepoLink path="docs/archive"/></Panel></>; }
