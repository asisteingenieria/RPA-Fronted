import type { ComponentProps, ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, FileText, FlaskConical, ListChecks, Play, Power, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pill } from "./badges";

/* ───────────── PermissionButton ─────────────
 * Regla: lo que el rol no puede hacer se ve DESHABILITADO con explicación, nunca se oculta.
 * (Un <button disabled> no dispara eventos: el tooltip va en un span envolvente.) */
export function PermissionButton({ allowed, reason, ...props }: ComponentProps<typeof Button> & { allowed: boolean; reason: string }) {
  if (allowed) return <Button {...props} />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          <Button {...props} disabled aria-disabled />
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

/* ───────────── PublishStepper: Borrador → Evaluación → Aprobación → Publicada ───────────── */
const CYCLE = ["Borrador", "Evaluación", "Aprobación", "Publicada"];

export function PublishStepper({ current, failedAt, pending, steps = CYCLE }: { current: number; failedAt?: number; /** El paso actual aún no se completa (p. ej. aprobada, falta publicar). */ pending?: boolean; steps?: string[] }) {
  return (
    <ol className="flex items-center" aria-label="Ciclo de publicación">
      {steps.map((s, i) => {
        const st = failedAt === i ? "failed" : i < current || (i === current && i === steps.length - 1 && !pending) ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s} className={cn("flex items-center", i > 0 && "flex-1")}>
            {i > 0 && <span aria-hidden className={cn("mx-3 h-[1.5px] min-w-7 flex-1", i <= current && failedAt !== i ? "bg-success" : "bg-border-strong")} />}
            <span aria-current={st === "current" ? "step" : undefined} className={cn("flex items-center gap-2 text-[13px] font-medium",
              st === "todo" && "text-ink-faint", st === "done" && "text-foreground", st === "current" && "font-semibold text-foreground", st === "failed" && "font-semibold text-destructive")}>
              <span className={cn("grid size-6 place-items-center rounded-full border-[1.5px] text-xs",
                st === "todo" && "border-border-strong bg-card text-muted-foreground",
                st === "done" && "border-success bg-success text-card",
                st === "current" && "border-primary text-primary ring-[3px] ring-primary-soft",
                st === "failed" && "border-destructive bg-destructive text-destructive-foreground")}>
                {st === "done" ? <Check className="size-3.5" strokeWidth={3} /> : st === "failed" ? <X className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Bandas superiores ───────────── */
export function DraftBanner({ publishedVersion, changes, onTest, onSubmit, submitBlockedReason }: { publishedVersion: string; changes: number; onTest: () => void; onSubmit: () => void; submitBlockedReason?: string }) {
  return (
    <div role="note" className="flex items-center gap-3 border-b bg-primary-soft px-6 py-2 text-[13px]">
      <FileText className="size-[15px]" aria-hidden />
      <span>
        Estás editando el <strong className="text-primary">borrador</strong> · Los clientes siguen viendo la <strong className="text-primary">{publishedVersion}</strong>
      </span>
      {changes > 0 && <Pill tone="primary">{changes} cambios sin publicar</Pill>}
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="outline" onClick={onTest}><FlaskConical />Probar borrador</Button>
        <PermissionButton size="sm" allowed={!submitBlockedReason} reason={submitBlockedReason ?? ""} onClick={onSubmit}><ListChecks />Enviar a evaluación</PermissionButton>
      </div>
    </div>
  );
}

export function StopBanner({ by, at, onResume }: { by: string; at: string; onResume: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-destructive bg-danger-soft px-6 py-2 text-[13px] font-medium text-destructive">
      <Power className="size-[15px]" aria-hidden />
      Robot detenido por {by} a las {at}. Los clientes no reciben respuestas.
      <Button size="sm" variant="destructive" className="ml-auto" onClick={onResume}><Play />Reanudar</Button>
    </div>
  );
}

/* ───────────── Apagado de emergencia (siempre visible en el encabezado) ───────────── */
export function EmergencyStop({ stopped, onStop, onResume }: { stopped: boolean; onStop: () => void; onResume: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {stopped ? (
          <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-danger-soft"><Play />Reanudar robot</Button>
        ) : (
          <Button size="sm" variant="destructive"><Power />Apagado de emergencia</Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{stopped ? "¿Reanudar el robot?" : "¿Detener el robot?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {stopped
              ? "Sofía vuelve a responder a los clientes con la versión publicada."
              : "Esto detiene de inmediato todos los envíos a clientes. La lectura de mensajes continúa."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className={stopped ? undefined : "bg-destructive text-destructive-foreground hover:bg-danger-hover"} onClick={stopped ? onResume : onStop}>
            {stopped ? "Sí, reanudar" : "Sí, detener"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ───────────── StatCard (indicadores de Inicio) ───────────── */
export function StatCard({ label, value, delta, good = true, alert, hint = "vs. ayer" }: { label: string; value: ReactNode; delta?: string; good?: boolean; alert?: boolean; hint?: string }) {
  const dir = !delta || delta === "0" ? "flat" : delta.startsWith("-") ? "down" : "up";
  const positive = dir === "flat" ? null : (dir === "up") === good;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-[12.5px] font-medium text-muted-foreground">{label}</div>
      <div className={cn("tabular text-[28px] font-semibold leading-8 tracking-tight", alert && "text-destructive")}>{value}</div>
      <div className={cn("inline-flex items-center gap-[3px] text-xs font-medium", positive === null ? "text-ink-faint" : positive ? "text-success" : "text-destructive")}>
        {dir === "up" && <ArrowUp className="size-3" />}
        {dir === "down" && <ArrowDown className="size-3" />}
        {delta ?? "—"} <span className="font-normal text-ink-faint">{hint}</span>
      </div>
    </div>
  );
}
