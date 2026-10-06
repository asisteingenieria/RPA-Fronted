import { useEffect, useRef, type ReactNode } from "react";
import { CheckCheck, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderWhatsApp } from "@/lib/whatsapp-format";

export interface WhatsAppMessage {
  from: "bot" | "client";
  text: string;
  time?: string;
}

interface Props {
  messages: WhatsAppMessage[];
  typing?: boolean;
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  /** Valores de ejemplo para [Nombre], {{PLANES}}… Sin valor se ven como chip. */
  vars?: Record<string, string>;
  /** Campo de escritura (simulador). Si se pasa onSend el campo es real. */
  input?: boolean;
  onSend?: (text: string) => void;
  className?: string;
}

/**
 * Vista previa de WhatsApp: muestra EXACTAMENTE lo que recibe el cliente.
 * Sofía a la izquierda (wa-in), cliente a la derecha (wa-out).
 */
export function WhatsAppPreview({ messages, typing, title = "Sofía · Claro", subtitle = "en línea", badge, vars, input = true, onSend, className }: Props) {
  let prev: WhatsAppMessage["from"] | null = null;
  // Baja al último mensaje cuando llega uno nuevo (simulador).
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border bg-wa-wallpaper font-wa", className)}>
      <div className="flex items-center gap-2.5 bg-wa-header px-3.5 py-2.5 text-wa-ink">
        <div className="grid size-[34px] place-items-center rounded-full bg-wa-out text-sm font-semibold">S</div>
        <div>
          <div className="text-[14.5px] font-semibold leading-[18px]">{title}</div>
          <div className="text-xs leading-[15px] text-wa-meta">{typing ? "escribiendo…" : subtitle}</div>
        </div>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>

      <div ref={scroller} className="flex flex-1 flex-col gap-1 overflow-auto px-4 py-3.5" aria-live="polite">
        <div className="mb-2 self-center rounded-lg bg-wa-in px-2.5 py-1 text-xs text-wa-meta shadow-[0_1px_.5px_rgba(11,20,26,.13)]">HOY</div>
        {messages.map((m, i) => {
          const first = m.from !== prev;
          prev = m.from;
          return (
            <div
              key={i}
              className={cn(
                "relative max-w-[82%] whitespace-pre-wrap break-words rounded-lg pb-2 pl-[9px] pr-2 pt-1.5 text-[14.2px] leading-[19px] text-wa-ink shadow-[0_1px_.5px_rgba(11,20,26,.13)]",
                m.from === "bot" ? "self-start rounded-tl-none bg-wa-in" : "self-end rounded-tr-none bg-wa-out",
                first && i > 0 && "mt-2",
              )}
            >
              {renderWhatsApp(m.text, { vars })}
              <span className="float-right -mb-1 ml-2.5 mt-1.5 inline-flex items-center gap-[3px] text-[11px] leading-[15px] text-wa-meta">
                {m.time ?? "14:32"}
                {m.from === "client" && <CheckCheck className="size-3.5" aria-hidden />}
              </span>
            </div>
          );
        })}
        {typing && (
          <div className="mt-2 self-start rounded-lg rounded-tl-none bg-wa-in px-3 py-2.5" aria-label="Sofía está escribiendo">
            <span className="flex gap-[3px]">
              {[0, 1, 2].map((d) => (
                <i key={d} className="size-1.5 animate-pulse rounded-full bg-wa-meta" style={{ animationDelay: `${d * 0.2}s` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      {input && (
        <form
          className="flex items-center gap-2 bg-wa-header px-2.5 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget.elements.namedItem("msg") as HTMLInputElement;
            if (f.value.trim() && onSend) onSend(f.value.trim());
            f.value = "";
          }}
        >
          <input
            name="msg"
            disabled={!onSend}
            placeholder="Escribe como cliente…"
            className="h-[38px] flex-1 rounded-lg bg-wa-in px-3 text-sm text-wa-ink placeholder:text-wa-meta focus-visible:outline-2"
          />
          <button type="submit" disabled={!onSend} aria-label="Enviar" className="grid size-[38px] place-items-center rounded-full bg-wa-out text-wa-ink">
            <SendHorizontal className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}
