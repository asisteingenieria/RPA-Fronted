/**
 * Chat de simulación (Agente → Probar agente). Es la ÚNICA vista con texto de mensajes:
 * es texto de prueba, nunca datos reales de clientes.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCheck, CheckCircle2, AlertTriangle, Info, Lock, Send, type LucideIcon } from "lucide-react";
import { Callout, cx, ICON } from "../ui";

export type ReplyOrigin = "plantilla" | "modelo" | "regenerado" | "segura" | "error";
const ORIGIN_LABEL: Record<ReplyOrigin, string> = {
  plantilla: "plantilla del sistema",
  modelo: "modelo · validado",
  regenerado: "modelo · regenerado 1 vez",
  segura: "respuesta segura",
  error: "proveedor con error",
};

export type ChatItem =
  | { kind: "msg"; from: "client" | "bot"; text: string; time: string; origin?: ReplyOrigin; meta?: string }
  | { kind: "event"; text: string; tone: "ok" | "info" | "warn"; icon?: LucideIcon };

/** Formato WhatsApp: *negrita* (UN asterisco), _cursiva_, ~tachado~; saltos de línea por CSS (pre-wrap). */
export function renderWhatsApp(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, k = 0;
  for (const m of text.matchAll(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g)) {
    const i = m.index ?? 0, t = m[0];
    if (i > last) out.push(text.slice(last, i));
    const inner = t.slice(1, -1);
    out.push(t[0] === "*" ? <b key={k++}>{inner}</b> : t[0] === "_" ? <i key={k++}>{inner}</i> : <s key={k++}>{inner}</s>);
    last = i + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const EVENT_ICON: Record<"ok" | "info" | "warn", LucideIcon> = { ok: CheckCircle2, info: Info, warn: AlertTriangle };

interface Props {
  items: ChatItem[];
  avatarSrc: string; // asiste-mark.png
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  typing?: boolean;
  /** Texto del aviso cuando la conversación terminó (transferencia, soporte, cierre, escalado). */
  lockedReason?: string;
  sending?: boolean;
  onSend?: (text: string) => void;
  height?: number | string;
}

export function WhatsAppPreview({ items, avatarSrc, title = "Sofía · Claro Móvil", subtitle = "Simulación · no toca Abaya", badge, typing, lockedReason, sending, onSend, height = 560 }: Props) {
  const body = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [items.length, typing]);
  let prev: string | null = null;

  return (
    <div className="ai-wa" style={{ height }}>
      <div className="ai-wa-head">
        <div className="ai-wa-avatar"><img src={avatarSrc} alt="" /></div>
        <div>
          <div className="ai-wa-name">{title}</div>
          <div className="ai-wa-sub">{typing ? "escribiendo…" : subtitle}</div>
        </div>
        {badge && <div style={{ marginLeft: "auto" }}>{badge}</div>}
      </div>

      <div ref={body} className="ai-wa-body" aria-live="polite">
        {items.map((it, i) => {
          if (it.kind === "event") {
            prev = null;
            const I = it.icon ?? EVENT_ICON[it.tone];
            return <div key={i} className={`ai-wa-event ${it.tone}`}><I {...ICON} size={13} />{it.text}</div>;
          }
          const first = it.from !== prev;
          prev = it.from;
          return (
            <Fragment key={i}>
              <div className={cx("ai-wa-msg", it.from, first && i > 0 && "first")}>
                {renderWhatsApp(it.text)}
                <span className="ai-wa-time">{it.time}{it.from === "client" && <CheckCheck size={14} strokeWidth={1.75} />}</span>
              </div>
              {it.from === "bot" && it.origin && (
                <div className="ai-wa-origin">
                  <span className={`tag ${it.origin}`}>{ORIGIN_LABEL[it.origin]}</span>
                  {it.meta && <span>{it.meta}</span>}
                </div>
              )}
            </Fragment>
          );
        })}
        {typing && <div className="ai-wa-msg bot first" aria-label="El agente está escribiendo"><span className="ai-typing"><i /><i /><i /></span></div>}
      </div>

      {lockedReason ? (
        <div className="ai-wa-locked"><Callout tone="info" icon={Lock}>{lockedReason}</Callout></div>
      ) : (
        <form className="ai-wa-input" onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (t && onSend && !sending) { onSend(t); setDraft(""); } }}>
          <input className="ai-wa-field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe como cliente…" aria-label="Mensaje del cliente de prueba" disabled={!onSend || sending} style={{ border: 0, outline: "none", color: "var(--wa-ink)" }} />
          <button type="submit" className="ai-wa-send" aria-label="Enviar" disabled={!onSend || sending || !draft.trim()} style={{ border: 0, cursor: "pointer" }}><Send {...ICON} /></button>
        </form>
      )}
    </div>
  );
}
