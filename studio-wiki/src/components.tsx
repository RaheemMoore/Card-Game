import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, ExternalLink, ImageOff, Pause, Play, RotateCcw } from 'lucide-react';
import type { TruthStatus } from './content';

export function Status({ value }: { value: TruthStatus }) {
  return <span className={`status status-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>;
}

export function PageHeader({ eyebrow, title, intro, status }: { eyebrow: string; title: string; intro: string; status?: TruthStatus }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div>{status && <Status value={status}/>}</header>;
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading">{title && <h2>{title}</h2>}{action}</div>{children}</section>;
}

export function MissingMedia({ label }: { label: string }) {
  return <div className="missing-media"><ImageOff aria-hidden="true"/><strong>{label}</strong><span>No substitute artwork used</span></div>;
}

export function RepoLink({ path }: { path: string }) {
  return <span className="repo-link"><code>{path}</code><ExternalLink size={13} aria-hidden="true"/></span>;
}

interface Clip { id: string; file: string; frames: number; fps: number; loop: boolean; label: string }

export function SpritePlayer({ clip, speed }: { clip: Clip; speed: number }) {
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { setReduceMotion(query.matches); if (query.matches) setPlaying(false); };
    sync(); query.addEventListener('change', sync); return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    setFrame(0);
    if (!playing || reduceMotion || clip.frames < 2) return;
    const timer = window.setInterval(() => setFrame((value) => {
      if (value >= clip.frames - 1) return clip.loop ? 0 : value;
      return value + 1;
    }), 1000 / (clip.fps * speed));
    return () => window.clearInterval(timer);
  }, [clip, playing, reduceMotion, speed]);
  return <div className="sprite-stage">
    <div className="sprite-window" aria-label={`Debt-Bearer ${clip.label} animation, frame ${frame + 1} of ${clip.frames}`}>
      <img src={`/assets/combat/bosses/debt-bearer/sprite-${clip.file}.png`} alt="" style={{ width: `${clip.frames * 100}%`, transform: `translateX(-${(frame / clip.frames) * 100}%)` }}/>
    </div>
    <div className="player-controls">
      <button onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause animation' : 'Play animation'}>{playing ? <Pause/> : <Play/>}{playing ? 'Pause' : 'Play'}</button>
      <button onClick={() => setFrame(0)}><RotateCcw/>Reset</button>
      <span>{frame + 1} / {clip.frames}</span>
    </div>
  </div>;
}

export function RouteCard({ title, copy, path, icon }: { title: string; copy: string; path: string; icon: ReactNode }) {
  return <a className="route-card" href={path}><span className="route-icon">{icon}</span><span><strong>{title}</strong><small>{copy}</small></span><ChevronRight aria-hidden="true"/></a>;
}
