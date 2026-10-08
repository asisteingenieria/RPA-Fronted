/**
 * Trazabilidad — TIPOS y construcción de consultas de los 4 endpoints nuevos.
 * Agrega las funciones al cliente que ya existe en src/lib/api.ts siguiendo su patrón
 * (mismo fetch, mismo manejo de 401/403). Si el backend responde con otros nombres de campo,
 * adapta AQUÍ los tipos y deja las vistas igual.
 *
 *   GET /admin/conversations          → ConversationListResponse   (filtros + cursor + KPIs del filtro)
 *   GET /admin/conversations/:id      → ConversationDetail          (escribe CONVERSATION_VIEWED)
 *   GET /admin/conversations/stats    → RobotPerformanceResponse
 *   GET /admin/conversations/export   → text/csv                    (escribe CONVERSATIONS_EXPORTED)
 */
import type { DeliveryStatus, Etapa, Proceso, Tipificacion, TraceEventKind, TraceFlag } from "./tipificaciones";

export type RangePreset = "hoy" | "7d" | "30d" | "custom";

export interface ConversationFilters {
  range: RangePreset;
  from?: string; // ISO, solo con range = "custom"
  to?: string;
  robots?: string[];
  tipificaciones?: Tipificacion[];
  procesos?: Proceso[];
  etapasFinales?: Etapa[];
  pasoPorRevision?: boolean;
  /** Id del chat de Abaya, nombre del cliente o texto de los mensajes (texto: rango ≤ 30 días). */
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface ConversationListItem {
  id: string;
  createdAt: string;
  updatedAt: string | null; // null mientras sigue abierta
  closed: boolean;
  robotUser: string;
  abayaChatId: string;
  customerName: string | null; // descifrado por el servidor; null si el cliente no lo dio
  status: Tipificacion;
  stage: Etapa;
  process: Proceso | null;
  planCode: string | null;
  inbound: number;
  outbound: number;
  firstResponseMs: number | null;
  durationMs: number | null;
  flags: TraceFlag[];
}

export interface ConversationKpis {
  total: number;
  sales: number;
  conversionPct: number; // 0–100
  firstResponseP50Ms: number | null;
  firstResponseP95Ms: number | null;
  avgDurationMs: number | null;
  byTipificacion: Partial<Record<Tipificacion, number>>;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  total: number;
  nextCursor: string | null;
  prevCursor: string | null;
  kpis: ConversationKpis;
  /** Días de retención (CONVERSATION_RETENTION_DAYS); null = sin plazo definido. */
  retentionDays: number | null;
}

export interface TraceMessage {
  id: string;
  from: "client" | "bot";
  text: string;
  sentAt: string;
  /** Solo mensajes del robot. */
  delivery?: { status: DeliveryStatus; attempts: number };
  /** ms desde que llegó la ráfaga del cliente (respondsToAt) hasta que Abaya confirmó el envío. */
  responseMs?: number | null;
}
export interface TraceEvent { at: string; kind: TraceEventKind; detail?: string }

export interface LlmCallRow { stage: Etapa; provider: string | null; model: string | null; latencyMs: number | null; tokens: number | null; result: "TEMPLATE" | "VALIDATED" | "REGENERATED" | "SAFE_REPLY" | "ERROR" }
export interface RpaActionRow { at: string; action: string; result: "OK" | "ERROR" | "UNCERTAIN" | "BLOCKED"; durationMs: number | null; traceUrl?: string | null }
export interface KnowledgeUsageRow { at: string; planCode: string; priceShown: number }

export interface ConversationDetail extends ConversationListItem {
  /** Recorrido REAL, con repeticiones (OFERTA ⇄ OBJECIONES). */
  stagePath: Etapa[];
  messages: TraceMessage[];
  events: TraceEvent[];
  profile: { name: string | null; currentOperator: string | null; declaredUse: string | null; process: Proceso | null };
  sale: { planCode: string; backofficeSummary: string | null; transferredAt: string | null; internalNoteOk: boolean | null } | null;
  consent: { answer: string; at: string; legalTemplateVersion: string; hash: string; chainVerified: boolean } | null;
  brainVersion: string | null;
  knowledgeUsage: KnowledgeUsageRow[];
  llmCalls: LlmCallRow[];
  rpaActions: RpaActionRow[];
  /** Posición en el filtro para las flechas anterior/siguiente. */
  nav?: { index: number; total: number; prevId: string | null; nextId: string | null };
}

export interface RobotPerformanceRow {
  robotUser: string;
  hostname: string | null;
  total: number;
  byTipificacion: Partial<Record<Tipificacion, number>>;
  sales: number;
  conversionPct: number;
  firstResponseP95Ms: number | null;
  uncertainSends: number;
  regenerations: number;
}
export interface RobotPerformanceResponse { rows: RobotPerformanceRow[]; total: number }

/** Filtros → query string (arrays separados por coma). */
export function conversationQuery(f: ConversationFilters): string {
  const p = new URLSearchParams();
  p.set("range", f.range);
  if (f.range === "custom") { if (f.from) p.set("from", f.from); if (f.to) p.set("to", f.to); }
  if (f.robots?.length) p.set("robot", f.robots.join(","));
  if (f.tipificaciones?.length) p.set("status", f.tipificaciones.join(","));
  if (f.procesos?.length) p.set("process", f.procesos.join(","));
  if (f.etapasFinales?.length) p.set("stage", f.etapasFinales.join(","));
  if (f.pasoPorRevision != null) p.set("reviewed", String(f.pasoPorRevision));
  if (f.q?.trim()) p.set("q", f.q.trim());
  if (f.cursor) p.set("cursor", f.cursor);
  p.set("limit", String(f.limit ?? 25));
  return p.toString();
}

/** El texto de los mensajes está cifrado: el servidor solo busca dentro en rangos ≤ 30 días. */
export const TEXT_SEARCH_MAX_DAYS = 30;
