/**
 * Agente → Conocimiento (Brains, v1.9; docs/DECISIONS.md D-001 de RobotRPA). Lista de Brains,
 * fuentes (archivos, texto y páginas web) con su estado, vista previa del catálogo y de los
 * documentos, publicar con evaluación y resumen de cambios, historial con restaurar, y prueba de
 * lo que recibiría el agente. Reglas: publicar SIEMPRE corre la suite (regla 13); precios y
 * planes solo desde el catálogo (regla 11); lo que el rol no permite se ve deshabilitado con su
 * motivo. Datos: /admin/knowledge/*.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Globe,
  History,
  Library,
  Link2,
  Link2Off,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  errorMessage,
  type BrainDetail,
  type BrainDiff,
  type BrainListItem,
  type BrainTestResult,
  type BrainVersionSummary,
  type KnowledgeSource,
  type KnowledgeUse,
  type SaleProcess,
} from '@/lib/api';
import { fmtDateTime, fmtWhen, formatBytes, formatCOP, formatInt } from '@/lib/format';
import { KIND_LABEL, PROCESS_LABEL, USE_HELP, USE_LABEL } from '@/lib/labels';
import { publishKnowledgeReason, reasonFor } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useUser } from '@/auth/session';
import {
  ActionButton,
  Callout,
  ConfirmDialog,
  Empty,
  ErrorState,
  ICON,
  IconAction,
  Panel,
  Segmented,
  SkeletonCard,
  SkeletonRows,
} from '@/components/rpa/common';
import { SourceState, VersionStatus } from '@/components/rpa/status';
import { EvalReport } from '@/components/rpa/agent/parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Mientras algo se procesa o evalúa, la pantalla se actualiza cada 5 s. */
const POLL_MS = 5_000;
const PROCESSES: SaleProcess[] = ['PORTABILIDAD', 'MIGRACION', 'LINEA_NUEVA'];

export const knowledgeKeys = {
  brains: ['brains'] as const,
  brain: (id: string) => ['brain', id] as const,
  version: (id: string, v: number, process?: SaleProcess) => ['brain-version', id, v, process ?? 'todos'] as const,
  agentBrains: ['agent-brains'] as const,
};

function useBrainMutation<T>(fn: () => Promise<T>, ok: (r: T) => string, fail: string, brainId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => toast.success(ok(r)),
    onError: (err) => toast.error(errorMessage(err, fail)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brains });
      void qc.invalidateQueries({ queryKey: knowledgeKeys.agentBrains });
      if (brainId) {
        void qc.invalidateQueries({ queryKey: knowledgeKeys.brain(brainId) });
        void qc.invalidateQueries({ queryKey: ['brain-version', brainId] });
      }
    },
  });
}

// ───────────────────────── Pestaña ─────────────────────────

export function KnowledgeTab() {
  const me = useUser();
  const manageReason = reasonFor(me.role, 'gestionarConocimiento');
  const brains = useQuery({
    queryKey: knowledgeKeys.brains,
    queryFn: api.brains,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((b) => b.processing || b.working?.status === 'EVALUATING') ? POLL_MS : false,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const list = brains.data ?? [];
  const current = list.find((b) => b.id === selected) ?? list[0];

  if (brains.isError) {
    return (
      <Panel>
        <ErrorState message="No se pudieron cargar los Brains." onRetry={() => void brains.refetch()} retrying={brains.isFetching} />
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-5 max-lg:grid-cols-1">
      <Panel
        title="Brains"
        icon={Library}
        flush
        actions={
          <ActionButton size="sm" icon={Plus} reason={manageReason} onClick={() => setCreating(true)}>
            Crear Brain
          </ActionButton>
        }
      >
        {brains.isLoading ? (
          <SkeletonRows rows={3} cols={1} />
        ) : !list.length ? (
          <Empty icon={Library} title="Todavía no hay Brains">
            Crea uno y agrégale fuentes: el catálogo de planes (Excel o CSV), textos o páginas web.
          </Empty>
        ) : (
          <ul className="m-0 flex list-none flex-col p-2">
            {list.map((b) => (
              <li key={b.id}>
                <BrainListRow brain={b} active={b.id === current?.id} onSelect={() => setSelected(b.id)} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {current ? (
        <BrainDetailView key={current.id} brainId={current.id} onDeleted={() => setSelected(null)} />
      ) : brains.isLoading ? (
        <SkeletonCard className="h-[420px]" />
      ) : null}

      <CreateBrainDialog open={creating} onOpenChange={setCreating} onCreated={(id) => setSelected(id)} />
    </div>
  );
}

function BrainListRow({ brain: b, active, onSelect }: { brain: BrainListItem; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active || undefined}
      className={cn(
        'flex w-full cursor-pointer flex-col gap-1.5 rounded-md px-3 py-2.5 text-left hover:bg-surface-200',
        active && 'bg-primary-soft hover:bg-primary-soft',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <b className="truncate font-semibold text-ink">{b.name}</b>
        {b.agents.length > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-success">
            <Link2 {...ICON} className="size-3.5" aria-hidden />
            Conectado
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        {b.published ? <VersionStatus status="PUBLISHED" /> : <span>Sin publicar</span>}
        {b.published && <span className="tabular-nums">v{b.published.version}</span>}
        {b.working && (
          <>
            <span aria-hidden>·</span>
            <VersionStatus status={b.working.status} />
          </>
        )}
      </span>
      <span className="text-xs text-ink-subtle">
        {b.sources} {b.sources === 1 ? 'fuente' : 'fuentes'}
        {b.uses.length > 0 && ` · ${b.uses.map((u) => USE_LABEL[u]).join(', ')}`}
        {b.errors > 0 && <span className="text-danger"> · {b.errors} con error</span>}
      </span>
    </button>
  );
}

function CreateBrainDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const create = useBrainMutation(
    () => api.createBrain(name.trim()),
    (r) => {
      onCreated(r.id);
      onOpenChange(false);
      setName('');
      return `Brain «${r.name}» creado`;
    },
    'No se pudo crear el Brain.',
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Crear Brain</DialogTitle>
          <DialogDescription>Una base de conocimiento: después le agregas fuentes y la conectas al agente.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <Label htmlFor="brain-name">Nombre</Label>
          <Input id="brain-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Catálogo Claro Móvil" autoFocus />
          <DialogFooter className="mt-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <ActionButton type="submit" loading={create.isPending} disabled={!name.trim()}>
              Crear Brain
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Detalle de un Brain ─────────────────────────

function BrainDetailView({ brainId, onDeleted }: { brainId: string; onDeleted: () => void }) {
  const me = useUser();
  const manageReason = reasonFor(me.role, 'gestionarConocimiento');
  const publishReason = publishKnowledgeReason(me);
  const q = useQuery({
    queryKey: knowledgeKeys.brain(brainId),
    queryFn: () => api.brain(brainId),
    refetchInterval: (s) => {
      const d = s.state.data;
      return d && (d.sources.some((x) => x.status === 'PROCESSING') || d.versions[0]?.status === 'EVALUATING') ? POLL_MS : false;
    },
  });
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<null | 'delete' | 'disconnect' | { source: KnowledgeSource }>(null);

  const b = q.data;
  const published = b?.versions.find((v) => v.status === 'PUBLISHED') ?? null;
  const latest = b?.versions[0] ?? null;
  const working = latest && latest.status !== 'PUBLISHED' && latest.status !== 'ARCHIVED' ? latest : null;
  const connected = !!b?.agents.length;
  const processing = b?.sources.some((s) => s.status === 'PROCESSING') ?? false;
  const evaluating = working?.status === 'EVALUATING';

  const publish = useBrainMutation(
    () => api.publishBrain(brainId),
    (r) => `Evaluación iniciada: v${r.version}`,
    'No se pudo publicar.',
    brainId,
  );
  const connect = useBrainMutation(() => api.connectBrain(brainId), () => 'Brain conectado al agente', 'No se pudo conectar.', brainId);
  const disconnect = useBrainMutation(() => api.disconnectBrain(brainId), () => 'Brain desconectado del agente', 'No se pudo desconectar.', brainId);
  const remove = useBrainMutation(() => api.deleteBrain(brainId), () => 'Brain eliminado', 'No se pudo eliminar.');
  const removeSource = useBrainMutation(
    () => (typeof confirm === 'object' && confirm ? api.removeSource(brainId, confirm.source.id) : Promise.reject(new Error('sin fuente'))),
    (r) => (r.draftVersion ? `Fuente quitada · borrador v${r.draftVersion}` : 'Fuente quitada'),
    'No se pudo quitar la fuente.',
    brainId,
  );
  // Reprocesar recibe la fuente en cada llamada.
  const qc = useQueryClient();
  const runReprocess = async (s: KnowledgeSource) => {
    try {
      await api.reprocessSource(brainId, s.id);
      toast.success(s.kind === 'WEB' ? 'Actualizando la página' : 'Reprocesando la fuente');
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo reprocesar.'));
    } finally {
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brain(brainId) });
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brains });
    }
  };

  if (q.isError) {
    return (
      <Panel>
        <ErrorState message="No se pudo cargar el Brain." onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Panel>
    );
  }
  if (!b) return <SkeletonCard className="h-[420px]" />;

  const publishBlocker =
    publishReason ??
    (evaluating
      ? 'Ya hay una versión en evaluación'
      : processing
        ? 'Espera a que terminen de procesarse las fuentes'
        : working?.status !== 'DRAFT'
          ? 'No hay cambios sin publicar'
          : undefined);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-surface-100 px-5 py-4 shadow-card">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-ink">
          <BookOpen {...ICON} className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate font-display text-lg leading-6 font-semibold text-ink">{b.name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {published ? (
              <>
                <VersionStatus status="PUBLISHED" />
                <span className="tabular-nums">
                  v{published.version} · {fmtWhen(published.publishedAt)} por {published.publishedBy ?? '—'}
                </span>
              </>
            ) : (
              <span>Sin versión publicada</span>
            )}
            {working && (
              <>
                <span aria-hidden>·</span>
                <VersionStatus status={working.status} />
                <span className="tabular-nums">v{working.version}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span className={connected ? 'font-semibold text-success' : undefined}>{connected ? 'Conectado al agente' : 'No conectado'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <ActionButton variant="secondary" size="sm" icon={Link2Off} reason={publishReason} onClick={() => setConfirm('disconnect')}>
              Desconectar
            </ActionButton>
          ) : (
            <ActionButton
              variant="secondary"
              size="sm"
              icon={Link2}
              reason={publishReason ?? (published ? undefined : 'Publica el Brain antes de conectarlo')}
              loading={connect.isPending}
              onClick={() => connect.mutate()}
            >
              Conectar al agente
            </ActionButton>
          )}
          <ActionButton icon={Send} reason={publishBlocker} loading={publish.isPending} onClick={() => publish.mutate()}>
            Publicar Brain con evaluación
          </ActionButton>
          <IconAction
            icon={Trash2}
            label="Eliminar Brain"
            danger
            reason={manageReason ?? (connected ? 'Desconéctalo del agente primero' : undefined)}
            onClick={() => setConfirm('delete')}
          />
        </div>
      </section>

      {evaluating && (
        <Callout tone="warning" icon={FlaskConical}>
          Evaluando v{working?.version}… Corre la suite completa de conversaciones con el agente publicado. La pantalla se actualiza cada 5 s; mientras
          tanto no se pueden cambiar las fuentes.
        </Callout>
      )}
      {working?.status === 'REJECTED' && working.evalSummary && <EvalReport version={working.version} summary={working.evalSummary} />}
      {working?.status === 'DRAFT' && working.diff && <ChangesSummary version={working.version} against={published?.version ?? null} diff={working.diff} />}

      <SourcesPanel
        brain={b}
        manageReason={manageReason ?? (evaluating ? 'Hay una versión en evaluación' : undefined)}
        onAdd={() => setAdding(true)}
        onRemove={(s) => setConfirm({ source: s })}
        onReprocess={(s) => void runReprocess(s)}
      />
      <PreviewPanel brainId={brainId} published={published} working={working} />
      <TestPanel
        brainId={brainId}
        published={published}
        working={working}
        hasCatalog={b.sources.some((s) => s.use === 'CATALOG')}
      />
      <HistoryPanel brainId={brainId} versions={b.versions} restoreReason={publishReason ?? (evaluating ? 'Hay una versión en evaluación' : undefined)} />

      <AddSourceDialog open={adding} onOpenChange={setAdding} brain={b} />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`¿Eliminar «${b.name}»?`}
        description="Se borran sus fuentes, versiones y archivos. La auditoría conserva el registro."
        confirmLabel="Eliminar Brain"
        danger
        onConfirm={() => remove.mutateAsync().then(onDeleted)}
      />
      <ConfirmDialog
        open={confirm === 'disconnect'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="¿Desconectar del agente?"
        description={
          (b.versions.find((v) => v.status === 'PUBLISHED')?.records ?? 0) > 0
            ? 'Es el catálogo del agente: sin él no ofrecerá planes y pasará las conversaciones de venta a un asesor.'
            : 'El agente deja de usar estos documentos desde el siguiente turno.'
        }
        confirmLabel="Desconectar"
        danger
        onConfirm={() => disconnect.mutateAsync()}
      />
      <ConfirmDialog
        open={typeof confirm === 'object' && confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={typeof confirm === 'object' && confirm ? `¿Quitar «${confirm.source.name}»?` : ''}
        description="Se arma un borrador sin esta fuente. El agente sigue con la versión publicada hasta que publiques."
        confirmLabel="Quitar fuente"
        danger
        onConfirm={() => removeSource.mutateAsync()}
      />
    </div>
  );
}

// ───────────────────────── Cambios del borrador ─────────────────────────

function ChangesSummary({ version, against, diff }: { version: number; against: number | null; diff: BrainDiff }) {
  const [open, setOpen] = useState(false);
  const docs = diff.documents;
  const docChanges = docs ? docs.added.length + docs.removed.length + docs.changed.length : 0;
  const total = diff.added.length + diff.removed.length + diff.changed.length + docChanges;
  return (
    <Panel
      title={`Cambios del borrador v${version}`}
      icon={FileText}
      badge={<span className="text-xs font-medium text-ink-muted">{against ? `frente a la v${against} publicada` : 'primera versión'}</span>}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Ocultar detalle' : 'Ver detalle'}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2 text-[13px]">
        <Chip tone="success">+{plural(diff.added.length, 'plan', 'planes')}</Chip>
        <Chip tone="danger">−{plural(diff.removed.length, 'plan', 'planes')}</Chip>
        <Chip tone="warning">~{plural(diff.changed.length, 'plan cambiado', 'planes cambiados')}</Chip>
        {docs && <Chip tone="info">{plural(docChanges, 'documento', 'documentos')}</Chip>}
        <span className="self-center text-xs text-ink-subtle">
          {total ? 'Publicar corre la suite de evaluación antes de que el agente use estos cambios.' : 'Sin cambios.'}
        </span>
      </div>
      {open && (
        <div className="mt-4 flex flex-col gap-3 text-[13px]">
          {diff.changed.map((c) => (
            <div key={c.code} className="rounded-md border px-3 py-2">
              <b className="font-mono">{c.code}</b> · {c.name} · {PROCESS_LABEL[c.process]}
              <ul className="m-0 mt-1 list-none p-0">
                {c.changes.map((ch) => (
                  <li key={ch.field} className="flex flex-wrap gap-1.5">
                    <span className="text-ink-muted">{ch.label}:</span>
                    <span className="text-danger line-through">{fmtValue(ch.field, ch.before)}</span>
                    <span aria-hidden>→</span>
                    <span className="font-semibold text-success">{fmtValue(ch.field, ch.after)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {diff.added.length > 0 && <p className="m-0">Agregados: {diff.added.map((a) => `${a.code} (${PROCESS_LABEL[a.process]})`).join(', ')}</p>}
          {diff.removed.length > 0 && <p className="m-0">Quitados: {diff.removed.map((a) => `${a.code} (${PROCESS_LABEL[a.process]})`).join(', ')}</p>}
          {docs &&
            [...docs.added.map((d) => `+ ${d.source}`), ...docs.removed.map((d) => `− ${d.source}`), ...docs.changed.map((d) => `~ ${d.source}`)].map((l) => (
              <p key={l} className="m-0">
                Documento {l}
              </p>
            ))}
        </div>
      )}
    </Panel>
  );
}

const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;

const fmtValue = (field: string, v: string | number | null) =>
  v === null || v === '' ? '—' : field === 'priceCop' && typeof v === 'number' ? formatCOP(v) : String(v);

function Chip({ tone, children }: { tone: 'success' | 'danger' | 'warning' | 'info'; children: ReactNode }) {
  const cls = {
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
    info: 'bg-primary-soft text-primary-soft-ink',
  }[tone];
  return <span className={cn('inline-flex h-7 items-center rounded-sm px-2.5 font-semibold tabular-nums', cls)}>{children}</span>;
}

// ───────────────────────── Fuentes ─────────────────────────

const KIND_ICON = { FILE: FileSpreadsheet, TEXT: FileText, WEB: Globe } as const;

function SourcesPanel({
  brain,
  manageReason,
  onAdd,
  onRemove,
  onReprocess,
}: {
  brain: BrainDetail;
  manageReason?: string;
  onAdd: () => void;
  onRemove: (s: KnowledgeSource) => void;
  onReprocess: (s: KnowledgeSource) => void;
}) {
  return (
    <Panel
      title="Fuentes"
      icon={Upload}
      flush
      actions={
        <ActionButton size="sm" icon={Plus} reason={manageReason} onClick={onAdd}>
          Agregar fuente
        </ActionButton>
      }
    >
      {!brain.sources.length ? (
        <Empty icon={Upload} title="Sin fuentes">
          Agrega el catálogo de planes (Excel o CSV), un texto o una página web.
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fuente</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contenido</TableHead>
                <TableHead>Actualizada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brain.sources.map((s) => {
                const I = KIND_ICON[s.kind];
                const warnings = (s.issues ?? []).filter((i) => s.status !== 'ERROR' || !i.row);
                return (
                  <TableRow key={s.id} className="align-top">
                    <TableCell className="max-w-[280px] whitespace-normal">
                      <div className="flex items-start gap-2">
                        <I {...ICON} className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                        <div className="min-w-0">
                          <div className="truncate font-semibold" title={s.url ?? s.name}>
                            {s.name}
                          </div>
                          <div className="text-xs text-ink-subtle">
                            {KIND_LABEL[s.kind]}
                            {s.metadata?.proceso && ` · solo ${PROCESS_LABEL[s.metadata.proceso]}`}
                            {s.kind === 'WEB' && (s.refreshHours ? ` · cada ${refreshLabel(s.refreshHours)}` : ' · actualización manual')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{USE_LABEL[s.use]}</TableCell>
                    <TableCell className="tabular-nums">{s.sizeBytes ? formatBytes(s.sizeBytes) : '—'}</TableCell>
                    <TableCell className="max-w-[340px] min-w-[220px] whitespace-normal">
                      <SourceState status={s.status} />
                      {s.status === 'ERROR' && s.errorReason && !(s.issues ?? []).some((i) => i.row) && (
                        <div className="mt-1 text-xs text-danger">{s.errorReason}</div>
                      )}
                      {s.status === 'ERROR' && (s.issues ?? []).some((i) => i.row) && <IssuesList issues={(s.issues ?? []).filter((i) => i.row)} tone="danger" />}
                      {warnings.length > 0 && <IssuesList issues={warnings} tone="warning" />}
                    </TableCell>
                    <TableCell className="tabular-nums text-ink-muted">
                      {s.use === 'CATALOG' ? (s.status === 'READY' ? 'Registros del catálogo' : '—') : s.chunks ? plural(s.chunks, 'fragmento', 'fragmentos') : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink-muted">{fmtWhen(s.lastIngestedAt)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <IconAction
                        icon={RefreshCw}
                        label={s.kind === 'WEB' ? 'Actualizar ahora' : 'Reprocesar'}
                        reason={manageReason ?? (s.status === 'PROCESSING' ? 'Ya se está procesando' : undefined)}
                        onClick={() => onReprocess(s)}
                      />
                      <IconAction icon={Trash2} label="Quitar fuente" danger reason={manageReason} onClick={() => onRemove(s)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

function IssuesList({ issues, tone }: { issues: { row?: number; column?: string; message: string }[]; tone: 'danger' | 'warning' }) {
  const [open, setOpen] = useState(false);
  if (!issues.length) return null;
  const shown = open ? issues : issues.slice(0, 2);
  return (
    <div className={cn('mt-1 text-xs', tone === 'danger' ? 'text-danger' : 'text-warning')}>
      <ul className="m-0 list-none p-0">
        {shown.map((i, n) => (
          <li key={n}>
            {[i.row ? `Fila ${i.row}` : null, i.column].filter(Boolean).join(', ')}
            {(i.row || i.column) && ': '}
            {i.message}
          </li>
        ))}
      </ul>
      {issues.length > 2 && (
        <button type="button" className="cursor-pointer font-semibold underline" onClick={() => setOpen((o) => !o)}>
          {open ? 'Ver menos' : `Ver ${issues.length - 2} más`}
        </button>
      )}
    </div>
  );
}

const refreshLabel = (h: number) => (h % 24 === 0 ? `${h / 24} ${h === 24 ? 'día' : 'días'}` : `${h} h`);

// ───────────────────────── Agregar fuente ─────────────────────────

type AddMode = 'web' | 'archivos' | 'texto';

function AddSourceDialog({ open, onOpenChange, brain }: { open: boolean; onOpenChange: (o: boolean) => void; brain: BrainDetail }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<AddMode>('archivos');
  const [use, setUse] = useState<KnowledgeUse>('CATALOG');
  const [proceso, setProceso] = useState<SaleProcess | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [refresh, setRefresh] = useState<string>('manual');

  useEffect(() => {
    if (open) return;
    setFile(null);
    setName('');
    setText('');
    setUrl('');
  }, [open]);
  useEffect(() => {
    // El catálogo solo se carga como archivo (Excel o CSV).
    if (mode !== 'archivos' && use === 'CATALOG') setUse('SEARCH');
  }, [mode, use]);

  const add = useMutation({
    mutationFn: () => {
      const o = { use, proceso: use === 'CATALOG' ? '' : proceso };
      if (mode === 'archivos') return api.addFileSource(brain.id, file!, o);
      if (mode === 'texto') return api.addTextSource(brain.id, { ...o, name: name.trim(), text });
      return api.addWebSource(brain.id, { ...o, url: url.trim(), refreshHours: refresh === 'manual' ? null : Number(refresh) });
    },
    onSuccess: (s) => {
      toast.success(`Fuente «${s.name}» agregada: procesando`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo agregar la fuente.')),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brain(brain.id) });
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brains });
    },
  });

  const maxBytes = use === 'CATALOG' ? brain.limits.catalogMaxBytes : brain.limits.documentMaxBytes;
  const accept = use === 'CATALOG' ? '.xlsx,.csv' : '.pdf,.docx,.txt,.md';
  const fileProblem = file && file.size > maxBytes ? `El archivo supera ${formatBytes(maxBytes)}.` : undefined;
  const ready =
    mode === 'archivos' ? !!file && !fileProblem : mode === 'texto' ? !!name.trim() && !!text.trim() && text.length <= brain.limits.textMaxChars : /^https:\/\//i.test(url.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !add.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Agregar fuente a «{brain.name}»</DialogTitle>
          <DialogDescription>La fuente se procesa en segundo plano y arma un borrador; el agente no la usa hasta que publiques.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) add.mutate();
          }}
        >
          <Segmented
            label="Tipo de fuente"
            value={mode}
            onChange={setMode}
            items={[
              { id: 'web', label: 'Páginas web', icon: Globe },
              { id: 'archivos', label: 'Archivos', icon: Upload },
              { id: 'texto', label: 'Texto', icon: FileText },
            ]}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="src-use">Uso</Label>
            <Select value={use} onValueChange={(v) => setUse(v as KnowledgeUse)}>
              <SelectTrigger id="src-use">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mode === 'archivos' && <SelectItem value="CATALOG">Catálogo de planes (Excel o CSV)</SelectItem>}
                <SelectItem value="FULL_CONTEXT">Contexto completo</SelectItem>
                <SelectItem value="SEARCH">Búsqueda</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-ink-subtle">{USE_HELP[use]}</span>
          </div>

          {use !== 'CATALOG' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="src-proc">Aplica a</Label>
              <Select value={proceso || 'todos'} onValueChange={(v) => setProceso(v === 'todos' ? '' : (v as SaleProcess))}>
                <SelectTrigger id="src-proc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los procesos</SelectItem>
                  {PROCESSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      Solo {PROCESS_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'archivos' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="src-file">Archivo</Label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="src-file"
                  type="file"
                  accept={accept}
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById('src-file')?.click()}>
                  <Upload {...ICON} aria-hidden />
                  Elegir archivo
                </Button>
                <span className="min-w-0 truncate text-[13px] text-ink-muted">
                  {file ? `${file.name} · ${formatBytes(file.size)}` : 'Ningún archivo elegido'}
                </span>
              </div>
              <span className={cn('text-xs', fileProblem ? 'text-danger' : 'text-ink-subtle')}>
                {fileProblem ??
                  (use === 'CATALOG'
                    ? `Columnas: Proceso, ID, Datos, GB para compartir, Incluye, Servicios adicionales, Apps ilimitadas, Llamadas y mensajes, Precio, Descuento (Nombre opcional). Máximo ${formatBytes(maxBytes)}.`
                    : `PDF, DOCX, TXT o MD. Máximo ${formatBytes(maxBytes)}.`)}
              </span>
            </div>
          )}

          {mode === 'texto' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="src-name">Nombre</Label>
                <Input id="src-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Preguntas frecuentes" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="src-text">Contenido</Label>
                <Textarea id="src-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[180px] font-mono text-[13px]" />
                <span className={cn('text-xs tabular-nums', text.length > brain.limits.textMaxChars ? 'text-danger' : 'text-ink-subtle')}>
                  {formatInt(text.length)} / {formatInt(brain.limits.textMaxChars)} caracteres. Precios, planes y textos legales van en el catálogo, no aquí.
                </span>
              </div>
            </>
          )}

          {mode === 'web' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="src-url">Dirección (https)</Label>
                <Input id="src-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.ejemplo.com/preguntas-frecuentes" />
                <span className="text-xs text-ink-subtle">Solo páginas públicas por https. Las direcciones internas se rechazan.</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="src-refresh">Actualización</Label>
                <Select value={refresh} onValueChange={setRefresh}>
                  <SelectTrigger id="src-refresh">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (botón Actualizar ahora)</SelectItem>
                    <SelectItem value="24">Cada día</SelectItem>
                    <SelectItem value="168">Cada semana</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-ink-subtle">Cada actualización con cambios arma un borrador: hay que publicarlo para que el agente lo use.</span>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={add.isPending}>
              Cancelar
            </Button>
            <ActionButton type="submit" icon={Plus} loading={add.isPending} disabled={!ready}>
              Agregar fuente
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Vista previa ─────────────────────────

function PreviewPanel({ brainId, published, working }: { brainId: string; published: BrainVersionSummary | null; working: BrainVersionSummary | null }) {
  const options = [
    ...(working ? [{ id: String(working.version), label: `Borrador v${working.version}` }] : []),
    ...(published ? [{ id: String(published.version), label: `Publicada v${published.version}` }] : []),
  ];
  const [version, setVersion] = useState<string>(options[0]?.id ?? '');
  const [process, setProcess] = useState<SaleProcess | 'todos'>('todos');
  useEffect(() => {
    if (!options.some((o) => o.id === version)) setVersion(options[0]?.id ?? '');
  }, [options, version]);
  const v = Number(version);
  const q = useQuery({
    queryKey: knowledgeKeys.version(brainId, v, process === 'todos' ? undefined : process),
    queryFn: () => api.brainVersion(brainId, v, process === 'todos' ? undefined : process),
    enabled: v > 0,
  });

  return (
    <Panel
      title="Vista previa"
      icon={BookOpen}
      flush
      actions={
        options.length > 0 && (
          <Segmented label="Versión" value={version} onChange={setVersion} items={options} />
        )
      }
    >
      {!options.length ? (
        <Empty icon={BookOpen} title="Nada que mostrar todavía">
          Cuando las fuentes terminen de procesarse verás aquí el catálogo y los documentos.
        </Empty>
      ) : q.isLoading ? (
        <SkeletonRows rows={4} cols={5} />
      ) : q.isError ? (
        <ErrorState message="No se pudo cargar la versión." onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : q.data ? (
        <div className="flex flex-col">
          {(q.data.records.length > 0 || process !== 'todos') && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
                <b className="text-[13px] font-semibold">Catálogo · {formatInt(q.data.records.length)} planes</b>
                <Segmented
                  label="Proceso"
                  value={process}
                  onChange={setProcess}
                  items={[{ id: 'todos', label: 'Todos' }, ...PROCESSES.map((p) => ({ id: p, label: PROCESS_LABEL[p]! }))]}
                />
              </div>
              <CatalogTable rows={q.data.records} />
            </>
          )}
          {q.data.documents.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-5 py-4">
              <b className="text-[13px] font-semibold">Documentos</b>
              {q.data.documents.map((d) => (
                <details key={`${d.use}:${d.source}`} className="rounded-md border px-3 py-2">
                  <summary className="cursor-pointer text-[13px]">
                    <b>{d.source}</b> · {USE_LABEL[d.use]} · <span className="tabular-nums">{formatInt(d.chunks)} fragmentos · ~{formatInt(d.tokens)} tokens</span>
                  </summary>
                  {d.preview.map((p, i) => (
                    <p key={i} className="m-0 mt-2 border-l-2 pl-3 text-xs whitespace-pre-wrap text-ink-muted">
                      {p}
                      {p.length >= 400 && '…'}
                    </p>
                  ))}
                </details>
              ))}
            </div>
          )}
          {!q.data.records.length && !q.data.documents.length && process === 'todos' && (
            <Empty icon={BookOpen} title="Versión vacía">
              No tiene planes ni documentos.
            </Empty>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

function CatalogTable({ rows }: { rows: { code: string; title: string; process: SaleProcess; dataText: string; includesText: string | null; unlimitedAppsText: string | null; callsText: string | null; priceCop: number; discountText: string | null }[] }) {
  if (!rows.length) return <Empty icon={Search} title="Sin planes para este proceso" />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Proceso</TableHead>
            <TableHead>Datos</TableHead>
            <TableHead>Incluye</TableHead>
            <TableHead>Apps ilimitadas</TableHead>
            <TableHead>Llamadas y mensajes</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead>Descuento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.code}>
              <TableCell className="font-mono text-xs">{r.code}</TableCell>
              <TableCell className="min-w-[160px] font-semibold whitespace-normal">{r.title}</TableCell>
              <TableCell>{PROCESS_LABEL[r.process]}</TableCell>
              <TableCell>{r.dataText}</TableCell>
              <TableCell className="max-w-[200px] whitespace-normal text-ink-muted">{r.includesText ?? '—'}</TableCell>
              <TableCell className="max-w-[160px] whitespace-normal text-ink-muted">{r.unlimitedAppsText ?? '—'}</TableCell>
              <TableCell className="max-w-[160px] whitespace-normal text-ink-muted">{r.callsText ?? '—'}</TableCell>
              <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">{formatCOP(r.priceCop)}</TableCell>
              <TableCell className="max-w-[200px] whitespace-normal text-ink-muted">{r.discountText ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ───────────────────────── Probar ─────────────────────────

function TestPanel({
  brainId,
  published,
  working,
  hasCatalog,
}: {
  brainId: string;
  published: BrainVersionSummary | null;
  working: BrainVersionSummary | null;
  hasCatalog: boolean;
}) {
  const [mode, setMode] = useState<'planes' | 'pregunta'>(hasCatalog ? 'planes' : 'pregunta');
  const [target, setTarget] = useState<'published' | 'draft'>(published ? 'published' : 'draft');
  const [process, setProcess] = useState<SaleProcess>('PORTABILIDAD');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<BrainTestResult | null>(null);
  const run = useMutation({
    mutationFn: () =>
      api.testBrain(brainId, {
        ...(mode === 'planes' ? { process } : { question, process }),
        ...(target === 'draft' ? { version: 'draft' as const } : {}),
      }),
    onSuccess: setResult,
    onError: (err) => toast.error(errorMessage(err, 'No se pudo probar.')),
  });
  const available = !!published || !!working;

  return (
    <Panel
      title="Probar lo que recibe el agente"
      icon={FlaskConical}
      actions={
        <Segmented
          label="Versión a probar"
          value={target}
          onChange={setTarget}
          items={[
            { id: 'published', label: 'Publicada', ...(published ? {} : { disabled: 'No hay versión publicada' }) },
            { id: 'draft', label: 'Borrador', ...(working ? {} : { disabled: 'No hay borrador' }) },
          ]}
        />
      }
    >
      {!available ? (
        <p className="m-0 text-[13px] text-ink-muted">Agrega fuentes para poder probar.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run.mutate();
            }}
          >
            <Segmented
              label="Qué probar"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setResult(null);
              }}
              items={[
                { id: 'planes', label: 'consultar_planes', icon: FileSpreadsheet },
                { id: 'pregunta', label: 'Pregunta', icon: Search },
              ]}
            />
            <Select value={process} onValueChange={(v) => setProcess(v as SaleProcess)}>
              <SelectTrigger className="w-[170px]" aria-label="Proceso">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROCESS_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mode === 'pregunta' && (
              <Input
                className="min-w-[240px] flex-1"
                value={question}
                maxLength={2000}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="¿Qué necesito para la portabilidad?"
                aria-label="Pregunta del cliente"
              />
            )}
            <ActionButton type="submit" icon={FlaskConical} loading={run.isPending} disabled={mode === 'pregunta' && !question.trim()}>
              Probar
            </ActionButton>
          </form>

          {result?.mode === 'catalog' &&
            (result.status === 'SIN_PLANES' ? (
              <Callout tone="warning">
                Sin planes para {PROCESS_LABEL[result.process]} en la v{result.version}. El agente no ofrecería nada y pasaría la conversación a un asesor
                (no inventa planes).
              </Callout>
            ) : (
              <div className="-mx-5">
                <CatalogTable rows={result.plans} />
              </div>
            ))}
          {result?.mode === 'documents' &&
            (result.blocks.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {result.blocks.map((b) => (
                  <li key={b.chunkId} className="rounded-md border px-3 py-2 text-[13px]">
                    <div className="mb-1 text-xs font-semibold text-ink-muted">
                      {b.kind === 'FULL_CONTEXT' ? 'Contexto completo' : 'Búsqueda'} · {b.sourceName}
                    </div>
                    <p className="m-0 whitespace-pre-wrap">{b.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Callout tone="info">Ningún documento coincide con la pregunta.</Callout>
            ))}
        </div>
      )}
    </Panel>
  );
}

// ───────────────────────── Historial ─────────────────────────

function HistoryPanel({ brainId, versions, restoreReason }: { brainId: string; versions: BrainVersionSummary[]; restoreReason?: string }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<BrainVersionSummary | null>(null);
  const restore = useMutation({
    mutationFn: (v: number) => api.restoreBrainVersion(brainId, v),
    onSuccess: (r) => toast.success(`Borrador v${r.version} creado: publícalo para usarlo`),
    onError: (err) => toast.error(errorMessage(err, 'No se pudo restaurar.')),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brain(brainId) });
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brains });
    },
  });
  return (
    <Panel title="Historial" icon={History} flush>
      {!versions.length ? (
        <Empty icon={History} title="Sin versiones" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contenido</TableHead>
                <TableHead>Cambios</TableHead>
                <TableHead>Evaluación</TableHead>
                <TableHead>Publicada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => {
                const e = v.evalSummary;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold tabular-nums">
                      v{v.version}
                      {v.basedOn && <span className="block text-xs font-normal text-ink-subtle">desde v{v.basedOn}</span>}
                    </TableCell>
                    <TableCell>
                      <VersionStatus status={v.status} />
                    </TableCell>
                    <TableCell className="text-ink-muted tabular-nums">
                      {formatInt(v.records)} planes · {formatInt(v.chunks)} fragmentos
                    </TableCell>
                    <TableCell className="text-ink-muted tabular-nums">
                      {v.changes ? `+${v.changes.added} −${v.changes.removed} ~${v.changes.changed} · ${v.changes.documents} doc.` : '—'}
                    </TableCell>
                    <TableCell className="min-w-[180px] whitespace-normal text-ink-muted">
                      {!e
                        ? '—'
                        : e.cases
                          ? `${e.passed}/${e.cases} correctos · ${e.invented ?? 0} inventados`
                          : (e.problems ?? [])[0] ?? ('skipped' in e ? 'Carga inicial (sin suite)' : '—')}
                    </TableCell>
                    <TableCell className="min-w-[150px] whitespace-normal text-ink-muted">
                      {v.publishedAt ? `${fmtDateTime(v.publishedAt)} · ${v.publishedBy ?? '—'}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {(v.status === 'ARCHIVED' || v.status === 'REJECTED') && (
                        <ActionButton
                          variant="ghost"
                          size="sm"
                          icon={RotateCcw}
                          reason={restoreReason}
                          loading={restore.isPending && restore.variables === v.version}
                          onClick={() => setPending(v)}
                        >
                          Restaurar
                        </ActionButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? `¿Restaurar la v${pending.version} como borrador?` : ''}
        description="Se crea un borrador con su contenido. El agente sigue con la versión publicada hasta que publiques (con evaluación)."
        confirmLabel="Restaurar como borrador"
        onConfirm={() => (pending ? restore.mutateAsync(pending.version) : undefined)}
      />
    </Panel>
  );
}

// ───────────────────────── Selector en Configuración ─────────────────────────

/**
 * Brains conectados al agente (Agente → Configuración). Conectar/desconectar exige el permiso
 * «Publicar conocimiento»; solo se conectan Brains publicados y un solo catálogo por agente.
 */
export function AgentBrainsSelector() {
  const me = useUser();
  const reason = publishKnowledgeReason(me);
  const qc = useQueryClient();
  const brains = useQuery({ queryKey: knowledgeKeys.brains, queryFn: api.brains });
  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => (on ? api.connectBrain(id) : api.disconnectBrain(id)),
    onSuccess: (_r, v) => toast.success(v.on ? 'Brain conectado al agente' : 'Brain desconectado del agente'),
    onError: (err) => toast.error(errorMessage(err, 'No se pudo cambiar la conexión.')),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: knowledgeKeys.brains });
      void qc.invalidateQueries({ queryKey: ['agent'] });
    },
  });
  const [pendingOff, setPendingOff] = useState<BrainListItem | null>(null);
  const list = brains.data ?? [];
  const catalogConnected = useMemo(
    () => list.find((b) => b.agents.length && b.uses.includes('CATALOG')),
    [list],
  );

  if (brains.isLoading) return <SkeletonRows rows={2} cols={1} />;
  if (brains.isError) return <ErrorState message="No se pudieron cargar los Brains." onRetry={() => void brains.refetch()} />;
  if (!list.length) return <p className="m-0 text-[13px] text-ink-muted">Todavía no hay Brains. Créalos en la pestaña Conocimiento.</p>;

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {list.map((b) => {
          const on = b.agents.length > 0;
          const why =
            reason ??
            (!on && !b.published
              ? 'Publica el Brain antes de conectarlo'
              : !on && b.uses.includes('CATALOG') && catalogConnected && catalogConnected.id !== b.id
                ? `El agente ya usa el catálogo «${catalogConnected.name}»`
                : undefined);
          const sw = (
            <Switch
              checked={on}
              disabled={!!why || toggle.isPending}
              onCheckedChange={(v) => (v ? toggle.mutate({ id: b.id, on: true }) : setPendingOff(b))}
              aria-label={`Conectar ${b.name} al agente`}
            />
          );
          return (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{b.name}</div>
                <div className="text-xs text-ink-subtle">
                  {b.uses.map((u) => USE_LABEL[u]).join(', ') || 'Sin fuentes'}
                  {b.published ? ` · v${b.published.version} publicada` : ' · sin publicar'}
                </div>
              </div>
              {why ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>{sw}</span>
                  </TooltipTrigger>
                  <TooltipContent>{why}</TooltipContent>
                </Tooltip>
              ) : (
                sw
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={!!pendingOff}
        onOpenChange={(o) => !o && setPendingOff(null)}
        title={pendingOff ? `¿Desconectar «${pendingOff.name}»?` : ''}
        description={
          pendingOff?.uses.includes('CATALOG')
            ? 'Es el catálogo del agente: sin él no ofrecerá planes y pasará las conversaciones de venta a un asesor.'
            : 'El agente deja de usar estos documentos desde el siguiente turno.'
        }
        confirmLabel="Desconectar"
        danger
        onConfirm={() => (pendingOff ? toggle.mutateAsync({ id: pendingOff.id, on: false }) : undefined)}
      />
    </>
  );
}
