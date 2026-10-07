/** Piezas de la pantalla Agente (estilo Retell). Ver reference/screens/agente.*.png e historial.*.png. */
import { useState, type ReactNode } from "react";
import { ChevronDown, Copy, FlaskConical, KeyRound, Lock, Plus, Save, XCircle, type LucideIcon } from "lucide-react";
import { Button, CampaignChip, Segmented, cx, ICON } from "../ui";
import { VersionStatus, type VersionState } from "../status";
import { can, REASON, type Role } from "../../../lib/roles";
import { formatCOP } from "../../../lib/format";

/* ───── Encabezado del agente ───── */
export function AgentBar(p: {
  role: Role; name: string; status: VersionState; meta: ReactNode; unsaved: boolean; saving?: boolean; publishing?: boolean;
  hasErrors: boolean; /** Motivo si no se puede publicar (proveedor simulado, sin API key, evaluación en curso…). */ cannotPublish?: string;
  onDiscard: () => void; onSave: () => void; onPublish: () => void;
}) {
  const admin = can(p.role, "editarAgente");
  const why = admin ? undefined : REASON.editarAgente;
  return (
    <div className="ai-agentbar">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="ai-row" style={{ gap: 10 }}>
          <span className="ai-agentbar-name">{p.name}</span>
          <CampaignChip />
          <VersionStatus status={p.status} />
        </div>
        <span className="ai-agentbar-meta">{p.meta}</span>
      </div>
      <div className="ai-agentbar-actions">
        {p.unsaved && <span className="ai-unsaved">Cambios sin guardar</span>}
        <Button variant="ghost" reason={why} disabled={!p.unsaved} onClick={p.onDiscard}>Descartar</Button>
        <Button icon={Save} loading={p.saving} reason={why ?? (p.hasErrors ? "Corrige los errores del guion para guardar" : undefined)} disabled={!p.unsaved} onClick={p.onSave}>Guardar</Button>
        {/* No existe "publicar sin probar": este botón SIEMPRE dispara la suite de evaluación. */}
        <Button variant="primary" icon={FlaskConical} loading={p.publishing} reason={why ?? p.cannotPublish} onClick={p.onPublish}>Publicar con evaluación</Button>
      </div>
    </div>
  );
}

/* ───── Fila de ajustes del modelo (sobre el editor) ───── */
export function ModelSettings(p: {
  models: string[]; model: string; onModel: (m: string) => void;
  temperature: number; onTemperature: (t: number) => void; temperatureIgnored?: boolean; readOnly?: boolean;
}) {
  return (
    <div className="ai-settings-row">
      <label className="ai-select">
        <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Modelo</span>
        <select value={p.model} onChange={(e) => p.onModel(e.target.value)} disabled={p.readOnly} style={{ border: 0, background: "transparent", font: "inherit", color: "inherit" }}>
          <option value="">Por defecto del servidor</option>
          {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="ai-slider" title={p.temperatureIgnored ? "Este modelo no usa la temperatura" : "Temperatura 0 – 0,3"}>
        Temperatura
        <input type="range" min={0} max={0.3} step={0.05} value={p.temperature} disabled={p.readOnly || p.temperatureIgnored}
          onChange={(e) => p.onTemperature(Number(e.target.value))} style={{ width: 80, accentColor: "var(--primary)" }} />
        <b className="ai-num">{p.temperature.toLocaleString("es-CO")}</b>
      </label>
      <span className="ai-select is-locked" title="Fijo">Español (Colombia) <Lock {...ICON} size={13} /></span>
      {p.temperatureIgnored && <span className="ai-help">El modelo seleccionado no usa la temperatura.</span>}
    </div>
  );
}

/* ───── Sección plegable de la columna central ───── */
export function Section({ title, icon: I, badge, defaultOpen, children }: { title: string; icon: LucideIcon; badge?: ReactNode; defaultOpen?: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={cx("ai-acc-item", open && "is-open")}>
      <button type="button" className="ai-acc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <I {...ICON} size={17} />{title}{badge}
        <ChevronDown {...ICON} className="ai-acc-chev" />
      </button>
      {open && children && <div className="ai-acc-body">{children}</div>}
    </div>
  );
}
export const SectionStack = ({ children }: { children: ReactNode }) => <div className="ai-acc">{children}</div>;

/* ───── Catálogo en solo lectura con "Insertar" marcador ───── */
export interface Plan { code: string; name: string; gb?: string; price: number }
export type Process = "PORTABILIDAD" | "MIGRACION" | "LINEA_NUEVA";
export function CatalogReadOnly({ plans, onInsert, readOnly }: { plans: Record<Process, Plan[]>; onInsert: (marker: string) => void; readOnly?: boolean }) {
  const [proc, setProc] = useState<Process>("MIGRACION");
  const list = plans[proc] ?? [];
  return (
    <>
      <Segmented label="Proceso" value={proc} onChange={setProc}
        items={[{ id: "PORTABILIDAD", label: "Portabilidad" }, { id: "MIGRACION", label: "Migración" }, { id: "LINEA_NUEVA", label: "Línea nueva" }]} />
      {list.length === 0 ? <span className="ai-help">Sin planes activos en este proceso.</span> : (
        <div>
          {list.map((p) => (
            <div key={p.code} className="ai-plan">
              <code>{p.code}</code>
              <span className="ai-plan-name">{p.name}</span>
              <Button size="sm" variant="ghost" icon={readOnly ? Copy : Plus}
                onClick={() => (readOnly ? navigator.clipboard?.writeText(`{{OFERTA:${p.code}}}`) : onInsert(`{{OFERTA:${p.code}}}`))}>
                {readOnly ? "Copiar marcador" : "Insertar"}
              </Button>
              <span className="ai-plan-sub">{[p.gb, formatCOP(p.price)].filter(Boolean).join(" · ")}</span>
            </div>
          ))}
        </div>
      )}
      <span className="ai-help">Inserta {"{{OFERTA:CÓDIGO}}"} en el cursor del guion. Los precios nunca se escriben en el guion.</span>
    </>
  );
}

/* ───── Etapas del motor (solo lectura) ───── */
export const ENGINE_STAGES = ["MENU", "PERFIL", "OFERTA", "OBJECIONES", "AUTORIZACION", "TRANSFERENCIA"] as const;
export function StageTrack({ current }: { current: string }) {
  const idx = ENGINE_STAGES.indexOf(current as (typeof ENGINE_STAGES)[number]);
  return (
    <ol className="ai-stages" aria-label="Etapas del motor">
      {ENGINE_STAGES.map((s, i) => (
        <li key={s} className={i < idx ? "done" : i === idx ? "now" : undefined} aria-current={i === idx ? "step" : undefined}><span>{s}</span></li>
      ))}
      {idx < 0 && <li className="now"><span>{current}</span></li> /* SOPORTE, CIERRE_SIN_VENTA, ESCALAR */}
    </ol>
  );
}

/* ───── Resultado de evaluación rechazada ───── */
export function EvalReport(p: { version: string; pctOk: number; invented: number; passed: number; total: number; duration: string; p95: string; failedCases?: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="ai-eval-fail">
      <div className="ai-eval-fail-head">
        <XCircle {...ICON} size={20} />
        <b style={{ font: "600 16px/22px var(--font-display)" }}>La {p.version} no se publicó: la evaluación la rechazó</b>
        <span style={{ marginLeft: "auto" }}><VersionStatus status="REJECTED" /></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20, padding: 20 }}>
        <div className="ai-meter">
          <span className="ai-kpi-label">Casos correctos (meta ≥ 95 %)</span>
          <span className="ai-kpi-value" style={{ color: p.pctOk < 95 ? "var(--danger)" : undefined }}>{p.pctOk.toLocaleString("es-CO")} %</span>
          <div className="ai-meter-bar"><span style={{ width: `${p.pctOk}%`, background: p.pctOk < 95 ? undefined : "var(--success)" }} /><i style={{ left: "95%" }} /></div>
        </div>
        <div className="ai-meter">
          <span className="ai-kpi-label">Datos inventados (debe ser 0)</span>
          <span className="ai-kpi-value" style={{ color: p.invented > 0 ? "var(--danger)" : undefined }}>{p.invented}</span>
          {p.invented > 0 && <span className="ai-help">Bloquea la publicación</span>}
        </div>
        <div className="ai-meter">
          <span className="ai-kpi-label">Suite</span>
          <span className="ai-kpi-value">{p.passed} / {p.total}</span>
          <span className="ai-help">Duración {p.duration} · latencia p95 {p.p95}</span>
        </div>
      </div>
      {p.failedCases && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <button type="button" className="ai-acc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Casos fallidos<ChevronDown {...ICON} className="ai-acc-chev" style={{ transform: open ? "rotate(180deg)" : undefined }} /></button>
          {open && p.failedCases}
        </div>
      )}
    </div>
  );
}

/** Progreso de una evaluación en curso (la pantalla se refresca cada 5 s mientras evalúa). */
export const EvalProgress = ({ done, total }: { done: number; total: number }) => (
  <div style={{ width: 140 }}>
    <div className="ai-progress" role="progressbar" aria-valuenow={done} aria-valuemax={total}><span style={{ width: `${(done / total) * 100}%` }} /></div>
    <span className="ai-help">{done} / {total} casos</span>
  </div>
);

/* ───── Secreto de un solo uso (contraseña temporal, código de instalación) ───── */
export function OneTimeSecret({ title, value, help = "Se muestra una sola vez. Cópialo ahora y entrégalo por un canal seguro." }: { title: string; value: string; help?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ai-secret" role="status">
      <span className="ai-modal-icon"><KeyRound {...ICON} size={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div className="ai-help" style={{ color: "var(--primary-soft-ink)" }}>{help}</div>
      </div>
      <span className="ai-secret-value">{value}</span>
      <Button variant="primary" icon={Copy} onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); }}>{copied ? "Copiado" : "Copiar"}</Button>
    </div>
  );
}
