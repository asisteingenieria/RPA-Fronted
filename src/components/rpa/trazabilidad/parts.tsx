/**
 * Trazabilidad — piezas visuales (kit asiste-agente-rpa-ui, templates/components/trazabilidad).
 * Tipificaciones y estados siempre con texto; el color nunca va solo.
 */
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Filter,
  Plus,
  RotateCcw,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/auth/session';
import { viewConversationsReason } from '@/lib/roles';
import { formatDuration, formatInt, formatPct } from '@/lib/format';
import {
  DELIVERY_LABEL,
  FLAG_INFO,
  TIPIFICACION,
  TIPIFICACION_ORDER,
  type DeliveryStatus,
  type TipTone,
  type Tipificacion,
  type TraceFlag,
} from '@/lib/tipificaciones';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ICON } from '../common';

const BADGE: Record<TipTone, { variant: 'success' | 'neutral' | 'outline' | 'danger' | 'info' | 'warning'; cls?: string }> = {
  success: { variant: 'success' },
  neutral: { variant: 'neutral' },
  outline: { variant: 'outline' },
  danger: { variant: 'danger' },
  info: { variant: 'info' },
  warning: { variant: 'warning' },
  tyt: { variant: 'neutral', cls: 'bg-cat-tyt-soft text-cat-tyt' },
};

/** Tipificación de una conversación: nombre en español (+ código en el detalle). */
export function Typification({ code, short, showCode }: { code: Tipificacion; short?: boolean; showCode?: boolean }) {
  const t = TIPIFICACION[code] ?? { label: code, short: code, tone: 'neutral' as const };
  const b = BADGE[t.tone];
  return (
    <Badge variant={b.variant} className={b.cls} title={showCode ? undefined : code}>
      <span className={cn('ai-dot', code === 'ACTIVE' && 'ai-dot--pulse')} aria-hidden />
      {short ? t.short : t.label}
      {showCode && <span className="ml-1 font-medium opacity-70">{code}</span>}
    </Badge>
  );
}

const pct = (n: number, total: number) => formatPct(total ? (n / total) * 100 : 0);

/** Barra apilada de tipificaciones con leyenda (conteo + %). */
export function TypificationBar({
  counts,
  thin,
  legend = true,
}: {
  counts: Partial<Record<Tipificacion, number>>;
  thin?: boolean;
  legend?: boolean;
}) {
  const items = TIPIFICACION_ORDER.map((code) => ({ code, count: counts[code] ?? 0 }));
  const total = items.reduce((a, b) => a + b.count, 0);
  const aria = items
    .filter((i) => i.count)
    .map((i) => `${TIPIFICACION[i.code].short} ${i.count}`)
    .join(', ');
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div
        className={cn('flex gap-0.5 overflow-hidden rounded-full bg-surface-200', thin ? 'h-2 min-w-[120px]' : 'h-3.5')}
        role="img"
        aria-label={aria || 'Sin conversaciones'}
      >
        {items
          .filter((i) => i.count > 0)
          .map((i) => (
            <span
              key={i.code}
              title={`${TIPIFICACION[i.code].label} · ${i.count}`}
              className="block min-w-1"
              style={{ flexGrow: i.count, background: TIPIFICACION[i.code].color }}
            />
          ))}
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs leading-4 text-ink-muted">
          {items.map((i) => (
            <span key={i.code} className={cn('inline-flex items-center gap-1.5', !i.count && 'opacity-55')}>
              <i className="inline-block size-2.5 rounded-[3px]" style={{ background: TIPIFICACION[i.code].color }} aria-hidden />
              {TIPIFICACION[i.code].short}
              <b className="font-semibold text-ink tabular-nums">{formatInt(i.count)}</b>
              <small className="text-xs text-ink-subtle tabular-nums">{pct(i.count, total)}</small>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const EXIT_CLS: Record<TipTone, string> = {
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-primary-soft text-primary-soft-ink',
  tyt: 'bg-cat-tyt-soft text-cat-tyt',
  neutral: 'bg-surface-200 text-ink-muted',
  outline: 'bg-surface-200 text-ink-muted',
};

/** Recorrido de etapas (repite una etapa si volvió atrás) y la salida. */
export function StageTrail({ path, exit }: { path: string[]; exit?: Tipificacion }) {
  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 gap-y-1.5 p-0" aria-label="Recorrido de etapas">
      {path.map((s, i) => {
        const back = i > 0 && path.indexOf(s) < i;
        const now = !exit && i === path.length - 1;
        const Sep = back ? RotateCcw : ChevronRight;
        return (
          <li key={i} className="inline-flex items-center gap-1" aria-current={now ? 'step' : undefined}>
            {i > 0 && (
              <Sep {...ICON} className={cn('size-[13px]', back ? 'text-warning' : 'text-ink-subtle')} aria-label={back ? 'volvió a' : undefined} />
            )}
            <span
              className={cn(
                'inline-flex h-[26px] items-center rounded-sm px-2.5 text-[11px] leading-[14px] font-semibold tracking-[.05em]',
                back ? 'bg-warning-soft text-warning' : now ? 'bg-primary-soft text-primary-soft-ink ring-1 ring-primary ring-inset' : 'bg-surface-200 text-ink-muted',
              )}
            >
              {s}
            </span>
          </li>
        );
      })}
      {exit && (
        <li className="inline-flex items-center gap-1">
          <ChevronRight {...ICON} className="size-[13px] text-ink-subtle" aria-hidden />
          <span className={cn('inline-flex h-[26px] items-center rounded-sm px-2.5 text-xs leading-4 font-semibold', EXIT_CLS[TIPIFICACION[exit].tone])}>
            {TIPIFICACION[exit].short}
          </span>
        </li>
      )}
    </ol>
  );
}

const DELIVERY_UI: Record<DeliveryStatus, { cls: string; icon: LucideIcon }> = {
  VERIFIED: { cls: 'bg-success-soft text-success', icon: CheckCircle2 },
  UNCERTAIN: { cls: 'bg-warning-soft text-warning', icon: AlertTriangle },
  FAILED: { cls: 'bg-danger-soft text-danger', icon: XCircle },
  PENDING: { cls: 'bg-surface-200 text-ink-muted', icon: Clock },
};

/** Estado de un envío del robot en Abaya + intentos + tiempo de respuesta. */
export function DeliveryState({ status, attempts = 1, responseMs }: { status: DeliveryStatus; attempts?: number; responseMs?: number | null }) {
  const d = DELIVERY_UI[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-[7px] py-px font-sans text-[11px] leading-[14px] font-semibold', d.cls)}>
      <d.icon {...ICON} className="size-3" aria-hidden />
      {DELIVERY_LABEL[status]}
      {attempts > 1 && <span className="tabular-nums"> · {attempts} intentos</span>}
      {responseMs != null && (
        <span
          className="ml-1.5 inline-flex items-center gap-[3px] border-l border-current pl-1.5 tabular-nums"
          title="Desde que llegó el mensaje del cliente hasta que Abaya confirmó el envío"
        >
          <Timer {...ICON} className="size-3" aria-hidden />
          {formatDuration(responseMs)}
        </span>
      )}
    </span>
  );
}

/** Id del chat de Abaya (monoespaciado) con Copiar. */
export function ChatId({ id, className }: { id: string; className?: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      // sin permiso de portapapeles
    }
  };
  const I = ok ? Check : Copy;
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-[13px] leading-4 font-medium whitespace-nowrap text-ink', className)}>
      {id}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void copy();
        }}
        className="inline-grid size-[26px] cursor-pointer place-items-center rounded-sm text-ink-subtle hover:bg-primary-soft hover:text-primary-soft-ink"
        title={ok ? 'Copiado' : 'Copiar id del chat'}
        aria-label={ok ? 'Copiado' : `Copiar id del chat ${id}`}
      >
        <I {...ICON} className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

const FLAG_ICON: Record<TraceFlag, LucideIcon> = { UNCERTAIN_SEND: AlertTriangle, REVIEW: Eye, REGENERATED: RotateCcw };

/** Íconos de alerta de una fila (con etiqueta accesible y tooltip). */
export function AlertFlags({ flags }: { flags: TraceFlag[] }) {
  if (!flags.length) return <span className="text-ink-subtle">—</span>;
  return (
    <span className="inline-flex gap-1.5">
      {flags.map((f) => {
        const I = FLAG_ICON[f];
        return (
          <Tooltip key={f}>
            <TooltipTrigger asChild>
              <span className={cn('inline-grid size-6 place-items-center rounded-sm', FLAG_INFO[f].cls)} role="img" aria-label={FLAG_INFO[f].label}>
                <I {...ICON} className="size-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>{FLAG_INFO[f].label}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

/** Chip de filtro con su popover de opciones (selección múltiple o única). */
export function FilterChip<T extends string>({
  label,
  options,
  value,
  onChange,
  single,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  single?: boolean;
}) {
  const on = value.length > 0;
  const I = on ? Filter : Plus;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-pressed={on}
          className={cn(
            'inline-flex h-[38px] cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 text-[13px] leading-4 font-medium whitespace-nowrap text-ink-muted hover:text-ink',
            on && 'border-solid border-primary bg-primary-soft font-semibold text-primary-soft-ink hover:text-primary-soft-ink',
          )}
        >
          <I {...ICON} className="size-3.5" aria-hidden />
          <span className="tabular-nums">
            {label}
            {on && `: ${single ? (options.find((o) => o.id === value[0])?.label ?? '') : value.length}`}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5 shadow-pop">
        <div className="flex max-h-72 flex-col overflow-auto" role="group" aria-label={label}>
          {options.length === 0 && <span className="px-2.5 py-2 text-[13px] text-ink-muted">Sin opciones en el rango.</span>}
          {options.map((o) => {
            const checked = value.includes(o.id);
            return (
              <label key={o.id} className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-ink hover:bg-surface-200">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) =>
                    onChange(single ? (c ? [o.id] : []) : c ? [...value, o.id] : value.filter((v) => v !== o.id))
                  }
                />
                {o.label}
              </label>
            );
          })}
        </div>
        {on && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full cursor-pointer rounded-sm border-t px-2.5 py-2 text-left text-[13px] font-semibold text-primary-soft-ink hover:bg-surface-200"
          >
            Quitar filtro
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Id de chat como enlace al detalle en Trazabilidad (En vivo, Robots). Para el OPERADOR queda como
 * texto con el motivo en el tooltip.
 */
export function ChatLink({ chatId }: { chatId: string | null | undefined }) {
  const me = useUser();
  if (!chatId) return <span className="text-ink-subtle">—</span>;
  const reason = viewConversationsReason(me);
  if (reason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="tabular-nums">
            {chatId}
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Link
      to="/trazabilidad/$id"
      params={{ id: chatId }}
      search={{}}
      className="font-semibold text-primary-soft-ink tabular-nums hover:underline"
      title="Ver la conversación en Trazabilidad"
    >
      {chatId}
    </Link>
  );
}
