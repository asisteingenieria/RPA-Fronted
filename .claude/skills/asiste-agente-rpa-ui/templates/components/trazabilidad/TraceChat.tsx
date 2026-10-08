/**
 * Chat de SOLO LECTURA de una conversación real (Trazabilidad → detalle).
 * Reutiliza el formato de WhatsAppPreview (renderWhatsApp) y agrega, bajo cada respuesta del
 * robot, el estado del envío en Abaya, los intentos y el tiempo de respuesta. Los eventos
 * (plan ofrecido, consentimiento, transferencia…) se intercalan por hora como pastillas.
 */
import { Fragment, useMemo, type ReactNode } from "react";
import { CheckCheck, CheckCircle2, Info, AlertTriangle, Lock, type LucideIcon } from "lucide-react";
import { renderWhatsApp } from "../agente/WhatsAppPreview";
import { cx, ICON } from "../ui";
import { DeliveryState } from "./TraceParts";
import { EVENT_INFO } from "../../../lib/tipificaciones";
import { formatTime } from "../../../lib/format";
import type { TraceEvent, TraceMessage } from "../../../lib/trazabilidad-api";

const EVENT_ICON: Record<"ok" | "info" | "warn", LucideIcon> = { ok: CheckCircle2, info: Info, warn: AlertTriangle };

type Row = { t: number; kind: "msg"; m: TraceMessage } | { t: number; kind: "event"; e: TraceEvent };

export function TraceChat({ messages, events, avatarSrc, title, subtitle, height = 1000, badge }: {
  messages: TraceMessage[]; events: TraceEvent[]; avatarSrc: string; title: string; subtitle: string; height?: number | string; badge?: ReactNode;
}) {
  const rows = useMemo<Row[]>(() => [
    ...messages.map((m) => ({ t: Date.parse(m.sentAt), kind: "msg" as const, m })),
    ...events.map((e) => ({ t: Date.parse(e.at), kind: "event" as const, e })),
  ].sort((a, b) => a.t - b.t || (a.kind === b.kind ? 0 : a.kind === "msg" ? -1 : 1)), [messages, events]);

  let prev: string | null = null;
  return (
    <div className="ai-wa" style={{ height }}>
      <div className="ai-wa-head">
        <div className="ai-wa-avatar"><img src={avatarSrc} alt="" /></div>
        <div><div className="ai-wa-name">{title}</div><div className="ai-wa-sub">{subtitle}</div></div>
        <div style={{ marginLeft: "auto" }}>{badge ?? <span className="ai-badge ai-badge--neutral"><Lock {...ICON} size={13} />Solo lectura</span>}</div>
      </div>
      <div className="ai-wa-body">
        {rows.map((r, i) => {
          if (r.kind === "event") {
            prev = null;
            const info = EVENT_INFO[r.e.kind];
            const I = EVENT_ICON[info.tone];
            return <div key={`e${i}`} className={`ai-wa-event ${info.tone}`}><I {...ICON} size={13} />{info.label(r.e.detail)}</div>;
          }
          const m = r.m, first = m.from !== prev;
          prev = m.from;
          return (
            <Fragment key={m.id}>
              <div className={cx("ai-wa-msg", m.from, first && i > 0 && "first")}>
                {renderWhatsApp(m.text)}
                <span className="ai-wa-time">{formatTime(m.sentAt)}{m.from === "client" && <CheckCheck size={14} strokeWidth={1.75} />}</span>
              </div>
              {m.from === "bot" && m.delivery && (
                <div className="ai-wa-origin"><DeliveryState status={m.delivery.status} attempts={m.delivery.attempts} responseMs={m.responseMs} /></div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
