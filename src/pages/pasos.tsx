import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { FlaskConical, History, Lock, Save } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { useContent } from '@/hooks/use-data';
import { useSectionEditor } from '@/hooks/use-editor';
import { activePlans, mainOfferBullets, planLine, secondOffer } from '@/engine/offer';
import { CRITERION_LABEL, LETTER_PROCESS, type OfferCriterion, type StepId, type Usage } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OriginBadge, Pill } from '@/components/panel/badges';
import { Callout, Field, NumberInput, PageHeader, Panel } from '@/components/panel/common';
import { ContentEditor } from '@/components/panel/content-editor';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';
import { UnsavedGuard } from '@/components/panel/unsaved-guard';
import { FlowDiagram } from '@/components/panel/visuals';
import { SwitchRow } from './personalidad';

const STEP_INFO: Record<StepId, { label: string; does: string; next: string; collects: string; vars: string[] }> = {
  MENU: { label: 'Menú', does: 'Recibe la opción elegida por el cliente (A, B, C o D) después del saludo.', next: 'Perfilamiento, Soporte', collects: 'Opción del menú', vars: [] },
  PERFIL: { label: 'Perfilamiento', does: 'Pide los datos del cliente, una pregunta por mensaje.', next: 'Oferta', collects: 'Nombre · Operador actual (solo A) · Perfil de uso', vars: ['[Nombre]', '[Operador]', '[Perfil de uso]'] },
  OFERTA: { label: 'Oferta', does: 'Presenta el plan adecuado al perfil y responde dudas.', next: 'Objeciones, Autorización', collects: 'Plan elegido', vars: ['[Nombre]', '[Operador]', '[Perfil de uso]', '{{PLANES}}', '{{PLAN_ELEGIDO}}'] },
  OBJECIONES: { label: 'Objeciones', does: 'Responde objeciones con la respuesta guía de cada una y vuelve a la oferta.', next: 'Oferta, Transferencia', collects: '—', vars: ['[Nombre]', '{{PLANES}}'] },
  AUTORIZACION: { label: 'Autorización', does: 'Envía el inicio del cierre y el texto legal; solo la respuesta exacta autoriza.', next: 'Transferencia, No autoriza', collects: 'Autorización (evidencia con hash)', vars: ['[Nombre]', '{{PLAN_ELEGIDO}}'] },
};

const USAGE_LABEL: Record<Usage, string> = { trabajo: 'Trabajo', estudio: 'Estudio', diario: 'Uso diario' };

export function PasosPage() {
  const search = useSearch({ from: '/conversacion/pasos' });
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>(search.paso ?? 'OFERTA');
  const [previewOpt, setPreviewOpt] = useState<'A' | 'B' | 'C'>('B');
  const [history, setHistory] = useState(false);
  const steps = useSectionEditor('steps', 'pasos');
  const offer = useSectionEditor('offer', 'pasos:oferta');
  const { draft, db } = useContent();
  const ro = !steps.canEdit;
  const info = STEP_INFO[step];
  const s = steps.value[step];
  const o = offer.value;
  const dirty = steps.isDirty || offer.isDirty;

  const save = async () => {
    if (steps.isDirty) await steps.save([`steps:${step}`], `Instrucciones · ${info.label}`);
    if (offer.isDirty) await offer.save(['offer'], 'Parámetros de la oferta');
  };

  // Vista previa de la oferta con el catálogo del borrador y los parámetros editados.
  const content = { ...draft.snapshot, offer: o };
  const process = LETTER_PROCESS[previewOpt];
  const plans = activePlans(content, process);
  const first = plans[0];
  const second = first ? secondOffer(content, process, 'trabajo', [first.code]) : [];

  const versionsWithStep = db.versions.filter((v) => v.snapshot.steps[step].instructions).slice().reverse();

  return (
    <>
      <UnsavedGuard when={dirty} onSave={save} />
      <PageHeader
        crumbs={['Conversación']}
        title="Instrucciones por paso"
        badges={<OriginBadge kind="ia" />}
        actions={
          <>
            <Button variant="ghost" onClick={() => setHistory(true)}>
              <History />
              Historial del paso
            </Button>
            <Button variant="outline" onClick={() => void navigate({ to: '/simulador', search: { contenido: 'borrador' } })}>
              <FlaskConical />
              Probar este paso
            </Button>
            <PermissionButton allowed={!ro} reason="Requiere rol Editor de contenido" onClick={save} disabled={!dirty || steps.saving || offer.saving}>
              <Save />
              Guardar borrador
            </PermissionButton>
          </>
        }
      />

      <Panel title="Flujo de la conversación" description="Lo define el sistema: no se pueden crear, borrar ni reordenar pasos. Haz clic en un paso para editarlo.">
        <FlowDiagram active={step} onSelect={setStep} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <Panel
            title={info.label}
            badges={steps.changedKeys.has(`steps:${step}`) && <Pill tone="warning">Modificado en borrador</Pill>}
            description={
              <>
                {info.does} Siguientes: {info.next}. Recoge: {info.collects}.
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <Field label="Instrucciones para el modelo">
                <ContentEditor
                  label={`Instrucciones del paso ${info.label}`}
                  value={s.instructions}
                  onChange={(v) => steps.update((x) => ({ ...x, [step]: { ...x[step], instructions: v } }))}
                  allowedVars={info.vars}
                  ai
                  readOnly={ro}
                  lastEdit={steps.edits[`steps:${step}`]}
                  minHeight={110}
                />
              </Field>

              {step === 'PERFIL' && (
                <Field label="Preguntas del paso" help="El texto es editable; el dato que recoge y la opción a la que aplica los define el sistema.">
                  <div className="overflow-hidden rounded-md border">
                    {s.questions.map((q, i) => (
                      <div key={q.id} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border-b px-3 py-2.5 last:border-b-0">
                        <span className="tabular text-xs text-muted-foreground">{i + 1}</span>
                        <Input
                          aria-label={`Pregunta ${i + 1}`}
                          value={q.text}
                          disabled={ro}
                          onChange={(e) =>
                            steps.update((x) => ({ ...x, PERFIL: { ...x.PERFIL, questions: x.PERFIL.questions.map((y) => (y.id === q.id ? { ...y, text: e.target.value } : y)) } }))
                          }
                        />
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted-foreground">
                          <Lock className="size-3.5" aria-hidden />
                          {q.collects}
                          {q.onlyFor && ` (solo ${q.onlyFor.join(', ')})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </Panel>

          {step === 'OFERTA' && (
            <Panel title="Parámetros de la oferta" badges={<OriginBadge kind="exacto" label="Exacto" />} description="Reglas que aplica el código, no el modelo.">
              <div className="grid gap-5 md:grid-cols-2">
                <SwitchRow id="o-high" checked={o.highestFirst} onChange={(v) => offer.update((x) => ({ ...x, highestFirst: v }))} label="Ofrecer primero el plan de mayor precio" disabled={ro} />
                <SwitchRow id="o-rep" checked={o.noRepeat} onChange={(v) => offer.update((x) => ({ ...x, noRepeat: v }))} label="No repetir el plan ya ofrecido" disabled={ro} />
                <Field label="Máximo de planes en la segunda oferta" htmlFor="o-max" error={!(o.maxSecondOffer >= 1 && o.maxSecondOffer <= 5) ? 'Entre 1 y 5' : undefined}>
                  <NumberInput id="o-max" min={1} max={5} value={o.maxSecondOffer} onChange={(n) => offer.update((x) => ({ ...x, maxSecondOffer: n }))} disabled={ro} />
                </Field>
                <Field label="Líneas máximas al detallar un plan" htmlFor="o-det">
                  <NumberInput id="o-det" min={1} max={6} value={o.detailMaxLines} onChange={(n) => offer.update((x) => ({ ...x, detailMaxLines: n }))} disabled={ro} />
                </Field>
                {(Object.keys(USAGE_LABEL) as Usage[]).map((u) => (
                  <Field key={u} label={`Criterio para perfil ${USAGE_LABEL[u]}`}>
                    <Select value={o.criteria[u]} onValueChange={(v) => offer.update((x) => ({ ...x, criteria: { ...x.criteria, [u]: v as OfferCriterion } }))} disabled={ro}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CRITERION_LABEL) as OfferCriterion[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CRITERION_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}
                <Field label="Formato de la línea de plan" className="md:col-span-2" help="Un segmento sin dato (por ejemplo sin «Incluye») se omite; nunca se inventa.">
                  <ContentEditor
                    label="Formato de la línea de plan"
                    value={o.lineFormat}
                    onChange={(v) => offer.update((x) => ({ ...x, lineFormat: v }))}
                    allowedVars={['[Datos]', '[GB compartir]', '[Incluye]', '[Llamadas]', '[Precio]', '[Descuento]']}
                    readOnly={ro}
                    minHeight={48}
                  />
                </Field>
              </div>
            </Panel>
          )}
        </div>

        <div className="xl:sticky xl:top-[120px] xl:self-start">
          {step === 'OFERTA' ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Vista previa de la oferta</h2>
                <Tabs value={previewOpt} onValueChange={(v) => setPreviewOpt(v as 'A')}>
                  <TabsList aria-label="Ver como">
                    {(['A', 'B', 'C'] as const).map((l) => (
                      <TabsTrigger key={l} value={l}>
                        {l}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              {!first ? (
                <Callout tone="warning">Sin planes activos para esta opción: el cliente recibe «Un asesor te compartirá las mejores opciones para tu caso.» y se transfiere.</Callout>
              ) : (
                <WhatsAppPreview
                  className="h-[560px]"
                  input={false}
                  messages={[
                    { from: 'client', text: 'trabajo', time: '15:21' },
                    { from: 'bot', text: `Perfecto, Laura. Tengo para ti nuestro plan más completo:\n${mainOfferBullets(o.highestFirst ? first : plans.at(-1)!)}\n¿Te gustaría quedarte con este plan?`, time: '15:21' },
                    { from: 'client', text: 'algo más económico', time: '15:22' },
                    {
                      from: 'bot',
                      text: second.length ? `Entiendo, Laura. Te comparto otras opciones:\n${second.map((p) => planLine(p, o.lineFormat)).join('\n')}\n¿Cuál de estos planes te gusta más?` : 'Ya te mostré todas las opciones disponibles para tu caso. ¿Quieres que un asesor te ayude a elegir?',
                      time: '15:22',
                    },
                  ]}
                />
              )}
              <p className="mt-2 text-xs text-muted-foreground">Precios y planes salen del Catálogo del borrador. Perfil de ejemplo: Trabajo.</p>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Vista previa</h2>
                <span className="text-xs text-muted-foreground">Preguntas del paso</span>
              </div>
              <WhatsAppPreview
                className="h-[460px]"
                input={false}
                vars={{ '[Nombre]': 'Laura' }}
                messages={
                  step === 'PERFIL'
                    ? s.questions.flatMap((q, i) => [
                        { from: 'client' as const, text: ['b', 'Laura', 'Claro no', 'trabajo'][i] ?? '…', time: '15:20' },
                        { from: 'bot' as const, text: q.text, time: '15:20' },
                      ])
                    : [{ from: 'bot', text: `(${info.label}) La IA redacta la respuesta siguiendo estas instrucciones. Pruébala en el simulador.`, time: '15:20' }]
                }
              />
            </>
          )}
        </div>
      </div>

      <Dialog open={history} onOpenChange={setHistory}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial del paso {info.label}</DialogTitle>
          </DialogHeader>
          <ol className="flex flex-col gap-3">
            {versionsWithStep.map((v) => (
              <li key={v.number} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <strong>v{v.number}</strong>
                  <span className="text-muted-foreground">
                    {v.author} · {formatDateTime(v.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">{v.snapshot.steps[step].instructions}</p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
