/** D-019: descarga un objeto como archivo JSON (exportaciones del agente y de los Brains). */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Nombre de archivo seguro con la fecha del día («agente-v19-2026-10-13.json»). */
export const exportName = (base: string) =>
  `${base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
