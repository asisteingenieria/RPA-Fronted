/**
 * D-004 y D-005: publicar al instante y evaluar como evidencia. Resultado de cada versión (OK /
 * con alertas / inventó datos), avance de la evaluación, diálogos de guardar y de publicar (nota,
 * evaluación y urgencia), y diferencias entre versiones del guion. La evaluación nunca frena la
 * publicación: queda en el historial.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Ban, CheckCircle2, CircleDashed, FlaskConical, Rocket, Save, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentVersion, EvalSummary, EvalVerdict } from '@/lib/api';
import { formatPct } from '@/lib/format';
import { diffLines } from '@/lib/diff';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionButton, Callout } from '../common';
import { evalPct } from './parts';

/* ───── Resultado de una versión ───── */
export const VERDICT: Record<EvalVerdict | 'NONE', { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'outline'; icon: LucideIcon; help: string }> = {
  OK: { label: 'Evaluación OK', variant: 'success', icon: CheckCircle2, help: '0 datos inventados y al menos 95 % de casos correctos.' },
  WARN: { label: 'Con alertas', variant: 'warning', icon: AlertTriangle, help: 'Sin datos inventados, pero por debajo del 95 % de casos correctos.' },
  BLOCKED: { label: 'Inventó datos', variant: 'danger', icon: Ban, help: 'En la evaluación salió algún precio, plan o promesa que no está en el catálogo. Revisa el reporte.' },
  ERROR: { label: 'Error al evaluar', variant: 'danger', icon: XCircle, help: 'La evaluación no terminó: puedes volver a evaluar la versión.' },
  CANCELLED: { label: 'Evaluación cancelada', variant: 'outline', icon: CircleDashed, help: 'Se guardó una versión más nueva mientras se evaluaba.' },
  RUNNING: { label: 'Evaluando…', variant: 'neutral', icon: FlaskConical, help: 'La suite está corriendo en segundo plano.' },
  NONE: { label: 'Sin evaluar', variant: 'neutral', icon: CircleDashed, help: 'Sin evaluación en el historial. Se puede evaluar en cualquier momento.' },
};

export function VerdictBadge({ verdict }: { verdict: EvalVerdict | null | undefined }) {
  const v = VERDICT[verdict ?? 'NONE'];
  return (
    <Badge variant={v.variant} title={v.help}>
      <v.icon strokeWidth={1.75} aria-hidden />
      {v.label}
    </Badge>
  );
}

/* ───── Avance de la evaluación ───── */
export function EvalProgress({ version, summary, published }: { version: number; summary: EvalSummary | null; published?: boolean }) {
  const done = summary?.progress?.done ?? 0;
  const total = summary?.progress?.total ?? null;
  const pct = total ? Math.round((done / total) * 100) : null;
  return (
    <Callout tone="info" icon={FlaskConical} className="items-center">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          <b>Evaluando v{version}…</b> {total ? `${done} de ${total} casos` : 'preparando la suite'}.{' '}
          {published
            ? 'Ya está publicada: el resultado queda como evidencia en el historial.'
            : 'Puedes seguir trabajando; si guardas otra versión, esta evaluación se cancela.'}
        </span>
        <span className="h-2 w-[180px] overflow-hidden rounded-full bg-surface-100" role="progressbar" aria-label="Avance de la evaluación" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
          <span className={cn('block h-full rounded-full', pct === null ? 'ai-progress-stripes w-full animate-pulse' : 'bg-primary')} style={pct === null ? undefined : { width: `${pct}%` }} />
        </span>
      </div>
    </Callout>
  );
}

/* ───── Resultado de la versión en curso (aviso en Configuración) ───── */
export function VerdictCallout({ version, verdict, summary, onOpenReport }: { version: number; verdict: EvalVerdict; summary: EvalSummary | null; onOpenReport: () => void }) {
  const pct = summary ? evalPct(summary) : null;
  const stats = pct !== null ? ` ${formatPct(pct)} de casos correctos · ${summary?.invented ?? 0} datos inventados.` : '';
  const link = (
    <button type="button" className="cursor-pointer font-bold underline" onClick={onOpenReport}>
      Ver el reporte
    </button>
  );
  if (verdict === 'OK') {
    return (
      <Callout tone="success">
        <b>La v{version} pasó la evaluación.</b>
        {stats} {link}
      </Callout>
    );
  }
  if (verdict === 'WARN') {
    return (
      <Callout tone="warning">
        <b>La evaluación de la v{version} tiene alertas:</b> {summary?.problems?.join(' · ')}. No inventó datos. Revisa los casos fallidos para ajustar el guion. {link}
      </Callout>
    );
  }
  if (verdict === 'BLOCKED') {
    return (
      <Callout tone="danger">
        <b>En la evaluación, la v{version} inventó datos</b> en {summary?.invented ?? 'algunos'} casos. Revisa el reporte para ajustar el guion; en las conversaciones reales los validadores frenan esas respuestas. {link}
      </Callout>
    );
  }
  if (verdict === 'ERROR') {
    return (
      <Callout tone="danger">
        <b>La evaluación de la v{version} no terminó</b>
        {summary?.problems?.length ? `: ${summary.problems.join(' · ')}` : ''}. Puedes volver a evaluarla.
      </Callout>
    );
  }
  return null;
}

/* ───── Guardar (con nota del cambio) ───── */
export function SaveDialog({
  open,
  onOpenChange,
  saving,
  evaluateReason,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  saving: 'plain' | 'evaluate' | null;
  /** Por qué no se puede evaluar (proveedor simulado, sin API key…). */
  evaluateReason?: string;
  onSave: (opts: { evaluate: boolean; note: string }) => void;
}) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setNote('');
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="gap-0 p-0 sm:max-w-[520px]">
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle className="font-display text-lg font-semibold">Guardar borrador</DialogTitle>
          <DialogDescription className="text-[13px] text-ink-muted">
            Se guarda sin publicar: el robot sigue con la versión publicada. Cada versión queda en el historial; la evaluación corre la suite contra el modelo real (unos
            minutos) y deja la evidencia.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 px-6 pb-6">
          <Label htmlFor="change-note" className="text-[13px] font-medium text-ink">
            Nota del cambio <span className="font-normal text-ink-subtle">(opcional)</span>
          </Label>
          <Textarea
            id="change-note"
            rows={3}
            maxLength={300}
            value={note}
            placeholder="Ej.: se agregó la objeción de cobertura"
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="text-xs text-ink-subtle">Ayuda a entender el historial: qué cambió y por qué.</span>
        </div>
        <DialogFooter className="border-t bg-surface-0 px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={!!saving}>
            Cancelar
          </Button>
          <ActionButton variant="secondary" icon={Save} loading={saving === 'plain'} disabled={!!saving} onClick={() => onSave({ evaluate: false, note })}>
            Guardar borrador
          </ActionButton>
          <ActionButton icon={FlaskConical} loading={saving === 'evaluate'} disabled={!!saving} reason={evaluateReason} onClick={() => onSave({ evaluate: true, note })}>
            Guardar y evaluar
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Publicar (nota, evaluación de evidencia y urgencia) ───── */
export function PublishDialog({
  open,
  onOpenChange,
  version,
  fromEditor,
  evaluateReason,
  publishing,
  onPublish,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Versión guardada que se publica (null si se publica lo del editor sin guardar). */
  version: AgentVersion | null;
  /** Hay cambios en el editor: se guardan como versión nueva y se publican. */
  fromEditor: boolean;
  /** Por qué no se puede evaluar (sin LLM real o sin API key). */
  evaluateReason?: string;
  publishing: boolean;
  onPublish: (opts: { note: string; applyToOpen: boolean; evaluate: boolean }) => void;
}) {
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [evaluate, setEvaluate] = useState(true);
  useEffect(() => {
    if (open) {
      setNote('');
      setUrgent(false);
      setEvaluate(true);
    }
  }, [open]);
  const target = fromEditor ? null : version;
  if (!fromEditor && !version) return null;
  const verdict = target?.evalVerdict ?? null;
  const hasResult = verdict === 'OK' || verdict === 'WARN' || verdict === 'BLOCKED';
  const evalBlocked = verdict === 'RUNNING' ? 'Ya se está evaluando' : hasResult ? 'Ya tiene su evaluación en el historial' : evaluateReason;
  const s = target?.evalSummary;
  const pct = s && hasResult ? evalPct(s) : null;
  return (
    <Dialog open={open} onOpenChange={(o) => !publishing && onOpenChange(o)}>
      <DialogContent className="gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle className="font-display text-lg font-semibold">{target ? `Publicar la v${target.version}` : 'Publicar los cambios'}</DialogTitle>
          <DialogDescription className="text-[13px] text-ink-muted">
            {fromEditor ? 'Se guarda como versión nueva y se publica al instante. ' : 'Se publica al instante. '}
            La evaluación no frena la publicación: es evidencia para el historial.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          {target && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface-200 px-3.5 py-3 text-[13px] text-ink">
              <VerdictBadge verdict={verdict} />
              {pct !== null && (
                <span className="tabular-nums">
                  {formatPct(pct)} de casos correctos · {s?.invented ?? 0} datos inventados
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish-note" className="text-[13px] font-medium text-ink">
              Nota del cambio <span className="font-normal text-ink-subtle">(opcional)</span>
            </Label>
            <Textarea
              id="publish-note"
              rows={3}
              maxLength={300}
              value={note}
              placeholder="Ej.: se agregó la objeción de cobertura"
              onChange={(e) => setNote(e.target.value)}
            />
            <span className="text-xs text-ink-subtle">Queda en el historial y en Auditoría.</span>
          </div>
          <label className={cn('flex items-start gap-3 rounded-md border px-3.5 py-3', evalBlocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}>
            <Checkbox checked={!evalBlocked && evaluate} disabled={!!evalBlocked} onCheckedChange={(c) => setEvaluate(c === true)} className="mt-0.5" />
            <span className="flex flex-col gap-0.5 text-[13px]">
              <b className="font-semibold text-ink">Evaluar después de publicar</b>
              <span className="text-ink-muted">
                {evalBlocked ?? 'Corre la suite en segundo plano (unos minutos) y deja el reporte en el historial de esta versión. No cambia lo publicado.'}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3">
            <Checkbox checked={urgent} onCheckedChange={(c) => setUrgent(c === true)} className="mt-0.5" />
            <span className="flex flex-col gap-0.5 text-[13px]">
              <b className="font-semibold text-ink">Aplicar también a las conversaciones en curso (urgencia)</b>
              <span className="text-ink-muted">
                Por defecto, cada conversación termina con la versión con la que empezó y solo las nuevas usan esta. Úsalo si el cambio corrige un error
                grave. Queda en Auditoría.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter className="border-t bg-surface-0 px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={publishing}>
            Cancelar
          </Button>
          <ActionButton icon={Rocket} loading={publishing} onClick={() => onPublish({ note: note.trim(), applyToOpen: urgent, evaluate: !evalBlocked && evaluate })}>
            {urgent ? 'Publicar y aplicar ya' : 'Publicar'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Diferencias del guion entre dos versiones ───── */
export function PromptDiff({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const rows = diffLines(before, after);
  const added = rows.filter((r) => r.type === 'add').length;
  const removed = rows.filter((r) => r.type === 'del').length;
  if (!added && !removed) return <p className="m-0 text-[13px] text-ink-muted">El guion no cambió respecto a la {beforeLabel}.</p>;
  // Solo las líneas cambiadas y dos de contexto alrededor.
  const keep = new Set<number>();
  rows.forEach((r, i) => {
    if (r.type !== 'same') for (let k = i - 2; k <= i + 2; k++) keep.add(k);
  });
  const out: ReactNode[] = [];
  rows.forEach((r, i) => {
    if (!keep.has(i)) {
      if (keep.has(i - 1)) out.push(<div key={`gap-${i}`} className="px-3 py-0.5 text-ink-subtle">⋯</div>);
      return;
    }
    out.push(
      <div
        key={i}
        className={cn(
          'px-3 whitespace-pre-wrap [overflow-wrap:anywhere]',
          r.type === 'add' && 'bg-success-soft text-success',
          r.type === 'del' && 'bg-danger-soft text-danger line-through decoration-1',
          r.type === 'same' && 'text-ink-muted',
        )}
      >
        <span className="mr-2 inline-block w-3 select-none" aria-hidden>
          {r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' '}
        </span>
        <span className="sr-only">{r.type === 'add' ? 'Agregada: ' : r.type === 'del' ? 'Quitada: ' : ''}</span>
        {r.text || ' '}
      </div>,
    );
  });
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-ink-subtle">
        {afterLabel} frente a la {beforeLabel}: <b className="text-success">+{added}</b> líneas agregadas · <b className="text-danger">−{removed}</b> quitadas
      </span>
      <div className="max-h-[420px] overflow-auto rounded-md border bg-code-bg py-2 font-mono text-[12.5px] leading-5">{out}</div>
    </div>
  );
}
