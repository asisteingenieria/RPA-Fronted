import { Fragment, type ReactNode } from "react";

/**
 * Formato de WhatsApp → nodos React.
 * Soporta *negrita* (UN asterisco), _cursiva_, ~tachado~, saltos de línea (el contenedor usa
 * white-space: pre-wrap), viñetas "•" y emojis (texto plano).
 * Las variables [Nombre] / {{PLANES}} se reemplazan con `vars`; si no hay valor se pintan como chip.
 */
const TOKEN_RE = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\[[A-Za-zÁÉÍÓÚáéíóúñÑ ]+\]|\{\{[A-Z_]+\}\})/g;
export const VARIABLE_RE = /\[[A-Za-zÁÉÍÓÚáéíóúñÑ ]+\]|\{\{[A-Z_]+\}\}/g;

export function renderWhatsApp(
  text: string,
  opts: { vars?: Record<string, string>; renderVar?: (name: string) => ReactNode } = {},
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const t = m[0];
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const c = t[0];
    if (c === "*") out.push(<strong key={k++} className="font-bold">{t.slice(1, -1)}</strong>);
    else if (c === "_") out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    else if (c === "~") out.push(<s key={k++}>{t.slice(1, -1)}</s>);
    else if (opts.vars?.[t] != null) out.push(opts.vars[t]);
    else
      out.push(
        <Fragment key={k++}>
          {opts.renderVar ? opts.renderVar(t) : (
            <span className="rounded-[3px] bg-primary-soft px-[3px] font-mono text-[12.5px] text-primary">{t}</span>
          )}
        </Fragment>,
      );
    last = i + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Variables usadas en un texto que no están en la lista permitida (se subrayan en rojo). */
export function findUnknownVariables(text: string, allowed: string[], locked: string[] = []): string[] {
  const used = text.match(VARIABLE_RE) ?? [];
  return [...new Set(used.filter((v) => !allowed.includes(v) && !locked.includes(v)))];
}

/** Detecta precios, GB o porcentajes escritos a mano en un texto que redacta la IA. */
const FIGURE_RE = /\$\s?\d{1,3}(\.\d{3})+|\b\d+\s?GB\b|\b\d+([.,]\d+)?\s?%/i;
export function hasHardcodedFigures(text: string): boolean {
  return FIGURE_RE.test(text);
}

/** Envuelve la selección en *…* (botón "Negrita WhatsApp"). */
export function toggleBold(text: string, start: number, end: number): { text: string; start: number; end: number } {
  const sel = text.slice(start, end);
  if (sel.startsWith("*") && sel.endsWith("*") && sel.length > 1)
    return { text: text.slice(0, start) + sel.slice(1, -1) + text.slice(end), start, end: end - 2 };
  return { text: text.slice(0, start) + `*${sel}*` + text.slice(end), start, end: end + 2 };
}
