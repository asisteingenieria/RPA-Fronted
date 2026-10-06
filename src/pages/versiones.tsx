import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, ListChecks, Rocket, Scale, ShieldCheck, X } from 'lucide-react';
import { formatDateTime, formatPct } from '@/lib/format';
import { diffSnapshots, hasLegalChange, summarize } from '@/lib/content-diff';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useAction, useContent } from '@/hooks/use-data';
import type { Version } from '@/data/types';
import { Button } from '@/components/ui/button';
import { VersionStatus } from '@/components/panel/badges';
import { Callout, ConfirmDialog, PageHeader, Panel } from '@/components/panel/common';
import { PermissionButton, PublishStepper } from '@/components/panel/workflow';
import { SubmitDialog } from '@/components/panel/submit-dialog';
import { DiffView, VersionTimeline } from '@/components/panel/visuals';

function stepOf(v: Version): { current: number; failedAt?: number; pending?: boolean } {
  switch (v.status) {
    case 'borrador':
      return { current: 0 };
    case 'evaluacion':
      return { current: 1 };
    case 'fallida':
      return { current: 1, failedAt: 1 };
    case 'lista':
      return { current: 2 };
    case 'aprobada':
      return { current: 3, pending: true };
    default:
      return { current: 3 };
  }
}

export function VersionesPage() {
  const { db, pub, changes: draftChanges } = useContent();
  const { user, actor, can, reason } = useUser();
  const latest = db.versions.at(-1)!;
  const top = latest.number > pub.number ? latest : undefined;
  const [selected, setSelected] = useState<number>(top?.number ?? pub.number);
  const [dialog, setDialog] = useState<null | 'reject' | 'publish' | 'approve' | 'legal' | { revert: number }>(null);
  const [submit, setSubmit] = useState(false);
  const approve = useAction((n: number, legal: boolean) => backend.approve(actor, n, legal), (_n, legal) => (legal ? 'Texto legal aprobado' : 'Versión aprobada'));
  const reject = useAction((n: number, c: string) => backend.reject(actor, n, c), 'Versión rechazada');
  const publish = useAction((n: number, note: string) => backend.publish(actor, n, note), (n) => `Versión v${n} publicada`);
  const revert = useAction((n: number, note: string) => backend.revert(actor, n, note), (n) => `Se revirtió a la v${n}`);

  const sel = db.versions.find((v) => v.number === selected) ?? pub;
  // Base de comparación: lo publicado (para versiones nuevas) o la versión publicada anterior.
  const base = sel.number > pub.number ? pub : (db.versions.filter((v) => v.number < sel.number && v.publishedAt).at(-1) ?? db.versions.filter((v) => v.number < sel.number).at(-1) ?? sel);
  const changes = diffSnapshots(base.snapshot, sel.snapshot);
  const run = top?.evalRunId ? db.evalRuns.find((r) => r.id === top.evalRunId) : undefined;
  const topChanges = top ? diffSnapshots(pub.snapshot, top.snapshot) : [];
  const needsLegal = hasLegalChange(topChanges);
  const isAuthor = top?.author === user.name;

  const approveBlock = !can('aprobar') ? reason('aprobar') : isAuthor ? `${user.name} no puede aprobar la v${top?.number} porque es su autor(a) (control de cuatro ojos).` : top?.status !== 'lista' ? 'La evaluación no ha pasado' : '';

  return (
    <>
      <PageHeader title="Versiones y publicación" />

      {top ? (
        <Panel bodyClassName="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold">Contenido v{top.number} · en curso</h2>
                <VersionStatus status={top.status} />
              </div>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Autor: {top.author} · {top.note}
                {run && ` · evaluación ${formatDateTime(run.startedAt)} (${formatPct(run.passRate * 100, 0)} · ${run.invented} datos inventados)`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {top.status === 'lista' && (
                <>
                  <PermissionButton variant="outline" allowed={can('aprobar') && !isAuthor} reason={approveBlock} onClick={() => setDialog('reject')}>
                    <X />
                    Rechazar con comentario
                  </PermissionButton>
                  {needsLegal && (
                    <PermissionButton variant="outline" allowed={can('editarLegal') && !top.legalApprovedBy && !isAuthor} reason={top.legalApprovedBy ? `Aprobado por ${top.legalApprovedBy}` : isAuthor ? 'El autor no puede aprobar su propio cambio' : 'Requiere rol Legal'} onClick={() => setDialog('legal')}>
                      <Scale />
                      {top.legalApprovedBy ? 'Legal aprobado' : 'Aprobar texto legal'}
                    </PermissionButton>
                  )}
                  <PermissionButton allowed={!approveBlock && !top.approvedBy} reason={top.approvedBy ? `Ya aprobada por ${top.approvedBy}; falta Legal` : approveBlock} onClick={() => setDialog('approve')}>
                    <Check />
                    Aprobar
                  </PermissionButton>
                </>
              )}
              {top.status === 'aprobada' && (
                <PermissionButton allowed={can('publicar')} reason={reason('publicar')} onClick={() => setDialog('publish')}>
                  <Rocket />
                  Publicar
                </PermissionButton>
              )}
              {(top.status === 'borrador' || top.status === 'fallida') && (
                <PermissionButton allowed={can('editarBorrador') && draftChanges.length > 0} reason={!can('editarBorrador') ? reason('editarBorrador') : 'No hay cambios en el borrador'} onClick={() => setSubmit(true)}>
                  <ListChecks />
                  Enviar borrador a evaluación
                </PermissionButton>
              )}
            </div>
          </div>
          <PublishStepper {...stepOf(top)} />
          {top.status === 'evaluacion' && (
            <div className="flex items-center gap-3 text-[13px]">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round((top.evalProgress ?? 0) * 100)}%` }} />
              </div>
              <span className="tabular text-muted-foreground">Corriendo la suite… {Math.round((top.evalProgress ?? 0) * 100)} %</span>
            </div>
          )}
          {top.status === 'fallida' && run && (
            <Callout tone="danger">
              La evaluación falló ({formatPct(run.passRate * 100, 0)} aprobado, meta ≥ 95 %; {run.invented} datos inventados). No se puede aprobar.{' '}
              <Link to="/evaluaciones" className="font-medium underline underline-offset-2">
                Ver detalle
              </Link>
            </Callout>
          )}
          {top.status === 'borrador' && top.rejectedComment && <Callout tone="warning">Rechazada: «{top.rejectedComment}». Corrige el borrador y envíalo de nuevo.</Callout>}
          {needsLegal && top.status === 'lista' && <Callout tone="warning" icon={<Scale />}>Esta versión cambia el texto legal: requiere también la aprobación del rol Legal{top.legalApprovedBy ? ` (aprobada por ${top.legalApprovedBy})` : ''}.</Callout>}
          {isAuthor && top.status === 'lista' && <Callout tone="info" icon={<ShieldCheck />}>{user.name} no puede aprobar la v{top.number} porque es su autor(a) (control de cuatro ojos).</Callout>}
        </Panel>
      ) : (
        <Callout tone="info">
          No hay versiones en curso. {draftChanges.length > 0 ? `El borrador tiene ${draftChanges.length} cambios sin publicar.` : 'El borrador es igual a la versión publicada.'}
          {draftChanges.length > 0 && can('editarBorrador') && (
            <Button size="sm" className="ml-3" onClick={() => setSubmit(true)}>
              <ListChecks />
              Enviar a evaluación
            </Button>
          )}
        </Callout>
      )}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Historial">
          <VersionTimeline versions={db.versions.slice().reverse()} selected={selected} onSelect={setSelected} onRevert={(n) => setDialog({ revert: n })} canRevert={can('publicar')} />
        </Panel>
        <Panel>
          <DiffView title={`Diferencias v${base.number} → v${sel.number}`} changes={base.number === sel.number ? [] : changes} summary={summarize(changes)} />
        </Panel>
      </div>

      <SubmitDialog open={submit} onOpenChange={setSubmit} />
      <ConfirmDialog open={dialog === 'approve'} onOpenChange={(o) => !o && setDialog(null)} title={`¿Aprobar la v${top?.number}?`} description={summarize(topChanges).join(' · ')} confirmLabel="Aprobar" onConfirm={() => approve.run(top!.number, false)} />
      <ConfirmDialog open={dialog === 'legal'} onOpenChange={(o) => !o && setDialog(null)} title="¿Aprobar el cambio del texto legal?" description="Queda registrado como aprobación de Legal para esta versión." confirmLabel="Aprobar texto legal" onConfirm={() => approve.run(top!.number, true)} />
      <ConfirmDialog open={dialog === 'reject'} onOpenChange={(o) => !o && setDialog(null)} title={`Rechazar la v${top?.number}`} description="La versión vuelve a borrador con tu comentario." confirmLabel="Rechazar" destructive requireText textLabel="Comentario" onConfirm={(c) => reject.run(top!.number, c)} />
      <ConfirmDialog
        open={dialog === 'publish'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`¿Publicar la v${top?.number}?`}
        description={
          <>
            Los clientes empiezan a recibir este contenido de inmediato. La v{pub.number} queda retirada y se puede revertir.
            <span className="mt-2 block font-medium text-foreground">{summarize(topChanges).join(' · ')}</span>
          </>
        }
        confirmLabel="Publicar"
        requireText
        textLabel="Nota de cambio"
        textPlaceholder={top?.note}
        onConfirm={(note) => publish.run(top!.number, note)}
      >
        {top && <PublishStepper current={3} />}
      </ConfirmDialog>
      <ConfirmDialog
        open={typeof dialog === 'object' && dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`¿Revertir a la v${typeof dialog === 'object' && dialog ? dialog.revert : ''}?`}
        description={`Los clientes vuelven a recibir ese contenido de inmediato y el borrador se reemplaza por él. La v${pub.number} queda retirada.`}
        confirmLabel="Revertir"
        destructive
        requireText
        textLabel="Motivo"
        onConfirm={(note) => {
          if (typeof dialog === 'object' && dialog) return revert.run(dialog.revert, note);
        }}
      />
    </>
  );
}
