import { useState } from 'react';
import { Plus, Save, Trash2, Undo2 } from 'lucide-react';
import { useSectionEditor } from '@/hooks/use-editor';
import { OBJECTION_ACTION_LABEL, type Objection, type ObjectionAction } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OriginBadge, Pill } from '@/components/panel/badges';
import { ChipsInput, ConfirmDialog, EmptyState, Field, PageHeader, Panel } from '@/components/panel/common';
import { ContentEditor } from '@/components/panel/content-editor';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';
import { UnsavedGuard } from '@/components/panel/unsaved-guard';
import { SwitchRow } from './personalidad';

export function ObjecionesPage() {
  const ed = useSectionEditor('objections', 'objeciones');
  const [removing, setRemoving] = useState<Objection | null>(null);
  const ro = !ed.canEdit;
  const list = ed.value;
  const set = (id: string, patch: Partial<Objection>) => ed.update((all) => all.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const save = () => ed.save(list.map((o) => `objections:${o.id}`), 'Objeciones');
  const invalid = list.some((o) => !o.name.trim() || !o.response.trim());

  return (
    <>
      <UnsavedGuard when={ed.isDirty} onSave={save} />
      <PageHeader
        crumbs={['Conversación']}
        title="Objeciones"
        badges={<OriginBadge kind="ia" />}
        actions={
          <>
            <Button variant="outline" onClick={ed.discard} disabled={!ed.isDirty}>
              <Undo2 />
              Descartar cambios
            </Button>
            <PermissionButton
              variant="outline"
              allowed={!ro}
              reason="Requiere rol Editor de contenido"
              onClick={() =>
                ed.update((all) => [...all, { id: `obj-${Date.now()}`, name: 'Nueva objeción', phrases: [], response: '', action: 'continuar', active: true }])
              }
            >
              <Plus />
              Agregar objeción
            </PermissionButton>
            <PermissionButton allowed={!ro} reason="Requiere rol Editor de contenido" onClick={save} disabled={!ed.isDirty || ed.saving || invalid}>
              <Save />
              Guardar borrador
            </PermissionButton>
          </>
        }
      />
      {list.length === 0 && <EmptyState title="Sin objeciones">Agrega la primera para que Sofía sepa cómo responder dudas frecuentes.</EmptyState>}
      <div className="grid gap-4 2xl:grid-cols-2">
        {list.map((o) => {
          const changed = ed.changedKeys.has(`objections:${o.id}`) || JSON.stringify(o) !== JSON.stringify(ed.draftValue.find((x) => x.id === o.id));
          return (
            <Panel
              key={o.id}
              title={o.name || 'Sin nombre'}
              badges={
                <>
                  {!o.active && <Pill tone="outline">Inactiva</Pill>}
                  {changed && <Pill tone="warning">Modificado en borrador</Pill>}
                </>
              }
              actions={
                <PermissionButton variant="ghost" size="sm" allowed={!ro} reason="Requiere rol Editor de contenido" onClick={() => setRemoving(o)} aria-label={`Eliminar objeción ${o.name}`}>
                  <Trash2 />
                  Eliminar
                </PermissionButton>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <Field label="Nombre" htmlFor={`n-${o.id}`} error={!o.name.trim() ? 'Obligatorio' : undefined}>
                      <Input id={`n-${o.id}`} value={o.name} onChange={(e) => set(o.id, { name: e.target.value })} disabled={ro} />
                    </Field>
                    <div className="flex items-end pb-2">
                      <SwitchRow id={`a-${o.id}`} checked={o.active} onChange={(v) => set(o.id, { active: v })} label="Activa" disabled={ro} />
                    </div>
                  </div>
                  <Field label="Frases de ejemplo del cliente" help="Sirven para detectarla y para las pruebas automáticas.">
                    <ChipsInput value={o.phrases} onChange={(v) => set(o.id, { phrases: v })} disabled={ro} placeholder="Ej.: está muy caro" />
                  </Field>
                  <Field label="Respuesta guía" error={!o.response.trim() ? 'Obligatoria' : undefined}>
                    <ContentEditor label={`Respuesta guía de ${o.name}`} value={o.response} onChange={(v) => set(o.id, { response: v })} allowedVars={['[Nombre]', '{{PLANES}}']} ai readOnly={ro} minHeight={70} />
                  </Field>
                  <Field label="Acción siguiente">
                    <Select value={o.action} onValueChange={(v) => set(o.id, { action: v as ObjectionAction })} disabled={ro}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(OBJECTION_ACTION_LABEL) as ObjectionAction[]).map((a) => (
                          <SelectItem key={a} value={a}>
                            {OBJECTION_ACTION_LABEL[a]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <WhatsAppPreview
                  className="h-[300px]"
                  input={false}
                  vars={{ '[Nombre]': 'Laura' }}
                  messages={[
                    { from: 'client', text: o.phrases[0] ?? '…', time: '15:22' },
                    { from: 'bot', text: o.response || '…', time: '15:22' },
                  ]}
                />
              </div>
            </Panel>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`¿Eliminar la objeción «${removing?.name}»?`}
        description="Se quita del borrador. Si ya estaba publicada, sigue activa para los clientes hasta publicar."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (removing) ed.update((all) => all.filter((x) => x.id !== removing.id));
        }}
      />
    </>
  );
}
