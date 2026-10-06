import { useState } from 'react';
import { Plus, Save, Undo2 } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { renderGreeting } from '@/engine/simulator';
import { useContent } from '@/hooks/use-data';
import { useSectionEditor } from '@/hooks/use-editor';
import type { Campaign } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OriginBadge, Pill } from '@/components/panel/badges';
import { Callout, Field, PageHeader, Panel } from '@/components/panel/common';
import { ContentEditor } from '@/components/panel/content-editor';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';
import { UnsavedGuard } from '@/components/panel/unsaved-guard';

function status(k: Campaign, now = new Date()) {
  if (new Date(k.endsAt) < now) return { tone: 'outline' as const, label: 'Finalizada' };
  if (k.active && new Date(k.startsAt) <= now) return { tone: 'success' as const, label: 'Activa' };
  if (k.active) return { tone: 'primary' as const, label: 'Programada' };
  return { tone: 'neutral' as const, label: 'Inactiva' };
}

export function CampanasPage() {
  const ed = useSectionEditor('campaigns', 'campanas');
  const { draft } = useContent();
  const list = ed.value;
  const [sel, setSel] = useState(list[0]?.id);
  const k = list.find((x) => x.id === sel);
  const ro = !ed.canEdit;
  const set = (id: string, patch: Partial<Campaign>) => ed.update((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  // Regla: solo una campaña activa a la vez.
  const setActive = (id: string, on: boolean) => ed.update((all) => all.map((x) => ({ ...x, active: x.id === id ? on : on ? false : x.active })));
  const save = () => ed.save(list.map((x) => `campaigns:${x.id}`), 'Campañas');
  const invalid = list.some((x) => !x.name.trim() || x.endsAt <= x.startsAt);

  return (
    <>
      <UnsavedGuard when={ed.isDirty} onSave={save} />
      <PageHeader
        title="Campañas"
        badges={<OriginBadge kind="exacto" />}
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
              onClick={() => {
                const id = `camp-${Date.now()}`;
                ed.update((all) => [...all, { id, name: 'Nueva campaña', greetingBlock: '', benefitAnswer: '', startsAt: new Date().toISOString().slice(0, 16), endsAt: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 16), active: false }]);
                setSel(id);
              }}
            >
              <Plus />
              Nueva campaña
            </PermissionButton>
            <PermissionButton allowed={!ro} reason="Requiere rol Editor de contenido" onClick={save} disabled={!ed.isDirty || ed.saving || invalid}>
              <Save />
              Guardar borrador
            </PermissionButton>
          </>
        }
      />
      <Callout tone="info">Solo una campaña activa a la vez. Al terminar su vigencia, el saludo vuelve solo al texto sin campaña.</Callout>
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Activa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const st = status(c);
              return (
                <TableRow key={c.id} data-state={c.id === sel ? 'selected' : undefined} className="cursor-pointer" onClick={() => setSel(c.id)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="tabular">{formatDateTime(c.startsAt)}</TableCell>
                  <TableCell className="tabular">{formatDateTime(c.endsAt)}</TableCell>
                  <TableCell>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch checked={c.active} onCheckedChange={(v) => setActive(c.id, v)} disabled={ro} aria-label={`Campaña ${c.name} activa`} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>

      {k && (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <Panel title={k.name || 'Sin nombre'} description="Se inserta en el saludo en lugar de {{CAMPANA}}.">
            <div className="grid gap-4">
              <Field label="Nombre" htmlFor="c-name" error={!k.name.trim() ? 'Obligatorio' : undefined}>
                <Input id="c-name" value={k.name} onChange={(e) => set(k.id, { name: e.target.value })} disabled={ro} />
              </Field>
              <Field label="Bloque del saludo">
                <ContentEditor label="Bloque del saludo" value={k.greetingBlock} onChange={(v) => set(k.id, { greetingBlock: v })} readOnly={ro} maxChars={400} minHeight={80} />
              </Field>
              <Field label="Respuesta al preguntar por el beneficio" help="Texto exacto. No inventes condiciones del beneficio.">
                <ContentEditor label="Respuesta del beneficio" value={k.benefitAnswer} onChange={(v) => set(k.id, { benefitAnswer: v })} readOnly={ro} maxChars={400} minHeight={70} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Inicio" htmlFor="c-from">
                  <Input id="c-from" type="datetime-local" value={k.startsAt} onChange={(e) => set(k.id, { startsAt: e.target.value })} disabled={ro} />
                </Field>
                <Field label="Fin" htmlFor="c-to" error={k.endsAt <= k.startsAt ? 'Debe ser posterior al inicio' : undefined}>
                  <Input id="c-to" type="datetime-local" value={k.endsAt} onChange={(e) => set(k.id, { endsAt: e.target.value })} disabled={ro} />
                </Field>
              </div>
            </div>
          </Panel>
          <div className="xl:sticky xl:top-[120px] xl:self-start">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Vista previa del saludo</h2>
              <span className="text-xs text-muted-foreground">Con esta campaña</span>
            </div>
            <WhatsAppPreview
              className="h-[560px]"
              input={false}
              messages={[
                { from: 'client', text: 'hola', time: '15:12' },
                { from: 'bot', text: renderGreeting({ ...draft.snapshot, campaigns: [{ ...k, active: true, startsAt: '2000-01-01T00:00', endsAt: '2999-01-01T00:00' }] }), time: '15:12' },
                { from: 'client', text: '¿cómo obtengo el beneficio?', time: '15:13' },
                { from: 'bot', text: k.benefitAnswer || '…', time: '15:13' },
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
}
