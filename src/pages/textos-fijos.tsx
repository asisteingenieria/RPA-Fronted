import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronRight, Diff, FlaskConical, Lock, RotateCcw, Save } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { diffSnapshots } from '@/lib/content-diff';
import { renderGreeting } from '@/engine/simulator';
import { useContent } from '@/hooks/use-data';
import { useSectionEditor } from '@/hooks/use-editor';
import type { MenuLetter } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OriginBadge, Pill } from '@/components/panel/badges';
import { ConfirmDialog, NoPermission, PageHeader, Panel } from '@/components/panel/common';
import { ContentEditor } from '@/components/panel/content-editor';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';
import { UnsavedGuard } from '@/components/panel/unsaved-guard';
import { DiffView } from '@/components/panel/visuals';

const LETTER_ICON: Record<MenuLetter, string> = { A: '🅐', B: '🅑', C: '🅒', D: '🅓' };
const LEADS_TO: Record<MenuLetter, string> = { A: 'Cambio de operador', B: 'Recargas → pospago', C: 'Número nuevo', D: 'Soporte' };

export function TextosFijosPage() {
  const { draft, changedKeys } = useContent();
  return (
    <>
      <PageHeader crumbs={['Conversación']} title="Textos fijos" badges={<OriginBadge kind="exacto" label="Se envían exactamente así" />} />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Paso</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead>Última edición</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {draft.snapshot.templates.map((t) => {
              const changed = changedKeys.has(`templates:${t.id}`) || changedKeys.has(`templates:${t.id}:menu`);
              const edit = draft.edits[`templates:${t.id}`];
              return (
                <TableRow key={t.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link to="/conversacion/textos-fijos/$id" params={{ id: t.id }} className="hover:underline">
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell>{t.step}</TableCell>
                  <TableCell className="max-w-[420px] truncate text-muted-foreground">{t.text.replace(/\n+/g, ' ')}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{edit ? `${edit.by} · ${formatDateTime(edit.at)}` : '—'}</TableCell>
                  <TableCell>{changed ? <Pill tone="warning">Modificado en borrador</Pill> : <Pill tone="success">Publicado</Pill>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/conversacion/textos-fijos/$id" params={{ id: t.id }}>
                        Editar <ChevronRight />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}

export function TextoFijoEditorPage() {
  const { id } = useParams({ from: '/conversacion/textos-fijos/$id' });
  const ed = useSectionEditor('templates', 'textos');
  const { pub, draft } = useContent();
  const navigate = useNavigate();
  const [showDiff, setShowDiff] = useState(false);
  const [restore, setRestore] = useState(false);
  const t = ed.value.find((x) => x.id === id);
  if (!t) return <NoPermission reason="Este texto fijo no existe." />;
  const pubT = pub.snapshot.templates.find((x) => x.id === id);
  const ro = !ed.canEdit;
  const setT = (patch: Partial<typeof t>) => ed.update((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const save = () => ed.save([`templates:${id}`], `Texto fijo · ${t.name}`);
  const changed = JSON.stringify(t) !== JSON.stringify(pubT);
  const changes = diffSnapshots(pub.snapshot, { ...draft.snapshot, templates: ed.value }).filter((c) => c.key.startsWith(`templates:${id}`));

  const previewText = id === 'saludo' ? renderGreeting({ ...draft.snapshot, templates: ed.value }) : t.text;

  return (
    <>
      <UnsavedGuard when={ed.isDirty} onSave={save} />
      <PageHeader
        crumbs={['Conversación', 'Textos fijos']}
        title={t.name}
        badges={<OriginBadge kind="exacto" label="Se envía exactamente así" />}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowDiff(true)}>
              <Diff />
              Ver diferencias
            </Button>
            <PermissionButton variant="outline" allowed={!ro} reason="Requiere rol Editor de contenido" onClick={() => setRestore(true)} disabled={!changed}>
              <RotateCcw />
              Restaurar versión publicada
            </PermissionButton>
            <PermissionButton allowed={!ro} reason="Requiere rol Editor de contenido" onClick={save} disabled={!ed.isDirty || ed.saving}>
              <Save />
              Guardar borrador
            </PermissionButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <Panel title="Texto" badges={changed && <Pill tone="warning">Modificado en borrador</Pill>} description={t.description}>
            <ContentEditor
              label={t.name}
              value={t.text}
              onChange={(v) => setT({ text: v })}
              allowedVars={t.allowedVars}
              maxChars={t.maxChars}
              readOnly={ro}
              lastEdit={draft.edits[`templates:${id}`]}
              minHeight={id === 'saludo' ? 260 : 120}
            />
            {id === 'saludo' && (
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                <code className="font-mono">{'{{CAMPANA}}'}</code> se reemplaza por el bloque de la campaña activa; sin campaña, la línea desaparece.
              </p>
            )}
          </Panel>

          {t.menuOptions && (
            <Panel title="Opciones del menú" description="El texto visible es editable; el destino lo define el sistema." bodyClassName="p-0 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Letra</TableHead>
                    <TableHead>Texto visible</TableHead>
                    <TableHead className="w-52">Lleva a</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {t.menuOptions.map((o) => (
                    <TableRow key={o.letter}>
                      <TableCell className="text-lg">{LETTER_ICON[o.letter]}</TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Texto de la opción ${o.letter}`}
                          value={o.text}
                          disabled={ro}
                          onChange={(e) => setT({ menuOptions: t.menuOptions!.map((x) => (x.letter === o.letter ? { ...x, text: e.target.value } : x)) })}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Lock className="size-3.5" aria-hidden />
                          {LEADS_TO[o.letter]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="px-4 pb-4 pt-2 text-[12.5px] text-muted-foreground">Recuerda reflejar el mismo texto en el saludo: el cliente puede responder con la letra o con el texto de la opción.</p>
            </Panel>
          )}
        </div>

        <div className="xl:sticky xl:top-[120px] xl:self-start">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Vista previa</h2>
            <span className="text-xs text-muted-foreground">Así lo recibe el cliente</span>
          </div>
          <WhatsAppPreview className="h-[560px]" input={false} vars={{ '[Nombre]': 'Laura' }} messages={[{ from: 'client', text: 'hola', time: '15:12' }, { from: 'bot', text: previewText, time: '15:12' }]} />
          <Button variant="outline" className="mt-3 w-full" onClick={() => void navigate({ to: '/simulador', search: { contenido: 'borrador' } })}>
            <FlaskConical />
            Probar en el simulador
          </Button>
        </div>
      </div>

      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t.name}: borrador frente a v{pub.number}
            </DialogTitle>
          </DialogHeader>
          <DiffView changes={changes} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={restore}
        onOpenChange={setRestore}
        title="¿Restaurar la versión publicada?"
        description={`El texto vuelve a como está en la v${pub.number}. Se guarda en el borrador.`}
        confirmLabel="Restaurar"
        onConfirm={async () => {
          if (!pubT) return;
          const next = ed.value.map((x) => (x.id === id ? structuredClone(pubT) : x));
          await ed.save([`templates:${id}`], `Texto fijo · ${t.name} (restaurado)`, next);
        }}
      />
    </>
  );
}
