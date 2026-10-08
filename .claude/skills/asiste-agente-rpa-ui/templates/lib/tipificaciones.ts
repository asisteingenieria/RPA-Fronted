/**
 * Trazabilidad — nombres en español y tonos de las tipificaciones, etapas y eventos.
 * Las claves son los valores que YA existen en la base de datos (Conversation.status, stage).
 * Si el backend usa otros códigos, ajusta SOLO las claves; no cambies los textos ni los tonos.
 */
export type Tipificacion =
  | "TRANSFERRED_BACKOFFICE" | "CLOSED_NO_SALE" | "CLOSED_SUPPORT" | "CLOSED_INACTIVE"
  | "NEEDS_REVIEW" | "ACTIVE" | "WAITING_CONSENT" | "TRANSFERRING";

/** tone = clase ai-badge--<tone>; color = color de la barra apilada (siempre un token). */
export type TipTone = "success" | "neutral" | "tyt" | "outline" | "danger" | "info" | "warning";
export interface TipInfo { label: string; short: string; tone: TipTone; color: string }

export const TIPIFICACION: Record<Tipificacion, TipInfo> = {
  TRANSFERRED_BACKOFFICE: { label: "Venta transferida al backoffice", short: "Venta transferida", tone: "success", color: "var(--success)" },
  CLOSED_NO_SALE: { label: "Cerrada sin venta", short: "Sin venta", tone: "neutral", color: "var(--border-strong)" },
  CLOSED_SUPPORT: { label: "Derivada a soporte (*611)", short: "Soporte *611", tone: "tyt", color: "var(--cat-tyt)" },
  CLOSED_INACTIVE: { label: "Cerrada por inactividad (120 min)", short: "Inactividad", tone: "outline", color: "var(--cat-tecnologia)" },
  NEEDS_REVIEW: { label: "Requiere revisión humana", short: "Revisión", tone: "danger", color: "var(--danger)" },
  ACTIVE: { label: "En curso", short: "En curso", tone: "info", color: "var(--primary)" },
  WAITING_CONSENT: { label: "Esperando autorización", short: "Esperando autorización", tone: "warning", color: "var(--cat-operacion)" },
  TRANSFERRING: { label: "Transfiriendo", short: "Transfiriendo", tone: "info", color: "var(--brand-azure)" },
};

/** Orden fijo de leyendas, filtros y columnas. */
export const TIPIFICACION_ORDER: Tipificacion[] = [
  "TRANSFERRED_BACKOFFICE", "CLOSED_NO_SALE", "CLOSED_SUPPORT", "CLOSED_INACTIVE",
  "NEEDS_REVIEW", "ACTIVE", "WAITING_CONSENT", "TRANSFERRING",
];

export const ETAPAS = ["MENU", "PERFIL", "OFERTA", "OBJECIONES", "AUTORIZACION"] as const;
export type Etapa = (typeof ETAPAS)[number];

export type Proceso = "PORTABILIDAD" | "MIGRACION" | "LINEA_NUEVA";
export const PROCESO_LABEL: Record<Proceso, string> = { PORTABILIDAD: "Portabilidad", MIGRACION: "Migración", LINEA_NUEVA: "Línea nueva" };

/** Estado de cada envío del robot en Abaya. Ajusta las claves a los valores reales del backend. */
export type DeliveryStatus = "VERIFIED" | "UNCERTAIN" | "FAILED";
export const DELIVERY_LABEL: Record<DeliveryStatus, string> = { VERIFIED: "Verificado", UNCERTAIN: "Incierto", FAILED: "Fallido" };

/** Eventos que se pintan como pastillas centradas dentro del chat. */
export type TraceEventKind = "PLAN_OFFERED" | "PROFILE_COMPLETE" | "CONSENT_RECORDED" | "TRANSFERRED" | "CLOSED_INACTIVE" | "SENT_TO_REVIEW" | "CLOSED_SUPPORT";
export const EVENT_INFO: Record<TraceEventKind, { label: (detail?: string) => string; tone: "ok" | "info" | "warn" }> = {
  PLAN_OFFERED: { label: (d) => `Plan ofrecido${d ? ` ${d}` : ""}`, tone: "info" },
  PROFILE_COMPLETE: { label: (d) => `Perfil completo${d ? ` · ${d}` : ""}`, tone: "info" },
  CONSENT_RECORDED: { label: (d) => `Consentimiento registrado${d ? ` · ${d}` : ""}`, tone: "ok" },
  TRANSFERRED: { label: (d) => `Transferida al backoffice${d ? ` · ${d}` : ""}`, tone: "ok" },
  CLOSED_INACTIVE: { label: () => "Cerrada por inactividad", tone: "warn" },
  SENT_TO_REVIEW: { label: (d) => `Pasó a revisión${d ? ` · ${d}` : ""}`, tone: "warn" },
  CLOSED_SUPPORT: { label: () => "Derivada a soporte (*611)", tone: "info" },
};

/** Alertas de una fila de la lista. */
export type TraceFlag = "UNCERTAIN_SEND" | "REVIEW" | "REGENERATED";
export const FLAG_INFO: Record<TraceFlag, { label: string; cls: "warn" | "err" | "info" }> = {
  UNCERTAIN_SEND: { label: "Envío incierto", cls: "warn" },
  REVIEW: { label: "Pasó por revisión", cls: "err" },
  REGENERATED: { label: "Respuesta regenerada", cls: "info" },
};
