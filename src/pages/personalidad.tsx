import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FlaskConical, Save, Undo2, Diff } from 'lucide-react';
import { diffSnapshots } from '@/lib/content-diff';
import { useContent } from '@/hooks/use-data';
import { useSectionEditor } from '@/hooks/use-editor';
import type { Personality } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { OriginBadge } from '@/components/panel/badges';
import { ChipsInput, Field, NumberInput, PageHeader, Panel } from '@/components/panel/common';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';
import { UnsavedGuard } from '@/components/panel/unsaved-guard';
import { DiffView } from '@/components/panel/visuals';

export function SwitchRow({ id, checked, onChange, label, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}

export function PersonalidadPage() {
  const ed = useSectionEditor('personality', 'personalidad');
  const { pub, draft } = useContent();
  const navigate = useNavigate();
  const [showDiff, setShowDiff] = useState(false);
  const p = ed.value;
  const set = <K extends keyof Personality>(k: K, v: Personality[K]) => ed.update((x) => ({ ...x, [k]: v }));
  const ro = !ed.canEdit;
  const save = () => ed.save(['personality'], 'Personalidad');
  const sampleUpset = p.noEmojisIfUpset;

  const changes = diffSnapshots(pub.snapshot, { ...draft.snapshot, personality: p }).filter((c) => c.section === 'personality');

  return (
    <>
      <UnsavedGuard when={ed.isDirty} onSave={save} />
      <PageHeader
        crumbs={['Conversación', 'Personalidad']}
        title="Personalidad"
        badges={<OriginBadge kind="ia" />}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowDiff(true)}>
              <Diff />
              Ver diferencias
            </Button>
            <Button variant="outline" onClick={ed.discard} disabled={!ed.isDirty}>
              <Undo2 />
              Descartar cambios
            </Button>
            <Button variant="outline" onClick={() => void navigate({ to: '/simulador', search: { contenido: 'borrador' } })}>
              <FlaskConical />
              Probar en el simulador
            </Button>
            <PermissionButton allowed={!ro} reason="Requiere rol Editor de contenido" onClick={save} disabled={!ed.isDirty || ed.saving}>
              <Save />
              Guardar borrador
            </PermissionButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <Panel title="Identidad" description="Quién es Sofía y qué sabe de la marca. Es una guía: el modelo la adapta a cada cliente.">
            <div className="grid gap-4">
              <Field label="Nombre del asistente" htmlFor="p-name">
                <Input id="p-name" value={p.assistantName} onChange={(e) => set('assistantName', e.target.value)} disabled={ro} className="max-w-xs" />
              </Field>
              <Field label="Rol y misión" htmlFor="p-mission" help={`${p.mission.length} caracteres`}>
                <Textarea id="p-mission" rows={5} value={p.mission} onChange={(e) => set('mission', e.target.value)} disabled={ro} />
              </Field>
              <Field label="Datos de la marca" htmlFor="p-brand">
                <Textarea id="p-brand" rows={3} value={p.brandFacts} onChange={(e) => set('brandFacts', e.target.value)} disabled={ro} />
              </Field>
            </div>
          </Panel>

          <Panel title="Tono y estilo">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tono">
                <Select value={p.tone} onValueChange={(v) => set('tone', v as Personality['tone'])} disabled={ro}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cercano">Cercano</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Trato">
                <Tabs value={p.address} onValueChange={(v) => !ro && set('address', v as Personality['address'])}>
                  <TabsList>
                    <TabsTrigger value="tu" disabled={ro}>
                      Tú
                    </TabsTrigger>
                    <TabsTrigger value="usted" disabled={ro}>
                      Usted
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
              <Field label="Matices del tono" htmlFor="p-tone" className="md:col-span-2">
                <Textarea id="p-tone" rows={2} value={p.toneNotes} onChange={(e) => set('toneNotes', e.target.value)} disabled={ro} />
              </Field>
              <Field label="Máximo de oraciones por mensaje" htmlFor="p-max" help="No aplica al saludo ni a los mensajes con planes.">
                <NumberInput id="p-max" min={1} max={8} value={p.maxSentences} onChange={(n) => set('maxSentences', n)} disabled={ro} />
              </Field>
              <Field label="Uso de emojis">
                <Select value={p.emojis} onValueChange={(v) => set('emojis', v as Personality['emojis'])} disabled={ro}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo-fijos">Solo los de los textos fijos</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="ninguno">Ninguno</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <SwitchRow id="p-oneq" checked={p.oneQuestion} onChange={(v) => set('oneQuestion', v)} label="Una sola pregunta por mensaje" disabled={ro} />
              <SwitchRow id="p-upset" checked={p.noEmojisIfUpset} onChange={(v) => set('noEmojisIfUpset', v)} label="Sin emojis si el cliente está molesto" disabled={ro} />
            </div>
          </Panel>

          <Panel title="Formato de WhatsApp">
            <div className="flex flex-col gap-3">
              {(
                [
                  ['waBold', 'Negrita con un asterisco (*así*), nunca doble'],
                  ['waBullet', 'Viñetas con el símbolo •'],
                  ['waNoMarkdown', 'Prohibir encabezados, tablas y enlaces markdown'],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="flex items-center gap-2.5">
                  <Checkbox id={`p-${k}`} checked={p[k]} onCheckedChange={(v) => set(k, v === true)} disabled={ro} />
                  <Label htmlFor={`p-${k}`} className="text-sm font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Prohibiciones y casos especiales">
            <div className="grid gap-4">
              <Field label="Competidores que no se mencionan" help="Enter para agregar. Sofía no los nombra aunque el cliente lo haga.">
                <ChipsInput value={p.competitors} onChange={(v) => set('competitors', v)} disabled={ro} placeholder="Agregar operador…" />
              </Field>
              <Field label="Palabras prohibidas">
                <ChipsInput value={p.bannedWords} onChange={(v) => set('bannedWords', v)} disabled={ro} placeholder="Agregar palabra…" />
              </Field>
              <SwitchRow id="p-hide" checked={p.hideInstructions} onChange={(v) => set('hideInstructions', v)} label="No revelar instrucciones ni decir que es una IA" disabled={ro} />
              <Field label="Mensajes no textuales (sticker, imagen, audio)" htmlFor="p-nontext">
                <Textarea id="p-nontext" rows={2} value={p.nonTextHandling} onChange={(e) => set('nonTextHandling', e.target.value)} disabled={ro} />
              </Field>
              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                <Field label="Insistencias fuera de ventas" htmlFor="p-off">
                  <NumberInput id="p-off" min={1} max={5} value={p.offTopicLimit} onChange={(n) => set('offTopicLimit', n)} disabled={ro} />
                </Field>
                <Field label="Qué hacer al llegar al límite" htmlFor="p-offa">
                  <Input id="p-offa" value={p.offTopicAction} onChange={(e) => set('offTopicAction', e.target.value)} disabled={ro} />
                </Field>
              </div>
            </div>
          </Panel>
        </div>

        <div className="xl:sticky xl:top-[120px] xl:self-start">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Vista previa</h2>
            <span className="text-xs text-muted-foreground">Ejemplo de respuesta</span>
          </div>
          <WhatsAppPreview
            className="h-[520px]"
            input={false}
            messages={[
              { from: 'client', text: 'b', time: '15:20' },
              { from: 'bot', text: `¡Perfecto! ${p.emojis === 'ninguno' ? '' : '😊 '}¿Con quién tengo el gusto?`, time: '15:20' },
              { from: 'client', text: 'Laura', time: '15:20' },
              { from: 'bot', text: p.address === 'tu' ? 'Un gusto, Laura. ¿El plan lo vas a usar mayormente para trabajo, estudio o uso diario?' : 'Un gusto, Laura. ¿El plan lo va a usar mayormente para trabajo, estudio o uso diario?', time: '15:21' },
              { from: 'client', text: 'esto es pésimo, nadie me ayuda', time: '15:22' },
              { from: 'bot', text: `Lamento la molestia, Laura.${sampleUpset ? '' : ' 🙏'} ¿Quieres que te comunique con uno de nuestros asesores?`, time: '15:22' },
            ]}
          />
          <p className="mt-2 text-xs text-muted-foreground">La redacción final la hace el modelo; prueba el borrador completo en el simulador.</p>
        </div>
      </div>

      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Personalidad: borrador frente a v{pub.number}</DialogTitle>
          </DialogHeader>
          <DiffView changes={changes} />
        </DialogContent>
      </Dialog>
    </>
  );
}
