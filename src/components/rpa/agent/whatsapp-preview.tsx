/**
 * Chat de simulación (Agente → Probar agente). Es la ÚNICA vista con texto de mensajes: es texto de
 * prueba escrito en el panel, nunca datos reales de clientes.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCheck, CheckCircle2, Info, Lock, Send, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderWhatsApp } from '@/lib/text-format';
import { Callout, ICON } from '../common';
import mark from '@/assets/asiste-mark.png';

export type ReplyOrigin = 'plantilla' | 'modelo' | 'regenerado' | 'segura' | 'error';
export const ORIGIN_LABEL: Record<ReplyOrigin, string> = {
  plantilla: 'plantilla del sistema',
  modelo: 'modelo · validado',
  regenerado: 'modelo · regenerado 1 vez',
  segura: 'respuesta segura',
  error: 'proveedor con error',
};
const ORIGIN_CLS: Record<ReplyOrigin, string> = {
  plantilla: 'bg-cat-tyt-soft text-cat-tyt',
  modelo: 'bg-cat-tecnologia-soft text-cat-tecnologia',
  regenerado: 'bg-warning-soft text-warning',
  segura: 'bg-warning-soft text-warning',
  error: 'bg-danger-soft text-danger',
};

export type ChatItem =
  | { kind: 'msg'; from: 'client' | 'bot'; text: string; time: string; origin?: ReplyOrigin; meta?: string }
  | { kind: 'event'; text: string; tone: 'ok' | 'info' | 'warn' };

const EVENT: Record<'ok' | 'info' | 'warn', { icon: LucideIcon; cls: string }> = {
  ok: { icon: CheckCircle2, cls: 'bg-success-soft text-success' },
  info: { icon: Info, cls: 'bg-primary-soft text-primary-soft-ink' },
  warn: { icon: AlertTriangle, cls: 'bg-warning-soft text-warning' },
};

interface Props {
  items: ChatItem[];
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  typing?: boolean;
  /** Aviso cuando la conversación terminó (transferencia, soporte, cierre, escalado). */
  lockedReason?: string;
  sending?: boolean;
  onSend?: (text: string) => void;
  empty?: ReactNode;
  className?: string;
  height?: number;
}

export function WhatsAppPreview({ items, title, subtitle = 'Simulación · no toca Abaya', badge, typing, lockedReason, sending, onSend, empty, className, height = 560 }: Props) {
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [items.length, typing]);
  useEffect(() => {
    if (!sending) input.current?.focus({ preventScroll: true });
  }, [sending]);
  let prev: string | null = null;

  return (
    <div className={cn('ai-wa flex min-w-0 flex-col overflow-hidden rounded-lg border bg-wa-wallpaper', className)} style={{ height }}>
      <div className="flex items-center gap-2.5 bg-wa-header px-3.5 py-2.5 text-wa-ink">
        <div className="grid size-[34px] shrink-0 place-items-center overflow-hidden rounded-full bg-surface-100">
          <img src={mark} alt="" className="w-[22px]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] leading-[18px] font-semibold">{title}</div>
          <div className="text-xs leading-[15px] text-wa-meta">{typing ? 'escribiendo…' : subtitle}</div>
        </div>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>

      <div ref={body} className="flex flex-1 flex-col gap-1 overflow-auto px-4 py-3.5" aria-live="polite">
        {items.length === 0 && empty && <div className="m-auto max-w-[280px] text-center text-[13px] text-wa-meta">{empty}</div>}
        {items.map((it, i) => {
          if (it.kind === 'event') {
            prev = null;
            const E = EVENT[it.tone];
            return (
              <div key={i} className={cn('my-2 inline-flex items-center gap-1.5 self-center rounded-full px-3 py-[5px] font-sans text-xs leading-4 font-semibold shadow-[var(--shadow-bubble)]', E.cls)}>
                <E.icon {...ICON} className="size-[13px]" aria-hidden />
                {it.text}
              </div>
            );
          }
          const first = it.from !== prev;
          prev = it.from;
          return (
            <Fragment key={i}>
              <div className={cn('ai-wa-msg', it.from, first && i > 0 && 'first')}>
                <span className="sr-only">{it.from === 'client' ? 'Cliente: ' : 'Agente: '}</span>
                {renderWhatsApp(it.text)}
                <span className="ai-wa-time">
                  {it.time}
                  {it.from === 'client' && <CheckCheck size={14} strokeWidth={1.75} aria-hidden />}
                </span>
              </div>
              {it.from === 'bot' && it.origin && (
                <div className="mx-0.5 my-0.5 inline-flex items-center gap-1.5 self-start font-sans text-[11px] leading-[14px] font-semibold text-wa-meta">
                  <span className={cn('rounded-full px-[7px] py-px', ORIGIN_CLS[it.origin])}>{ORIGIN_LABEL[it.origin]}</span>
                  {it.meta && <span>{it.meta}</span>}
                </div>
              )}
            </Fragment>
          );
        })}
        {typing && (
          <div className="ai-wa-msg bot first" aria-label="El agente está escribiendo">
            <span className="ai-typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      {lockedReason ? (
        <div className="bg-wa-header px-3 py-2.5">
          <Callout tone="info" icon={Lock}>
            {lockedReason}
          </Callout>
        </div>
      ) : (
        <form
          className="flex items-center gap-2 bg-wa-header px-2.5 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = draft.trim();
            if (t && onSend && !sending) {
              onSend(t);
              setDraft('');
            }
          }}
        >
          <input
            ref={input}
            className="h-[38px] min-w-0 flex-1 rounded-lg bg-wa-in px-3 text-sm text-wa-ink outline-none placeholder:text-wa-meta focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]"
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe como cliente…"
            aria-label="Mensaje del cliente de prueba"
            disabled={!onSend || sending}
          />
          <button
            type="submit"
            className="grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Enviar"
            disabled={!onSend || sending || !draft.trim()}
          >
            <Send {...ICON} className="size-4" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
