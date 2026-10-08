/**
 * Trazabilidad — vista de la LISTA (subpestaña Conversaciones) y de RENDIMIENTO POR ROBOT.
 * Componentes de presentación: reciben datos y callbacks. Conéctalos en src/pages/trazabilidad.tsx
 * con el cliente de src/lib/api.ts (ver lib/trazabilidad-api.ts) y el router del proyecto.
 * Referencia visual: reference/trazabilidad/screens/trazabilidad-lista.*.png y trazabilidad-robots.*.png
 */
import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Lock, MessagesSquare, Monitor, RefreshCw, Search, Shield, Timer, X } from "lucide-react";
import { Button, Callout, Empty, IconButton, PageHead, Panel, Segmented, Tabs, ICON } from "../components/rpa/ui";
import { AlertFlags, ChatId, FilterChip, Skel, Typification, TypificationBar } from "../components/rpa/trazabilidad/TraceParts";
import { PROCESO_LABEL, TIPIFICACION_ORDER } from "../lib/tipificaciones";
import { formatDuration, formatInt, formatPct, formatTime, formatDate } from "../lib/format";
import type { ConversationFilters, ConversationListResponse, RangePreset, RobotPerformanceResponse } from "../lib/trazabilidad-api";

export type TraceTab = "conversaciones" | "rendimiento";
const RANGES: { id: RangePreset; label: string }[] = [
  { id: "hoy", label: "Hoy" }, { id: "7d", label: "7 días" }, { id: "30d", label: "30 días" }, { id: "custom", label: "Personalizado" },
];
const ms = (v: number | null | undefined) => (v == null ? "—" : formatDuration(v));

/* ───── Encabezado común + subpestañas ───── */
export function TraceHeader({ tab, onTab, range, onRange, total, onExport, exporting }: {
  tab: TraceTab; onTab: (t: TraceTab) => void; range: RangePreset; onRange: (r: RangePreset) => void; total?: number; onExport: () => void; exporting?: boolean;
}) {
  return (
    <>
      <PageHead title="Trazabilidad" sub="Cada conversación del robot con el cliente, completa, con su tipificación y su recorrido"
        actions={<>
          <Segmented label="Rango" items={RANGES} value={range} onChange={onRange} />
          <Button icon={Download} loading={exporting} onClick={onExport} title="CSV sin el texto de los mensajes · queda en Auditoría">Exportar CSV</Button>
        </>} />
      <Tabs sub active={tab} onChange={(id) => onTab(id as TraceTab)} items={[
        { id: "conversaciones", label: "Conversaciones", icon: MessagesSquare, count: total },
        { id: "rendimiento", label: "Rendimiento por robot", icon: BarChart3 },
      ]} />
    </>
  );
}

/* ───── KPIs del filtro + distribución ───── */
function KpiCell({ icon: I, label, value, tone, style }: { icon: typeof Clock; label: string; value: ReactNode; tone?: "success"; style?: CSSProperties }) {
  return (
    <div style={style}>
      <span className="ai-kpi-icon" style={tone ? { background: "var(--success-soft)", color: "var(--success)" } : undefined}><I {...ICON} size={18} /></span>
      <div><div className="ai-kpi-label">{label}</div><div className="ai-kpi-value ai-num">{value}</div></div>
    </div>
  );
}
export function TraceKpis({ data }: { data: ConversationListResponse["kpis"] }) {
  const line = "1px solid var(--border)";
  return (
    <div className="ai-trace-kpis">
      <div className="ai-kpi-strip ai-kpi-strip--2x2">
        <KpiCell icon={MessagesSquare} label="Conversaciones" value={formatInt(data.total)} />
        <KpiCell icon={CheckCircle2} tone="success" label="Ventas · conversión" style={{ borderLeft: line }}
          value={<>{formatInt(data.sales)} <span className="ai-help">{formatPct(data.conversionPct)}</span></>} />
        <KpiCell icon={Timer} label="1.ª respuesta p50 / p95" style={{ borderTop: line }}
          value={<>{ms(data.firstResponseP50Ms)} <span className="ai-help">/ {ms(data.firstResponseP95Ms)}</span></>} />
        <KpiCell icon={Clock} label="Duración media" style={{ borderTop: line, borderLeft: line }} value={ms(data.avgDurationMs)} />
      </div>
      <Panel title="Distribución por tipificación" icon={BarChart3} actions={<span className="ai-help">{formatInt(data.total)} conversaciones del filtro</span>}>
        <TypificationBar counts={data.byTipificacion} />
      </Panel>
    </div>
  );
}

/* ───── Lista ───── */
export interface ConversationListProps {
  filters: ConversationFilters;
  data?: ConversationListResponse;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onSearch: (q: string) => void;
  /** Abre el popover de cada filtro (usa el que ya tenga el proyecto). */
  onOpenFilter: (f: "robot" | "tipificacion" | "proceso" | "etapa" | "revision") => void;
  onClearFilters: () => void;
  onOpen: (id: string) => void;
  onPage: (cursor: string) => void;
  pageLabel?: string; // "1–25 de 148"
  selectedId?: string;
}

const COLS = ["Inicio → fin", "Robot", "Chat de Abaya", "Cliente", "Tipificación", "Etapa final", "Proceso · plan", "Mensajes", "1.ª resp. · duración", "Alertas", ""];

export function ConversationList(p: ConversationListProps) {
  const f = p.filters;
  const active = (f.robots?.length ?? 0) + (f.tipificaciones?.length ?? 0) + (f.procesos?.length ?? 0) + (f.etapasFinales?.length ?? 0) + (f.pasoPorRevision != null ? 1 : 0);
  return (
    <div className="ai-card">
      <div className="ai-toolbar">
        <label className="ai-search">
          <Search {...ICON} size={15} />
          <input defaultValue={f.q} placeholder="Buscar por chat de Abaya, cliente o texto del mensaje…" aria-label="Buscar conversaciones"
            onKeyDown={(e) => e.key === "Enter" && p.onSearch((e.target as HTMLInputElement).value)}
            style={{ border: 0, outline: "none", background: "transparent", flex: 1, font: "inherit", color: "var(--ink)" }} />
        </label>
        <FilterChip label="Robot" count={f.robots?.length} onClick={() => p.onOpenFilter("robot")} />
        <FilterChip label="Tipificación" count={f.tipificaciones?.length} onClick={() => p.onOpenFilter("tipificacion")} />
        <FilterChip label="Proceso" count={f.procesos?.length} onClick={() => p.onOpenFilter("proceso")} />
        <FilterChip label="Etapa final" count={f.etapasFinales?.length} onClick={() => p.onOpenFilter("etapa")} />
        <FilterChip label="Pasó por revisión" count={f.pasoPorRevision != null ? 1 : undefined} onClick={() => p.onOpenFilter("revision")} />
        {active > 0 && <Button variant="ghost" size="sm" onClick={p.onClearFilters}>Limpiar</Button>}
      </div>

      {p.error ? (
        <Empty icon={AlertTriangle} title="No pudimos cargar las conversaciones" action={<Button variant="primary" icon={RefreshCw} onClick={p.onRetry}>Reintentar</Button>}>
          <span>{p.error} Tus filtros se conservan.</span>
        </Empty>
      ) : !p.loading && p.data && p.data.items.length === 0 ? (
        <Empty icon={Search} title="Ninguna conversación coincide" action={active > 0 ? <Button icon={X} onClick={p.onClearFilters}>Limpiar filtros</Button> : undefined}>
          <span>Prueba con un rango más amplio o quita algún filtro.</span>
        </Empty>
      ) : (
        <table className="ai-table ai-table--dense ai-table--compact">
          <thead><tr>{COLS.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>
            {p.loading || !p.data
              ? Array.from({ length: 8 }, (_, i) => (
                <tr key={i}><td><Skel w={80} /><div style={{ height: 6 }} /><Skel w={90} h={10} /></td><td><Skel w={60} /></td><td><Skel w={80} /></td><td><Skel w={120} /></td><td><Skel w={110} h={22} /></td><td><Skel w={80} /></td><td><Skel w={100} /></td><td><Skel w={50} /></td><td><Skel w={50} /></td><td><Skel w={30} /></td><td /></tr>
              ))
              : p.data.items.map((r) => (
                <tr key={r.id} className={r.id === p.selectedId ? "is-selected" : undefined} onClick={() => p.onOpen(r.id)} style={{ cursor: "pointer" }}>
                  <td className="ai-num">{formatTime(r.createdAt)}<span className="ai-arrow">→</span>{r.updatedAt && r.closed ? formatTime(r.updatedAt) : "—"}<span className="ai-sub">{formatDate(r.createdAt)}</span></td>
                  <td>{r.robotUser}</td>
                  <td onClick={(e) => e.stopPropagation()}><ChatId id={r.abayaChatId} /></td>
                  <td>{r.customerName ?? <span className="ai-muted" title="El cliente no dio su nombre">—</span>}</td>
                  <td><Typification code={r.status} short /></td>
                  <td><span className="ai-overline" style={{ color: "var(--ink-muted)" }}>{r.stage}</span></td>
                  <td>{r.process ? PROCESO_LABEL[r.process] : "—"}{r.planCode && <> · <span className="ai-code-inline">{r.planCode}</span></>}</td>
                  <td className="ai-num" title="Entrantes del cliente / salientes del robot">↓ {r.inbound}  ↑ {r.outbound}</td>
                  <td className="ai-num">{ms(r.firstResponseMs)}<span className="ai-sub">{r.closed ? ms(r.durationMs) : "—"}</span></td>
                  <td><AlertFlags flags={r.flags} /></td>
                  <td><Button size="sm" variant="ghost" iconRight={ChevronRight} onClick={(e) => { e.stopPropagation(); p.onOpen(r.id); }}>Ver</Button></td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <div className="ai-table-foot">
        <span className="ai-retention"><Shield {...ICON} size={14} />Cada apertura queda en Auditoría · {p.data?.retentionDays != null ? `Se conservan ${p.data.retentionDays} días · se borran automáticamente` : "Retención: sin plazo definido"}</span>
        <span className="ai-pager">
          {p.pageLabel && <span className="ai-num">{p.pageLabel}</span>}
          <IconButton icon={ChevronLeft} label="Anterior" outline disabled={!p.data?.prevCursor} onClick={() => p.data?.prevCursor && p.onPage(p.data.prevCursor)} />
          <IconButton icon={ChevronRight} label="Siguiente" outline disabled={!p.data?.nextCursor} onClick={() => p.data?.nextCursor && p.onPage(p.data.nextCursor)} />
        </span>
      </div>
    </div>
  );
}

/* ───── Rendimiento por robot ───── */
export function RobotPerformance({ data, loading, rangeLabel, onOpenRobot }: { data?: RobotPerformanceResponse; loading: boolean; rangeLabel: string; onOpenRobot: (robot: string) => void }) {
  const rows = data?.rows ?? [];
  const pctOf = (n: number | undefined, t: number) => formatPct(t ? ((n ?? 0) / t) * 100 : 0);
  // Mejor/peor solo con 2+ robots y datos; siempre acompañado de texto (Callout).
  const conv = rows.map((r) => r.conversionPct), p95 = rows.map((r) => r.firstResponseP95Ms ?? 0);
  const worstConv = rows.length > 1 ? Math.min(...conv) : null, bestConv = rows.length > 1 ? Math.max(...conv) : null, worstP95 = rows.length > 1 ? Math.max(...p95) : null;
  const worst = rows.find((r) => r.conversionPct === worstConv);
  const totals: Record<string, number> = {};
  rows.forEach((r) => TIPIFICACION_ORDER.forEach((k) => { totals[k] = (totals[k] ?? 0) + (r.byTipificacion[k] ?? 0); }));

  return (
    <>
      {worst && (
        <Callout tone="warning"><b>{worst.robotUser} convierte menos</b> que el resto en el rango elegido ({rangeLabel}): {formatPct(worst.conversionPct)} de conversión y 1.ª respuesta p95 de {ms(worst.firstResponseP95Ms)}. <button type="button" className="ai-link" onClick={() => onOpenRobot(worst.robotUser)}>Ver sus conversaciones</button></Callout>
      )}
      <div className="ai-card">
        <table className="ai-table ai-table--dense ai-table--compact">
          <thead><tr>{["Robot", "Conv.", "Tipificación", "Ventas", "Sin venta", "Inactividad", "Revisión", "Conversión", "1.ª resp. p95", "Inciertos", "Regeneradas", ""].map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>
            {loading ? Array.from({ length: 4 }, (_, i) => <tr key={i}>{Array.from({ length: 12 }, (_, j) => <td key={j}><Skel w={j === 2 ? 180 : 50} /></td>)}</tr>)
              : rows.map((r) => (
                <tr key={r.robotUser}>
                  <td><div className="ai-machine"><span className="ai-machine-icon"><Monitor {...ICON} /></span><div><div className="ai-person-name">{r.robotUser}</div>{r.hostname && <div className="ai-person-sub">{r.hostname}</div>}</div></div></td>
                  <td className="ai-num">{r.total}</td>
                  <td style={{ minWidth: 180 }}><TypificationBar counts={r.byTipificacion} thin legend={false} /></td>
                  <td className="ai-num">{r.sales}</td>
                  <td className="ai-num">{pctOf(r.byTipificacion.CLOSED_NO_SALE, r.total)}</td>
                  <td className="ai-num">{pctOf(r.byTipificacion.CLOSED_INACTIVE, r.total)}</td>
                  <td className="ai-num">{r.byTipificacion.NEEDS_REVIEW ?? 0}</td>
                  <td className="ai-num"><span className={r.conversionPct === worstConv ? "ai-worst" : r.conversionPct === bestConv ? "ai-best" : undefined}>{formatPct(r.conversionPct)}</span></td>
                  <td className="ai-num"><span className={(r.firstResponseP95Ms ?? 0) === worstP95 ? "ai-worst" : undefined}>{ms(r.firstResponseP95Ms)}</span></td>
                  <td className="ai-num">{r.uncertainSends}</td>
                  <td className="ai-num">{r.regenerations}</td>
                  <td><Button size="sm" variant="ghost" iconRight={ChevronRight} onClick={() => onOpenRobot(r.robotUser)}>Ver</Button></td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="ai-table-foot"><span>{formatInt(data?.total ?? 0)} conversaciones · {rows.length} robots</span><span>Rango: {rangeLabel}</span></div>
      </div>
      <Panel title="Distribución total por tipificación" icon={BarChart3}><TypificationBar counts={totals} /></Panel>
      <div className="ai-legend"><span><b className="ai-best" />Mejor valor del rango</span><span><b className="ai-worst" />Peor valor del rango</span></div>
    </>
  );
}

/* ───── Sin permiso (también la pestaña del TopNav se ve deshabilitada con candado) ───── */
export function TraceNoAccess() {
  return (
    <div className="ai-card">
      <Empty icon={Lock} title="No tienes acceso a las conversaciones">
        <span style={{ maxWidth: 420 }}>Las conversaciones muestran mensajes reales y datos del cliente. Necesitas el permiso «Ver conversaciones», que asigna un ADMIN en Usuarios.</span>
      </Empty>
    </div>
  );
}

/** Aviso cuando hay texto en la búsqueda y el rango supera 30 días. */
export const TextSearchRangeNotice = () => (
  <Callout tone="info"><b>La búsqueda en el texto de los mensajes funciona en rangos de hasta 30 días.</b> Los mensajes están cifrados: el servidor los descifra para buscar. Reduce el rango para buscar texto.</Callout>
);
