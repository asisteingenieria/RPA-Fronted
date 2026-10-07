/** Formatos de Colombia (hora de Bogotá) usados en todo el panel (kit asiste-agente-rpa-ui). */
const TZ = 'America/Bogota';
const DASH = '—';

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
/** 99900 → "$ 99.900" */
export const formatCOP = (n: number) => COP.format(n).replace(/ /g, ' ');

/** 15.5 → "15,5 %" */
export const formatPct = (n: number, digits = 1) => n.toLocaleString('es-CO', { maximumFractionDigits: digits }) + ' %';

/** 1234 → "1.234" */
export const formatInt = (n: number) => n.toLocaleString('es-CO');

type DateLike = Date | string | number;
const toDate = (d: DateLike) => (d instanceof Date ? d : new Date(d));

/** "06/10/2026" */
export const formatDate = (d: DateLike) =>
  toDate(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });

/** "14:32" o "14:32:05" (24 h, tablas) */
export const formatTime = (d: DateLike, seconds = false) =>
  toDate(d).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
    timeZone: TZ,
  });

/** "3:42 p. m." (reloj del TopNav) */
export const formatClock = (d: DateLike) =>
  toDate(d).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });

/** Milisegundos → "1,8 s", "45 min", "6 h 42 m" */
export function formatDuration(ms: number): string {
  if (ms < 60_000) return (ms / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' s';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} m`;
}

/** Fecha → "hace 12 s", "hace 7 min", "hace 2 h" (última señal, heartbeat) */
export function formatAgo(d: DateLike, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - toDate(d).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86_400) return `hace ${Math.round(s / 3600)} h`;
  return formatDate(d);
}

/* ───── Para datos del backend que pueden venir vacíos (null → "—") ───── */

/** ms → "850 ms", "1,8 s"; null → "—" */
export const fmtMs = (v: number | null | undefined) =>
  v === null || v === undefined ? DASH : v < 1000 ? `${Math.round(v)} ms` : formatDuration(v);

export const fmtTime = (iso: string | null | undefined, seconds = false) => (iso ? formatTime(iso, seconds) : DASH);
export const fmtAgo = (iso: string | null | undefined, now = Date.now()) => (iso ? formatAgo(iso, now) : DASH);
export const fmtDateTime = (iso: string | null | undefined) => (iso ? `${formatDate(iso)} ${formatTime(iso)}` : DASH);
export const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? DASH : formatPct(v));

const dayKey = (d: Date) => d.toLocaleDateString('es-CO', { timeZone: TZ });
/** "Hoy 07:58", "Ayer 18:20" o "02/10/2026" (último ingreso, quién guardó…); null → "—" */
export function fmtWhen(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return DASH;
  const d = toDate(iso);
  if (dayKey(d) === dayKey(now)) return `Hoy ${formatTime(d)}`;
  if (dayKey(d) === dayKey(new Date(now.getTime() - 86_400_000))) return `Ayer ${formatTime(d)}`;
  return `${formatDate(d)} ${formatTime(d)}`;
}

/** "kbermudez" → "KB"; "laura.castro" → "LC" */
export function initials(username: string): string {
  const parts = username.split(/[.\-_\s@]+/).filter(Boolean);
  const s = parts.length > 1 ? parts[0]!.charAt(0) + parts[1]!.charAt(0) : username.slice(0, 2);
  return s.toLocaleUpperCase('es-CO');
}

/** Tamaño en bytes → "38 MB", "420 KB" */
export function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
