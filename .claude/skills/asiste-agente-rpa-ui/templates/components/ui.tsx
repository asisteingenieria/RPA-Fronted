/**
 * Primitivas del panel con las clases ai-* de Asiste (styles/components.css).
 * Si el proyecto ya tiene estos componentes de Recursos Humanos / Asistencia, REUTILÍZALOS
 * y borra los duplicados de aquí.
 */
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const ICON = { strokeWidth: 1.75, size: 16 } as const;

/* ───── Botones ───── */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost" | "navy" | "on-navy";
export interface ButtonProps extends Omit<ComponentProps<"button">, "children"> {
  variant?: BtnVariant;
  size?: "sm" | "xl";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  /** Si viene, el botón queda deshabilitado y muestra este motivo (p. ej. "Requiere rol ADMIN"). */
  reason?: string;
  loading?: boolean;
  children?: ReactNode;
}
export function Button({ variant = "secondary", size, icon: I, iconRight: IR, reason, loading, disabled, className, children, title, onClick, ...rest }: ButtonProps) {
  const off = !!disabled || !!reason || !!loading;
  return (
    <button
      type="button"
      {...rest}
      className={cx("ai-btn", `ai-btn--${variant}`, size && `ai-btn--${size}`, className)}
      aria-disabled={off || undefined}
      aria-busy={loading || undefined}
      title={reason ?? title}
      onClick={off ? undefined : onClick}
    >
      {I && <I {...ICON} size={size === "xl" ? 18 : 16} className="ai-ic" />}
      {children}
      {IR && <IR {...ICON} size={14} className="ai-ic" />}
    </button>
  );
}

export function IconButton({ icon: I, label, outline, danger, ...rest }: Omit<ComponentProps<"button">, "children"> & { icon: LucideIcon; label: string; outline?: boolean; danger?: boolean }) {
  return (
    <button type="button" {...rest} className={cx("ai-icon-btn", outline && "ai-icon-btn--outline", danger && "ai-icon-btn--danger")} title={label} aria-label={label}>
      <I {...ICON} className="ai-ic" />
    </button>
  );
}

/* ───── Insignias, chips y contadores ───── */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "outline";
export function Badge({ tone = "neutral", icon: I, dot = true, pulse, title, children }: { tone?: Tone; icon?: LucideIcon; dot?: boolean; pulse?: boolean; title?: string; children: ReactNode }) {
  return (
    <span className={cx("ai-badge", `ai-badge--${tone}`)} title={title}>
      {I ? <I {...ICON} size={13} className="ai-ic" /> : dot && <span className={cx("ai-dot", pulse && "ai-dot--pulse")} />}
      {children}
    </span>
  );
}
export const Count = ({ alert, children }: { alert?: boolean; children: ReactNode }) => <span className={cx("ai-count", alert && "is-alert")}>{children}</span>;

/** Campaña en MAYÚSCULAS. El robot es de Asiste; Claro Móvil es la campaña que atiende. */
export const CampaignChip = ({ kind = "claro", children = "Claro Móvil" }: { kind?: "claro" | "hogar" | "tyt" | "operacion" | "tecnologia" | "movil"; children?: string }) => (
  <span className={`ai-chip ai-chip--${kind}`}>{children.toLocaleUpperCase("es-CO")}</span>
);

/* ───── KPI y paneles ───── */
export function Kpi({ label, value, icon: I, bar, foot, tone, onClick }: { label: string; value: ReactNode; icon?: LucideIcon; bar?: number; foot?: ReactNode; tone?: "warning" | "danger"; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={cx("ai-kpi", tone && `is-${tone}`)} onClick={onClick} style={onClick ? { textAlign: "left", font: "inherit", cursor: "pointer" } : undefined}>
      <div className="ai-kpi-head">
        <span className="ai-kpi-label">{label}</span>
        {I && <span className="ai-kpi-icon"><I {...ICON} size={18} /></span>}
      </div>
      <div className="ai-kpi-value">{value}</div>
      {bar != null && <div className="ai-kpi-bar"><span style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} /></div>}
      {foot && <div className="ai-kpi-foot">{foot}</div>}
    </Tag>
  );
}

export function Panel({ title, icon: I, badge, actions, flush, className, children }: { title?: ReactNode; icon?: LucideIcon; badge?: ReactNode; actions?: ReactNode; flush?: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={cx("ai-panel", className)}>
      {(title || actions) && (
        <div className="ai-panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {I && <I {...ICON} size={18} style={{ color: "var(--primary-soft-ink)" }} />}
            <h3 className="ai-panel-title">{title}</h3>
            {badge}
          </div>
          {actions && <div className="ai-row">{actions}</div>}
        </div>
      )}
      {flush ? children : <div className="ai-panel-body">{children}</div>}
    </section>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ai-page-head">
      <div>
        <h1 className="ai-page-title">{title}</h1>
        {sub && <p className="ai-page-sub">{sub}</p>}
      </div>
      {actions && <div className="ai-row">{actions}</div>}
    </div>
  );
}

/* ───── Pestañas y segmentado ───── */
export interface TabItem { id: string; label: string; icon?: LucideIcon; count?: number }
export function Tabs({ items, active, onChange, sub }: { items: TabItem[]; active: string; onChange: (id: string) => void; sub?: boolean }) {
  return (
    <div className={sub ? "ai-subtabs" : "ai-tabs"} role="tablist">
      {items.map(({ id, label, icon: I, count }) => (
        <button key={id} role="tab" type="button" aria-selected={id === active} className={cx("ai-tab", id === active && "is-active")} onClick={() => onChange(id)} style={{ background: "none", border: 0, cursor: "pointer" }}>
          {I && <I {...ICON} size={15} />}
          {label}
          {count != null && <Count>{count}</Count>}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string; icon?: LucideIcon; disabled?: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ai-seg" role="radiogroup" aria-label={label}>
      {items.map(({ id, label: l, icon: I, disabled }) => (
        <span
          key={id}
          role="radio"
          tabIndex={0}
          aria-checked={id === value}
          aria-disabled={!!disabled || undefined}
          title={disabled}
          className={id === value ? "is-active" : ""}
          style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
          onClick={() => !disabled && onChange(id)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && onChange(id)}
        >
          {I && <I {...ICON} size={14} />}
          {l}
        </span>
      ))}
    </div>
  );
}

/* ───── Avisos ───── */
export function Callout({ tone = "info", icon, children }: { tone?: "info" | "warning" | "danger" | "success"; icon?: LucideIcon; children: ReactNode }) {
  const I = icon ?? (tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertTriangle);
  return (
    <div className={`ai-callout ai-callout--${tone}`} role={tone === "danger" ? "alert" : "note"}>
      <I {...ICON} className="ai-ic" />
      <div>{children}</div>
    </div>
  );
}

/** Estado vacío (.ai-empty) con explicación de qué hacer. */
export function Empty({ icon: I, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ai-empty">
      <span className="ai-modal-icon"><I {...ICON} size={22} /></span>
      <b style={{ color: "var(--ink)" }}>{title}</b>
      {children}
      {action}
    </div>
  );
}
