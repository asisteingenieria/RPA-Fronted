/**
 * Trazabilidad — DETALLE de una conversación (/trazabilidad/:id). Página completa, no drawer.
 * Al cargar, el servidor escribe CONVERSATION_VIEWED en Auditoría (no lo hace el front).
 * Referencia visual: reference/trazabilidad/screens/trazabilidad-detalle.*.png
 */
import type { ReactNode } from "react";
import { Bot, CheckCircle2, ChevronLeft, ChevronRight, Check, Cpu, Download, Link2, Package, RotateCcw, Send, Shield, Users } from "lucide-react";
import { Badge, Button, Callout, IconButton, Panel, CampaignChip, ICON } from "../components/rpa/ui";
import { ActionResult } from "../components/rpa/status";
import { ChatId, Skel, StageTrail, Typification } from "../components/rpa/trazabilidad/TraceParts";
import { TraceChat } from "../components/rpa/trazabilidad/TraceChat";
import { PROCESO_LABEL } from "../lib/tipificaciones";
import { formatCOP, formatDuration, formatInt, formatTime, formatDayShort } from "../lib/format";
import type { ConversationDetail, LlmCallRow } from "../lib/trazabilidad-api";

const ms = (v: number | null | undefined) => (v == null ? "—" : formatDuration(v));
const when = (iso: string) => `${formatDayShort(iso)} ${formatTime(iso, true)}`;
const KV = ({ rows }: { rows: [string, ReactNode, string?][] }) => (
  <dl className="ai-kv ai-kv--wide">{rows.map(([k, v, c], i) => <div key={i} style={{ display: "contents" }}><dt>{k}</dt><dd className={c}>{v ?? "—"}</dd></div>)}</dl>
);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const MISSING = (title: string, text = "—") => <span className="ai-muted" title={title}>{text}</span>;

const LLM_RESULT: Record<LlmCallRow["result"], [string, string]> = {
  TEMPLATE: ["tyt", "Plantilla del sistema"], VALIDATED: ["tecnologia", "Validado"], REGENERATED: ["operacion", "Regenerado"],
  SAFE_REPLY: ["operacion", "Respuesta segura"], ERROR: ["movil", "Proveedor con error"],
};

export interface ConversationDetailProps {
  data?: ConversationDetail;
  loading: boolean;
  avatarSrc: string; // asiste-mark.png
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDownload: () => void; // transcripción (auditada en el servidor)
  downloading?: boolean;
}

export function ConversationDetailView(p: ConversationDetailProps) {
  const d = p.data;
  return (
    <>
      <div className="ai-trace-bar">
        <nav className="ai-crumbs" aria-label="Ruta">
          <ChevronLeft {...ICON} size={14} />
          <button type="button" className="ai-link" onClick={p.onBack}>Trazabilidad</button>/<b>{d?.abayaChatId ?? "…"}</b>
        </nav>
        <div className="ai-row">
          {d?.nav && <span className="ai-help ai-num">{d.nav.index} de {formatInt(d.nav.total)} en el filtro</span>}
          <IconButton icon={ChevronLeft} label="Conversación anterior" outline disabled={!d?.nav?.prevId} onClick={p.onPrev} />
          <IconButton icon={ChevronRight} label="Conversación siguiente" outline disabled={!d?.nav?.nextId} onClick={p.onNext} />
          <Button icon={Download} loading={p.downloading} onClick={p.onDownload} title="Queda en Auditoría">Descargar transcripción</Button>
        </div>
      </div>

      {p.loading || !d ? <DetailSkeleton /> : (
        <>
          <div className="ai-card">
            <div className="ai-trace-head">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="ai-row" style={{ gap: 12 }}>
                  <h1 className="ai-trace-title">{d.customerName ?? "Cliente sin nombre"}</h1>
                  <ChatId id={d.abayaChatId} />
                  <Typification code={d.status} showCode />
                  <CampaignChip />
                </div>
                <dl className="ai-trace-facts">
                  {([
                    ["Robot", d.robotUser],
                    ["Inicio", when(d.createdAt)],
                    ["Fin", d.closed && d.updatedAt ? when(d.updatedAt) : "En curso"],
                    ["Duración", d.closed ? ms(d.durationMs) : "—"],
                    ["1.ª respuesta", ms(d.firstResponseMs)],
                    ["Mensajes", `↓ ${d.inbound} entrantes · ↑ ${d.outbound} salientes`],
                  ] as [string, string][]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
                <div>
                  <div className="ai-overline" style={{ marginBottom: 8 }}>Recorrido real</div>
                  <StageTrail path={d.stagePath} exit={d.closed ? { code: d.status } : undefined} />
                </div>
              </div>
              <div className="ai-flags" style={{ gap: 8 }}>
                <Badge tone="neutral" icon={RotateCcw}>{plural(d.llmCalls.filter((c) => c.result === "REGENERATED").length, "regeneración", "regeneraciones")}</Badge>
                <Badge tone="neutral" icon={Send}>{plural(d.rpaActions.filter((a) => a.result === "UNCERTAIN").length, "envío incierto", "envíos inciertos")}</Badge>
              </div>
            </div>
          </div>

          <div className="ai-trace-grid">
            <TraceChat messages={d.messages} events={d.events} avatarSrc={p.avatarSrc}
              title={`${d.customerName ?? "Cliente"} · ${d.abayaChatId}`} subtitle={`Conversación real · solo lectura · ${d.robotUser}`} />
            <div className="ai-col">
              <Panel title="Cliente" icon={Users}>
                <KV rows={[
                  ["Nombre", d.profile.name],
                  ["Teléfono", MISSING("El robot no guarda el teléfono (solo un hash). Dato faltante.", "— no se guarda")],
                  ["Operador actual", d.profile.currentOperator],
                  ["Uso declarado", d.profile.declaredUse],
                  ["Proceso", d.profile.process ? PROCESO_LABEL[d.profile.process] : null],
                ]} />
              </Panel>
              {d.sale && (
                <Panel title="Venta" icon={CheckCircle2} badge={<Badge tone="success">{d.sale.transferredAt ? "Transferida" : "Aceptada"}</Badge>}>
                  <KV rows={[
                    ["Plan aceptado", <span className="ai-code-inline">{d.sale.planCode}</span>],
                    ["Transferencia", d.sale.transferredAt ? when(d.sale.transferredAt) : null],
                    ["Nota interna", d.sale.internalNoteOk == null ? null : d.sale.internalNoteOk ? <Badge tone="success" icon={Check}>OK</Badge> : <Badge tone="danger">Falló</Badge>],
                    ["Después", "— vive en Abaya (backoffice)", "ai-muted"],
                  ]} />
                  {d.sale.backofficeSummary && <div style={{ marginTop: 14 }}><div className="ai-overline" style={{ marginBottom: 6 }}>Resumen para el backoffice</div><p className="ai-quote">{d.sale.backofficeSummary}</p></div>}
                </Panel>
              )}
              {d.consent && (
                <Panel title="Consentimiento" icon={Shield} badge={d.consent.chainVerified ? <Badge tone="success" icon={Shield}>Cadena verificada</Badge> : <Badge tone="danger">Cadena no verifica</Badge>}>
                  <KV rows={[
                    ["Respuesta exacta", <span className="ai-code-inline">{d.consent.answer}</span>],
                    ["Hora", when(d.consent.at)],
                    ["Plantilla legal", `texto legal ${d.consent.legalTemplateVersion}`],
                    ["Hash", d.consent.hash, "ai-mono"],
                  ]} />
                </Panel>
              )}
              <Panel title="Catálogo usado" icon={Package} flush actions={<span className="ai-help">{d.brainVersion ? `Brain ${d.brainVersion}` : "—"}</span>}>
                <table className="ai-table ai-table--dense">
                  <thead><tr><th>Hora</th><th>Código</th><th>Precio mostrado</th></tr></thead>
                  <tbody>{d.knowledgeUsage.length ? d.knowledgeUsage.map((k, i) => (
                    <tr key={i}><td className="ai-num">{formatTime(k.at)}</td><td><span className="ai-code-inline">{k.planCode}</span></td><td className="ai-num">{formatCOP(k.priceShown)}</td></tr>
                  )) : <tr><td colSpan={3} className="ai-muted">No se mostró ningún precio.</td></tr>}</tbody>
                </table>
              </Panel>
            </div>
          </div>

          <div className="ai-grid-2 ai-trace-bottom">
            <div className="ai-col">
              <Panel title="Motor · llamadas al modelo por etapa" icon={Cpu} flush actions={<span className="ai-help">Por etapa</span>}>
                <table className="ai-table ai-table--dense ai-table--compact">
                  <thead><tr><th>Etapa</th><th>Modelo</th><th>Latencia</th><th>Tokens</th><th>Resultado</th></tr></thead>
                  <tbody>{d.llmCalls.map((c, i) => { const [k, l] = LLM_RESULT[c.result]; return (
                    <tr key={i}><td><span className="ai-overline" style={{ color: "var(--ink-muted)" }}>{c.stage}</span></td><td className="ai-mono">{c.model ?? "plantilla"}</td><td className="ai-num">{ms(c.latencyMs)}</td><td className="ai-num">{c.tokens != null ? formatInt(c.tokens) : "—"}</td><td><span className={`ai-chip ai-chip--${k}`}>{l}</span></td></tr>
                  ); })}</tbody>
                </table>
              </Panel>
              <Callout tone="info">El origen exacto de cada respuesta (plantilla, modelo o regenerada) se muestra por etapa: hoy LlmCall no guarda el id del mensaje. Dato faltante.</Callout>
            </div>
            <Panel title="Acciones del robot en Abaya" icon={Bot} flush actions={<span className="ai-help">RpaActionLog · {d.rpaActions.length} acciones</span>}>
              <table className="ai-table ai-table--dense ai-table--compact">
                <thead><tr><th>Hora</th><th>Acción</th><th>Resultado</th><th>Duración</th><th /></tr></thead>
                <tbody>{d.rpaActions.map((a, i) => (
                  <tr key={i}><td className="ai-num">{formatTime(a.at, true)}</td><td>{a.action}</td><td><ActionResult result={a.result} /></td><td className="ai-num">{ms(a.durationMs)}</td>
                    <td>{a.traceUrl && <a className="ai-link" href={a.traceUrl}><Link2 {...ICON} size={13} />Ver traza</a>}</td></tr>
                ))}</tbody>
              </table>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="ai-card" style={{ padding: 24, display: "grid", gap: 16 }}><Skel w={360} h={28} /><Skel w="70%" /><Skel w="55%" h={26} /></div>
      <div className="ai-trace-grid">
        <div className="ai-card" style={{ height: 600, padding: 20, display: "grid", gap: 14, alignContent: "start" }}>{[60, 40, 70, 35, 55].map((w, i) => <Skel key={i} w={`${w}%`} h={44} />)}</div>
        <div className="ai-col">{[1, 2, 3].map((i) => <div key={i} className="ai-card" style={{ padding: 20, display: "grid", gap: 10 }}><Skel w={120} h={16} /><Skel w="90%" /><Skel w="80%" /><Skel w="60%" /></div>)}</div>
      </div>
    </>
  );
}
