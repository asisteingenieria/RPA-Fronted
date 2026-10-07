/**
 * Primitivas del panel (kit asiste-agente-rpa-ui) sobre shadcn/ui y los tokens del tema.
 * Reglas: estados siempre con texto, lo que el rol no permite se ve deshabilitado con motivo,
 * acciones con `loading` (sin doble clic), confirmación en lo destructivo.
 */
import { useState, type ComponentProps, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Info, KeyRound, Loader2, RotateCw, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const ICON = { strokeWidth: 1.75 } as const;

/* ───── Encabezado de página ───── */
export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="m-0 font-display text-[26px] leading-8 font-semibold tracking-[-.01em] text-ink">{title}</h1>
        {sub && <p className="mt-1 text-ink-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/* ───── Tarjeta con encabezado ───── */
export function Panel({
  title,
  icon: I,
  badge,
  actions,
  flush,
  className,
  children,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  /** Sin relleno interno: tablas y listas. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('min-w-0 rounded-lg border bg-surface-100 shadow-card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {I && <I {...ICON} className="size-[18px] shrink-0 text-primary-soft-ink" aria-hidden />}
            <h2 className="m-0 font-display text-base leading-[22px] font-semibold text-ink">{title}</h2>
            {badge}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {flush ? children : <div className="p-5">{children}</div>}
    </section>
  );
}

/* ───── KPI ───── */
export function Kpi({
  label,
  value,
  icon: I,
  bar,
  foot,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** 0–100: barra cian (p. ej. cupos ocupados). */
  bar?: number;
  foot?: ReactNode;
  tone?: 'warning' | 'danger';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-lg border bg-surface-100 p-5 shadow-card',
        tone === 'danger' && 'border-danger',
        tone === 'warning' && 'border-warning',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] leading-4 font-medium text-ink-muted">{label}</span>
        {I && (
          <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary-soft-ink">
            <I {...ICON} className="size-[18px]" aria-hidden />
          </span>
        )}
      </div>
      <div
        className={cn(
          'font-display text-[28px] leading-8 font-semibold tracking-[-.01em] text-ink tabular-nums',
          tone === 'danger' && 'text-danger',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </div>
      {bar != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-200" aria-hidden>
          <span className="block h-full rounded-full bg-cyan" style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} />
        </div>
      )}
      {foot && <div className="text-xs leading-4 font-medium text-ink-muted">{foot}</div>}
    </div>
  );
}

/* ───── Contador y campaña ───── */
export const Count = ({ alert, active, children }: { alert?: boolean; active?: boolean; children: ReactNode }) => (
  <span
    className={cn(
      'inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] leading-none font-semibold tabular-nums',
      alert ? 'bg-cyan text-navy' : active ? 'bg-primary text-primary-foreground' : 'bg-surface-200 text-ink-muted',
    )}
  >
    {children}
  </span>
);

/** Campaña en MAYÚSCULAS. El robot es de Asiste; Claro Móvil es la campaña que atiende. */
export const CampaignChip = ({ children = 'Claro Móvil' }: { children?: string }) => (
  <span className="inline-flex h-6 items-center rounded-sm bg-cat-movil-soft px-2.5 text-[11px] leading-[14px] font-semibold tracking-[.04em] text-cat-movil">
    {children.toLocaleUpperCase('es-CO')}
  </span>
);

/* ───── Avisos ───── */
const CALLOUT = {
  info: { cls: 'bg-primary-soft text-primary-soft-ink', Icon: Info },
  warning: { cls: 'bg-warning-soft text-warning', Icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft text-danger', Icon: XCircle },
  success: { cls: 'bg-success-soft text-success', Icon: CheckCircle2 },
};
export function Callout({
  tone = 'info',
  icon,
  className,
  children,
}: {
  tone?: keyof typeof CALLOUT;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  const c = CALLOUT[tone];
  const I = icon ?? c.Icon;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'note'}
      className={cn('flex items-start gap-2.5 rounded-md px-3.5 py-3 text-[13px] leading-[18px]', c.cls, className)}
    >
      <I {...ICON} className="mt-px size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ───── Estados vacío, error y carga ───── */
export function Empty({ icon: I, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center text-ink-muted">
      <span className="grid size-[52px] place-items-center rounded-md bg-primary-soft text-primary-soft-ink">
        <I {...ICON} className="size-[22px]" aria-hidden />
      </span>
      <b className="font-semibold text-ink">{title}</b>
      {children && <div className="max-w-md text-[13px]">{children}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, retrying }: { message: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-[52px] place-items-center rounded-md bg-danger-soft text-danger">
        <XCircle {...ICON} className="size-[22px]" aria-hidden />
      </span>
      <b className="font-semibold text-ink">{message}</b>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} disabled={retrying}>
          <RotateCw {...ICON} className={cn(retrying && 'animate-spin')} aria-hidden />
          Reintentar
        </Button>
      )}
    </div>
  );
}

/** Esqueleto de filas de tabla (carga con la forma del contenido, sin spinner a pantalla completa). */
export function SkeletonRows({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-3 p-5" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-4 bg-surface-200" />
          ))}
        </div>
      ))}
    </div>
  );
}

export const SkeletonCard = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-[120px] rounded-lg bg-surface-200', className)} aria-label="Cargando" />
);

/* ───── Botón con motivo (deshabilitado con explicación) y carga ───── */
export interface ActionButtonProps extends ComponentProps<typeof Button> {
  icon?: LucideIcon;
  /** Si viene, el botón queda deshabilitado y muestra este motivo (p. ej. "Requiere rol ADMIN"). */
  reason?: string;
  loading?: boolean;
}
export function ActionButton({ icon: I, reason, loading, disabled, onClick, children, ...rest }: ActionButtonProps) {
  const off = !!disabled || !!reason || !!loading;
  const btn = (
    <Button
      {...rest}
      aria-disabled={off || undefined}
      aria-busy={loading || undefined}
      onClick={off ? (e) => e.preventDefault() : onClick}
    >
      {loading ? <Loader2 {...ICON} className="animate-spin" aria-hidden /> : I && <I {...ICON} aria-hidden />}
      {children}
    </Button>
  );
  if (!reason) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

/** Botón de solo ícono con etiqueta accesible y tooltip (acciones de fila). */
export function IconAction({
  icon: I,
  label,
  reason,
  onClick,
  danger,
  className,
}: {
  icon: LucideIcon;
  label: string;
  reason?: string;
  onClick?: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-disabled={!!reason || undefined}
          onClick={reason ? undefined : onClick}
          className={cn(
            'inline-grid size-8 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-primary-soft hover:text-primary-soft-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
            danger && 'hover:bg-danger-soft hover:text-danger',
            className,
          )}
        >
          <I {...ICON} className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{reason ? `${label}: ${reason}` : label}</TooltipContent>
    </Tooltip>
  );
}

/* ───── Segmentado ───── */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { id: T; label: string; icon?: LucideIcon; disabled?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-md bg-surface-200 p-[3px]', className)} role="radiogroup" aria-label={label}>
      {items.map(({ id, label: l, icon: I, disabled }) => {
        const active = id === value;
        const btn = (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={!!disabled || undefined}
            onClick={() => !disabled && onChange(id)}
            className={cn(
              'inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[7px] px-3 text-[13px] leading-4 font-medium whitespace-nowrap text-ink-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
              active && 'bg-surface-100 font-semibold text-ink shadow-card',
            )}
          >
            {I && <I {...ICON} className="size-3.5" aria-hidden />}
            {l}
          </button>
        );
        return disabled ? (
          <Tooltip key={id}>
            <TooltipTrigger asChild>{btn}</TooltipTrigger>
            <TooltipContent>{disabled}</TooltipContent>
          </Tooltip>
        ) : (
          btn
        );
      })}
    </div>
  );
}

/* ───── Subpestañas (Agente) ───── */
export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}
export function SubTabs<T extends string>({ items, active, onChange }: { items: TabItem<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
      {items.map(({ id, label, icon: I, count }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={id === active}
          onClick={() => onChange(id)}
          className={cn(
            'ai-subtab relative flex h-[46px] cursor-pointer items-center gap-2 px-3 text-[13px] leading-4 font-medium whitespace-nowrap text-ink-muted',
            id === active && 'font-semibold text-ink',
          )}
        >
          {I && <I {...ICON} className="size-[15px]" aria-hidden />}
          {label}
          {count != null && <Count active={id === active}>{count}</Count>}
        </button>
      ))}
    </div>
  );
}

/* ───── Confirmación (acciones destructivas o sensibles) ───── */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown> | void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // el error lo informa quien llama (toast); el diálogo sigue abierto
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent className="sm:max-w-[440px]">
        <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-md',
              danger ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary-soft-ink',
            )}
          >
            <AlertTriangle {...ICON} className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <AlertDialogTitle className="font-display text-lg leading-6 font-semibold">{title}</AlertDialogTitle>
            {description && <AlertDialogDescription className="text-[13px] leading-[18px] text-ink-muted">{description}</AlertDialogDescription>}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary" disabled={busy}>
            Cancelar
          </AlertDialogCancel>
          <ActionButton variant={danger ? 'destructive' : 'default'} loading={busy} onClick={() => void run()} autoFocus>
            {confirmLabel}
          </ActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ───── Secreto de un solo uso (contraseña temporal, código de instalación) ───── */
export function OneTimeSecret({
  title,
  value,
  help = 'Se muestra una sola vez. Cópialo ahora y entrégalo por un canal seguro.',
  onDismiss,
}: {
  title: string;
  value: string;
  help?: string;
  onDismiss?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="flex flex-wrap items-center gap-4 rounded-lg border-[1.5px] border-primary bg-primary-soft px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-100 text-primary-soft-ink">
        <KeyRound {...ICON} className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-ink">{title}</div>
        <div className="text-xs leading-4 text-primary-soft-ink">{help}</div>
      </div>
      <span className="rounded-md border bg-surface-100 px-3.5 py-2 font-mono text-[22px] leading-7 font-semibold tracking-[.06em] break-all text-ink">
        {value}
      </span>
      <Button
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => setCopied(true));
        }}
      >
        <Copy {...ICON} aria-hidden />
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
      {onDismiss && (
        <Button variant="ghost" onClick={onDismiss}>
          Ya lo entregué, ocultar
        </Button>
      )}
    </div>
  );
}

/* ───── Indicador "En vivo · actualizado hace 6 s" ───── */
export function LiveIndicator({ text }: { text: string }) {
  return (
    <span className="ai-live inline-flex items-center gap-2 text-xs leading-4 font-medium text-ink-muted" role="status">
      {text}
    </span>
  );
}
