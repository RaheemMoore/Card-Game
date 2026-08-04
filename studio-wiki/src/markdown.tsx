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
    } else if (line.startsWith('<!--')) continue;
    // Blank lines are kept, not dropped: they are the only record of where one
    // paragraph ends and the next begins, and MarkdownBody needs that to rejoin
    // hard-wrapped prose without welding separate paragraphs together. Leading
    // blanks are skipped so a section never opens with an empty line.
    else if (line.trim() || current.body.length > 0) current.body.push(line.trim() ? line : '');
  }
  if (current.body.some(Boolean)) sections.push(current);
  return sections;
}

function inline(text: string): ReactNode[] {
  // `**bold**` must come before `*italic*` in this alternation, or the italic
  // branch claims the first two asterisks of every bold run. PRODUCTION.md leans
  // on single-asterisk emphasis for its asides (*Where:*, *Why it matters:*), and
  // without this branch they rendered as literal asterisks on the page.
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]}>{link[1]}</a>;
    // Each test must confirm the delimiter is CLOSED. `split` also yields the
    // unmatched text between delimiters, and a bare opening `*` at the start of a
    // line would otherwise take this branch and get its first and last characters
    // sliced off — silently eating a real letter off the end of the sentence.
    const wrapped = (fence: string) => part.startsWith(fence) && part.endsWith(fence) && part.length > fence.length * 2;
    // Emphasis recurses; code does not. PRODUCTION.md writes whole asides in
    // italics — "*Five minutes. Safe. See [§4 stranded branches](#…).*" — and the
    // outer emphasis consumes the line, so without recursion the link inside it
    // renders as raw brackets. Backtick content is literal by definition.
    if (wrapped('**')) return <strong key={index}>{inline(part.slice(2, -2))}</strong>;
    if (wrapped('*')) return <em key={index}>{inline(part.slice(1, -1))}</em>;
    if (wrapped('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function MarkdownBody({ lines, limit = 18 }: { lines: string[]; limit?: number }) {
  // Trailing blank lines carry no meaning once paragraphs are rebuilt, and the
  // limit counts content lines rather than spending budget on whitespace.
  const content = lines.filter((line) => !line.startsWith('```'));
  let budget = limit;
  const visible = content.filter((line) => (line.trim() ? budget-- > 0 : budget > 0));
  const rendered: ReactNode[] = [];
  let index = 0;

  while (index < visible.length) {
    const line = visible[index];
    if (!line.trim()) { index += 1; continue; }
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
    else {
      // Join hard-wrapped lines into one paragraph. PRODUCTION.md wraps prose at
      // ~90 columns, and rendering each source line as its own <p> both looked
      // oddly double-spaced and broke any emphasis that spanned a line break.
      const paragraph: string[] = [];
      while (index < visible.length) {
        const next = visible[index];
        if (!next.trim()) break;
        if (/^[-*]\s/.test(next) || /^\d+\.\s/.test(next) || next.startsWith('>') || next.startsWith('|') || next.startsWith('#')) break;
        paragraph.push(next);
        index += 1;
      }
      rendered.push(<p key={index}>{inline(paragraph.join(' '))}</p>);
      continue;
    }
    index += 1;
  }

  return <div className="markdown-body">{rendered}</div>;
}
