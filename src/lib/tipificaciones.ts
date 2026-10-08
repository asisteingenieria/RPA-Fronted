/**
 * Trazabilidad — nombres en español y tonos de las tipificaciones, etapas, eventos y alertas.
 * Las claves son los valores reales del backend (Conversation.status, stage, eventos del detalle).
 * Colores solo como tokens del tema (var(--token)); el color nunca va solo: siempre con texto.
 */
export type Tipificacion =
  | 'TRANSFERRED_BACKOFFICE'
  | 'CLOSED_NO_SALE'
  | 'CLOSED_SUPPORT'
  | 'CLOSED_INACTIVE'
  | 'NEEDS_REVIEW'
  | 'ACTIVE'
  | 'WAITING_CONSENT'
  | 'TRANSFERRING';

/** tone = variante de Badge; color = segmento de la barra apilada. */
export type TipTone = 'success' | 'neutral' | 'tyt' | 'outline' | 'danger' | 'info' | 'warning';
export interface TipInfo {
  label: string;
  short: string;
  tone: TipTone;
  color: string;
}

export const TIPIFICACION: Record<Tipificacion, TipInfo> = {
  TRANSFERRED_BACKOFFICE: { label: 'Venta transferida al backoffice', short: 'Venta transferida', tone: 'success', color: 'var(--success)' },
  CLOSED_NO_SALE: { label: 'Cerrada sin venta', short: 'Sin venta', tone: 'neutral', color: 'var(--border-strong)' },
  CLOSED_SUPPORT: { label: 'Derivada a soporte (*611)', short: 'Soporte *611', tone: 'tyt', color: 'var(--cat-tyt)' },
  CLOSED_INACTIVE: { label: 'Cerrada por inactividad (120 min)', short: 'Inactividad', tone: 'outline', color: 'var(--cat-tecnologia)' },
  NEEDS_REVIEW: { label: 'Requiere revisión humana', short: 'Revisión', tone: 'danger', color: 'var(--danger)' },
  ACTIVE: { label: 'En curso', short: 'En curso', tone: 'info', color: 'var(--primary)' },
  WAITING_CONSENT: { label: 'Esperando autorización', short: 'Esperando autorización', tone: 'warning', color: 'var(--warning)' },
  TRANSFERRING: { label: 'Transfiriendo', short: 'Transfiriendo', tone: 'info', color: 'var(--brand-azure)' },
};

/** Orden fijo de leyendas, filtros y columnas. */
export const TIPIFICACION_ORDER: Tipificacion[] = [
  'TRANSFERRED_BACKOFFICE',
  'CLOSED_NO_SALE',
  'CLOSED_SUPPORT',
  'CLOSED_INACTIVE',
  'NEEDS_REVIEW',
  'ACTIVE',
  'WAITING_CONSENT',
  'TRANSFERRING',
];

/** Etapas del motor (incluye las salidas); el filtro «Etapa final» usa todas. */
export const ETAPAS = [
  'MENU',
  'PERFIL',
  'OFERTA',
  'OBJECIONES',
  'AUTORIZACION',
  'TRANSFERENCIA',
  'SOPORTE',
  'CIERRE_SIN_VENTA',
  'ESCALAR',
] as const;
export type Etapa = (typeof ETAPAS)[number];

export type Proceso = 'PORTABILIDAD' | 'MIGRACION' | 'LINEA_NUEVA';
export const PROCESOS: Proceso[] = ['PORTABILIDAD', 'MIGRACION', 'LINEA_NUEVA'];
export const PROCESO_LABEL: Record<Proceso, string> = { PORTABILIDAD: 'Portabilidad', MIGRACION: 'Migración', LINEA_NUEVA: 'Línea nueva' };

/** Estado de cada envío del robot en Abaya (Message.status). */
export type DeliveryStatus = 'VERIFIED' | 'UNCERTAIN' | 'FAILED' | 'PENDING';
export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  VERIFIED: 'Verificado',
  UNCERTAIN: 'Incierto',
  FAILED: 'Fallido',
  PENDING: 'Pendiente',
};

/** Eventos que se pintan como pastillas centradas dentro del chat. */
export type TraceEventKind =
  | 'PLAN_OFFERED'
  | 'CONSENT_RECORDED'
  | 'TRANSFER_REQUESTED'
  | 'TRANSFERRED'
  | 'ESCALATED'
  | 'CLOSED_INACTIVE'
  | 'CLOSED_SUPPORT'
  | 'CLOSED_NO_SALE'
  | 'SENT_TO_REVIEW';
export const EVENT_INFO: Record<TraceEventKind, { label: (detail?: string) => string; tone: 'ok' | 'info' | 'warn' }> = {
  PLAN_OFFERED: { label: (d) => `Plan ofrecido${d ? ` ${d}` : ''}`, tone: 'info' },
  CONSENT_RECORDED: { label: () => 'Consentimiento registrado', tone: 'ok' },
  TRANSFER_REQUESTED: { label: () => 'Transferencia al backoffice pedida', tone: 'info' },
  TRANSFERRED: { label: () => 'Transferida al backoffice', tone: 'ok' },
  ESCALATED: { label: () => 'Escalada a un asesor humano', tone: 'warn' },
  CLOSED_INACTIVE: { label: () => 'Cerrada por inactividad', tone: 'warn' },
  CLOSED_SUPPORT: { label: () => 'Derivada a soporte (*611)', tone: 'info' },
  CLOSED_NO_SALE: { label: () => 'Cerrada sin venta', tone: 'info' },
  SENT_TO_REVIEW: { label: (d) => `Pasó a revisión${d ? ` · ${d}` : ''}`, tone: 'warn' },
};

/** Alertas de una fila de la lista. */
export type TraceFlag = 'UNCERTAIN_SEND' | 'REVIEW' | 'REGENERATED';
export const FLAG_INFO: Record<TraceFlag, { label: string; cls: string }> = {
  UNCERTAIN_SEND: { label: 'Envío incierto', cls: 'bg-warning-soft text-warning' },
  REVIEW: { label: 'Pasó por revisión', cls: 'bg-danger-soft text-danger' },
  REGENERATED: { label: 'Respuesta regenerada', cls: 'bg-cat-tecnologia-soft text-cat-tecnologia' },
};

/** Resultado de una llamada al modelo (LlmCall.validationResult). */
export type LlmResult = 'VALIDATED' | 'REGENERATED' | 'SAFE_REPLY' | 'ERROR';
export const LLM_RESULT: Record<LlmResult, { label: string; cls: string }> = {
  VALIDATED: { label: 'Validado', cls: 'bg-cat-tecnologia-soft text-cat-tecnologia' },
  REGENERATED: { label: 'Regenerado', cls: 'bg-warning-soft text-warning' },
  SAFE_REPLY: { label: 'Respuesta segura', cls: 'bg-warning-soft text-warning' },
  ERROR: { label: 'Proveedor con error', cls: 'bg-danger-soft text-danger' },
};
