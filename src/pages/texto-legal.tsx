import { useState } from 'react';
import { Copy, Diff, Save, Scale, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/format';
import { diffSnapshots } from '@/lib/content-diff';
import { fnv64 } from '@/lib/hash';
import { renderLegal } from '@/engine/simulator';
import { useUser } from '@/auth/session';
import { useContent } from '@/hooks/use-data';
import { useSectionEditor } from '@/hooks/use-editor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OriginBadge, Pill, VersionStatus } from '@/components/panel/badges';
import { Callout, ConfirmDialog, Field, PageHeader, Panel } from '@/components/panel/common';
import { ContentEditor } from '@/components/panel/content-editor';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';
import { UnsavedGuard } from '@/components/panel/unsaved-guard';
import { DiffView } from '@/components/panel/visuals';

export function TextoLegalPage() {
  const ed = useSectionEditor('legal', 'legal');
  const { can, reason } = useUser();
  const { db, pub, draft } = useContent();
  const [confirm, setConfirm] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const allowed = can('editarLegal');
  const l = ed.value;
  const missingDate = !l.text.includes('{{FECHA}}');
  const save = () => ed.save(['legal'], 'Texto legal');
  const changes = diffSnapshots(pub.snapshot, { ...draft.snapshot, legal: l }).filter((c) => c.section === 'legal');

  // Historial: una fila por versión en la que cambió el texto legal.
  const history = db.versions.filter((v, i, all) => i === 0 || v.snapshot.legal.text !== all[i - 1]!.snapshot.legal.text);

  return (
    <>
      <UnsavedGuard when={ed.isDirty} onSave={save} />
      <PageHeader
        crumbs={['Conversación']}
        title="Texto legal de autorización"
        badges={<OriginBadge kind="legal" />}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowDiff(true)}>
              <Diff />
              Ver diferencias
            </Button>
            <PermissionButton allowed={allowed} reason={reason('editarLegal')} onClick={() => setConfirm(true)} disabled={!ed.isDirty || missingDate || !l.acceptance.trim()}>
              <Save />
              Guardar borrador
            </PermissionButton>
          </>
        }
      />
      <Callout tone="warning" icon={<Scale />}>
        <strong>Texto legal de autorización ({l.normRef}).</strong> Solo el rol Legal puede editarlo. Cada versión queda registrada como evidencia de lo que aceptó cada cliente; publicar un cambio requiere además la aprobación de Legal.
      </Callout>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <Panel title="Texto" badges={ed.changedKeys.has('legal') && <Pill tone="warning">Modificado en borrador</Pill>} description="La fecha la pone el sistema; no se puede borrar.">
            <ContentEditor label="Texto legal" value={l.text} onChange={(v) => ed.update((x) => ({ ...x, text: v }))} lockedVars={['{{FECHA}}']} readOnly={!allowed} lastEdit={draft.edits.legal} minHeight={160} />
            {missingDate && <Callout tone="danger" className="mt-3">El texto debe incluir {'{{FECHA}}'}.</Callout>}
          </Panel>
          <Panel title="Datos de la autorización">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Respuesta que cuenta como autorización" htmlFor="l-acc" help="Solo esta respuesta explícita cuenta como autorización. Cualquier otra respuesta se trata como duda o negativa." error={!l.acceptance.trim() ? 'Obligatoria' : undefined}>
                <Input id="l-acc" value={l.acceptance} onChange={(e) => ed.update((x) => ({ ...x, acceptance: e.target.value }))} disabled={!allowed} className="font-mono" />
              </Field>
              <Field label="Referencia normativa" htmlFor="l-norm">
                <Input id="l-norm" value={l.normRef} onChange={(e) => ed.update((x) => ({ ...x, normRef: e.target.value }))} disabled={!allowed} />
              </Field>
              <Field label="Vigente desde" htmlFor="l-from">
                <Input id="l-from" type="date" value={l.effectiveFrom} onChange={(e) => ed.update((x) => ({ ...x, effectiveFrom: e.target.value }))} disabled={!allowed} className="w-44" />
              </Field>
              <Field label="Versión del texto" help="Automática: huella del texto exacto.">
                <span className="inline-flex h-9 items-center gap-2 font-mono text-[12.5px]">
                  {fnv64(l.text).slice(0, 12)}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copiar huella"
                    onClick={() => {
                      void navigator.clipboard?.writeText(fnv64(l.text));
                      toast.success('Huella copiada');
                    }}
                  >
                    <Copy />
                  </Button>
                </span>
              </Field>
            </div>
          </Panel>
          <Panel title="Historial" bodyClassName="p-0 pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versión</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Aprobador</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Huella</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((v) => (
                  <TableRow key={v.number}>
                    <TableCell className="font-medium">v{v.number}</TableCell>
                    <TableCell>{v.author}</TableCell>
                    <TableCell>{v.legalApprovedBy ?? v.approvedBy ?? '—'}</TableCell>
                    <TableCell className="tabular">{formatDate(v.createdAt)}</TableCell>
                    <TableCell>
                      <VersionStatus status={v.status} />
                    </TableCell>
                    <TableCell className="font-mono text-[12.5px]">{fnv64(v.snapshot.legal.text).slice(0, 12)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
        <div className="xl:sticky xl:top-[120px] xl:self-start">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Vista previa</h2>
            <span className="text-xs text-muted-foreground">Fecha de hoy: {formatDate(new Date())}</span>
          </div>
          <WhatsAppPreview
            className="h-[480px]"
            input={false}
            messages={[
              { from: 'client', text: 'el segundo', time: '15:24' },
              { from: 'bot', text: `${draft.snapshot.templates.find((t) => t.id === 'inicio-cierre')?.text.replace('[Nombre]', 'Laura') ?? ''}\n\n${renderLegal({ ...draft.snapshot, legal: l })}`, time: '15:24' },
              { from: 'client', text: l.acceptance, time: '15:25' },
            ]}
          />
          {!allowed && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Solo lectura: {reason('editarLegal')}.
            </p>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="¿Guardar el cambio del texto legal?"
        description={`Queda en el borrador con fecha ${formatDateTime(new Date())}. Para llegar a los clientes necesita evaluación, aprobación y la aprobación de Legal.`}
        confirmLabel="Guardar borrador"
        onConfirm={save}
      />
      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Texto legal: borrador frente a v{pub.number}</DialogTitle>
          </DialogHeader>
          <DiffView changes={changes} />
        </DialogContent>
      </Dialog>
    </>
  );
}
