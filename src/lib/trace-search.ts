/**
 * Trazabilidad: los filtros viven en la URL (query string) para que el detalle pueda volver a la
 * lista y recorrer anterior/siguiente con el mismo filtro. Aquí se validan y se traducen al
 * formato de /admin/conversations.
 */
import type { ConversationFilters, TraceRange } from './api';
import { ETAPAS, PROCESOS, TIPIFICACION_ORDER, type Etapa, type Proceso, type Tipificacion } from './tipificaciones';
import { TEXT_SEARCH_MAX_DAYS } from './api';

export interface TraceSearch {
  tab?: 'rendimiento';
  rango?: TraceRange;
  /** AAAA-MM-DD, solo con rango = custom. */
  desde?: string;
  hasta?: string;
  robot?: string;
  tip?: string;
  proceso?: string;
  etapa?: string;
  revision?: 'si' | 'no';
  /** D-004: número de versión del guion. */
  version?: string;
  q?: string;
  /** Desplazamiento de la página (múltiplo del tamaño de página). */
  pag?: number;
}

export const PAGE_SIZE = 25;
const RANGES: TraceRange[] = ['hoy', '7d', '30d', 'custom'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const csv = (v: string | undefined) => (v ? v.split(',').filter(Boolean) : []);

/** validateSearch de las rutas /trazabilidad y /trazabilidad/$id. */
export function parseTraceSearch(s: Record<string, unknown>): TraceSearch {
  const rango = RANGES.find((r) => r === s.rango);
  const desde = str(s.desde);
  const hasta = str(s.hasta);
  const pag = Number(s.pag);
  const pick = <T extends string>(raw: unknown, allowed: readonly T[]) => {
    const v = csv(str(raw)).filter((x): x is T => (allowed as readonly string[]).includes(x));
    return v.length ? v.join(',') : undefined;
  };
  const out: TraceSearch = {};
  if (s.tab === 'rendimiento') out.tab = 'rendimiento';
  if (rango && rango !== 'hoy') out.rango = rango;
  if (rango === 'custom' && desde && DAY.test(desde)) out.desde = desde;
  if (rango === 'custom' && hasta && DAY.test(hasta)) out.hasta = hasta;
  const robot = str(s.robot);
  if (robot) out.robot = robot;
  const tip = pick(s.tip, TIPIFICACION_ORDER);
  if (tip) out.tip = tip;
  const proceso = pick(s.proceso, PROCESOS);
  if (proceso) out.proceso = proceso;
  const etapa = pick(s.etapa, ETAPAS);
  if (etapa) out.etapa = etapa;
  if (s.revision === 'si' || s.revision === 'no') out.revision = s.revision;
  const version = Number(s.version);
  if (Number.isInteger(version) && version > 0) out.version = String(version);
  const q = str(s.q);
  if (q) out.q = q.slice(0, 200);
  if (Number.isInteger(pag) && pag > 0) out.pag = pag;
  return out;
}

/** Bogotá (UTC-5) → "AAAA-MM-DD" de hoy. */
export const todayBogota = (now = Date.now()) => new Date(now - 5 * 3_600_000).toISOString().slice(0, 10);

/** Filtros de la API a partir de la URL (sin paginación si `page` es false). */
export function toFilters(s: TraceSearch, page = true): ConversationFilters {
  const range = s.rango ?? 'hoy';
  const today = todayBogota();
  return {
    range,
    ...(range === 'custom' ? { from: s.desde ?? today, to: s.hasta ?? today } : {}),
    robots: csv(s.robot),
    tipificaciones: csv(s.tip) as Tipificacion[],
    procesos: csv(s.proceso) as Proceso[],
    etapasFinales: csv(s.etapa) as Etapa[],
    ...(s.revision ? { pasoPorRevision: s.revision === 'si' } : {}),
    ...(s.version ? { version: Number(s.version) } : {}),
    ...(s.q ? { q: s.q } : {}),
    ...(page && s.pag ? { cursor: String(s.pag) } : {}),
    limit: PAGE_SIZE,
  };
}

/** Días que abarca el rango (para el límite de búsqueda en el texto). */
export function rangeDays(s: TraceSearch): number {
  const range = s.rango ?? 'hoy';
  if (range === 'hoy') return 1;
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  const from = Date.parse(`${s.desde ?? todayBogota()}T00:00:00Z`);
  const to = Date.parse(`${s.hasta ?? todayBogota()}T00:00:00Z`);
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
}

/** La búsqueda (que incluye el texto de los mensajes) solo funciona en rangos ≤ 30 días. */
export const searchBlocked = (s: TraceSearch) => !!s.q && rangeDays(s) > TEXT_SEARCH_MAX_DAYS;

export const activeFilters = (s: TraceSearch) =>
  csv(s.robot).length + csv(s.tip).length + csv(s.proceso).length + csv(s.etapa).length + (s.revision ? 1 : 0) + (s.version ? 1 : 0);

export const RANGE_TEXT: Record<TraceRange, string> = {
  hoy: 'hoy',
  '7d': 'los últimos 7 días',
  '30d': 'los últimos 30 días',
  custom: 'el rango personalizado',
};

export { csv as splitList };
