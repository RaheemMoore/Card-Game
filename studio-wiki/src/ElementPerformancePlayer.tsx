import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AlertTriangle, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import type { ElementPerformance } from './content';
import { Status } from './components';

type Phase = 'charge' | 'delivery' | 'impact';

const phases: readonly Phase[] = ['charge', 'delivery', 'impact'];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function framePath(element: ElementPerformance, kind: 'stream' | 'impact', frame: number) {
  if (element.delivery === 'growth') {
    const file = kind === 'stream' ? 'wrap' : 'bloom';
    return `/assets/combat/effects/growth/nature/${file}-f${frame}.png`;
  }
  const animated = kind === 'stream' ? element.streamAnimated : element.impactAnimated;
  const suffix = animated ? `-f${frame}` : '';
  return `/assets/combat/effects/lash/${element.slug}/${kind}${suffix}.png`;
}

function PhaseArt({ element, phase, frame, onError, compact = false }: {
  element: ElementPerformance;
  phase: Phase;
  frame: number;
  onError: () => void;
  compact?: boolean;
}) {
  if (element.artStatus === 'missing') {
    return <div className="performance-missing"><AlertTriangle/><strong>Not authored</strong><span>Time is unreachable by the current archetypes.</span></div>;
  }

  if (phase === 'charge') {
    return <div className={`charge-art charge-${element.charge}`} aria-label={`${element.name} ${element.charge} charge`}><i/><i/><i/><span/></div>;
  }

  if (element.artStatus === 'procedural') {
    return <div className="procedural-ward" aria-label="Procedural Holy barrier"><span/><i/><Sparkles/></div>;
  }

  if (phase === 'delivery') {
    const src = framePath(element, 'stream', element.streamAnimated ? frame : 0);
    if (element.delivery === 'volley' || element.delivery === 'lunge') {
      return <div className={`performance-volley delivery-${element.delivery}`}>{Array.from({ length: element.delivery === 'volley' ? 5 : 4 }, (_, index) => <img key={index} src={src} alt="" onError={onError} style={{ left: `${10 + index * 17}%`, top: `${18 + (index % 2) * 18}px`, animationDelay: `${index * 70}ms` } as CSSProperties}/>)}</div>;
    }
    if (element.delivery === 'growth') {
      return <img className="performance-growth" src={src} alt={`${element.name} roots wrapping the target`} onError={onError}/>;
    }
    return <div className={`performance-stream stream-${element.delivery} ${compact ? 'compact' : ''}`} style={{ backgroundImage: `url(${src})` }} aria-label={`${element.name} ${element.delivery} delivery`}/>;
  }

  return <img className="performance-impact" src={framePath(element, 'impact', element.impactAnimated ? frame : 0)} alt={`${element.name} ${element.impact} impact`} onError={onError}/>;
}

export function ElementPerformancePlayer({ element }: { element: ElementPerformance }) {
  const prefersReducedMotion = useReducedMotion();
  const [still, setStill] = useState(prefersReducedMotion);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const phase = phases[phaseIndex];
  const deliveryLabel = element.delivery === 'growth' ? 'Manifest' : element.delivery === 'barrier' ? 'Ward' : 'Delivery';
  const labels = useMemo(() => ['Charge', deliveryLabel, 'Impact'], [deliveryLabel]);

  useEffect(() => {
    setStill(prefersReducedMotion);
  }, [prefersReducedMotion]);

  useEffect(() => {
    setPlaying(false);
    setPhaseIndex(0);
    setFrame(0);
    setMediaError(false);
  }, [element.slug]);

  useEffect(() => {
    if (!playing || still) return;
    const duration = phase === 'delivery' ? 1900 : 1350;
    const timer = window.setTimeout(() => {
      if (phaseIndex === phases.length - 1) {
        setPlaying(false);
      } else {
        setPhaseIndex((current) => current + 1);
        setFrame(0);
      }
    }, duration);
    return () => window.clearTimeout(timer);
  }, [phase, phaseIndex, playing, still]);

  useEffect(() => {
    if (!playing || still || phase === 'charge') return;
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % 9), 95);
    return () => window.clearInterval(timer);
  }, [phase, playing, still]);

  const restart = () => {
    setPhaseIndex(0);
    setFrame(0);
    setPlaying(!still && element.artStatus !== 'missing');
  };

  return <section className="performance-codex" style={{ '--element-dark': element.palette[0], '--element-mid': element.palette[1], '--element-light': element.palette[2] } as CSSProperties}>
    <header className="performance-codex-head">
      <div><p className="eyebrow">BATTLE EXPRESSION</p><h2>How {element.name} enters the fight</h2></div>
      <div className="performance-status"><Status value={element.artStatus === 'missing' ? 'MISSING ASSET' : 'IN FLIGHT'}/><span>{element.artStatus === 'candidate' ? 'candidate art · c39304f' : element.artStatus === 'procedural' ? 'procedural renderer' : 'not reachable'}</span></div>
    </header>

    {mediaError ? <div className="performance-error"><AlertTriangle/><strong>Performance preview could not load.</strong><button onClick={() => setMediaError(false)}>Retry</button></div> : still ? <div className="performance-tableau" aria-label={`${element.name} performance still sequence`}>
      {phases.map((item, index) => <article key={item}><span>{labels[index]}</span><div className="tableau-art"><PhaseArt element={element} phase={item} frame={0} compact onError={() => setMediaError(true)}/></div></article>)}
    </div> : <div className={`performance-stage phase-${phase}`} role="img" aria-label={`${element.name} performance: ${labels[phaseIndex]}`}>
      <div className="performance-caster"><span>{element.crystal ? <img src={element.crystal} alt=""/> : <Sparkles/>}</span><small>CASTER</small></div>
      <div className="performance-flight"><PhaseArt element={element} phase={phase} frame={frame} onError={() => setMediaError(true)}/></div>
      <div className="performance-target"><i/><span>TARGET</span></div>
    </div>}

    <div className="performance-controls">
      <div className="performance-tabs" role="tablist" aria-label="Performance stages">
        {phases.map((item, index) => <button key={item} role="tab" aria-selected={phaseIndex === index} onClick={() => { setPhaseIndex(index); setPlaying(false); setFrame(0); }}>{index + 1}<span>{labels[index]}</span></button>)}
      </div>
      <div className="performance-actions">
        {!still && <button onClick={() => playing ? setPlaying(false) : restart()} disabled={element.artStatus === 'missing'}>{playing ? <Pause/> : phaseIndex === 2 ? <RotateCcw/> : <Play/>}{playing ? 'Pause' : phaseIndex === 2 ? 'Replay' : 'Play sequence'}</button>}
        <button aria-pressed={still} onClick={() => { setStill((current) => !current); setPlaying(false); }}>{still ? 'Enable motion' : 'Still view'}</button>
      </div>
    </div>
    <p className="performance-live" aria-live="polite">{element.name}: {labels[phaseIndex]} · {phase === 'charge' ? element.charge : phase === 'delivery' ? element.delivery : element.impact}</p>
  </section>;
}
