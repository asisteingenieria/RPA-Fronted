/** Nombres en español de los códigos del sistema (el código se muestra junto al nombre). */
import type { Range } from './api';

export const ACTION_LABEL: Record<string, string> = {
  LOGIN: 'Login',
  OPEN_CHAT: 'Abrir chat',
  SEND: 'Enviar',
  NOTE: 'Nota interna',
  TRANSFER: 'Transferir',
  CLOSE: 'Cerrar chat',
  READ_INBOX: 'Leer bandeja',
  RECYCLE: 'Reciclar navegador',
};
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a;

export const CONV_LABEL: Record<string, string> = {
  ACTIVE: 'Activas',
  WAITING_CONSENT: 'Esperando autorización',
  TRANSFERRING: 'Transfiriendo',
  TRANSFERRED_BACKOFFICE: 'Vendidas (backoffice)',
  CLOSED_NO_SALE: 'Sin venta',
  CLOSED_SUPPORT: 'Soporte',
  CLOSED_INACTIVE: 'Inactividad',
  NEEDS_REVIEW: 'En revisión',
};

export const RANGE_LABEL: Record<Range, string> = { hoy: 'Hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días' };

export const UPDATE_LABEL: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'actualización pedida', tone: 'warning' },
  WAITING_IDLE: { label: 'esperando a terminar sus chats', tone: 'warning' },
  DOWNLOADING: { label: 'descargando', tone: 'warning' },
  STAGED: { label: 'lista para activar', tone: 'warning' },
  APPLIED: { label: 'actualizado', tone: 'success' },
  FAILED: { label: 'actualización fallida', tone: 'danger' },
  ROLLED_BACK: { label: 'revertida (no arrancó)', tone: 'danger' },
};

export const PROCESS_LABEL: Record<string, string> = {
  PORTABILIDAD: 'Portabilidad',
  MIGRACION: 'Migración',
  LINEA_NUEVA: 'Línea nueva',
};

export const ROLE_HELP: Record<'ADMIN' | 'OPERADOR', string> = {
  ADMIN: 'Todo, incluidos robots, agente y usuarios',
  OPERADOR: 'Consulta, prueba la versión publicada y apagado de emergencia',
};

/** Brains (v1.9). */
export const USE_LABEL: Record<string, string> = {
  CATALOG: 'Catálogo',
  FULL_CONTEXT: 'Contexto completo',
  SEARCH: 'Búsqueda',
};
export const USE_HELP: Record<string, string> = {
  CATALOG: 'Planes desde Excel o CSV. Se guardan como registros; el agente los consulta por proceso y los precios salen literales.',
  FULL_CONTEXT: 'Texto corto que va completo en cada turno (horarios, políticas breves).',
  SEARCH: 'Documentos largos (preguntas frecuentes, políticas): en cada turno se envían solo los fragmentos más relevantes.',
};
export const KIND_LABEL: Record<string, string> = { FILE: 'Archivo', TEXT: 'Texto', WEB: 'Página web' };
