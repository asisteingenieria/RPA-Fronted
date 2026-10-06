/** Formatos de Colombia usados en todo el panel. */

/** 99900 → "$ 99.900" */
export function formatCOP(value: number): string {
  return "$ " + Math.round(value).toLocaleString("es-CO", { maximumFractionDigits: 0 }).replace(/,/g, ".");
}

/** 1.4 → "1,4 %" */
export function formatPct(value: number, digits = 1): string {
  return value.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: digits }) + " %";
}

/** Date → "05/10/2026" */
export function formatDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" });
}

/** Date → "14:32" (24 h) */
export function formatTime(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" });
}

/** "05/10/2026 14:32" */
export function formatDateTime(d: Date | string): string {
  return `${formatDate(d)} ${formatTime(d)}`;
}

/** Fecha larga para {{FECHA}} del texto legal: "5 de octubre de 2026" */
export function formatLegalDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
}
