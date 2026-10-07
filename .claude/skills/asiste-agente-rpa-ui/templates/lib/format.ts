/** Formatos de Colombia (hora de Bogotá) usados en todo el panel. */
const TZ = "America/Bogota";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
/** 99900 → "$ 99.900" */
export const formatCOP = (n: number) => COP.format(n).replace(/ /g, " ");

/** 15.5 → "15,5 %" */
export const formatPct = (n: number, digits = 1) =>
  n.toLocaleString("es-CO", { maximumFractionDigits: digits }) + " %";

/** 1234 → "1.234" */
export const formatInt = (n: number) => n.toLocaleString("es-CO");

const toDate = (d: Date | string | number) => (d instanceof Date ? d : new Date(d));

/** "06/10/2026" */
export const formatDate = (d: Date | string | number) =>
  toDate(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });

/** "14:32" (24 h, tablas) */
export const formatTime = (d: Date | string | number, seconds = false) =>
  toDate(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined, hour12: false, timeZone: TZ });

/** "3:42 p. m." (reloj del TopNav) */
export const formatClock = (d: Date | string | number) =>
  toDate(d).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ });

/** "Jue 24 sep 2026" */
export function formatDayShort(d: Date | string | number): string {
  const s = toDate(d).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ });
  const clean = s.replace(/\./g, "").replace(/,/g, "").replace(/ de /g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Milisegundos → "6 h 42 m", "45 min", "1,8 s" */
export function formatDuration(ms: number): string {
  if (ms < 60_000) return (ms / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " s";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} m`;
}

/** Fecha → "hace 12 s", "hace 7 min", "hace 2 h" (última señal, heartbeat) */
export function formatAgo(d: Date | string | number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - toDate(d).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86_400) return `hace ${Math.round(s / 3600)} h`;
  return formatDate(d);
}

/** "ANA VALENTINA RONCANCIO" → "Ana Valentina Roncancio" (solo al mostrar) */
export const properName = (s: string) =>
  s.toLocaleLowerCase("es-CO").replace(/(^|\s|-)(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("es-CO"));
