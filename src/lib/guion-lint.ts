/**
 * Revisión en vivo del guion y de la bienvenida (kit asiste-agente-rpa-ui). Refleja las reglas del
 * servidor para marcar el editor al instante; quien decide es /admin/agent/review y el guardado.
 */
export interface LintIssue {
  line: number; // 1-based
  col: number; // 0-based dentro de la línea
  match: string;
  message: string;
}

export const GUION_MAX_CHARS = 30_000;

const RULES: { re: RegExp; message: string }[] = [
  {
    re: /\$\s?\d{1,3}(?:\.\d{3})+|\$\s?\d{4,}/g,
    message: 'los precios los inserta el sistema desde el catálogo. Usa un marcador {{OFERTA:CÓDIGO}}.',
  },
  { re: /\b\d+(?:[.,]\d+)?\s?(?:GB|gigas?)\b/gi, message: 'las gigas salen del catálogo. Usa un marcador {{OFERTA:CÓDIGO}}.' },
  { re: /\b\d+(?:[.,]\d+)?\s?%/g, message: 'los descuentos y porcentajes salen del catálogo.' },
];

function run(text: string, rules: typeof RULES): LintIssue[] {
  const out: LintIssue[] = [];
  text.split('\n').forEach((l, i) => {
    for (const r of rules) {
      for (const m of l.matchAll(r.re)) out.push({ line: i + 1, col: m.index ?? 0, match: m[0], message: r.message });
    }
  });
  return out.sort((a, b) => a.line - b.line || a.col - b.col);
}

export const lintGuion = (text: string) => run(text, RULES);

/** Resaltado del editor: marcadores (válidos) y cifras escritas a mano (errores). */
export const HIGHLIGHT_RE =
  /(\{\{OFERTA:[A-Z0-9_]+\}\}|\$\s?\d{1,3}(?:\.\d{3})+|\$\s?\d{4,}|\b\d+(?:[.,]\d+)?\s?(?:GB|gigas?)\b|\b\d+(?:[.,]\d+)?\s?%)/gi;

/** Estimación para el contador de tokens. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.8);

/** Inserta un texto en la posición del cursor de un <textarea>. */
export function insertAtCursor(el: HTMLTextAreaElement, snippet: string): { value: string; cursor: number } {
  const { selectionStart: a, selectionEnd: b, value } = el;
  return { value: value.slice(0, a) + snippet + value.slice(b), cursor: a + snippet.length };
}

/** Lleva el cursor a una línea (enlace "Línea 17" de la lista de errores). */
export function focusLine(el: HTMLTextAreaElement, line: number) {
  const lines = el.value.split('\n');
  const pos = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
  el.focus();
  el.setSelectionRange(pos, pos + (lines[line - 1]?.length ?? 0));
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 21;
  el.scrollTop = Math.max(0, (line - 4) * lh);
}
