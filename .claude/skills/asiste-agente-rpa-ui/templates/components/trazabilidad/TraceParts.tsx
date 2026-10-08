/**
 * Trazabilidad — piezas visuales. Usan las clases ai-* de components.css + styles/trazabilidad.css.
 * Ajusta las rutas de import a la ubicación real en src/components/rpa/.
 */
import { useState, type ReactNode } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronRight, Copy, Eye, Check, Plus, RotateCcw, Filter, Timer, XCircle, type LucideIcon,
} from "lucide-react";
import { cx, ICON } from "../ui";
import {
  DELIVERY_LABEL, FLAG_INFO, TIPIFICACION, TIPIFICACION_ORDER,
  type DeliveryStatus, type Tipificacion, type TraceFlag,
} from "../../../lib/tipificaciones";
import { formatDuration } from "../../../lib/format";

/* ───── Tipificación: siempre texto (+ código opcional); el color nunca va solo ───── */
export function Typification({ code, short, showCode }: { code: Tipificacion; short?: boolean; showCode?: boolean }) {
  const t = TIPIFICACION[code];
  return (
    <span className={cx("ai-badge", `ai-badge--${t.tone}`)} title={code}>
      <span className={cx("ai-dot", code === "ACTIVE" && "ai-dot--pulse")} />
      {short ? t.short : t.label}
      {showCode && <span className="ai-tip-code">{code}</span>}
    </span>
  );
}

const pct = (n: number, total: number) => (total ? (Math.round((n / total) * 1000) / 10).toLocaleString("es-CO") : "0") + " %";

/* ───── Barra apilada de tipificaciones con leyenda (conteo + %) ───── */
export function TypificationBar({ counts, thin, legend = true }: { counts: Partial<Record<Tipificacion, number>>; thin?: boolean; legend?: boolean }) {
  const items = TIPIFICACION_ORDER.map((code) => ({ code, count: counts[code] ?? 0 }));
  const total = items.reduce((a, b) => a + b.count, 0);
  const aria = items.filter((i) => i.count).map((i) => `${TIPIFICACION[i.code].short} ${i.count}`).join(", ") || "Sin conversaciones";
  return (
    <div className="ai-tipbar-wrap">
      <div className={cx("ai-tipbar", thin && "is-thin")} role="img" aria-label={aria}>
        {items.filter((i) => i.count > 0).map((i) => (
          <span key={i.code} title={`${TIPIFICACION[i.code].label} · ${i.count}`} style={{ flexGrow: i.count, background: TIPIFICACION[i.code].color }} />
        ))}
      </div>
      {legend && (
        <div className="ai-tipbar-legend">
          {items.map((i) => (
            <span key={i.code} className={i.count ? undefined : "is-zero"}>
              <i style={{ background: TIPIFICACION[i.code].color }} />
              {TIPIFICACION[i.code].short}
              <b className="ai-num">{i.count}</b>
              <small className="ai-num">{pct(i.count, total)}</small>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Recorrido real de etapas (repite etapas si volvió atrás) + salida ───── */
export function StageTrail({ path, exit }: { path: string[]; exit?: { code: Tipificacion; label?: string } }) {
  return (
    <ol className="ai-trail" aria-label="Recorrido de etapas">
      {path.map((s, i) => {
        const back = i > 0 && path.indexOf(s) < i;
        const Sep = back ? RotateCcw : ChevronRight;
        return (
          <li key={i} className={cx(back && "is-back", !exit && i === path.length - 1 && "is-now")} aria-current={!exit && i === path.length - 1 ? "step" : undefined}>
            {i > 0 && <Sep {...ICON} size={13} className="ai-trail-sep" aria-label={back ? "volvió a" : undefined} />}
            <span>{s}</span>
          </li>
        );
      })}
      {exit && (
        <li className={cx("is-exit", `is-${TIPIFICACION[exit.code].tone}`)}>
          <ChevronRight {...ICON} size={13} className="ai-trail-sep" />
          <span>{exit.label ?? TIPIFICACION[exit.code].short}</span>
        </li>
      )}
    </ol>
  );
}

/* ───── Estado de un envío del robot + tiempo de respuesta ───── */
const DELIVERY_UI: Record<DeliveryStatus, { cls: string; icon: LucideIcon }> = {
  VERIFIED: { cls: "ok", icon: CheckCircle2 },
  UNCERTAIN: { cls: "warn", icon: AlertTriangle },
  FAILED: { cls: "err", icon: XCircle },
};
export function DeliveryState({ status, attempts = 1, responseMs }: { status: DeliveryStatus; attempts?: number; responseMs?: number | null }) {
  const d = DELIVERY_UI[status];
  return (
    <span className={`ai-delivery ${d.cls}`} title="Estado del envío en Abaya">
      <d.icon {...ICON} size={12} />
      {DELIVERY_LABEL[status]}
      {attempts > 1 && <span className="ai-num"> · {attempts} intentos</span>}
      {responseMs != null && (
        <span className="ai-num ai-delivery-rt" title="Desde que llegó el mensaje del cliente hasta que Abaya confirmó el envío">
          <Timer {...ICON} size={12} />{formatDuration(responseMs)}
        </span>
      )}
    </span>
  );
}

/* ───── Id del chat de Abaya (mono) con Copiar ───── */
export function ChatId({ id }: { id: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(id); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* sin permiso de portapapeles */ } };
  const I = ok ? Check : Copy;
  return (
    <span className="ai-chatid">
      {id}
      <button type="button" className="ai-icon-btn" onClick={copy} title={ok ? "Copiado" : "Copiar id del chat"} aria-label={ok ? "Copiado" : "Copiar id del chat"}>
        <I {...ICON} size={14} className="ai-ic" />
      </button>
    </span>
  );
}

/* ───── Íconos de alerta de una fila (con aria-label; nunca solo color) ───── */
const FLAG_ICON: Record<TraceFlag, LucideIcon> = { UNCERTAIN_SEND: AlertTriangle, REVIEW: Eye, REGENERATED: RotateCcw };
export function AlertFlags({ flags }: { flags: TraceFlag[] }) {
  if (!flags.length) return <span className="ai-muted">—</span>;
  return (
    <span className="ai-flags">
      {flags.map((f) => { const I = FLAG_ICON[f]; return (
        <span key={f} className={`ai-flag ${FLAG_INFO[f].cls}`} title={FLAG_INFO[f].label} role="img" aria-label={FLAG_INFO[f].label}><I {...ICON} size={14} /></span>
      ); })}
    </span>
  );
}

/* ───── Chip de filtro (abre el popover que ya use el proyecto) ───── */
export function FilterChip({ label, count, onClick }: { label: string; count?: number; onClick: () => void }) {
  const on = !!count;
  const I = on ? Filter : Plus;
  return (
    <button type="button" className={cx("ai-filter", on && "is-on")} onClick={onClick} aria-pressed={on}>
      <I {...ICON} size={14} />{label}{on ? `: ${count}` : ""}
    </button>
  );
}

/* ───── Skeleton con forma ───── */
export const Skel = ({ w, h = 12 }: { w: number | string; h?: number }) => <span className="ai-skel" style={{ width: w, height: h }} aria-hidden />;

/* ───── Celda de dos líneas (valor + subtexto) ───── */
export const Two = ({ top, sub }: { top: ReactNode; sub?: ReactNode }) => (
  <>{top}{sub != null && <span className="ai-sub">{sub}</span>}</>
);
