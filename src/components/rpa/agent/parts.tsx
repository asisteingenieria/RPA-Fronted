/** Piezas de la pantalla Agente (estilo Retell; kit: reference/screens/agente.*.png e historial.*.png). */
import { useState, type ReactNode } from 'react';
import { ChevronDown, Copy, FlaskConical, Lock, Plus, Save, XCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AgentPlan, AgentStatus, EvalSummary } from '@/lib/api';
import { fmtMs, formatCOP, formatDuration, formatPct } from '@/lib/format';
import { PROCESS_LABEL } from '@/lib/labels';
import { ActionButton, CampaignChip, ICON, Segmented } from '../common';
import { VersionStatus } from '../status';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/* ───── Encabezado del agente ───── */
export function AgentBar(p: {
  name: string;
  status: AgentStatus;
  meta: ReactNode;
  unsaved: boolean;
  saving?: boolean;
  publishing?: boolean;
  /** Motivo si no se puede editar (rol). */
  editReason?: string;
  /** Motivo si no se puede guardar (errores, evaluación en curso…). */
  saveReason?: string;
  /** Motivo si no se puede publicar (proveedor simulado, sin borrador, cambios sin guardar…). */
  publishReason?: string;
  onDiscard: () => void;
  onSave: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-surface-100 px-5 py-3.5 shadow-card">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-display text-lg leading-6 font-semibold text-ink">{p.name}</span>
          <CampaignChip />
          <VersionStatus status={p.status} />
        </div>
        <span className="text-xs leading-4 font-medium text-ink-subtle">{p.meta}</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2 max-md:ml-0">
        {p.unsaved && (
          <span className="inline-flex items-center gap-1.5 text-xs leading-4 font-semibold text-warning" role="status">
            <span className="ai-dot size-[7px]" aria-hidden />
            Cambios sin guardar
          </span>
        )}
        <ActionButton variant="ghost" reason={p.editReason} disabled={!p.unsaved} onClick={p.onDiscard}>
          Descartar
        </ActionButton>
        <ActionButton variant="secondary" icon={Save} loading={p.saving} reason={p.editReason ?? p.saveReason} disabled={!p.unsaved} onClick={p.onSave}>
          Guardar
        </ActionButton>
        {/* No existe "publicar sin probar": este botón SIEMPRE dispara la suite de evaluación. */}
        <ActionButton icon={FlaskConical} loading={p.publishing} reason={p.editReason ?? p.publishReason} onClick={p.onPublish}>
          Publicar con evaluación
        </ActionButton>
      </div>
    </div>
  );
}

/* ───── Ajustes del modelo (fila sobre el editor) ───── */
export function ModelSettings(p: {
  models: string[];
  defaultModel: string | null;
  model: string | null;
  onModel: (m: string | null) => void;
  temperature: number;
  min: number;
  max: number;
  onTemperature: (t: number) => void;
  temperatureIgnored?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b px-4 py-3.5">
      <label className="inline-flex h-9 items-center gap-2 rounded-md border bg-surface-100 px-3 text-[13px] font-medium whitespace-nowrap text-ink focus-within:border-primary">
        <span className="sr-only">Modelo</span>
        <select
          value={p.model ?? ''}
          onChange={(e) => p.onModel(e.target.value || null)}
          disabled={p.readOnly}
          className="cursor-pointer border-0 bg-transparent text-inherit outline-none disabled:cursor-not-allowed"
        >
          <option value="">Por defecto del servidor{p.defaultModel ? ` (${p.defaultModel})` : ''}</option>
          {p.models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label
        className="inline-flex h-9 items-center gap-2.5 rounded-md border px-3 text-[13px] font-medium whitespace-nowrap"
        title={p.temperatureIgnored ? 'El modelo seleccionado no usa la temperatura' : `Temperatura ${p.min} – ${p.max}`}
      >
        Temperatura
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={0.05}
          value={p.temperature}
          disabled={p.readOnly || p.temperatureIgnored}
          onChange={(e) => p.onTemperature(Number(e.target.value))}
          className="w-20 accent-primary disabled:cursor-not-allowed"
          aria-valuetext={p.temperature.toLocaleString('es-CO')}
        />
        <b className="tabular-nums">{p.temperature.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</b>
      </label>
      <span className="inline-flex h-9 items-center gap-2 rounded-md border bg-surface-200 px-3 text-[13px] font-medium whitespace-nowrap text-ink-muted" title="Fijo">
        Español (Colombia) <Lock {...ICON} className="size-[13px]" aria-label="fijo" />
      </span>
      {p.temperatureIgnored && <span className="text-xs text-ink-subtle">El modelo seleccionado no usa la temperatura.</span>}
    </div>
  );
}

/* ───── Sección plegable de la columna central ───── */
export function Section({ title, icon: I, badge, defaultOpen, children }: { title: string; icon: LucideIcon; badge?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-t first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3.5 text-left text-sm leading-5 font-semibold text-ink"
      >
        <I {...ICON} className="size-[17px] text-primary-soft-ink" aria-hidden />
        {title}
        {badge}
        <ChevronDown {...ICON} className={cn('ml-auto size-4 text-ink-subtle transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </div>
  );
}
export const SectionStack = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-lg border bg-surface-100 shadow-card">{children}</div>
);
export const LockedBadge = ({ children }: { children: string }) => (
  <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-surface-200 px-2.5 text-xs font-medium whitespace-nowrap text-ink-muted">
    <Lock {...ICON} className="size-3" aria-hidden />
    {children}
  </span>
);

/* ───── Catálogo en solo lectura con "Insertar" marcador ───── */
const PROCESS_ORDER = ['PORTABILIDAD', 'MIGRACION', 'LINEA_NUEVA'];
export function CatalogReadOnly({ plans, onInsert, canInsert }: { plans: AgentPlan[]; onInsert: (marker: string) => void; canInsert: boolean }) {
  const processes = [...new Set(plans.map((p) => p.process))].sort(
    (a, b) => (PROCESS_ORDER.indexOf(a) + 1 || 99) - (PROCESS_ORDER.indexOf(b) + 1 || 99),
  );
  const [proc, setProc] = useState(processes[0] ?? 'PORTABILIDAD');
  const list = plans.filter((p) => p.process === proc);
  if (plans.length === 0) return <span className="text-xs text-ink-subtle">Sin planes activos en el catálogo.</span>;
  return (
    <>
      <Segmented
        label="Proceso"
        value={proc}
        onChange={setProc}
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
        items={processes.map((id) => ({ id, label: PROCESS_LABEL[id] ?? id }))}
      />
      <div>
        {list.map((p) => {
          const marker = `{{OFERTA:${p.code}}}`;
          return (
            <div key={p.code} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 border-t py-2.5 first:border-t-0">
              <code className="rounded-[5px] bg-cat-tyt-soft px-1.5 py-0.5 font-mono text-xs leading-4 font-semibold text-code-marker">{p.code}</code>
              <span className="truncate text-[13px] font-semibold">{p.name}</span>
              <ActionButton
                variant="ghost"
                size="sm"
                icon={canInsert ? Plus : Copy}
                onClick={() =>
                  canInsert
                    ? onInsert(marker)
                    : void navigator.clipboard?.writeText(marker).then(() => toast.success(`Copiado ${marker}`))
                }
                aria-label={`${canInsert ? 'Insertar' : 'Copiar'} ${marker}`}
              >
                {canInsert ? 'Insertar' : 'Copiar marcador'}
              </ActionButton>
              <span className="col-start-2 text-xs text-ink-subtle tabular-nums">
                {[`${p.dataGb} GB`, p.benefits[0], formatCOP(p.priceCop), p.discountText ? 'con beneficio' : null].filter(Boolean).join(' · ')}
              </span>
            </div>
          );
        })}
      </div>
      <span className="text-xs leading-4 text-ink-subtle">
        {canInsert ? 'Inserta {{OFERTA:CÓDIGO}} en el cursor del guion.' : 'Copia el marcador para usarlo en el guion.'} Los precios nunca se escriben en el guion: los pone el sistema
        desde el catálogo.
      </span>
    </>
  );
}

/* ───── Etapas del motor (solo lectura: las decide la máquina de estados) ───── */
export function StageTrack({ stages, current }: { stages: string[]; current: string }) {
  const idx = stages.indexOf(current);
  return (
    <ol className="ai-stages m-0 flex list-none flex-col p-0" aria-label="Etapas del motor">
      {stages.map((s, i) => (
        <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : undefined} aria-current={i === idx ? 'step' : undefined}>
          <span>{s}</span>
        </li>
      ))}
      {idx < 0 && (
        <li className="now" aria-current="step">
          <span>{current}</span>
        </li>
      )}
    </ol>
  );
}

/* ───── Resultado de una evaluación ───── */
export const evalPct = (s: EvalSummary) => (s.cases ? ((s.passed ?? 0) / s.cases) * 100 : null);
export const evalDuration = (s: EvalSummary) =>
  s.startedAt && s.finishedAt ? formatDuration(new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) : '—';

export function EvalReport({ version, summary, published }: { version: number; summary: EvalSummary; published?: boolean }) {
  const [open, setOpen] = useState(true);
  const pct = evalPct(summary);
  const invented = summary.invented ?? null;
  const failed = summary.failedCases ?? [];
  const Icon = published ? CheckCircle2 : XCircle;
  return (
    <section className={cn('overflow-hidden rounded-lg border bg-surface-100 shadow-card', published ? 'border-success' : 'border-danger')}>
      <div className={cn('flex flex-wrap items-center gap-3 px-5 py-3.5', published ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
        <Icon {...ICON} className="size-5" aria-hidden />
        <b className="font-display text-base leading-[22px] font-semibold">
          {published ? `La v${version} pasó la evaluación y se publicó` : `La v${version} no se publicó: la evaluación la rechazó`}
        </b>
        <span className="ml-auto">
          <VersionStatus status={published ? 'PUBLISHED' : 'REJECTED'} />
        </span>
      </div>
      {(summary.problems ?? []).length > 0 && (
        <ul className="m-0 flex list-disc flex-col gap-1 border-b py-3 pr-5 pl-10 text-[13px] text-danger">
          {summary.problems!.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {summary.cases !== undefined && (
        <div className="grid grid-cols-3 gap-5 p-5 max-lg:grid-cols-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-muted">Casos correctos (meta ≥ 95 %)</span>
            <span className={cn('font-display text-[28px] leading-8 font-semibold tabular-nums', pct !== null && pct < 95 ? 'text-danger' : 'text-ink')}>
              {pct === null ? '—' : formatPct(pct)}
            </span>
            <div className="relative h-2 rounded-full bg-surface-200" aria-hidden>
              <span className={cn('absolute inset-y-0 left-0 rounded-full', pct !== null && pct < 95 ? 'bg-danger' : 'bg-success')} style={{ width: `${pct ?? 0}%` }} />
              <i className="absolute -top-1 -bottom-1 left-[95%] w-0.5 bg-ink" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-muted">Datos inventados (debe ser 0)</span>
            <span className={cn('font-display text-[28px] leading-8 font-semibold tabular-nums', invented ? 'text-danger' : 'text-ink')}>{invented ?? '—'}</span>
            {!!invented && <span className="text-xs text-ink-subtle">Bloquea la publicación</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-muted">Suite</span>
            <span className="font-display text-[28px] leading-8 font-semibold tabular-nums">
              {summary.passed ?? '—'} / {summary.cases}
            </span>
            <span className="text-xs text-ink-subtle">
              Duración {evalDuration(summary)} · latencia p95 {fmtMs(summary.p95)}
            </span>
          </div>
        </div>
      )}
      {failed.length > 0 && (
        <div className="border-t">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center gap-2.5 px-5 py-3.5 text-left text-sm font-semibold text-ink"
          >
            Casos fallidos ({failed.length})
            <ChevronDown {...ICON} className={cn('ml-auto size-4 text-ink-subtle transition-transform', open && 'rotate-180')} aria-hidden />
          </button>
          {open && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caso</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failed.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="align-top">
                      <code className="rounded-[5px] bg-cat-tyt-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-code-marker">{c.id}</code>
                    </TableCell>
                    <TableCell className="whitespace-normal">{c.failures.join(' · ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </section>
  );
}
