import { Fragment, useState } from 'react';
import { diffLines } from 'diff';
import { ArrowRight, Check, History, Lock, Scale, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Change } from '@/lib/content-diff';
import type { SectionKey, StepId, Version } from '@/data/types';
import { SECTION_LABEL } from '@/data/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, VersionStatus } from './badges';
import { Callout } from './common';

/* ───────────── Diagrama del flujo (solo lectura) ───────────── */
const node = 'inline-flex h-9 items-center whitespace-nowrap rounded-md border border-border-strong bg-card px-3 text-[13px] font-medium';
export function FlowDiagram({ active, onSelect }: { active: StepId; onSelect: (s: StepId) => void }) {
  const N = ({ id, children }: { id: StepId; children: React.ReactNode }) => (
    <button type="button" onClick={() => onSelect(id)} aria-current={active === id ? 'step' : undefined} className={cn(node, 'hover:bg-surface-2', active === id && 'border-primary bg-primary-soft text-primary hover:bg-primary-soft')}>
      {children}
    </button>
  );
  const Arrow = () => <ArrowRight className="size-4 shrink-0 text-ink-faint" aria-hidden />;
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-3">
        <N id="MENU">Menú</N>
        <Arrow />
        <div className="flex flex-col gap-1.5">
          {['A · Cambiarme de operador', 'B · Recargas → pospago', 'C · Número nuevo'].map((t) => (
            <span key={t} className={cn(node, 'text-muted-foreground')}>
              {t}
            </span>
          ))}
        </div>
        <Arrow />
        <N id="PERFIL">Perfilamiento</N>
        <Arrow />
        <div className="flex items-center gap-1">
          <N id="OFERTA">Oferta</N>
          <span className="text-ink-faint" aria-label="ida y vuelta">⇄</span>
          <N id="OBJECIONES">Objeciones</N>
        </div>
        <Arrow />
        <N id="AUTORIZACION">Autorización</N>
        <Arrow />
        <div className="flex flex-col gap-1.5">
          <span className={cn(node, 'border-success text-success')}>
            Transferencia <Check className="ml-1 size-3.5" />
          </span>
          <span className={cn(node, 'text-muted-foreground')}>No autoriza → Despedida</span>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">Menú → D · Soporte / facturación → Mensaje de soporte → Despedida</p>
    </div>
  );
}

/* ───────────── Embudo ───────────── */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <div key={s.label} className="grid grid-cols-[110px_1fr_48px] items-center gap-3 text-[13px]">
          <span className="text-muted-foreground">{s.label}</span>
          <div className="h-5 overflow-hidden rounded-sm bg-surface-2">
            <div className={cn('h-full rounded-sm', i === steps.length - 1 ? 'bg-success' : 'bg-primary')} style={{ width: `${(s.value / max) * 100}%` }} />
          </div>
          <span className="tabular text-right">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Línea de tiempo de versiones ───────────── */
export function VersionTimeline({ versions, selected, onSelect, onRevert, canRevert, compact }: { versions: Version[]; selected?: number; onSelect?: (n: number) => void; onRevert?: (n: number) => void; canRevert?: boolean; compact?: boolean }) {
  return (
    <ol className="relative">
      {versions.map((v, i) => {
        const pub = v.status === 'publicada';
        const draftLike = ['borrador', 'evaluacion', 'lista', 'aprobada'].includes(v.status);
        return (
          <li key={v.number} className="relative pb-5 pl-8 last:pb-0">
            {i < versions.length - 1 && <span className="absolute bottom-0 left-[9px] top-6 w-[1.5px] bg-border" aria-hidden />}
            <span
              className={cn(
                'absolute left-0 top-0.5 size-5 rounded-full border-2 bg-card',
                pub ? 'border-success bg-success ring-4 ring-success-soft' : draftLike ? 'border-dashed border-primary' : 'border-border-strong',
              )}
              aria-hidden
            />
            <button type="button" disabled={!onSelect} onClick={() => onSelect?.(v.number)} className={cn('block w-full rounded-md text-left', onSelect && '-mx-2 -my-1 px-2 py-1 hover:bg-surface-2', selected === v.number && 'bg-primary-soft hover:bg-primary-soft')}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{compact ? `Contenido v${v.number}` : `v${v.number}`}</span>
                <VersionStatus status={v.status} />
              </div>
              <div className="mt-0.5 text-[13px]">{v.note}</div>
              <div className="text-xs text-muted-foreground">
                {v.author} · {formatDateTime(v.publishedAt ?? v.createdAt)}
              </div>
            </button>
            {onRevert && v.status === 'retirada' && v.publishedAt && (
              <button type="button" disabled={!canRevert} title={canRevert ? undefined : 'Requiere rol Aprobador'} onClick={() => onRevert(v.number)} className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-50">
                <History className="size-3.5" /> Revertir a esta versión
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Diferencias ───────────── */
const ORIGIN_OF: Record<SectionKey, 'ia' | 'exacto' | 'legal'> = {
  personality: 'ia',
  steps: 'ia',
  objections: 'ia',
  offer: 'exacto',
  templates: 'exacto',
  plans: 'exacto',
  campaigns: 'exacto',
  legal: 'legal',
};
const ORIGIN_PILL = {
  ia: { tone: 'ai' as const, Icon: Sparkles, label: 'IA' },
  exacto: { tone: 'exact' as const, Icon: Lock, label: 'Exacto' },
  legal: { tone: 'legal' as const, Icon: Scale, label: 'Legal' },
};

function TextDiff({ before = '', after = '', mode }: { before?: string; after?: string; mode: 'unificada' | 'lado' }) {
  const parts = diffLines(before.endsWith('\n') ? before : before + '\n', after.endsWith('\n') ? after : after + '\n');
  const lines = parts.flatMap((p) =>
    p.value
      .replace(/\n$/, '')
      .split('\n')
      .map((l) => ({ text: l, type: p.added ? 'add' : p.removed ? 'del' : 'eq' })),
  );
  if (mode === 'lado') {
    const left = lines.filter((l) => l.type !== 'add');
    const right = lines.filter((l) => l.type !== 'del');
    const Col = ({ ls }: { ls: typeof lines }) => (
      <div className="min-w-0 overflow-hidden rounded-md border">
        {ls.map((l, i) => (
          <div key={i} className={cn('whitespace-pre-wrap break-words px-3 py-0.5 text-[13px]', l.type === 'add' && 'bg-added-soft', l.type === 'del' && 'bg-removed-soft')}>
            {l.text || ' '}
          </div>
        ))}
      </div>
    );
    return (
      <div className="grid grid-cols-2 gap-3">
        <Col ls={left} />
        <Col ls={right} />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border">
      {lines.map((l, i) => (
        <div key={i} className={cn('grid grid-cols-[24px_1fr] text-[13px]', l.type === 'add' && 'bg-added-soft', l.type === 'del' && 'bg-removed-soft')}>
          <span className={cn('select-none text-center', l.type === 'add' ? 'text-success' : l.type === 'del' ? 'text-destructive' : 'text-ink-faint')} aria-label={l.type === 'add' ? 'añadido' : l.type === 'del' ? 'quitado' : undefined}>
            {l.type === 'add' ? '+' : l.type === 'del' ? '−' : ''}
          </span>
          <span className="whitespace-pre-wrap break-words py-0.5 pr-3">{l.text || ' '}</span>
        </div>
      ))}
    </div>
  );
}

export function DiffView({ changes, summary, title }: { changes: Change[]; summary?: string[]; title?: string }) {
  const [mode, setMode] = useState<'unificada' | 'lado'>('unificada');
  const sections = [...new Set(changes.map((c) => c.section))];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="unificada">Unificada</TabsTrigger>
            <TabsTrigger value="lado">Lado a lado</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {summary && summary.length > 0 && <Callout tone="warning">{summary.join(' · ')}</Callout>}
      {!changes.length && <Callout tone="success">Sin diferencias con la versión publicada.</Callout>}
      {sections.map((sec) => {
        const o = ORIGIN_PILL[ORIGIN_OF[sec]];
        return (
          <div key={sec} className="flex flex-col gap-3">
            {changes
              .filter((c) => c.section === sec)
              .map((c) => (
                <div key={c.key} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      {SECTION_LABEL[sec]} · {c.label}
                    </h3>
                    <Pill tone={o.tone}>
                      <o.Icon aria-hidden />
                      {o.label}
                    </Pill>
                    {c.kind === 'added' && <Pill tone="success">Nuevo</Pill>}
                    {c.kind === 'removed' && <Pill tone="danger">Eliminado</Pill>}
                    {c.highlight && <Pill tone="warning">{c.highlight}</Pill>}
                  </div>
                  {c.kind === 'fields' && c.fields ? (
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-[13px]">
                        <thead className="bg-surface-2 text-xs font-medium text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Campo</th>
                            <th className="px-3 py-2 text-left font-medium">Antes</th>
                            <th className="px-3 py-2 text-left font-medium">Ahora</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.fields.map((f) => (
                            <tr key={f.field} className="border-t align-top">
                              <td className="px-3 py-2">{f.field}</td>
                              <td className="whitespace-pre-wrap bg-removed-soft px-3 py-2">{f.before}</td>
                              <td className="whitespace-pre-wrap bg-added-soft px-3 py-2 font-medium">{f.after}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <TextDiff before={c.before} after={c.after} mode={mode} />
                  )}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

/** Lista corta "v12 · publicada 05/10/2026 por J. Pérez" */
export function versionLine(v: Version) {
  return (
    <Fragment>
      Contenido <strong className="font-semibold">v{v.number}</strong> · publicada {formatDate(v.publishedAt ?? v.createdAt)} por {v.publishedBy ?? v.author}
    </Fragment>
  );
}
