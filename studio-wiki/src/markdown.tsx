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

export function MarkdownBody({ lines, limit = 18 }: { lines: string[]; limit?: number }) {
  const visible = lines.filter((line) => !line.startsWith('```')).slice(0, limit);
  const rendered: ReactNode[] = [];
  let index = 0;

  while (index < visible.length) {
    const line = visible[index];
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (index < visible.length && visible[index].startsWith('|')) tableLines.push(visible[index++]);
      const rows = tableLines.map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim()));
      const contentRows = rows.filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)));
      const [header, ...body] = contentRows;
      if (header) rendered.push(
        <div className="markdown-table-wrap" key={`table-${index}`}>
          <table>
            <thead><tr>{header.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr></thead>
            <tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{inline(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^[-*]\s/.test(line)) rendered.push(<div className="markdown-list" key={index}>• {inline(line.replace(/^[-*]\s/, ''))}</div>);
    else if (/^\d+\.\s/.test(line)) rendered.push(<div className="markdown-list" key={index}>{inline(line)}</div>);
    else if (line.startsWith('>')) rendered.push(<blockquote key={index}>{inline(line.slice(1).trim())}</blockquote>);
    else rendered.push(<p key={index}>{inline(line)}</p>);
    index += 1;
  }

  return <div className="markdown-body">{rendered}</div>;
}
