import type { ReactNode } from 'react';

export interface MarkdownSection { heading: string; level: number; body: string[] }

export function sectionsFromMarkdown(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection = { heading: 'Overview', level: 1, body: [] };
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (match) {
      if (current.body.some(Boolean)) sections.push(current);
      current = { heading: match[2].replace(/<[^>]+>/g, ''), level: match[1].length, body: [] };
    } else if (line.trim() && !line.startsWith('<!--')) current.body.push(line);
  }
  if (current.body.some(Boolean)) sections.push(current);
  return sections;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]}>{link[1]}</a>;
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function MarkdownBody({ lines }: { lines: string[] }) {
  const visible = lines.filter((line) => !line.startsWith('|') && !/^[-:| ]+$/.test(line));
  return <div className="markdown-body">{visible.slice(0, 18).map((line, index) => {
    if (/^[-*]\s/.test(line)) return <div className="markdown-list" key={index}>• {inline(line.replace(/^[-*]\s/, ''))}</div>;
    if (/^\d+\.\s/.test(line)) return <div className="markdown-list" key={index}>{inline(line)}</div>;
    if (line.startsWith('>')) return <blockquote key={index}>{inline(line.slice(1).trim())}</blockquote>;
    if (line.startsWith('```')) return null;
    return <p key={index}>{inline(line)}</p>;
  })}</div>;
}
