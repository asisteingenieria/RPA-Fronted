import { formatCOP } from '@/lib/format';
import type { ContentSnapshot, OfferCriterion, Plan, Process, Usage } from '@/data/types';

export function dataLabel(p: Plan): string {
  return p.unlimitedData ? 'GB ILIMITADAS' : `${p.dataGb ?? 0} GB`;
}

/** Valores de las variables de la línea de plan. Vacío = la línea/segmento se omite (no se inventa). */
export function planVars(p: Plan): Record<string, string> {
  return {
    '[Datos]': dataLabel(p),
    '[GB compartir]': p.shareGb ? `${p.shareGb} GB` : '',
    '[Incluye]': p.includes,
    '[Llamadas]': p.calls,
    '[Precio]': formatCOP(p.priceCop),
    '[Descuento]': p.discount ?? '',
  };
}

/** Línea de un plan según el formato configurado; los segmentos con variables vacías se quitan. */
export function planLine(p: Plan, format: string): string {
  const vars = planVars(p);
  return format
    .split(' | ')
    .filter((seg) => !Object.entries(vars).some(([k, v]) => seg.includes(k) && !v))
    .map((seg) => Object.entries(vars).reduce((s, [k, v]) => s.split(k).join(v), seg))
    .map((seg) => seg.replace(/\s\+\s+para compartir/, ''))
    .join(' | ');
}

/** Bloque del plan principal (oferta 1): una viñeta por dato. */
export function mainOfferBullets(p: Plan): string {
  const lines = [`• *${dataLabel(p)}*${p.shareGb ? ` + ${p.shareGb} GB para compartir` : ''}`];
  if (p.includes) lines.push(`• ${p.includes}`);
  lines.push(`• ${p.calls}`);
  lines.push(`• *${formatCOP(p.priceCop)}*${p.discount ? ` | ${p.discount}` : ''}`);
  return lines.join('\n');
}

export function activePlans(c: ContentSnapshot, process: Process): Plan[] {
  return c.plans.filter((p) => p.process === process && p.active).sort((a, b) => b.priceCop - a.priceCop);
}

function dataScore(p: Plan) {
  return p.unlimitedData ? 10_000 : (p.dataGb ?? 0);
}

const SORTERS: Record<OfferCriterion, (a: Plan, b: Plan) => number> = {
  'mas-datos-ldi': (a, b) => Number(b.calls.includes('LDI')) - Number(a.calls.includes('LDI')) || dataScore(b) - dataScore(a),
  'apps-precio-moderado': (a, b) => Number(b.unlimitedApps.length > 0) - Number(a.unlimitedApps.length > 0) || dataScore(b) - dataScore(a),
  'menor-precio-apps': (a, b) => Number(b.unlimitedApps.length > 0) - Number(a.unlimitedApps.length > 0) || a.priceCop - b.priceCop,
  'mayor-precio': (a, b) => b.priceCop - a.priceCop,
};

/**
 * Segunda oferta: los demás planes del MISMO proceso, sin repetir los ya ofrecidos.
 * Si hay más que el máximo, se eligen por el criterio del perfil; se muestran de mayor a menor precio.
 */
export function secondOffer(c: ContentSnapshot, process: Process, usage: Usage | undefined, exclude: string[]): Plan[] {
  const pool = activePlans(c, process).filter((p) => !c.offer.noRepeat || !exclude.includes(p.code));
  const criterion = usage ? c.offer.criteria[usage] : 'mayor-precio';
  const picked = pool.length > c.offer.maxSecondOffer ? [...pool].sort(SORTERS[criterion]).slice(0, c.offer.maxSecondOffer) : pool;
  return picked.sort((a, b) => b.priceCop - a.priceCop);
}
