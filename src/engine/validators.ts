import { formatCOP } from '@/lib/format';
import type { ContentSnapshot } from '@/data/types';

export type ReplyKind = 'ia' | 'exacto' | 'oferta' | 'legal';

export interface ValidatorResult {
  name: string;
  ok: boolean;
  detail?: string;
}

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¡!¿?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cifras de precio y GB que aparecen en un texto. */
export function figuresIn(text: string): { prices: string[]; gbs: string[] } {
  return {
    prices: text.match(/\$\s?\d{1,3}(?:\.\d{3})+/g) ?? [],
    gbs: (text.match(/\b\d+\s?GB\b/gi) ?? []).map((g) => g.replace(/\s/g, '').toUpperCase()),
  };
}

/** Validadores de la sección 6.3.5 del plan, aproximados en el panel para el simulador. */
export function validateReply(text: string, kind: ReplyKind, c: ContentSnapshot): ValidatorResult[] {
  const prices = new Set(c.plans.filter((p) => p.active).map((p) => formatCOP(p.priceCop).replace(/\s/g, '')));
  const gbs = new Set(c.plans.flatMap((p) => [p.dataGb, p.shareGb]).filter(Boolean).map((g) => `${g}GB`));
  const f = figuresIn(text);
  const invented = [...f.prices.filter((p) => !prices.has(p.replace(/\s/g, ''))), ...f.gbs.filter((g) => !gbs.has(g))];

  const comp = c.personality.competitors.filter((x) => normalize(text).includes(normalize(x)));
  const banned = c.personality.bannedWords.filter((x) => x && normalize(text).includes(normalize(x)));
  const questions = (text.match(/\?/g) ?? []).length;
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 2).length;
  const badFormat = /\*\*|^#|\|\s?-{3}|\[[^\]]+\]\(http/m.test(text);

  const out: ValidatorResult[] = [
    { name: 'Sin datos inventados', ok: invented.length === 0, detail: invented.length ? `Cifra fuera del catálogo: ${invented.join(', ')}` : undefined },
    { name: 'Formato WhatsApp', ok: !badFormat, detail: badFormat ? 'Usa doble asterisco, encabezados, tablas o enlaces markdown' : undefined },
    { name: 'Una sola pregunta', ok: !c.personality.oneQuestion || questions <= 1, detail: questions > 1 ? `El mensaje tiene ${questions} preguntas` : undefined },
    { name: 'Sin competidores', ok: comp.length === 0, detail: comp.length ? `Menciona: ${comp.join(', ')}` : undefined },
  ];
  if (banned.length) out.push({ name: 'Sin palabras prohibidas', ok: false, detail: banned.join(', ') });
  if (kind === 'ia')
    out.push({
      name: `Máx. ${c.personality.maxSentences} oraciones`,
      ok: sentences <= c.personality.maxSentences,
      detail: sentences > c.personality.maxSentences ? `Tiene ${sentences} oraciones` : undefined,
    });
  return out;
}
