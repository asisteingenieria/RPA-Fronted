/**
 * Arranque duplicado: el servidor rechazó abrir el robot porque otra instancia seguía en línea
 * (`Robot.lastRejectedAt`). Solo se avisa en las últimas 24 h y si el robot NO arrancó bien
 * después del rechazo: un reinicio rechazado mientras la instancia anterior aún contaba como viva
 * (60 s) entra al minuto siguiente y no es otra copia corriendo.
 */
export const DUPLICATE_WARN_MS = 24 * 3_600_000;

export function duplicateStart(
  r: { lastRejectedAt: string | null; startedAt: string | null },
  now: number,
): boolean {
  if (!r.lastRejectedAt) return false;
  const rejected = new Date(r.lastRejectedAt).getTime();
  if (now - rejected >= DUPLICATE_WARN_MS) return false;
  return !(r.startedAt && new Date(r.startedAt).getTime() > rejected);
}
