import { useMemo, useRef, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Check, Columns2, EyeOff, FileDown, Image, Mic, Plus, RotateCcw, Sticker, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCOP, formatTime } from '@/lib/format';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useContent } from '@/hooks/use-data';
import { initialState, STAGE_LABEL, step, type SimState, type TurnDebug } from '@/engine/simulator';
import type { ContentSnapshot, EvalCase } from '@/data/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pill } from '@/components/panel/badges';
import { Callout, ConfirmDialog, Field, PageHeader, Panel } from '@/components/panel/common';
import { WhatsAppPreview, type WhatsAppMessage } from '@/components/panel/whatsapp-preview';

interface Chat {
  state: SimState;
  messages: WhatsAppMessage[];
  turns: TurnDebug[];
}
const emptyChat = (): Chat => ({ state: initialState(), messages: [], turns: [] });

function play(c: ContentSnapshot, chat: Chat, text: string): Chat {
  const t = formatTime(new Date());
  const r = step(c, chat.state, text);
  return {
    state: r.state,
    messages: [...chat.messages, { from: 'client', text, time: t }, ...r.replies.map((x) => ({ from: 'bot' as const, text: x.text, time: t }))],
    turns: [...chat.turns, r.debug],
  };
}

function TurnCard({ d }: { d: TurnDebug }) {
  const failed = d.validators.filter((v) => !v.ok);
  return (
    <AccordionItem value={String(d.turn)} className="rounded-lg border bg-card px-4 shadow-sm">
      <AccordionTrigger className="py-3 hover:no-underline">
        <span className="flex flex-1 items-center justify-between gap-2 pr-2">
          <span className="text-sm font-semibold">Turno {d.turn}</span>
          {d.intent === 'SIN_RESPUESTA' ? (
            <Pill tone="neutral">Sin respuesta</Pill>
          ) : d.safeUsed ? (
            <Pill tone="warning">Respuesta segura</Pill>
          ) : failed.length ? (
            <Pill tone="danger">
              <X aria-hidden />
              {failed.length} validador{failed.length > 1 ? 'es' : ''}
            </Pill>
          ) : (
            <Pill tone="success">
              <Check aria-hidden />
              Validado
            </Pill>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="text-muted-foreground">Paso</dt>
          <dd>
            {STAGE_LABEL[d.from]} → <strong>{STAGE_LABEL[d.to]}</strong>
          </dd>
          <dt className="text-muted-foreground">Intención</dt>
          <dd className="font-mono text-[12.5px]">{d.intent}</dd>
          <dt className="text-muted-foreground">Datos</dt>
          <dd>{d.data.length ? d.data.map((x) => `${x.label}: ${x.value}`).join(' · ') : '—'}</dd>
          {d.offered && (
            <>
              <dt className="text-muted-foreground">Plan ofrecido</dt>
              <dd className="font-mono text-[12.5px]">{d.offered}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Tiempo</dt>
          <dd className="tabular">{(d.ms / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} s · simulación local</dd>
        </dl>
        {d.validators.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-[13px]">
            {d.validators.map((v) => (
              <li key={v.name} className="flex items-start gap-2">
                {v.ok ? <Check className="mt-0.5 size-4 text-success" aria-label="Pasa" /> : <X className="mt-0.5 size-4 text-destructive" aria-label="Falla" />}
                <span>
                  {v.name}
                  {v.detail && <span className="block text-xs text-muted-foreground">{v.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {d.safeUsed && <p className="mt-2 text-xs text-muted-foreground">El modelo no pasó la validación ({d.safeReason}); se usó el texto fijo de respuesta segura.</p>}
        {d.note && <p className="mt-2 text-xs text-muted-foreground">{d.note}</p>}
      </AccordionContent>
    </AccordionItem>
  );
}

export function SimuladorPage() {
  const search = useSearch({ from: '/simulador' });
  const { db, pub, draft, changes } = useContent();
  const { actor, can } = useUser();
  const [source, setSource] = useState<'borrador' | 'publicada' | 'version'>(search.contenido === 'publicada' ? 'publicada' : 'borrador');
  const [versionN, setVersionN] = useState(String(pub.number));
  const [compare, setCompare] = useState(false);
  const [chat, setChat] = useState<Chat>(emptyChat);
  const [other, setOther] = useState<Chat>(emptyChat);
  const [typing, setTyping] = useState(false);
  const [saveCase, setSaveCase] = useState(false);
  const [caseName, setCaseName] = useState('');

  const content = useMemo(() => {
    if (source === 'borrador') return draft.snapshot;
    if (source === 'publicada') return pub.snapshot;
    return db.versions.find((v) => String(v.number) === versionN)?.snapshot ?? pub.snapshot;
  }, [source, versionN, draft, pub, db.versions]);
  const sourceLabel = source === 'borrador' ? 'Borrador' : source === 'publicada' ? `v${pub.number}` : `v${versionN}`;

  // Los turnos se calculan en orden sobre una referencia (mensajes rápidos no se pisan);
  // la respuesta se muestra tras un breve "escribiendo…".
  const chatRef = useRef<Chat>(emptyChat());
  const otherRef = useRef<Chat>(emptyChat());
  const [pending, setPending] = useState<WhatsAppMessage[]>([]);
  const commit = (a: Chat, b: Chat) => {
    chatRef.current = a;
    otherRef.current = b;
    setChat(a);
    setOther(b);
  };
  const reset = () => {
    setPending([]);
    commit(emptyChat(), emptyChat());
  };
  const send = (text: string) => {
    const next = play(content, chatRef.current, text);
    const nextOther = compare ? play(pub.snapshot, otherRef.current, text) : otherRef.current;
    chatRef.current = next;
    otherRef.current = nextOther;
    setTyping(true);
    setPending((p) => [...p, { from: 'client', text, time: formatTime(new Date()) }]);
    setTimeout(() => {
      setChat(next);
      setOther(nextOther);
      setPending((p) => p.slice(1));
      setTyping(false);
    }, 650);
  };
  const load = (k: EvalCase) => {
    let a = emptyChat();
    let b = emptyChat();
    for (const m of k.messages) {
      a = play(content, a, m);
      if (compare) b = play(pub.snapshot, b, m);
    }
    setPending([]);
    commit(a, b);
    toast.success(`Caso «${k.name}» cargado`);
  };
  const exportTranscript = () => {
    const txt = chat.messages.map((m) => `[${m.time}] ${m.from === 'bot' ? 'Sofía' : 'Cliente'}: ${m.text}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = `simulacion-${sourceLabel}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    void backend.logExport(actor, `Transcripción del simulador (${sourceLabel})`);
  };
  const clientMsgs = chat.messages.filter((m) => m.from === 'client').map((m) => m.text);

  return (
    <>
      <PageHeader
        title="Probar conversación"
        actions={
          <>
            <Button variant="outline" onClick={reset}>
              <RotateCcw />
              Reiniciar conversación
            </Button>
            <Button variant="outline" onClick={exportTranscript} disabled={!chat.messages.length}>
              <FileDown />
              Exportar transcripción
            </Button>
            <Button onClick={() => setSaveCase(true)} disabled={!clientMsgs.length || !can('editarBorrador')} title={can('editarBorrador') ? undefined : 'Requiere rol Editor de contenido'}>
              <Plus />
              Guardar como caso de prueba
            </Button>
          </>
        }
      />
      <Callout tone="info" icon={<EyeOff />}>
        <strong>Simulación:</strong> no se envía nada a Abaya ni a clientes reales. Los datos, planes y textos fijos salen del contenido elegido; lo que redacta la IA se aproxima con las preguntas y respuestas guía (la prueba con el modelo real se hace en Evaluaciones).
      </Callout>

      <div className={compare ? 'grid gap-4 xl:grid-cols-[260px_1fr_1fr]' : 'grid gap-4 xl:grid-cols-[260px_1fr_340px]'}>
        <div className="flex flex-col gap-4">
          <Panel title="Contenido a probar">
            <RadioGroup
              value={source}
              onValueChange={(v) => {
                setSource(v as typeof source);
                reset();
              }}
              className="gap-2.5"
            >
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="borrador" /> Borrador actual · {changes.length} cambios
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="publicada" /> Versión publicada · v{pub.number}
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="version" /> Versión específica…
              </Label>
            </RadioGroup>
            {source === 'version' && (
              <Select
                value={versionN}
                onValueChange={(v) => {
                  setVersionN(v);
                  reset();
                }}
              >
                <SelectTrigger className="mt-3 w-full" aria-label="Versión">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {db.versions
                    .slice()
                    .reverse()
                    .map((v) => (
                      <SelectItem key={v.number} value={String(v.number)}>
                        v{v.number} · {v.note}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                setCompare((c) => !c);
                reset();
              }}
            >
              <Columns2 />
              {compare ? 'Quitar comparación' : 'Comparar lado a lado'}
            </Button>
          </Panel>
          <Panel title="Casos guardados" bodyClassName="px-2 pb-2 pt-1">
            <ul className="flex flex-col">
              {db.evalCases.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-surface-2">
                  <span className="min-w-0 truncate">{k.name}</span>
                  <Button variant="ghost" size="xs" onClick={() => load(k)}>
                    Cargar
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-2">
          <WhatsAppPreview
            className="h-[640px]"
            title="Sofía · Simulador"
            badge={<Pill tone="primary">{sourceLabel}</Pill>}
            typing={typing}
            messages={[...chat.messages, ...pending]}
            onSend={send}
          />
          <div className="flex flex-wrap justify-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => send('[sticker]')}>
              <Sticker />
              Enviar [sticker]
            </Button>
            <Button variant="ghost" size="sm" onClick={() => send('[imagen]')}>
              <Image />
              Enviar [imagen]
            </Button>
            <Button variant="ghost" size="sm" onClick={() => send('[audio]')}>
              <Mic />
              Enviar [audio]
            </Button>
          </div>
        </div>

        {compare ? (
          <div className="flex flex-col gap-2">
            <WhatsAppPreview className="h-[640px]" title="Sofía · Publicada" badge={<Pill tone="success">v{pub.number}</Pill>} messages={other.messages} input={false} />
            <p className="text-center text-xs text-muted-foreground">Recibe los mismos mensajes que el chat de la izquierda.</p>
          </div>
        ) : (
          <div className="flex max-h-[700px] flex-col gap-2 overflow-y-auto">
            {chat.turns.length === 0 ? (
              <Panel title="Depuración por turno">
                <p className="text-[13px] text-muted-foreground">Escribe como cliente para ver el paso, la intención, los datos recogidos y los validadores de cada respuesta.</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Planes activos en este contenido: {content.plans.filter((p) => p.active).map((p) => `${p.code} ${formatCOP(p.priceCop)}`).join(' · ')}
                </p>
              </Panel>
            ) : (
              <Accordion type="multiple" defaultValue={[String(chat.turns.length)]} key={chat.turns.length} className="flex flex-col gap-2">
                {chat.turns
                  .slice()
                  .reverse()
                  .map((d) => (
                    <TurnCard key={d.turn} d={d} />
                  ))}
              </Accordion>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={saveCase}
        onOpenChange={setSaveCase}
        title="Guardar como caso de prueba"
        description={`Se guarda la conversación (${clientMsgs.length} mensajes del cliente) y se espera que termine en «${STAGE_LABEL[chat.state.stage]}». Correrá en cada evaluación.`}
        confirmLabel="Guardar caso"
        onConfirm={async () => {
          await backend.addEvalCase(actor, {
            id: `sim-${Date.now()}`,
            name: caseName.trim() || `Caso del simulador ${formatTime(new Date())}`,
            category: 'Flujo feliz',
            messages: clientMsgs,
            expect: { finalStage: STAGE_LABEL[chat.state.stage] },
            fromSimulator: true,
          });
          setCaseName('');
          toast.success('Caso de prueba guardado');
        }}
      >
        <Field label="Nombre del caso" htmlFor="case-name">
          <Input id="case-name" value={caseName} onChange={(e) => setCaseName(e.target.value)} placeholder="Ej.: Objeción precio con segunda oferta" />
        </Field>
      </ConfirmDialog>
    </>
  );
}
