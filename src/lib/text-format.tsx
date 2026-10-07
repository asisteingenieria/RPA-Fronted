import type { ReactNode } from 'react';

/**
 * Formato de texto del panel. Construye nodos de React (nunca HTML crudo): sin riesgo de XSS.
 *  - renderWhatsApp: *negrita* (UN asterisco), _cursiva_, ~tachado~; saltos con white-space: pre-wrap.
 *  - Markdown: subconjunto para la vista previa del guion (títulos, listas, citas, **negrita**,
 *    `código` y marcadores {{OFERTA:CODIGO}}).
 */
export function renderWhatsApp(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g)) {
    const i = m.index ?? 0;
    const t = m[0];
    if (i > last) out.push(text.slice(last, i));
    const inner = t.slice(1, -1);
    out.push(t[0] === '*' ? <b key={k++}>{inner}</b> : t[0] === '_' ? <i key={k++}>{inner}</i> : <s key={k++}>{inner}</s>);
    last = i + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\{\{[A-Z]+(?::[A-Z0-9_]+)?\}\})|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const k = `${key}-${i++}`;
    const t = m[0];
    if (m[1]) out.push(<code key={k} className="marker">{t}</code>);
    else if (m[2]) out.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (m[3]) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else out.push(<strong key={k}>{t.slice(1, -1)}</strong>);
    last = idx + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

interface ListItem {
  depth: number;
  ordered: boolean;
  text: string;
}

function renderList(items: ListItem[], key: string): ReactNode {
  const base = items[0]!.depth;
  const children: ReactNode[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i]!;
    const nested: ListItem[] = [];
    let j = i + 1;
    while (j < items.length && items[j]!.depth > base) nested.push(items[j++]!);
    children.push(
      <li key={`${key}-${i}`}>
        {inline(item.text, `${key}-${i}`)}
        {nested.length > 0 && renderList(nested, `${key}-${i}n`)}
      </li>,
    );
    i = j;
  }
  return items[0]!.ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>;
}

/** Vista previa del guion (clase .ai-md en kit.css). */
export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: ListItem[] = [];

  const flush = () => {
    if (para.length) {
      const k = `p${blocks.length}`;
      blocks.push(<p key={k}>{inline(para.join(' '), k)}</p>);
      para = [];
    }
    if (list.length) {
      blocks.push(renderList(list, `l${blocks.length}`));
      list = [];
    }
  };

  for (const raw of lines) {
    const heading = /^(#{1,4})\s+(.*)$/.exec(raw);
    const item = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(raw);
    const quote = /^>\s?(.*)$/.exec(raw);
    if (!raw.trim()) {
      flush();
    } else if (heading) {
      flush();
      const level = heading[1]!.length;
      const k = `h${blocks.length}`;
      const content = inline(heading[2]!, k);
      blocks.push(level === 1 ? <h3 key={k}>{content}</h3> : level === 2 ? <h4 key={k}>{content}</h4> : <h5 key={k}>{content}</h5>);
    } else if (item) {
      if (para.length) flush();
      list.push({ depth: item[1]!.replace(/\t/g, '  ').length, ordered: /\d/.test(item[2]!), text: item[3]! });
    } else if (quote) {
      flush();
      const k = `q${blocks.length}`;
      blocks.push(<blockquote key={k}>{inline(quote[1]!, k)}</blockquote>);
    } else if (list.length && /^\s+/.test(raw)) {
      list[list.length - 1]!.text += ` ${raw.trim()}`;
    } else {
      if (list.length) flush();
      para.push(raw.trim());
    }
  }
  flush();
  return <div className="ai-md">{blocks}</div>;
}
