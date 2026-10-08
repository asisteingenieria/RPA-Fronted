/**
 * Chat de SOLO LECTURA de una conversación real (Trazabilidad → detalle, D-002). Mismo formato que
 * WhatsAppPreview y, bajo cada respuesta del robot, el estado del envío en Abaya, los intentos y el
 * tiempo de respuesta. Los eventos (plan ofrecido, consentimiento, transferencia…) se intercalan
 * por hora como pastillas.
 */
import { Fragment, useMemo, type ReactNode } from 'react';
import { AlertTriangle, CheckCheck, CheckCircle2, Info, Lock, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderWhatsApp } from '@/lib/text-format';
import { formatTime } from '@/lib/format';
import { EVENT_INFO } from '@/lib/tipificaciones';
import type { TraceEvent, TraceMessage } from '@/lib/api';
import { ICON } from '../common';
import { DeliveryState } from './parts';
import mark from '@/assets/asiste-mark.png';

const EVENT_UI: Record<'ok' | 'info' | 'warn', { icon: LucideIcon; cls: string }> = {
  ok: { icon: CheckCircle2, cls: 'bg-success-soft text-success' },
  info: { icon: Info, cls: 'bg-primary-soft text-primary-soft-ink' },
  warn: { icon: AlertTriangle, cls: 'bg-warning-soft text-warning' },
};

type Row = { t: number; kind: 'msg'; m: TraceMessage } | { t: number; kind: 'event'; e: TraceEvent };

export function TraceChat({
  messages,
  events,
  title,
  subtitle,
  empty,
  height = 1000,
  badge,
}: {
  messages: TraceMessage[];
  events: TraceEvent[];
  title: string;
  subtitle: string;
  empty?: ReactNode;
  height?: number;
  badge?: ReactNode;
}) {
  const rows = useMemo<Row[]>(
    () =>
      [
        ...messages.map((m) => ({ t: Date.parse(m.sentAt), kind: 'msg' as const, m })),
        ...events.map((e) => ({ t: Date.parse(e.at), kind: 'event' as const, e })),
      ].sort((a, b) => a.t - b.t || (a.kind === b.kind ? 0 : a.kind === 'msg' ? -1 : 1)),
    [messages, events],
  );

  let prev: string | null = null;
  return (
    <div className="ai-wa flex min-w-0 flex-col overflow-hidden rounded-lg border bg-wa-wallpaper" style={{ height }}>
      <div className="flex items-center gap-2.5 bg-wa-header px-3.5 py-2.5 text-wa-ink">
        <div className="grid size-[34px] shrink-0 place-items-center overflow-hidden rounded-full bg-surface-100">
          <img src={mark} alt="" className="w-[22px]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] leading-[18px] font-semibold">{title}</div>
          <div className="truncate text-xs leading-[15px] text-wa-meta">{subtitle}</div>
        </div>
        <div className="ml-auto shrink-0">
          {badge ?? (
            <span className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-wa-meta">
              <Lock {...ICON} className="size-[13px]" aria-hidden />
              Solo lectura
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-auto px-4 py-3.5" role="log" aria-label="Mensajes de la conversación">
        {rows.length === 0 && empty && <div className="m-auto max-w-[320px] text-center font-sans text-[13px] text-wa-meta">{empty}</div>}
        {rows.map((r, i) => {
          if (r.kind === 'event') {
            prev = null;
            const info = EVENT_INFO[r.e.kind] ?? { label: () => r.e.kind, tone: 'info' as const };
            const E = EVENT_UI[info.tone];
            return (
              <div
                key={`e${i}`}
                className={cn(
                  'my-2 inline-flex max-w-[90%] items-center gap-1.5 self-center rounded-full px-3 py-[5px] text-center font-sans text-xs leading-4 font-semibold shadow-[var(--shadow-bubble)]',
                  E.cls,
                )}
              >
                <E.icon {...ICON} className="size-[13px] shrink-0" aria-hidden />
                {info.label(r.e.detail)}
                <span className="font-medium opacity-75 tabular-nums">· {formatTime(r.e.at)}</span>
              </div>
            );
          }
          const m = r.m;
          const first = m.from !== prev;
          prev = m.from;
          return (
            <Fragment key={m.id}>
              <div className={cn('ai-wa-msg', m.from, first && i > 0 && 'first')}>
                <span className="sr-only">{m.from === 'client' ? 'Cliente: ' : 'Robot: '}</span>
                {m.text ? renderWhatsApp(m.text) : <i className="text-wa-meta">(no se pudo descifrar)</i>}
                <span className="ai-wa-time tabular-nums">
                  {formatTime(m.sentAt)}
                  {m.from === 'client' && <CheckCheck size={14} strokeWidth={1.75} aria-hidden />}
                </span>
              </div>
              {m.from === 'bot' && m.delivery && (
                <div className="mx-0.5 my-0.5 self-start">
                  <DeliveryState status={m.delivery.status} attempts={m.delivery.attempts} responseMs={m.responseMs} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
