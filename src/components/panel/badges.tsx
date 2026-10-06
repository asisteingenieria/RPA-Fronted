import type { ComponentProps } from "react";
import { Lock, Scale, Sparkles, FileText, X, Check, CheckCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ───────────── Pill base (tonos del sistema) ───────────── */
export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "ai" | "exact" | "legal" | "outline";

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted-foreground border-border",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
  ai: "bg-ai-soft text-ai",
  exact: "bg-exact-soft text-exact",
  legal: "bg-legal-soft text-legal",
  outline: "bg-transparent text-muted-foreground border-border-strong border-dashed",
};

export function Pill({ tone = "neutral", className, ...p }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-sm border border-transparent px-[7px] text-xs font-medium [&_svg]:size-[13px]",
        TONE[tone],
        className,
      )}
      {...p}
    />
  );
}

/* ───────────── OriginBadge: quién escribe el texto final ─────────────
 * Principio rector del panel. Va junto al título de toda pantalla/sección de edición. */
export type Origin = "ia" | "exacto" | "legal";

export const ORIGIN = {
  ia: { tone: "ai", Icon: Sparkles, label: "Lo redacta la IA", short: "IA", hint: "El texto es una guía: el modelo lo adapta a cada cliente." },
  exacto: { tone: "exact", Icon: Lock, label: "Texto exacto", short: "Exacto", hint: "Se envía al cliente palabra por palabra." },
  legal: { tone: "legal", Icon: Scale, label: "Legal", short: "Legal", hint: "Restringido: lo edita y aprueba el rol Legal." },
} as const satisfies Record<Origin, { tone: Tone; Icon: unknown; label: string; short: string; hint: string }>;

export function OriginBadge({ kind, compact, label }: { kind: Origin; compact?: boolean; label?: string }) {
  const o = ORIGIN[kind];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Pill tone={o.tone}>
          <o.Icon aria-hidden />
          {label ?? (compact ? o.short : o.label)}
        </Pill>
      </TooltipTrigger>
      <TooltipContent>{o.hint}</TooltipContent>
    </Tooltip>
  );
}

/* ───────────── VersionStatus ───────────── */
export type VersionState = "borrador" | "evaluacion" | "fallida" | "lista" | "aprobada" | "publicada" | "retirada";

const VSTATE: Record<VersionState, { tone: Tone; label: string; Icon?: typeof Check }> = {
  borrador: { tone: "neutral", label: "Borrador", Icon: FileText },
  evaluacion: { tone: "primary", label: "En evaluación" },
  fallida: { tone: "danger", label: "Evaluación fallida", Icon: X },
  lista: { tone: "warning", label: "Lista para aprobar" },
  aprobada: { tone: "primary", label: "Aprobada", Icon: Check },
  publicada: { tone: "success", label: "Publicada", Icon: CheckCheck },
  retirada: { tone: "outline", label: "Retirada", Icon: History },
};

export function VersionStatus({ status }: { status: VersionState }) {
  const s = VSTATE[status];
  return (
    <Pill tone={s.tone}>
      {status === "evaluacion" && <span className="size-[7px] animate-pulse rounded-full bg-current" aria-hidden />}
      {s.Icon && <s.Icon aria-hidden />}
      {s.label}
    </Pill>
  );
}

/* ───────────── RobotStatus (píldora del encabezado) ───────────── */
export type RobotState = "activo" | "detenido" | "sin-sesion" | "sin-senal";

const RSTATE: Record<RobotState, { label: string; pill: string; dot: string }> = {
  activo: { label: "Robot activo", pill: "border-border bg-card text-foreground", dot: "bg-success ring-[3px] ring-success-soft" },
  detenido: { label: "Robot detenido", pill: "border-destructive bg-danger-soft text-destructive", dot: "bg-destructive" },
  "sin-sesion": { label: "Sin sesión en Abaya", pill: "border-warning bg-warning-soft text-warning", dot: "bg-warning" },
  "sin-senal": { label: "Sin señal", pill: "border-border bg-card text-foreground", dot: "border-2 border-ink-faint bg-transparent" },
};

export function RobotStatus({ status, lastHeartbeat }: { status: RobotState; lastHeartbeat: string }) {
  const s = RSTATE[status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="status" className={cn("inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full border pl-2.5 pr-3 text-[12.5px] font-medium", s.pill)}>
          <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
          {s.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>Último latido: {lastHeartbeat}</TooltipContent>
    </Tooltip>
  );
}

/* ───────────── VariableChip ───────────── */
export function VariableChip({ name, unknown, locked }: { name: string; unknown?: boolean; locked?: boolean }) {
  const system = name.startsWith("{{");
  return (
    <span
      title={unknown ? "Variable desconocida: no se reemplazará" : locked ? "Variable bloqueada: no se puede borrar" : undefined}
      className={cn(
        "inline-flex h-5 items-center gap-[3px] rounded-sm px-1.5 align-baseline font-mono text-xs font-medium",
        unknown
          ? "bg-transparent px-0.5 text-destructive underline decoration-destructive decoration-wavy underline-offset-[3px]"
          : locked
            ? "bg-legal-soft text-legal"
            : system
              ? "bg-exact-soft text-exact"
              : "bg-primary-soft text-primary",
      )}
    >
      {locked && <Lock className="size-[11px]" aria-hidden />}
      {name}
    </span>
  );
}
