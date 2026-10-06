import { useState, type ReactNode } from 'react';
import { AlertTriangle, CircleCheck, Info, Lock, RotateCw, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

/* ───────────── Encabezado de página ───────────── */
export function PageHeader({ crumbs, title, badges, actions, meta }: { crumbs?: string[]; title: ReactNode; badges?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {meta && <div className="mb-1 text-[13px] text-muted-foreground">{meta}</div>}
        {crumbs && (
          <Breadcrumb className="mb-1">
            <BreadcrumbList className="text-[13px]">
              {crumbs.map((c, i) => (
                <span key={c} className="contents">
                  {i > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
                  <BreadcrumbItem>{c}</BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] font-semibold leading-7 tracking-tight">{title}</h1>
          {badges}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────── Card del sistema ───────────── */
export function Panel({ title, badges, description, actions, children, className, bodyClassName }: { title?: ReactNode; badges?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('rounded-lg border bg-card shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
              {badges}
            </div>
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ───────────── Avisos en línea ───────────── */
const CALLOUT = {
  warning: { cls: 'bg-warning-soft text-warning', Icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft text-destructive', Icon: ShieldAlert },
  success: { cls: 'bg-success-soft text-success', Icon: CircleCheck },
  info: { cls: 'bg-surface-2 text-muted-foreground', Icon: Info },
  primary: { cls: 'bg-primary-soft text-primary', Icon: Info },
};
export function Callout({ tone = 'info', children, className, icon }: { tone?: keyof typeof CALLOUT; children: ReactNode; className?: string; icon?: ReactNode }) {
  const c = CALLOUT[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('flex items-start gap-2.5 rounded-md px-3.5 py-2.5 text-[13px]', c.cls, className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-[15px]">{icon ?? <c.Icon aria-hidden />}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ───────────── Estados obligatorios ───────────── */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full bg-surface-2" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Callout tone="danger">
      <div className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw />
            Reintentar
          </Button>
        )}
      </div>
    </Callout>
  );
}

export function NoPermission({ reason }: { reason?: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      <Lock className="mb-3 size-6 text-ink-faint" aria-hidden />
      <p className="text-[15px] font-semibold">Tu rol no permite esta acción</p>
      {reason && <p className="mt-1 text-[13px] text-muted-foreground">{reason}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 text-[13px] text-muted-foreground">{children}</div>}
    </div>
  );
}

/* ───────────── Campo de formulario ───────────── */
export function Field({ label, help, error, children, htmlFor, className }: { label: ReactNode; help?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </Label>
      {children}
      {error ? <p className="text-[12.5px] text-destructive">{error}</p> : help ? <p className="text-[12.5px] text-muted-foreground">{help}</p> : null}
    </div>
  );
}

/* ───────────── Chips editables (Enter añade, × quita) ───────────── */
export function ChipsInput({ value, onChange, placeholder, disabled, suggestions, id }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; disabled?: boolean; suggestions?: string[]; id?: string }) {
  const [text, setText] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setText('');
  };
  return (
    <div className="flex flex-col gap-2">
      <div className={cn('flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5', disabled && 'opacity-60')}>
        {value.map((v) => (
          <span key={v} className="inline-flex h-6 items-center gap-1 rounded-sm bg-surface-2 pl-2 pr-1 text-[12.5px] font-medium">
            {v}
            {!disabled && (
              <button type="button" aria-label={`Quitar ${v}`} className="grid size-4 place-items-center rounded-sm text-muted-foreground hover:bg-border" onClick={() => onChange(value.filter((x) => x !== v))}>
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add(text);
              } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={() => text && add(text)}
            placeholder={value.length ? '' : placeholder}
            className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
        )}
      </div>
      {suggestions && !disabled && suggestions.some((s) => !value.includes(s)) && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="h-6 rounded-sm border border-dashed border-border-strong px-2 text-xs text-muted-foreground hover:bg-surface-2">
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── Confirmación obligatoria ───────────── */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  requireText,
  textLabel,
  textPlaceholder,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Pide un texto obligatorio (nota de cambio, motivo, comentario). */
  requireText?: boolean;
  textLabel?: string;
  textPlaceholder?: string;
  onConfirm: (text: string) => unknown;
  children?: ReactNode;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setText('');
        onOpenChange(o);
      }}
    >
      <AlertDialogContent className="shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div className="text-sm text-muted-foreground">{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        {requireText && (
          <Field label={textLabel ?? 'Comentario'} htmlFor="confirm-text">
            <Textarea id="confirm-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={textPlaceholder} rows={3} autoFocus />
          </Field>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy || (requireText && !text.trim())}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(text.trim());
                setText('');
                onOpenChange(false);
              } catch {
                // La acción ya informó el error (toast); el diálogo sigue abierto para corregir.
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ───────────── Entrada numérica corta ───────────── */
export function NumberInput({ value, onChange, min, max, id, className, disabled }: { value: number; onChange: (n: number) => void; min?: number; max?: number; id?: string; className?: string; disabled?: boolean }) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      className={cn('tabular w-24', className)}
    />
  );
}
