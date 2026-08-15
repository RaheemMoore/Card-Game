import { useMemo, useState } from 'react';
import { BookOpen, Check, Clipboard, CornerDownRight, GitBranch, Map as MapIcon, Search } from 'lucide-react';
import { PageHeader, Panel } from './components';
import { codeAtlasFeatures, type AtlasDestination, type AtlasStatus } from './codeAtlas';

const featureNumbers = new Map(codeAtlasFeatures.map((feature, index) => [feature.id, String(index + 1).padStart(2, '0')]));

function AtlasStatusBadge({ value }: { value?: AtlasStatus }) {
  if (!value) return null;
  return <span className={`atlas-status atlas-status-${value.toLowerCase().replaceAll(' ', '-').replaceAll('_', '-')}`}>{value}</span>;
}

function PathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(path);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return <button className="atlas-path" onClick={copy} title="Copy this repository path">
    <code>{path}</code>
    <span>{copied ? <Check aria-hidden="true"/> : <Clipboard aria-hidden="true"/>}{copied ? 'Copied' : 'Copy'}</span>
  </button>;
}

function Destination({ destination, primary = false }: { destination: AtlasDestination; primary?: boolean }) {
  return <article className={primary ? 'atlas-destination atlas-destination-primary' : 'atlas-destination'}>
    <div className="atlas-destination-copy">
      <div><strong>{destination.goal}</strong><AtlasStatusBadge value={destination.status}/></div>
      <p>{destination.purpose}</p>
    </div>
    <PathButton path={destination.path}/>
  </article>;
}

export function CodeAtlas() {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return codeAtlasFeatures;
    return codeAtlasFeatures.filter((feature) => [
      feature.title,
      feature.summary,
      feature.route,
      ...feature.keywords,
      feature.startHere.goal,
      feature.startHere.path,
      ...feature.destinations.flatMap((destination) => [destination.goal, destination.path, destination.purpose]),
    ].join(' ').toLowerCase().includes(needle));
  }, [query]);

  return <div className="code-atlas">
    <PageHeader
      eyebrow="PRODUCTION LIBRARY · LIVING CODE MAP"
      title="Code Atlas"
      intro="Tell the Atlas what you want to change. It points you to the first useful file, explains the nearby files, and warns you when an area is shared, old, or under review."
    />

    <section className="atlas-intro" aria-label="How to use the Code Atlas">
      <div className="atlas-intro-title"><MapIcon aria-hidden="true"/><div><p className="eyebrow">START HERE</p><h2>You do not need to memorize the repository.</h2></div></div>
      <ol>
        <li><span>1</span><div><strong>Choose what you want to change.</strong><small>Search for a player-visible idea such as “damage,” “castle,” or “card.”</small></div></li>
        <li><span>2</span><div><strong>Open the “Start here” file.</strong><small>In VS Code, expand <b>2 — GAME</b>, then follow the copied path from <b>card-engine</b>.</small></div></li>
        <li><span>3</span><div><strong>Follow only the layer you need.</strong><small>Pages assemble screens. Components draw pieces. Services contain rules. Data supplies content.</small></div></li>
      </ol>
    </section>

    <Panel className="atlas-map-panel" title="Where do I go?" action={<span className="atlas-count">{matches.length} of {codeAtlasFeatures.length} areas</span>}>
      <label className="atlas-search"><Search aria-hidden="true"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: combat feel, castle stalls, card detail…" aria-label="Search the Code Atlas"/></label>
      <div className="atlas-jump-grid">
        {matches.map((feature) => <a href={`#atlas-${feature.id}`} key={feature.id}>
          <span>{featureNumbers.get(feature.id)}</span>
          <div><strong>{feature.title}</strong><small>{feature.summary}</small></div>
          <CornerDownRight aria-hidden="true"/>
        </a>)}
      </div>
      {!matches.length && <div className="atlas-empty"><Search aria-hidden="true"/><strong>No Atlas area matches “{query}” yet.</strong><span>Try a broader word, or ask Codex/Claude to add the missing destination.</span></div>}
    </Panel>

    <div className="atlas-layer-strip" aria-label="How code layers connect">
      <span><b>Page</b> assembles the screen</span><i>→</i><span><b>Component</b> draws a piece</span><i>→</i><span><b>Service</b> applies rules</span><i>→</i><span><b>Data / Assets</b> supply content</span><i>→</i><span><b>Tests</b> protect behavior</span>
    </div>

    <div className="atlas-feature-list">
      {matches.map((feature) => <section className="atlas-feature" id={`atlas-${feature.id}`} key={feature.id}>
        <header>
          <span className="atlas-feature-number">{featureNumbers.get(feature.id)}</span>
          <div><p className="eyebrow">PLAYER ROUTE · {feature.route}</p><h2>{feature.title}</h2><p>{feature.summary}</p></div>
          <span className="atlas-route-link">Game route: <code>{feature.route}</code></span>
        </header>
        <div className="atlas-start-label"><BookOpen aria-hidden="true"/><span><strong>Start here</strong> — read this file before changing the area</span></div>
        <Destination destination={feature.startHere} primary/>
        {!!feature.destinations.length && <details className="atlas-more" open={feature.id === 'battle'}>
          <summary>{feature.destinations.length} more useful destination{feature.destinations.length === 1 ? '' : 's'}</summary>
          <div>{feature.destinations.map((destination) => <Destination destination={destination} key={`${destination.goal}-${destination.path}`}/>)}</div>
        </details>}
        {feature.caution && <p className="atlas-caution"><GitBranch aria-hidden="true"/><span><strong>Before you edit:</strong> {feature.caution}</span></p>}
      </section>)}
    </div>

    <section className="atlas-maintenance">
      <div><p className="eyebrow">KEEP THIS MAP HONEST</p><h2>This page changes with the game.</h2><p>When a feature moves, is replaced, or gains a better entry point, update the Atlas in the same branch. Its file-path test catches destinations that no longer exist.</p></div>
      <PathButton path="studio-wiki/src/codeAtlas.ts"/>
    </section>
  </div>;
}
