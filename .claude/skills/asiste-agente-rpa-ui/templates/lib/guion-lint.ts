/**
 * Revisión en vivo del guion y de la bienvenida (refleja las reglas del servidor; el servidor
 * sigue siendo quien valida al guardar). Si el backend ya expone esta revisión
 * (/admin/agent/review), usa su respuesta y deja esto solo como respaldo visual.
 */
export interface LintIssue {
  line: number; // 1-based
  col: number; // 0-based dentro de la línea
  match: string;
  kind: "precio" | "gigas" | "porcentaje" | "promesa" | "enlace" | "marcador";
  message: string;
}

export const GUION_MAX_CHARS = 30_000;
export const STAGES = ["MENU", "PERFIL", "OFERTA", "OBJECIONES", "AUTORIZACION"] as const;
export const OFFER_MARKER = /\{\{OFERTA:[A-Z0-9_]+\}\}/g;

const RULES: { kind: LintIssue["kind"]; re: RegExp; message: string }[] = [
  { kind: "precio", re: /\$\s?\d{1,3}(?:\.\d{3})+|\$\s?\d{4,}/g, message: "Los precios los inserta el sistema desde el catálogo. Usa un marcador {{OFERTA:CÓDIGO}}." },
  { kind: "gigas", re: /\b\d+(?:[.,]\d+)?\s?(?:GB|gigas?)\b/gi, message: "Las gigas salen del catálogo. Usa un marcador {{OFERTA:CÓDIGO}}." },
  { kind: "porcentaje", re: /\b\d+(?:[.,]\d+)?\s?%/g, message: "Los descuentos y porcentajes salen del catálogo." },
];
const WELCOME_RULES: { kind: LintIssue["kind"]; re: RegExp; message: string }[] = [
  ...RULES,
  { kind: "promesa", re: /\b(gratis|te regalo|regalamos|sin costo)\b/gi, message: "La bienvenida no puede prometer beneficios." },
  { kind: "enlace", re: /\bhttps?:\/\/\S+|\bwww\.\S+/gi, message: "La bienvenida no puede llevar enlaces." },
  { kind: "marcador", re: /\{\{[^}]+\}\}/g, message: "La bienvenida no puede llevar marcadores." },
];

function run(text: string, rules: typeof RULES): LintIssue[] {
  const out: LintIssue[] = [];
  text.split("\n").forEach((l, i) => {
    for (const r of rules) {
      for (const m of l.matchAll(r.re)) out.push({ line: i + 1, col: m.index ?? 0, match: m[0], kind: r.kind, message: r.message });
    }
  });
  return out.sort((a, b) => a.line - b.line || a.col - b.col);
}

export const lintGuion = (text: string) => run(text, RULES);
export const lintBienvenida = (text: string) => run(text, WELCOME_RULES);

/** Estimación para el contador; si el backend devuelve el conteo real, úsalo. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.8);

/** Inserta un texto en la posición del cursor de un <textarea> y devuelve el nuevo valor y cursor. */
export function insertAtCursor(el: HTMLTextAreaElement, snippet: string): { value: string; cursor: number } {
  const { selectionStart: a, selectionEnd: b, value } = el;
  return { value: value.slice(0, a) + snippet + value.slice(b), cursor: a + snippet.length };
}

/** Lleva el cursor a una línea (enlace "Línea 17" de la lista de errores). */
export function focusLine(el: HTMLTextAreaElement, line: number) {
  const lines = el.value.split("\n");
  const pos = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
  el.focus();
  el.setSelectionRange(pos, pos + (lines[line - 1]?.length ?? 0));
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 21;
  el.scrollTop = Math.max(0, (line - 4) * lh);
}
